#!/usr/bin/env node

/**
 * One-off migration: Set Content-Disposition on existing S3 objects.
 *
 * Uses CopyObject-in-place to update metadata without re-uploading.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node scripts/fix-s3-metadata.mjs          # dry run
 *   node scripts/fix-s3-metadata.mjs --apply  # actually update
 */

import { S3Client, ListObjectsV2Command, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const REGION = process.env.SCALEWAY_REGION || process.env.SCW_REGION || 'fr-par'
const ENDPOINT = process.env.SCALEWAY_ENDPOINT || `https://s3.${REGION}.scw.cloud`
const BUCKET = process.env.SCW_TEACHER_BUCKET
const ACCESS_KEY = process.env.SCALEWAY_ACCESS_KEY_ID || process.env.SCW_ACCESS_KEY
const SECRET_KEY = process.env.SCALEWAY_SECRET_ACCESS_KEY || process.env.SCW_SECRET_KEY

if (!BUCKET || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Missing env vars: SCW_TEACHER_BUCKET, SCALEWAY_ACCESS_KEY_ID, SCALEWAY_SECRET_ACCESS_KEY')
  process.exit(1)
}

const dryRun = !process.argv.includes('--apply')
if (dryRun) {
  console.log('DRY RUN — pass --apply to actually update objects\n')
}

const client = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: false,
})

// File types that should display inline rather than triggering download
const INLINE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'])

// We need the original filename from the database to set a meaningful Content-Disposition.
// Since content-addressed storage uses hash-based keys (files/{hash}.{ext}), we look up
// the first database File record that references each hash to get a human-readable name.
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function getFilenameForHash(hash) {
  const result = await pool.query(
    'SELECT name FROM files WHERE hash = $1 LIMIT 1',
    [hash]
  )
  return result.rows[0]?.name || null
}

let updated = 0
let skipped = 0
let errors = 0
let continuationToken

do {
  const list = await client.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: 'files/',
    ContinuationToken: continuationToken,
  }))

  for (const obj of list.Contents || []) {
    const key = obj.Key
    if (!key) continue

    try {
      // Check if Content-Disposition is already set
      const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
      if (head.ContentDisposition) {
        skipped++
        continue
      }

      // Extract hash and extension from key: files/{hash}.{ext}
      const match = key.match(/^files\/([a-f0-9]+)\.(\w+)$/)
      if (!match) {
        skipped++
        continue
      }

      const [, hash, ext] = match
      const filename = await getFilenameForHash(hash)

      if (!filename) {
        // No DB record found — skip (orphaned S3 object)
        skipped++
        continue
      }

      const disposition = INLINE_EXTENSIONS.has(ext.toLowerCase()) ? 'inline' : 'attachment'
      const safeName = filename.replace(/["\\\n\r]/g, '_')
      const contentDisposition = `${disposition}; filename="${safeName}"`

      if (dryRun) {
        console.log(`Would set: ${key} → ${contentDisposition}`)
        updated++
        continue
      }

      // CopyObject in-place with new metadata
      await client.send(new CopyObjectCommand({
        Bucket: BUCKET,
        Key: key,
        CopySource: `${BUCKET}/${key}`,
        MetadataDirective: 'REPLACE',
        ContentType: head.ContentType,
        CacheControl: head.CacheControl || 'public, max-age=31536000, immutable',
        ContentDisposition: contentDisposition,
        ACL: 'public-read',
      }))

      updated++
      if (updated % 50 === 0) {
        console.log(`  ...updated ${updated} objects`)
      }
    } catch (err) {
      console.error(`Error processing ${key}:`, err.message)
      errors++
    }
  }

  continuationToken = list.NextContinuationToken
} while (continuationToken)

await pool.end()

console.log(`\nDone${dryRun ? ' (dry run)' : ''}:`)
console.log(`  Updated: ${updated}`)
console.log(`  Skipped: ${skipped}`)
console.log(`  Errors:  ${errors}`)

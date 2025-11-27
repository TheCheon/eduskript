# Plan: Reliable Large File Import with Background Processing

## Status: TODO (Not yet implemented)

This document describes the planned implementation for importing large ZIP files (100-500MB) without degrading server performance.

## Problem

1. **Next.js body size limit**: Next.js enforces a 10MB body size limit BEFORE route handlers run. The `serverActions.bodySizeLimit` config only affects Server Actions, not Route Handlers.
2. **Event loop blocking**: Large ZIP files could block the Node.js event loop during processing
3. **Memory spikes**: Unzipping large files in memory can exhaust available RAM

## Current Workaround

For large imports, use the direct CLI script:
```bash
node scripts/import-direct.mjs <path-to-zip> <user-id>
```

This bypasses HTTP entirely and imports directly via Prisma.

## Planned Solution: S3 Upload + Worker Thread Processing

### Architecture

```
Client                    S3                     Server
  |                       |                        |
  |-- 1. Request URL ---->|                        |
  |<-- Presigned URL -----|                        |
  |                       |                        |
  |-- 2. Upload ZIP ----->|                        |
  |                       |                        |
  |-- 3. Start import --->|----------------------->|
  |<-- Job ID ------------|                        |
  |                       |                        |
  |                       |<-- 4. Download ZIP ----|
  |                       |                        |
  |                       |    [Worker Thread]     |
  |                       |    - Stream unzip      |
  |                       |    - Parse JSON        |
  |                       |    - DB inserts        |
  |                       |                        |
  |-- 5. Poll status ---->|----------------------->|
  |<-- Progress/Complete --|                        |
```

### Flow

1. **Client requests presigned URL** - `POST /api/import/prepare`
2. **Client uploads directly to S3** - Bypasses Next.js entirely
3. **Client starts import job** - `POST /api/import?action=start&s3Key=xxx`
4. **Server spawns worker thread** - Downloads from S3, streams unzip
5. **Client polls for status** - `GET /api/import?action=status&jobId=xxx`

### Benefits

- **No body size limits** - S3 handles the upload
- **Non-blocking** - Worker thread doesn't affect web server
- **Memory efficient** - Streaming ZIP extraction
- **Progress feedback** - Real-time status updates

---

## Implementation Plan

### Phase 1: S3 Presigned URL Upload

**New file: `src/app/api/import/prepare/route.ts`**
```typescript
// POST /api/import/prepare
// Returns: { uploadUrl, s3Key, expiresAt }

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePresignedUploadUrl } from '@/lib/s3'
import { nanoid } from 'nanoid'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const s3Key = `imports/${session.user.id}/${nanoid()}.zip`
  const { url, expiresAt } = await generatePresignedUploadUrl(s3Key, 'application/zip', 900) // 15 min

  return Response.json({ uploadUrl: url, s3Key, expiresAt })
}
```

**Modify: `src/lib/s3.ts`**
```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900
): Promise<{ url: string; expiresAt: Date }> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn })
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  return { url, expiresAt }
}
```

### Phase 2: Worker Thread for Import Processing

**New file: `src/lib/import-worker.ts`**

The worker thread:
- Downloads ZIP from S3 using streaming
- Uses `yauzl` for memory-efficient ZIP extraction
- Processes files one at a time
- Reports progress via `parentPort.postMessage()`
- Batches database inserts (50 at a time)

```typescript
import { parentPort, workerData } from 'worker_threads'
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import yauzl from 'yauzl'

interface WorkerData {
  s3Key: string
  userId: string
  databaseUrl: string
}

async function processImport() {
  const { s3Key, userId, databaseUrl } = workerData as WorkerData

  try {
    // 1. Download from S3
    parentPort?.postMessage({ type: 'progress', percent: 5, message: 'Downloading from S3...' })
    const zipBuffer = await downloadFromS3(s3Key)

    // 2. Extract and process
    parentPort?.postMessage({ type: 'progress', percent: 10, message: 'Extracting ZIP...' })
    const result = await extractAndProcess(zipBuffer, userId, databaseUrl, (progress) => {
      parentPort?.postMessage({ type: 'progress', ...progress })
    })

    // 3. Cleanup S3
    await deleteFromS3(s3Key)

    // 4. Report completion
    parentPort?.postMessage({ type: 'complete', result })
  } catch (error) {
    parentPort?.postMessage({ type: 'error', error: String(error) })
  }
}

processImport()
```

**New file: `src/lib/import-job-manager.ts`**

```typescript
interface ImportJob {
  id: string
  userId: string
  status: 'pending' | 'downloading' | 'processing' | 'complete' | 'failed'
  progress: number
  message: string
  result?: ImportResult
  error?: string
  createdAt: Date
}

// In-memory job tracking with auto-cleanup
const jobs = new Map<string, ImportJob>()

export function startImportJob(userId: string, s3Key: string): string {
  const jobId = nanoid()

  const job: ImportJob = {
    id: jobId,
    userId,
    status: 'pending',
    progress: 0,
    message: 'Starting import...',
    createdAt: new Date()
  }

  jobs.set(jobId, job)

  // Spawn worker thread
  const worker = new Worker('./import-worker.js', {
    workerData: { s3Key, userId, databaseUrl: process.env.DATABASE_URL }
  })

  worker.on('message', (msg) => {
    if (msg.type === 'progress') {
      job.status = 'processing'
      job.progress = msg.percent
      job.message = msg.message
    } else if (msg.type === 'complete') {
      job.status = 'complete'
      job.progress = 100
      job.result = msg.result
      scheduleCleanup(jobId)
    } else if (msg.type === 'error') {
      job.status = 'failed'
      job.error = msg.error
      scheduleCleanup(jobId)
    }
  })

  return jobId
}

export function getJobStatus(jobId: string): ImportJob | null {
  return jobs.get(jobId) || null
}

function scheduleCleanup(jobId: string) {
  // Auto-delete job after 1 hour
  setTimeout(() => jobs.delete(jobId), 60 * 60 * 1000)
}
```

### Phase 3: Import API Updates

**Modify: `src/app/api/import/route.ts`**

```typescript
// New actions:
// POST /api/import?action=start&s3Key=xxx → Starts worker, returns { jobId }
// GET /api/import?action=status&jobId=xxx → Returns job status

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // ... existing auth check ...

  if (action === 'start') {
    const s3Key = searchParams.get('s3Key')
    if (!s3Key) {
      return Response.json({ error: 'Missing s3Key' }, { status: 400 })
    }

    const jobId = startImportJob(session.user.id, s3Key)
    return Response.json({ jobId })
  }

  // ... existing preview/confirm logic for small files ...
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'status') {
    const jobId = searchParams.get('jobId')
    const job = getJobStatus(jobId)

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    return Response.json(job)
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 })
}
```

### Phase 4: Frontend Updates

**Modify: `src/components/dashboard/import-export-settings.tsx`**

```typescript
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024 // 10MB

async function handleImport(file: File) {
  if (file.size > LARGE_FILE_THRESHOLD) {
    // Large file: use S3 + worker thread flow
    await handleLargeFileImport(file)
  } else {
    // Small file: use existing direct upload
    await handleDirectImport(file)
  }
}

async function handleLargeFileImport(file: File) {
  setStatus('preparing')

  // 1. Get presigned URL
  const { uploadUrl, s3Key } = await fetch('/api/import/prepare', {
    method: 'POST'
  }).then(r => r.json())

  // 2. Upload to S3 (with progress)
  setStatus('uploading')
  await uploadToS3(uploadUrl, file, (progress) => {
    setUploadProgress(progress)
  })

  // 3. Start import job
  setStatus('processing')
  const { jobId } = await fetch(`/api/import?action=start&s3Key=${s3Key}`, {
    method: 'POST'
  }).then(r => r.json())

  // 4. Poll for status
  await pollJobStatus(jobId, (job) => {
    setProgress(job.progress)
    setMessage(job.message)

    if (job.status === 'complete') {
      setResult(job.result)
      setStatus('complete')
    } else if (job.status === 'failed') {
      setError(job.error)
      setStatus('failed')
    }
  })
}
```

---

## Files to Create/Modify

### New Files
- `src/app/api/import/prepare/route.ts` - Presigned URL endpoint
- `src/lib/import-worker.ts` - Worker thread for processing
- `src/lib/import-job-manager.ts` - Job tracking

### Modified Files
- `src/lib/s3.ts` - Add `generatePresignedUploadUrl()`
- `src/app/api/import/route.ts` - Add async job flow
- `src/components/dashboard/import-export-settings.tsx` - Progress UI

### Dependencies to Add
```bash
pnpm add @aws-sdk/s3-request-presigner yauzl
pnpm add -D @types/yauzl
```

---

## Progress UI Design

```
+---------------------------------------------+
| Importing: algebra-collection.zip           |
|                                             |
| [################............] 55%          |
|                                             |
| Processing skript 3 of 5: Linear Equations  |
| Pages: 12/15 complete                       |
+---------------------------------------------+
```

---

## Cleanup Strategy

- **S3 temp files**: Auto-delete via S3 lifecycle rule (24h) or immediate delete on success
- **Job records**: Auto-cleanup after 1 hour (in-memory Map with TTL)
- **Worker threads**: Terminate on completion/error

---

## Fallback for Small Files

Files under 10MB continue using the current direct upload flow:
- No S3 required
- Synchronous processing
- Faster for simple imports

This keeps the common case (single skript imports) fast and doesn't require S3 configuration.

---

## Testing

1. **Small file import** (<10MB) - Should use existing direct flow
2. **Large file import** (>10MB) - Should use S3 + worker thread flow
3. **Import cancellation** - Worker should clean up S3 file
4. **Import failure** - Error should propagate to UI, S3 file cleaned up
5. **Concurrent imports** - Multiple jobs should run independently

---

## Security Considerations

- Presigned URLs expire after 15 minutes
- S3 keys include user ID to prevent cross-user access
- Jobs are associated with user ID and only accessible by owner
- S3 files deleted immediately after processing

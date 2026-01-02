import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateFile, sanitizeFilename } from '@/lib/file-storage'
import { generatePresignedUploadUrl, isTeacherS3Configured, getTeacherBucketName } from '@/lib/s3'
import { createHash, randomBytes } from 'crypto'

// Maximum file size for direct S3 upload (500MB - can handle large videos/databases)
const MAX_DIRECT_UPLOAD_SIZE = 500 * 1024 * 1024

/**
 * Generate a presigned URL for direct S3 upload
 *
 * This bypasses the server for large files, allowing clients to upload
 * directly to S3. The flow is:
 * 1. Client requests presigned URL with file metadata
 * 2. Server validates access and returns presigned URL + upload token
 * 3. Client uploads directly to S3
 * 4. Client calls /api/upload/confirm to create database record
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check S3 configuration
    if (!isTeacherS3Configured()) {
      return NextResponse.json(
        { error: 'Direct upload not available. S3 storage not configured.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { filename, size, contentType, skriptId } = body

    if (!filename || !size || !contentType || !skriptId) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, size, contentType, skriptId' },
        { status: 400 }
      )
    }

    // Validate file size
    if (size > MAX_DIRECT_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_DIRECT_UPLOAD_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Sanitize and validate filename
    const sanitizedFilename = sanitizeFilename(filename)
    const validation = validateFile(sanitizedFilename, size)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Verify skript ownership
    const skript = await prisma.skript.findFirst({
      where: {
        id: skriptId,
        authors: {
          some: {
            userId: session.user.id
          }
        }
      }
    })

    if (!skript) {
      return NextResponse.json({ error: 'Skript not found or access denied' }, { status: 403 })
    }

    // Generate a unique upload token and S3 key
    // Token is used to track this pending upload
    const uploadToken = randomBytes(32).toString('hex')
    const extension = sanitizedFilename.split('.').pop() || 'bin'

    // Use a temporary key with the upload token
    // After confirmation, we'll rename to the content-addressed key
    const tempKey = `uploads/pending/${uploadToken}.${extension}`

    // Generate presigned URL (valid for 30 minutes)
    const { url, expiresAt } = await generatePresignedUploadUrl(
      tempKey,
      contentType,
      1800, // 30 minutes
      getTeacherBucketName()
    )

    // Store pending upload in cache (or database for production)
    // For now, encode the metadata in a signed token
    const uploadData = {
      token: uploadToken,
      filename: sanitizedFilename,
      size,
      contentType,
      skriptId,
      userId: session.user.id,
      tempKey,
      expiresAt: expiresAt.toISOString()
    }

    // Create a simple signature for the upload data
    // In production, you might want to use JWT or store in database/Redis
    const dataString = JSON.stringify(uploadData)
    const signature = createHash('sha256')
      .update(dataString + process.env.NEXTAUTH_SECRET)
      .digest('hex')
      .slice(0, 16)

    return NextResponse.json({
      uploadUrl: url,
      uploadToken,
      // Include signed data for verification on confirm
      uploadData: Buffer.from(dataString).toString('base64'),
      signature,
      expiresAt: expiresAt.toISOString(),
      maxSize: MAX_DIRECT_UPLOAD_SIZE
    })
  } catch (error) {
    console.error('Presigned URL error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}

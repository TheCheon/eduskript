import { NextRequest, NextResponse } from 'next/server'
import { requireOrgAdmin } from '@/lib/org-auth'
import { uploadTeacherFile, getTeacherFileUrl, isTeacherS3Configured } from '@/lib/s3'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const orgId = formData.get('orgId') as string

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Verify user is org admin
    const { error } = await requireOrgAdmin(orgId)
    if (error) return error

    if (!isTeacherS3Configured()) {
      return NextResponse.json({ error: 'File storage not configured' }, { status: 500 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be less than 2MB' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate content hash for deduplication
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    const ext = file.name.split('.').pop() || 'png'

    // Upload to S3 with org-specific key format
    const key = await uploadTeacherFile(`org-icons/${hash}`, ext, buffer, file.type)

    // Get public URL
    const url = getTeacherFileUrl(key)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error uploading org icon:', error)
    return NextResponse.json(
      { error: 'Failed to upload icon' },
      { status: 500 }
    )
  }
}

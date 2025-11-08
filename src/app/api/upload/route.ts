import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveFile, listFiles, listAllFiles } from '@/lib/file-storage'

export async function POST(request: NextRequest) {
  console.log('[UPLOAD] Starting file upload request')
  try {
    const session = await getServerSession(authOptions)
    console.log('[UPLOAD] Session check:', { hasSession: !!session, userId: session?.user?.id })
    if (!session?.user?.id) {
      console.log('[UPLOAD] Unauthorized - no session or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[UPLOAD] Parsing form data...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    const skriptId = formData.get('skriptId') as string
    const parentId = formData.get('parentId') as string | null
    const overwrite = formData.get('overwrite') === 'true'

    console.log('[UPLOAD] Form data parsed:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      skriptId,
      parentId,
      overwrite
    })

    if (!file) {
      console.log('[UPLOAD] Error: No file provided in form data')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!skriptId) {
      console.log('[UPLOAD] Error: No skript ID provided')
      return NextResponse.json({ error: 'Skript ID is required for file upload' }, { status: 400 })
    }

    // Verify skript ownership
    console.log('[UPLOAD] Checking skript ownership for skriptId:', skriptId)
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
    console.log('[UPLOAD] Skript ownership check result:', { hasSkript: !!skript })

    if (!skript) {
      console.log('[UPLOAD] Error: Skript not found or access denied')
      return NextResponse.json({ error: 'Skript not found or access denied' }, { status: 403 })
    }

    // Convert file to buffer
    console.log('[UPLOAD] Converting file to buffer...')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log('[UPLOAD] File converted to buffer:', { bufferLength: buffer.length })

    // Save file using new file storage system
    console.log('[UPLOAD] Calling saveFile with params:', {
      bufferLength: buffer.length,
      filename: file.name,
      skriptId,
      userId: session.user.id,
      parentId: parentId || null,
      contentType: file.type,
      overwrite
    })
    const savedFile = await saveFile({
      buffer,
      filename: file.name,
      skriptId,
      userId: session.user.id,
      parentId: parentId || null,
      contentType: file.type,
      overwrite
    })
    console.log('[UPLOAD] File saved successfully:', savedFile)

    // Return file info
    const fileInfo = {
      id: savedFile.id,
      name: file.name, // For consistency with FileItem interface
      filename: file.name,
      originalName: file.name,
      size: savedFile.size,
      type: file.type,
      hash: savedFile.hash,
      url: savedFile.url,
      uploadType: 'skript',
      skriptId: skriptId,
      parentId: parentId || null,
      uploadedAt: new Date().toISOString()
    }

    console.log('[UPLOAD] Returning file info:', fileInfo)
    return NextResponse.json(fileInfo)
  } catch (error) {
    console.error('[UPLOAD] File upload error:', error)
    console.error('[UPLOAD] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

// Get files for a skript
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const skriptId = searchParams.get('skriptId')
    const parentId = searchParams.get('parentId') // null for root directory
    const recursive = searchParams.get('recursive') === 'true' // optional flag for recursive listing

    if (!skriptId) {
      return NextResponse.json({ error: 'Skript ID is required for file listing' }, { status: 400 })
    }

    // List files using new file storage system
    // If recursive flag is set or parentId is not specified, get all files
    const files = recursive || !parentId
      ? await listAllFiles({
          skriptId,
          userId: session.user.id
        })
      : await listFiles({
          skriptId,
          parentId: parentId || null,
          userId: session.user.id
        })

    return NextResponse.json({ files })
  } catch (error) {
    console.error('[UPLOAD_GET] File listing error:', error)
    console.error('[UPLOAD_GET] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list files' },
      { status: 500 }
    )
  }
}

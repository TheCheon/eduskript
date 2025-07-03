import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, slug } = body

    if (!title?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      )
    }

    // Check if chapter exists and belongs to user
    const existingChapter = await prisma.chapter.findFirst({
      where: {
        id,
        authorId: session.user.id
      }
    })

    if (!existingChapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    // Check if slug is already used in the same script (but not this chapter)
    const slugExists = await prisma.chapter.findFirst({
      where: {
        slug,
        scriptId: existingChapter.scriptId,
        id: { not: id }
      }
    })

    if (slugExists) {
      return NextResponse.json(
        { error: 'Slug already exists in this script' },
        { status: 400 }
      )
    }

    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        slug: slug.trim(),
        updatedAt: new Date()
      },
      include: {
        pages: {
          orderBy: { order: 'asc' }
        }
      }
    })

    return NextResponse.json(chapter)
  } catch (error) {
    console.error('Error updating chapter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if chapter exists and belongs to user
    const existingChapter = await prisma.chapter.findFirst({
      where: {
        id,
        authorId: session.user.id
      }
    })

    if (!existingChapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    // Delete chapter and all its pages
    await prisma.chapter.delete({
      where: { id }
    })

    // Revalidate the scripts pages
    revalidatePath('/dashboard/scripts')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chapter:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

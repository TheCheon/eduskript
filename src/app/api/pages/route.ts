import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, slug, chapterId } = body

    if (!title?.trim() || !slug?.trim() || !chapterId) {
      return NextResponse.json(
        { error: 'Title, slug, and chapter ID are required' },
        { status: 400 }
      )
    }

    // Check if chapter exists and belongs to user
    const chapter = await prisma.chapter.findFirst({
      where: {
        id: chapterId,
        authorId: session.user.id
      },
      include: {
        script: {
          select: { slug: true }
        }
      }
    })

    if (!chapter) {
      return NextResponse.json(
        { error: 'Chapter not found' },
        { status: 404 }
      )
    }

    // Check if slug already exists in this chapter
    const existingPage = await prisma.page.findFirst({
      where: {
        slug: slug.trim(),
        chapterId
      }
    })

    if (existingPage) {
      return NextResponse.json(
        { error: 'Slug already exists in this chapter' },
        { status: 400 }
      )
    }

    // Get the next order number
    const lastPage = await prisma.page.findFirst({
      where: { chapterId },
      orderBy: { order: 'desc' }
    })

    const order = (lastPage?.order || 0) + 1

    // Create the page
    const page = await prisma.page.create({
      data: {
        title: title.trim(),
        slug: slug.trim(),
        chapterId,
        authorId: session.user.id,
        order,
        content: '', // Empty content initially
        isPublished: false
      }
    })

    // Create initial version
    await prisma.pageVersion.create({
      data: {
        pageId: page.id,
        content: '',
        version: 1,
        authorId: session.user.id
      }
    })

    // Revalidate the script page to show the new page
    revalidatePath(`/dashboard/scripts`)
    revalidatePath(`/dashboard/scripts/${chapter.script.slug}`)

    return NextResponse.json(page)
  } catch (error) {
    console.error('Error creating page:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

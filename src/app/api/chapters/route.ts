import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/markdown'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { title, description, slug, scriptId } = await request.json()

    // Validate input
    if (!title || !slug || !scriptId) {
      return NextResponse.json(
        { error: 'Title, slug, and script ID are required' },
        { status: 400 }
      )
    }

    // Verify the script belongs to the user
    const script = await prisma.script.findUnique({
      where: {
        id: scriptId,
        authorId: session.user.id
      }
    })

    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      )
    }

    // Normalize slug
    const normalizedSlug = generateSlug(slug)

    // Check if slug is already taken in this script
    const existingChapter = await prisma.chapter.findUnique({
      where: {
        scriptId_slug: {
          scriptId: scriptId,
          slug: normalizedSlug
        }
      }
    })

    if (existingChapter) {
      return NextResponse.json(
        { error: 'A chapter with this slug already exists in this script' },
        { status: 400 }
      )
    }

    // Get the next order number
    const lastChapter = await prisma.chapter.findFirst({
      where: { scriptId },
      orderBy: { order: 'desc' }
    })

    const order = (lastChapter?.order || 0) + 1

    // Create chapter
    const chapter = await prisma.chapter.create({
      data: {
        title,
        description,
        slug: normalizedSlug,
        order,
        scriptId,
        authorId: session.user.id,
      },
      include: {
        pages: true
      }
    })

    // Revalidate the script page to show the new chapter
    revalidatePath(`/dashboard/scripts`)
    revalidatePath(`/dashboard/scripts/${script.slug}`)

    return NextResponse.json(chapter)

  } catch (error) {
    console.error('Chapter creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

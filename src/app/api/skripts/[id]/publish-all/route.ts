import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkSkriptPermissions } from '@/lib/permissions'

/**
 * POST /api/skripts/[id]/publish-all
 * Publishes the skript and all its pages
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id

    // Fetch skript with authors
    const skript = await prisma.skript.findUnique({
      where: { id },
      include: {
        authors: {
          include: {
            user: true
          }
        }
      }
    })

    if (!skript) {
      return NextResponse.json({ error: 'Skript not found' }, { status: 404 })
    }

    // Check permission
    const permission = checkSkriptPermissions(userId, skript.authors)
    if (!permission.canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update skript and all pages in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Publish the skript
      const skript = await tx.skript.update({
        where: { id },
        data: { isPublished: true }
      })

      // Publish all pages in the skript
      const pages = await tx.page.updateMany({
        where: { skriptId: id },
        data: { isPublished: true }
      })

      return {
        skript,
        pagesUpdated: pages.count
      }
    })

    return NextResponse.json({
      success: true,
      skriptId: result.skript.id,
      pagesPublished: result.pagesUpdated
    })
  } catch (error) {
    console.error('[publish-all] Error:', error)
    return NextResponse.json(
      { error: 'Failed to publish' },
      { status: 500 }
    )
  }
}

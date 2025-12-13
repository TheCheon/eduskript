/**
 * User Data Item API
 *
 * GET /api/user-data/[adapter]/[itemId]
 * Fetch a single user data item.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    adapter: string
    itemId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { adapter, itemId } = await params
    const decodedItemId = decodeURIComponent(itemId)

    // Check for targeting query params (for teacher broadcast/feedback)
    const { searchParams } = new URL(request.url)
    const targetType = searchParams.get('targetType') as 'class' | 'student' | 'page' | null
    const targetId = searchParams.get('targetId')

    // Public page annotations can be read by anyone (no auth required)
    if (targetType === 'page') {
      const item = await prisma.userData.findFirst({
        where: {
          adapter,
          itemId: decodedItemId,
          targetType: 'page',
        },
      })

      if (!item) {
        return NextResponse.json({
          adapter,
          itemId: decodedItemId,
          data: null,
          version: 0,
          updatedAt: null,
        })
      }

      return NextResponse.json({
        adapter: item.adapter,
        itemId: item.itemId,
        data: item.data,
        version: item.version,
        updatedAt: item.updatedAt.getTime(),
      })
    }

    // All other requests require authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch data with optional targeting
    const item = await prisma.userData.findFirst({
      where: {
        userId,
        adapter,
        itemId: decodedItemId,
        targetType: targetType || null,
        targetId: targetId || null,
      },
    })

    if (!item) {
      // Return null data for items that don't exist yet - this is expected for
      // quizzes/editors that haven't been interacted with, not an error
      return NextResponse.json({
        adapter,
        itemId: decodedItemId,
        data: null,
        version: 0,
        updatedAt: null,
      })
    }

    return NextResponse.json({
      adapter: item.adapter,
      itemId: item.itemId,
      data: item.data,
      version: item.version,
      updatedAt: item.updatedAt.getTime(),
    })
  } catch (error) {
    console.error('[user-data/item] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { adapter, itemId } = await params
    const decodedItemId = decodeURIComponent(itemId)

    // Delete the item if it exists
    await prisma.userData.deleteMany({
      where: {
        userId,
        adapter,
        itemId: decodedItemId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[user-data/item] Delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

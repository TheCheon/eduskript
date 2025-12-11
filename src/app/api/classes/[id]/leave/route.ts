import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * DELETE /api/classes/[id]/leave
 *
 * Leave a class (self-unenroll). Any user can leave a class they're a member of.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: classId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete own membership only
    const result = await prisma.classMembership.deleteMany({
      where: {
        classId,
        studentId: session.user.id
      }
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'You are not a member of this class' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error leaving class:', error)
    return NextResponse.json(
      { error: 'Failed to leave class' },
      { status: 500 }
    )
  }
}

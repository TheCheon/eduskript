import { NextResponse } from 'next/server'
import { requireOrgAdmin, getOrgMembership, canRemoveMember, OrgRole } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST /api/organizations/[orgId]/members/[userId]/reset-password - Org admin resets member password
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  const { orgId, userId } = await params
  const { error, session, membership: actorMembership } = await requireOrgAdmin(orgId)
  if (error) return error

  try {
    const { newPassword, requirePasswordReset } = await request.json()

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check if target user is a member of this org
    const targetMembership = await getOrgMembership(userId, orgId)
    if (!targetMembership) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 404 }
      )
    }

    // Can't reset your own password through this endpoint
    if (session?.user?.id === userId) {
      return NextResponse.json(
        { error: 'Cannot reset your own password through org admin. Use account settings.' },
        { status: 400 }
      )
    }

    // Check permission - use same logic as removing members
    // Owners can reset anyone's password, admins can only reset members' passwords
    const actorRole = actorMembership?.role || (session?.user?.isAdmin ? 'owner' : 'member')
    if (!canRemoveMember(actorRole as OrgRole, targetMembership.role as OrgRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to reset this member\'s password' },
        { status: 403 }
      )
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update user's password
    await prisma.user.update({
      where: { id: userId },
      data: {
        hashedPassword,
        requirePasswordReset: requirePasswordReset !== undefined ? requirePasswordReset : true,
      },
    })

    // TODO: Log this action for audit trail

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Error resetting member password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

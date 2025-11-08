import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { newPassword } = await request.json()

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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update user's password and clear requirePasswordReset flag
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        hashedPassword,
        requirePasswordReset: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

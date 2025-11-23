import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    return NextResponse.json({
      typographyPreference: user?.typographyPreference || 'modern'
    })
  } catch (error) {
    console.error('Error fetching typography preference:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preference' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { typographyPreference } = body

    // Validate the value
    if (!['modern', 'classic'].includes(typographyPreference)) {
      return NextResponse.json(
        { error: 'Invalid typography preference value' },
        { status: 400 }
      )
    }

    // Update the user's preference
    await prisma.user.update({
      where: { id: session.user.id },
      data: { typographyPreference }
    })

    return NextResponse.json({
      success: true,
      typographyPreference
    })
  } catch (error) {
    console.error('Error updating typography preference:', error)
    return NextResponse.json(
      { error: 'Failed to update preference' },
      { status: 500 }
    )
  }
}

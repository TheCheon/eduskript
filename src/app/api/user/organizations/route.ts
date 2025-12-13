import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserOrganizations } from '@/lib/org-auth'

// GET /api/user/organizations - Get current user's organizations
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const organizations = await getUserOrganizations(session.user.id)
    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Error fetching user organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

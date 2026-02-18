import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// POST /api/organizations - Create a new organization (admin only)
export async function POST(request: Request) {
  const { error, session } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const { name, slug } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!slug || typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    const existing = await prisma.organization.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'An organization with this slug already exists' }, { status: 400 })
    }

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        members: {
          create: {
            userId: session!.user.id,
            role: 'owner',
          },
        },
      },
    })

    return NextResponse.json({ id: org.id, slug: org.slug })
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }
}

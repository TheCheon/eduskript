import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Resolve a custom domain to organization slug
// This is an internal API used by middleware for domain resolution
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter required' }, { status: 400 })
    }

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim()

    // Look up the custom domain
    const customDomain = await prisma.customDomain.findFirst({
      where: {
        domain: normalizedDomain,
        isVerified: true,
      },
      include: {
        organization: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    })

    if (!customDomain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    return NextResponse.json({
      orgId: customDomain.organization.id,
      orgSlug: customDomain.organization.slug,
      orgName: customDomain.organization.name,
      isPrimary: customDomain.isPrimary,
    })
  } catch (error) {
    console.error('Error resolving domain:', error)
    return NextResponse.json({ error: 'Failed to resolve domain' }, { status: 500 })
  }
}

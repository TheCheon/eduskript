import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgAdmin, requireOrgMember } from '@/lib/org-auth'
import { randomBytes } from 'crypto'

// GET - List all custom domains for an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params

    // Any member can view domains
    const { error } = await requireOrgMember(orgId)
    if (error) return error

    const domains = await prisma.customDomain.findMany({
      where: { organizationId: orgId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ domains })
  } catch (error) {
    console.error('Error fetching custom domains:', error)
    return NextResponse.json(
      { error: 'Failed to fetch custom domains' },
      { status: 500 }
    )
  }
}

// POST - Add a new custom domain
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params

    // Only admins can add domains
    const { error } = await requireOrgAdmin(orgId)
    if (error) return error

    const body = await request.json()
    const { domain } = body

    // Validate domain format
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Normalize domain (lowercase, remove protocol and trailing slash)
    const normalizedDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .trim()

    // Basic domain validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/
    if (!domainRegex.test(normalizedDomain)) {
      return NextResponse.json(
        { error: 'Invalid domain format. Please enter a valid domain like "example.com"' },
        { status: 400 }
      )
    }

    // Check if domain is already claimed
    const existingDomain = await prisma.customDomain.findUnique({
      where: { domain: normalizedDomain },
    })

    if (existingDomain) {
      if (existingDomain.organizationId === orgId) {
        return NextResponse.json(
          { error: 'This domain is already added to your organization' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'This domain is already claimed by another organization' },
        { status: 400 }
      )
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex')

    // Create the custom domain
    const customDomain = await prisma.customDomain.create({
      data: {
        domain: normalizedDomain,
        organizationId: orgId,
        verificationToken,
        isVerified: false,
        isPrimary: false,
      },
    })

    return NextResponse.json({
      domain: customDomain,
      verificationInstructions: {
        type: 'TXT',
        host: `_eduskript-verify.${normalizedDomain}`,
        value: verificationToken,
        instructions: `Add a TXT record to your DNS with:\n\nHost: _eduskript-verify\nValue: ${verificationToken}\n\nThis proves you own the domain.`,
      },
    })
  } catch (error) {
    console.error('Error adding custom domain:', error)
    return NextResponse.json({ error: 'Failed to add custom domain' }, { status: 500 })
  }
}

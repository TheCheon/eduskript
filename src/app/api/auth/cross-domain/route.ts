import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Generate a cross-domain auth token
 * GET /api/auth/cross-domain?returnDomain=informatikgarten.ch&returnPath=/grundjahr/...
 *
 * This endpoint:
 * 1. Verifies the user is authenticated
 * 2. Validates the return domain is a registered custom domain
 * 3. Generates a one-time token
 * 4. Redirects to the custom domain with the token
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const returnDomain = searchParams.get('returnDomain')
  const returnPath = searchParams.get('returnPath') || '/'

  if (!returnDomain) {
    return NextResponse.json(
      { error: 'Missing return domain' },
      { status: 400 }
    )
  }

  // Strip www. prefix for lookup
  const domainWithoutWww = returnDomain.replace(/^www\./, '')

  // Validate return domain is a registered custom domain
  const customDomain = await prisma.teacherCustomDomain.findFirst({
    where: {
      OR: [
        { domain: returnDomain },
        { domain: domainWithoutWww },
        { domain: `www.${domainWithoutWww}` },
      ],
      isVerified: true,
    },
    select: { domain: true, userId: true }
  })

  if (!customDomain) {
    return NextResponse.json(
      { error: 'Invalid or unverified custom domain' },
      { status: 400 }
    )
  }

  // Get current session
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    // Not authenticated - redirect to sign in
    const signInUrl = `/auth/signin?callbackUrl=${encodeURIComponent(request.url)}`
    return NextResponse.redirect(new URL(signInUrl, request.url))
  }

  // Generate one-time token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 1000) // 1 minute expiry

  // Store token in database
  await prisma.crossDomainToken.create({
    data: {
      token,
      userId: session.user.id,
      domain: returnDomain,
      expiresAt,
    }
  })

  // Redirect to custom domain with token
  const redirectUrl = `https://${returnDomain}/api/auth/cross-domain-callback?token=${token}&returnPath=${encodeURIComponent(returnPath)}`
  return NextResponse.redirect(redirectUrl)
}

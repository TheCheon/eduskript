import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePseudonym } from '@/lib/privacy/pseudonym'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

interface ResolveEmailsRequest {
  emails: string[]
}

interface ResolvedEmail {
  email: string
  pseudonym: string | null
  resolved: boolean
}

/**
 * POST /api/classes/[id]/resolve-emails
 *
 * Resolves teacher's local email list to pseudonyms for students who have consented.
 * This allows teachers to see student identities while maintaining server-side privacy.
 *
 * Security:
 * - Only resolves emails for students in THIS specific class
 * - Only returns pseudonyms for students with identityConsent: true
 * - Emails are hashed and discarded immediately (never stored)
 * - Teacher cannot brute-force students outside their classes
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: classId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify class exists and user owns it
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true }
    })

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (classRecord.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to access this class' },
        { status: 403 }
      )
    }

    const body = await request.json() as ResolveEmailsRequest
    const { emails } = body

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'emails array is required' },
        { status: 400 }
      )
    }

    // Limit to prevent abuse
    if (emails.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 emails per request' },
        { status: 400 }
      )
    }

    // Get all class members with identity consent
    const memberships = await prisma.classMembership.findMany({
      where: {
        classId,
        identityConsent: true
      },
      include: {
        student: {
          select: {
            id: true,
            studentPseudonym: true
          }
        }
      }
    })

    // Create a Set of pseudonyms for students who have consented
    const consentedPseudonyms = new Set(
      memberships
        .map(m => m.student.studentPseudonym)
        .filter((p): p is string => p !== null)
    )

    // Resolve each email
    const resolved: ResolvedEmail[] = emails.map(email => {
      try {
        // Hash email to pseudonym (email is never stored)
        const pseudonym = generatePseudonym(email.toLowerCase().trim())

        // Check if this pseudonym belongs to a student who consented
        if (consentedPseudonyms.has(pseudonym)) {
          return {
            email,
            pseudonym,
            resolved: true
          }
        }

        // Not resolved (student hasn't joined with consent, or doesn't exist)
        return {
          email,
          pseudonym: null,
          resolved: false
        }
      } catch (error) {
        console.error('[API] Error resolving email:', email, error)
        return {
          email,
          pseudonym: null,
          resolved: false
        }
      }
    })

    return NextResponse.json({ resolved })
  } catch (error) {
    console.error('[API] Error resolving emails:', error)
    return NextResponse.json(
      { error: 'Failed to resolve emails' },
      { status: 500 }
    )
  }
}

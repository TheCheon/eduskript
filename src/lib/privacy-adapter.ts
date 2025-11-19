/**
 * Privacy-preserving adapter wrapper for NextAuth
 * For students: NEVER stores emails, only OAuth provider info
 * For teachers: Stores emails normally
 */

import type { Adapter, AdapterUser, AdapterAccount } from 'next-auth/adapters'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { generatePseudonym } from './privacy/pseudonym'

interface PrivacyAdapterOptions {
  prisma: PrismaClient
  /**
   * Function to determine if a user should be treated as a student
   * based on the signup context (e.g., domain, OAuth state)
   */
  isStudentSignup?: (email: string, context?: any) => boolean | Promise<boolean>
}

/**
 * Creates a privacy-preserving adapter that wraps PrismaAdapter
 * Students: OAuth-only, NO email storage
 * Teachers: Normal email storage
 */
export function PrivacyAdapter(options: PrivacyAdapterOptions): Adapter {
  const { prisma, isStudentSignup = () => false } = options
  const baseAdapter = PrismaAdapter(prisma) as Adapter

  return {
    ...baseAdapter,

    // Override linkAccount to capture OAuth info for students
    // @ts-ignore - Type mismatch between next-auth and @auth/prisma-adapter versions
    async linkAccount(account: any) {
      console.log('[PrivacyAdapter] Linking account:', {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        userId: account.userId
      })

      // Call base adapter to create Account record
      if (baseAdapter.linkAccount) {
        const result = await baseAdapter.linkAccount(account as any)

        // Update user with OAuth provider info if it's a student
        const user = await prisma.user.findUnique({
          where: { id: account.userId },
          select: { accountType: true, oauthProvider: true }
        })

        if (user?.accountType === 'student' && !user.oauthProvider) {
          // Store OAuth provider info (but keep email-based pseudonym for matching)
          await prisma.user.update({
            where: { id: account.userId },
            data: {
              oauthProvider: account.provider,
              oauthProviderId: account.providerAccountId,
              // DON'T overwrite studentPseudonym - it's email-based for teacher matching
            }
          })

          console.log('[PrivacyAdapter] Updated student with OAuth provider info')
        }

        return result
      }

      throw new Error('linkAccount not implemented in base adapter')
    },

    async createUser(user: Omit<AdapterUser, 'id'>) {
      // Check if this is a student signup
      const isStudent = await isStudentSignup(user.email, user)

      console.log('[PrivacyAdapter] Creating user:', {
        email: isStudent ? '[REDACTED - STUDENT]' : user.email,
        isStudent
      })

      if (isStudent) {
        // CRITICAL: For students, NEVER store email
        // We'll get OAuth provider info from linkAccount callback

        let createdUser
        try {
          // Store anonymized display name
          const anonymousName = `Student ${Math.random().toString(36).substring(2, 6)}`

          // Generate pseudonym from email (for teacher matching) but DON'T store the email
          const emailPseudonym = user.email ? generatePseudonym(user.email) : null

          // Create user WITHOUT email
          createdUser = await prisma.user.create({
            data: {
              name: anonymousName,
              accountType: 'student',
              studentPseudonym: emailPseudonym, // Store email-based pseudonym for matching
              lastSeenAt: new Date(),
              // All optional fields with null defaults are omitted
              // (Prisma will set them to null automatically)
            },
          })

          console.log('[PrivacyAdapter] Created student user without email storage:', createdUser.id)
        } catch (error: any) {
          console.error('[PrivacyAdapter] Error creating student user:', error)
          console.error('[PrivacyAdapter] Error message:', error.message)
          console.error('[PrivacyAdapter] Error stack:', error.stack)
          if (error.meta) console.error('[PrivacyAdapter] Error meta:', error.meta)
          throw error
        }

        // Note: PreAuthorizedStudent records are NOT auto-enrolled
        // Student will see them as join requests in their My Classes page
        // This allows them to choose whether to consent to identity reveal
        if (user.email) {
          const pseudonym = generatePseudonym(user.email)

          const preAuthCount = await prisma.preAuthorizedStudent.count({
            where: { pseudonym }
          })

          if (preAuthCount > 0) {
            console.log('[PrivacyAdapter] Student has', preAuthCount, 'pending class invitation(s) - will appear in My Classes')
          }
        }

        return {
          id: createdUser.id,
          email: `student_${createdUser.id}@eduskript.local`, // Return unique fake email for NextAuth
          emailVerified: null,
          name: createdUser.name,
          image: createdUser.image,
        }
      }

      // For teachers, use the base adapter (stores real email)
      if (baseAdapter.createUser) {
        const createdUser = await baseAdapter.createUser(user as AdapterUser & Omit<AdapterUser, 'id'>)

        // Set account type to teacher
        await prisma.user.update({
          where: { id: createdUser.id },
          data: {
            accountType: 'teacher',
            lastSeenAt: new Date(),
          },
        })

        return createdUser
      }

      throw new Error('createUser not implemented in base adapter')
    },
  }
}

/**
 * Helper to extract domain context from OAuth callback
 * This will be set in the OAuth state parameter
 */
export function isStudentFromCallback(email: string, request?: any): boolean {
  // Check if the callback contains student indicator
  // This will be set when initiating OAuth from a subdomain
  if (request?.query?.student === 'true') {
    return true
  }

  // Check if the callback URL indicates a subdomain signup
  if (request?.url) {
    const url = new URL(request.url, 'http://dummy.com')
    const domain = url.searchParams.get('domain')
    return domain === 'subdomain'
  }

  return false
}

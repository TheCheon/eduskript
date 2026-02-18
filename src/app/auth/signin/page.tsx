import { prisma } from '@/lib/prisma'
import { SignInForm } from '@/components/auth/signin-form'

interface SignInPageProps {
  searchParams: Promise<{ from?: string; callbackUrl?: string }>
}

/**
 * Server component that fetches branding data based on the 'from' param:
 * - "org/<slug>" → fetch Organization by slug → org-page layout
 * - "<pageSlug>" → fetch User by pageSlug → teacher-page layout
 * - (none) → default eduskript branding → org-page layout
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { from, callbackUrl } = await searchParams

  let context: {
    type: 'teacher-page' | 'org-page'
    slug: string
    name: string
    icon?: string | null
  }

  if (from?.startsWith('org/')) {
    // Org page context
    const orgSlug = from.substring(4)
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { name: true, slug: true, iconUrl: true },
    })

    context = {
      type: 'org-page',
      slug: orgSlug,
      name: org?.name || 'Eduskript',
      icon: org?.iconUrl || null,
    }
  } else if (from) {
    // Teacher page context
    const teacher = await prisma.user.findUnique({
      where: { pageSlug: from },
      select: { pageName: true, name: true, pageSlug: true, pageIcon: true },
    })

    context = {
      type: 'teacher-page',
      slug: from,
      name: teacher?.pageName || teacher?.name || from,
      icon: teacher?.pageIcon || null,
    }
  } else {
    // No context — default to eduskript org-page layout
    const defaultOrg = await prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { name: true, slug: true, iconUrl: true },
    })

    context = {
      type: 'org-page',
      slug: defaultOrg?.slug || 'eduskript',
      name: defaultOrg?.name || 'Eduskript',
      icon: defaultOrg?.iconUrl || null,
    }
  }

  return <SignInForm context={context} callbackUrl={callbackUrl || '/dashboard'} />
}

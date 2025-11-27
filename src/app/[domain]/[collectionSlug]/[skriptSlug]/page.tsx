import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { SkriptRedirect } from '@/components/SkriptRedirect'
import { PublicSiteLayout } from '@/components/public/layout'
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer'
import { headers } from 'next/headers'
import { getTeacherByUsernameDeduped, getAllPublishedCollections } from '@/lib/cached-queries'

// Enable ISR - pages are cached until explicitly invalidated
export const revalidate = false
export const dynamicParams = true

interface SkriptPreviewProps {
  params: Promise<{
    domain: string
    collectionSlug: string
    skriptSlug: string
  }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: SkriptPreviewProps): Promise<Metadata> {
  const { domain, collectionSlug, skriptSlug } = await params
  
  try {
    // Find the teacher and collection
    const teacher = await prisma.user.findUnique({
      where: { username: domain },
      select: { id: true, name: true, title: true }
    })

    if (!teacher) {
      return {
        title: 'Teacher Not Found',
        description: 'The requested teacher profile could not be found.'
      }
    }

    const collection = await prisma.collection.findFirst({
      where: {
        slug: collectionSlug,
        authors: {
          some: {
            userId: teacher.id
          }
        }
      },
      select: { title: true, description: true }
    })

    if (!collection) {
      return {
        title: 'Collection Not Found',
        description: 'The requested collection could not be found.'
      }
    }

    const skript = await prisma.skript.findFirst({
      where: {
        slug: skriptSlug,
        collectionSkripts: {
          some: {
            collection: {
              slug: collectionSlug,
              authors: {
                some: {
                  userId: teacher.id
                }
              }
            }
          }
        }
      },
      select: { title: true }
    })

    if (!skript) {
      return {
        title: 'Skript Not Found',
        description: 'The requested skript could not be found.'
      }
    }

    return {
      title: `${skript.title} - ${collection.title} | ${teacher.name || domain}`,
      description: `${skript.title} from ${collection.title} by ${teacher.name || domain}`,
      robots: 'noindex, nofollow' // Prevent search engines from indexing previews
    }
  } catch (error) {
    console.error('Error generating metadata for skript preview:', error)
    return {
      title: 'Skript Preview',
      description: 'Preview mode for skript content'
    }
  }
}

interface CollectionPage {
  id: string
  title: string
  slug: string
  order: number
  isPublished: boolean
}





export default async function SkriptPreviewPage({ params }: SkriptPreviewProps) {
  const { domain, collectionSlug, skriptSlug } = await params

  // Filter out obviously invalid domain values (browser/system requests)
  const invalidDomains = ['.well-known', '_next', 'api', 'favicon', 'robots', 'sitemap', 'apple-touch-icon', 'manifest']
  if (invalidDomains.some(invalid => domain.startsWith(invalid) || domain.includes('.'))) {
    notFound()
  }

  const session = await getServerSession(authOptions)

  // Check request headers
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  const hostWithoutPort = hostname.split(':')[0]
  const parts = hostWithoutPort.split('.')
  const hasSubdomain = (parts.length > 1 && parts[parts.length - 1] === 'localhost') ||
                      (parts.length > 2 && parts[parts.length - 2] === 'eduskript')

  try {
    // Find the teacher
    const teacher = await prisma.user.findUnique({
      where: { username: domain },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        bio: true,
        username: true
      }
    })

    if (!teacher) {
      notFound()
    }

    // Check if current user is the author
    const isAuthor = session?.user?.email === teacher.email

    // Find the collection with the specific skript
    const collection = await prisma.collection.findFirst({
      where: {
        slug: collectionSlug,
        authors: {
          some: {
            userId: teacher.id
          }
        }
      },
      include: {
        collectionSkripts: {
          where: {
            skript: {
              slug: skriptSlug
            }
          },
          include: {
            skript: {
              include: {
                pages: {
                  orderBy: { order: 'asc' },
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    order: true,
                    isPublished: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!collection) {
      notFound()
    }

    // Authorization check: Only the author can preview unpublished collections
    if (!collection.isPublished && !isAuthor) {
      notFound()
    }

    const collectionSkript = collection.collectionSkripts[0]
    if (!collectionSkript) {
      notFound()
    }

    const skript = collectionSkript.skript

    // Authorization check for skript
    if (!skript.isPublished && !isAuthor) {
      notFound()
    }

    // Check for published frontpage
    const frontPage = await prisma.frontPage.findFirst({
      where: {
        skriptId: skript.id,
        isPublished: true
      }
    })

    // If there's a published frontpage, show it
    if (frontPage?.content) {
      // Get all published collections for sidebar
      const rawCollections = await getAllPublishedCollections(teacher.id, domain)

      // Transform to SiteStructure format
      const collections = rawCollections.map(c => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        skripts: c.collectionSkripts.map(cs => ({
          id: cs.skript.id,
          title: cs.skript.title,
          slug: cs.skript.slug,
          pages: cs.skript.pages
        }))
      }))

      // Get teacher's preferences
      const teacherPrefs = await prisma.user.findUnique({
        where: { id: teacher.id },
        select: { sidebarBehavior: true, typographyPreference: true }
      })

      const teacherData = {
        name: teacher.name || 'Teacher',
        username: teacher.username || '',
        bio: teacher.bio || undefined,
        title: teacher.title || undefined
      }

      // Get available pages for navigation
      const availablePages = skript.pages.filter((page: CollectionPage) =>
        isAuthor || page.isPublished
      )

      return (
        <PublicSiteLayout
          teacher={teacherData}
          siteStructure={collections}
          rootSkripts={[]}
          sidebarBehavior={teacherPrefs?.sidebarBehavior as 'contextual' | 'full' || 'contextual'}
          typographyPreference={teacherPrefs?.typographyPreference as 'modern' | 'classic' || 'modern'}
        >
          <div className="prose-theme max-w-4xl mx-auto">
            {/* Frontpage content */}
            <MarkdownRenderer
              content={frontPage.content}
              context={{ domain, skriptId: skript.id }}
            />

            {/* Pages navigation */}
            {availablePages.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border">
                <h2 className="text-2xl font-semibold mb-6">Pages in this skript</h2>
                <div className="grid gap-3">
                  {availablePages.map((page: CollectionPage, index: number) => (
                    <Link
                      key={page.id}
                      href={`/${domain}/${collectionSlug}/${skriptSlug}/${page.slug}`}
                      className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="text-muted-foreground font-mono text-sm w-8">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="font-medium">{page.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PublicSiteLayout>
      )
    }

    // No frontpage - redirect to first available page
    const firstPage = skript.pages.find((page: CollectionPage) =>
      isAuthor || page.isPublished
    )

    if (firstPage) {
      // Redirect to the first available page
      const redirectUrl = hasSubdomain
        ? `/${collectionSlug}/${skriptSlug}/${firstPage.slug}`
        : `/${domain}/${collectionSlug}/${skriptSlug}/${firstPage.slug}`
      console.log('Redirecting to:', redirectUrl)
      return <SkriptRedirect redirectUrl={redirectUrl} />
    }

    // If no pages are available, redirect back to collection
    const redirectUrl = hasSubdomain
      ? `/${collectionSlug}`
      : `/${domain}/${collectionSlug}`
    console.log('Redirecting to:', redirectUrl)
    return <SkriptRedirect redirectUrl={redirectUrl} />

  } catch (error) {
    console.error('Error loading skript preview:', error)
    notFound()
  }
} 
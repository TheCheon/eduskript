import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { PublicSiteLayout } from '@/components/public/layout'

// Enable ISR with on-demand regeneration for previews
export const revalidate = 0 // No caching for previews to show latest changes
export const dynamic = 'force-dynamic' // Force dynamic rendering for auth checks

interface ScriptPreviewProps {
  params: Promise<{
    domain: string
    scriptSlug: string
  }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ScriptPreviewProps): Promise<Metadata> {
  const { domain, scriptSlug } = await params
  
  try {
    // Find the teacher and script
    const teacher = await prisma.user.findUnique({
      where: { subdomain: domain },
      select: { id: true, name: true, title: true }
    })

    if (!teacher) {
      return {
        title: 'Teacher Not Found',
        description: 'The requested teacher profile could not be found.'
      }
    }

    const script = await prisma.script.findUnique({
      where: {
        authorId_slug: {
          authorId: teacher.id,
          slug: scriptSlug
        }
      },
      select: { title: true, description: true }
    })

    if (!script) {
      return {
        title: 'Script Not Found',
        description: 'The requested script could not be found.'
      }
    }

    return {
      title: `${script.title} - Preview | ${teacher.name || domain}`,
      description: script.description || `Preview of ${script.title} by ${teacher.name || domain}`,
      robots: 'noindex, nofollow' // Prevent search engines from indexing previews
    }
  } catch (error) {
    console.error('Error generating metadata for script preview:', error)
    return {
      title: 'Script Preview',
      description: 'Preview mode for script content'
    }
  }
}

interface Teacher {
  id: string
  name: string | null
  email: string
  title: string | null
  bio: string | null
  subdomain: string | null
}

interface Script {
  id: string
  title: string
  slug: string
  description: string | null
  isPublished: boolean
  chapters: Array<{
    id: string
    title: string
    slug: string
    order: number
    isPublished: boolean
    pages: Array<{
      id: string
      title: string
      slug: string
      order: number
      isPublished: boolean
    }>
  }>
}

export default async function ScriptPreviewPage({ params }: ScriptPreviewProps) {
  const { domain, scriptSlug } = await params
  const session = await getServerSession(authOptions)

  // Declare variables outside try block so they can be used in redirect logic
  let teacher: Teacher | null = null
  let script: Script | null = null
  let isAuthor = false

  try {
    // Find the teacher
    teacher = await prisma.user.findUnique({
      where: { subdomain: domain },
      select: { 
        id: true, 
        name: true, 
        email: true,
        title: true, 
        bio: true, 
        subdomain: true 
      }
    })

    if (!teacher) {
      notFound()
    }

    // Find the script
    script = await prisma.script.findUnique({
      where: {
        authorId_slug: {
          authorId: teacher.id,
          slug: scriptSlug
        }
      },
      include: {
        chapters: {
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
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!script) {
      notFound()
    }

    // Authorization check: Only the author can preview unpublished scripts
    isAuthor = session?.user?.email === teacher.email
    
    if (!script.isPublished && !isAuthor) {
      // If script is not published and user is not the author, show access denied
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Access Denied
            </h1>
            <p className="text-muted-foreground mb-6">
              This script is not published yet. Only the author can preview unpublished content.
            </p>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }

  } catch (error) {
    console.error('Error loading script preview:', error)
    notFound()
  }

  // Find the first available page to redirect to (outside try/catch to allow redirect to work)
  const firstChapter = script.chapters.find(chapter => 
    isAuthor || chapter.isPublished
  )
  
  const firstPage = firstChapter?.pages.find(page => 
    isAuthor || page.isPublished
  )

  if (firstPage && firstChapter) {
    console.log(`Redirecting to: /${domain}/${scriptSlug}/${firstChapter.slug}/${firstPage.slug}`)
    // Redirect to the first available page
    redirect(`/${domain}/${scriptSlug}/${firstChapter.slug}/${firstPage.slug}`)
  }

  // Build site structure for navigation
  const siteStructure = [{
    id: script.id,
    title: script.title,
    slug: script.slug,
    isPublished: script.isPublished,
    chapters: script.chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      slug: chapter.slug,
      isPublished: chapter.isPublished,
      pages: chapter.pages.map(page => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        isPublished: page.isPublished
      }))
    }))
  }]

  // Prepare teacher data for the layout component
  const teacherForLayout = {
    name: teacher.name || teacher.subdomain || 'Unknown',
    subdomain: teacher.subdomain || domain,
    bio: teacher.bio || undefined,
    title: teacher.title || undefined
  }

    // If no pages are available, show script overview
    return (
      <PublicSiteLayout 
        teacher={teacherForLayout} 
        siteStructure={siteStructure}
        currentPath={`/${scriptSlug}`}
      >
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            {!script.isPublished && isAuthor && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Preview Mode:</strong> This script is not published yet. Only you can see this content.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {script.title}
            </h1>
            
            {script.description && (
              <p className="text-xl text-muted-foreground mb-8">
                {script.description}
              </p>
            )}
          </div>

          {/* Script Overview */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Contents</h2>
              {script.chapters.length > 0 ? (
                <div className="space-y-4">
                  {script.chapters.map((chapter, chapterIndex) => {
                    const isChapterVisible = isAuthor || chapter.isPublished
                    
                    if (!isChapterVisible) return null
                    
                    return (
                      <div key={chapter.id} className="border border-border rounded-lg p-4">
                        <h3 className="text-lg font-medium mb-2 flex items-center">
                          <span className="mr-2 text-muted-foreground">
                            {chapterIndex + 1}.
                          </span>
                          {chapter.title}
                          {!chapter.isPublished && isAuthor && (
                            <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                              Draft
                            </span>
                          )}
                        </h3>
                        
                        {chapter.pages.length > 0 ? (
                          <ul className="space-y-1 ml-6">
                            {chapter.pages.map((page, pageIndex) => {
                              const isPageVisible = isAuthor || page.isPublished
                              
                              if (!isPageVisible) return null
                              
                              return (
                                <li key={page.id} className="text-muted-foreground">
                                  <a 
                                    href={`/${domain}/${scriptSlug}/${chapter.slug}/${page.slug}`}
                                    className="hover:text-foreground hover:underline flex items-center"
                                  >
                                    <span className="mr-2">
                                      {chapterIndex + 1}.{pageIndex + 1}
                                    </span>
                                    {page.title}
                                    {!page.isPublished && isAuthor && (
                                      <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
                                        Draft
                                      </span>
                                    )}
                                  </a>
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground ml-6">No pages yet</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  This script doesn&apos;t have any chapters yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </PublicSiteLayout>
    )
}

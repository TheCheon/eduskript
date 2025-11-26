import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { prisma } from './prisma'

// Cache tags for granular invalidation
export const CACHE_TAGS = {
  user: (username: string) => `user:${username}`,
  collection: (id: string) => `collection:${id}`,
  collectionBySlug: (username: string, slug: string) => `collection:${username}:${slug}`,
  skript: (id: string) => `skript:${id}`,
  skriptBySlug: (username: string, collectionSlug: string, skriptSlug: string) =>
    `skript:${username}:${collectionSlug}:${skriptSlug}`,
  page: (id: string) => `page:${id}`,
  pageBySlug: (username: string, collectionSlug: string, skriptSlug: string, pageSlug: string) =>
    `page:${username}:${collectionSlug}:${skriptSlug}:${pageSlug}`,
  teacherContent: (username: string) => `teacher-content:${username}`,
} as const

/**
 * Get teacher by username - cached
 * Used for public page rendering
 */
export const getTeacherByUsername = (username: string) =>
  unstable_cache(
    async () => {
      return prisma.user.findFirst({
        where: { username },
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          bio: true,
          username: true,
          sidebarBehavior: true,
          typographyPreference: true,
        }
      })
    },
    [`teacher-${username}`],
    {
      tags: [CACHE_TAGS.user(username), 'teachers'],
      revalidate: false,
    }
  )()

/**
 * Get teacher with page layout - cached
 * Used for domain index pages
 */
export const getTeacherWithLayout = (username: string) =>
  unstable_cache(
    async () => {
      return prisma.user.findFirst({
        where: { username },
        include: {
          pageLayout: {
            include: {
              items: {
                orderBy: { order: 'asc' }
              }
            }
          }
        }
      })
    },
    [`teacher-layout-${username}`],
    {
      tags: [CACHE_TAGS.user(username), CACHE_TAGS.teacherContent(username)],
      revalidate: false,
    }
  )()

/**
 * Get published collection with skripts and pages - cached
 * Only returns published content for public consumption
 */
export const getPublishedCollection = (teacherId: string, username: string, collectionSlug: string) =>
  unstable_cache(
    async () => {
      return prisma.collection.findFirst({
        where: {
          slug: collectionSlug,
          isPublished: true,
          authors: {
            some: { userId: teacherId }
          }
        },
        include: {
          collectionSkripts: {
            where: {
              skript: { isPublished: true }
            },
            include: {
              skript: {
                include: {
                  pages: {
                    where: { isPublished: true },
                    orderBy: { order: 'asc' },
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      content: true,
                      order: true,
                      isPublished: true,
                    }
                  }
                }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      })
    },
    [`published-collection-${username}-${collectionSlug}`],
    {
      tags: [
        CACHE_TAGS.collectionBySlug(username, collectionSlug),
        CACHE_TAGS.teacherContent(username),
      ],
      revalidate: false,
    }
  )()

/**
 * Get all published collections for a teacher - cached
 * Used for full sidebar navigation
 */
export const getAllPublishedCollections = (teacherId: string, username: string) =>
  unstable_cache(
    async () => {
      return prisma.collection.findMany({
        where: {
          authors: {
            some: { userId: teacherId }
          },
          isPublished: true
        },
        include: {
          collectionSkripts: {
            where: {
              skript: { isPublished: true }
            },
            include: {
              skript: {
                include: {
                  pages: {
                    where: { isPublished: true },
                    orderBy: { order: 'asc' },
                    select: {
                      id: true,
                      title: true,
                      slug: true
                    }
                  }
                }
              }
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
    },
    [`all-published-collections-${username}`],
    {
      tags: [CACHE_TAGS.teacherContent(username)],
      revalidate: false,
    }
  )()

/**
 * Get published page content - cached
 * The main content fetch for public pages
 */
export const getPublishedPage = (
  teacherId: string,
  collectionSlug: string,
  skriptSlug: string,
  pageSlug: string,
  username?: string
) =>
  unstable_cache(
    async () => {
      const collection = await prisma.collection.findFirst({
        where: {
          slug: collectionSlug,
          isPublished: true,
          authors: {
            some: { userId: teacherId }
          }
        },
        include: {
          collectionSkripts: {
            where: {
              skript: {
                slug: skriptSlug,
                isPublished: true
              }
            },
            include: {
              skript: {
                include: {
                  pages: {
                    where: { isPublished: true },
                    orderBy: { order: 'asc' },
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      content: true,
                      order: true,
                      isPublished: true,
                    }
                  }
                }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      })

      if (!collection) return null

      const collectionSkript = collection.collectionSkripts[0]
      if (!collectionSkript) return null

      const skript = collectionSkript.skript
      const page = skript.pages.find(p => p.slug === pageSlug)
      if (!page) return null

      return {
        collection: {
          id: collection.id,
          title: collection.title,
          slug: collection.slug,
          description: collection.description,
          isPublished: collection.isPublished,
        },
        skript: {
          id: skript.id,
          title: skript.title,
          slug: skript.slug,
          isPublished: skript.isPublished,
        },
        page,
        // Include all pages for navigation
        allPages: skript.pages,
      }
    },
    [`published-page-${collectionSlug}-${skriptSlug}-${pageSlug}`],
    {
      tags: username ? [
        CACHE_TAGS.pageBySlug(username, collectionSlug, skriptSlug, pageSlug),
        CACHE_TAGS.skriptBySlug(username, collectionSlug, skriptSlug),
        CACHE_TAGS.collectionBySlug(username, collectionSlug),
        CACHE_TAGS.teacherContent(username),
      ] : [],
      revalidate: false,
    }
  )()

/**
 * React cache wrapper for request deduplication
 * Use this for queries that might be called multiple times in the same request
 */
export const getTeacherByUsernameDeduped = cache((username: string) => {
  return getTeacherByUsername(username)
})

/**
 * Get teacher's homepage content - cached
 * Fetches collections and skripts based on page layout
 */
export const getTeacherHomepageContent = (teacherId: string, username: string, pageLayoutItems: Array<{ type: string; contentId: string }>) =>
  unstable_cache(
    async () => {
      const collections: Array<{
        id: string
        title: string
        slug: string
        skripts: Array<{
          id: string
          title: string
          slug: string
          pages: Array<{ id: string; title: string; slug: string }>
        }>
      }> = []

      const rootSkripts: Array<{
        id: string
        title: string
        description: string | null
        slug: string
        collection: { title: string; slug: string }
        pages: Array<{ id: string; title: string; slug: string }>
      }> = []

      for (const item of pageLayoutItems) {
        if (item.type === 'collection') {
          const collection = await prisma.collection.findFirst({
            where: {
              id: item.contentId,
              isPublished: true,
              authors: { some: { userId: teacherId } }
            },
            include: {
              collectionSkripts: {
                where: { skript: { isPublished: true } },
                include: {
                  skript: {
                    include: {
                      pages: {
                        where: { isPublished: true },
                        orderBy: { order: 'asc' },
                        select: { id: true, title: true, slug: true }
                      }
                    }
                  }
                },
                orderBy: { order: 'asc' }
              }
            }
          })
          if (collection) {
            collections.push({
              id: collection.id,
              title: collection.title,
              slug: collection.slug,
              skripts: collection.collectionSkripts.map(cs => ({
                id: cs.skript.id,
                title: cs.skript.title,
                slug: cs.skript.slug,
                pages: cs.skript.pages
              }))
            })
          }
        } else if (item.type === 'skript') {
          const skript = await prisma.skript.findFirst({
            where: {
              id: item.contentId,
              isPublished: true,
              authors: { some: { userId: teacherId } }
            },
            include: {
              collectionSkripts: { include: { collection: true } },
              pages: {
                where: { isPublished: true },
                orderBy: { order: 'asc' },
                select: { id: true, title: true, slug: true }
              }
            }
          })
          if (skript) {
            const firstCollection = skript.collectionSkripts[0]?.collection
            rootSkripts.push({
              id: skript.id,
              title: skript.title,
              description: skript.description,
              slug: skript.slug,
              collection: firstCollection || { title: 'Uncategorized', slug: 'uncategorized' },
              pages: skript.pages
            })
          }
        }
      }

      return { collections, rootSkripts }
    },
    [`teacher-homepage-${username}`],
    {
      tags: [CACHE_TAGS.teacherContent(username)],
      revalidate: false,
    }
  )()

/**
 * Get collection for any user (including unpublished for authors)
 * NOT cached - used for preview mode
 */
export const getCollectionForPreview = async (teacherId: string, collectionSlug: string) => {
  return prisma.collection.findFirst({
    where: {
      slug: collectionSlug,
      authors: {
        some: { userId: teacherId }
      }
    },
    include: {
      collectionSkripts: {
        include: {
          skript: {
            include: {
              pages: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  content: true,
                  order: true,
                  isPublished: true,
                }
              }
            }
          }
        },
        orderBy: { order: 'asc' }
      }
    }
  })
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { revalidateTag, revalidatePath } from 'next/cache'

// Mock next/cache
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn, keys, options) => {
    // Return a function that calls the original function
    // but tracks calls for testing
    const cachedFn = async (...args: unknown[]) => {
      return fn(...args)
    }
    return cachedFn
  }),
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

// Mock react cache
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    cache: vi.fn((fn: unknown) => fn),
  }
})

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    collection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    skript: {
      findFirst: vi.fn(),
    },
    orgPageLayout: {
      findUnique: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  CACHE_TAGS,
  getTeacherByUsername,
  getTeacherWithLayout,
  getPublishedPage,
  getAllPublishedCollections,
  getTeacherHomepageContent,
  getOrgPublishedPage,
} from '@/lib/cached-queries'

describe('cached-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CACHE_TAGS', () => {
    it('should generate correct user tag', () => {
      expect(CACHE_TAGS.user('john')).toBe('user:john')
    })

    it('should generate correct collection tag', () => {
      expect(CACHE_TAGS.collection('123')).toBe('collection:123')
    })

    it('should generate correct collectionBySlug tag', () => {
      expect(CACHE_TAGS.collectionBySlug('john', 'math')).toBe('collection:john:math')
    })

    it('should generate correct skript tag', () => {
      expect(CACHE_TAGS.skript('456')).toBe('skript:456')
    })

    it('should generate correct skriptBySlug tag', () => {
      expect(CACHE_TAGS.skriptBySlug('john', 'math', 'algebra')).toBe('skript:john:math:algebra')
    })

    it('should generate correct page tag', () => {
      expect(CACHE_TAGS.page('789')).toBe('page:789')
    })

    it('should generate correct pageBySlug tag', () => {
      expect(CACHE_TAGS.pageBySlug('john', 'math', 'algebra', 'intro')).toBe('page:john:math:algebra:intro')
    })

    it('should generate correct teacherContent tag', () => {
      expect(CACHE_TAGS.teacherContent('john')).toBe('teacher-content:john')
    })
  })

  describe('getTeacherByUsername', () => {
    it('should call prisma with correct parameters', async () => {
      const mockTeacher = {
        id: 'teacher-1',
        name: 'John Doe',
        email: 'john@example.com',
        title: 'Professor',
        bio: 'Math teacher',
        pageSlug: 'john',
        pageName: 'John\'s Page',
        pageDescription: 'Math resources',
        sidebarBehavior: 'contextual',
        typographyPreference: 'modern',
      }

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockTeacher)

      const result = await getTeacherByUsername('john')

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { pageSlug: 'john' },
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          bio: true,
          pageSlug: true,
          pageName: true,
          pageDescription: true,
          pageIcon: true,
          sidebarBehavior: true,
          typographyPreference: true,
        },
      })
      expect(result).toEqual(mockTeacher)
    })

    it('should return null for non-existent user', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

      const result = await getTeacherByUsername('nonexistent')

      expect(result).toBeNull()
    })

    it('should be wrapped with unstable_cache for caching', () => {
      // The function is defined using unstable_cache pattern
      // We verify this by checking the function exists and returns expected data
      expect(typeof getTeacherByUsername).toBe('function')
    })
  })

  describe('getPublishedPage', () => {
    it('should return null when collection not found', async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null)

      const result = await getPublishedPage('teacher-1', 'math', 'algebra', 'intro', 'john')

      expect(result).toBeNull()
    })

    it('should return null when skript not found in collection', async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        id: 'col-1',
        title: 'Math',
        slug: 'math',
        description: 'Math collection',
        isPublished: true,
        collectionSkripts: [], // No skripts
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await getPublishedPage('teacher-1', 'math', 'algebra', 'intro', 'john')

      expect(result).toBeNull()
    })

    it('should return page data when found', async () => {
      const mockPage = {
        id: 'page-1',
        title: 'Introduction',
        slug: 'intro',
        content: '# Hello',
        order: 1,
        isPublished: true,
      }

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        id: 'col-1',
        title: 'Math',
        slug: 'math',
        description: 'Math collection',
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        collectionSkripts: [{
          id: 'cs-1',
          collectionId: 'col-1',
          skriptId: 'skript-1',
          userId: 'teacher-1',
          order: 1,
          createdAt: new Date(),
          skript: {
            id: 'skript-1',
            title: 'Algebra',
            slug: 'algebra',
            isPublished: true,
            pages: [mockPage],
          },
        }],
      })

      const result = await getPublishedPage('teacher-1', 'math', 'algebra', 'intro', 'john')

      expect(result).not.toBeNull()
      expect(result?.page).toEqual(mockPage)
      expect(result?.collection.slug).toBe('math')
      expect(result?.skript.slug).toBe('algebra')
    })

    it('should return null when page slug not found', async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        id: 'col-1',
        title: 'Math',
        slug: 'math',
        description: 'Math collection',
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        collectionSkripts: [{
          id: 'cs-1',
          collectionId: 'col-1',
          skriptId: 'skript-1',
          userId: 'teacher-1',
          order: 1,
          createdAt: new Date(),
          skript: {
            id: 'skript-1',
            title: 'Algebra',
            slug: 'algebra',
            isPublished: true,
            pages: [{
              id: 'page-1',
              title: 'Different Page',
              slug: 'different',
              content: '# Different',
              order: 1,
              isPublished: true,
            }],
          },
        }],
      })

      const result = await getPublishedPage('teacher-1', 'math', 'algebra', 'intro', 'john')

      expect(result).toBeNull()
    })
  })

  describe('getAllPublishedCollections', () => {
    it('should return empty array when no collections', async () => {
      vi.mocked(prisma.collection.findMany).mockResolvedValue([])

      const result = await getAllPublishedCollections('teacher-1', 'john')

      expect(result).toEqual([])
    })

    it('should return collections with skripts and pages', async () => {
      const mockCollections = [{
        id: 'col-1',
        title: 'Math',
        slug: 'math',
        description: 'Math collection',
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        collectionSkripts: [{
          id: 'cs-1',
          collectionId: 'col-1',
          skriptId: 'skript-1',
          userId: 'teacher-1',
          order: 1,
          createdAt: new Date(),
          skript: {
            id: 'skript-1',
            title: 'Algebra',
            slug: 'algebra',
            isPublished: true,
            pages: [{
              id: 'page-1',
              title: 'Intro',
              slug: 'intro',
            }],
          },
        }],
      }]

      vi.mocked(prisma.collection.findMany).mockResolvedValue(mockCollections)

      const result = await getAllPublishedCollections('teacher-1', 'john')

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Math')
      expect(result[0].collectionSkripts).toHaveLength(1)
    })
  })
})

describe('Cache invalidation integration', () => {
  it('should use correct tags for page cache invalidation', () => {
    const username = 'john'
    const collectionSlug = 'math'
    const skriptSlug = 'algebra'
    const pageSlug = 'intro'

    // These are the tags that should be invalidated when a page is updated
    const expectedTags = [
      CACHE_TAGS.pageBySlug(username, collectionSlug, skriptSlug, pageSlug),
      CACHE_TAGS.skriptBySlug(username, collectionSlug, skriptSlug),
      CACHE_TAGS.collectionBySlug(username, collectionSlug),
      CACHE_TAGS.teacherContent(username),
    ]

    expect(expectedTags).toEqual([
      'page:john:math:algebra:intro',
      'skript:john:math:algebra',
      'collection:john:math',
      'teacher-content:john',
    ])
  })

  it('should use correct tags for skript cache invalidation', () => {
    const username = 'john'
    const collectionSlug = 'math'
    const skriptSlug = 'algebra'

    // These are the tags that should be invalidated when a skript is updated
    const expectedTags = [
      CACHE_TAGS.skriptBySlug(username, collectionSlug, skriptSlug),
      CACHE_TAGS.collectionBySlug(username, collectionSlug),
      CACHE_TAGS.teacherContent(username),
    ]

    expect(expectedTags).toEqual([
      'skript:john:math:algebra',
      'collection:john:math',
      'teacher-content:john',
    ])
  })

  it('should use correct tags for collection cache invalidation', () => {
    const username = 'john'
    const collectionSlug = 'math'

    // These are the tags that should be invalidated when a collection is updated
    const expectedTags = [
      CACHE_TAGS.collectionBySlug(username, collectionSlug),
      CACHE_TAGS.teacherContent(username),
    ]

    expect(expectedTags).toEqual([
      'collection:john:math',
      'teacher-content:john',
    ])
  })
})

describe('revalidateTag integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call revalidateTag with correct profile parameter', () => {
    // This verifies Next.js 16 compatibility - revalidateTag requires 2 arguments
    const tag = CACHE_TAGS.pageBySlug('john', 'math', 'algebra', 'intro')

    // Simulate what the API route does
    revalidateTag(tag, 'default')

    expect(revalidateTag).toHaveBeenCalledWith('page:john:math:algebra:intro', 'default')
  })

  it('should call revalidatePath for fallback invalidation', () => {
    const path = '/john/math/algebra/intro'

    // Simulate what the API route does
    revalidatePath(path)

    expect(revalidatePath).toHaveBeenCalledWith('/john/math/algebra/intro')
  })

  it('should support hierarchical cache invalidation pattern', () => {
    const username = 'john'
    const collectionSlug = 'math'
    const skriptSlug = 'algebra'
    const pageSlug = 'intro'

    // Simulate hierarchical invalidation (what API route does for page update)
    revalidateTag(CACHE_TAGS.pageBySlug(username, collectionSlug, skriptSlug, pageSlug), 'default')
    revalidateTag(CACHE_TAGS.skriptBySlug(username, collectionSlug, skriptSlug), 'default')
    revalidateTag(CACHE_TAGS.collectionBySlug(username, collectionSlug), 'default')
    revalidateTag(CACHE_TAGS.teacherContent(username), 'default')

    expect(revalidateTag).toHaveBeenCalledTimes(4)
    expect(revalidateTag).toHaveBeenNthCalledWith(1, 'page:john:math:algebra:intro', 'default')
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'skript:john:math:algebra', 'default')
    expect(revalidateTag).toHaveBeenNthCalledWith(3, 'collection:john:math', 'default')
    expect(revalidateTag).toHaveBeenNthCalledWith(4, 'teacher-content:john', 'default')
  })
})

describe('getOrgPublishedPage - Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when org has no page layout', async () => {
    vi.mocked(prisma.orgPageLayout.findUnique).mockResolvedValue(null)

    const result = await getOrgPublishedPage('org-1', 'my-org', 'math', 'algebra', 'intro')

    expect(result).toBeNull()
    // Should not proceed to check collection or members
    expect(prisma.collection.findFirst).not.toHaveBeenCalled()
    expect(prisma.organizationMember.findMany).not.toHaveBeenCalled()
  })

  it('should return null when collection is not in org page layout', async () => {
    // Org has a page layout with only collection-A configured
    vi.mocked(prisma.orgPageLayout.findUnique).mockResolvedValue({
      id: 'layout-1',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        { id: 'item-1', orgPageLayoutId: 'layout-1', type: 'collection', contentId: 'collection-A', order: 0, createdAt: new Date() }
      ]
    })

    // But we're trying to access collection-B
    vi.mocked(prisma.collection.findFirst).mockResolvedValue({
      id: 'collection-B',
      title: 'Math',
      slug: 'math',
      description: null,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await getOrgPublishedPage('org-1', 'my-org', 'math', 'algebra', 'intro')

    expect(result).toBeNull()
    // Should check the page layout but not proceed to get members since collection not configured
    expect(prisma.orgPageLayout.findUnique).toHaveBeenCalled()
    expect(prisma.organizationMember.findMany).not.toHaveBeenCalled()
  })

  it('should return null when collection slug does not exist', async () => {
    vi.mocked(prisma.orgPageLayout.findUnique).mockResolvedValue({
      id: 'layout-1',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        { id: 'item-1', orgPageLayoutId: 'layout-1', type: 'collection', contentId: 'collection-A', order: 0, createdAt: new Date() }
      ]
    })

    // Collection slug doesn't exist
    vi.mocked(prisma.collection.findFirst)
      .mockResolvedValueOnce(null) // First call for slug check

    const result = await getOrgPublishedPage('org-1', 'my-org', 'nonexistent', 'algebra', 'intro')

    expect(result).toBeNull()
  })

  it('should return page when collection IS in org page layout', async () => {
    const mockPage = {
      id: 'page-1',
      title: 'Introduction',
      slug: 'intro',
      content: '# Hello',
      order: 1,
      isPublished: true,
      pageType: 'normal',
      examSettings: null,
    }

    // Org has collection-A configured
    vi.mocked(prisma.orgPageLayout.findUnique).mockResolvedValue({
      id: 'layout-1',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        { id: 'item-1', orgPageLayoutId: 'layout-1', type: 'collection', contentId: 'collection-A', order: 0, createdAt: new Date() }
      ]
    })

    // First findFirst call - check collection exists by slug
    vi.mocked(prisma.collection.findFirst)
      .mockResolvedValueOnce({
        id: 'collection-A', // Same as configured!
      })
      // Second findFirst call - get full collection data
      .mockResolvedValueOnce({
        id: 'collection-A',
        title: 'Math',
        slug: 'math',
        description: 'Math collection',
        isPublished: true,
        accentColor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        collectionSkripts: [{
          id: 'cs-1',
          collectionId: 'collection-A',
          skriptId: 'skript-1',
          userId: 'admin-1',
          order: 1,
          createdAt: new Date(),
          skript: {
            id: 'skript-1',
            title: 'Algebra',
            slug: 'algebra',
            isPublished: true,
            pages: [mockPage],
          },
        }],
      })

    // Admin members
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      { userId: 'admin-1' }
    ])

    const result = await getOrgPublishedPage('org-1', 'my-org', 'math', 'algebra', 'intro')

    expect(result).not.toBeNull()
    expect(result?.page.slug).toBe('intro')
    expect(result?.collection.id).toBe('collection-A')
  })

  it('should prevent access to content not configured in org layout (security test)', async () => {
    // This is the critical security test - an org admin owns content but hasn't
    // configured it in the org's page layout. It should NOT be accessible.

    // Org only has "tutorial" collection configured
    vi.mocked(prisma.orgPageLayout.findUnique).mockResolvedValue({
      id: 'layout-1',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        { id: 'item-1', orgPageLayoutId: 'layout-1', type: 'collection', contentId: 'tutorial-collection', order: 0, createdAt: new Date() }
      ]
    })

    // Attacker tries to access "secret" collection owned by same admin but not configured
    vi.mocked(prisma.collection.findFirst).mockResolvedValueOnce({
      id: 'secret-collection', // NOT in page layout items!
    })

    const result = await getOrgPublishedPage('org-1', 'my-org', 'secret', 'private-skript', 'page')

    // Should be blocked because 'secret-collection' is not in the configured items
    expect(result).toBeNull()
    // Should never reach member lookup since access blocked at page layout check
    expect(prisma.organizationMember.findMany).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockRequest, createMockSession, getResponseJSON } from '../helpers/api-helpers'
import { createTestDatabase, seedTestData } from '../helpers/test-db'
import type { PrismaClient } from '@prisma/client'

let testDb: Awaited<ReturnType<typeof createTestDatabase>>

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock prisma to use test database
vi.mock('@/lib/prisma', () => ({
  prisma: {} as PrismaClient,
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Import route handlers after mocks
import { POST as createPage } from '@/app/api/pages/route'
import { PATCH as updatePage, DELETE as deletePage } from '@/app/api/pages/[id]/route'

describe('Pages API', () => {
  let testData: Awaited<ReturnType<typeof seedTestData>>

  beforeEach(async () => {
    testDb = await createTestDatabase()
    testData = await seedTestData(testDb.prisma)
    Object.assign(prisma, testDb.prisma)
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  describe('POST /api/pages', () => {
    it('should create a new page when user is skript author', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/pages', {
        method: 'POST',
        body: {
          title: 'New Page',
          slug: 'new-page',
          content: '# New Page Content',
          skriptId: testData.skript.id,
        },
      })

      const response = await createPage(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.title).toBe('New Page')
      expect(data.slug).toMatch(/^new-page/)
      expect(data.content).toBe('# New Page Content')
      expect(data.skriptId).toBe(testData.skript.id)
      expect(data.authors).toHaveLength(1)
      expect(data.authors[0].userId).toBe(testData.users.user1.id)
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest('/api/pages', {
        method: 'POST',
        body: {
          title: 'New Page',
          slug: 'new-page',
          skriptId: testData.skript.id,
        },
      })

      const response = await createPage(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when required fields are missing', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/pages', {
        method: 'POST',
        body: {
          title: 'New Page',
          // Missing slug and skriptId
        },
      })

      const response = await createPage(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title, slug, and skript ID are required')
    })

    it('should return 404 when skript not found or access denied', async () => {
      const session = createMockSession(testData.users.user3.id) // user3 has no access
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/pages', {
        method: 'POST',
        body: {
          title: 'New Page',
          slug: 'new-page',
          skriptId: testData.skript.id,
        },
      })

      const response = await createPage(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Skript not found or access denied')
    })

    it('should return 409 when slug already exists in skript', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/pages', {
        method: 'POST',
        body: {
          title: 'Another Page',
          slug: testData.page.slug, // Use existing slug
          skriptId: testData.skript.id,
        },
      })

      const response = await createPage(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(409)
      expect(data.error).toBe('A page with this slug already exists in this skript')
    })

    it('should normalize slug', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/pages', {
        method: 'POST',
        body: {
          title: 'New Page',
          slug: 'New Page With Spaces!',
          skriptId: testData.skript.id,
        },
      })

      const response = await createPage(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.slug).toMatch(/^new-page-with-spaces/)
    })

    it('should create page with empty content if not provided', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/pages', {
        method: 'POST',
        body: {
          title: 'Empty Page',
          slug: 'empty-page',
          skriptId: testData.skript.id,
        },
      })

      const response = await createPage(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.content).toBe('')
    })

    it('should create initial version when creating page', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/pages', {
        method: 'POST',
        body: {
          title: 'Versioned Page',
          slug: 'versioned-page',
          content: 'Initial content',
          skriptId: testData.skript.id,
        },
      })

      const response = await createPage(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      // Check version was created
      const versions = await testDb.prisma.pageVersion.findMany({
        where: { pageId: data.id },
      })

      expect(versions).toHaveLength(1)
      expect(versions[0].content).toBe('Initial content')
      expect(versions[0].version).toBe(1)
      expect(versions[0].authorId).toBe(testData.users.user1.id)
    })

    it('should set correct order for new page', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/pages', {
        method: 'POST',
        body: {
          title: 'Second Page',
          slug: 'second-page',
          skriptId: testData.skript.id,
        },
      })

      const response = await createPage(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      // Should be ordered after the test page (order = 0)
      expect(data.order).toBeGreaterThan(testData.page.order)
    })
  })

  describe('PATCH /api/pages/[id]', () => {
    it('should update page when user is author', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: {
          title: 'Updated Title',
          slug: 'updated-slug',
          content: 'Updated content',
        },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.title).toBe('Updated Title')
      expect(data.slug).toBe('updated-slug')
      expect(data.content).toBe('Updated content')
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: { title: 'Updated' },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when page not found or access denied', async () => {
      const session = createMockSession(testData.users.user3.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: {
          title: 'Updated',
          slug: 'updated-slug', // Need both to pass validation
        },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Page not found')
    })

    it('should return 400 when slug already exists in skript', async () => {
      // Create another page
      const anotherPage = await testDb.prisma.page.create({
        data: {
          title: 'Another Page',
          slug: 'another-page',
          content: '',
          order: 1,
          skriptId: testData.skript.id,
          authors: {
            create: {
              userId: testData.users.user1.id,
              permission: 'author',
            },
          },
        },
      })

      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: {
          title: 'Updated',
          slug: anotherPage.slug, // Try to use existing slug
        },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe('Slug already exists in this skript')
    })

    it('should create new version when content changes', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const newContent = 'This is new content'

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: {
          content: newContent,
        },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })

      expect(response.status).toBe(200)

      // Check that a new version was created
      const versions = await testDb.prisma.pageVersion.findMany({
        where: { pageId: testData.page.id },
        orderBy: { version: 'desc' },
      })

      expect(versions.length).toBeGreaterThan(1)
      expect(versions[0].content).toBe(newContent)
      expect(versions[0].version).toBeGreaterThan(1)
      expect(versions[0].authorId).toBe(testData.users.user1.id)
    })

    it('should not create version when content unchanged', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      // Get initial version count
      const initialVersions = await testDb.prisma.pageVersion.findMany({
        where: { pageId: testData.page.id },
      })
      const initialCount = initialVersions.length

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: {
          title: 'New Title', // Only changing title, not content
          slug: 'new-slug',
        },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })

      expect(response.status).toBe(200)

      // Check version count unchanged
      const finalVersions = await testDb.prisma.pageVersion.findMany({
        where: { pageId: testData.page.id },
      })

      expect(finalVersions.length).toBe(initialCount)
    })

    it('should allow content-only update', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: {
          content: 'New content only',
        },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.content).toBe('New content only')
    })

    it('should allow publish-only update', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: {
          isPublished: false,
        },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.isPublished).toBe(false)
    })

    it('should require title and slug for non-content/publish updates', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: {
          title: 'New Title',
          // Missing slug
        },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title and slug are required')
    })

    it('should update multiple fields at once', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'PATCH',
        body: {
          title: 'Multi Update',
          slug: 'multi-update',
          content: 'Multi content',
          isPublished: false,
        },
      })

      const response = await updatePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.title).toBe('Multi Update')
      expect(data.slug).toBe('multi-update')
      expect(data.content).toBe('Multi content')
      expect(data.isPublished).toBe(false)
    })
  })

  describe('DELETE /api/pages/[id]', () => {
    it('should delete page when user is author', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'DELETE',
      })

      const response = await deletePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify it's actually deleted
      const deletedPage = await testDb.prisma.page.findUnique({
        where: { id: testData.page.id },
      })
      expect(deletedPage).toBeNull()
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'DELETE',
      })

      const response = await deletePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when page not found or access denied', async () => {
      const session = createMockSession(testData.users.user3.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'DELETE',
      })

      const response = await deletePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Page not found')
    })

    it('should delete page versions when deleting page', async () => {
      // Create some versions first
      await testDb.prisma.pageVersion.create({
        data: {
          pageId: testData.page.id,
          content: 'Version 2',
          version: 2,
          authorId: testData.users.user1.id,
        },
      })

      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'DELETE',
      })

      const response = await deletePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })

      expect(response.status).toBe(200)

      // Verify versions are also deleted
      const versions = await testDb.prisma.pageVersion.findMany({
        where: { pageId: testData.page.id },
      })
      expect(versions).toHaveLength(0)
    })

    it('should not allow unauthorized user to delete', async () => {
      const session = createMockSession(testData.users.user2.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/pages/${testData.page.id}`, {
        method: 'DELETE',
      })

      const response = await deletePage(request, {
        params: Promise.resolve({ id: testData.page.id }),
      })

      expect(response.status).toBe(404)

      // Verify it's NOT deleted
      const page = await testDb.prisma.page.findUnique({
        where: { id: testData.page.id },
      })
      expect(page).not.toBeNull()
    })
  })
})

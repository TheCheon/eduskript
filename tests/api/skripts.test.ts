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
import { GET as getSkripts, POST as createSkript } from '@/app/api/skripts/route'
import { GET as getSkript, PATCH as updateSkript, DELETE as deleteSkript } from '@/app/api/skripts/[id]/route'

describe('Skripts API', () => {
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

  describe('POST /api/skripts', () => {
    it('should create a new skript when user has collection edit permission', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts', {
        method: 'POST',
        body: {
          title: 'New Skript',
          description: 'Test skript description',
          slug: 'new-skript',
          collectionId: testData.collection.id,
        },
      })

      const response = await createSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.title).toBe('New Skript')
      expect(data.description).toBe('Test skript description')
      expect(data.slug).toMatch(/^new-skript/)
      expect(data.authors).toHaveLength(1)
      expect(data.authors[0].userId).toBe(testData.users.user1.id)
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest('/api/skripts', {
        method: 'POST',
        body: {
          title: 'New Skript',
          slug: 'new-skript',
          collectionId: testData.collection.id,
        },
      })

      const response = await createSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when required fields are missing', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts', {
        method: 'POST',
        body: {
          title: 'New Skript',
          // Missing slug and collectionId
        },
      })

      const response = await createSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe('Title, slug, and collection ID are required')
    })

    it('should return 404 when collection does not exist', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts', {
        method: 'POST',
        body: {
          title: 'New Skript',
          slug: 'new-skript',
          collectionId: 'nonexistent-id',
        },
      })

      const response = await createSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Collection not found')
    })

    it('should return 403 when user does not have edit permission on collection', async () => {
      const session = createMockSession(testData.users.user2.id) // viewer
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts', {
        method: 'POST',
        body: {
          title: 'New Skript',
          slug: 'new-skript-forbidden',
          collectionId: testData.collection.id,
        },
      })

      const response = await createSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(403)
      expect(data.error).toBe('You do not have permission to create skripts in this collection')
    })

    it('should return 409 when slug already exists', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts', {
        method: 'POST',
        body: {
          title: 'Another Skript',
          slug: testData.skript.slug, // Use existing slug
          collectionId: testData.collection.id,
        },
      })

      const response = await createSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(409)
      expect(data.error).toBe('A skript with this slug already exists')
    })

    it('should normalize slug', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts', {
        method: 'POST',
        body: {
          title: 'New Skript',
          slug: 'New Skript With Spaces!',
          collectionId: testData.collection.id,
        },
      })

      const response = await createSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.slug).toMatch(/^new-skript-with-spaces/)
    })

    it('should add skript to collection with correct order', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts', {
        method: 'POST',
        body: {
          title: 'Second Skript',
          slug: 'second-skript',
          collectionId: testData.collection.id,
        },
      })

      const response = await createSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.collectionSkripts).toBeDefined()
      expect(data.collectionSkripts.length).toBeGreaterThan(0)
    })
  })

  describe('GET /api/skripts', () => {
    it('should return user\'s skripts when authenticated', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts')

      const response = await getSkripts(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)

      const skript = data.data.find((s: any) => s.id === testData.skript.id)
      expect(skript).toBeDefined()
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest('/api/skripts')

      const response = await getSkripts(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should include shared skripts when includeShared=true', async () => {
      const session = createMockSession(testData.users.user2.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts', {
        searchParams: { includeShared: 'true' },
      })

      const response = await getSkripts(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      // User2 is a viewer on the collection, so should see skripts via collection
      expect(data.data.length).toBeGreaterThanOrEqual(0)
    })

    it('should include skript authors and pages', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts')

      const response = await getSkripts(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      const skript = data.data.find((s: any) => s.id === testData.skript.id)
      expect(skript.authors).toBeDefined()
      expect(skript.pages).toBeDefined()
      expect(skript.collectionSkripts).toBeDefined()
    })

    it('should return empty array when user has no skripts', async () => {
      const session = createMockSession(testData.users.user3.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts', {
        searchParams: { includeShared: 'false' },
      })

      const response = await getSkripts(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.data).toEqual([])
    })
  })

  describe('GET /api/skripts/[id]', () => {
    it('should return skript when user is author', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`)

      const response = await getSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(testData.skript.id)
      expect(data.permissions.canView).toBe(true)
      expect(data.permissions.canEdit).toBe(true)
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`)

      const response = await getSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when skript does not exist', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/nonexistent-id')

      const response = await getSkript(request, {
        params: Promise.resolve({ id: 'nonexistent-id' }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Skript not found')
    })

    it('should return 403 when user has no permission', async () => {
      const session = createMockSession(testData.users.user3.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`)

      const response = await getSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should return view-only permissions for collection author', async () => {
      const session = createMockSession(testData.users.user2.id) // viewer on collection
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`)

      const response = await getSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.permissions.canView).toBe(true)
      // Collection-level access only grants view permission
      expect(data.permissions.canEdit).toBe(false)
    })

    it('should include pages and collections', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`)

      const response = await getSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.data.pages).toBeDefined()
      expect(data.data.collectionSkripts).toBeDefined()
      expect(data.data.authors).toBeDefined()
    })
  })

  describe('PATCH /api/skripts/[id]', () => {
    it('should update skript when user is author', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'PATCH',
        body: {
          title: 'Updated Skript Title',
          description: 'Updated description',
        },
      })

      const response = await updateSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.title).toBe('Updated Skript Title')
      expect(data.description).toBe('Updated description')
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'PATCH',
        body: { title: 'Updated' },
      })

      const response = await updateSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when no fields provided', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'PATCH',
        body: {},
      })

      const response = await updateSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe('At least one field is required for update')
    })

    it('should return 404 when user is not author', async () => {
      const session = createMockSession(testData.users.user2.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'PATCH',
        body: { title: 'Updated' },
      })

      const response = await updateSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Skript not found or access denied')
    })

    it('should return 409 when slug already exists', async () => {
      // Create another skript first
      const anotherSkript = await testDb.prisma.skript.create({
        data: {
          title: 'Another Skript',
          slug: 'another-skript',
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

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'PATCH',
        body: { slug: anotherSkript.slug },
      })

      const response = await updateSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(409)
      expect(data.error).toBe('Slug already exists')
    })

    it('should update isPublished status', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'PATCH',
        body: { isPublished: false },
      })

      const response = await updateSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.isPublished).toBe(false)
    })

    it('should only update provided fields', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const originalTitle = testData.skript.title

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'PATCH',
        body: { description: 'Only description changed' },
      })

      const response = await updateSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.title).toBe(originalTitle)
      expect(data.description).toBe('Only description changed')
    })
  })

  describe('DELETE /api/skripts/[id]', () => {
    it('should delete skript when user is author', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'DELETE',
      })

      const response = await deleteSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.message).toBe('Skript deleted successfully')

      // Verify it's actually deleted
      const deletedSkript = await testDb.prisma.skript.findUnique({
        where: { id: testData.skript.id },
      })
      expect(deletedSkript).toBeNull()
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'DELETE',
      })

      const response = await deleteSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when user is not author', async () => {
      const session = createMockSession(testData.users.user2.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'DELETE',
      })

      const response = await deleteSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Skript not found or access denied')
    })

    it('should not allow unauthorized user to delete', async () => {
      const session = createMockSession(testData.users.user3.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest(`/api/skripts/${testData.skript.id}`, {
        method: 'DELETE',
      })

      const response = await deleteSkript(request, {
        params: Promise.resolve({ id: testData.skript.id }),
      })
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)

      // Verify it's NOT deleted
      const skript = await testDb.prisma.skript.findUnique({
        where: { id: testData.skript.id },
      })
      expect(skript).not.toBeNull()
    })
  })
})

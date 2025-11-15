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

// Import route handler after mocks
import { POST as moveSkript } from '@/app/api/skripts/move/route'

describe('Skripts Move API', () => {
  let testData: Awaited<ReturnType<typeof seedTestData>>
  let secondCollection: any

  beforeEach(async () => {
    testDb = await createTestDatabase()
    testData = await seedTestData(testDb.prisma)
    Object.assign(prisma, testDb.prisma)

    // Create a second collection for move testing
    secondCollection = await testDb.prisma.collection.create({
      data: {
        title: 'Second Collection',
        slug: 'second-collection',
        authors: {
          create: {
            userId: testData.users.user1.id,
            permission: 'author',
          },
        },
      },
    })

    vi.clearAllMocks()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  describe('Permission Checks', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: secondCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when skriptId is missing', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          targetCollectionId: secondCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(400)
      expect(data.error).toBe('skriptId is required')
    })

    it('should return 404 when skript does not exist', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: 'nonexistent-id',
          targetCollectionId: secondCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Skript not found')
    })

    it('should return 404 when target collection does not exist', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: 'nonexistent-collection',
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(404)
      expect(data.error).toBe('Target collection not found')
    })

    it('should return 403 when user has no permission on source', async () => {
      const session = createMockSession(testData.users.user3.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: secondCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(403)
      expect(data.error).toContain('edit permissions')
      expect(data.details.hasSkriptEditPermission).toBe(false)
      expect(data.details.hasCollectionEditPermission).toBe(false)
    })

    it('should return 403 when user has no permission on target collection', async () => {
      // Create a third collection owned by user3
      const thirdCollection = await testDb.prisma.collection.create({
        data: {
          title: 'Third Collection',
          slug: 'third-collection',
          authors: {
            create: {
              userId: testData.users.user3.id,
              permission: 'author',
            },
          },
        },
      })

      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: thirdCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(403)
      expect(data.error).toContain('target collection')
      expect(data.details.hasEditPermission).toBe(false)
    })
  })

  describe('Moving Between Collections', () => {
    it('should move skript when user is skript author', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: secondCollection.id,
          order: 0,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.collectionSkripts).toBeDefined()

      // Verify skript is in new collection
      const movedSkript = data.data.collectionSkripts.find(
        (cs: any) => cs.collectionId === secondCollection.id
      )
      expect(movedSkript).toBeDefined()
      expect(movedSkript.order).toBe(0)
    })

    it('should move skript when user has collection edit permission', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: secondCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should remove skript from old collection when moving', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const originalCollectionId = testData.collection.id

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: secondCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      // Verify skript is NOT in old collection
      const oldCollectionLink = data.data.collectionSkripts.find(
        (cs: any) => cs.collectionId === originalCollectionId
      )
      expect(oldCollectionLink).toBeUndefined()
    })

    it('should handle order parameter correctly', async () => {
      // Create multiple skripts in the target collection first
      await testDb.prisma.skript.create({
        data: {
          title: 'Existing Skript 1',
          slug: 'existing-1',
          collectionSkripts: {
            create: {
              collectionId: secondCollection.id,
              order: 0,
            },
          },
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

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: secondCollection.id,
          order: 0, // Insert at beginning
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      const movedSkript = data.data.collectionSkripts.find(
        (cs: any) => cs.collectionId === secondCollection.id
      )
      expect(movedSkript.order).toBe(0)
    })
  })

  describe('Automatic Permission Granting', () => {
    it('should grant edit permission when moving via collection permission', async () => {
      // Create a skript that user1 doesn't have direct permission on,
      // but can access via collection permission
      const newSkript = await testDb.prisma.skript.create({
        data: {
          title: 'Collaborative Skript',
          slug: 'collaborative-skript',
          collectionSkripts: {
            create: {
              collectionId: testData.collection.id,
              order: 1,
            },
          },
          authors: {
            create: {
              userId: testData.users.user2.id,
              permission: 'author',
            },
          },
        },
      })

      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: newSkript.id,
          targetCollectionId: secondCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      // Verify user1 now has edit permission on the skript
      const updatedSkript = await testDb.prisma.skript.findUnique({
        where: { id: newSkript.id },
        include: {
          authors: true,
        },
      })

      const userPermission = updatedSkript?.authors.find(
        (a) => a.userId === testData.users.user1.id
      )
      expect(userPermission).toBeDefined()
      expect(userPermission?.permission).toBe('author')
    })

    it('should upgrade viewer permission to author when moving', async () => {
      // Create a skript where user1 is a viewer
      const viewerSkript = await testDb.prisma.skript.create({
        data: {
          title: 'Viewer Skript',
          slug: 'viewer-skript',
          collectionSkripts: {
            create: {
              collectionId: testData.collection.id,
              order: 1,
            },
          },
          authors: {
            create: [
              {
                userId: testData.users.user2.id,
                permission: 'author',
              },
              {
                userId: testData.users.user1.id,
                permission: 'viewer',
              },
            ],
          },
        },
      })

      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: viewerSkript.id,
          targetCollectionId: secondCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      // Verify permission was upgraded
      const updatedSkript = await testDb.prisma.skript.findUnique({
        where: { id: viewerSkript.id },
        include: {
          authors: true,
        },
      })

      const userPermission = updatedSkript?.authors.find(
        (a) => a.userId === testData.users.user1.id
      )
      expect(userPermission?.permission).toBe('author')
    })
  })

  describe('Moving to Root Level', () => {
    it('should move skript to root level when targetCollectionId is null', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: null,
          order: 0,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify skript has a root-level entry (collectionId = null)
      const rootEntry = data.data.collectionSkripts.find(
        (cs: any) => cs.collectionId === null
      )
      expect(rootEntry).toBeDefined()
      expect(rootEntry.userId).toBe(testData.users.user1.id)
    })

    it('should remove from all collections when moving to root', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: null,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      // Verify no collection entries exist
      const collectionEntries = data.data.collectionSkripts.filter(
        (cs: any) => cs.collectionId !== null
      )
      expect(collectionEntries).toHaveLength(0)
    })
  })

  describe('Reordering Within Same Collection', () => {
    it('should reorder skript within the same collection', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      // Move to same collection with different order
      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: testData.collection.id,
          order: 5,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      const collectionLink = data.data.collectionSkripts.find(
        (cs: any) => cs.collectionId === testData.collection.id
      )
      expect(collectionLink.order).toBe(5)
    })

    it('should not duplicate skript when reordering in same collection', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: testData.collection.id,
          order: 2,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      // Verify skript appears only once in the collection
      const collectionLinks = data.data.collectionSkripts.filter(
        (cs: any) => cs.collectionId === testData.collection.id
      )
      expect(collectionLinks).toHaveLength(1)
    })
  })

  describe('Security Edge Cases', () => {
    it('should prevent moving to collection without edit permission', async () => {
      // Create a collection where user is only a viewer
      const viewOnlyCollection = await testDb.prisma.collection.create({
        data: {
          title: 'View Only Collection',
          slug: 'view-only',
          authors: {
            create: [
              {
                userId: testData.users.user2.id,
                permission: 'author',
              },
              {
                userId: testData.users.user1.id,
                permission: 'viewer',
              },
            ],
          },
        },
      })

      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: viewOnlyCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(403)
      expect(data.error).toContain('target collection')
    })

    it('should prevent viewer from moving skript', async () => {
      const session = createMockSession(testData.users.user2.id) // viewer on collection
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: secondCollection.id,
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(403)
      expect(data.error).toContain('edit permissions')
    })

    it('should handle transaction rollback on error', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      // Try to move to invalid state (this should fail in transaction)
      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: 'invalid-id-that-will-fail',
        },
      })

      const response = await moveSkript(request)

      // Should fail gracefully
      expect(response.status).toBeGreaterThanOrEqual(400)

      // Verify original state is preserved
      const originalSkript = await testDb.prisma.skript.findUnique({
        where: { id: testData.skript.id },
        include: {
          collectionSkripts: true,
        },
      })

      // Skript should still be in original collection
      const originalLink = originalSkript?.collectionSkripts.find(
        (cs) => cs.collectionId === testData.collection.id
      )
      expect(originalLink).toBeDefined()
    })
  })

  describe('Default Order Handling', () => {
    it('should default order to 0 when not provided', async () => {
      const session = createMockSession(testData.users.user1.id)
      vi.mocked(getServerSession).mockResolvedValue(session)

      const request = createMockRequest('/api/skripts/move', {
        method: 'POST',
        body: {
          skriptId: testData.skript.id,
          targetCollectionId: secondCollection.id,
          // No order provided
        },
      })

      const response = await moveSkript(request)
      const data = await getResponseJSON(response)

      expect(response.status).toBe(200)

      const movedSkript = data.data.collectionSkripts.find(
        (cs: any) => cs.collectionId === secondCollection.id
      )
      expect(movedSkript.order).toBe(0)
    })
  })
})

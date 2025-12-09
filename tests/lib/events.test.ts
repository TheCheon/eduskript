import { describe, it, expect, vi, beforeEach } from 'vitest'
import { memoryEventBus } from '@/lib/events/memory-bus'
import type { AppEvent } from '@/lib/events/types'

describe('InMemoryEventBus', () => {
  beforeEach(() => {
    // Clear all subscribers between tests
    // Note: In production, we use a singleton, but for tests we can verify behavior
  })

  describe('publish and subscribe', () => {
    it('should deliver events to subscribers', async () => {
      const handler = vi.fn()
      const event: AppEvent = {
        type: 'class-invitation',
        classId: 'class-123',
        className: 'Test Class'
      }

      const unsubscribe = memoryEventBus.subscribe('test-channel', handler)

      await memoryEventBus.publish('test-channel', event)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(event)

      unsubscribe()
    })

    it('should not deliver events after unsubscribe', async () => {
      const handler = vi.fn()
      const event: AppEvent = {
        type: 'class-invitation',
        classId: 'class-123',
        className: 'Test Class'
      }

      const unsubscribe = memoryEventBus.subscribe('test-channel-2', handler)
      unsubscribe()

      await memoryEventBus.publish('test-channel-2', event)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should deliver events to multiple subscribers', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const event: AppEvent = {
        type: 'class-invitation',
        classId: 'class-123',
        className: 'Test Class'
      }

      const unsub1 = memoryEventBus.subscribe('multi-channel', handler1)
      const unsub2 = memoryEventBus.subscribe('multi-channel', handler2)

      await memoryEventBus.publish('multi-channel', event)

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)

      unsub1()
      unsub2()
    })

    it('should only deliver events to the correct channel', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const event: AppEvent = {
        type: 'class-invitation',
        classId: 'class-123',
        className: 'Test Class'
      }

      const unsub1 = memoryEventBus.subscribe('channel-a', handler1)
      const unsub2 = memoryEventBus.subscribe('channel-b', handler2)

      await memoryEventBus.publish('channel-a', event)

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).not.toHaveBeenCalled()

      unsub1()
      unsub2()
    })

    it('should not throw when publishing to channel with no subscribers', async () => {
      const event: AppEvent = {
        type: 'class-invitation',
        classId: 'class-123',
        className: 'Test Class'
      }

      // Should not throw
      await expect(memoryEventBus.publish('non-existent-channel', event)).resolves.toBeUndefined()
    })

    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const goodHandler = vi.fn()
      const event: AppEvent = {
        type: 'class-invitation',
        classId: 'class-123',
        className: 'Test Class'
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const unsub1 = memoryEventBus.subscribe('error-channel', errorHandler)
      const unsub2 = memoryEventBus.subscribe('error-channel', goodHandler)

      // Should not throw even if one handler throws
      await expect(memoryEventBus.publish('error-channel', event)).resolves.toBeUndefined()

      // Both handlers should have been called
      expect(errorHandler).toHaveBeenCalled()
      expect(goodHandler).toHaveBeenCalled()

      // Error should have been logged
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
      unsub1()
      unsub2()
    })
  })

  describe('getSubscriberCount', () => {
    it('should return correct subscriber count', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      expect(memoryEventBus.getSubscriberCount('count-channel')).toBe(0)

      const unsub1 = memoryEventBus.subscribe('count-channel', handler1)
      expect(memoryEventBus.getSubscriberCount('count-channel')).toBe(1)

      const unsub2 = memoryEventBus.subscribe('count-channel', handler2)
      expect(memoryEventBus.getSubscriberCount('count-channel')).toBe(2)

      unsub1()
      expect(memoryEventBus.getSubscriberCount('count-channel')).toBe(1)

      unsub2()
      expect(memoryEventBus.getSubscriberCount('count-channel')).toBe(0)
    })
  })

  describe('getActiveChannels', () => {
    it('should return active channels', () => {
      const handler = vi.fn()

      const unsub1 = memoryEventBus.subscribe('active-1', handler)
      const unsub2 = memoryEventBus.subscribe('active-2', handler)

      const channels = memoryEventBus.getActiveChannels()
      expect(channels).toContain('active-1')
      expect(channels).toContain('active-2')

      unsub1()
      unsub2()
    })
  })
})

describe('AppEvent types', () => {
  it('should have correct structure for class-invitation', () => {
    const event: AppEvent = {
      type: 'class-invitation',
      classId: 'class-123',
      className: 'Math 101'
    }

    expect(event.type).toBe('class-invitation')
    expect(event.classId).toBe('class-123')
    expect(event.className).toBe('Math 101')
  })

  it('should have correct structure for teacher-annotations-update', () => {
    const event: AppEvent = {
      type: 'teacher-annotations-update',
      classId: 'class-123',
      pageId: 'page-456',
      canvasData: '{"strokes":[]}',
      timestamp: Date.now()
    }

    expect(event.type).toBe('teacher-annotations-update')
    expect(event.classId).toBe('class-123')
    expect(event.pageId).toBe('page-456')
  })

  it('should have correct structure for quiz-submission', () => {
    const event: AppEvent = {
      type: 'quiz-submission',
      classId: 'class-123',
      pageId: 'page-456',
      questionId: 'q-789',
      studentPseudonym: 'abc123',
      timestamp: Date.now()
    }

    expect(event.type).toBe('quiz-submission')
    expect(event.studentPseudonym).toBe('abc123')
  })

  it('should have correct structure for collaboration-request', () => {
    const event: AppEvent = {
      type: 'collaboration-request',
      fromUserId: 'user-123',
      fromName: 'John Doe'
    }

    expect(event.type).toBe('collaboration-request')
    expect(event.fromUserId).toBe('user-123')
    expect(event.fromName).toBe('John Doe')
  })
})

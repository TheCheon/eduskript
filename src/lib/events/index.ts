/**
 * Event System Entry Point
 *
 * Factory that selects the appropriate EventBus implementation
 * based on environment configuration.
 *
 * Usage:
 *   import { eventBus } from '@/lib/events'
 *   await eventBus.publish('user:123', { type: 'class-invitation', ... })
 */

import type { EventBus } from './types'
import { memoryEventBus } from './memory-bus'

// Future: import { postgresEventBus } from './postgres-bus'

/**
 * Get the configured EventBus implementation
 *
 * Set EVENT_BUS=postgres in .env when scaling to multiple servers
 */
export const eventBus: EventBus =
  process.env.EVENT_BUS === 'postgres'
    ? memoryEventBus  // TODO: Replace with postgresEventBus when implemented
    : memoryEventBus

// Re-export types for convenience
export * from './types'

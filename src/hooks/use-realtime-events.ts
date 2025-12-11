'use client'

/**
 * Real-Time Events Hook
 *
 * Provides a React hook for subscribing to Server-Sent Events.
 * Uses a SINGLETON EventSource connection shared across all hook instances.
 * This prevents multiple SSE connections and orphaned server handlers.
 */

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { AppEvent } from '@/lib/events/types'

type EventType = AppEvent['type']
type EventHandler = (event: AppEvent) => void

// Singleton EventSource manager
class SSEManager {
  private eventSource: EventSource | null = null
  private handlers = new Set<EventHandler>()
  private isConnecting = false
  private connectionPromise: Promise<void> | null = null

  connect(): Promise<void> {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return Promise.resolve()
    }

    if (this.connectionPromise) {
      return this.connectionPromise
    }

    if (this.isConnecting) {
      return Promise.resolve()
    }

    this.isConnecting = true
    this.connectionPromise = new Promise((resolve) => {
      this.eventSource = new EventSource('/api/events/stream')

      this.eventSource.onopen = () => {
        this.isConnecting = false
        this.connectionPromise = null
        resolve()
      }

      this.eventSource.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as AppEvent

          // Skip connection confirmation
          if ((event as { type: string }).type === 'connected') {
            return
          }

          // Notify all handlers
          this.handlers.forEach(handler => {
            try {
              handler(event)
            } catch (err) {
              console.error('[SSEManager] Handler error:', err)
            }
          })
        } catch (err) {
          console.error('[SSEManager] Parse error:', err)
        }
      }

      this.eventSource.onerror = () => {
        this.isConnecting = false
        this.connectionPromise = null
        // EventSource auto-reconnects
      }
    })

    return this.connectionPromise
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler)

    // Ensure connected
    this.connect()

    return () => {
      this.handlers.delete(handler)

      // Close connection if no more handlers
      if (this.handlers.size === 0 && this.eventSource) {
        this.eventSource.close()
        this.eventSource = null
      }
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }
}

// Global singleton instance
let sseManager: SSEManager | null = null

function getSSEManager(): SSEManager {
  if (!sseManager) {
    sseManager = new SSEManager()
  }
  return sseManager
}

interface UseRealtimeEventsOptions {
  enabled?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

/**
 * Subscribe to real-time events from the server
 * Uses a singleton EventSource connection shared across all components
 */
export function useRealtimeEvents<T extends EventType>(
  eventTypes: T[],
  onEvent: (event: Extract<AppEvent, { type: T }>) => void,
  options: UseRealtimeEventsOptions = {}
) {
  const { enabled = true } = options
  const { status } = useSession()
  const [isConnected, setIsConnected] = useState(false)

  // Use ref to always have latest callback without re-subscribing
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  })

  // Stable event types key
  const eventTypesKey = eventTypes.join(',')

  useEffect(() => {
    if (!enabled || status !== 'authenticated' || typeof window === 'undefined') {
      return
    }

    const manager = getSSEManager()

    const handler: EventHandler = (event) => {
      const types = eventTypesKey.split(',')
      if (types.includes(event.type)) {
        onEventRef.current(event as Extract<AppEvent, { type: T }>)
      }
    }

    const unsubscribe = manager.subscribe(handler)
    setIsConnected(manager.isConnected())

    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [enabled, status, eventTypesKey])

  return { isConnected }
}

/**
 * Hook to track SSE connection state
 */
export function useRealtimeConnection() {
  const { status } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useRealtimeEvents(
    [],
    () => {},
    {
      enabled: status === 'authenticated',
      onConnect: () => {
        setIsConnected(true)
        setError(null)
      },
      onDisconnect: () => {
        setIsConnected(false)
      },
      onError: () => {
        setError('Connection error')
      }
    }
  )

  return { isConnected, error }
}

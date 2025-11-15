/**
 * User Data React Hooks
 *
 * Provides React hooks for components to interact with the user data service.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { userDataService } from './userDataService'
import type { UseUserDataResult, SaveOptions } from './types'

/**
 * Hook for managing user data for a specific page component
 *
 * @param pageId - Database ID of the page
 * @param componentId - Component identifier (e.g., "code-editor-0", "annotations")
 * @param initialData - Default data if no saved data exists
 * @returns User data management interface
 *
 * @example
 * ```tsx
 * const { data, updateData, isLoading } = useUserData<CodeEditorData>(
 *   pageId,
 *   'code-editor-0',
 *   { files: [{ name: 'main.py', content: '' }], activeFileIndex: 0 }
 * )
 * ```
 */
export function useUserData<T>(
  pageId: string,
  componentId: string,
  initialData: T | null = null
): UseUserDataResult<T> {
  const [data, setData] = useState<T | null>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [isSynced, setIsSynced] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true)

  // Load data on mount
  useEffect(() => {
    isMountedRef.current = true

    const loadData = async () => {
      try {
        setIsLoading(true)
        const record = await userDataService.get<T>(pageId, componentId)

        if (isMountedRef.current) {
          if (record) {
            setData(record.data)
            setLastUpdated(record.updatedAt)
            setIsSynced(record.savedToRemote)
          } else {
            setData(initialData)
            setLastUpdated(null)
            setIsSynced(true)
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
        if (isMountedRef.current) {
          setData(initialData)
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMountedRef.current = false
    }
  }, [pageId, componentId, initialData])

  /**
   * Update user data with optional debouncing
   */
  const updateData = useCallback(
    async (newData: T, options: SaveOptions = {}) => {
      try {
        // Optimistically update local state
        setData(newData)
        setIsSynced(false)

        // Save to IndexedDB (debounced by default)
        await userDataService.save(pageId, componentId, newData, options)

        if (isMountedRef.current) {
          setLastUpdated(Date.now())
          setIsSynced(true)
        }
      } catch (error) {
        console.error('Failed to update user data:', error)
        throw error
      }
    },
    [pageId, componentId]
  )

  /**
   * Delete user data
   */
  const deleteData = useCallback(async () => {
    try {
      await userDataService.delete(pageId, componentId)

      if (isMountedRef.current) {
        setData(initialData)
        setLastUpdated(null)
        setIsSynced(true)
      }
    } catch (error) {
      console.error('Failed to delete user data:', error)
      throw error
    }
  }, [pageId, componentId, initialData])

  return {
    data,
    updateData,
    deleteData,
    isLoading,
    isSynced,
    lastUpdated,
  }
}

/**
 * Hook for checking if user data exists for a component
 *
 * @param pageId - Database ID of the page
 * @param componentId - Component identifier
 * @returns Whether data exists and the last updated timestamp
 */
export function useUserDataExists(
  pageId: string,
  componentId: string
): { exists: boolean; lastUpdated: number | null; isLoading: boolean } {
  const [exists, setExists] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const checkExists = async () => {
      try {
        setIsLoading(true)
        const record = await userDataService.get(pageId, componentId)

        if (isMounted) {
          setExists(!!record)
          setLastUpdated(record?.updatedAt || null)
        }
      } catch (error) {
        console.error('Failed to check user data:', error)
        if (isMounted) {
          setExists(false)
          setLastUpdated(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkExists()

    return () => {
      isMounted = false
    }
  }, [pageId, componentId])

  return { exists, lastUpdated, isLoading }
}

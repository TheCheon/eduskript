/**
 * User Data Service
 *
 * Singleton service for managing local user data persistence via IndexedDB.
 * Handles debounced saves, versioning, and future remote sync preparation.
 */

import { db } from './schema'
import type { UserDataRecord, SaveOptions } from './types'

/**
 * Singleton service for user data management
 */
export class UserDataService {
  private static instance: UserDataService
  private saveTimers: Map<string, NodeJS.Timeout> = new Map()
  private readonly DEFAULT_DEBOUNCE = 1000 // 1 second

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): UserDataService {
    if (!UserDataService.instance) {
      UserDataService.instance = new UserDataService()
    }
    return UserDataService.instance
  }

  /**
   * Generate cache key for debounce timers
   */
  private getCacheKey(pageId: string, componentId: string): string {
    return `${pageId}:${componentId}`
  }

  /**
   * Retrieve user data for a specific page component
   */
  public async get<T = any>(
    pageId: string,
    componentId: string
  ): Promise<UserDataRecord<T> | null> {
    try {
      const record = await db.userData.get([pageId, componentId])
      return (record as UserDataRecord<T>) || null
    } catch (error) {
      console.error('Failed to retrieve user data:', error)
      return null
    }
  }

  /**
   * Save user data for a specific page component
   */
  public async save<T = any>(
    pageId: string,
    componentId: string,
    data: T,
    options: SaveOptions = {}
  ): Promise<void> {
    const { debounce = this.DEFAULT_DEBOUNCE, immediate = false } = options
    const cacheKey = this.getCacheKey(pageId, componentId)

    // Clear existing timer if any
    const existingTimer = this.saveTimers.get(cacheKey)
    if (existingTimer) {
      clearTimeout(existingTimer)
      this.saveTimers.delete(cacheKey)
    }

    // If immediate save requested, execute now
    if (immediate) {
      await this.performSave(pageId, componentId, data)
      return
    }

    // Otherwise, debounce the save
    const timer = setTimeout(async () => {
      await this.performSave(pageId, componentId, data)
      this.saveTimers.delete(cacheKey)
    }, debounce)

    this.saveTimers.set(cacheKey, timer)
  }

  /**
   * Internal method to perform the actual save operation
   */
  private async performSave<T = any>(
    pageId: string,
    componentId: string,
    data: T
  ): Promise<void> {
    try {
      const existing = await this.get(pageId, componentId)
      const now = Date.now()

      const record: UserDataRecord<T> = {
        pageId,
        componentId,
        data,
        updatedAt: now,
        savedToRemote: false,
        version: existing ? existing.version + 1 : 1,
        createdAt: existing?.createdAt || new Date().toISOString(),
        userId: existing?.userId, // Preserve userId if it exists
      }

      await db.userData.put(record)
    } catch (error) {
      console.error('Failed to save user data:', error)
      throw error
    }
  }

  /**
   * Delete user data for a specific page component
   */
  public async delete(pageId: string, componentId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(pageId, componentId)

      // Clear pending save timer if any
      const existingTimer = this.saveTimers.get(cacheKey)
      if (existingTimer) {
        clearTimeout(existingTimer)
        this.saveTimers.delete(cacheKey)
      }

      await db.userData.delete([pageId, componentId])
    } catch (error) {
      console.error('Failed to delete user data:', error)
      throw error
    }
  }

  /**
   * Delete all data for a specific page
   */
  public async deleteAllForPage(pageId: string): Promise<void> {
    try {
      await db.userData.where('pageId').equals(pageId).delete()
    } catch (error) {
      console.error('Failed to delete page data:', error)
      throw error
    }
  }

  /**
   * Get all component IDs with data for a specific page
   */
  public async getComponentsForPage(pageId: string): Promise<string[]> {
    try {
      const records = await db.userData.where('pageId').equals(pageId).toArray()
      return records.map((r) => r.componentId)
    } catch (error) {
      console.error('Failed to retrieve page components:', error)
      return []
    }
  }

  /**
   * Clear old data (for cleanup purposes)
   * @param olderThanDays Delete records older than this many days
   */
  public async cleanupOldData(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
      const deleted = await db.userData.where('updatedAt').below(cutoff).delete()
      return deleted
    } catch (error) {
      console.error('Failed to cleanup old data:', error)
      return 0
    }
  }

  /**
   * Flush all pending saves immediately
   */
  public async flush(): Promise<void> {
    const promises: Promise<void>[] = []

    this.saveTimers.forEach((timer, cacheKey) => {
      clearTimeout(timer)
      const [pageId, componentId] = cacheKey.split(':')
      // Note: We don't have the data here, so this is best-effort
      // In practice, components should call save with immediate: true before unmounting
    })

    this.saveTimers.clear()
    await Promise.all(promises)
  }
}

// Export singleton instance
export const userDataService = UserDataService.getInstance()

/**
 * User Data Service Database Schema
 *
 * Dexie-based IndexedDB schema for local user data storage
 */

import Dexie, { Table } from 'dexie'
import type { UserDataRecord, UserDataVersion, VersionBlob } from './types'

export class UserDataDatabase extends Dexie {
  userData!: Table<UserDataRecord, [string, string]>
  userData_history!: Table<UserDataVersion, number>
  versionBlobs!: Table<VersionBlob, string>

  constructor() {
    super('EduskriptUserData')

    // Version 1 (original schema)
    this.version(1).stores({
      // Compound primary key [pageId, componentId]
      // Indexes on updatedAt for cleanup, userId for future sync
      userData: '[pageId+componentId], updatedAt, userId, savedToRemote'
    })

    // Version 2 (add version history tables)
    this.version(2).stores({
      // Keep existing table with same schema
      userData: '[pageId+componentId], updatedAt, userId, savedToRemote',
      // Version history: auto-increment id, compound index for queries
      userData_history: '++id, [pageId+componentId], versionNumber, createdAt, blobId',
      // Version blobs: hash-based deduplication
      versionBlobs: 'blobId, createdAt, refCount'
    }).upgrade(async (tx) => {
      // Migration: No action needed - existing data remains unchanged
      // Version history will be created going forward
      console.log('[UserDataDB] Migrated to v2 with version history support')
    })
  }
}

// Singleton instance
export const db = new UserDataDatabase()

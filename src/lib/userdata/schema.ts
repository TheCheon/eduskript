/**
 * User Data Service Database Schema
 *
 * Dexie-based IndexedDB schema for local user data storage
 */

import Dexie, { Table } from 'dexie'
import type { UserDataRecord } from './types'

export class UserDataDatabase extends Dexie {
  userData!: Table<UserDataRecord, [string, string]>

  constructor() {
    super('EduskriptUserData')

    this.version(1).stores({
      // Compound primary key [pageId, componentId]
      // Indexes on updatedAt for cleanup, userId for future sync
      userData: '[pageId+componentId], updatedAt, userId, savedToRemote'
    })
  }
}

// Singleton instance
export const db = new UserDataDatabase()

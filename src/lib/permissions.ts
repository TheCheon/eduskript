/**
 * Permission System
 *
 * Eduskript uses a "no-access-by-default" permission model. Being a collaborator
 * doesn't automatically grant content access - content must be explicitly shared.
 *
 * ## Permission Hierarchy (3 levels)
 *
 * Content is organized: Collection → Skript → Page
 * Permissions flow DOWN but not UP:
 *
 * ```
 * Collection Author  → can VIEW all skripts in collection (but NOT edit)
 *                   ↓
 * Skript Author     → can EDIT all pages in skript
 *                   ↓
 * Page Author       → can EDIT that specific page only
 * ```
 *
 * ## Permission Types
 *
 * - `author`: Full edit rights (can modify content, manage other authors)
 * - `viewer`: Read-only access (can view but not modify)
 *
 * ## Important Behaviors
 *
 * 1. **Collection authors can only VIEW skripts** - they cannot edit skripts
 *    or pages unless they also have direct skript/page author permissions.
 *
 * 2. **Skript authors inherit page edit rights** - if you're an author on a
 *    skript, you can edit ALL pages within it.
 *
 * 3. **Page-level permissions override skript-level** - you can grant someone
 *    view-only access to a specific page even if they have edit access to the skript.
 *
 * 4. **At least one author required** - content cannot be left without an author.
 *    The last author cannot remove themselves.
 *
 * ## Examples
 *
 * - Alice is a collection author → she can VIEW all skripts but NOT edit them
 * - Bob is a skript author → he can EDIT all pages in that skript
 * - Carol is a page viewer → she can only VIEW that specific page
 *
 * @see CLAUDE.md for the full permission model documentation
 */

import { CollectionAuthor, SkriptAuthor, PageAuthor, User } from '@prisma/client'
import { Permission, UserPermissions } from '@/types'

/**
 * Check user permissions for a collection.
 *
 * Collections are the top-level container. Collection authors can view all
 * skripts within the collection but cannot edit them directly.
 */
export function checkCollectionPermissions(
  userId: string,
  authors: (CollectionAuthor & { user: Partial<User> })[]
): UserPermissions {
  const userAuthor = authors.find(author => author.userId === userId)
  
  if (!userAuthor) {
    return {
      canEdit: false,
      canView: false,
      canManageAuthors: false
    }
  }

  const isAuthor = userAuthor.permission === 'author'
  
  return {
    canEdit: isAuthor,
    canView: true,
    canManageAuthors: isAuthor,
    permission: userAuthor.permission as Permission
  }
}

/**
 * Check user permissions for a skript.
 *
 * Permission resolution order:
 * 1. Direct skript author → full edit rights
 * 2. Collection author (inherited) → view-only
 * 3. No relationship → no access
 *
 * Note: Skript authors automatically get edit rights on all pages within
 * the skript. This is handled by checkPagePermissions().
 */
export function checkSkriptPermissions(
  userId: string,
  skriptAuthors: (SkriptAuthor & { user: Partial<User> })[],
  collectionAuthors?: (CollectionAuthor & { user: Partial<User> })[]
): UserPermissions {
  // Priority 1: Direct skript permissions (highest precedence)
  const userSkriptAuthor = skriptAuthors.find(author => author.userId === userId)

  if (userSkriptAuthor) {
    const isAuthor = userSkriptAuthor.permission === 'author'
    return {
      canEdit: isAuthor,
      canView: true,
      canManageAuthors: isAuthor,
      permission: userSkriptAuthor.permission as Permission
    }
  }

  // Priority 2: Inherited from collection (view-only, never edit)
  // This is intentional - collection authors should explicitly be added
  // as skript authors if they need to edit.
  const userCollectionAuthor = collectionAuthors?.find(author => author.userId === userId)

  if (userCollectionAuthor) {
    return {
      canEdit: false,
      canView: true,
      canManageAuthors: false,
      permission: 'viewer'
    }
  }

  // No access
  return {
    canEdit: false,
    canView: false,
    canManageAuthors: false
  }
}

/**
 * Check user permissions for a page.
 *
 * Permission resolution order (first match wins):
 * 1. Direct page author → uses that permission level
 * 2. Skript author → inherits edit rights (author) or view rights (viewer)
 * 3. Collection author → view-only
 * 4. No relationship → no access
 *
 * Key insight: Skript authors get EDIT rights on pages because pages are
 * considered part of the skript content. This differs from collections,
 * where collection authors only get VIEW rights on contained skripts.
 */
export function checkPagePermissions(
  userId: string,
  pageAuthors: (PageAuthor & { user: Partial<User> })[],
  skriptAuthors: (SkriptAuthor & { user: Partial<User> })[],
  collectionAuthors: (CollectionAuthor & { user: Partial<User> })[]
): UserPermissions {
  // Priority 1: Direct page permissions (highest precedence)
  const userPageAuthor = pageAuthors.find(author => author.userId === userId)

  if (userPageAuthor) {
    const isAuthor = userPageAuthor.permission === 'author'
    return {
      canEdit: isAuthor,
      canView: true,
      canManageAuthors: isAuthor,
      permission: userPageAuthor.permission as Permission
    }
  }

  // Priority 2: Inherited from skript (EDIT rights for authors)
  // Unlike collection→skript inheritance, skript→page inheritance grants
  // edit rights because pages are considered integral to skript content.
  const userSkriptAuthor = skriptAuthors.find(author => author.userId === userId)

  if (userSkriptAuthor) {
    const isSkriptAuthor = userSkriptAuthor.permission === 'author'
    return {
      canEdit: isSkriptAuthor,
      canView: true,
      canManageAuthors: isSkriptAuthor,
      permission: isSkriptAuthor ? 'author' : 'viewer'
    }
  }

  // Priority 3: Inherited from collection (view-only, never edit)
  const userCollectionAuthor = collectionAuthors.find(author => author.userId === userId)

  if (userCollectionAuthor) {
    return {
      canEdit: false,
      canView: true,
      canManageAuthors: false,
      permission: 'viewer'
    }
  }

  // No access
  return {
    canEdit: false,
    canView: false,
    canManageAuthors: false
  }
}

/**
 * Check if user can remove themselves as an author.
 *
 * Prevents content from being orphaned by ensuring at least one author
 * always remains. The last author cannot remove themselves - they must
 * first add another author or delete the content entirely.
 */
export function canRemoveSelfAsAuthor(
  userId: string,
  authors: (CollectionAuthor | SkriptAuthor | PageAuthor)[]
): boolean {
  const authorCount = authors.filter(author => author.permission === 'author').length
  const userIsAuthor = authors.find(author => 
    author.userId === userId && author.permission === 'author'
  )
  
  // Can remove self if they're an author and there's at least one other author
  return Boolean(userIsAuthor && authorCount > 1)
}

/**
 * Get all users who can view a collection (including skripts within it)
 */
export function getCollectionViewers(
  collectionAuthors: (CollectionAuthor & { user: Partial<User> })[]
): Partial<User>[] {
  return collectionAuthors.map(author => author.user)
}

/**
 * Get all users who can view a skript
 */
export function getSkriptViewers(
  skriptAuthors: (SkriptAuthor & { user: Partial<User> })[],
  collectionAuthors: (CollectionAuthor & { user: Partial<User> })[]
): Partial<User>[] {
  const skriptUsers = skriptAuthors.map(author => author.user)
  const collectionUsers = collectionAuthors.map(author => author.user)
  
  // Combine and deduplicate
  const allUsers = [...skriptUsers, ...collectionUsers]
  const uniqueUsers = allUsers.filter((user, index, array) => 
    array.findIndex(u => u.id === user.id) === index
  )
  
  return uniqueUsers
}
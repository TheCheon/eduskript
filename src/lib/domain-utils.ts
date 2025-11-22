/**
 * Account type detection utilities for teacher vs student determination
 * Note: With the removal of subdomain routing, account type is now determined
 * solely by the URL path structure.
 */

/**
 * Gets the account type from the window location (client-side only)
 * Uses path-based routing to determine account type:
 * - Viewing a teacher's page (e.g., /username/...) -> student
 * - On main pages or dashboard -> teacher
 */
export function getAccountTypeFromWindow(): 'teacher' | 'student' {
  if (typeof window === 'undefined') {
    throw new Error('getAccountTypeFromWindow can only be called on the client side')
  }

  const pathname = window.location.pathname

  // If the path starts with a username (not a reserved path),
  // then we're viewing a teacher's public page, so treat as student signup
  const pathParts = pathname.split('/').filter(Boolean)
  const firstPathSegment = pathParts[0]

  // Reserved paths that are NOT teacher usernames
  const reservedPaths = ['auth', 'dashboard', 'api', 'consent', 'privacy', 'terms']

  if (firstPathSegment && !reservedPaths.includes(firstPathSegment)) {
    // This is a teacher's public page (e.g., /username/...)
    return 'student'
  }

  // Otherwise, we're on the main domain homepage or reserved paths
  return 'teacher'
}

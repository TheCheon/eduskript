import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the correct URL for navigation based on the current context
 * @param username - The user's username
 * @param path - The path to navigate to (e.g., "/collection/skript/page")
 * @param isClientSide - Whether this is being called from client-side code
 * @returns The correctly formatted URL
 */
export function getNavigationUrl(
  username: string,
  path: string,
  isClientSide: boolean = false
): string {
  // Always use path-based routing: /username/path
  return `/${username}${path}`
}

/**
 * Client-side hook to get the correct navigation URL
 * This should only be used in client components
 */
export function useNavigationUrl(username: string, path: string): string {
  return getNavigationUrl(username, path, true)
}

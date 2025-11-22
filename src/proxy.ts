import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simplified proxy - no subdomain routing needed
// All public teacher pages are now at /[username]/... paths
export function proxy(request: NextRequest) {
  // No rewriting needed - Next.js will handle all routes natively
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

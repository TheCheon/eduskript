import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl
  const token = await getToken({ req: request })
  
  // Handle subdomain routing
  const hostname = host?.split(':')[0] // Remove port if present
  const subdomain = hostname?.split('.')[0]
  
  // If subdomain exists and it's not 'www' or the main domain
  if (subdomain && subdomain !== 'www' && !hostname?.startsWith('localhost')) {
    // Rewrite to subdomain path
    const url = request.nextUrl.clone()
    url.pathname = `/${subdomain}${pathname}`
    return NextResponse.rewrite(url)
  }
  
  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
  }
  
  // Protect API routes (except auth)
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    if (!token && !pathname.startsWith('/api/public')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}

import { NextResponse } from 'next/server'

export function middleware(request) {
  // Check if user is accessing login page
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }

  // Check if user is authenticated
  const authCookie = request.cookies.get('auth-session')
  
  if (!authCookie) {
    // Redirect to login page if not authenticated
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify the session token
  try {
    const sessionData = JSON.parse(Buffer.from(authCookie.value, 'base64').toString())
    const now = Date.now()
    
    // Check if session has expired (24 hours)
    if (now > sessionData.expires) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-session')
      return response
    }
    
    return NextResponse.next()
  } catch (error) {
    // Invalid session token
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth-session')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}
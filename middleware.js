import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Import auth functions (we'll inline the verification logic since middleware can't import from lib)
function verifyToken(token, sessionSecret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [raw, sig] = token.split('.');
  
  // Simple HMAC verification
  const crypto = require('crypto');
  const expectedSig = crypto.createHmac('sha256', sessionSecret).update(raw).digest('hex');
  if (expectedSig !== sig) return null;
  
  try {
    const body = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!body.exp || body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

export function middleware(request) {
  // Check if user is accessing login page
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }

  // Skip auth for API routes, static files, and other assets
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('favicon.ico')
  ) {
    return NextResponse.next()
  }

  // Get session cookies
  const sessionSecret = process.env.AUTH_SESSION_SECRET || 'your-secret-key-change-this';
  const accessToken = request.cookies.get('fitmemory-session')?.value;
  const refreshToken = request.cookies.get('fitmemory-refresh')?.value;

  // Check access token first
  let session = verifyToken(accessToken, sessionSecret);
  if (session) {
    return NextResponse.next();
  }

  // Check refresh token if access token is invalid
  session = verifyToken(refreshToken, sessionSecret);
  if (session) {
    // Refresh token is valid, but we should rotate the access token
    // For now, just allow access - the app will handle token rotation
    return NextResponse.next();
  }

  // No valid session found, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
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
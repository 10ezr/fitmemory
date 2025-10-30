import { NextResponse } from 'next/server'

// Use Web Crypto API in Edge runtime
async function verifyToken(token, sessionSecret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [raw, sig] = token.split('.')

  // Compute HMAC-SHA256 using Web Crypto API
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(sessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(raw))
  const bytes = new Uint8Array(mac)
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

  if (hex !== sig) return null

  try {
    const body = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (!body.exp || body.exp < Date.now()) return null
    return body
  } catch {
    return null
  }
}

export async function middleware(request) {
  // Allow login page
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }

  // Skip API and static assets
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('favicon.ico')
  ) {
    return NextResponse.next()
  }

  const sessionSecret = process.env.AUTH_SESSION_SECRET || 'your-secret-key-change-this'
  const accessToken = request.cookies.get('fitmemory-session')?.value
  const refreshToken = request.cookies.get('fitmemory-refresh')?.value

  // Verify access token
  let session = await verifyToken(accessToken, sessionSecret)
  if (session) return NextResponse.next()

  // Verify refresh token
  session = await verifyToken(refreshToken, sessionSecret)
  if (session) return NextResponse.next()

  // Redirect to login if no valid tokens
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}

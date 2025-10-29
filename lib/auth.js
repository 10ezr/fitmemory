import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Simple auth configuration - change these in production
const AUTH_CONFIG = {
  // Set your password hash here - generate with: node -e "console.log(require('crypto').createHash('sha256').update('your-password').digest('hex'))"
  passwordHash: process.env.AUTH_PASSWORD_HASH || crypto.createHash('sha256').update('fitmemory2024').digest('hex'),
  sessionSecret: process.env.AUTH_SESSION_SECRET || 'your-secret-key-change-this',
  sessionName: 'fitmemory-session',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
};

/**
 * Hash a password for comparison
 */
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Create a secure session token
 */
export function createSessionToken(userId = 'user') {
  const timestamp = Date.now();
  const payload = `${userId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', AUTH_CONFIG.sessionSecret)
    .update(payload)
    .digest('hex');
  
  return `${payload}:${signature}`;
}

/**
 * Verify a session token
 */
export function verifySessionToken(token) {
  if (!token) return null;
  
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return null;
    
    const [userId, timestamp, signature] = parts;
    const payload = `${userId}:${timestamp}`;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', AUTH_CONFIG.sessionSecret)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) return null;
    
    // Check if token is expired
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > AUTH_CONFIG.maxAge) return null;
    
    return { userId, timestamp: parseInt(timestamp) };
  } catch (error) {
    return null;
  }
}

/**
 * Verify password
 */
export function verifyPassword(password) {
  const hash = hashPassword(password);
  return hash === AUTH_CONFIG.passwordHash;
}

/**
 * Set session cookie
 */
export function setSessionCookie(response, token) {
  response.cookies.set(AUTH_CONFIG.sessionName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_CONFIG.maxAge / 1000, // Convert to seconds
    path: '/'
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(response) {
  response.cookies.set(AUTH_CONFIG.sessionName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
}

/**
 * Get current session from cookies
 */
export async function getCurrentSession() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get(AUTH_CONFIG.sessionName)?.value;
    return verifySessionToken(sessionToken);
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is authenticated (for API routes)
 */
export async function requireAuth() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // No error, user is authenticated
}

/**
 * Middleware helper to check auth
 */
export function isAuthenticated(request) {
  const sessionToken = request.cookies.get(AUTH_CONFIG.sessionName)?.value;
  return verifySessionToken(sessionToken) !== null;
}

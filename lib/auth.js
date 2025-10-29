import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const AUTH_CONFIG = {
  passwordHash: process.env.AUTH_PASSWORD_HASH || crypto.createHash('sha256').update('fitmemory2024').digest('hex'),
  sessionSecret: process.env.AUTH_SESSION_SECRET || 'your-secret-key-change-this',
  sessionName: 'fitmemory-session',
  refreshName: 'fitmemory-refresh',
  accessMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  refreshMaxAge: 365 * 24 * 60 * 60 * 1000, // 1 year persistent
};

function hmac(data) { return crypto.createHmac('sha256', AUTH_CONFIG.sessionSecret).update(data).digest('hex'); }
function now() { return Date.now(); }

export function hashPassword(password) { return crypto.createHash('sha256').update(password).digest('hex'); }
export function verifyPassword(password) { return hashPassword(password) === AUTH_CONFIG.passwordHash; }

export function signToken(payload, expMs) {
  const exp = now() + expMs;
  const body = { ...payload, exp };
  const raw = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = hmac(raw);
  return `${raw}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [raw, sig] = token.split('.');
  if (hmac(raw) !== sig) return null;
  try {
    const body = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!body.exp || body.exp < now()) return null;
    return body;
  } catch { return null; }
}

export function issueSession(user) {
  const access = signToken({ sub: user.id, role: user.role || 'user', typ: 'access' }, AUTH_CONFIG.accessMaxAge);
  const refresh = signToken({ sub: user.id, role: user.role || 'user', typ: 'refresh' }, AUTH_CONFIG.refreshMaxAge);
  return { access, refresh };
}

export function setSessionCookies(res, { access, refresh }) {
  res.cookies.set(AUTH_CONFIG.sessionName, access, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: AUTH_CONFIG.accessMaxAge/1000, path: '/' });
  res.cookies.set(AUTH_CONFIG.refreshName, refresh, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: AUTH_CONFIG.refreshMaxAge/1000, path: '/' });
}

export function clearSessionCookies(res) {
  res.cookies.set(AUTH_CONFIG.sessionName, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' });
  res.cookies.set(AUTH_CONFIG.refreshName, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' });
}

export function getTokensFromCookies() {
  const c = cookies();
  const access = c.get(AUTH_CONFIG.sessionName)?.value;
  const refresh = c.get(AUTH_CONFIG.refreshName)?.value;
  return { access, refresh };
}

export function getSession() {
  const { access, refresh } = getTokensFromCookies();
  const acc = verifyToken(access);
  if (acc) return { session: acc, shouldRefresh: false };
  const ref = verifyToken(refresh);
  if (ref) return { session: ref, shouldRefresh: true };
  return { session: null, shouldRefresh: false };
}

export function rotateAccessIfNeeded(response, session) {
  // if called after getSession with shouldRefresh true
  const newAccess = signToken({ sub: session.sub, role: session.role, typ: 'access' }, AUTH_CONFIG.accessMaxAge);
  response.cookies.set(AUTH_CONFIG.sessionName, newAccess, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: AUTH_CONFIG.accessMaxAge/1000, path: '/' });
}

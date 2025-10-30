import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const { session } = getSession();
  if (!session) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, user: { id: session.sub, role: session.role || 'user' } });
}

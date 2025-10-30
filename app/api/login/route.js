import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  const { session } = getSession();
  if (session) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

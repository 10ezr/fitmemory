import { NextRequest, NextResponse } from 'next/server';
import { sleepService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '14');
    const latest = searchParams.get('latest') === 'true';
    
    // Get latest sleep session only
    if (latest) {
      const session = await sleepService.getLatestSleep();
      return NextResponse.json({ session });
    }
    
    // Get multiple sleep sessions
    const sessions = await sleepService.getSleepSessions(limit);
    return NextResponse.json({ sessions });
    
  } catch (error) {
    console.error('Sleep API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sleep data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await sleepService.createSleepSession(body);
    
    return NextResponse.json({ session, success: true }, { status: 201 });
    
  } catch (error) {
    console.error('Create sleep session error:', error);
    return NextResponse.json(
      { error: 'Failed to create sleep session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

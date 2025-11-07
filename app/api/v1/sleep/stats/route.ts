import { NextRequest, NextResponse } from 'next/server';
import { sleepService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    
    const stats = await sleepService.calculateSleepStats(days);
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Sleep stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sleep stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

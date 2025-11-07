import { NextRequest, NextResponse } from 'next/server';
import { workoutService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const stats = await workoutService.getWorkoutStats();
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stats', 
        details: error instanceof Error ? error.message : 'Unknown error',
        // Fallback data
        currentStreak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
        weeklyCounts: [0, 0, 0, 0, 0, 0, 0],
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { workoutService } from '@/lib/services';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Get today's workout
    if (date === 'today') {
      const workout = await workoutService.getTodaysWorkout();
      return NextResponse.json({ workout });
    }
    
    // Get workout by specific date
    if (date) {
      const targetDate = new Date(date);
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 1);
      
      const workouts = await workoutService.getWorkoutsByDateRange(targetDate, endDate);
      return NextResponse.json({ workouts });
    }
    
    // Get recent workouts with limit
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    let workouts = await workoutService.getWorkoutsByDateRange(startDate, endDate);
    workouts = workouts.slice(0, limit);
    
    return NextResponse.json({ workouts });
    
  } catch (error) {
    console.error('Workout API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workout = await workoutService.createWorkout(body);
    
    return NextResponse.json({ workout, success: true }, { status: 201 });
    
  } catch (error) {
    console.error('Create workout error:', error);
    return NextResponse.json(
      { error: 'Failed to create workout', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { Workout } from '@/models';

export async function GET() {
  try {
    await connectDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Look for today's workout
    const todaysWorkout = await Workout.findOne({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ createdAt: -1 });
    
    if (todaysWorkout) {
      return NextResponse.json({ workout: todaysWorkout });
    }
    
    // If no workout found, generate a simple plan
    const sampleWorkout = {
      name: "Daily Fitness",
      exercises: [
        { name: "Push-ups", sets: 3, reps: 10, type: "strength" },
        { name: "Squats", sets: 3, reps: 15, type: "strength" },
        { name: "Plank", sets: 3, reps: "30s", type: "core" },
        { name: "Jumping Jacks", sets: 2, reps: 20, type: "cardio" }
      ],
      estimatedDuration: 15
    };
    
    return NextResponse.json({ workout: sampleWorkout });
    
  } catch (error) {
    console.error('Error fetching today\'s workout:', error);
    return NextResponse.json({ error: 'Failed to fetch workout' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { models } from 'mongoose';

// Timer session model (reuse from timer-data)
const TimerSession = models.TimerSession || require('mongoose').model('TimerSession', require('mongoose').Schema({
  totalDuration: { type: Number, required: true },
  exerciseTimes: [{
    exercise: String,
    duration: Number
  }],
  completedAt: { type: Date, default: Date.now },
  exercises: [Object],
  metadata: {
    averageExerciseTime: Number,
    longestExercise: String,
    shortestExercise: String
  }
}, { timestamps: true }));

export async function POST(request) {
  try {
    await connectDB();
    
    const sessionData = await request.json();
    
    // Calculate metadata
    const exerciseTimes = sessionData.exerciseTimes || [];
    const metadata = {
      averageExerciseTime: exerciseTimes.length ? 
        exerciseTimes.reduce((sum, ex) => sum + ex.duration, 0) / exerciseTimes.length : 0,
      longestExercise: exerciseTimes.length ? 
        exerciseTimes.reduce((max, ex) => ex.duration > max.duration ? ex : max).exercise : null,
      shortestExercise: exerciseTimes.length ? 
        exerciseTimes.reduce((min, ex) => ex.duration < min.duration ? ex : min).exercise : null
    };
    
    const session = new TimerSession({
      ...sessionData,
      metadata
    });
    
    await session.save();
    
    return NextResponse.json({ success: true, session });
    
  } catch (error) {
    console.error('Error saving timer session:', error);
    return NextResponse.json({ error: 'Failed to save timer session' }, { status: 500 });
  }
}

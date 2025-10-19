import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { Workout, User, AppConfig } from '@/models';

export async function POST(request) {
  try {
    await connectDB();
    
    const { name, exercises, duration, date } = await request.json();
    
    if (!name || !exercises || !Array.isArray(exercises)) {
      return NextResponse.json(
        { error: 'Name and exercises are required' },
        { status: 400 }
      );
    }
    
    // Create new workout
    const workout = new Workout({
      date: date ? new Date(date) : new Date(),
      name,
      exercises: exercises.map(exercise => ({
        workoutId: null, // Will be set after workout is saved
        name: exercise.name,
        sets: exercise.sets || 1,
        reps: exercise.reps || 1,
        weightKg: exercise.weightKg,
        durationS: duration || 0,
        notes: exercise.notes
      }))
    });
    
    await workout.save();
    
    // Update exercise workoutIds
    workout.exercises.forEach(exercise => {
      exercise.workoutId = workout._id;
    });
    await workout.save();
    
    // Update user stats and streak
    await updateUserStreak();
    
    return NextResponse.json({ 
      success: true, 
      workout: {
        id: workout._id,
        name: workout.name,
        date: workout.date,
        exercises: workout.exercises.length
      }
    });
    
  } catch (error) {
    console.error('Error saving workout:', error);
    return NextResponse.json(
      { error: 'Failed to save workout' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = parseInt(searchParams.get('offset')) || 0;
    
    const workouts = await Workout.find({})
      .sort({ date: -1 })
      .limit(limit)
      .skip(offset);
    
    return NextResponse.json({ workouts });
    
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
      { status: 500 }
    );
  }
}

async function updateUserStreak() {
  try {
    // Get all workouts sorted by date
    const workouts = await Workout.find({}).sort({ date: -1 });
    
    if (workouts.length === 0) return;
    
    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let currentStreakLength = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group workouts by date
    const workoutsByDate = new Map();
    workouts.forEach(workout => {
      const dateKey = new Date(workout.date);
      dateKey.setHours(0, 0, 0, 0);
      const key = dateKey.toISOString().split('T')[0];
      
      if (!workoutsByDate.has(key)) {
        workoutsByDate.set(key, []);
      }
      workoutsByDate.get(key).push(workout);
    });
    
    // Calculate streak from today backwards
    let checkDate = new Date(today);
    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      if (workoutsByDate.has(dateKey)) {
        currentStreakLength++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    currentStreak = currentStreakLength;
    
    // Calculate longest streak
    const sortedDates = Array.from(workoutsByDate.keys()).sort().reverse();
    let tempStreak = 0;
    let lastDate = null;
    
    for (const dateString of sortedDates) {
      const currentDate = new Date(dateString);
      
      if (lastDate === null) {
        tempStreak = 1;
      } else {
        const dayDiff = (lastDate - currentDate) / (1000 * 60 * 60 * 24);
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      lastDate = currentDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    // Update app config with new streak data
    await AppConfig.findByIdAndUpdate('singleton', {
      $set: {
        'consistency.dailyStreak': currentStreak,
        'consistency.longestStreak': longestStreak,
        'consistency.lastWorkoutDate': new Date(),
        'consistency.streakHistory': Array.from(workoutsByDate.keys()).map(date => ({
          date,
          workoutCount: workoutsByDate.get(date).length
        }))
      }
    }, { upsert: true });
    
    console.log(`Updated streak: ${currentStreak} (longest: ${longestStreak})`);
    
  } catch (error) {
    console.error('Error updating user streak:', error);
  }
}

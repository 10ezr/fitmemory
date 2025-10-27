import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { Workout } from "@/models";

export async function GET(request) {
  try {
    await connectDatabase();

    // Get the last 30 days of workout data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch workouts from the last 30 days
    const workouts = await Workout.find({
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    // Build completion data for each of the last 30 days
    const challengeData = [];
    const today = new Date();
    
    // Create a map of workout dates for quick lookup
    const workoutDates = new Set();
    workouts.forEach(workout => {
      const dateStr = workout.date.toISOString().slice(0, 10);
      workoutDates.add(dateStr);
    });

    // Build the 30-day array
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      
      challengeData.push({
        date: dateStr,
        dayNum: date.getDate(),
        completed: workoutDates.has(dateStr),
        isToday: i === 0
      });
    }

    // Calculate progress
    const completedDays = challengeData.filter(day => day.completed).length;
    const progressPercentage = Math.round((completedDays / 30) * 100);

    return NextResponse.json({
      challengeData,
      completedDays,
      totalDays: 30,
      progressPercentage,
      isCompleted: completedDays >= 30
    });
    
  } catch (error) {
    console.error("Error fetching 30-day challenge data:", error);
    
    // Return fallback data
    const today = new Date();
    const fallbackData = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      fallbackData.push({
        date: date.toISOString().slice(0, 10),
        dayNum: date.getDate(),
        completed: false,
        isToday: i === 0
      });
    }

    return NextResponse.json({
      challengeData: fallbackData,
      completedDays: 0,
      totalDays: 30,
      progressPercentage: 0,
      isCompleted: false
    });
  }
}
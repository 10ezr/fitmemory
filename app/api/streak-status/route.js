import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { getStreakStatus } from "@/services/streakService";

export async function GET() {
  try {
    await connectDatabase();
    const status = await getStreakStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("/api/streak-status error:", error);
    return NextResponse.json({
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      missedWorkouts: 0,
      flexibleMode: true,
      daysSinceLastWorkout: null,
      broken: false,
      nextResetAt: null,
    });
  }
}

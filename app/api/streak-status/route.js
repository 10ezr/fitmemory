import { NextResponse } from "next/server";
import connectDatabase from "../../../lib/database";
import { Streak } from "../../../models";

export async function GET() {
  try {
    await connectDatabase();

    const streak = await Streak.findById("local");

    if (!streak) {
      return NextResponse.json({
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        missedWorkouts: 0,
        flexibleMode: true,
        workoutSchedule: null,
        streakHistory: [],
      });
    }

    return NextResponse.json({
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastWorkoutDate: streak.lastWorkoutDate,
      missedWorkouts: streak.missedWorkouts,
      flexibleMode: streak.flexibleMode,
      workoutSchedule: streak.workoutSchedule,
      streakHistory: streak.streakHistory,
      updatedAt: streak.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching streak status:", error);
    return NextResponse.json(
      { error: "Failed to fetch streak status" },
      { status: 500 }
    );
  }
}

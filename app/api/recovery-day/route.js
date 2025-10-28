import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { incrementStreak } from "@/services/streakService";

/**
 * Register a recovery day to maintain streak
 * POST /api/recovery-day
 */
export async function POST() {
  try {
    await connectDatabase();
    
    // Use the same incrementStreak function - recovery counts as activity
    const streakResult = await incrementStreak();

    return NextResponse.json({
      ok: true,
      recoveryDayRegistered: true,
      currentStreak: streakResult.streak.currentStreak,
      longestStreak: streakResult.streak.longestStreak,
      alreadyDoneToday: streakResult.alreadyDoneToday,
    });
    
  } catch (error) {
    console.error('recovery-day POST error:', error);
    return NextResponse.json(
      { ok: false, error: error.message }, 
      { status: 500 }
    );
  }
}
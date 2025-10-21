import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { Streak } from "@/models";
import AnalyticsService from "@/services/analyticsService";

export async function GET(request) {
  try {
    await connectDatabase();

    const analyticsService = new AnalyticsService();
    const stats = await analyticsService.calculateConsistencyMetrics();

    // Get streak data
    const streak = await Streak.findById("local");

    return NextResponse.json({
      ...stats,
      dailyStreak: streak ? streak.currentStreak : 0,
      longestStreak: streak ? streak.longestStreak : 0,
      lastWorkoutDate: streak ? streak.lastWorkoutDate : null,
      streakHistory: streak ? streak.streakHistory : [],
    });
  } catch (error) {
    console.error("Error calculating stats:", error);
    // Fallback: return zeroed stats so UI can render without DB
    return NextResponse.json({
      dailyStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      streakHistory: [],
      weeklyCounts: [0, 0, 0, 0],
      rollingAverage: 0,
      trend: "stable",
    });
  }
}

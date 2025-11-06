// v1 stats router - delegates to existing handler/service
import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import AnalyticsService from "@/services/analyticsService";
import { Streak } from "@/models";

export async function GET() {
  try {
    await connectDatabase();
    const analyticsService = new AnalyticsService();
    const stats = await analyticsService.calculateConsistencyMetrics();
    const streak = await Streak.findById("local");
    return NextResponse.json({
      data: {
        ...stats,
        dailyStreak: streak ? streak.currentStreak : 0,
        longestStreak: streak ? streak.longestStreak : 0,
        lastWorkoutDate: streak ? streak.lastWorkoutDate : null,
        streakHistory: streak ? streak.streakHistory : [],
      },
      error: null,
    });
  } catch (error) {
    console.error("v1/stats error:", error);
    return NextResponse.json({
      data: {
        dailyStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        streakHistory: [],
        weeklyCounts: [0,0,0,0],
        rollingAverage: 0,
        trend: "stable",
      },
      error: "stats_failed",
    });
  }
}

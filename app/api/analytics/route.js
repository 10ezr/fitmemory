import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import AnalyticsService from "@/services/analyticsService";
import { getStreakStatus } from "@/services/streakService";

export async function GET() {
  try {
    await connectDatabase();

    const service = new AnalyticsService();
    let metrics = null;
    let summary = null;

    try {
      metrics = await service.calculateConsistencyMetrics();
      summary = await service.generatePatternSummary();
    } catch (e) {
      // Soft-fail analytics calculation so endpoint still responds
      metrics = null;
      summary = "Unavailable";
    }

    const streakStatus = await getStreakStatus();

    return NextResponse.json({
      metrics,
      summary,
      streak: streakStatus,
    });
  } catch (error) {
    console.error("/api/analytics error:", error);
    return NextResponse.json({
      metrics: null,
      summary: "Unavailable",
      streak: null,
    });
  }
}

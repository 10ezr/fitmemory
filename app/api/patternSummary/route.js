import { NextResponse } from "next/server";
import connectDatabase from "../../../lib/database";
import AnalyticsService from "../../../services/analyticsService";

export async function GET(request) {
  try {
    await connectDatabase();

    const analyticsService = new AnalyticsService();
    const summary = await analyticsService.generatePatternSummary();
    const patterns = await analyticsService.detectWorkoutPatterns();

    return NextResponse.json({
      summary,
      patterns,
    });
  } catch (error) {
    console.error("Error generating pattern summary:", error);
    // Fallback: minimal summary so UI can render without DB
    return NextResponse.json({
      summary: "No data yet. Start logging workouts to see insights.",
      patterns: [],
    });
  }
}

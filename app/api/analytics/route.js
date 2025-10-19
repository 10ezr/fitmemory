import { NextResponse } from "next/server";
import connectDatabase from "../../../lib/database";
import AnalyticsService from "../../../services/analyticsService";

const analyticsService = new AnalyticsService();

export async function GET() {
  try {
    await connectDatabase();

    const analytics = await analyticsService.calculateConsistencyMetrics();

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { action, trigger } = await request.json();

    if (action === "recalculate") {
      await connectDatabase();

      const analytics = await analyticsService.calculateConsistencyMetrics();

      return NextResponse.json({
        success: true,
        analytics,
        trigger,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing analytics request:", error);
    return NextResponse.json(
      { error: "Failed to process analytics request" },
      { status: 500 }
    );
  }
}

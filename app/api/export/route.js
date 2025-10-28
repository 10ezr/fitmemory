import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import {
  User,
  Workout,
  Message,
  Memory,
  GeminiResponse,
  AppConfig,
  Streak,
} from "@/models";

export async function GET() {
  try {
    await connectDatabase();

    const [
      users,
      workouts,
      messages,
      memories,
      geminiResponses,
      appConfig,
      streaks,
    ] = await Promise.all([
      User.find({}).lean(),
      Workout.find({}).lean(),
      Message.find({}).lean(),
      Memory.find({}).lean(),
      GeminiResponse.find({}).lean(),
      AppConfig.find({}).lean(),
      Streak.find({}).lean(),
    ]);

    const backup = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
      },
      users,
      workouts,
      messages,
      memories,
      geminiResponses,
      appConfig,
      streaks,
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="fitmemory-export-${
          new Date().toISOString().split("T")[0]
        }.json"`,
      },
    });
  } catch (error) {
    console.error("/api/export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

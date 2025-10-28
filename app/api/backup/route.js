import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import {
  User,
  Workout,
  Message,
  Memory,
  GeminiResponse,
  AppConfig,
} from "@/models";

export async function POST() {
  try {
    await connectDatabase();

    const [users, workouts, messages, memories, geminiResponses, appConfig] =
      await Promise.all([
        User.countDocuments({}),
        Workout.countDocuments({}),
        Message.countDocuments({}),
        Memory.countDocuments({}),
        GeminiResponse.countDocuments({}),
        AppConfig.countDocuments({}),
      ]);

    const totalRecords =
      users + workouts + messages + memories + geminiResponses + appConfig;

    return NextResponse.json({
      totalRecords,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("/api/backup error:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}

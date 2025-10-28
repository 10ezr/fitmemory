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

export async function POST(request) {
  try {
    await connectDatabase();
    const payload = await request.json();

    let imported = 0;
    let skipped = 0;

    async function upsertMany(Model, docs, key = "_id") {
      if (!Array.isArray(docs) || docs.length === 0) return;
      for (const doc of docs) {
        if (!doc || doc[key] === undefined) {
          skipped++;
          continue;
        }
        const id = doc[key];
        await Model.findOneAndUpdate(
          { [key]: id },
          { $set: { ...doc } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        imported++;
      }
    }

    await upsertMany(User, payload.users || []);
    await upsertMany(Workout, payload.workouts || []);
    await upsertMany(Message, payload.messages || []);
    await upsertMany(Memory, payload.memories || []);
    await upsertMany(GeminiResponse, payload.geminiResponses || []);
    await upsertMany(AppConfig, payload.appConfig || []);
    await upsertMany(Streak, payload.streaks || []);

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    console.error("/api/import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/database";
import { Workout } from "@/models";

export async function GET() {
  try {
    await connectDB();

    // Build tomorrow range
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(start);
    tomorrowStart.setDate(start.getDate() + 1);

    // Simple fallback workout (no MemoryService for now)
    const baseline = {
      name: "Tomorrow — Upper Body Focus",
      estimatedDuration: 35,
      exercises: [
        { name: "Push-ups", sets: 3, reps: 10, type: "strength" },
        { name: "Pull-ups", sets: 3, reps: 8, type: "strength" },
        { name: "Overhead Press", sets: 3, reps: 8, type: "strength" },
        { name: "Plank", sets: 3, reps: "30s", type: "core" },
      ],
    };

    return NextResponse.json({
      date: tomorrowStart.toISOString(),
      workout: baseline,
      source: "generated",
    });
  } catch (err) {
    console.error("Error generating tomorrow workout:", err);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}

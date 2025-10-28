import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { AppConfig, Streak } from "@/models";

function defaultGoals() {
  return {
    type: "streak",
    targetDays: 30,
    active: false,
    startedAt: null,
    completedAt: null,
  };
}

export async function GET() {
  try {
    await connectDatabase();
    const cfg = await AppConfig.findById("singleton").lean();
    const goals = cfg?.goals || defaultGoals();

    // Compute progress from streak
    const streak = await Streak.findById("local").lean();
    const current = streak?.currentStreak || 0;
    const target = goals.targetDays || 30;
    const progressPct = Math.max(
      0,
      Math.min(100, Math.round((current / target) * 100))
    );

    return NextResponse.json({
      goals,
      progress: { current, target, progressPct },
    });
  } catch (e) {
    console.error("/api/goals GET error", e);
    return NextResponse.json({
      goals: defaultGoals(),
      progress: { current: 0, target: 30, progressPct: 0 },
    });
  }
}

export async function POST(request) {
  try {
    await connectDatabase();
    const body = await request.json();
    const nextGoals = {
      ...defaultGoals(),
      ...body,
    };

    // If activating a goal without startedAt, set now
    if (nextGoals.active && !nextGoals.startedAt)
      nextGoals.startedAt = new Date();

    await AppConfig.findByIdAndUpdate(
      "singleton",
      { $set: { goals: nextGoals } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, goals: nextGoals });
  } catch (e) {
    console.error("/api/goals POST error", e);
    return NextResponse.json({ error: "Failed to set goals" }, { status: 500 });
  }
}

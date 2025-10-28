import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { Streak, Workout } from "@/models";
import { incrementStreak } from "@/services/streakService";

function dayKey(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

async function getTomorrowPlan() {
  // Call the existing tomorrow-workout API logic via internal fetch to avoid duplicating code
  try {
    // In Next.js route handlers, we don't have absolute URL; compute relative fetch using NEXT_PUBLIC_SITE_URL if available
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    const res = await fetch(`${base}/api/tomorrow-workout`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch tomorrow workout inline:", e);
    return null;
  }
}

export async function GET() {
  try {
    await connectDatabase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowStart = new Date(today);
    windowStart.setDate(today.getDate() - 29);

    const workouts = await Workout.find({
      date: { $gte: windowStart, $lte: today },
    })
      .select("date")
      .lean();
    const worked = new Set(workouts.map((w) => dayKey(w.date)));

    const challengeData = [];
    let consecutive = 0;
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const key = dayKey(day);
      const completed = worked.has(key);
      challengeData.push({
        date: key,
        dayNum: day.getDate(),
        completed,
        isToday: i === 0,
      });
    }

    for (const d of challengeData) {
      if (d.completed) consecutive += 1;
      else consecutive = 0;
    }

    const completedDays = challengeData.filter((d) => d.completed).length;
    const progressPercentage = Math.round((completedDays / 30) * 100);

    const nextMidnight = new Date(today);
    nextMidnight.setDate(today.getDate() + 1);
    const warnAt = new Date(nextMidnight.getTime() - 2 * 60 * 60 * 1000);

    return NextResponse.json({
      challengeData,
      consecutive,
      completedDays,
      totalDays: 30,
      progressPercentage,
      isCompleted: consecutive >= 30,
      warningAtISO: warnAt.toISOString(),
      resetAtISO: nextMidnight.toISOString(),
    });
  } catch (e) {
    console.error("challenge-30-advanced GET error", e);
    return NextResponse.json({
      challengeData: [],
      consecutive: 0,
      completedDays: 0,
      totalDays: 30,
      progressPercentage: 0,
      isCompleted: false,
      warningAtISO: null,
      resetAtISO: null,
    });
  }
}

export async function POST() {
  try {
    await connectDatabase();
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let workout = await Workout.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
    });
    if (!workout) {
      workout = await Workout.create({
        date: now,
        name: "30-Day Challenge Workout",
        exercises: [],
      });
    }

    const streakResult = await incrementStreak();

    // NEW: get fresh tomorrow plan immediately
    const tomorrowPlan = await getTomorrowPlan();

    return NextResponse.json({
      ok: true,
      workoutId: workout._id,
      currentStreak: streakResult.streak.currentStreak,
      longestStreak: streakResult.streak.longestStreak,
      alreadyDoneToday: streakResult.alreadyDoneToday,
      tomorrowPlan, // client can update right panel immediately
    });
  } catch (e) {
    console.error("challenge-30-advanced POST error", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
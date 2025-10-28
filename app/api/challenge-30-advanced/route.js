import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { Streak, Workout } from "@/models";

function dayKey(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
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

    let streak = await Streak.findById("local");
    if (!streak) streak = new Streak({ _id: "local" });

    const lastKey = streak.lastWorkoutDate
      ? dayKey(streak.lastWorkoutDate)
      : null;
    const todayKey = dayKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yKey = dayKey(yesterday);

    if (lastKey === todayKey) {
    } else if (lastKey === yKey) {
      streak.currentStreak += 1;
    } else {
      streak.currentStreak = 1;
    }
    if (streak.currentStreak > streak.longestStreak)
      streak.longestStreak = streak.currentStreak;
    streak.lastWorkoutDate = now;
    streak.streakHistory.push({ date: now, streak: streak.currentStreak });
    await streak.save();

    return NextResponse.json({
      ok: true,
      workoutId: workout._id,
      currentStreak: streak.currentStreak,
    });
  } catch (e) {
    console.error("challenge-30-advanced POST error", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

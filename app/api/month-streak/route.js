import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { Workout, Streak } from "@/models";

function startOfMonth(d) {
  const dt = new Date(d);
  dt.setDate(1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfMonth(d) {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() + 1, 0);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

function dateKey(date) {
  const dt = new Date(date);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    await connectDatabase();

    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);

    const [workouts, streak] = await Promise.all([
      Workout.find({ date: { $gte: start, $lte: end } })
        .sort({ date: 1 })
        .lean(),
      Streak.findById("local").lean(),
    ]);

    const byDay = new Map();
    workouts.forEach((w) => {
      const key = dateKey(w.date);
      if (!byDay.has(key)) byDay.set(key, { workouts: [], completed: false });
      byDay.get(key).workouts.push({
        id: w._id,
        name: w.name,
        exercises: w.exercises?.length || 0,
      });
      byDay.get(key).completed = true; // workout implies completion
    });

    // Apply streak history (treat any streak entry as completion for that day)
    const history = Array.isArray(streak?.streakHistory)
      ? streak.streakHistory
      : [];
    history.forEach((h) => {
      const key = dateKey(h.date);
      if (key >= dateKey(start) && key <= dateKey(end)) {
        if (!byDay.has(key)) byDay.set(key, { workouts: [], completed: true });
        else byDay.get(key).completed = true;
      }
    });

    const daysInMonth = end.getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(today.getFullYear(), today.getMonth(), day);
      d.setHours(0, 0, 0, 0);
      const key = dateKey(d);
      const entry = byDay.get(key) || { workouts: [], completed: false };
      days.push({
        date: key,
        completed: !!entry.completed,
        workouts: entry.workouts,
      });
    }

    return NextResponse.json({
      month: today.toLocaleString("default", { month: "long" }),
      year: today.getFullYear(),
      days,
    });
  } catch (e) {
    console.error("/api/month-streak GET error", e);
    return NextResponse.json({ month: null, year: null, days: [] });
  }
}

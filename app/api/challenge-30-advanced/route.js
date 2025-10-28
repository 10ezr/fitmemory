import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { Streak, Workout } from "@/models";
import { registerWorkout, getStreakStatus } from "@/services/streakService";

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

    // Get workouts from database
    const workouts = await Workout.find({
      date: { $gte: windowStart, $lte: today },
    })
      .select("date")
      .lean();
    const workedDays = new Set(workouts.map((w) => dayKey(w.date)));

    // Get streak status for activity tracking
    const streakStatus = await getStreakStatus();
    const activityDays = new Set();
    
    // Add days with any activity (workout, recovery, rest) to activity set
    if (streakStatus.recentActivities) {
      streakStatus.recentActivities.forEach(activity => {
        const activityDate = new Date(activity.date);
        if (activityDate >= windowStart && activityDate <= today) {
          activityDays.add(dayKey(activity.date));
        }
      });
    }

    const challengeData = [];
    let consecutiveWorkouts = 0;
    let consecutiveActivity = 0;
    
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const key = dayKey(day);
      const hasWorkout = workedDays.has(key);
      const hasActivity = activityDays.has(key);
      
      challengeData.push({
        date: key,
        dayNum: day.getDate(),
        completed: hasWorkout, // Workout completion for 30-day challenge
        hasActivity: hasActivity, // Any activity (workout/recovery/rest)
        isToday: i === 0,
      });
    }

    // Calculate consecutive streaks
    for (const d of challengeData) {
      if (d.completed) consecutiveWorkouts += 1;
      else consecutiveWorkouts = 0;
      
      if (d.hasActivity) consecutiveActivity += 1;
      else consecutiveActivity = 0;
    }

    const completedDays = challengeData.filter((d) => d.completed).length;
    const activeDays = challengeData.filter((d) => d.hasActivity).length;
    const progressPercentage = Math.round((completedDays / 30) * 100);
    const activityPercentage = Math.round((activeDays / 30) * 100);

    // Reset and warning times
    const nextMidnight = new Date(today);
    nextMidnight.setDate(today.getDate() + 1);
    const warnAt = new Date(nextMidnight.getTime() - 2 * 60 * 60 * 1000);

    return NextResponse.json({
      challengeData,
      
      // 30-day challenge metrics (workout-focused)
      consecutive: consecutiveWorkouts,
      completedDays,
      totalDays: 30,
      progressPercentage,
      isCompleted: consecutiveWorkouts >= 30,
      
      // Activity streak metrics (includes recovery days)
      consecutiveActivity,
      activeDays,
      activityPercentage,
      currentStreak: streakStatus.currentStreak,
      longestStreak: streakStatus.longestStreak,
      needsActivity: streakStatus.needsActivity,
      
      // Timing
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
      consecutiveActivity: 0,
      activeDays: 0,
      activityPercentage: 0,
      currentStreak: 0,
      longestStreak: 0,
      needsActivity: true,
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

    // Create or find today's workout
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

    // Register workout activity using new unified system
    const streakResult = await registerWorkout({
      workoutId: workout._id,
      challengeWorkout: true,
      name: workout.name
    });

    return NextResponse.json({
      ok: true,
      workoutId: workout._id,
      currentStreak: streakResult.currentStreak,
      longestStreak: streakResult.longestStreak,
      activityRegistered: true,
      streakActive: true
    });
  } catch (e) {
    console.error("challenge-30-advanced POST error", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
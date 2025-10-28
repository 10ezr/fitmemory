import { Streak } from "@/models";

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// NEW: Function to increment streak when workout is completed
export async function incrementStreak() {
  let streak = await Streak.findById("local");
  if (!streak) {
    streak = new Streak({
      _id: "local",
      currentStreak: 0,
      longestStreak: 0,
      missedWorkouts: 0,
    });
  }

  const today = startOfDay(new Date());
  const last = streak.lastWorkoutDate
    ? startOfDay(new Date(streak.lastWorkoutDate))
    : null;

  let daysSince = null;
  if (last) {
    daysSince = Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  // If workout already done today, don't increment again
  if (last && daysSince === 0) {
    return { streak, alreadyDoneToday: true };
  }

  // If more than 1 day gap, reset streak
  if (last && daysSince > 1) {
    streak.missedWorkouts = (streak.missedWorkouts || 0) + (daysSince - 1);
    streak.currentStreak = 1; // Start fresh with today's workout
  } else if (last && daysSince === 1) {
    // Consecutive day
    streak.currentStreak += 1;
  } else {
    // First workout ever
    streak.currentStreak = 1;
  }

  // Update longest streak if needed
  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }

  streak.lastWorkoutDate = new Date();
  streak.updatedAt = new Date();
  await streak.save();

  return { streak, alreadyDoneToday: false, daysSince };
}

export async function evaluateAndUpdateStreak() {
  let streak = await Streak.findById("local");
  if (!streak) {
    streak = new Streak({
      _id: "local",
      currentStreak: 0,
      longestStreak: 0,
      missedWorkouts: 0,
    });
    await streak.save();
  }

  const today = startOfDay(new Date());
  const last = streak.lastWorkoutDate
    ? startOfDay(new Date(streak.lastWorkoutDate))
    : null;

  let daysSince = null;
  if (last) {
    daysSince = Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  let broken = false;
  if (last && daysSince > 1) {
    // missed at least one day between last workout and today
    streak.missedWorkouts = (streak.missedWorkouts || 0) + (daysSince - 1);
    // Reset streak on any miss to unify behavior
    streak.currentStreak = 0;
    streak.lastWorkoutDate = null;
    broken = true;
  }

  streak.updatedAt = new Date();
  await streak.save();

  return { streak, broken, daysSinceLastWorkout: daysSince };
}

export async function getStreakStatus() {
  const result = await evaluateAndUpdateStreak();
  const { streak, broken, daysSinceLastWorkout } = result;
  return {
    currentStreak: streak.currentStreak || 0,
    longestStreak: streak.longestStreak || 0,
    lastWorkoutDate: streak.lastWorkoutDate || null,
    missedWorkouts: streak.missedWorkouts || 0,
    flexibleMode: streak.flexibleMode !== false,
    daysSinceLastWorkout: daysSinceLastWorkout,
    broken,
    nextResetAt: startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  };
}
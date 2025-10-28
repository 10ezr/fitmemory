import { Streak, Workout } from "@/models";

function startOfDay(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function dayKey(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

// Activity types that count toward streak
const ACTIVITY_TYPES = {
  WORKOUT: 'workout',
  RECOVERY: 'recovery',
  REST: 'rest' // Planned rest day
};

/**
 * Register an activity for today (workout, recovery, or planned rest)
 * This is the ONLY way to maintain/increment streaks
 */
export async function registerActivity(activityType = ACTIVITY_TYPES.WORKOUT, data = {}) {
  let streak = await Streak.findById("local");
  if (!streak) {
    streak = new Streak({
      _id: "local",
      currentStreak: 0,
      longestStreak: 0,
      missedWorkouts: 0,
      activityLog: []
    });
  }

  const now = new Date();
  const todayKey = dayKey(now);
  const today = startOfDay(now);
  
  // Check if activity already registered for today
  const existingActivity = streak.activityLog?.find(log => 
    dayKey(log.date) === todayKey
  );
  
  if (existingActivity) {
    // Update existing activity
    existingActivity.type = activityType;
    existingActivity.data = { ...existingActivity.data, ...data };
    existingActivity.updatedAt = now;
  } else {
    // Add new activity
    if (!streak.activityLog) streak.activityLog = [];
    streak.activityLog.push({
      date: today,
      type: activityType,
      data: data,
      createdAt: now,
      updatedAt: now
    });
  }

  // Recalculate streak based on activity log
  await recalculateStreak(streak);
  
  streak.lastWorkoutDate = now;
  streak.updatedAt = now;
  await streak.save();

  return {
    success: true,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    activityType,
    todayKey
  };
}

/**
 * Recalculate current streak based on activity log
 * Counts consecutive days with ANY activity (workout, recovery, rest)
 */
async function recalculateStreak(streak) {
  if (!streak.activityLog || streak.activityLog.length === 0) {
    streak.currentStreak = 0;
    return;
  }

  // Sort activities by date (newest first)
  const sortedActivities = streak.activityLog
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  const today = startOfDay(new Date());
  let currentStreakCount = 0;
  let checkDate = new Date(today);
  
  // Count consecutive days backwards from today
  while (true) {
    const checkKey = dayKey(checkDate);
    const hasActivity = sortedActivities.find(log => 
      dayKey(log.date) === checkKey
    );
    
    if (hasActivity) {
      currentStreakCount++;
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // No activity found, streak broken
      break;
    }
  }
  
  streak.currentStreak = currentStreakCount;
  
  // Update longest streak if current exceeds it
  if (streak.currentStreak > (streak.longestStreak || 0)) {
    streak.longestStreak = streak.currentStreak;
  }
}

/**
 * Check if streak should be reset (called by scheduled job or on app load)
 * Resets streak to 0 if no activity was registered yesterday
 */
export async function evaluateAndUpdateStreak() {
  let streak = await Streak.findById("local");
  if (!streak) {
    streak = new Streak({
      _id: "local",
      currentStreak: 0,
      longestStreak: 0,
      missedWorkouts: 0,
      activityLog: []
    });
    await streak.save();
  }

  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);
  
  // Check if there was any activity yesterday
  const hadYesterdayActivity = streak.activityLog?.find(log => 
    dayKey(log.date) === yesterdayKey
  );
  
  let broken = false;
  let daysSinceLastActivity = 0;
  
  if (streak.activityLog && streak.activityLog.length > 0) {
    // Find most recent activity
    const lastActivity = streak.activityLog
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    const lastActivityDate = startOfDay(new Date(lastActivity.date));
    daysSinceLastActivity = Math.floor(
      (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // If more than 1 day since last activity, reset streak
    if (daysSinceLastActivity > 1) {
      streak.currentStreak = 0;
      streak.missedWorkouts = (streak.missedWorkouts || 0) + daysSinceLastActivity - 1;
      broken = true;
    }
  } else if (streak.currentStreak > 0) {
    // No activity log but has streak - this shouldn't happen, reset for safety
    streak.currentStreak = 0;
    broken = true;
  }

  // Recalculate streak to ensure accuracy
  await recalculateStreak(streak);
  
  streak.updatedAt = new Date();
  await streak.save();

  return { 
    streak, 
    broken, 
    daysSinceLastActivity,
    hadYesterdayActivity: !!hadYesterdayActivity
  };
}

/**
 * Get current streak status with warning information
 */
export async function getStreakStatus() {
  const result = await evaluateAndUpdateStreak();
  const { streak, broken, daysSinceLastActivity, hadYesterdayActivity } = result;
  
  const now = new Date();
  const today = startOfDay(now);
  const todayKey = dayKey(today);
  
  // Check if activity registered for today
  const todayActivity = streak.activityLog?.find(log => 
    dayKey(log.date) === todayKey
  );
  
  // Calculate next reset time (midnight)
  const nextReset = new Date(today);
  nextReset.setDate(today.getDate() + 1);
  
  // Warning time (2 hours before reset)
  const warningTime = new Date(nextReset.getTime() - 2 * 60 * 60 * 1000);
  
  return {
    currentStreak: streak.currentStreak || 0,
    longestStreak: streak.longestStreak || 0,
    lastActivityDate: streak.activityLog && streak.activityLog.length > 0 
      ? streak.activityLog.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
      : null,
    missedDays: streak.missedWorkouts || 0,
    daysSinceLastActivity,
    broken,
    hadYesterdayActivity,
    todayActivity: todayActivity ? {
      type: todayActivity.type,
      registeredAt: todayActivity.createdAt
    } : null,
    nextResetAt: nextReset,
    warningAt: warningTime,
    needsActivity: !todayActivity, // True if no activity registered today
    recentActivities: streak.activityLog 
      ? streak.activityLog
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 7) // Last 7 days
      : []
  };
}

/**
 * Register a workout completion (maintains backward compatibility)
 */
export async function registerWorkout(workoutData = {}) {
  return await registerActivity(ACTIVITY_TYPES.WORKOUT, workoutData);
}

/**
 * Register a recovery day
 */
export async function registerRecoveryDay(notes = '') {
  return await registerActivity(ACTIVITY_TYPES.RECOVERY, { notes });
}

/**
 * Register a planned rest day  
 */
export async function registerRestDay(notes = '') {
  return await registerActivity(ACTIVITY_TYPES.REST, { notes });
}

/**
 * Reset streak manually (admin function)
 */
export async function resetStreak() {
  let streak = await Streak.findById("local");
  if (!streak) return { success: false, message: "No streak found" };
  
  streak.currentStreak = 0;
  streak.activityLog = [];
  streak.updatedAt = new Date();
  await streak.save();
  
  return { success: true, message: "Streak reset successfully" };
}

export { ACTIVITY_TYPES };
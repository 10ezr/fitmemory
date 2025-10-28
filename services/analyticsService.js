import { Workout, AppConfig, Streak } from "@/models/index.js";
import { getStreakStatus } from "./streakService.js";

class AnalyticsService {
  constructor() {
    this.updateCallbacks = [];
    this.isInitialized = false;
  }

  // Initialize the analytics service
  async initialize() {
    if (this.isInitialized) return;

    console.log("Initializing AnalyticsService...");

    // Set up periodic analytics updates
    this.startPeriodicUpdates();

    this.isInitialized = true;
    console.log("AnalyticsService initialized");
  }

  // Subscribe to analytics updates
  subscribe(callback) {
    this.updateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  // Notify subscribers of analytics updates
  notifyUpdate(analytics) {
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(analytics);
      } catch (error) {
        console.error("Error in analytics update callback:", error);
      }
    });
  }

  // Start periodic analytics updates
  startPeriodicUpdates() {
    // Update analytics every 5 minutes
    setInterval(async () => {
      await this.calculateConsistencyMetrics();
    }, 300000);
  }
  // Calculate consistency metrics
  async calculateConsistencyMetrics() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get unified streak status
      const streakStatus = await getStreakStatus();
      const dailyStreak = streakStatus.currentStreak || 0;

      // Calculate weekly counts for last 4 weeks
      const weeklyCounts = await this.calculateWeeklyCounts(today);

      // Calculate rolling 4-week average
      const rollingAverage =
        weeklyCounts.reduce((sum, count) => sum + count, 0) / 4;

      // Determine trend
      const trend = this.calculateTrend(weeklyCounts);

      const metrics = {
        dailyStreak,
        longestStreak: streakStatus.longestStreak || 0,
        lastWorkoutDate: streakStatus.lastWorkoutDate,
        missedWorkouts: streakStatus.missedWorkouts || 0,
        daysSinceLastWorkout: streakStatus.daysSinceLastWorkout,
        broken: streakStatus.broken || false,
        weeklyCounts,
        rollingAverage: Math.round(rollingAverage * 10) / 10,
        trend,
        lastUpdated: now,
      };

      // Update app config with new metrics
      await this.updateConsistencyMetrics(metrics);

      // Notify subscribers
      this.notifyUpdate(metrics);

      return metrics;
    } catch (error) {
      console.error("Error calculating consistency metrics:", error);
      throw error;
    }
  }

  async calculateWeeklyCounts(today) {
    const counts = [];

    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - weekOffset * 7);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(23, 59, 59, 999);

      const workoutsInWeek = await Workout.countDocuments({
        date: { $gte: weekStart, $lte: weekEnd },
      });

      counts.unshift(workoutsInWeek); // Add to beginning for chronological order
    }

    return counts;
  }

  calculateTrend(weeklyCounts) {
    if (weeklyCounts.length < 2) return "stable";

    const recent = weeklyCounts
      .slice(-2)
      .reduce((sum, count) => sum + count, 0);
    const earlier = weeklyCounts
      .slice(0, 2)
      .reduce((sum, count) => sum + count, 0);

    const change = recent - earlier;

    if (change > 1) return "improving";
    if (change < -1) return "declining";
    return "stable";
  }

  async updateConsistencyMetrics(metrics) {
    await AppConfig.findByIdAndUpdate(
      "singleton",
      { $set: { consistency: metrics } },
      { upsert: true }
    );
  }

  // Detect workout patterns
  async detectWorkoutPatterns() {
    try {
      const workouts = await Workout.find({}).sort({ date: -1 }).limit(50); // Analyze last 50 workouts

      if (workouts.length < 3) {
        return this.getDefaultPatterns();
      }

      const patterns = {
        usualDays: await this.detectUsualDays(workouts),
        averageSessionLength: await this.calculateAverageSessionLength(
          workouts
        ),
        favoredExercises: await this.detectFavoredExercises(workouts),
        typicalWeeklyVolume: await this.calculateTypicalWeeklyVolume(workouts),
        preferredEquipment: await this.detectPreferredEquipment(workouts),
        usualSessionTime: await this.detectUsualSessionTime(workouts),
        workoutFrequency: await this.calculateWorkoutFrequency(workouts),
        restDayPatterns: await this.detectRestDayPatterns(workouts),
      };

      // Update app config with detected patterns
      await this.updateWorkoutPatterns(patterns);

      return patterns;
    } catch (error) {
      console.error("Error detecting workout patterns:", error);
      return this.getDefaultPatterns();
    }
  }

  async detectUsualDays(workouts) {
    const dayCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    workouts.forEach((workout) => {
      const day = workout.date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      dayCount[day]++;
    });

    const totalWorkouts = workouts.length;
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Find days with >15% of workouts
    const usualDays = Object.entries(dayCount)
      .filter(([day, count]) => count / totalWorkouts > 0.15)
      .map(([day, count]) => ({
        day: dayNames[parseInt(day)],
        frequency: Math.round((count / totalWorkouts) * 100),
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return usualDays.slice(0, 3); // Top 3 days
  }

  async calculateAverageSessionLength(workouts) {
    // Estimate session length based on exercise count and types
    const sessionLengths = workouts.map((workout) => {
      let estimatedMinutes = 0;

      workout.exercises.forEach((exercise) => {
        if (exercise.durationS) {
          estimatedMinutes += exercise.durationS / 60;
        } else {
          // Estimate based on sets/reps
          const sets = exercise.sets || 1;
          const restTime = sets * 2; // 2 minutes rest per set
          const workTime = sets * 2; // 2 minutes work per set
          estimatedMinutes += restTime + workTime;
        }
      });

      return Math.max(estimatedMinutes, 15); // Minimum 15 minutes
    });

    const average =
      sessionLengths.reduce((sum, length) => sum + length, 0) /
      sessionLengths.length;
    return Math.round(average);
  }

  async detectFavoredExercises(workouts) {
    const exerciseCount = {};

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        const name = exercise.name.toLowerCase().trim();
        exerciseCount[name] = (exerciseCount[name] || 0) + 1;
      });
    });

    // Get exercises that appear in >20% of workouts
    const totalWorkouts = workouts.length;
    const favoredExercises = Object.entries(exerciseCount)
      .filter(([name, count]) => count / totalWorkouts > 0.2)
      .map(([name, count]) => ({
        name,
        frequency: Math.round((count / totalWorkouts) * 100),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    return favoredExercises;
  }

  async calculateTypicalWeeklyVolume(workouts) {
    // Group workouts by week
    const weeklyData = {};

    workouts.forEach((workout) => {
      const weekStart = new Date(workout.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { workouts: 0, exercises: 0, volume: 0 };
      }

      weeklyData[weekKey].workouts++;
      weeklyData[weekKey].exercises += workout.exercises.length;

      // Calculate volume (sets * reps * weight)
      workout.exercises.forEach((exercise) => {
        if (exercise.sets && exercise.reps && exercise.weightKg) {
          weeklyData[weekKey].volume +=
            exercise.sets * exercise.reps * exercise.weightKg;
        }
      });
    });

    const weeks = Object.values(weeklyData);
    if (weeks.length === 0) return { workouts: 0, exercises: 0, volume: 0 };

    return {
      workouts:
        Math.round(
          (weeks.reduce((sum, week) => sum + week.workouts, 0) / weeks.length) *
            10
        ) / 10,
      exercises:
        Math.round(
          (weeks.reduce((sum, week) => sum + week.exercises, 0) /
            weeks.length) *
            10
        ) / 10,
      volume: Math.round(
        weeks.reduce((sum, week) => sum + week.volume, 0) / weeks.length
      ),
    };
  }

  async detectPreferredEquipment(workouts) {
    const equipmentKeywords = {
      barbell: ["barbell", "squat", "deadlift", "bench"],
      dumbbell: ["dumbbell", "db", "curl"],
      bodyweight: ["pushup", "pullup", "chinup", "dip", "bodyweight"],
      machine: ["machine", "cable", "lat pulldown"],
      cardio: ["running", "cycling", "treadmill", "elliptical"],
    };

    const equipmentCount = {};

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        const exerciseName = exercise.name.toLowerCase();

        Object.entries(equipmentKeywords).forEach(([equipment, keywords]) => {
          if (keywords.some((keyword) => exerciseName.includes(keyword))) {
            equipmentCount[equipment] = (equipmentCount[equipment] || 0) + 1;
          }
        });
      });
    });

    return Object.entries(equipmentCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([equipment, count]) => equipment);
  }

  async detectUsualSessionTime(workouts) {
    // Analyze creation times to estimate usual workout times
    const hours = workouts.map((workout) => workout.createdAt.getHours());

    const timeSlots = {
      "early morning": 0, // 5-8 AM
      morning: 0, // 8-12 PM
      afternoon: 0, // 12-5 PM
      evening: 0, // 5-8 PM
      night: 0, // 8 PM-12 AM
    };

    hours.forEach((hour) => {
      if (hour >= 5 && hour < 8) timeSlots["early morning"]++;
      else if (hour >= 8 && hour < 12) timeSlots["morning"]++;
      else if (hour >= 12 && hour < 17) timeSlots["afternoon"]++;
      else if (hour >= 17 && hour < 20) timeSlots["evening"]++;
      else timeSlots["night"]++;
    });

    // Find most common time slot
    const mostCommon = Object.entries(timeSlots).sort(
      ([, a], [, b]) => b - a
    )[0];

    return mostCommon ? mostCommon[0] : "evening";
  }

  async calculateWorkoutFrequency(workouts) {
    if (workouts.length < 2) return { sessionsPerWeek: 0, avgRestDays: 0 };

    const daysBetweenWorkouts = [];

    for (let i = 1; i < workouts.length; i++) {
      const days = Math.abs(
        (workouts[i - 1].date - workouts[i].date) / (1000 * 60 * 60 * 24)
      );
      daysBetweenWorkouts.push(days);
    }

    const avgDaysBetween =
      daysBetweenWorkouts.reduce((sum, days) => sum + days, 0) /
      daysBetweenWorkouts.length;
    const sessionsPerWeek = Math.round((7 / avgDaysBetween) * 10) / 10;

    return {
      sessionsPerWeek: Math.min(sessionsPerWeek, 7), // Cap at 7
      avgRestDays: Math.round(avgDaysBetween * 10) / 10,
    };
  }

  async detectRestDayPatterns(workouts) {
    // This would analyze gaps between workouts to find rest day patterns
    // Simplified implementation
    const frequency = await this.calculateWorkoutFrequency(workouts);

    if (frequency.sessionsPerWeek >= 6) return "minimal rest";
    if (frequency.sessionsPerWeek >= 4) return "1-2 rest days between sessions";
    if (frequency.sessionsPerWeek >= 2) return "2-3 rest days between sessions";
    return "irregular schedule";
  }

  async updateWorkoutPatterns(patterns) {
    await AppConfig.findByIdAndUpdate(
      "singleton",
      { $set: { patterns } },
      { upsert: true }
    );
  }

  getDefaultPatterns() {
    return {
      usualDays: [],
      averageSessionLength: 45,
      favoredExercises: [],
      typicalWeeklyVolume: { workouts: 0, exercises: 0, volume: 0 },
      preferredEquipment: [],
      usualSessionTime: "evening",
      workoutFrequency: { sessionsPerWeek: 0, avgRestDays: 0 },
      restDayPatterns: "insufficient data",
    };
  }

  // Generate human-readable pattern summary
  async generatePatternSummary() {
    try {
      const patterns = await this.detectWorkoutPatterns();
      const consistency = await this.calculateConsistencyMetrics();

      let summary = [];

      // Frequency
      if (patterns.workoutFrequency.sessionsPerWeek > 0) {
        summary.push(
          `~${patterns.workoutFrequency.sessionsPerWeek} sessions/week`
        );
      }

      // Usual days
      if (patterns.usualDays.length > 0) {
        const days = patterns.usualDays
          .map((d) => d.day)
          .slice(0, 2)
          .join(", ");
        summary.push(`usually ${days}`);
      }

      // Session time
      if (patterns.usualSessionTime !== "evening") {
        summary.push(`${patterns.usualSessionTime}s`);
      }

      // Favorite exercises
      if (patterns.favoredExercises.length > 0) {
        const exercises = patterns.favoredExercises
          .slice(0, 2)
          .map((e) => e.name)
          .join(", ");
        summary.push(`fav: ${exercises}`);
      }

      // Current streak
      if (consistency.dailyStreak > 0) {
        summary.push(`${consistency.dailyStreak} day streak`);
      }

      return summary.length > 0
        ? summary.join(", ")
        : "Building your routine...";
    } catch (error) {
      console.error("Error generating pattern summary:", error);
      return "Unable to analyze patterns yet";
    }
  }
}

export default AnalyticsService;

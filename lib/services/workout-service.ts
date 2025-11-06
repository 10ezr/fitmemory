import connectDatabase from '@/lib/database';
import { Workout } from '@/models';
import type { Workout as WorkoutType, WorkoutStats, CreateWorkoutData } from '@/lib/types';

/**
 * Consolidated Workout Service
 * Handles all workout-related business logic and database operations
 */
export class WorkoutService {
  /**
   * Get today's workout
   */
  async getTodaysWorkout(): Promise<WorkoutType | null> {
    await connectDatabase();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const workout = await Workout.findOne({
      date: { $gte: today, $lt: tomorrow }
    }).lean<WorkoutType>();
    
    return workout;
  }

  /**
   * Get tomorrow's workout
   */
  async getTomorrowsWorkout(): Promise<WorkoutType | null> {
    await connectDatabase();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    const workout = await Workout.findOne({
      date: { $gte: tomorrow, $lt: dayAfter }
    }).lean<WorkoutType>();
    
    return workout;
  }

  /**
   * Get workouts within a date range
   */
  async getWorkoutsByDateRange(
    startDate: Date, 
    endDate: Date
  ): Promise<WorkoutType[]> {
    await connectDatabase();
    
    const workouts = await Workout.find({
      date: { $gte: startDate, $lte: endDate }
    })
    .sort({ date: -1 })
    .lean<WorkoutType[]>();
    
    return workouts;
  }

  /**
   * Get recent workouts with limit
   */
  async getRecentWorkouts(limit: number = 10): Promise<WorkoutType[]> {
    await connectDatabase();
    
    const workouts = await Workout.find()
      .sort({ date: -1 })
      .limit(limit)
      .lean<WorkoutType[]>();
    
    return workouts;
  }

  /**
   * Create a new workout
   */
  async createWorkout(workoutData: CreateWorkoutData): Promise<WorkoutType> {
    await connectDatabase();
    
    const workout = await Workout.create({
      ...workoutData,
      date: workoutData.date || new Date(),
      createdAt: new Date(),
    });
    
    return workout.toObject() as WorkoutType;
  }

  /**
   * Update an existing workout
   */
  async updateWorkout(
    workoutId: string, 
    updates: Partial<CreateWorkoutData>
  ): Promise<WorkoutType | null> {
    await connectDatabase();
    
    const workout = await Workout.findByIdAndUpdate(
      workoutId,
      updates,
      { new: true }
    ).lean<WorkoutType>();
    
    return workout;
  }

  /**
   * Delete a workout
   */
  async deleteWorkout(workoutId: string): Promise<boolean> {
    await connectDatabase();
    
    const result = await Workout.findByIdAndDelete(workoutId);
    return !!result;
  }

  /**
   * Calculate comprehensive workout statistics
   */
  async getWorkoutStats(): Promise<WorkoutStats> {
    await connectDatabase();
    
    const workouts = await Workout.find()
      .sort({ date: -1 })
      .lean<WorkoutType[]>();
    
    if (workouts.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalWorkouts: 0,
        weeklyCounts: [0, 0, 0, 0, 0, 0, 0],
      };
    }

    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(workouts);
    
    // Calculate weekly counts (last 7 days)
    const weeklyCounts = this.calculateWeeklyCounts(workouts);
    
    return {
      currentStreak,
      longestStreak,
      totalWorkouts: workouts.length,
      weeklyCounts,
      lastWorkoutDate: workouts[0]?.date,
    };
  }

  /**
   * Calculate current and longest workout streaks
   */
  private calculateStreaks(workouts: WorkoutType[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    if (workouts.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Get unique dates (in case of multiple workouts per day)
    const uniqueDates = Array.from(
      new Set(
        workouts.map(w => {
          const d = new Date(w.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })
      )
    ).sort((a, b) => b - a); // Sort descending

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Check if there's a workout today or yesterday for current streak
    const mostRecentDate = uniqueDates[0];
    const daysSinceLastWorkout = (todayTime - mostRecentDate) / oneDayMs;
    
    if (daysSinceLastWorkout <= 1) {
      // Start counting current streak
      for (let i = 0; i < uniqueDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const daysDiff = (uniqueDates[i - 1] - uniqueDates[i]) / oneDayMs;
          if (daysDiff <= 1) {
            tempStreak++;
          } else {
            break;
          }
        }
      }
      currentStreak = tempStreak;
    }

    // Calculate longest streak
    tempStreak = 1;
    longestStreak = 1;
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const daysDiff = (uniqueDates[i - 1] - uniqueDates[i]) / oneDayMs;
      
      if (daysDiff <= 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Calculate workout counts for the last 7 days
   * Returns array [6 days ago, 5 days ago, ..., yesterday, today]
   */
  private calculateWeeklyCounts(workouts: WorkoutType[]): number[] {
    const counts = Array(7).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - (6 - i));
      
      const count = workouts.filter(w => {
        const workoutDate = new Date(w.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.getTime() === targetDate.getTime();
      }).length;
      
      counts[i] = count;
    }
    
    return counts;
  }
}

// Export singleton instance
export const workoutService = new WorkoutService();

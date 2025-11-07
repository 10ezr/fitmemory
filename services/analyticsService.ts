import { Workout } from '@/models';
import { WorkoutAnalytics, WorkoutType } from '@/types';

/**
 * AnalyticsService - Calculates workout statistics and trends
 * Provides insights into consistency, patterns, and progress
 */
export default class AnalyticsService {
  /**
   * Calculate comprehensive consistency metrics
   */
  async calculateConsistencyMetrics(): Promise<{
    weeklyCounts: number[];
    rollingAverage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    totalWorkouts: number;
    averagePerWeek: number;
  }> {
    try {
      const now = new Date();
      const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

      // Get workouts from last 4 weeks
      const workouts = await Workout.find({
        userId: 'local',
        date: { $gte: fourWeeksAgo }
      }).sort({ date: 1 }).lean();

      // Calculate weekly counts (last 4 weeks)
      const weeklyCounts = this.calculateWeeklyCounts(workouts as any[], now);

      // Calculate rolling average (last 2 weeks)
      const rollingAverage = (weeklyCounts[2] + weeklyCounts[3]) / 2;

      // Determine trend
      const trend = this.calculateTrend(weeklyCounts);

      // Overall stats
      const totalWorkouts = workouts.length;
      const averagePerWeek = totalWorkouts / 4;

      return {
        weeklyCounts,
        rollingAverage,
        trend,
        totalWorkouts,
        averagePerWeek
      };
    } catch (error) {
      console.error('Error calculating consistency metrics:', error);
      return {
        weeklyCounts: [0, 0, 0, 0],
        rollingAverage: 0,
        trend: 'stable',
        totalWorkouts: 0,
        averagePerWeek: 0
      };
    }
  }

  /**
   * Calculate workout counts for each of the last 4 weeks
   */
  private calculateWeeklyCounts(
    workouts: Array<{ date: Date }>,
    referenceDate: Date
  ): number[] {
    const counts = [0, 0, 0, 0]; // 4 weeks

    workouts.forEach(workout => {
      const workoutDate = new Date(workout.date);
      const daysDiff = Math.floor(
        (referenceDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff < 7) counts[3]++; // This week
      else if (daysDiff < 14) counts[2]++; // Last week
      else if (daysDiff < 21) counts[1]++; // 2 weeks ago
      else if (daysDiff < 28) counts[0]++; // 3 weeks ago
    });

    return counts;
  }

  /**
   * Calculate trend from weekly counts
   */
  private calculateTrend(
    weeklyCounts: number[]
  ): 'increasing' | 'decreasing' | 'stable' {
    // Compare recent 2 weeks vs previous 2 weeks
    const recentAvg = (weeklyCounts[2] + weeklyCounts[3]) / 2;
    const previousAvg = (weeklyCounts[0] + weeklyCounts[1]) / 2;

    const diff = recentAvg - previousAvg;

    if (diff > 0.5) return 'increasing';
    if (diff < -0.5) return 'decreasing';
    return 'stable';
  }

  /**
   * Get comprehensive analytics for a period
   */
  async getWorkoutAnalytics(
    period: 'week' | 'month' | 'year' | 'all'
  ): Promise<WorkoutAnalytics> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      const workouts = await Workout.find({
        userId: 'local',
        date: { $gte: startDate }
      }).lean();

      // Calculate basic metrics
      const totalWorkouts = workouts.length;
      const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
      const totalCalories = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

      // Workouts by type
      const workoutsByType: Record<WorkoutType, number> = {
        [WorkoutType.STRENGTH]: 0,
        [WorkoutType.CARDIO]: 0,
        [WorkoutType.FLEXIBILITY]: 0,
        [WorkoutType.HIIT]: 0,
        [WorkoutType.SPORTS]: 0,
        [WorkoutType.OTHER]: 0
      };

      workouts.forEach(w => {
        if (w.type) {
          workoutsByType[w.type as WorkoutType]++;
        }
      });

      // Workouts by day of week
      const workoutsByDay: Record<string, number> = {
        Sunday: 0,
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0
      };

      workouts.forEach(w => {
        const dayName = new Date(w.date).toLocaleDateString('en-US', { weekday: 'long' });
        workoutsByDay[dayName]++;
      });

      // Top exercises
      const exerciseMap = new Map<string, { count: number; totalWeight: number; totalReps: number }>();

      workouts.forEach(w => {
        w.exercises?.forEach((ex: any) => {
          const existing = exerciseMap.get(ex.name) || { count: 0, totalWeight: 0, totalReps: 0 };
          exerciseMap.set(ex.name, {
            count: existing.count + 1,
            totalWeight: existing.totalWeight + (ex.weightKg || 0),
            totalReps: existing.totalReps + (ex.reps || 0) * (ex.sets || 1)
          });
        });
      });

      const topExercises = Array.from(exerciseMap.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate average intensity
      const intensityScores = {
        low: 1,
        moderate: 2,
        high: 3,
        extreme: 4
      };

      const avgIntensity = workouts.reduce((sum, w) => {
        return sum + (intensityScores[w.intensity as keyof typeof intensityScores] || 2);
      }, 0) / (totalWorkouts || 1);

      // Consistency score (0-100)
      const expectedWorkouts = this.getExpectedWorkouts(period);
      const consistencyScore = Math.min(100, Math.round((totalWorkouts / expectedWorkouts) * 100));

      return {
        period,
        totalWorkouts,
        totalDuration,
        totalCalories,
        averageIntensity: Math.round(avgIntensity * 100) / 100,
        workoutsByType,
        workoutsByDay,
        consistencyScore,
        trends: {
          workoutsPerWeek: [],
          averageDuration: [],
          caloriesBurned: []
        },
        topExercises
      };
    } catch (error) {
      console.error('Error getting workout analytics:', error);
      throw error;
    }
  }

  /**
   * Get expected number of workouts for a period
   */
  private getExpectedWorkouts(period: 'week' | 'month' | 'year' | 'all'): number {
    switch (period) {
      case 'week':
        return 3; // 3 workouts per week
      case 'month':
        return 12; // 3 per week * 4 weeks
      case 'year':
        return 150; // ~3 per week * 52 weeks
      default:
        return 150; // Assume year for consistency score
    }
  }
}

/**
 * Consolidated Service Layer
 * 
 * This module provides a single entry point for all business logic services.
 * Services handle data operations, calculations, and business rules.
 * 
 * Usage:
 *   import { workoutService, sleepService } from '@/lib/services';
 */

export { workoutService, WorkoutService } from './workout-service';
export { sleepService, SleepService } from './sleep-service';

// Re-export types for convenience
export type {
  Workout,
  WorkoutStats,
  CreateWorkoutData,
  SleepSession,
  SleepStats,
  CreateSleepSessionData,
} from '@/lib/types';

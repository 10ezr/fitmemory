import { z } from 'zod';
import {
  WorkoutType,
  WorkoutIntensity,
  SleepQuality,
  GoalType,
  GoalStatus,
  GoalPriority,
  MemoryType,
  ActionType
} from '@/types';

// Timestamp Validation
export const timestampSchema = z.object({
  epochMs: z.number().optional(),
  timezone: z.string().optional()
});

// Exercise Validation
export const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  sets: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  weightKg: z.number().positive().optional(),
  weightLbs: z.number().positive().optional(),
  durationMin: z.number().positive().optional(),
  distance: z.number().positive().optional(),
  distanceUnit: z.enum(['km', 'mi', 'm']).optional(),
  notes: z.string().optional()
}).refine(
  (data) => data.sets || data.durationMin || data.distance,
  { message: 'Exercise must have sets, duration, or distance' }
);

// Workout Validation
export const workoutCreateSchema = z.object({
  name: z.string().min(1, 'Workout name is required').max(200),
  date: z.coerce.date(),
  exercises: z.array(exerciseSchema).min(1, 'At least one exercise is required'),
  notes: z.string().max(1000).optional(),
  duration: z.number().positive().optional(),
  caloriesBurned: z.number().positive().optional(),
  type: z.nativeEnum(WorkoutType).optional(),
  intensity: z.nativeEnum(WorkoutIntensity).optional()
});

export const workoutUpdateSchema = workoutCreateSchema.partial();

// Sleep Validation
export const sleepFactorsSchema = z.object({
  caffeine: z.boolean().optional(),
  alcohol: z.boolean().optional(),
  stress: z.enum(['low', 'medium', 'high']).optional(),
  exercise: z.boolean().optional(),
  screenTime: z.number().min(0).optional()
});

export const sleepStagesSchema = z.object({
  deep: z.number().min(0).optional(),
  light: z.number().min(0).optional(),
  rem: z.number().min(0).optional(),
  awake: z.number().min(0).optional()
});

export const sleepCreateSchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  sleepQuality: z.nativeEnum(SleepQuality),
  sleepStages: sleepStagesSchema.optional(),
  notes: z.string().max(500).optional(),
  factors: sleepFactorsSchema.optional()
}).refine(
  (data) => data.endTime > data.startTime,
  { message: 'End time must be after start time' }
);

export const sleepUpdateSchema = sleepCreateSchema.partial();

// Message Validation
export const messageCreateSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000),
  timestamp: timestampSchema.optional(),
  context: z.record(z.any()).optional()
});

// Goal Validation
export const milestoneSchema = z.object({
  title: z.string().min(1, 'Milestone title is required'),
  target: z.number(),
  completed: z.boolean().default(false),
  completedAt: z.coerce.date().optional()
});

export const goalCreateSchema = z.object({
  title: z.string().min(1, 'Goal title is required').max(200),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(GoalType),
  target: z.number().positive('Target must be positive'),
  current: z.number().min(0).default(0),
  unit: z.string().min(1, 'Unit is required'),
  deadline: z.coerce.date().optional(),
  status: z.nativeEnum(GoalStatus).default(GoalStatus.NOT_STARTED),
  priority: z.nativeEnum(GoalPriority).default(GoalPriority.MEDIUM),
  milestones: z.array(milestoneSchema).optional()
}).refine(
  (data) => !data.deadline || data.deadline > new Date(),
  { message: 'Deadline must be in the future' }
);

export const goalUpdateSchema = goalCreateSchema.partial();

// Memory Validation
export const memoryCreateSchema = z.object({
  type: z.nativeEnum(MemoryType),
  content: z.string().min(1, 'Memory content is required').max(2000),
  meta: z.object({
    confidence: z.number().min(0).max(1).optional(),
    source: z.string().optional(),
    verified: z.boolean().optional()
  }).optional()
});

// AI Action Validation
export const aiActionSchema = z.object({
  action: z.nativeEnum(ActionType),
  type: z.string().optional(),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Streak Validation
export const weeklyScheduleSchema = z.object({
  monday: z.boolean().default(true),
  tuesday: z.boolean().default(true),
  wednesday: z.boolean().default(true),
  thursday: z.boolean().default(true),
  friday: z.boolean().default(true),
  saturday: z.boolean().default(false),
  sunday: z.boolean().default(false)
});

export const streakUpdateSchema = z.object({
  flexibleMode: z.boolean().optional(),
  workoutSchedule: weeklyScheduleSchema.optional()
});

// Timer Validation
export const timerCreateSchema = z.object({
  type: z.enum(['workout', 'rest', 'interval']),
  duration: z.number().positive('Duration must be positive'),
  workoutId: z.string().optional(),
  exerciseName: z.string().optional()
});

export const timerUpdateSchema = z.object({
  status: z.enum(['active', 'paused', 'completed', 'cancelled']),
  endTime: z.coerce.date().optional()
});

// Query Validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
}).refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  { message: 'End date must be after or equal to start date' }
);

export const workoutFilterSchema = paginationSchema.merge(dateRangeSchema).merge(
  z.object({
    type: z.nativeEnum(WorkoutType).optional(),
    intensity: z.nativeEnum(WorkoutIntensity).optional(),
    search: z.string().optional()
  })
);

export const sleepFilterSchema = paginationSchema.merge(dateRangeSchema).merge(
  z.object({
    quality: z.nativeEnum(SleepQuality).optional(),
    minDuration: z.number().positive().optional(),
    maxDuration: z.number().positive().optional()
  })
);

// Analytics Validation
export const analyticsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year', 'all']).default('month'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
});

// User Preferences Validation
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.boolean().optional(),
  workoutReminders: z.boolean().optional(),
  sleepReminders: z.boolean().optional(),
  weeklyGoal: z.number().int().positive().optional()
});

// Auth Validation (for future use)
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
);

// Helper function to validate with Zod
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: z.ZodError }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// Helper to format Zod errors
export function formatZodError(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });
  
  return formatted;
}

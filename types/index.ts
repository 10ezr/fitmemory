// Core API Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Timestamp Types
export interface TimestampPayload {
  epochMs?: number;
  timezone?: string;
}

export interface LocalDateTime {
  iso: string;
  timezone: string;
  display: string;
  epochMs: number;
}

// User Types
export interface UserProfile {
  _id: string;
  name?: string;
  email?: string;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  workoutReminders?: boolean;
  sleepReminders?: boolean;
  weeklyGoal?: number;
}

// Workout Types
export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  weightLbs?: number;
  durationMin?: number;
  distance?: number;
  distanceUnit?: 'km' | 'mi' | 'm';
  notes?: string;
}

export interface WorkoutData {
  name: string;
  date: Date;
  exercises: Exercise[];
  notes?: string;
  duration?: number;
  caloriesBurned?: number;
  type?: WorkoutType;
  intensity?: WorkoutIntensity;
}

export enum WorkoutType {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  FLEXIBILITY = 'flexibility',
  HIIT = 'hiit',
  SPORTS = 'sports',
  OTHER = 'other'
}

export enum WorkoutIntensity {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  EXTREME = 'extreme'
}

export interface Workout extends WorkoutData {
  _id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Sleep Types
export interface SleepSession {
  _id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  totalSleepTime: number; // minutes
  sleepQuality: SleepQuality;
  sleepStages?: SleepStages;
  notes?: string;
  factors?: SleepFactors;
  createdAt: Date;
  updatedAt: Date;
}

export enum SleepQuality {
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  EXCELLENT = 'excellent'
}

export interface SleepStages {
  deep?: number; // minutes
  light?: number;
  rem?: number;
  awake?: number;
}

export interface SleepFactors {
  caffeine?: boolean;
  alcohol?: boolean;
  stress?: 'low' | 'medium' | 'high';
  exercise?: boolean;
  screenTime?: number; // minutes before bed
}

export interface SleepReadiness {
  score: number; // 0-100
  status: 'poor' | 'fair' | 'good' | 'excellent';
  recentSleep: {
    last7Days: number;
    last30Days: number;
    quality: SleepQuality;
  };
  recommendations: string[];
}

// Streak Types
export interface StreakData {
  _id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: Date;
  missedWorkouts: number;
  flexibleMode: boolean;
  workoutSchedule?: WeeklySchedule;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklySchedule {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface StreakStatus {
  current: number;
  longest: number;
  lastWorkout?: Date;
  status: 'active' | 'at-risk' | 'broken';
  daysUntilReset: number;
  message: string;
}

// Message Types
export interface Message {
  _id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta?: MessageMeta;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageMeta {
  timestamp?: LocalDateTime;
  actions?: AiAction[];
  workoutLogged?: boolean;
  sleepLogged?: boolean;
  streakIncremented?: boolean;
  error?: string;
}

// AI & Memory Types
export interface AiAction {
  action: ActionType;
  type?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export enum ActionType {
  MEMORY_ADD = 'memory_add',
  MEMORY_UPDATE = 'memory_update',
  MEMORY_DELETE = 'memory_delete',
  WORKOUT_LOG = 'workout_log',
  SLEEP_LOG = 'sleep_log',
  REMINDER_SET = 'reminder_set',
  GOAL_UPDATE = 'goal_update'
}

export interface Memory {
  _id: string;
  userId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  meta?: MemoryMeta;
  createdAt: Date;
  updatedAt: Date;
}

export enum MemoryType {
  PREFERENCE = 'preference',
  PATTERN = 'pattern',
  GOAL = 'goal',
  ACHIEVEMENT = 'achievement',
  CONTEXT = 'context',
  PERSONAL = 'personal'
}

export interface MemoryMeta {
  confidence?: number;
  source?: string;
  verified?: boolean;
  lastAccessed?: Date;
}

export interface ConversationContext {
  shortTerm: Message[];
  recentWorkouts: Workout[];
  memories: Memory[];
  user?: UserProfile;
  streakData?: StreakData;
  sleepReadiness?: SleepReadiness;
}

export interface GeminiContext {
  user?: UserProfile | null;
  recentWorkouts: Workout[];
  memories: Memory[];
  lastMessages: Message[];
  workoutJustLogged?: Workout | null;
  sleepJustLogged?: SleepSession | null;
  sleepReadiness?: SleepReadiness | null;
  streakData?: StreakData | null;
  currentDateTime: LocalDateTime;
}

export interface GeminiResponse {
  reply: string;
  actions: AiAction[];
  confidence?: number;
}

// Goals Types
export interface Goal {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  type: GoalType;
  target: number;
  current: number;
  unit: string;
  deadline?: Date;
  status: GoalStatus;
  priority: GoalPriority;
  milestones?: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export enum GoalType {
  WORKOUT_FREQUENCY = 'workout_frequency',
  WEIGHT_LOSS = 'weight_loss',
  WEIGHT_GAIN = 'weight_gain',
  STRENGTH = 'strength',
  ENDURANCE = 'endurance',
  FLEXIBILITY = 'flexibility',
  SLEEP_QUALITY = 'sleep_quality',
  CUSTOM = 'custom'
}

export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  ABANDONED = 'abandoned'
}

export enum GoalPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Milestone {
  title: string;
  target: number;
  completed: boolean;
  completedAt?: Date;
}

// Analytics Types
export interface WorkoutAnalytics {
  period: 'week' | 'month' | 'year' | 'all';
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  averageIntensity: number;
  workoutsByType: Record<WorkoutType, number>;
  workoutsByDay: Record<string, number>;
  consistencyScore: number;
  trends: {
    workoutsPerWeek: number[];
    averageDuration: number[];
    caloriesBurned: number[];
  };
  topExercises: Array<{
    name: string;
    count: number;
    totalWeight: number;
    totalReps: number;
  }>;
}

export interface SleepAnalytics {
  period: 'week' | 'month' | 'year';
  averageSleepTime: number;
  averageQuality: number;
  sleepDebt: number;
  bestSleepDay: string;
  worstSleepDay: string;
  trends: {
    sleepTime: number[];
    quality: number[];
  };
  patterns: {
    optimalBedtime: string;
    optimalWakeTime: string;
    consistencyScore: number;
  };
}

// Timer Types
export interface TimerData {
  _id: string;
  userId: string;
  type: 'workout' | 'rest' | 'interval';
  duration: number; // seconds
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  workoutId?: string;
  exerciseName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response Types
export interface ConverseRequest {
  message: string;
  timestamp?: TimestampPayload;
  context?: Partial<GeminiContext>;
}

export interface ConverseResponse {
  reply: string;
  actions: AiAction[];
  workoutLogged: boolean;
  sleepLogged: boolean;
  streakUpdate: StreakUpdate | null;
  streakStatus: StreakStatus | null;
  workout: WorkoutSummary | null;
  sleepSession: SleepSummary | null;
  sleepReadiness: SleepReadiness | null;
  currentDateTime: LocalDateTime;
}

export interface WorkoutSummary {
  id: string;
  name: string;
  exercises: number;
  duration?: number;
  type?: WorkoutType;
}

export interface SleepSummary {
  id: string;
  quality: SleepQuality;
  duration: number;
  summary?: string;
}

export interface StreakUpdate {
  previous: number;
  current: number;
  increased: boolean;
  message: string;
}

// Admin Types
export interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  workouts: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  sleep: {
    total: number;
    averageQuality: number;
    averageDuration: number;
  };
  database: {
    size: number;
    collections: number;
    documents: number;
  };
  system: {
    uptime: number;
    version: string;
    environment: string;
  };
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type Nullable<T> = T | null;

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;

// Error Types
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      404,
      'NOT_FOUND'
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

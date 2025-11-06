import { Types } from 'mongoose';

// ============================================
// User Types
// ============================================
export interface User {
  _id: string;
  name?: string;
  weightKg?: number;
  heightCm?: number;
  goals?: string;
  createdAt: Date;
}

// ============================================
// Workout Types
// ============================================
export interface Exercise {
  _id: Types.ObjectId;
  workoutId: Types.ObjectId;
  name: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  durationS?: number;
  rpe?: number; // Rate of Perceived Exertion
  notes?: string;
}

export interface Workout {
  _id: Types.ObjectId;
  date: Date;
  name?: string;
  notes?: string;
  exercises: Exercise[];
  createdAt: Date;
}

export interface WorkoutStats {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  weeklyCounts: number[];
  lastWorkoutDate?: Date;
}

export interface CreateWorkoutData {
  date?: Date;
  name?: string;
  notes?: string;
  exercises?: Partial<Exercise>[];
}

// ============================================
// Sleep Types
// ============================================
export type SleepMood = 'terrible' | 'poor' | 'okay' | 'good' | 'excellent';

export interface SleepSession {
  _id: Types.ObjectId;
  date: Date;
  bedTime?: Date;
  sleepTime?: Date;
  wakeTime?: Date;
  getUpTime?: Date;
  totalTimeInBed?: number; // Minutes
  totalSleepTime?: number; // Minutes
  sleepEfficiency?: number; // Percentage
  sleepQuality: number; // 1-10
  mood?: SleepMood;
  notes?: string;
  tags?: string[];
  createdAt: Date;
}

export interface SleepStats {
  avgDuration: number; // Hours
  avgQuality: number;
  totalSessions: number;
  trend?: 'improving' | 'declining' | 'stable';
}

export interface CreateSleepSessionData {
  date?: Date;
  bedTime?: Date;
  wakeTime?: Date;
  sleepQuality: number;
  mood?: SleepMood;
  notes?: string;
}

// ============================================
// Message & Memory Types
// ============================================
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  _id: Types.ObjectId;
  role: MessageRole;
  content: string;
  meta?: any;
  createdAt: Date;
}

export type MemoryType = 
  | 'preference' 
  | 'goal' 
  | 'pattern' 
  | 'injury' 
  | 'constraint' 
  | 'insight' 
  | 'sleep_pattern' 
  | 'sleep_goal';

export interface Memory {
  _id: Types.ObjectId;
  type: MemoryType;
  content: string;
  meta?: any;
  embedding?: number[];
  createdAt: Date;
}

// ============================================
// Streak Types
// ============================================
export interface Streak {
  _id: string;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: Date;
  missedWorkouts: number;
  flexibleMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ============================================
// Timer Types
// ============================================
export interface TimerSession {
  _id: Types.ObjectId;
  label: string;
  duration: number; // Seconds
  startTime: Date;
  endTime?: Date;
  completed: boolean;
  createdAt: Date;
}

// ============================================
// Analytics Types
// ============================================
export interface DashboardData {
  stats: WorkoutStats;
  recentWorkouts: Workout[];
  recentSleep: SleepSession[];
  sleepStats: SleepStats;
}

export interface AnalyticsData {
  workoutTrends: {
    weekly: number[];
    monthly: number[];
  };
  sleepTrends: {
    avgDuration: number[];
    avgQuality: number[];
  };
  consistency: {
    score: number;
    trend: 'improving' | 'declining' | 'stable';
  };
}

// ============================================
// Component Props Types
// ============================================
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: Error | null;
}

export interface DataHookResult<T> extends LoadingState {
  data: T | null;
  mutate: () => Promise<void>;
  refresh: () => Promise<void>;
}

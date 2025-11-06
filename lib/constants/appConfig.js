/**
 * Centralized application configuration constants
 * Replaces magic numbers scattered throughout the codebase
 */

// Fitness Goals
export const FITNESS_GOALS = {
  DAILY_STEPS: 8000,
  DAILY_WATER_GLASSES: 8,
  WEEKLY_WORKOUTS: 4,
  MIN_SLEEP_HOURS: 7,
  MAX_SLEEP_HOURS: 9,
  OPTIMAL_SLEEP_HOURS: 8
};

// Timer Presets
export const TIMER_PRESETS = {
  FOCUS: { label: "Focus", minutes: 10, color: "violet" },
  HIIT: { label: "HIIT", minutes: 20, color: "red" },
  WALK: { label: "Walk", minutes: 30, color: "green" }
};

// Workout Templates
export const WORKOUT_TEMPLATES = {
  hiit: { 
    name: "Quick HIIT", 
    exercises: ["Burpees", "Mountain climbers", "Jump squats"], 
    duration: 20 
  },
  strength: { 
    name: "Strength Training", 
    exercises: ["Push-ups", "Squats", "Planks"], 
    duration: 30 
  },
  cardio: { 
    name: "Cardio Blast", 
    exercises: ["Running", "Cycling", "Jumping jacks"], 
    duration: 25 
  }
};

// Data Sync Configuration
export const SYNC_CONFIG = {
  SYNC_INTERVAL: 30000, // 30 seconds
  STREAK_CHECK_INTERVAL: 300000, // 5 minutes
  SLEEP_CHECK_INTERVAL: 600000, // 10 minutes
  DATA_STALE_THRESHOLD: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3
};

// UI Configuration
export const UI_CONFIG = {
  SPARKLINE: {
    DEFAULT_WIDTH: 120,
    DEFAULT_HEIGHT: 36,
    DEFAULT_COLOR: "#7c3aed"
  },
  PROGRESS_RING: {
    DEFAULT_SIZE: 92,
    DEFAULT_STROKE_WIDTH: 8,
    DEFAULT_COLOR: "#7c3aed"
  },
  ANIMATION_DURATION: 1000
};

// Sleep Configuration
export const SLEEP_CONFIG = {
  QUALITY_SCALE: { MIN: 1, MAX: 10 },
  MOOD_OPTIONS: ['terrible', 'poor', 'okay', 'good', 'excellent'],
  ENVIRONMENT: {
    NOISE_LEVELS: ['quiet', 'moderate', 'noisy'],
    LIGHT_LEVELS: ['dark', 'dim', 'bright']
  },
  INTERRUPTION_REASONS: ['bathroom', 'noise', 'stress', 'unknown']
};

// Health Readiness Weights
export const READINESS_WEIGHTS = {
  SLEEP: 40,
  DURATION: 30,
  WORKOUT: 20,
  CONSISTENCY: 10
};

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  ENDPOINTS: {
    STATS: '/api/stats',
    WORKOUTS: '/api/workouts',
    SLEEP: '/api/sleep',
    CONVERSE: '/api/converse',
    TIMER: '/api/timer'
  }
};
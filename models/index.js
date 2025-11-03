import mongoose from "mongoose";

// User schema - single local user
const userSchema = new mongoose.Schema({
  _id: { type: String, default: "local" },
  name: String,
  weightKg: Number,
  heightCm: Number,
  goals: String,
  createdAt: { type: Date, default: Date.now },
});

// Exercise schema (embedded in workouts)
const exerciseSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  workoutId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  sets: Number,
  reps: Number,
  weightKg: Number,
  durationS: Number,
  rpe: Number, // Rate of Perceived Exertion
  notes: String,
});

// Workout schema
const workoutSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  date: { type: Date, required: true },
  name: String,
  notes: String,
  exercises: [exerciseSchema],
  createdAt: { type: Date, default: Date.now },
});

// Message schema for conversation history
const messageSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  role: {
    type: String,
    enum: ["user", "assistant", "system"],
    required: true,
  },
  content: { type: String, required: true },
  meta: mongoose.Schema.Types.Mixed, // For additional metadata
  createdAt: { type: Date, default: Date.now },
});

// Memory schema for persistent memories with embeddings
const memorySchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  type: {
    type: String,
    enum: ["preference", "goal", "pattern", "injury", "constraint", "insight", "sleep_pattern", "sleep_goal"],
    required: true,
  },
  content: { type: String, required: true },
  meta: mongoose.Schema.Types.Mixed, // Additional context
  embedding: [Number], // Vector embedding for similarity search
  createdAt: { type: Date, default: Date.now },
});

// Gemini response schema for persistence and offline capability
const geminiResponseSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  prompt: { type: String, required: true },
  responseRaw: { type: String, required: true },
  actions: mongoose.Schema.Types.Mixed, // Parsed actions from response
  embedding: [Number], // Embedding of the response
  metadata: mongoose.Schema.Types.Mixed, // Additional Gemini metadata
  createdAt: { type: Date, default: Date.now },
});

// Streak schema for tracking daily workout streaks
const streakSchema = new mongoose.Schema({
  _id: { type: String, default: "local" },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastWorkoutDate: Date,
  streakHistory: [
    {
      date: Date,
      streak: Number,
    },
  ],
  workoutSchedule: {
    type: mongoose.Schema.Types.Mixed,
    default: null, // AI-determined schedule (e.g., {frequency: 'daily', restDays: ['sunday'], intensity: 'moderate'})
  },
  missedWorkouts: { type: Number, default: 0 },
  flexibleMode: { type: Boolean, default: true }, // Allow AI to adjust schedule
  aiAdjustments: [
    {
      date: Date,
      adjustment: String, // Reason for schedule change
      newSchedule: mongoose.Schema.Types.Mixed,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Sleep session schema for detailed sleep tracking
const sleepSessionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  date: { type: Date, required: true },
  bedTime: Date,
  sleepTime: Date, // When actually fell asleep
  wakeTime: Date,
  getUpTime: Date, // When got out of bed
  totalTimeInBed: Number, // Minutes
  totalSleepTime: Number, // Minutes
  sleepEfficiency: Number, // Percentage (total sleep / time in bed)
  sleepQuality: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  mood: {
    type: String,
    enum: ['terrible', 'poor', 'okay', 'good', 'excellent']
  },
  environment: {
    roomTemp: Number,
    noiseLevel: String, // 'quiet', 'moderate', 'noisy'
    lightLevel: String, // 'dark', 'dim', 'bright'
    screenTime: Number // Minutes before bed
  },
  sleepStages: {
    light: Number, // Minutes
    deep: Number,  // Minutes  
    rem: Number,   // Minutes
    awake: Number  // Minutes
  },
  interruptions: [{
    time: Date,
    reason: String, // 'bathroom', 'noise', 'stress', 'unknown'
    duration: Number // Minutes
  }],
  notes: String,
  tags: [String], // 'caffeine', 'alcohol', 'exercise', 'stress', etc.
  createdAt: { type: Date, default: Date.now },
});

// Sleep goals and preferences schema
const sleepGoalsSchema = new mongoose.Schema({
  _id: { type: String, default: "local" },
  targetBedTime: String, // "22:30"
  targetWakeTime: String, // "06:30"
  targetSleepDuration: Number, // Minutes
  sleepQualityGoal: Number, // 1-10
  preferences: {
    trackingMethods: [String], // 'manual', 'wearable', 'phone', 'smart-alarm'
    reminderEnabled: Boolean,
    reminderTime: String, // "21:30"
    weekendFlexibility: Boolean
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Sleep patterns analysis schema
const sleepPatternsSchema = new mongoose.Schema({
  _id: { type: String, default: "local" },
  averageBedTime: String,
  averageWakeTime: String,
  averageSleepDuration: Number,
  averageSleepQuality: Number,
  sleepDebt: Number, // Cumulative minutes
  consistencyScore: Number, // 0-100
  trends: {
    sleepDuration: String, // 'improving', 'declining', 'stable'
    sleepQuality: String,
    bedTimeConsistency: String
  },
  correlations: {
    workoutPerformance: Number, // -1 to 1 correlation
    recoveryRate: Number,
    moodImpact: Number
  },
  lastAnalyzed: Date,
  updatedAt: { type: Date, default: Date.now },
});

// App config schema for singleton configuration
const appConfigSchema = new mongoose.Schema({
  _id: { type: String, default: "singleton" },
  lastBackup: Date,
  version: String,
  patterns: mongoose.Schema.Types.Mixed, // Detected workout patterns
  consistency: mongoose.Schema.Types.Mixed, // Consistency metrics
  sleepPatterns: mongoose.Schema.Types.Mixed, // Detected sleep patterns
  healthReadinessConfig: {
    sleepWeight: { type: Number, default: 40 }, // Percentage
    durationWeight: { type: Number, default: 30 },
    workoutWeight: { type: Number, default: 20 },
    consistencyWeight: { type: Number, default: 10 }
  }
});

// Create models - check if already compiled to avoid OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", userSchema);
const Workout =
  mongoose.models.Workout || mongoose.model("Workout", workoutSchema);
const Exercise =
  mongoose.models.Exercise || mongoose.model("Exercise", exerciseSchema);
const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
const Memory = mongoose.models.Memory || mongoose.model("Memory", memorySchema);
const GeminiResponse =
  mongoose.models.GeminiResponse ||
  mongoose.model("GeminiResponse", geminiResponseSchema);
const Streak = mongoose.models.Streak || mongoose.model("Streak", streakSchema);
const AppConfig =
  mongoose.models.AppConfig || mongoose.model("AppConfig", appConfigSchema);

// Sleep-related models
const SleepSession = 
  mongoose.models.SleepSession || mongoose.model("SleepSession", sleepSessionSchema);
const SleepGoals =
  mongoose.models.SleepGoals || mongoose.model("SleepGoals", sleepGoalsSchema);
const SleepPatterns =
  mongoose.models.SleepPatterns || mongoose.model("SleepPatterns", sleepPatternsSchema);

export {
  User,
  Workout,
  Exercise,
  Message,
  Memory,
  GeminiResponse,
  Streak,
  AppConfig,
  SleepSession,
  SleepGoals,
  SleepPatterns,
};
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
    enum: ["preference", "goal", "pattern", "injury", "constraint", "insight"],
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

// App config schema for singleton configuration
const appConfigSchema = new mongoose.Schema({
  _id: { type: String, default: "singleton" },
  lastBackup: Date,
  version: String,
  patterns: mongoose.Schema.Types.Mixed, // Detected workout patterns
  consistency: mongoose.Schema.Types.Mixed, // Consistency metrics
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

export {
  User,
  Workout,
  Exercise,
  Message,
  Memory,
  GeminiResponse,
  Streak,
  AppConfig,
};
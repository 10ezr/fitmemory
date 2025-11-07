// Import TypeScript models
export { Workout, Exercise } from './Workout';
export { SleepSession } from './Sleep';

// Import remaining JS models (to be converted later)
import mongoose from 'mongoose';

// User model
const userSchema = new mongoose.Schema({
  _id: { type: String, default: 'local' },
  name: String,
  weightKg: Number,
  heightCm: Number,
  goals: String,
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);

// Message model for conversation history
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: { type: String, required: true },
  meta: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// Memory model
const memorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['preference', 'goal', 'pattern', 'injury', 'constraint', 'insight', 'sleep_pattern', 'sleep_goal'],
    required: true,
  },
  content: { type: String, required: true },
  meta: mongoose.Schema.Types.Mixed,
  embedding: [Number],
  createdAt: { type: Date, default: Date.now },
});

export const Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);

// Streak model
const streakSchema = new mongoose.Schema({
  _id: { type: String, default: 'local' },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastWorkoutDate: Date,
  streakHistory: [
    {
      date: Date,
      streak: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Streak = mongoose.models.Streak || mongoose.model('Streak', streakSchema);

// App config model
const appConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'singleton' },
  lastBackup: Date,
  version: String,
  patterns: mongoose.Schema.Types.Mixed,
  consistency: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

export const AppConfig = mongoose.models.AppConfig || mongoose.model('AppConfig', appConfigSchema);

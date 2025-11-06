import mongoose from "mongoose";

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

// Create models - check if already compiled to avoid OverwriteModelError
const SleepSession = mongoose.models.SleepSession || mongoose.model("SleepSession", sleepSessionSchema);
const SleepGoals = mongoose.models.SleepGoals || mongoose.model("SleepGoals", sleepGoalsSchema);
const SleepPatterns = mongoose.models.SleepPatterns || mongoose.model("SleepPatterns", sleepPatternsSchema);

export { SleepSession, SleepGoals, SleepPatterns };
export default SleepSession;
import mongoose, { Schema, Model } from 'mongoose';
import type { SleepSession } from '@/lib/types';

// Sleep session schema for detailed sleep tracking
const sleepSessionSchema = new Schema<SleepSession>({
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
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

// Add indexes for performance
sleepSessionSchema.index({ date: -1 });
sleepSessionSchema.index({ createdAt: -1 });
sleepSessionSchema.index({ sleepQuality: 1 });

// Create model - check if already compiled to avoid OverwriteModelError
const SleepSessionModel = (mongoose.models.SleepSession as Model<SleepSession>) || 
  mongoose.model<SleepSession>('SleepSession', sleepSessionSchema);

export { SleepSessionModel as SleepSession };
export default SleepSessionModel;

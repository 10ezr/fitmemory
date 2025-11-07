import mongoose, { Schema, Model } from 'mongoose';
import type { Workout, Exercise } from '@/lib/types';

// Exercise schema (embedded in workouts)
const exerciseSchema = new Schema<Exercise>({
  workoutId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  sets: Number,
  reps: Number,
  weightKg: Number,
  durationS: Number,
  rpe: Number, // Rate of Perceived Exertion
  notes: String,
});

// Workout schema
const workoutSchema = new Schema<Workout>({
  date: { type: Date, required: true },
  name: String,
  notes: String,
  exercises: [exerciseSchema],
  createdAt: { type: Date, default: Date.now },
});

// Add indexes for performance
workoutSchema.index({ date: -1 });
workoutSchema.index({ createdAt: -1 });

// Create models - check if already compiled to avoid OverwriteModelError
const WorkoutModel = (mongoose.models.Workout as Model<Workout>) || 
  mongoose.model<Workout>('Workout', workoutSchema);

const ExerciseModel = (mongoose.models.Exercise as Model<Exercise>) || 
  mongoose.model<Exercise>('Exercise', exerciseSchema);

export { WorkoutModel as Workout, ExerciseModel as Exercise };
export default WorkoutModel;

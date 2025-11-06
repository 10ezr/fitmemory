import mongoose from "mongoose";

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

// Create models - check if already compiled to avoid OverwriteModelError
const Workout = mongoose.models.Workout || mongoose.model("Workout", workoutSchema);
const Exercise = mongoose.models.Exercise || mongoose.model("Exercise", exerciseSchema);

export { Workout, Exercise };
export default Workout;
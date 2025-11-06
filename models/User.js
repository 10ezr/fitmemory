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

// Create model - check if already compiled to avoid OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
import mongoose from "mongoose";
import { User, AppConfig } from "@/models";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/fitmemory";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("Connected to MongoDB");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;

    // Initialize singleton documents
    await initializeSingletons();

    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

async function initializeSingletons() {
  try {
    // Ensure local user exists using upsert to avoid duplicate key errors
    const user = await User.findOneAndUpdate(
      { _id: "local" },
      { _id: "local" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log("Created local user profile");

    // Ensure app config exists using upsert
    const config = await AppConfig.findOneAndUpdate(
      { _id: "singleton" },
      {
        _id: "singleton",
        version: "1.0.0",
        patterns: {},
        consistency: {
          dailyStreak: 0,
          weeklyCounts: [0, 0, 0, 0],
          rollingAverage: 0,
          trend: "stable",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log("Created app config");
  } catch (error) {
    console.error("Error initializing singletons:", error);
    // Don't throw here to prevent connection issues
  }
}

export default connectDatabase;

import mongoose from "mongoose";
import { User, AppConfig } from "@/models";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not set. Configure it in Vercel Project Settings (Environment Variables) or .env.local for development."
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Recommended in newer Mongoose versions
    mongoose.set("strictQuery", true);

    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
    };

    // Basic retry loop to mitigate transient topology errors on cold starts
    const attemptConnect = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const conn = await mongoose.connect(MONGODB_URI, opts);
          console.log("Connected to MongoDB");
          return conn;
        } catch (err) {
          const last = i === retries - 1;
          console.error(
            `Mongo connection attempt ${i + 1} failed`,
            err?.message || err
          );
          if (last) throw err;
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
    };

    cached.promise = attemptConnect();
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

import mongoose from 'mongoose';
import { User, AppConfig } from '@/models';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI is not set. Configure it in Vercel Project Settings (Environment Variables) or .env.local for development.'
  );
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: CachedConnection | undefined;
}

let cached: CachedConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);

    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
    };

    // Basic retry loop to mitigate transient topology errors on cold starts
    const attemptConnect = async (retries = 3): Promise<typeof mongoose> => {
      for (let i = 0; i < retries; i++) {
        try {
          const conn = await mongoose.connect(MONGODB_URI, opts);
          console.log('✅ Connected to MongoDB');
          return conn;
        } catch (err) {
          const last = i === retries - 1;
          const error = err as Error;
          console.error(
            `⚠️  Mongo connection attempt ${i + 1} failed:`,
            error?.message || err
          );
          if (last) throw err;
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
      throw new Error('Failed to connect after retries');
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

async function initializeSingletons(): Promise<void> {
  try {
    // Ensure local user exists using upsert to avoid duplicate key errors
    await User.findOneAndUpdate(
      { _id: 'local' },
      { _id: 'local' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Ensure app config exists using upsert
    await AppConfig.findOneAndUpdate(
      { _id: 'singleton' },
      {
        _id: 'singleton',
        version: '1.0.0',
        patterns: {},
        consistency: {
          dailyStreak: 0,
          weeklyCounts: [0, 0, 0, 0],
          rollingAverage: 0,
          trend: 'stable',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    console.error('⚠️  Error initializing singletons:', error);
    // Don't throw here to prevent connection issues
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('🔌 Disconnected from MongoDB');
  }
}

export default connectDatabase;

#!/usr/bin/env node

/**
 * Database Connection Test
 * Tests if MongoDB is running and accessible
 */

const mongoose = require("mongoose");

async function testDatabaseConnection() {
  console.log("🗄️ Database Connection Test");
  console.log("============================");

  try {
    // Load environment variables from .env.local
    require("dotenv").config({ path: ".env.local" });

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not found in environment variables");
    }
    console.log("Connecting to:", MONGODB_URI);

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Database connected successfully");

    // Test a simple query
    const { Streak } = require("@/models/index.js");
    const streak = await Streak.findById("local");
    console.log("✅ Streak query successful:", {
      found: !!streak,
      currentStreak: streak?.currentStreak || 0,
    });

    await mongoose.disconnect();
    console.log("✅ Database disconnected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);

    if (error.message.includes("IP that isn't whitelisted")) {
      console.log("\n🔧 MongoDB Atlas IP Whitelist Issue:");
      console.log("1. Go to: https://cloud.mongodb.com/");
      console.log("2. Select your project and cluster");
      console.log("3. Go to 'Network Access' in the left sidebar");
      console.log("4. Click 'Add IP Address'");
      console.log("5. Choose 'Allow access from anywhere' (0.0.0.0/0)");
      console.log("6. Click 'Confirm'");
      console.log("7. Wait 1-2 minutes for changes to take effect");
    } else {
      console.log("\nPossible solutions:");
      console.log("1. Check your MongoDB Atlas connection string");
      console.log("2. Verify your username and password");
      console.log("3. Make sure your cluster is running");
    }
  }
}

// Run the test
testDatabaseConnection();

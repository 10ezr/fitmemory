#!/usr/bin/env node

/**
 * Simple Streak Test Script
 * Quick test to verify streak functionality
 */

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000";

async function testStreak() {
  console.log("🧪 Testing Streak Functionality");
  console.log("===============================");

  try {
    // 1. Get initial streak status
    console.log("\n1️⃣ Getting initial streak status...");
    const initialStreak = await fetch(`${BASE_URL}/api/streak-status`);
    const initialData = await initialStreak.json();
    console.log("Initial streak:", initialData.currentStreak);

    // 2. Test workout completion
    console.log("\n2️⃣ Testing workout completion...");
    const workoutResponse = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I completed my workout today" }),
    });

    const workoutData = await workoutResponse.json();
    console.log("Workout response:", {
      success: workoutResponse.ok,
      streakUpdate: workoutData.streakUpdate,
      workoutLogged: workoutData.workoutLogged,
    });

    // 3. Check streak after workout
    console.log("\n3️⃣ Checking streak after workout...");
    const finalStreak = await fetch(`${BASE_URL}/api/streak-status`);
    const finalData = await finalStreak.json();
    console.log("Final streak:", finalData.currentStreak);

    // 4. Analysis
    console.log("\n📊 Analysis:");
    console.log("Initial streak:", initialData.currentStreak);
    console.log("Final streak:", finalData.currentStreak);
    console.log(
      "Streak changed:",
      initialData.currentStreak !== finalData.currentStreak
    );
    console.log("Streak update received:", !!workoutData.streakUpdate);

    if (initialData.currentStreak !== finalData.currentStreak) {
      console.log("✅ Streak was updated successfully!");
    } else {
      console.log("❌ Streak was NOT updated");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testStreak();

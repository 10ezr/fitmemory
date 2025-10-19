#!/usr/bin/env node

/**
 * Fresh Streak Test Script
 * Tests streak functionality with a fresh start
 */

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000";

async function resetStreak() {
  console.log("🔄 Resetting streak for fresh test...");

  try {
    // Reset streak by setting it to 0
    const response = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Reset my streak to 0" }),
    });

    const data = await response.json();
    console.log("Reset response:", data.reply);

    // Wait a moment for the reset to process
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.log(
      "Note: Could not reset streak via API, continuing with test..."
    );
  }
}

async function testFreshStreak() {
  console.log("🧪 Testing Fresh Streak Functionality");
  console.log("=====================================");

  try {
    // 1. Reset streak first
    await resetStreak();

    // 2. Get initial streak status
    console.log("\n1️⃣ Getting initial streak status...");
    const initialStreak = await fetch(`${BASE_URL}/api/streak-status`);
    const initialData = await initialStreak.json();
    console.log("Initial streak:", initialData.currentStreak);
    console.log("Last workout date:", initialData.lastWorkoutDate);

    // 3. Test workout completion
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
      reply: workoutData.reply.substring(0, 100) + "...",
    });

    // 4. Check streak after workout
    console.log("\n3️⃣ Checking streak after workout...");
    const finalStreak = await fetch(`${BASE_URL}/api/streak-status`);
    const finalData = await finalStreak.json();
    console.log("Final streak:", finalData.currentStreak);
    console.log("Last workout date:", finalData.lastWorkoutDate);

    // 5. Analysis
    console.log("\n📊 Analysis:");
    console.log("Initial streak:", initialData.currentStreak);
    console.log("Final streak:", finalData.currentStreak);
    console.log(
      "Streak changed:",
      initialData.currentStreak !== finalData.currentStreak
    );
    console.log("Streak update received:", !!workoutData.streakUpdate);
    console.log(
      "Date changed:",
      initialData.lastWorkoutDate !== finalData.lastWorkoutDate
    );

    if (initialData.currentStreak !== finalData.currentStreak) {
      console.log("✅ Streak was updated successfully!");
    } else {
      console.log("❌ Streak was NOT updated");
      console.log("This might be because:");
      console.log("- You already worked out today");
      console.log("- The workout detection logic needs adjustment");
      console.log("- There's an issue with the streak increment logic");
    }

    // 6. Test duplicate prevention
    console.log("\n4️⃣ Testing duplicate prevention...");
    const duplicateResponse = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I completed another workout today" }),
    });

    const duplicateData = await duplicateResponse.json();
    console.log("Duplicate test:", {
      streakUpdate: duplicateData.streakUpdate,
      message: "Should be null (no duplicate increment)",
    });

    if (!duplicateData.streakUpdate) {
      console.log("✅ Duplicate prevention working correctly!");
    } else {
      console.log("❌ Duplicate prevention not working!");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testFreshStreak();

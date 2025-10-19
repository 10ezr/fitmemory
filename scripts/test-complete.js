#!/usr/bin/env node

/**
 * Complete System Test
 * Tests the entire system including database, AI responses, and streak functionality
 */

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000";

async function testCompleteSystem() {
  console.log("🚀 Complete System Test");
  console.log("======================");

  try {
    // 1. Test database connection
    console.log("\n1️⃣ Testing database connection...");
    const statsResponse = await fetch(`${BASE_URL}/api/stats`);
    const statsData = await statsResponse.json();

    if (statsResponse.ok) {
      console.log("✅ Database connected");
      console.log("Stats:", {
        dailyStreak: statsData.dailyStreak,
        longestStreak: statsData.longestStreak,
        lastWorkoutDate: statsData.lastWorkoutDate,
      });
    } else {
      console.log("❌ Database connection failed");
      console.log("Error:", statsData.error);
    }

    // 2. Test AI response formatting
    console.log("\n2️⃣ Testing AI response formatting...");
    const aiResponse = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Hello, I'm ready to start my fitness journey!",
      }),
    });

    const aiData = await aiResponse.json();
    console.log("AI Response:", {
      success: aiResponse.ok,
      reply: aiData.reply?.substring(0, 100) + "...",
      hasJson: aiData.reply?.includes('{"'),
      actions: aiData.actions?.length || 0,
    });

    if (aiData.reply && !aiData.reply.includes('{"')) {
      console.log("✅ AI response is clean (no JSON)");
    } else {
      console.log("❌ AI response contains JSON");
    }

    // 3. Test streak functionality
    console.log("\n3️⃣ Testing streak functionality...");
    const streakResponse = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I completed my workout today" }),
    });

    const streakData = await streakResponse.json();
    console.log("Streak Test:", {
      success: streakResponse.ok,
      streakUpdate: streakData.streakUpdate,
      workoutLogged: streakData.workoutLogged,
      reply: streakData.reply?.substring(0, 100) + "...",
    });

    // 4. Test final state
    console.log("\n4️⃣ Checking final state...");
    const finalStatsResponse = await fetch(`${BASE_URL}/api/stats`);
    const finalStatsData = await finalStatsResponse.json();

    console.log("Final Stats:", {
      dailyStreak: finalStatsData.dailyStreak,
      longestStreak: finalStatsData.longestStreak,
      lastWorkoutDate: finalStatsData.lastWorkoutDate,
    });

    // 5. Summary
    console.log("\n📊 Test Summary:");
    console.log("================");

    const tests = [
      { name: "Database Connection", passed: statsResponse.ok },
      {
        name: "AI Response Clean",
        passed: aiData.reply && !aiData.reply.includes('{"'),
      },
      { name: "Streak Functionality", passed: !!streakData.streakUpdate },
      { name: "API Endpoints", passed: streakResponse.ok && aiResponse.ok },
    ];

    tests.forEach((test) => {
      console.log(`${test.passed ? "✅" : "❌"} ${test.name}`);
    });

    const passedTests = tests.filter((t) => t.passed).length;
    console.log(`\nOverall: ${passedTests}/${tests.length} tests passed`);

    if (passedTests === tests.length) {
      console.log("🎉 All systems working perfectly!");
    } else {
      console.log("⚠️ Some issues detected. Check the logs above.");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testCompleteSystem();

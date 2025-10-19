#!/usr/bin/env node

/**
 * Simple API Test
 * Tests basic API functionality without complex dependencies
 */

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000";

async function testSimpleAPI() {
  console.log("🔧 Simple API Test");
  console.log("=================");

  try {
    // Test stats API (should work)
    console.log("\n1️⃣ Testing stats API...");
    const statsResponse = await fetch(`${BASE_URL}/api/stats`);
    const statsData = await statsResponse.json();
    console.log("Stats API:", {
      status: statsResponse.status,
      ok: statsResponse.ok,
      dailyStreak: statsData.dailyStreak,
    });

    // Test streak status API (should work)
    console.log("\n2️⃣ Testing streak status API...");
    const streakResponse = await fetch(`${BASE_URL}/api/streak-status`);
    const streakData = await streakResponse.json();
    console.log("Streak API:", {
      status: streakResponse.status,
      ok: streakResponse.ok,
      currentStreak: streakData.currentStreak,
    });

    // Test a very simple converse message
    console.log("\n3️⃣ Testing simple converse...");
    const converseResponse = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });

    const converseData = await converseResponse.json();
    console.log("Converse API:", {
      status: converseResponse.status,
      ok: converseResponse.ok,
      reply: converseData.reply,
      hasError: !!converseData.error,
    });

    // Check if we're getting the offline response
    if (
      converseData.reply &&
      converseData.reply.includes("not connected to the database")
    ) {
      console.log("❌ System is running in offline mode");
      console.log("This means there's an error in the conversation processing");
    } else {
      console.log("✅ System is working normally");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testSimpleAPI();

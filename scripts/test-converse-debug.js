#!/usr/bin/env node

/**
 * Debug Converse API
 * Tests the converse API to see what errors are occurring
 */

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000";

async function testConverseDebug() {
  console.log("🔍 Debugging Converse API");
  console.log("=========================");

  try {
    console.log("\n1️⃣ Testing simple message...");
    const response = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello" }),
    });

    const data = await response.json();
    console.log("Response:", {
      status: response.status,
      ok: response.ok,
      reply: data.reply,
      error: data.error,
    });

    if (!response.ok) {
      console.log("❌ API Error:", data.error);
    } else if (
      data.reply &&
      data.reply.includes("not connected to the database")
    ) {
      console.log(
        "⚠️ Running in offline mode - this suggests an error occurred"
      );
    } else {
      console.log("✅ API working normally");
    }

    // Test with a workout message
    console.log("\n2️⃣ Testing workout message...");
    const workoutResponse = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I completed my workout today" }),
    });

    const workoutData = await workoutResponse.json();
    console.log("Workout Response:", {
      status: workoutResponse.status,
      ok: workoutResponse.ok,
      reply: workoutData.reply,
      streakUpdate: workoutData.streakUpdate,
      error: workoutData.error,
    });
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testConverseDebug();

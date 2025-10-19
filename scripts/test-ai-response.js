#!/usr/bin/env node

/**
 * Test AI Response Formatting
 * Tests if the AI is responding with clean text instead of JSON
 */

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000";

async function testAIResponse() {
  console.log("🤖 Testing AI Response Formatting");
  console.log("==================================");

  try {
    // Test a simple conversation
    console.log("\n1️⃣ Testing simple conversation...");
    const response = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Hello, how are you?" }),
    });

    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", {
      reply: data.reply,
      actions: data.actions,
      hasJsonInReply: data.reply && data.reply.includes('{"'),
    });

    // Test workout completion
    console.log("\n2️⃣ Testing workout completion...");
    const workoutResponse = await fetch(`${BASE_URL}/api/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "I completed my workout today" }),
    });

    const workoutData = await workoutResponse.json();
    console.log("Workout response:", {
      reply: workoutData.reply,
      actions: workoutData.actions,
      hasJsonInReply: workoutData.reply && workoutData.reply.includes('{"'),
      streakUpdate: workoutData.streakUpdate,
    });

    // Analysis
    console.log("\n📊 Analysis:");
    if (data.reply && !data.reply.includes('{"')) {
      console.log("✅ AI response is clean (no JSON)");
    } else {
      console.log("❌ AI response contains JSON");
      console.log("Raw reply:", data.reply);
    }

    if (workoutData.reply && !workoutData.reply.includes('{"')) {
      console.log("✅ Workout response is clean (no JSON)");
    } else {
      console.log("❌ Workout response contains JSON");
      console.log("Raw reply:", workoutData.reply);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testAIResponse();

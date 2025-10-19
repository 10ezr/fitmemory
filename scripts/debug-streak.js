#!/usr/bin/env node

/**
 * Streak Debug Script
 * Debugs and tests streak functionality specifically
 */

const fetch = require("node-fetch");

class StreakDebugger {
  constructor() {
    this.baseUrl = "http://localhost:3000";
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix =
      type === "error"
        ? "❌"
        : type === "success"
        ? "✅"
        : type === "warning"
        ? "⚠️"
        : "ℹ️";
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testStreakAPI() {
    this.log("🔍 Testing streak API endpoints...");

    try {
      // Test streak status endpoint
      const streakResponse = await fetch(`${this.baseUrl}/api/streak-status`);
      const streakData = await streakResponse.json();

      this.log("📊 Current streak status:", "info");
      console.log(JSON.stringify(streakData, null, 2));

      // Test stats endpoint
      const statsResponse = await fetch(`${this.baseUrl}/api/stats`);
      const statsData = await statsResponse.json();

      this.log("📊 Current stats:", "info");
      console.log(JSON.stringify(statsData, null, 2));

      return { streakData, statsData };
    } catch (error) {
      this.log(`❌ Error testing API: ${error.message}`, "error");
      throw error;
    }
  }

  async testWorkoutCompletion() {
    this.log("🧪 Testing workout completion detection...");

    const testMessages = [
      "I completed my workout today",
      "Workout is done",
      "Finished my training session",
      "Just finished exercising",
      "Training complete",
      "Workout done for today",
    ];

    const results = [];

    for (const message of testMessages) {
      this.log(`Testing: "${message}"`);

      try {
        const response = await fetch(`${this.baseUrl}/api/converse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        const data = await response.json();

        this.log(
          `Response: ${response.status}`,
          response.ok ? "success" : "error"
        );
        console.log("Streak update:", data.streakUpdate);
        console.log("Workout logged:", data.workoutLogged);
        console.log("Streak status:", data.streakStatus);

        results.push({
          message,
          success: response.ok,
          streakUpdate: data.streakUpdate,
          workoutLogged: data.workoutLogged,
          streakStatus: data.streakStatus,
        });

        // Wait between requests
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        this.log(`❌ Error testing message: ${error.message}`, "error");
        results.push({
          message,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  async checkStreakAfterWorkout() {
    this.log("🔍 Checking streak after workout completion...");

    try {
      const [streakResponse, statsResponse] = await Promise.all([
        fetch(`${this.baseUrl}/api/streak-status`),
        fetch(`${this.baseUrl}/api/stats`),
      ]);

      const streakData = await streakResponse.json();
      const statsData = await statsResponse.json();

      this.log("📊 Streak after workout:", "info");
      console.log("Streak Status:", JSON.stringify(streakData, null, 2));
      console.log("Stats:", JSON.stringify(statsData, null, 2));

      return { streakData, statsData };
    } catch (error) {
      this.log(`❌ Error checking streak: ${error.message}`, "error");
      throw error;
    }
  }

  async debugStreakUpdate() {
    this.log("🔧 Debugging streak update process...");

    // Get initial state
    this.log("📊 Getting initial state...");
    const initialState = await this.testStreakAPI();

    // Test workout completion
    this.log("🧪 Testing workout completion...");
    const completionResults = await this.testWorkoutCompletion();

    // Check final state
    this.log("📊 Checking final state...");
    const finalState = await this.checkStreakAfterWorkout();

    // Analyze results
    this.log("📈 Analysis:");
    console.log("Initial streak:", initialState.streakData.currentStreak);
    console.log("Final streak:", finalState.streakData.currentStreak);
    console.log(
      "Streak changed:",
      initialState.streakData.currentStreak !==
        finalState.streakData.currentStreak
    );

    const successfulCompletions = completionResults.filter(
      (r) => r.streakUpdate
    );
    console.log("Successful completions:", successfulCompletions.length);

    return {
      initialState,
      completionResults,
      finalState,
      analysis: {
        streakChanged:
          initialState.streakData.currentStreak !==
          finalState.streakData.currentStreak,
        successfulCompletions: successfulCompletions.length,
      },
    };
  }

  async runDebug() {
    this.log("🚀 Starting Streak Debug Session");
    this.log("=================================");

    try {
      const results = await this.debugStreakUpdate();

      this.log("\n📊 Debug Results Summary:");
      this.log("========================");

      if (results.analysis.streakChanged) {
        this.log("✅ Streak was updated successfully!", "success");
      } else {
        this.log("❌ Streak was NOT updated", "error");
      }

      this.log(
        `📈 Successful workout completions: ${results.analysis.successfulCompletions}`
      );

      // Save results
      const fs = require("fs");
      fs.writeFileSync("debug-results.json", JSON.stringify(results, null, 2));
      this.log("💾 Debug results saved to debug-results.json", "success");
    } catch (error) {
      this.log(`❌ Debug session failed: ${error.message}`, "error");
      throw error;
    }
  }
}

// Run the debug session
const streakDebugger = new StreakDebugger();

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down debug session...");
  process.exit(0);
});

// Run debug
streakDebugger.runDebug().catch((error) => {
  console.error("Debug session failed:", error);
  process.exit(1);
});

/**
 * Advanced Streak Tracking Service
 * Handles real-time streak updates, downgrades, and analytics integration
 */

import { Streak } from "@/@/models/index.js";

class StreakTrackerService {
  constructor() {
    this.streakHistory = [];
    this.updateCallbacks = [];
    this.isInitialized = false;
  }

  // Initialize the streak tracker
  async initialize() {
    if (this.isInitialized) return;

    console.log("Initializing StreakTracker service...");

    // Load current streak data
    await this.loadStreakData();

    // Set up periodic checks
    this.startPeriodicChecks();

    this.isInitialized = true;
    console.log("StreakTracker service initialized");
  }

  // Load current streak data
  async loadStreakData() {
    try {
      const response = await fetch("/api/streak-status");
      if (response.ok) {
        const data = await response.json();
        this.streakHistory = data.streakHistory || [];
        this.notifyUpdate("loaded", data);
      }
    } catch (error) {
      console.error("Error loading streak data:", error);
    }
  }

  // Subscribe to streak updates
  subscribe(callback) {
    this.updateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  // Notify all subscribers of streak updates
  notifyUpdate(type, data) {
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(type, data);
      } catch (error) {
        console.error("Error in streak update callback:", error);
      }
    });
  }

  // Check and update streak status
  async checkStreakStatus() {
    try {
      const response = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "check streak status" }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.streakStatus) {
          await this.handleStreakStatus(data.streakStatus);
        }

        if (data.streakUpdate) {
          await this.handleStreakUpdate(data.streakUpdate);
        }
      }
    } catch (error) {
      console.error("Error checking streak status:", error);
    }
  }

  // Handle streak status changes (missed workouts, resets, etc.)
  async handleStreakStatus(status) {
    console.log("Handling streak status:", status);

    if (status.streakReset) {
      await this.handleStreakReset(status);
    } else if (status.streakMaintained) {
      await this.handleStreakMaintained(status);
    }

    // Notify all components
    this.notifyUpdate("statusChanged", status);

    // Broadcast to other components
    window.dispatchEvent(
      new CustomEvent("streakChanged", {
        detail: { type: "status", data: status },
      })
    );
  }

  // Handle streak updates (increments)
  async handleStreakUpdate(update) {
    console.log("Handling streak update:", update);

    // Update local cache
    this.streakHistory.push({
      date: new Date(),
      streak: update.currentStreak,
      type: "increment",
      isNewRecord: update.isNewRecord,
    });

    // Notify all components
    this.notifyUpdate("streakIncremented", update);

    // Broadcast to other components
    window.dispatchEvent(
      new CustomEvent("streakChanged", {
        detail: { type: "increment", data: update },
      })
    );

    // Trigger analytics update
    await this.updateAnalytics();
  }

  // Handle streak reset
  async handleStreakReset(status) {
    console.log("Streak reset:", status);

    // Add to history
    this.streakHistory.push({
      date: new Date(),
      streak: 0,
      type: "reset",
      reason: status.reason,
      daysMissed: status.daysMissed,
    });

    // Notify all components
    this.notifyUpdate("streakReset", status);

    // Broadcast to other components
    window.dispatchEvent(
      new CustomEvent("streakChanged", {
        detail: { type: "reset", data: status },
      })
    );

    // Trigger analytics update
    await this.updateAnalytics();
  }

  // Handle streak maintained (warning)
  async handleStreakMaintained(status) {
    console.log("Streak maintained with warning:", status);

    // Notify all components
    this.notifyUpdate("streakWarning", status);

    // Broadcast to other components
    window.dispatchEvent(
      new CustomEvent("streakChanged", {
        detail: { type: "warning", data: status },
      })
    );
  }

  // Update analytics when streak changes
  async updateAnalytics() {
    try {
      // Trigger analytics recalculation
      const response = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recalculate",
          trigger: "streak_change",
        }),
      });

      if (response.ok) {
        const analytics = await response.json();

        // Notify components of analytics update
        window.dispatchEvent(
          new CustomEvent("analyticsUpdated", {
            detail: analytics,
          })
        );
      }
    } catch (error) {
      console.error("Error updating analytics:", error);
    }
  }

  // Start periodic checks
  startPeriodicChecks() {
    // Check every 5 minutes
    setInterval(async () => {
      await this.checkStreakStatus();
    }, 300000);

    // Check at midnight for daily reset
    this.scheduleMidnightCheck();
  }

  // Schedule midnight check for daily streak validation
  scheduleMidnightCheck() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const timeUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(async () => {
      await this.checkStreakStatus();

      // Schedule next midnight check
      this.scheduleMidnightCheck();
    }, timeUntilMidnight);
  }

  // Get streak statistics
  getStreakStats() {
    const currentStreak =
      this.streakHistory[this.streakHistory.length - 1]?.streak || 0;
    const longestStreak = Math.max(
      ...this.streakHistory.map((h) => h.streak),
      0
    );
    const totalIncrements = this.streakHistory.filter(
      (h) => h.type === "increment"
    ).length;
    const totalResets = this.streakHistory.filter(
      (h) => h.type === "reset"
    ).length;

    return {
      currentStreak,
      longestStreak,
      totalIncrements,
      totalResets,
      history: this.streakHistory,
    };
  }

  // Get streak trend
  getStreakTrend(days = 7) {
    const recentHistory = this.streakHistory.slice(-days);
    if (recentHistory.length < 2) return "stable";

    const first = recentHistory[0].streak;
    const last = recentHistory[recentHistory.length - 1].streak;

    if (last > first) return "improving";
    if (last < first) return "declining";
    return "stable";
  }

  // Force streak check (for testing or manual triggers)
  async forceStreakCheck() {
    console.log("Forcing streak check...");
    await this.checkStreakStatus();
  }

  // Cleanup
  destroy() {
    this.updateCallbacks = [];
    this.streakHistory = [];
    this.isInitialized = false;
  }
}

// Create singleton instance
const streakTracker = new StreakTrackerService();

export default streakTracker;

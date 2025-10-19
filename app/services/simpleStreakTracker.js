/**
 * Simple Streak Tracking Service
 * Lightweight streak tracking without complex state management
 */

class SimpleStreakTracker {
  constructor() {
    this.isInitialized = false;
    this.updateCallbacks = [];
  }

  // Initialize the streak tracker
  async initialize() {
    if (this.isInitialized) return;

    console.log("Initializing SimpleStreakTracker...");

    // Set up periodic checks
    this.startPeriodicChecks();

    this.isInitialized = true;
    console.log("SimpleStreakTracker initialized");
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

  // Check streak status periodically
  startPeriodicChecks() {
    // Check every 5 minutes
    setInterval(async () => {
      await this.checkStreakStatus();
    }, 300000);
  }

  // Check streak status
  async checkStreakStatus() {
    try {
      const response = await fetch("/api/streak-status");
      if (response.ok) {
        const data = await response.json();
        this.notifyUpdate("statusCheck", data);
      }
    } catch (error) {
      console.error("Error checking streak status:", error);
    }
  }

  // Handle streak update from chat
  handleStreakUpdate(updateData) {
    console.log("Handling streak update:", updateData);
    this.notifyUpdate("streakIncremented", updateData);
  }

  // Handle streak reset
  handleStreakReset(resetData) {
    console.log("Handling streak reset:", resetData);
    this.notifyUpdate("streakReset", resetData);
  }

  // Cleanup
  destroy() {
    this.updateCallbacks = [];
    this.isInitialized = false;
  }
}

// Create singleton instance
const simpleStreakTracker = new SimpleStreakTracker();

export default simpleStreakTracker;

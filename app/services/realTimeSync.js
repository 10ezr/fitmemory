/**
 * Real-time data synchronization service
 * Manages data flow between all components and ensures consistency
 */

class RealTimeSyncService {
  constructor() {
    this.subscribers = new Map();
    this.cache = new Map();
    this.lastUpdate = new Map();
    this.isInitialized = false;
  }

  // Initialize the sync service
  async initialize() {
    if (this.isInitialized) return;

    console.log("Initializing RealTimeSync service...");

    // Set up periodic data refresh
    this.startPeriodicSync();

    // Set up event listeners for data changes
    this.setupEventListeners();

    this.isInitialized = true;
    console.log("RealTimeSync service initialized");
  }

  // Subscribe to data changes
  subscribe(dataType, callback, component = "unknown") {
    if (!this.subscribers.has(dataType)) {
      this.subscribers.set(dataType, new Set());
    }

    const subscription = { callback, component, id: Date.now() };
    this.subscribers.get(dataType).add(subscription);

    console.log(`Component ${component} subscribed to ${dataType}`);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(dataType);
      if (subscribers) {
        subscribers.delete(subscription);
        if (subscribers.size === 0) {
          this.subscribers.delete(dataType);
        }
      }
    };
  }

  // Notify all subscribers of data changes
  notify(dataType, data, source = "unknown") {
    console.log(`Notifying ${dataType} change from ${source}`);

    const subscribers = this.subscribers.get(dataType);
    if (subscribers) {
      subscribers.forEach((subscription) => {
        try {
          subscription.callback(data, source);
        } catch (error) {
          console.error(`Error in ${subscription.component} callback:`, error);
        }
      });
    }

    // Update cache
    this.cache.set(dataType, data);
    this.lastUpdate.set(dataType, Date.now());
  }

  // Get cached data
  getCachedData(dataType) {
    return this.cache.get(dataType);
  }

  // Check if data is stale
  isDataStale(dataType, maxAge = 30000) {
    // 30 seconds default
    const lastUpdate = this.lastUpdate.get(dataType);
    if (!lastUpdate) return true;

    return Date.now() - lastUpdate > maxAge;
  }

  // Force refresh of specific data type
  async refreshData(dataType, force = false) {
    if (!force && !this.isDataStale(dataType)) {
      return this.getCachedData(dataType);
    }

    try {
      let data;

      switch (dataType) {
        case "stats":
          data = await this.fetchStats();
          break;
        case "streak":
          data = await this.fetchStreak();
          break;
        case "workouts":
          data = await this.fetchRecentWorkouts();
          break;
        case "messages":
          data = await this.fetchRecentMessages();
          break;
        case "analytics":
          data = await this.fetchAnalytics();
          break;
        default:
          console.warn(`Unknown data type: ${dataType}`);
          return null;
      }

      this.notify(dataType, data, "refresh");
      return data;
    } catch (error) {
      console.error(`Error refreshing ${dataType}:`, error);
      return null;
    }
  }

  // Fetch methods for different data types
  async fetchStats() {
    const response = await fetch("/api/stats");
    if (!response.ok) throw new Error("Failed to fetch stats");
    return await response.json();
  }

  async fetchStreak() {
    const response = await fetch("/api/streak-status");
    if (!response.ok) throw new Error("Failed to fetch streak");
    return await response.json();
  }

  async fetchRecentWorkouts() {
    const response = await fetch("/api/workouts?limit=10");
    if (!response.ok) throw new Error("Failed to fetch workouts");
    return await response.json();
  }

  async fetchRecentMessages() {
    const response = await fetch("/api/messages?limit=20");
    if (!response.ok) throw new Error("Failed to fetch messages");
    return await response.json();
  }

  async fetchAnalytics() {
    const response = await fetch("/api/analytics");
    if (!response.ok) throw new Error("Failed to fetch analytics");
    return await response.json();
  }

  // Set up periodic synchronization
  startPeriodicSync() {
    // Sync every 30 seconds
    setInterval(async () => {
      await this.syncAllData();
    }, 30000);

    // Check streak status every 5 minutes
    setInterval(async () => {
      await this.checkStreakStatus();
    }, 300000);
  }

  // Sync all data types
  async syncAllData() {
    const dataTypes = ["stats", "streak", "workouts", "messages"];

    for (const dataType of dataTypes) {
      if (this.isDataStale(dataType)) {
        await this.refreshData(dataType);
      }
    }
  }

  // Check streak status and notify if needed
  async checkStreakStatus() {
    try {
      const streak = await this.fetchStreak();
      if (streak) {
        this.notify("streak", streak, "periodic-check");
      }
    } catch (error) {
      console.error("Error checking streak status:", error);
    }
  }

  // Set up event listeners for real-time updates
  setupEventListeners() {
    // Listen for custom events from components
    window.addEventListener("dataChanged", (event) => {
      const { dataType, data, source } = event.detail;
      this.notify(dataType, data, source);
    });

    // Listen for workout completion
    window.addEventListener("workoutCompleted", (event) => {
      this.handleWorkoutCompletion(event.detail);
    });

    // Listen for streak changes
    window.addEventListener("streakChanged", (event) => {
      this.handleStreakChange(event.detail);
    });
  }

  // Handle workout completion
  async handleWorkoutCompletion(workoutData) {
    console.log("Workout completed, refreshing data...");

    // Refresh all related data
    await Promise.all([
      this.refreshData("stats", true),
      this.refreshData("streak", true),
      this.refreshData("workouts", true),
      this.refreshData("analytics", true),
    ]);

    // Notify all components
    this.notify("workoutCompleted", workoutData, "workout-completion");
  }

  // Handle streak changes
  async handleStreakChange(streakData) {
    console.log("Streak changed, refreshing data...");

    // Refresh streak-related data
    await Promise.all([
      this.refreshData("stats", true),
      this.refreshData("streak", true),
      this.refreshData("analytics", true),
    ]);

    // Notify all components
    this.notify("streakChanged", streakData, "streak-change");
  }

  // Broadcast data change to all components
  broadcastDataChange(dataType, data, source) {
    window.dispatchEvent(
      new CustomEvent("dataChanged", {
        detail: { dataType, data, source },
      })
    );
  }

  // Get comprehensive app state
  async getAppState() {
    const [stats, streak, workouts, messages, analytics] = await Promise.all([
      this.fetchStats(),
      this.fetchStreak(),
      this.fetchRecentWorkouts(),
      this.fetchRecentMessages(),
      this.fetchAnalytics(),
    ]);

    return {
      stats,
      streak,
      workouts,
      messages,
      analytics,
      lastSync: Date.now(),
    };
  }

  // Cleanup
  destroy() {
    this.subscribers.clear();
    this.cache.clear();
    this.lastUpdate.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const realTimeSync = new RealTimeSyncService();

export default realTimeSync;

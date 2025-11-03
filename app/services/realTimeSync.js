/**
 * Real-time data synchronization service
 * Now supports sleep and health readiness data streams
 */

class RealTimeSyncService {
  constructor() {
    this.subscribers = new Map();
    this.cache = new Map();
    this.lastUpdate = new Map();
    this.isInitialized = false;
    this.initPromise = null; // FIX: Prevent multiple concurrent initializations
  }

  // Initialize the sync service
  async initialize() {
    // FIX: Prevent duplicate initialization
    if (this.isInitialized) {
      console.log("RealTimeSync already initialized, skipping...");
      return;
    }

    // FIX: If initialization is in progress, wait for it
    if (this.initPromise) {
      console.log("RealTimeSync initialization in progress, waiting...");
      return await this.initPromise;
    }

    // FIX: Create initialization promise to prevent concurrent calls
    this.initPromise = this._performInitialization();
    return await this.initPromise;
  }

  async _performInitialization() {
    try {
      console.log("Initializing RealTimeSync service with sleep support...");

      // Set up periodic data refresh
      this.startPeriodicSync();

      // Set up event listeners for data changes
      this.setupEventListeners();

      this.isInitialized = true;
      console.log("RealTimeSync service initialized successfully");
    } catch (error) {
      console.error("RealTimeSync initialization failed:", error);
      this.isInitialized = false;
      throw error;
    } finally {
      this.initPromise = null;
    }
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
        console.log(`Component ${component} unsubscribed from ${dataType}`);
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
        case "sleep":
          data = await this.fetchSleepData();
          break;
        case "readiness":
          data = await this.fetchReadiness();
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

  // NEW: Sleep data fetching
  async fetchSleepData() {
    const response = await fetch("/api/sleep?days=7");
    if (!response.ok) throw new Error("Failed to fetch sleep data");
    return await response.json();
  }

  // NEW: Health readiness fetching
  async fetchReadiness() {
    const response = await fetch("/api/readiness");
    if (!response.ok) throw new Error("Failed to fetch readiness");
    return await response.json();
  }

  // Set up periodic synchronization
  startPeriodicSync() {
    // FIX: Clear any existing intervals before creating new ones
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.streakInterval) clearInterval(this.streakInterval);
    if (this.sleepInterval) clearInterval(this.sleepInterval);

    // Sync every 30 seconds
    this.syncInterval = setInterval(async () => {
      await this.syncAllData();
    }, 30000);

    // Check streak status every 5 minutes
    this.streakInterval = setInterval(async () => {
      await this.checkStreakStatus();
    }, 300000);

    // NEW: Check sleep readiness every 10 minutes
    this.sleepInterval = setInterval(async () => {
      await this.checkSleepReadiness();
    }, 600000);

    console.log("Periodic sync intervals started");
  }

  // Sync all data types
  async syncAllData() {
    const dataTypes = ["stats", "streak", "workouts", "messages", "sleep", "readiness"];

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

  // NEW: Check sleep readiness and notify
  async checkSleepReadiness() {
    try {
      const readiness = await this.fetchReadiness();
      if (readiness) {
        this.notify("readiness", readiness, "periodic-check");
        
        // Also refresh sleep data
        const sleepData = await this.fetchSleepData();
        if (sleepData) {
          this.notify("sleep", sleepData, "periodic-check");
        }
      }
    } catch (error) {
      console.error("Error checking sleep readiness:", error);
    }
  }

  // Set up event listeners for real-time updates
  setupEventListeners() {
    // FIX: Remove existing listeners before adding new ones
    if (this.dataChangedHandler) {
      window.removeEventListener("dataChanged", this.dataChangedHandler);
    }
    if (this.workoutCompletedHandler) {
      window.removeEventListener("workoutCompleted", this.workoutCompletedHandler);
    }
    if (this.streakChangedHandler) {
      window.removeEventListener("streakChanged", this.streakChangedHandler);
    }
    if (this.sleepLoggedHandler) {
      window.removeEventListener("sleepLogged", this.sleepLoggedHandler);
    }

    // Listen for custom events from components
    this.dataChangedHandler = (event) => {
      const { dataType, data, source } = event.detail;
      this.notify(dataType, data, source);
    };
    window.addEventListener("dataChanged", this.dataChangedHandler);

    // Listen for workout completion
    this.workoutCompletedHandler = (event) => {
      this.handleWorkoutCompletion(event.detail);
    };
    window.addEventListener("workoutCompleted", this.workoutCompletedHandler);

    // Listen for streak changes
    this.streakChangedHandler = (event) => {
      this.handleStreakChange(event.detail);
    };
    window.addEventListener("streakChanged", this.streakChangedHandler);

    // NEW: Listen for sleep logging
    this.sleepLoggedHandler = (event) => {
      this.handleSleepLogged(event.detail);
    };
    window.addEventListener("sleepLogged", this.sleepLoggedHandler);

    console.log("Event listeners set up");
  }

  // Handle workout completion
  async handleWorkoutCompletion(workoutData) {
    console.log("Workout completed, refreshing data...");

    // Refresh all related data including readiness
    await Promise.all([
      this.refreshData("stats", true),
      this.refreshData("streak", true),
      this.refreshData("workouts", true),
      this.refreshData("analytics", true),
      this.refreshData("readiness", true), // Workout affects readiness
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

  // NEW: Handle sleep logging
  async handleSleepLogged(sleepData) {
    console.log("Sleep logged, refreshing health data...");

    // Refresh all sleep and health-related data
    await Promise.all([
      this.refreshData("sleep", true),
      this.refreshData("readiness", true),
      this.refreshData("stats", true), // Sleep affects overall stats
    ]);

    // Notify all components
    this.notify("sleepLogged", sleepData, "sleep-logging");
  }

  // Broadcast data change to all components
  broadcastDataChange(dataType, data, source) {
    window.dispatchEvent(
      new CustomEvent("dataChanged", {
        detail: { dataType, data, source },
      })
    );
  }

  // NEW: Trigger sleep data refresh (for external use)
  async refreshSleepData() {
    await Promise.all([
      this.refreshData("sleep", true),
      this.refreshData("readiness", true)
    ]);
  }

  // Get comprehensive app state including sleep
  async getAppState() {
    const [stats, streak, workouts, messages, analytics, sleep, readiness] = await Promise.all([
      this.fetchStats(),
      this.fetchStreak(),
      this.fetchRecentWorkouts(),
      this.fetchRecentMessages(),
      this.fetchAnalytics(),
      this.fetchSleepData(),
      this.fetchReadiness(),
    ]);

    return {
      stats,
      streak,
      workouts,
      messages,
      analytics,
      sleep,
      readiness,
      lastSync: Date.now(),
    };
  }

  // FIX: Enhanced cleanup method
  destroy() {
    console.log("Destroying RealTimeSync service...");
    
    // Clear intervals
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.streakInterval) clearInterval(this.streakInterval);
    if (this.sleepInterval) clearInterval(this.sleepInterval);
    
    // Remove event listeners
    if (this.dataChangedHandler) {
      window.removeEventListener("dataChanged", this.dataChangedHandler);
    }
    if (this.workoutCompletedHandler) {
      window.removeEventListener("workoutCompleted", this.workoutCompletedHandler);
    }
    if (this.streakChangedHandler) {
      window.removeEventListener("streakChanged", this.streakChangedHandler);
    }
    if (this.sleepLoggedHandler) {
      window.removeEventListener("sleepLogged", this.sleepLoggedHandler);
    }
    
    // Clear data structures
    this.subscribers.clear();
    this.cache.clear();
    this.lastUpdate.clear();
    
    // Reset state
    this.isInitialized = false;
    this.initPromise = null;
    
    console.log("RealTimeSync service destroyed");
  }
}

// Create singleton instance
const realTimeSync = new RealTimeSyncService();

export default realTimeSync;
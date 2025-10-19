/**
 * Unified App State Management
 * Centralized state management for the entire application
 */

class AppStateManager {
  constructor() {
    this.state = {
      // User data
      user: null,

      // Workout data
      workouts: [],
      currentWorkout: null,
      todaysWorkout: null,

      // Streak data
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        missedWorkouts: 0,
        flexibleMode: true,
        workoutSchedule: null,
        streakHistory: [],
      },

      // Analytics data
      analytics: {
        weeklyCounts: [0, 0, 0, 0],
        rollingAverage: 0,
        trend: "stable",
        consistency: 0,
        patterns: [],
      },

      // Chat data
      messages: [],
      isLoading: false,

      // UI state
      showTimer: false,
      showAnalytics: false,
      showSettings: false,

      // Notifications
      notifications: [],

      // System state
      lastSync: null,
      isOnline: true,
      errors: [],
    };

    this.subscribers = new Map();
    this.isInitialized = false;
  }

  // Initialize the state manager
  async initialize() {
    if (this.isInitialized) return;

    console.log("Initializing AppStateManager...");

    // Load initial data
    await this.loadInitialData();

    // Set up event listeners
    this.setupEventListeners();

    // Set up periodic sync
    this.startPeriodicSync();

    this.isInitialized = true;
    console.log("AppStateManager initialized");
  }

  // Subscribe to state changes
  subscribe(stateKey, callback, component = "unknown") {
    if (!this.subscribers.has(stateKey)) {
      this.subscribers.set(stateKey, new Set());
    }

    const subscription = { callback, component, id: Date.now() };
    this.subscribers.get(stateKey).add(subscription);

    console.log(`Component ${component} subscribed to ${stateKey}`);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(stateKey);
      if (subscribers) {
        subscribers.delete(subscription);
        if (subscribers.size === 0) {
          this.subscribers.delete(stateKey);
        }
      }
    };
  }

  // Update state and notify subscribers
  updateState(stateKey, newValue, source = "unknown") {
    const oldValue = this.state[stateKey];
    this.state[stateKey] = newValue;

    console.log(`State updated: ${stateKey}`, { oldValue, newValue, source });

    // Notify subscribers
    this.notifySubscribers(stateKey, newValue, oldValue, source);

    // Update last sync time
    this.state.lastSync = Date.now();
  }

  // Notify subscribers of state changes
  notifySubscribers(stateKey, newValue, oldValue, source) {
    const subscribers = this.subscribers.get(stateKey);
    if (subscribers) {
      subscribers.forEach((subscription) => {
        try {
          subscription.callback(newValue, oldValue, source);
        } catch (error) {
          console.error(`Error in ${subscription.component} callback:`, error);
        }
      });
    }
  }

  // Get current state
  getState(stateKey = null) {
    if (stateKey) {
      return this.state[stateKey];
    }
    return { ...this.state };
  }

  // Load initial data
  async loadInitialData() {
    try {
      console.log("Loading initial app data...");

      // Load all data in parallel
      const [stats, streak, workouts, messages] = await Promise.all([
        this.fetchStats(),
        this.fetchStreak(),
        this.fetchWorkouts(),
        this.fetchMessages(),
      ]);

      // Update state
      this.updateState("analytics", stats, "initial-load");
      this.updateState("streak", streak, "initial-load");
      this.updateState("workouts", workouts, "initial-load");
      this.updateState("messages", messages, "initial-load");

      console.log("Initial data loaded successfully");
    } catch (error) {
      console.error("Error loading initial data:", error);
      this.addError("Failed to load initial data", error);
    }
  }

  // Fetch methods
  async fetchStats() {
    try {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return await response.json();
    } catch (error) {
      console.error("Error fetching stats:", error);
      return this.state.analytics;
    }
  }

  async fetchStreak() {
    try {
      const response = await fetch("/api/streak-status");
      if (!response.ok) throw new Error("Failed to fetch streak");
      return await response.json();
    } catch (error) {
      console.error("Error fetching streak:", error);
      return this.state.streak;
    }
  }

  async fetchWorkouts() {
    try {
      const response = await fetch("/api/workouts?limit=20");
      if (!response.ok) throw new Error("Failed to fetch workouts");
      const data = await response.json();
      return data.workouts || [];
    } catch (error) {
      console.error("Error fetching workouts:", error);
      return this.state.workouts;
    }
  }

  async fetchMessages() {
    try {
      const response = await fetch("/api/messages?limit=50");
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error("Error fetching messages:", error);
      return this.state.messages;
    }
  }

  // Set up event listeners
  setupEventListeners() {
    // Listen for data changes from other services
    window.addEventListener("dataChanged", (event) => {
      const { dataType, data, source } = event.detail;
      this.handleDataChange(dataType, data, source);
    });

    // Listen for workout completion
    window.addEventListener("workoutCompleted", (event) => {
      this.handleWorkoutCompletion(event.detail);
    });

    // Listen for streak changes
    window.addEventListener("streakChanged", (event) => {
      this.handleStreakChange(event.detail);
    });

    // Listen for analytics updates
    window.addEventListener("analyticsUpdated", (event) => {
      this.handleAnalyticsUpdate(event.detail);
    });

    // Listen for online/offline status
    window.addEventListener("online", () => {
      this.updateState("isOnline", true, "network");
    });

    window.addEventListener("offline", () => {
      this.updateState("isOnline", false, "network");
    });
  }

  // Handle data changes from other services
  handleDataChange(dataType, data, source) {
    switch (dataType) {
      case "stats":
        this.updateState("analytics", data, source);
        break;
      case "streak":
        this.updateState("streak", data, source);
        break;
      case "workouts":
        this.updateState("workouts", data, source);
        break;
      case "messages":
        this.updateState("messages", data, source);
        break;
      default:
        console.log(`Unknown data type: ${dataType}`);
    }
  }

  // Handle workout completion
  async handleWorkoutCompletion(workoutData) {
    console.log("Handling workout completion:", workoutData);

    // Add to workouts
    const newWorkouts = [workoutData, ...this.state.workouts];
    this.updateState("workouts", newWorkouts, "workout-completion");

    // Refresh analytics
    const analytics = await this.fetchStats();
    this.updateState("analytics", analytics, "workout-completion");

    // Refresh streak
    const streak = await this.fetchStreak();
    this.updateState("streak", streak, "workout-completion");
  }

  // Handle streak changes
  async handleStreakChange(streakData) {
    console.log("Handling streak change:", streakData);

    // Update streak state
    this.updateState("streak", streakData.data, "streak-change");

    // Refresh analytics
    const analytics = await this.fetchStats();
    this.updateState("analytics", analytics, "streak-change");
  }

  // Handle analytics updates
  handleAnalyticsUpdate(analyticsData) {
    console.log("Handling analytics update:", analyticsData);
    this.updateState("analytics", analyticsData, "analytics-update");
  }

  // Start periodic synchronization
  startPeriodicSync() {
    // Sync every 30 seconds
    setInterval(async () => {
      await this.syncData();
    }, 30000);
  }

  // Sync all data
  async syncData() {
    if (!this.state.isOnline) return;

    try {
      console.log("Syncing app data...");

      const [stats, streak, workouts] = await Promise.all([
        this.fetchStats(),
        this.fetchStreak(),
        this.fetchWorkouts(),
      ]);

      this.updateState("analytics", stats, "periodic-sync");
      this.updateState("streak", streak, "periodic-sync");
      this.updateState("workouts", workouts, "periodic-sync");
    } catch (error) {
      console.error("Error syncing data:", error);
      this.addError("Sync failed", error);
    }
  }

  // Add error to state
  addError(message, error) {
    const errorObj = {
      id: Date.now(),
      message,
      error: error.message || error,
      timestamp: new Date().toISOString(),
    };

    const errors = [...this.state.errors, errorObj];
    this.updateState("errors", errors, "error");
  }

  // Clear errors
  clearErrors() {
    this.updateState("errors", [], "clear-errors");
  }

  // Add notification
  addNotification(notification) {
    const notificationObj = {
      id: Date.now(),
      ...notification,
      timestamp: new Date().toISOString(),
    };

    const notifications = [...this.state.notifications, notificationObj];
    this.updateState("notifications", notifications, "add-notification");
  }

  // Remove notification
  removeNotification(id) {
    const notifications = this.state.notifications.filter((n) => n.id !== id);
    this.updateState("notifications", notifications, "remove-notification");
  }

  // Get comprehensive app state
  getAppState() {
    return {
      ...this.state,
      subscribers: this.subscribers.size,
      isInitialized: this.isInitialized,
    };
  }

  // Reset state
  reset() {
    this.state = {
      user: null,
      workouts: [],
      currentWorkout: null,
      todaysWorkout: null,
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        missedWorkouts: 0,
        flexibleMode: true,
        workoutSchedule: null,
        streakHistory: [],
      },
      analytics: {
        weeklyCounts: [0, 0, 0, 0],
        rollingAverage: 0,
        trend: "stable",
        consistency: 0,
        patterns: [],
      },
      messages: [],
      isLoading: false,
      showTimer: false,
      showAnalytics: false,
      showSettings: false,
      notifications: [],
      lastSync: null,
      isOnline: true,
      errors: [],
    };

    this.subscribers.clear();
    this.isInitialized = false;
  }

  // Cleanup
  destroy() {
    this.subscribers.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const appState = new AppStateManager();

export default appState;

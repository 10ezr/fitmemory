/**
 * Real-time data synchronization service - Fixed version
 * Fixes memory leaks, improves error handling, and adds proper cleanup
 */

import { SYNC_CONFIG } from "@/lib/constants/appConfig";

class RealTimeSyncService {
  constructor() {
    this.subscribers = new Map();
    this.cache = new Map();
    this.lastUpdate = new Map();
    this.isInitialized = false;
    this.initPromise = null;
    
    // Track intervals and listeners for cleanup
    this.intervals = new Set();
    this.eventListeners = new Map();
    this.abortController = new AbortController();
  }

  async initialize() {
    if (this.isInitialized) {
      console.log("RealTimeSync already initialized, skipping...");
      return;
    }

    if (this.initPromise) {
      console.log("RealTimeSync initialization in progress, waiting...");
      return await this.initPromise;
    }

    this.initPromise = this._performInitialization();
    return await this.initPromise;
  }

  async _performInitialization() {
    try {
      console.log("Initializing RealTimeSync service with enhanced error handling...");

      this.startPeriodicSync();
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

  subscribe(dataType, callback, component = "unknown") {
    if (!this.subscribers.has(dataType)) {
      this.subscribers.set(dataType, new Set());
    }

    const subscription = { callback, component, id: Date.now() };
    this.subscribers.get(dataType).add(subscription);

    console.log(`Component ${component} subscribed to ${dataType}`);

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

    this.cache.set(dataType, data);
    this.lastUpdate.set(dataType, Date.now());
  }

  getCachedData(dataType) {
    return this.cache.get(dataType);
  }

  isDataStale(dataType, maxAge = SYNC_CONFIG.DATA_STALE_THRESHOLD) {
    const lastUpdate = this.lastUpdate.get(dataType);
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate > maxAge;
  }

  async refreshData(dataType, force = false) {
    if (!force && !this.isDataStale(dataType)) {
      return this.getCachedData(dataType);
    }

    try {
      let data;
      const signal = this.abortController.signal;

      switch (dataType) {
        case "stats":
          data = await this.fetchWithTimeout('/api/stats', signal);
          break;
        case "streak":
          data = await this.fetchWithTimeout('/api/streak-status', signal);
          break;
        case "workouts":
          data = await this.fetchWithTimeout('/api/workouts?limit=10', signal);
          break;
        case "messages":
          data = await this.fetchWithTimeout('/api/messages?limit=20', signal);
          break;
        case "analytics":
          data = await this.fetchWithTimeout('/api/analytics', signal);
          break;
        case "sleep":
          data = await this.fetchWithTimeout('/api/sleep?days=7', signal);
          break;
        case "readiness":
          data = await this.fetchWithTimeout('/api/readiness', signal);
          break;
        default:
          console.warn(`Unknown data type: ${dataType}`);
          return null;
      }

      this.notify(dataType, data, "refresh");
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Request for ${dataType} was aborted`);
      } else {
        console.error(`Error refreshing ${dataType}:`, error);
      }
      return null;
    }
  }

  async fetchWithTimeout(url, signal, timeout = 10000) {
    const timeoutId = setTimeout(() => {
      if (!signal.aborted) {
        this.abortController.abort();
      }
    }, timeout);

    try {
      const response = await fetch(url, { signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  startPeriodicSync() {
    this.clearAllIntervals();

    // Main sync interval
    const syncInterval = setInterval(async () => {
      if (this.abortController.signal.aborted) return;
      await this.syncAllData();
    }, SYNC_CONFIG.SYNC_INTERVAL);
    this.intervals.add(syncInterval);

    // Streak check interval
    const streakInterval = setInterval(async () => {
      if (this.abortController.signal.aborted) return;
      await this.checkStreakStatus();
    }, SYNC_CONFIG.STREAK_CHECK_INTERVAL);
    this.intervals.add(streakInterval);

    // Sleep readiness interval
    const sleepInterval = setInterval(async () => {
      if (this.abortController.signal.aborted) return;
      await this.checkSleepReadiness();
    }, SYNC_CONFIG.SLEEP_CHECK_INTERVAL);
    this.intervals.add(sleepInterval);

    console.log("Periodic sync intervals started");
  }

  clearAllIntervals() {
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.intervals.clear();
  }

  async syncAllData() {
    const dataTypes = ["stats", "streak", "workouts", "messages", "sleep", "readiness"];

    for (const dataType of dataTypes) {
      if (this.abortController.signal.aborted) break;
      if (this.isDataStale(dataType)) {
        await this.refreshData(dataType);
      }
    }
  }

  async checkStreakStatus() {
    try {
      const streak = await this.fetchWithTimeout('/api/streak-status', this.abortController.signal);
      if (streak) {
        this.notify("streak", streak, "periodic-check");
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error checking streak status:", error);
      }
    }
  }

  async checkSleepReadiness() {
    try {
      const readiness = await this.fetchWithTimeout('/api/readiness', this.abortController.signal);
      if (readiness) {
        this.notify("readiness", readiness, "periodic-check");
        
        const sleepData = await this.fetchWithTimeout('/api/sleep?days=7', this.abortController.signal);
        if (sleepData) {
          this.notify("sleep", sleepData, "periodic-check");
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error checking sleep readiness:", error);
      }
    }
  }

  setupEventListeners() {
    this.removeAllEventListeners();

    const events = [
      { name: "dataChanged", handler: this.handleDataChanged.bind(this) },
      { name: "workoutCompleted", handler: this.handleWorkoutCompleted.bind(this) },
      { name: "streakChanged", handler: this.handleStreakChanged.bind(this) },
      { name: "sleepLogged", handler: this.handleSleepLogged.bind(this) }
    ];

    events.forEach(({ name, handler }) => {
      window.addEventListener(name, handler, { signal: this.abortController.signal });
      this.eventListeners.set(name, handler);
    });

    console.log("Event listeners set up with proper cleanup");
  }

  removeAllEventListeners() {
    this.eventListeners.forEach((handler, eventName) => {
      window.removeEventListener(eventName, handler);
    });
    this.eventListeners.clear();
  }

  handleDataChanged(event) {
    const { dataType, data, source } = event.detail;
    this.notify(dataType, data, source);
  }

  async handleWorkoutCompleted(event) {
    console.log("Workout completed, refreshing data...");
    await Promise.all([
      this.refreshData("stats", true),
      this.refreshData("streak", true),
      this.refreshData("workouts", true),
      this.refreshData("analytics", true),
      this.refreshData("readiness", true)
    ]);
    this.notify("workoutCompleted", event.detail, "workout-completion");
  }

  async handleStreakChanged(event) {
    console.log("Streak changed, refreshing data...");
    await Promise.all([
      this.refreshData("stats", true),
      this.refreshData("streak", true),
      this.refreshData("analytics", true)
    ]);
    this.notify("streakChanged", event.detail, "streak-change");
  }

  async handleSleepLogged(event) {
    console.log("Sleep logged, refreshing health data...");
    await Promise.all([
      this.refreshData("sleep", true),
      this.refreshData("readiness", true),
      this.refreshData("stats", true)
    ]);
    this.notify("sleepLogged", event.detail, "sleep-logging");
  }

  broadcastDataChange(dataType, data, source) {
    window.dispatchEvent(
      new CustomEvent("dataChanged", {
        detail: { dataType, data, source }
      })
    );
  }

  async refreshSleepData() {
    await Promise.all([
      this.refreshData("sleep", true),
      this.refreshData("readiness", true)
    ]);
  }

  async getAppState() {
    const promises = [
      this.fetchWithTimeout('/api/stats', this.abortController.signal),
      this.fetchWithTimeout('/api/streak-status', this.abortController.signal),
      this.fetchWithTimeout('/api/workouts?limit=10', this.abortController.signal),
      this.fetchWithTimeout('/api/messages?limit=20', this.abortController.signal),
      this.fetchWithTimeout('/api/analytics', this.abortController.signal),
      this.fetchWithTimeout('/api/sleep?days=7', this.abortController.signal),
      this.fetchWithTimeout('/api/readiness', this.abortController.signal)
    ];

    try {
      const [stats, streak, workouts, messages, analytics, sleep, readiness] = await Promise.allSettled(promises);
      
      return {
        stats: stats.status === 'fulfilled' ? stats.value : null,
        streak: streak.status === 'fulfilled' ? streak.value : null,
        workouts: workouts.status === 'fulfilled' ? workouts.value : null,
        messages: messages.status === 'fulfilled' ? messages.value : null,
        analytics: analytics.status === 'fulfilled' ? analytics.value : null,
        sleep: sleep.status === 'fulfilled' ? sleep.value : null,
        readiness: readiness.status === 'fulfilled' ? readiness.value : null,
        lastSync: Date.now()
      };
    } catch (error) {
      console.error("Error getting app state:", error);
      return { lastSync: Date.now() };
    }
  }

  destroy() {
    console.log("Destroying RealTimeSync service...");
    
    // Abort all ongoing requests
    this.abortController.abort();
    
    // Clear intervals
    this.clearAllIntervals();
    
    // Remove event listeners
    this.removeAllEventListeners();
    
    // Clear data structures
    this.subscribers.clear();
    this.cache.clear();
    this.lastUpdate.clear();
    
    // Reset state
    this.isInitialized = false;
    this.initPromise = null;
    
    // Create new abort controller for potential reinitialization
    this.abortController = new AbortController();
    
    console.log("RealTimeSync service destroyed and cleaned up");
  }
}

// Create singleton instance
const realTimeSync = new RealTimeSyncService();

export default realTimeSync;
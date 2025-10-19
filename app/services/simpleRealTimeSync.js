/**
 * Simple Real-Time Sync Service
 * Lightweight real-time updates without complex state management
 */

class SimpleRealTimeSync {
  constructor() {
    this.subscribers = new Map();
    this.isInitialized = false;
  }

  // Initialize the sync service
  async initialize() {
    if (this.isInitialized) return;

    console.log("Initializing SimpleRealTimeSync...");

    // Set up periodic data refresh
    this.startPeriodicSync();

    this.isInitialized = true;
    console.log("SimpleRealTimeSync initialized");
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
  }

  // Set up periodic synchronization
  startPeriodicSync() {
    // Sync every 2 minutes (less frequent to avoid conflicts)
    setInterval(async () => {
      await this.syncData();
    }, 120000);
  }

  // Sync data
  async syncData() {
    try {
      // Only sync if there are subscribers
      if (this.subscribers.size === 0) return;

      console.log("Syncing data...");

      // Sync stats if there are subscribers
      if (this.subscribers.has("stats")) {
        const response = await fetch("/api/stats");
        if (response.ok) {
          const data = await response.json();
          this.notify("stats", data, "periodic-sync");
        }
      }

      // Sync streak if there are subscribers
      if (this.subscribers.has("streak")) {
        const response = await fetch("/api/streak-status");
        if (response.ok) {
          const data = await response.json();
          this.notify("streak", data, "periodic-sync");
        }
      }
    } catch (error) {
      console.error("Error syncing data:", error);
    }
  }

  // Broadcast data change to all components
  broadcastDataChange(dataType, data, source) {
    this.notify(dataType, data, source);
  }

  // Cleanup
  destroy() {
    this.subscribers.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const simpleRealTimeSync = new SimpleRealTimeSync();

export default simpleRealTimeSync;

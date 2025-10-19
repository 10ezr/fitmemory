"use client";

class NotificationService {
  constructor() {
    this.permission = null;
    this.activeReminders = new Map();
    this.motivationalTimer = null;
    this.isActive = false;
    this.settings = {
      workoutReminders: true,
      streakNotifications: true,
      motivationalMessages: true,
      reminderTime: "18:00", // 6 PM default
      dailyReminder: true,
      streakMilestones: true,
      randomMotivation: true,
      motivationFrequency: "medium", // low, medium, high
    };

    // Only initialize on client side
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  async init() {
    if (typeof window !== "undefined" && "Notification" in window) {
      this.permission = await this.requestPermission();
      this.setupServiceWorker();
      this.loadSettings();
      this.startMotivationalMessages();
      this.scheduleDailyReminder();
      this.isActive = true;

      console.log(
        "NotificationService initialized with permission:",
        this.permission
      );
    } else {
      console.warn("Notifications not supported in this browser");
    }
  }

  async requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return "denied";
  }

  async setupServiceWorker() {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered:", registration);
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  }

  loadSettings() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notificationSettings");
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    }
  }

  saveSettings() {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "notificationSettings",
        JSON.stringify(this.settings)
      );
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();

    // Reschedule reminders with new settings
    if (this.settings.dailyReminder) {
      this.scheduleDailyReminder();
    } else {
      this.clearDailyReminder();
    }

    // Update motivational messages
    if (this.settings.randomMotivation) {
      this.startMotivationalMessages();
    } else {
      this.stopMotivationalMessages();
    }
  }

  // Immediate notifications
  showNotification(title, options = {}) {
    if (typeof window === "undefined" || this.permission !== "granted")
      return false;

    const defaultOptions = {
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options,
    };

    // Remove actions for regular notifications to avoid the error
    const { actions, ...safeOptions } = defaultOptions;

    new Notification(title, safeOptions);
    return true;
  }

  // Workout completion notification
  workoutCompleted(workoutData) {
    if (!this.settings.motivationalMessages) return;

    const messages = [
      "🎉 Great workout! You're building strength every day!",
      "💪 Workout complete! Your consistency is paying off!",
      "🔥 Another workout in the books! Keep the momentum going!",
      "⚡ Fantastic session! You're getting stronger!",
      "🏆 Workout done! You're one step closer to your goals!",
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    this.showNotification("Workout Completed!", {
      body: `${randomMessage}\n\nDuration: ${Math.round(
        workoutData.totalDuration / 60
      )} minutes\nExercises: ${workoutData.exercises.length}`,
      icon: "/workout-complete.png",
    });
  }

  // Streak milestone notifications
  streakMilestone(streak) {
    if (!this.settings.streakNotifications) return;

    const milestoneMessages = {
      3: "🔥 3 days strong! You're building a habit!",
      7: "⭐ One week streak! You're on fire!",
      14: "🚀 Two weeks! This is becoming a lifestyle!",
      30: "🏆 30 days! You're a fitness champion!",
      50: "👑 50 days! Absolutely incredible dedication!",
      100: "🎯 100 days! You are unstoppable!",
      365: "🎉 ONE YEAR! This is extraordinary!",
    };

    const message = milestoneMessages[streak];
    if (message) {
      this.showNotification(`🔥 ${streak} Day Streak!`, {
        body: message,
        requireInteraction: true,
        actions: [
          { action: "view", title: "View Progress" },
          { action: "share", title: "Share Achievement" },
        ],
      });
    }
  }

  // Streak warning (about to lose streak)
  streakWarning() {
    if (!this.settings.streakNotifications) return;

    const warnings = [
      "⚠️ Don't break the streak! Time for a quick workout!",
      "🔥 Your streak is counting on you! Let's keep it alive!",
      "⏰ Streak alert! A few minutes of exercise can save the day!",
      "💪 Your consistency is impressive - don't let it slip now!",
    ];

    const randomWarning = warnings[Math.floor(Math.random() * warnings.length)];

    this.showNotification("Streak Alert!", {
      body: randomWarning,
      requireInteraction: true,
      actions: [
        { action: "workout", title: "Start Workout" },
        { action: "remind", title: "Remind Later" },
      ],
    });
  }

  // Daily workout reminder
  scheduleDailyReminder() {
    this.clearDailyReminder();

    if (!this.settings.dailyReminder || !this.settings.workoutReminders) return;

    const now = new Date();
    const [hours, minutes] = this.settings.reminderTime.split(":");
    const reminderTime = new Date();
    reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // If reminder time has passed today, schedule for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    const reminderId = setTimeout(() => {
      this.sendDailyReminder();
      // Schedule next day's reminder
      this.scheduleDailyReminder();
    }, timeUntilReminder);

    this.activeReminders.set("daily", reminderId);
  }

  sendDailyReminder() {
    if (!this.settings.workoutReminders) return;

    const messages = [
      "🏋️ Time to get moving! Your body will thank you.",
      "💪 Ready for today's workout? Let's make it count!",
      "⚡ Workout time! Consistency builds champions.",
      "🔥 Your future self is counting on today's effort!",
      "🎯 Time to train! Every workout makes you stronger.",
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    this.showNotification("Workout Reminder", {
      body: randomMessage,
      requireInteraction: true,
      actions: [
        { action: "start", title: "Start Workout" },
        { action: "snooze", title: "Remind in 1 hour" },
      ],
    });
  }

  clearDailyReminder() {
    const reminderId = this.activeReminders.get("daily");
    if (reminderId) {
      clearTimeout(reminderId);
      this.activeReminders.delete("daily");
    }
  }

  // Snooze reminder
  snoozeReminder(minutes = 60) {
    const snoozeId = setTimeout(() => {
      this.sendDailyReminder();
    }, minutes * 60 * 1000);

    this.activeReminders.set("snooze", snoozeId);
  }

  // Motivational messages based on patterns
  sendMotivationalMessage(context = {}) {
    if (!this.settings.motivationalMessages) return;

    const {
      daysSinceLastWorkout = 0,
      weeklyGoalProgress = 0,
      trend = "stable",
    } = context;

    let message = "";

    if (daysSinceLastWorkout >= 3) {
      const comebackMessages = [
        "🌟 Ready for a comeback? Every expert was once a beginner!",
        "💪 It's been a few days - your muscles are ready to work!",
        "🚀 Time to get back on track! You've got this!",
        "⚡ Fresh start energy! Let's make today count!",
      ];
      message =
        comebackMessages[Math.floor(Math.random() * comebackMessages.length)];
    } else if (weeklyGoalProgress >= 80) {
      const achievementMessages = [
        "🏆 You're crushing your weekly goal! Amazing consistency!",
        "⭐ Outstanding progress this week! Keep it up!",
        "🎯 You're in the zone! This dedication is inspiring!",
        "🔥 On fire this week! You're unstoppable!",
      ];
      message =
        achievementMessages[
          Math.floor(Math.random() * achievementMessages.length)
        ];
    } else if (trend === "improving") {
      const progressMessages = [
        "📈 Your progress is trending up! Great work!",
        "🚀 You're on an upward trajectory! Keep pushing!",
        "⬆️ Improvement mode activated! Love to see it!",
        "💯 Your consistency is paying dividends!",
      ];
      message =
        progressMessages[Math.floor(Math.random() * progressMessages.length)];
    }

    if (message) {
      this.showNotification("Motivation Boost", {
        body: message,
        actions: [
          { action: "workout", title: "Start Workout" },
          { action: "progress", title: "View Progress" },
        ],
      });
    }
  }

  // Handle notification clicks
  handleNotificationClick(action, data = {}) {
    switch (action) {
      case "start":
      case "workout":
        window.dispatchEvent(new CustomEvent("startWorkout"));
        break;
      case "snooze":
        this.snoozeReminder(60);
        break;
      case "remind":
        this.snoozeReminder(30);
        break;
      case "view":
      case "progress":
        window.dispatchEvent(new CustomEvent("viewProgress"));
        break;
      case "share":
        this.shareAchievement(data);
        break;
    }
  }

  // Share achievement
  async shareAchievement(data) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Fitness Achievement!",
          text: `🔥 Just hit a ${data.streak} day workout streak with FitMemory! 💪`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Sharing cancelled or failed:", error);
      }
    } else {
      // Fallback: copy to clipboard
      const text = `🔥 Just hit a ${data.streak} day workout streak with FitMemory! 💪`;
      navigator.clipboard?.writeText(text);
      this.showNotification("Copied to clipboard!", {
        body: "Share your achievement with friends!",
      });
    }
  }

  // Check for overdue workouts and send warnings
  checkStreakStatus(lastWorkoutDate, currentStreak) {
    if (!lastWorkoutDate || !this.settings.streakNotifications) return;

    const now = new Date();
    const lastWorkout = new Date(lastWorkoutDate);
    const hoursSinceLastWorkout = (now - lastWorkout) / (1000 * 60 * 60);

    // If it's been more than 20 hours since last workout and we have a streak
    if (hoursSinceLastWorkout > 20 && currentStreak > 0) {
      this.streakWarning();
    }
  }

  // Get notification settings for UI
  getSettings() {
    return { ...this.settings };
  }

  // Start random motivational messages
  startMotivationalMessages() {
    this.stopMotivationalMessages(); // Clear existing timer

    if (!this.settings.motivationalMessages || !this.settings.randomMotivation)
      return;

    const frequencies = {
      low: 4 * 60 * 60 * 1000, // 4 hours
      medium: 2 * 60 * 60 * 1000, // 2 hours
      high: 60 * 60 * 1000, // 1 hour
    };

    const frequency =
      frequencies[this.settings.motivationFrequency] || frequencies.medium;

    // Add some randomness (±30 minutes)
    const randomOffset = (Math.random() - 0.5) * 60 * 60 * 1000;
    const actualFrequency = frequency + randomOffset;

    this.motivationalTimer = setInterval(() => {
      this.sendRandomMotivation();
    }, actualFrequency);

    console.log(
      `Started motivational messages every ${Math.round(
        actualFrequency / 1000 / 60
      )} minutes`
    );
  }

  stopMotivationalMessages() {
    if (this.motivationalTimer) {
      clearInterval(this.motivationalTimer);
      this.motivationalTimer = null;
    }
  }

  // Send random motivational message
  sendRandomMotivation() {
    if (!this.settings.motivationalMessages) return;

    const motivationalMessages = [
      {
        title: "💪 Stay Strong!",
        body: "Your consistency is building the foundation for incredible results. Keep going!",
      },
      {
        title: "🔥 Momentum Check!",
        body: "Every workout counts. Today is another opportunity to become stronger!",
      },
      {
        title: "⚡ Energy Boost!",
        body: "Remember: You're not just working out, you're building discipline and confidence.",
      },
      {
        title: "🎯 Goal Reminder!",
        body: "Your future self is counting on the effort you put in today. Make it count!",
      },
      {
        title: "🌟 Progress Check!",
        body: "Small daily improvements lead to stunning long-term results. You're on track!",
      },
      {
        title: "🚀 Potential Unlock!",
        body: "You're capable of more than you know. Push your limits and discover your strength!",
      },
      {
        title: "💎 Consistency Gem!",
        body: "Champions aren't made in comfort zones. Time to challenge yourself!",
      },
      {
        title: "🏆 Victory Mindset!",
        body: "Every rep, every set, every day you show up - you're winning!",
      },
      {
        title: "⭐ Inspiration Alert!",
        body: "The only bad workout is the one that doesn't happen. Let's make today great!",
      },
      {
        title: "🌈 Positive Vibes!",
        body: "Your body can do it. It's your mind you need to convince. You've got this!",
      },
    ];

    // Don't show motivational messages during sleep hours (11 PM - 6 AM)
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 6) return;

    const randomMessage =
      motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];

    this.showNotification(randomMessage.title, {
      body: randomMessage.body,
      requireInteraction: false,
      silent: true, // Don't wake people up
      actions: [
        { action: "workout", title: "💪 Let's Go!" },
        { action: "snooze", title: "⏰ Later" },
      ],
    });
  }

  // Enhanced notification display with fallback
  showNotificationWithFallback(title, options = {}) {
    // Try to show native notification first
    if (this.showNotification(title, options)) {
      return true;
    }

    // Fallback to custom in-app notification
    this.showInAppNotification(title, options.body || "");
    return false;
  }

  // Custom in-app notification for when native notifications are blocked
  showInAppNotification(title, message) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 z-50 bg-gradient-to-r from-primary to-secondary text-white p-4 rounded-lg shadow-xl max-w-sm animate-in slide-in-from-right";
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="text-2xl">🏋️</div>
        <div class="flex-1">
          <div class="font-semibold text-sm">${title}</div>
          <div class="text-xs opacity-90 mt-1">${message}</div>
        </div>
        <button class="text-white/70 hover:text-white transition-colors ml-2" onclick="this.parentElement.parentElement.remove()">
          ✕
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.opacity = "0";
        notification.style.transform = "translateX(100%)";
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);

    // Play a subtle notification sound
    this.playNotificationSound();
  }

  // Play notification sound
  playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        1000,
        audioContext.currentTime + 0.1
      );

      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.2
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log("Audio notification not available");
    }
  }

  // Test notification
  testNotification() {
    const success = this.showNotification("🎉 Test Notification", {
      body: "If you see this, notifications are working perfectly! Your fitness journey is about to get even better.",
      icon: "/icon-192x192.png",
      actions: [
        { action: "dismiss", title: "Got it!" },
        { action: "settings", title: "Settings" },
      ],
    });

    if (!success) {
      // Show in-app notification as fallback
      this.showInAppNotification(
        "🎉 Test Notification",
        "Notifications are working! (In-app fallback mode)"
      );
    }

    return success;
  }

  // Cleanup
  destroy() {
    // Clear all active reminders
    for (const [key, timerId] of this.activeReminders) {
      clearTimeout(timerId);
    }
    this.activeReminders.clear();
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

"use client";

import { useState, useEffect, useRef } from "react";
import {
  PaperAirplaneIcon,
  ChartBarIcon,
  BellIcon,
} from "@heroicons/react/24/solid";
import ChatMessage from "./components/ChatMessage";
import QuickActions from "./components/QuickActions";
import StatsSidebar from "./components/StatsSidebar";
import AdminPanel from "./components/AdminPanel";
import WorkoutTimer from "./components/WorkoutTimer";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [patternSummary, setPatternSummary] = useState("");
  const [showTimer, setShowTimer] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [timerData, setTimerData] = useState([]);
  const [notificationService, setNotificationService] = useState(null);
  const [appStateData, setAppStateData] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadInitialData();
    setupEventListeners();

    return () => {
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check streak status periodically
    if (stats?.dailyStreak && stats?.lastWorkoutDate && notificationService) {
      notificationService.checkStreakStatus(
        stats.lastWorkoutDate,
        stats.dailyStreak
      );
    }
  }, [stats, notificationService]);

  const setupEventListeners = () => {
    window.addEventListener("startWorkout", handleStartWorkout);
    window.addEventListener("viewProgress", handleViewProgress);
    window.addEventListener("requestWorkoutPlan", handleRequestWorkoutPlan);

    // Initialize notification service on client side
    import("./services/notificationService").then((module) => {
      setNotificationService(module.default);
    });
  };

  const cleanup = () => {
    window.removeEventListener("startWorkout", handleStartWorkout);
    window.removeEventListener("viewProgress", handleViewProgress);
    window.removeEventListener("requestWorkoutPlan", handleRequestWorkoutPlan);
  };

  const handleStartWorkout = () => {
    if (todaysWorkout) {
      setShowTimer(true);
    } else {
      sendMessage("Give me a quick workout plan for today");
    }
  };

  const handleViewProgress = () => {
    setShowAnalytics(true);
  };

  const handleRequestWorkoutPlan = () => {
    sendMessage("Create a workout plan for today");
  };

  const loadInitialData = async () => {
    try {
      // Load messages, stats, patterns, and today's workout in parallel
      const [messagesRes, statsRes, patternsRes, todaysWorkoutRes, timerRes] =
        await Promise.all([
          fetch("/api/messages?limit=20"),
          fetch("/api/stats"),
          fetch("/api/patternSummary"),
          fetch("/api/todaysWorkout"),
          fetch("/api/timer-data"),
        ]);

      const messagesData = await messagesRes.json();
      const statsData = await statsRes.json();
      const patternsData = await patternsRes.json();

      if (messagesData.messages?.length > 0) {
        setMessages(messagesData.messages);
      } else {
        setMessages([]);
      }

      setStats(statsData);
      setPatternSummary(patternsData.summary || "Building your routine...");

      // Load today's workout if available
      if (todaysWorkoutRes.ok) {
        const workoutData = await todaysWorkoutRes.json();
        setTodaysWorkout(workoutData.workout);
      }

      // Load timer data if available
      if (timerRes.ok) {
        const timerData = await timerRes.json();
        setTimerData(timerData.sessions || []);
      }
    } catch (error) {
      console.error("Failed to load initial data:", error);
      setMessages([
        {
          id: "error",
          role: "system",
          content:
            "Welcome to FitMemory! I'm having trouble loading your data, but I'm ready to help with your fitness journey.",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/converse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
        workoutLogged: data.workoutLogged,
        workout: data.workout,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update stats if workout was logged
      if (data.workoutLogged) {
        await refreshStats();
        // Notify about workout completion
        if (data.workout && notificationService) {
          notificationService.workoutCompleted({
            totalDuration: data.workout.duration || 0,
            exercises: data.workout.exercises || [],
          });
        }
      }

      // Check for streak updates
      if (data.streakUpdate && notificationService) {
        console.log('🔥 Streak update received:', data.streakUpdate);
        notificationService.streakMilestone(data.streakUpdate.currentStreak);

        // Force immediate stats refresh
        await refreshStats();
      }

      // Check for streak status (missed workouts, resets, etc.)
      if (data.streakStatus && notificationService) {
        if (data.streakStatus.streakReset) {
          notificationService.showNotification("Streak Reset", {
            body: `Your streak was reset due to ${data.streakStatus.daysMissed} missed workouts. Time to start fresh! 💪`,
            icon: "/icon-192x192.png",
          });
        } else if (data.streakStatus.streakMaintained) {
          // Show warning if approaching reset
          if (data.streakStatus.missedWorkouts >= 2) {
            notificationService.showNotification("Streak Warning", {
              body: `You've missed ${data.streakStatus.missedWorkouts} workouts. One more and your streak resets! 🔥`,
              icon: "/icon-192x192.png",
            });
          }
        }
        await refreshStats(); // Refresh to show updated streak
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage = {
        id: (Date.now() + 2).toString(),
        role: "system",
        content:
          "Sorry, I'm having trouble responding right now. Please try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      const [statsRes, patternsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/patternSummary"),
      ]);

      const statsData = await statsRes.json();
      const patternsData = await patternsRes.json();

      setStats(statsData);
      setPatternSummary(patternsData.summary || "Building your routine...");
    } catch (error) {
      console.error("Failed to refresh stats:", error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const insertQuickMessage = (message) => {
    setInput(message);
  };

  const handleTimerComplete = async (workoutData) => {
    // Save workout session data
    try {
      const response = await fetch("/api/timer-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workoutData),
      });

      if (response.ok) {
        setTimerData((prev) => [...prev, workoutData]);
        if (notificationService) {
          notificationService.workoutCompleted(workoutData);
        }
        await refreshStats();

        // Auto-log the workout
        const workoutSummary = `Completed ${
          workoutData.exercises.length
        } exercises in ${Math.round(workoutData.totalDuration / 60)} minutes`;
        sendMessage(workoutSummary);
      }
    } catch (error) {
      console.error("Failed to save workout session:", error);
    }

    setShowTimer(false);
  };

  const handleTimerCancel = () => {
    setShowTimer(false);
  };

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* Left sidebar with stats/admin */}
      <aside className="hidden md:flex md:w-72 lg:w-96 flex-col border-r overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-medium">Overview</div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowAnalytics(true)}
              title="Analytics"
            >
              <ChartBarIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => notificationService?.testNotification()}
              title="Notifications"
            >
              <BellIcon className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="text-lg">⚙️</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <div className="border-b px-3 py-2 text-sm font-medium">
                  Settings
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  <AdminPanel onDataChange={refreshStats} />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <StatsSidebar
            stats={stats}
            patternSummary={patternSummary}
            todaysWorkout={todaysWorkout}
            onStartWorkout={handleStartWorkout}
          />
        </div>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          FitMemory
        </div>
      </aside>

      {/* Chat column */}
      <div className="flex-1 flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Current Date */}
              <div className="text-sm font-medium text-foreground">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Streak Display */}
              {stats?.dailyStreak > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800">
                  <span className="text-sm">🔥</span>
                  <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                    {stats.dailyStreak}
                  </span>
                  <span className="text-xs text-orange-600 dark:text-orange-400">
                    day{stats.dailyStreak !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto space-y-4 px-4 py-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  👋
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Welcome to FitMemory!
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  I&apos;m your AI fitness coach. I can help you track workouts,
                  create plans, and stay motivated on your fitness journey.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "Create my first workout plan",
                    "Log today's exercise",
                    "Show my progress",
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => insertQuickMessage(suggestion)}
                      className="px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-sm hover:bg-primary/10 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id || message._id} message={message} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-card border">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">
                    FitMemory is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full max-w-4xl mx-auto p-4">
            {/* Quick Actions */}
            {messages.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Start today's workout", emoji: "▶️" },
                    { label: "Check my progress", emoji: "📈" },
                    { label: "Create new plan", emoji: "📋" },
                    { label: "Get motivated", emoji: "🔥" },
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={() => insertQuickMessage(action.label)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-background/50 text-xs hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105"
                    >
                      <span>{action.emoji}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <div className="flex items-end gap-3 p-3 rounded-2xl border-2 border-border/50 bg-background focus-within:border-primary/50 focus-within:bg-card transition-all duration-200">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask FitMemory anything about fitness, workouts, or your progress..."
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 placeholder:text-muted-foreground/70"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height =
                        Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                  />

                  <Button
                    type="submit"
                    disabled={loading || !input.trim()}
                    size="sm"
                    className="shrink-0 rounded-xl px-3 h-9"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <PaperAirplaneIcon className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between mt-2 px-1">
                  <div className="text-xs text-muted-foreground">
                    Press Enter to send, Shift+Enter for new line
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {input.length}/1000
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Workout Timer Modal */}
      <WorkoutTimer
        workoutPlan={todaysWorkout}
        onComplete={handleTimerComplete}
        onCancel={handleTimerCancel}
        isActive={showTimer}
      />

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <AnalyticsDashboard
          workoutData={stats?.recentWorkouts || []}
          streakData={stats?.streakHistory || []}
          timerData={timerData}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
}
"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import ChatMessage from "@/components/ChatMessage";
import FitnessSidebar from "@/components/FitnessSidebar";
import TomorrowSidebar from "@/components/TomorrowSidebar";
import QuickShortcuts from "@/components/QuickShortcuts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SkeletonChatList } from "@/components/SkeletonLoader";
import realTimeSync from "@/app/services/realTimeSync";
import { showActionToast } from "@/lib/toasts";

// Lazy-load heavy dashboard only when needed
const AnalyticsDashboard = dynamic(
  () => import("@/components/AnalyticsDashboard"),
  { ssr: false }
);

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [timerData, setTimerData] = useState([]);
  const [notificationService, setNotificationService] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // DEBUG: Track component lifecycle
  useEffect(() => {
    console.log(
      "FitMemory page mounted/remounted at:",
      new Date().toISOString()
    );
    return () =>
      console.log("FitMemory page unmounted at:", new Date().toISOString());
  }, []);

  // FIX: Single initialization with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let unsub = () => {};

    const boot = async () => {
      try {
        console.log("Starting FitMemory initialization...");

        // 1) Load messages first for fast UI
        if (!isMounted) return;
        const messagesRes = await fetch("/api/messages?limit=20", {
          cache: "no-store",
        });
        if (!isMounted) return;

        const messagesData = await messagesRes.json();
        if (isMounted) {
          setMessages(messagesData.messages || []);
          setInitialLoading(false);
          console.log("Messages loaded successfully");
        }

        // 2) Load stats separately to prevent race conditions
        if (!isMounted) return;
        try {
          const statsRes = await fetch("/api/stats", { cache: "no-store" });
          if (isMounted && statsRes.ok) {
            const statsData = await statsRes.json();
            setStats(statsData);
            console.log("Stats loaded successfully");
          }
        } catch (e) {
          console.warn("Stats load failed:", e);
        }

        // 3) Load remaining data
        if (!isMounted) return;
        try {
          const [todaysWorkoutRes, timerRes] = await Promise.all([
            fetch("/api/todaysWorkout", { cache: "no-store" }),
            fetch("/api/timer-data", { cache: "no-store" }),
          ]);

          if (isMounted) {
            if (todaysWorkoutRes.ok) {
              const todaysData = await todaysWorkoutRes.json();
              setTodaysWorkout(todaysData.workout);
              console.log("Todays workout loaded");
            }
            if (timerRes.ok) {
              const timerResData = await timerRes.json();
              setTimerData(timerResData.sessions || []);
              console.log("Timer data loaded");
            }
          }
        } catch (e) {
          console.warn("Secondary data load failed:", e);
        }

        // 4) Initialize realtime sync only once
        if (!isMounted) return;
        try {
          await realTimeSync.initialize();
          if (!isMounted) return;

          unsub = realTimeSync.subscribe(
            "stats",
            (data) => {
              if (isMounted) {
                console.log("Received realtime stats update");
                setStats((prev) => ({ ...prev, ...data }));
              }
            },
            "Home"
          );

          // Only refresh if data is stale
          const cachedStats = realTimeSync.getCachedData("stats");
          if (!cachedStats || realTimeSync.isDataStale("stats")) {
            realTimeSync.refreshData("stats", true);
          }
          console.log("RealTime sync initialized");
        } catch (e) {
          console.warn("RealTime sync failed:", e);
        }

        // 5) Lazy load notifications
        if (isMounted) {
          import("./services/notificationService")
            .then((m) => {
              if (isMounted) {
                setNotificationService(m.default);
                console.log("Notification service loaded");
              }
            })
            .catch(() => {});
        }

        console.log("FitMemory initialization complete");
      } catch (e) {
        console.error("FitMemory initialization error:", e);
        if (isMounted) {
          setInitialLoading(false);
          setMessages([
            {
              id: "error",
              role: "system",
              content:
                "Welcome to FitMemory! I'm having trouble loading your data, but I'm ready to help with your fitness and sleep journey.",
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      }
    };

    boot();

    // Cleanup function
    return () => {
      console.log("Cleaning up FitMemory page...");
      isMounted = false;
      try {
        unsub();
      } catch {}
    };
  }, []); // Empty dependency array - only run once

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const refreshStatsAndBroadcast = async () => {
    try {
      const res = await fetch("/api/stats", { cache: "no-store" });
      const fresh = await res.json();
      setStats(fresh);
      realTimeSync.broadcastDataChange("stats", fresh, "page-refresh");
    } catch (e) {
      console.warn("Stats refresh failed:", e);
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
    setMessages((p) => [...p, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const currentTime = {
        iso: new Date().toISOString(),
        timezone: "Asia/Kolkata",
        epochMs: Date.now(),
        display: new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      };
      const response = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, timestamp: currentTime }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send message");

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
        workoutLogged: data.workoutLogged,
        sleepLogged: data.sleepLogged,
        memoryStored: data.memoryStored,
        workout: data.workout,
        sleepSession: data.sleepSession,
        streakUpdate: data.streakUpdate,
      };
      setMessages((p) => [...p, assistantMessage]);

      // Toast confirmations
      if (data.sleepLogged) {
        if (data.sleepSession?.duration) {
          showActionToast({
            type: "sleep_updated",
            durationMin: data.sleepSession.duration,
          });
        } else {
          showActionToast({ type: "sleep_started" });
        }
      }
      if (data.workoutLogged)
        showActionToast({
          type: "workout_logged",
          exercises: data.workout?.exercises,
        });
      if (data.streakUpdate)
        showActionToast({
          type: "streak_incremented",
          currentStreak: data.streakUpdate.currentStreak,
        });
      if (data.actions?.some((a) => a.action === "memory_add")) {
        const m = data.actions.find((a) => a.action === "memory_add");
        showActionToast({ type: "memory_add", memoryType: m?.type });
      }

      // Refresh minimal
      if (data.workoutLogged || (data.sleepLogged && data.sleepSession)) {
        await refreshStatsAndBroadcast();
        if (data.workout && notificationService) {
          notificationService.workoutCompleted({
            totalDuration: data.workout.duration || 0,
            exercises: data.workout.exercises || [],
          });
        }
      }
    } catch (error) {
      setMessages((p) => [
        ...p,
        {
          id: (Date.now() + 2).toString(),
          role: "system",
          content:
            "Sorry, I'm having trouble responding right now. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };
  const insertQuickMessage = (message) => setInput(message);

  return (
    <>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full overflow-hidden bg-background">
          <FitnessSidebar
            stats={stats}
            onDataChange={refreshStatsAndBroadcast}
            onShowAnalytics={() => setShowAnalytics(true)}
          />
          <SidebarInset className="flex-1">
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="w-full max-w-4xl mx-auto space-y-4 px-4 py-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      👋
                    </div>
                    <h2 className="text-xl font-semibold mb-2">
                      Welcome to FitMemory!
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      I&apos;m your AI health coach. I can help you track
                      workouts, monitor sleep, create plans, and stay motivated
                      on your wellness journey.
                    </p>
                    <QuickShortcuts
                      onSelectShortcut={insertQuickMessage}
                      className="max-w-2xl mx-auto"
                    />
                  </div>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id || message._id}
                      message={message}
                    />
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <Card className="bg-card border">
                        <CardContent className="flex items-center space-x-2 p-4">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                            <div
                              className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground ml-2">
                            FitMemory is thinking...
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="w-full max-w-4xl mx-auto p-4">
                  {messages.length > 0 && (
                    <div className="mb-3">
                      <QuickShortcuts onSelectShortcut={insertQuickMessage} />
                    </div>
                  )}
                  <form onSubmit={handleSubmit}>
                    <Card className="border-2 border-border/50 focus-within:border-primary/50 focus-within:bg-card transition-all duration-200">
                      <CardContent className="p-3">
                        <div className="flex items-end gap-3">
                          <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about fitness, sleep, recovery, or your health goals..."
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
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-muted-foreground">
                            Press Enter to send, Shift+Enter for new line
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {input.length}/1000
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </form>
                </div>
              </div>
            </div>
          </SidebarInset>

          <TomorrowSidebar />

          {showAnalytics && (
            <AnalyticsDashboard
              onClose={() => setShowAnalytics(false)}
              workoutData={stats?.recentWorkouts || []}
              streakData={stats?.streakHistory || []}
              timerData={timerData}
            />
          )}
        </div>
      </SidebarProvider>
    </>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StreakDisplay from "./StreakDisplay";
import realTimeSync from "../services/realTimeSync";

export default function StatsSidebar({
  stats,
  patternSummary,
  todaysWorkout,
  onStartWorkout,
}) {
  const [showStreak, setShowStreak] = useState(true);
  const [realTimeStats, setRealTimeStats] = useState(stats);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribeStats = realTimeSync.subscribe(
      "stats",
      (data) => {
        setRealTimeStats(data);
      },
      "StatsSidebar"
    );

    const unsubscribeStreak = realTimeSync.subscribe(
      "streak",
      (data) => {
        setRealTimeStats((prev) => ({ ...prev, ...data }));
      },
      "StatsSidebar"
    );

    return () => {
      unsubscribeStats();
      unsubscribeStreak();
    };
  }, []);

  // Use real-time stats if available, fallback to props
  const currentStats = realTimeStats || stats;

  const formatTrend = (trend) => {
    const trendMap = {
      improving: "📈",
      declining: "📉",
      stable: "➡️",
    };
    return trendMap[trend] || "➡️";
  };

  const getDayOfWeek = () => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[new Date().getDay()];
  };

  const getTodayStatus = () => {
    const today = new Date().toDateString();
    const hasWorkoutToday =
      currentStats?.lastWorkoutDate &&
      new Date(currentStats.lastWorkoutDate).toDateString() === today;
    return hasWorkoutToday;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Streak Display */}
      <StreakDisplay
        currentStreak={currentStats?.dailyStreak || 0}
        longestStreak={currentStats?.longestStreak || 0}
        streakHistory={currentStats?.streakHistory || []}
        showNotifications={true}
      />

      {/* Quick Stats */}
      <div className="p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-xl font-bold text-primary">
              📅{" "}
              {currentStats?.weeklyCounts
                ? currentStats.weeklyCounts[3] || 0
                : 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">This Week</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <div className="text-xl font-bold text-primary">
              📊 {currentStats?.rollingAverage || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Week Avg</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted col-span-2">
            <div className="text-lg font-bold text-primary flex items-center justify-center gap-2">
              {formatTrend(currentStats?.trend)}
              <span className="text-sm">
                Trending {currentStats?.trend || "stable"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pattern Summary */}
      <div className="p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-3">Your Routine</h3>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm leading-relaxed">{patternSummary}</p>
        </div>
      </div>
    </div>
  );
}

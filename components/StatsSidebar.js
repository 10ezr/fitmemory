import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StreakDisplay from "./StreakDisplay";
import realTimeSync from "@/app/services/realTimeSync";

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

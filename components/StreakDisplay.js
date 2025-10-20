"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FlameIcon = ({ isAnimating, size = "text-2xl" }) => {
  const baseSize = size.includes("4xl")
    ? 4
    : size.includes("3xl")
    ? 3
    : size.includes("2xl")
    ? 2
    : 1;

  return (
    <div className={`${size} select-none relative`}>
      {/* Main flame */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={
          isAnimating
            ? {
                scale: [1, 1.05, 0.95, 1.02, 1],
                y: [0, -1, 0, -0.5, 0],
              }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: isAnimating ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        🔥
      </motion.div>

      {/* Flame flicker effect */}
      {isAnimating && (
        <>
          <motion.div
            className="absolute inset-0 flex items-center justify-center opacity-60"
            animate={{
              scale: [0.9, 1.1, 0.85, 1.05, 0.9],
              rotate: [0, 2, -1, 1, 0],
              y: [0, -2, 1, -1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          >
            🔥
          </motion.div>

          <motion.div
            className="absolute inset-0 flex items-center justify-center opacity-30"
            animate={{
              scale: [1.2, 0.8, 1.3, 0.9, 1.2],
              rotate: [0, -3, 2, -1, 0],
              y: [0, -3, 2, -1, 0],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.7,
            }}
          >
            🔥
          </motion.div>
        </>
      )}

      {/* Heat shimmer effect */}
      {isAnimating && (
        <motion.div
          className="absolute -inset-2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,165,0,0.1) 0%, rgba(255,69,0,0.05) 50%, transparent 70%)",
            filter: "blur(2px)",
          }}
          animate={{
            scale: [1, 1.1],
            opacity: [0.3, 0.5],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </div>
  );
};

const StreakGrid = ({ streak, maxDays = 30, streakHistory = [] }) => {
  const days = [];
  const today = new Date();

  for (let i = maxDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const isToday = i === 0;
    const dateString = date.toISOString().split("T")[0];
    const hasWorkout =
      streakHistory.some(
        (entry) => entry.date === dateString && entry.workoutCount > 0
      ) ||
      (i < streak && streak > 0); // Fallback to simple logic

    days.push({
      date,
      hasWorkout,
      isToday,
      dayOfWeek: date.getDay(),
      dateString,
    });
  }

  return (
    <div className="p-3 bg-gradient-to-br from-background to-muted/30 rounded-lg border">
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div
            key={index}
            className="text-xs text-center text-muted-foreground font-medium p-1"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.01, type: "spring", stiffness: 200 }}
            className={`
              aspect-square rounded-md border-2 relative overflow-hidden transition-all duration-300
              ${
                day.hasWorkout
                  ? "bg-gradient-to-br from-orange-400 to-red-500 border-orange-300 shadow-md shadow-orange-200/50"
                  : "bg-gradient-to-br from-muted to-muted/50 border-muted-foreground/20 hover:border-muted-foreground/40"
              }
              ${
                day.isToday
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                  : ""
              }
            `}
          >
            {/* Background glow for workout days */}
            {day.hasWorkout && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-orange-300/20 to-red-400/20 rounded-md"
                animate={{
                  opacity: [0.3, 0.6],
                  scale: [1, 1.05],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.1,
                }}
              />
            )}

            {/* Content */}
            {day.hasWorkout ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.02 + 0.2, type: "spring" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {day.isToday ? (
                  <FlameIcon size="text-xs" isAnimating={true} />
                ) : (
                  <motion.div
                    className="w-2 h-2 bg-white rounded-full shadow-sm"
                    whileHover={{ scale: 1.3 }}
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(255,255,255,0.7)",
                        "0 0 0 4px rgba(255,255,255,0)",
                      ],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: index * 0.1,
                    }}
                  />
                )}
              </motion.div>
            ) : (
              day.isToday && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ opacity: [0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                </motion.div>
              )
            )}

            {/* Today indicator */}
            {day.isToday && (
              <motion.div
                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <div className="w-1 h-1 bg-primary rounded-full" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default function StreakDisplay({
  currentStreak = 0,
  longestStreak = 0,
  streakHistory = [],
  onStreakUpdate,
  showNotifications = true,
  autoUpdate = true,
}) {
  const [displayStreak, setDisplayStreak] = useState(currentStreak);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [milestoneText, setMilestoneText] = useState("");

  const getMilestoneText = (streak) => {
    const messages = {
      3: "Great start! Keep it going! 💪",
      7: "One week strong! You're building a habit! 🌟",
      14: "Two weeks! You're on fire! 🚀",
      30: "One month streak! Absolutely incredible! 🏆",
      50: "50 days! You're a fitness legend! 👑",
      100: "100 days! This is extraordinary dedication! 🎯",
      365: "ONE YEAR! You are unstoppable! 🎉",
    };
    return messages[streak] || `${streak} days strong! Amazing! 🔥`;
  };

  const checkMilestone = useCallback(
    (streak) => {
      const milestones = [3, 7, 14, 30, 50, 100, 365];

      if (milestones.includes(streak)) {
        setMilestoneText(getMilestoneText(streak));
        setShowMilestone(true);

        if (
          showNotifications &&
          typeof window !== "undefined" &&
          "Notification" in window
        ) {
          new Notification(`🔥 ${streak} Day Streak!`, {
            body: getMilestoneText(streak),
            icon: "/icon-192x192.png",
          });
        }

        setTimeout(() => setShowMilestone(false), 4000);
      }
    },
    [showNotifications]
  );

  // Auto-update streak data periodically
  useEffect(() => {
    if (!autoUpdate) return;

    const updateStreakData = async () => {
      try {
        console.log("🔄 Checking for streak updates...");
        const response = await fetch("/api/stats");
        if (response.ok) {
          const stats = await response.json();
          console.log("📊 Current stats:", {
            dailyStreak: stats.dailyStreak,
            currentStreak,
            changed: stats.dailyStreak !== currentStreak,
          });

          if (stats.dailyStreak !== currentStreak) {
            console.log("🔥 Streak changed! Updating UI...");
            if (onStreakUpdate) {
              onStreakUpdate(stats);
            }
          }
        } else {
          console.error("❌ Failed to fetch stats:", response.status);
        }
      } catch (error) {
        console.error("❌ Error updating streak data:", error);
      }
    };

    // Check every 10 seconds for streak updates (more frequent)
    const interval = setInterval(updateStreakData, 10000);
    return () => clearInterval(interval);
  }, [currentStreak, autoUpdate, onStreakUpdate]);

  useEffect(() => {
    if (currentStreak !== displayStreak) {
      const isIncrease = currentStreak > displayStreak;
      setIsIncreasing(isIncrease);

      // Animate the counter
      const difference = Math.abs(currentStreak - displayStreak);
      const increment = isIncrease ? 1 : -1;
      const duration = Math.min(difference * 100, 1500);

      let current = displayStreak;
      const interval = setInterval(() => {
        current += increment;
        setDisplayStreak(current);

        if (current === currentStreak) {
          clearInterval(interval);
          setIsIncreasing(false);

          // Check for milestones
          if (isIncrease) {
            checkMilestone(current);
          }
        }
      }, duration / difference);

      return () => clearInterval(interval);
    }
  }, [currentStreak, displayStreak, checkMilestone]);

  const getStreakColor = () => {
    if (currentStreak >= 30) return "text-orange-500";
    if (currentStreak >= 14) return "text-yellow-500";
    if (currentStreak >= 7) return "text-blue-500";
    return "text-primary";
  };

  const getStreakMessage = () => {
    if (currentStreak === 0) return "Start your streak today!";
    if (currentStreak === 1) return "Great start! Keep going!";
    if (currentStreak < 7) return `${7 - currentStreak} more days to one week!`;
    if (currentStreak < 30)
      return `${30 - currentStreak} more days to one month!`;
    return "You're on an amazing streak!";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            Streak Tracker
            {currentStreak > 0 && (
              <Badge variant="outline" className="font-mono">
                Best: {longestStreak}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Streak Display */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <FlameIcon
                isAnimating={isIncreasing || currentStreak > 0}
                size="text-4xl"
              />

              <motion.div
                key={displayStreak}
                initial={isIncreasing ? { scale: 1.2 } : { scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className={`text-4xl font-bold ${getStreakColor()}`}
              >
                {displayStreak}
              </motion.div>
            </div>

            <p className="text-sm text-muted-foreground">
              {getStreakMessage()}
            </p>
          </div>

          {/* Streak Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                Last 30 Days
              </div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {streakHistory?.filter((entry) => entry.workoutCount > 0)
                  .length || 0}
                /{30} active
              </div>
            </div>
            <StreakGrid streak={currentStreak} streakHistory={streakHistory} />
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <motion.div
              className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                className="text-xl font-bold text-blue-600 dark:text-blue-400"
                key={
                  streakHistory?.filter((s) => s.workoutCount >= 7).length || 0
                }
                animate={{ scale: [1.2, 1] }}
                transition={{ duration: 0.3 }}
              >
                {Math.max(0, Math.floor((streakHistory?.length || 0) / 7))}
              </motion.div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Week+ Streaks
              </div>
            </motion.div>
            <motion.div
              className="text-center p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.div
                className="text-xl font-bold text-green-600 dark:text-green-400"
                key={
                  streakHistory?.reduce(
                    (sum, s) => sum + (s.workoutCount || 0),
                    0
                  ) || 0
                }
                animate={{ scale: [1.2, 1] }}
                transition={{ duration: 0.3 }}
              >
                {streakHistory?.reduce(
                  (sum, s) => sum + (s.workoutCount || 0),
                  0
                ) || 0}
              </motion.div>
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                Total Workouts
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Milestone Notification */}
      <AnimatePresence>
        {showMilestone && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Card className="shadow-xl border-2 border-primary bg-primary/5">
              <CardContent className="p-4 text-center">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <FlameIcon size="text-3xl" isAnimating={true} />
                </motion.div>
                <div className="font-bold text-primary text-lg">
                  {displayStreak} Day Streak!
                </div>
                <div className="text-sm text-muted-foreground">
                  {milestoneText}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

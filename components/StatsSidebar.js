"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Calendar,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import realTimeSync from "@/app/services/realTimeSync";

export default function StatsSidebar({ stats, onStartWorkout }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [realTimeStats, setRealTimeStats] = useState(stats);

  useEffect(() => {
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

  const currentStats = realTimeStats || stats;
  const currentStreak = currentStats?.dailyStreak || 0;
  const longestStreak = currentStats?.longestStreak || 0;
  const dailyGoal = 1;

  // Get actual workout history for the week
  const getWeekWorkoutStatus = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const weekStatus = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = days[date.getDay()];

      let hasWorkout = false;
      let isToday = date.toDateString() === today.toDateString();

      if (currentStats?.lastWorkoutDate) {
        const lastWorkoutDate = new Date(currentStats.lastWorkoutDate);
        if (date.toDateString() === lastWorkoutDate.toDateString()) {
          hasWorkout = true;
        }
      }

      if (currentStreak > 0 && i < currentStreak) {
        hasWorkout = true;
      }

      weekStatus.push({
        day: dayName,
        date: date,
        hasWorkout,
        isToday,
        dayIndex: i,
      });
    }
    return weekStatus;
  };

  const weekDays = getWeekWorkoutStatus();
  const completedThisWeek = weekDays.filter((day) => day.hasWorkout).length;
  const weeklyGoal = 7;
  const weekProgress = (completedThisWeek / weeklyGoal) * 100;

  return (
    <>
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? "64px" : "320px",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden md:flex flex-col bg-background/50 backdrop-blur-sm border-r border-border/50 overflow-hidden relative"
      >
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-4 right-3 z-10 h-8 w-8 p-0 hover:bg-accent"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Two Shorter Boxes */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Current Streak Box */}
                  <Card className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-black border-0 relative overflow-hidden">
                    <CardContent className="p-4 relative z-10">
                      <div className="text-2xl font-bold mb-1">
                        {currentStreak}
                      </div>
                      <div className="text-xs font-medium opacity-80">
                        Streak Days
                      </div>
                    </CardContent>
                    {/* Big Flame Behind Text */}
                    <div className="absolute bottom-0 right-0 opacity-20 z-0">
                      <Flame className="h-16 w-16 text-orange-600 transform translate-x-2 translate-y-2" />
                    </div>
                  </Card>

                  {/* Best Streak Box */}
                  <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white border-0 relative overflow-hidden">
                    <CardContent className="p-4 relative z-10">
                      <div className="text-2xl font-bold mb-1">
                        {longestStreak}
                      </div>
                      <div className="text-xs font-medium opacity-80">
                        Best Streak
                      </div>
                    </CardContent>
                    {/* Big Trophy Behind Text */}
                    <div className="absolute bottom-0 right-0 opacity-20 z-0">
                      <svg
                        className="h-16 w-16 transform translate-x-2 translate-y-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M7 4V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h4a1 1 0 0 1 1 1v5a3 3 0 0 1-3 3v2a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-2a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1h4zM9 3v1h6V3H9zM3 6v4a1 1 0 0 0 1 1h1V6H3zm4 0v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6H7zm10 5h1a1 1 0 0 0 1-1V6h-2v5z" />
                      </svg>
                    </div>
                  </Card>
                </div>

                {/* Daily Goal Card */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">Daily Goal</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {completedThisWeek}/{weeklyGoal}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <Progress value={weekProgress} className="h-2 bg-muted" />
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {Math.round(weekProgress)}% weekly goal
                      </p>
                    </div>

                    {/* Week Days Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((day, index) => {
                        const isActive = day.hasWorkout;
                        const isMissed =
                          !day.hasWorkout &&
                          day.date < new Date() &&
                          !day.isToday;

                        return (
                          <div
                            key={index}
                            className="flex flex-col items-center space-y-1"
                          >
                            <span className="text-xs font-medium text-muted-foreground">
                              {day.day}
                            </span>
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
                                {
                                  "bg-green-500 text-white shadow-md": isActive,
                                  "bg-red-100 text-red-500 border-2 border-red-200":
                                    isMissed,
                                  "bg-blue-500 text-white animate-pulse shadow-lg":
                                    day.isToday && !isActive,
                                  "bg-muted text-muted-foreground":
                                    !isActive && !isMissed && !day.isToday,
                                }
                              )}
                            >
                              {isActive ? (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="text-sm"
                                >
                                  ✓
                                </motion.span>
                              ) : isMissed ? (
                                "✗"
                              ) : day.isToday ? (
                                <Calendar className="h-3 w-3" />
                              ) : (
                                "○"
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Start Workout Button */}
                <Button
                  onClick={onStartWorkout}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  <Flame className="mr-2 h-4 w-4" />
                  Start Today&apos;s Workout
                </Button>

                {/* Quick Stats */}
                <Card className="bg-card/30 backdrop-blur-sm border-border/30">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">
                          {currentStats?.weeklyCounts
                            ? currentStats.weeklyCounts[3] || 0
                            : 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          This Week
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">
                          {currentStats?.totalWorkouts || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center space-y-3 pt-8"
              >
                {/* Mini Two Boxes */}
                <div className="space-y-2">
                  <div className="w-10 h-8 rounded bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-black font-bold text-sm relative overflow-hidden">
                    <span className="relative z-10">{currentStreak}</span>
                    <Flame className="absolute bottom-0 right-0 h-6 w-6 opacity-20 text-orange-600" />
                  </div>
                  <div className="w-10 h-8 rounded bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm relative overflow-hidden">
                    <span className="relative z-10">{longestStreak}</span>
                  </div>
                </div>

                {/* Mini Progress Ring */}
                <div className="relative w-10 h-10">
                  <svg
                    className="w-10 h-10 transform -rotate-90"
                    viewBox="0 0 36 36"
                  >
                    <path
                      d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-muted stroke-current opacity-20"
                    />
                    <path
                      d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${weekProgress}, 100`}
                      className="text-blue-500 stroke-current"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    {completedThisWeek}
                  </div>
                </div>

                {/* Mini Week Status */}
                <div className="flex flex-col space-y-1">
                  {weekDays.slice(-3).map((day, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all duration-200",
                        {
                          "bg-green-500 text-white": day.hasWorkout,
                          "bg-blue-500 text-white animate-pulse":
                            day.isToday && !day.hasWorkout,
                          "bg-red-100 border border-red-300":
                            !day.hasWorkout &&
                            day.date < new Date() &&
                            !day.isToday,
                          "bg-muted":
                            !day.hasWorkout &&
                            !day.isToday &&
                            day.date >= new Date(),
                        }
                      )}
                    >
                      {day.hasWorkout ? "✓" : day.isToday ? "•" : "○"}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsCollapsed(true)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

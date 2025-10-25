"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Target,
  XCircle,
  Circle,
  CalendarDays,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import realTimeSync from "@/app/services/realTimeSync";
import { WeeklyGoalsChart } from "@/components/ui/weekly-goals-chart";

export default function StatsSidebar({ stats }) {
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

  // Compute weekly progress
  const weeklyGoal = 7;
  const workoutsCompleted = useMemo(() => {
    // Prefer stats.weeklyCounts if present (array of 7 days)
    if (Array.isArray(currentStats?.weeklyCounts)) {
      return currentStats.weeklyCounts.reduce((a, b) => a + (b || 0), 0);
    }
    // Fallback: infer from streak min(7, currentStreak)
    return Math.min(weeklyGoal, currentStreak);
  }, [currentStats, currentStreak]);

  // Build month grid
  const monthData = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11

    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Start weekday (0=Sun..6=Sat) of 1st day
    const firstWeekday = new Date(year, month, 1).getDay();

    // A helper set of completion dates (YYYY-MM-DD) if available later
    const completedDates = new Set();
    // If you later provide explicit history, populate completedDates here

    const cells = [];

    // Leading empty cells (for alignment under Sun..Sat)
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ type: "empty", key: `lead-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      const isToday = dateObj.toDateString() === today.toDateString();
      const inPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Status rules
      const completed = completedDates.has(key);
      const missed = inPast && !completed && !isToday;
      const upcoming = !inPast && !completed && !isToday;

      cells.push({
        type: "day",
        key,
        day: d,
        isToday,
        completed,
        missed,
        upcoming,
      });
    }

    return { daysInMonth, firstWeekday, cells };
  }, [realTimeStats]);

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? "64px" : "320px" }}
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
                {/* Top Row: Streak (square) + Weekly Goal Radial */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Streak - square tile */}
                  <Card className="border bg-card text-card-foreground rounded-md">
                    <CardContent className="p-4">
                      <div className="text-3xl font-bold leading-none">{currentStreak}</div>
                      <div className="text-xs text-muted-foreground mt-1">Streak Days</div>
                    </CardContent>
                  </Card>

                  {/* Weekly Goal Radial */}
                  <Card className="border bg-card text-card-foreground">
                    <CardHeader className="pb-1 pt-3 px-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" /> Weekly Goal
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <WeeklyGoalsChart
                        workoutsCompleted={workoutsCompleted}
                        weeklyGoal={weeklyGoal}
                        className="pt-1"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Month Grid */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" /> This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Weekday header */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                        <div key={d} className="text-[11px] text-muted-foreground text-center">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {monthData.cells.map((cell) => {
                        if (cell.type === 'empty') {
                          return <div key={cell.key} />
                        }
                        const stateClass = cell.completed
                          ? 'bg-green-500 text-white border-green-600'
                          : cell.missed
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : cell.isToday
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-muted text-muted-foreground border-border/50'

                        const Icon = cell.completed
                          ? CheckCircle2
                          : cell.missed
                          ? XCircle
                          : cell.isToday
                          ? Target
                          : Circle

                        return (
                          <div key={cell.key} className="flex flex-col items-center gap-1">
                            <div
                              className={cn(
                                'w-9 h-9 rounded-md border flex items-center justify-center text-xs font-semibold',
                                stateClass
                              )}
                              aria-label={`${cell.day} ${cell.completed ? 'completed' : cell.missed ? 'missed' : cell.isToday ? 'today' : 'upcoming'}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="text-[11px] text-muted-foreground">{cell.day}</div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats (kept) */}
                <Card className="bg-card/30 backdrop-blur-sm border-border/30">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">
                          {currentStats?.weeklyCounts
                            ? currentStats.weeklyCounts.reduce((a,b)=>a+(b||0),0)
                            : workoutsCompleted}
                        </div>
                        <div className="text-xs text-muted-foreground">This Week</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">
                          {currentStats?.totalWorkouts || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Total</div>
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
                <div className="space-y-2">
                  <div className="w-10 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm relative overflow-hidden">
                    <span className="relative z-10">{currentStreak}</span>
                  </div>
                  <div className="relative w-10 h-10 rounded bg-card border flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                </div>

                {/* Minimal month cue */}
                <div className="grid grid-cols-3 gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-3 h-3 rounded bg-muted" />
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

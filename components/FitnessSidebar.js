"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Circle,
  Trophy,
  Flame,
  BarChart3,
  Settings2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import realTimeSync from "@/app/services/realTimeSync";
import AdminPanel from "@/components/AdminPanel";

export default function FitnessSidebar({ 
  stats, 
  onDataChange,
  onShowAnalytics 
}) {
  const [realTimeStats, setRealTimeStats] = useState(stats);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // derive stats with real-time wiring
  useEffect(() => {
    const unsubscribeStats = realTimeSync.subscribe(
      "stats",
      (data) => setRealTimeStats((prev)=> ({ ...prev, ...data })),
      "FitnessSidebar"
    );
    const unsubscribeStreak = realTimeSync.subscribe(
      "streak",
      (data) => setRealTimeStats((prev) => ({ ...prev, ...data })),
      "FitnessSidebar"
    );
    return () => { unsubscribeStats(); unsubscribeStreak(); };
  }, []);

  const current = realTimeStats || stats || {};
  const currentStreak = Number(current.dailyStreak || 0);
  const totalWorkouts = Number(current.totalWorkouts || 0);
  const weeklyCount = Array.isArray(current.weeklyCounts)
    ? current.weeklyCounts.reduce((a,b)=> a + (b||0), 0)
    : 0;

  // 30-day challenge model
  const challengeTarget = 30;
  // Optional: accept an explicit challengeProgress array of last 30 days booleans/dates from API in future
  const challengeDays = useMemo(()=>{
    // Build last 30 days, newest at end
    const days = [];
    const today = new Date();
    for (let i = challengeTarget - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0,10);
      // If backend starts sending explicit completion dates, check here
      const completed = Boolean(current?.recentCompletionDates?.includes?.(key));
      // Fallback: approximate with streak (marks last `currentStreak` days as done)
      const completedFallback = (challengeTarget - 1 - i) < currentStreak;
      const isToday = i === 0;
      days.push({ key, dayNum: d.getDate(), completed: completed || completedFallback, isToday });
    }
    return days;
  }, [current?.recentCompletionDates, currentStreak]);

  const challengeCompletedCount = challengeDays.filter(d=>d.completed).length;
  const challengeDone = challengeCompletedCount >= challengeTarget;

  return (
    <Sidebar 
      side="left" 
      className="border-r border-neutral-900/10 dark:border-neutral-900"
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-neutral-900/10 dark:border-neutral-900">
        <div className="flex items-center justify-between px-2 py-1">
          {!isCollapsed && (
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Overview
            </div>
          )}
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={onShowAnalytics}
                  title="Analytics"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-0">
                    <div className="border-b px-3 py-2 text-sm font-medium">Settings</div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <AdminPanel onDataChange={onDataChange} />
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
            <SidebarTrigger className="h-8 w-8" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 space-y-4 overflow-y-auto scrollbar-hide">
        <SidebarGroup>
          <SidebarGroupContent>
            {!isCollapsed ? (
              <div className="space-y-4">
                {/* Streak Hero */}
                <Card className="border border-neutral-900/10 dark:border-neutral-900 bg-card text-card-foreground rounded-md">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Flame className="h-5 w-5 text-primary" />
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Current Streak</span>
                    </div>
                    <div className="text-5xl font-extrabold leading-none text-neutral-900 dark:text-neutral-100">
                      {currentStreak}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">days in a row</div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border border-neutral-900/10 dark:border-neutral-900 bg-card/30 backdrop-blur-sm">
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-primary">{weeklyCount}</div>
                      <div className="text-xs text-muted-foreground">This Week</div>
                    </CardContent>
                  </Card>
                  <Card className="border border-neutral-900/10 dark:border-neutral-900 bg-card/30 backdrop-blur-sm">
                    <CardContent className="p-4 text-center">
                      <div className="text-xl font-bold text-primary">{totalWorkouts}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </CardContent>
                  </Card>
                </div>

                {/* 30-Day Challenge */}
                <Card className="bg-card/50 backdrop-blur-sm border-neutral-900/10 dark:border-neutral-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                      <Trophy className="h-4 w-4 text-primary" /> 30-Day Challenge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-muted-foreground">Progress</div>
                      <div className={cn("text-xs font-medium", challengeDone ? "text-green-500" : "text-primary")}> 
                        {challengeCompletedCount}/{challengeTarget}
                      </div>
                    </div>

                    {/* Grid: 6 columns x 5 rows = 30 */}
                    <div className="grid grid-cols-6 gap-2">
                      {challengeDays.map((cell, idx) => {
                        const stateClass = cell.completed
                          ? "bg-green-500 text-white border-green-600"
                          : cell.isToday
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground border-border/50";

                        const Icon = cell.completed ? CheckCircle2 : (cell.isToday ? Flame : Circle);

                        return (
                          <div key={cell.key} className="flex flex-col items-center gap-1">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-md border flex items-center justify-center text-xs font-semibold hover:scale-105 transition-transform",
                                stateClass
                              )}
                              aria-label={`Day ${idx+1} ${cell.completed ? "completed" : (cell.isToday ? "today" : "pending")}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="text-[10px] text-muted-foreground font-medium">
                              {cell.dayNum}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Collapsed view
              <div className="flex flex-col items-center space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="w-12 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    <span>{currentStreak}</span>
                  </div>
                  <div className="w-12 h-10 rounded-lg bg-card border border-neutral-900/10 dark:border-neutral-900 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-3.5 h-3.5 rounded bg-muted" />
                  ))}
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-900/10 dark:border-neutral-900 px-4 py-3">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground">FitMemory</div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

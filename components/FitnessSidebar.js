"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Circle,
  Trophy,
  Flame,
  BarChart3,
  Settings2,
  Clock,
  Calendar,
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

// Keys we actually render that should gate re-renders
const RENDER_KEYS = ["dailyStreak", "totalWorkouts", "weeklyCounts"];

function shallowEqualKeys(a = {}, b = {}, keys = []) {
  for (const k of keys) {
    const va = a?.[k];
    const vb = b?.[k];
    if (Array.isArray(va) && Array.isArray(vb)) {
      if (va.length !== vb.length) return false;
      for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return false;
    } else if (va !== vb) {
      return false;
    }
  }
  return true;
}

function FitnessSidebar({ stats, onDataChange, onShowAnalytics }) {
  const [realTimeStats, setRealTimeStats] = useState(stats);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // time/date state – minute-level updates to avoid per-second rerenders
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const now = new Date();
    setCurrentTime(now);

    // align to next minute
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    let intervalId;
    const timeoutId = setTimeout(() => {
      setCurrentTime(new Date());
      intervalId = setInterval(() => setCurrentTime(new Date()), 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // real-time subscriptions with equality guard to prevent redundant updates
  useEffect(() => {
    const applyUpdate = (incoming) => {
      setRealTimeStats((prev) => {
        const next = { ...(prev || {}), ...(incoming || {}) };
        return shallowEqualKeys(prev || {}, next, RENDER_KEYS) ? prev : next;
      });
    };

    const unsubscribeStats = realTimeSync.subscribe("stats", applyUpdate, "FitnessSidebar");
    const unsubscribeStreak = realTimeSync.subscribe("streak", applyUpdate, "FitnessSidebar");
    return () => {
      unsubscribeStats();
      unsubscribeStreak();
    };
  }, []);

  const current = realTimeStats || stats || {};

  const currentStreak = useMemo(() => Number(current.dailyStreak || 0), [current.dailyStreak]);
  const totalWorkouts = useMemo(() => Number(current.totalWorkouts || 0), [current.totalWorkouts]);
  const weeklyCount = useMemo(() => {
    const wc = current.weeklyCounts;
    if (!Array.isArray(wc)) return 0;
    let sum = 0;
    for (let i = 0; i < wc.length; i++) sum += wc[i] || 0;
    return sum;
  }, [Array.isArray(current.weeklyCounts) ? current.weeklyCounts.join(",") : ""]);

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // countdown – recompute on minute change only
  const countdown = useMemo(() => {
    const now = currentTime || new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = Math.max(0, tomorrow.getTime() - now.getTime());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  }, [mounted ? currentTime.getHours() : 0, mounted ? currentTime.getMinutes() : 0]);

  return (
    <Sidebar side="left" className="border-r border-neutral-900/10 dark:border-neutral-900" collapsible="icon">
      <SidebarHeader className="border-b border-neutral-900/10 dark:border-neutral-900">
        <div className="flex items-center justify-between px-2 py-1">
          {!isCollapsed && (
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Overview</div>
          )}
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShowAnalytics} title="Analytics">
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
                    <div className="text-5xl font-extrabold leading-none text-neutral-900 dark:text-neutral-100">{currentStreak}</div>
                    <div className="text-sm text-muted-foreground mt-1">days in a row</div>
                  </CardContent>
                </Card>

                {/* Time & Date Card */}
                <Card className="border border-neutral-900/10 dark:border-neutral-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                      <Clock className="h-4 w-4 text-primary" /> Current Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tracking-wider" suppressHydrationWarning>
                        {mounted && currentTime ? formatTime(currentTime) : "--:--"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-medium" suppressHydrationWarning>
                        {mounted && currentTime ? formatDate(currentTime) : ""}
                      </div>
                    </div>
                    <div className="border-t border-neutral-900/10 dark:border-neutral-900 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">Until Tomorrow</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Hours", value: countdown.hours },
                          { label: "Minutes", value: countdown.minutes },
                          { label: "Seconds", value: 0 }, // fixed 00 to avoid per-second rerenders
                        ].map((b) => (
                          <div key={b.label} className="bg-card/50 border border-neutral-900/10 dark:border-neutral-900 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-primary font-mono">{String(b.value).padStart(2, "0")}</div>
                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{b.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
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
              </div>
            ) : (
              // Collapsed view
              <div className="flex flex-col items-center space-y-4 pt-6">
                <div className="w-12 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm font-mono" suppressHydrationWarning>
                  {mounted && currentTime
                    ? currentTime.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })
                    : "--:--"}
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-900/10 dark:border-neutral-900 px-4 py-3">
        {!isCollapsed && <div className="text-xs text-muted-foreground">FitMemory</div>}
      </SidebarFooter>
    </Sidebar>
  );
}

export default React.memo(FitnessSidebar, (prev, next) =>
  shallowEqualKeys(prev.stats || {}, next.stats || {}, RENDER_KEYS) &&
  prev.onDataChange === next.onDataChange &&
  prev.onShowAnalytics === next.onShowAnalytics
);

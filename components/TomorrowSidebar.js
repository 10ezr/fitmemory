"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Clock,
  Target,
  Trophy,
  CheckCircle2,
  Circle,
  Calendar as CalendarIcon,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import realTimeSync from "@/app/services/realTimeSync";

export default function TomorrowSidebar() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Streak + Calendar state
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthData, setMonthData] = useState(null);
  const [goals, setGoals] = useState(null);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);

  // timers/flags
  const warningTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const lastFetchedRef = useRef(0);
  const monthFetchInFlight = useRef(false);
  const goalsFetchInFlight = useRef(false);
  const planFetchInFlight = useRef(false);
  const retryCountRef = useRef(0);

  const fetchPlan = useCallback(async (bg = false, forceRefresh = false) => {
    try {
      if (planFetchInFlight.current && !forceRefresh) return;
      planFetchInFlight.current = true;

      if (!bg) setLoading(true);
      setError(null);

      console.log("[TomorrowSidebar] Fetching plan, force:", forceRefresh);

      // Use POST for force refresh, GET for normal fetch
      const method = forceRefresh ? "POST" : "GET";
      const url = "/api/tomorrow-workout-ai";

      let res;
      try {
        res = await fetch(url, {
          method,
          cache: "no-store",
          headers: forceRefresh ? { "Content-Type": "application/json" } : {},
        });
      } catch (fetchError) {
        console.error("[TomorrowSidebar] Network error:", fetchError);
        throw new Error("Network connection failed");
      }

      const json = await res.json();

      if (res.ok) {
        console.log("[TomorrowSidebar] Plan fetched successfully:", {
          source: json.source,
          dayName: json.dayName,
          exerciseCount: json.workout?.exercises?.length || 0,
        });

        setData(json);
        setLastRefresh(new Date());
        retryCountRef.current = 0;
      } else {
        console.error("[TomorrowSidebar] API error:", json);
        const errorMsg = json.error || "Failed to load workout plan";

        // Show debug info for parsing errors
        if (json.debug) {
          console.log("[TomorrowSidebar] Debug info:", json.debug);
        }

        setError(errorMsg);

        // Auto-retry for certain errors
        if (errorMsg.includes("parse") && retryCountRef.current < 2) {
          retryCountRef.current++;
          console.log(
            `[TomorrowSidebar] Retrying parse error (${retryCountRef.current}/2)`
          );
          setTimeout(() => fetchPlan(true, true), 2000);
        }
      }
    } catch (e) {
      console.error("[TomorrowSidebar] Fetch error:", e);
      setError(e.message || "Failed to load workout plan");
    } finally {
      planFetchInFlight.current = false;
      if (!bg) setLoading(false);
    }
  }, []);

  const fetchMonth = useCallback(
    async (bg = false) => {
      try {
        if (monthFetchInFlight.current) return;
        monthFetchInFlight.current = true;
        if (!bg) setMonthLoading(true);
        const res = await fetch(`/api/month-streak?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (JSON.stringify(json) !== JSON.stringify(monthData))
          setMonthData(json);
      } catch (e) {
        console.error("[TomorrowSidebar] Month fetch error:", e);
      } finally {
        monthFetchInFlight.current = false;
        if (!bg) setMonthLoading(false);
      }
    },
    [monthData]
  );

  const fetchGoals = useCallback(
    async (bg = false) => {
      try {
        if (goalsFetchInFlight.current) return;
        goalsFetchInFlight.current = true;
        if (!bg) setGoalsLoading(true);
        const res = await fetch(`/api/goals?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (JSON.stringify(json) !== JSON.stringify(goals)) setGoals(json);
      } catch (e) {
        console.error("[TomorrowSidebar] Goals fetch error:", e);
      } finally {
        goalsFetchInFlight.current = false;
        if (!bg) setGoalsLoading(false);
      }
    },
    [goals]
  );

  const setGoalTarget = useCallback(
    async (targetDays) => {
      try {
        setSavingGoal(true);
        // optimistic update
        setGoals((prev) => {
          const current = prev?.progress?.current || 0;
          return {
            goals: {
              ...(prev?.goals || {}),
              type: "streak",
              targetDays,
              active: true,
            },
            progress: {
              current,
              target: targetDays,
              progressPct: Math.max(
                0,
                Math.min(100, Math.round((current / targetDays) * 100))
              ),
            },
          };
        });
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "streak", targetDays, active: true }),
        });
        await fetchGoals(true);
      } finally {
        setSavingGoal(false);
      }
    },
    [fetchGoals]
  );

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPlan(false, true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPlan]);

  const scheduleWarning = useCallback((warningAtISO) => {
    try {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      if (!warningAtISO) return;
      const warnAt = new Date(warningAtISO).getTime();
      const ms = warnAt - Date.now();
      if (ms > 0) {
        warningTimerRef.current = setTimeout(() => {
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("Streak at risk", {
              body: "2 hours until reset. Don't lose your streak!",
              icon: "/icon-192x192.png",
            });
          }
        }, ms);
      }
    } catch (e) {
      console.error("[TomorrowSidebar] Warning schedule error:", e);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchedRef.current < 800) return;
    lastFetchedRef.current = now;
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(async () => {
      refreshTimerRef.current = null;
      await Promise.all([fetchPlan(true), fetchMonth(true), fetchGoals(true)]);
    }, 250);
  }, [fetchPlan, fetchMonth, fetchGoals]);

  useEffect(() => {
    // Initial load
    fetchPlan();
    fetchMonth();
    fetchGoals();

    // Set up warning notification
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);
    const warnAt = new Date(nextMidnight.getTime() - 2 * 60 * 60 * 1000);
    scheduleWarning(warnAt.toISOString());

    // Subscribe to real-time updates
    const unsubStats = realTimeSync.subscribe(
      "stats",
      scheduleRefresh,
      "TomorrowSidebar"
    );
    const unsubStreak = realTimeSync.subscribe(
      "streak",
      scheduleRefresh,
      "TomorrowSidebar"
    );
    const unsubWorkout = realTimeSync.subscribe?.(
      "workout-completed",
      () => {
        console.log("[TomorrowSidebar] Workout completed, refreshing plan");
        scheduleRefresh();
      },
      "TomorrowSidebar"
    );

    return () => {
      unsubStats();
      unsubStreak();
      unsubWorkout && unsubWorkout();
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchPlan, fetchMonth, fetchGoals, scheduleRefresh, scheduleWarning]);

  // memo values
  const monthName = monthData?.month || "";
  const year = monthData?.year || "";
  const days = useMemo(() => monthData?.days || [], [monthData?.days]);
  const goalProgressPct = useMemo(
    () => goals?.progress?.progressPct || 0,
    [goals?.progress?.progressPct]
  );
  const goalCurrent = useMemo(
    () => goals?.progress?.current || 0,
    [goals?.progress?.current]
  );
  const goalTarget = useMemo(
    () => goals?.progress?.target || 30,
    [goals?.progress?.target]
  );
  const weekDayLabels = useMemo(
    () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    []
  );
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const firstWeekday = firstOfMonth.getDay();
    const leadingBlanks = Array.from({ length: firstWeekday }, () => ({
      blank: true,
    }));
    return [
      ...leadingBlanks,
      ...(days || []).map((d) => ({ ...d, blank: false })),
    ];
  }, [days]);

  // Format tomorrow's date nicely
  const tomorrowDate = useMemo(() => {
    if (!data?.dayName) return "Tomorrow";
    const date = new Date(data.date);
    return `${data.dayName}, ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }, [data]);

  return (
    <aside className="flex w-80 xl:w-96 flex-col border-l border-neutral-900/10 dark:border-neutral-900 bg-background">
      <div className="p-4 space-y-4 h-[100svh] overflow-y-auto scrollbar-hide">
        {/* Tomorrow's Workout (AI) */}
        <Card className="border bg-neutral-900/90 border-neutral-900/10 dark:border-neutral-900">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-sm">Tomorrow's Workout</span>
              </div>
              <div className="flex items-center gap-1">
                {lastRefresh && (
                  <span className="text-xs text-muted-foreground">
                    {lastRefresh.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={refreshing || loading}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </CardTitle>
            {data?.dayName && (
              <div className="text-xs text-muted-foreground">
                {tomorrowDate}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ) : error ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Error: {error}</span>
                </div>
                {error.includes("parse") && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    AI response parsing failed. This usually resolves with a
                    refresh.
                  </div>
                )}
                <Button
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  {refreshing ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>Try Again</>
                  )}
                </Button>
              </div>
            ) : !data?.workout ? (
              <div className="text-center py-4">
                <div className="text-muted-foreground text-sm">
                  No workout data available
                </div>
                <Button
                  onClick={handleManualRefresh}
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  Load Workout
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    {data.workout.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      {data.workout.estimatedDuration} min
                    </Badge>
                    {data.source && (
                      <Badge variant="outline" className="text-xs">
                        {data.source === "ai-generated"
                          ? "Fresh AI"
                          : data.source === "cache"
                          ? "Cached"
                          : data.source === "context-stable"
                          ? "Stable"
                          : data.source}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Exercises ({data.workout.exercises?.length || 0})
                  </h4>
                  <div className="space-y-1">
                    {(data.workout.exercises || []).map((ex, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <span className="text-sm font-medium">{ex.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {ex.sets}×{ex.reps}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Streak Goal */}
        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Streak Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {goalsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-2 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">Progress</div>
                  <div className="text-xs font-medium text-primary">
                    {goalCurrent}/{goalTarget}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${goalProgressPct}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center mt-1">
                  {goalProgressPct}% Complete
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[7, 30, 75].map((d) => (
                    <button
                      key={d}
                      onClick={() => setGoalTarget(d)}
                      disabled={savingGoal}
                      className={`text-xs py-1 rounded-md border ${
                        goalTarget === d
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border/50"
                      } hover:opacity-90`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Monthly Streak Calendar */}
        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> {monthName}{" "}
              {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {monthLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(28)].map((_, i) => (
                    <Skeleton key={i} className="w-9 h-9 rounded-md" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {weekDayLabels.map((wd) => (
                    <div
                      key={wd}
                      className="text-[10px] text-muted-foreground text-center font-medium"
                    >
                      {wd}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {(calendarCells || []).map((cell, idx) => {
                    if (cell.blank) return <div key={`b-${idx}`} />;
                    const isToday = todayIso === cell.date;
                    const inPast = new Date(cell.date) < new Date(todayIso);
                    const missed = inPast && !cell.completed;
                    const stateClass = cell.completed
                      ? "bg-green-500 text-white border-green-600"
                      : isToday
                      ? "bg-primary/15 text-primary border-primary/30"
                      : missed
                      ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
                      : "bg-muted text-muted-foreground border-border/50";
                    const Icon = cell.completed
                      ? CheckCircle2
                      : missed
                      ? AlertCircle
                      : Circle;
                    return (
                      <div
                        key={cell.date}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className={`w-9 h-9 rounded-md border flex items-center justify-center text-[11px] font-semibold transition-all hover:scale-105 ${stateClass}`}
                          title={`${cell.date} ${
                            cell.completed
                              ? "✓ Completed"
                              : missed
                              ? "Missed"
                              : isToday
                              ? "Today"
                              : "Not completed"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium">
                          {new Date(cell.date).getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {(days || []).filter((d) => d.completed).length} of{" "}
                  {(days || []).length} days completed this month
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

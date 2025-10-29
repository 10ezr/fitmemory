"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Clock, Target, Trophy, CheckCircle2, Circle, Calendar as CalendarIcon } from "lucide-react";
import realTimeSync from "@/app/services/realTimeSync";

export default function TomorrowSidebar() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Month streak + goals
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthData, setMonthData] = useState(null);
  const [goals, setGoals] = useState(null);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);

  const warningTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const lastFetchedRef = useRef(0);
  const monthFetchInFlight = useRef(false);
  const goalsFetchInFlight = useRef(false);
  const planFetchInFlight = useRef(false);

  const fetchPlan = useCallback(async (bg = false) => {
    try {
      if (planFetchInFlight.current) return;
      planFetchInFlight.current = true;
      if (!bg) setLoading(true);
      setError(null);
      const res = await fetch("/api/tomorrow-workout", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error || "Failed to load");
    } catch (e) {
      setError(e.message);
    } finally {
      planFetchInFlight.current = false;
      if (!bg) setLoading(false);
    }
  }, []);

  const fetchMonth = useCallback(async (bg = false) => {
    try {
      if (monthFetchInFlight.current) return;
      monthFetchInFlight.current = true;
      if (!bg) setMonthLoading(true);
      const res = await fetch(`/api/month-streak?ts=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (JSON.stringify(json) !== JSON.stringify(monthData)) setMonthData(json);
    } finally {
      monthFetchInFlight.current = false;
      if (!bg) setMonthLoading(false);
    }
  }, [monthData]);

  const fetchGoals = useCallback(async (bg = false) => {
    try {
      if (goalsFetchInFlight.current) return;
      goalsFetchInFlight.current = true;
      if (!bg) setGoalsLoading(true);
      const res = await fetch(`/api/goals?ts=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (JSON.stringify(json) !== JSON.stringify(goals)) setGoals(json);
    } finally {
      goalsFetchInFlight.current = false;
      if (!bg) setGoalsLoading(false);
    }
  }, [goals]);

  const setGoalTarget = useCallback(
    async (targetDays) => {
      try {
        setSavingGoal(true);
        // Optimistic UI update
        setGoals((prev) => {
          const current = prev?.progress?.current || 0;
          return {
            goals: { ...(prev?.goals || {}), type: "streak", targetDays, active: true },
            progress: {
              current,
              target: targetDays,
              progressPct: Math.max(0, Math.min(100, Math.round((current / targetDays) * 100))),
            },
          };
        });
        await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "streak", targetDays, active: true }) });
        await fetchGoals(true);
      } finally {
        setSavingGoal(false);
      }
    },
    [fetchGoals]
  );

  // Warning (unchanged)
  const scheduleWarning = useCallback((warningAtISO) => {
    try {
      if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null; }
      if (!warningAtISO) return;
      const warnAt = new Date(warningAtISO).getTime();
      const now = Date.now();
      const ms = warnAt - now;
      if (ms <= 0) {
        // direct trigger
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("Streak at risk", { body: "2 hours until reset. Don’t lose your streak!", icon: "/icon-192x192.png" });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((perm) => {
              if (perm === "granted") new Notification("Streak at risk", { body: "2 hours until reset. Don’t lose your streak!", icon: "/icon-192x192.png" });
            });
          }
        }
      } else {
        warningTimerRef.current = setTimeout(() => {
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("Streak at risk", { body: "2 hours until reset. Don’t lose your streak!", icon: "/icon-192x192.png" });
            }
          }
        }, ms);
      }
    } catch {}
  }, []);

  // Throttled refresh — now refreshes plan + month + goals
  const scheduleRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchedRef.current < 800) return; // throttle 0.8s
    lastFetchedRef.current = now;
    if (refreshTimerRef.current) return; // already queued
    refreshTimerRef.current = setTimeout(async () => {
      refreshTimerRef.current = null;
      await Promise.all([
        fetchPlan(true),
        fetchMonth(true),
        fetchGoals(true),
      ]);
    }, 250);
  }, [fetchPlan, fetchMonth, fetchGoals]);

  useEffect(() => {
    fetchPlan();
    fetchMonth();
    fetchGoals();

    // Schedule warning ~2 hours before midnight
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);
    const warnAt = new Date(nextMidnight.getTime() - 2 * 60 * 60 * 1000);
    scheduleWarning(warnAt.toISOString());

    const unsubStats = realTimeSync.subscribe("stats", scheduleRefresh, "TomorrowSidebar");
    const unsubStreak = realTimeSync.subscribe("streak", scheduleRefresh, "TomorrowSidebar");
    const unsubWorkout = realTimeSync.subscribe?.("workout-completed", scheduleRefresh, "TomorrowSidebar");

    return () => {
      unsubStats();
      unsubStreak();
      unsubWorkout && unsubWorkout();
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (refreshTimerRef.current) { clearTimeout(refreshTimerRef.current); refreshTimerRef.current = null; }
    };
  }, [fetchPlan, fetchMonth, fetchGoals, scheduleRefresh, scheduleWarning]);

  const monthName = monthData?.month || "";
  const year = monthData?.year || "";
  const days = useMemo(() => monthData?.days || [], [monthData?.days]);

  const goalProgressPct = useMemo(() => goals?.progress?.progressPct || 0, [goals?.progress?.progressPct]);
  const goalCurrent = useMemo(() => goals?.progress?.current || 0, [goals?.progress?.current]);
  const goalTarget = useMemo(() => goals?.progress?.target || 30, [goals?.progress?.target]);

  const weekDayLabels = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const firstWeekday = firstOfMonth.getDay();
    const leadingBlanks = Array.from({ length: firstWeekday }, () => ({ blank: true }));
    return [...leadingBlanks, ...(days || []).map((d) => ({ ...d, blank: false }))];
  }, [days]);

  return (
    <aside className="flex w-80 xl:w-96 flex-col border-l border-neutral-900/10 dark:border-neutral-900 bg-background">
      <div className="p-4 space-y-4 h-[100svh] overflow-y-auto scrollbar-hide">
        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Tomorrow&apos;s Workout
            </CardTitle>
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
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle classNameName="h-4 w-4" />
                <span className="text-sm">Error: {error}</span>
              </div>
            ) : !data ? (
              <div className="text-center py-4">
                <div className="text-muted-foreground text-sm">No data received</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">{data.workout?.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {data.workout?.estimatedDuration} min
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Exercises</h4>
                  <div className="space-y-1">
                    {(data.workout?.exercises || []).map((ex, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm font-medium">{ex.name}</span>
                        <Badge variant="outline" className="text-xs">{ex.sets}×{ex.reps}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                  <div className="text-xs font-medium text-primary">{goalCurrent}/{goalTarget}</div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${goalProgressPct}%` }} />
                </div>
                <div className="text-xs text-muted-foreground text-center mt-1">{goalProgressPct}% Complete</div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[7, 30, 75].map((d) => (
                    <button key={d} onClick={() => setGoalTarget(d)} disabled={savingGoal} className={`text-xs py-1 rounded-md border ${goalTarget === d ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border/50"} hover:opacity-90`}>
                      {d} days
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> {monthName} {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {monthLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(28)].map((_, i) => (<Skeleton key={i} className="w-9 h-9 rounded-md" />))}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
                    <div key={wd} className="text-[10px] text-muted-foreground text-center font-medium">{wd}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {(calendarCells || []).map((cell, idx) => {
                    if (cell.blank) return <div key={`b-${idx}`} />;
                    const isToday = todayIso === cell.date;
                    const inPast = new Date(cell.date) < new Date(todayIso);
                    const missed = inPast && !cell.completed;
                    const stateClass = cell.completed ? "bg-green-500 text-white border-green-600" : isToday ? "bg-primary/15 text-primary border-primary/30" : missed ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900" : "bg-muted text-muted-foreground border-border/50";
                    const Icon = cell.completed ? CheckCircle2 : missed ? AlertCircle : Circle;
                    return (
                      <div key={cell.date} className="flex flex-col items-center gap-1">
                        <div className={`w-9 h-9 rounded-md border flex items-center justify-center text-[11px] font-semibold transition-all hover:scale-105 ${stateClass}`} title={`${cell.date} ${cell.completed ? "✓ Completed" : missed ? "Missed" : isToday ? "Today" : "Not completed"}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium">{new Date(cell.date).getDate()}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">{(days || []).filter((d) => d.completed).length} of {(days || []).length} days completed this month</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

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
      // Prefer AI endpoint, fallback to legacy
      let res = await fetch("/api/tomorrow-workout-ai", { cache: "no-store" });
      if (!res.ok) res = await fetch("/api/tomorrow-workout", { cache: "no-store" });
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

  const setGoalTarget = useCallback(async (targetDays) => {
    try {
      setSavingGoal(true);
      setGoals((prev) => {
        const current = prev?.progress?.current || 0;
        return { goals: { ...(prev?.goals || {}), type: "streak", targetDays, active: true }, progress: { current, target: targetDays, progressPct: Math.max(0, Math.min(100, Math.round((current / targetDays) * 100))) } };
      });
      await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "streak", targetDays, active: true }) });
      await fetchGoals(true);
    } finally { setSavingGoal(false); }
  }, [fetchGoals]);

  const scheduleWarning = useCallback((warningAtISO) => {
    try {
      if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null; }
      if (!warningAtISO) return;
      const warnAt = new Date(warningAtISO).getTime();
      const now = Date.now();
      const ms = warnAt - now;
      if (ms > 0) {
        warningTimerRef.current = setTimeout(() => {
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("Streak at risk", { body: "2 hours until reset. Don’t lose your streak!", icon: "/icon-192x192.png" });
          }
        }, ms);
      }
    } catch {}
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
    fetchPlan();
    fetchMonth();
    fetchGoals();
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
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Tomorrow&apos;s Workout</CardTitle>
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
              <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /><span className="text-sm">Error: {error}</span></div>
            ) : !data ? (
              <div className="text-center py-4"><div className="text-muted-foreground text-sm">No data received</div></div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">{data.workout?.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> {data.workout?.estimatedDuration} min</Badge>
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

        {/* streak goals + calendar same as before */}
      </div>
    </aside>
  );
}

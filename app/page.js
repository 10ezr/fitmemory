"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Flame, Activity, BarChart3, Moon, Timer, TrendingUp, Dumbbell, Sparkles, Target, Droplet, Footprints, HeartPulse, ChevronRight } from "lucide-react";
import realTimeSync from "@/app/services/realTimeSync";

const COLORS = ["#7c3aed", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444"]; // accent palette

// Tiny sparkline using inline SVG
function Sparkline({ data = [], color = "#7c3aed" }) {
  const points = useMemo(() => {
    if (!data.length) return "";
    const w = 120, h = 36;
    const max = Math.max(1, ...data);
    const step = w / Math.max(1, data.length - 1);
    return data
      .map((v, i) => {
        const x = i * step;
        const y = h - (v / max) * (h - 4) - 2;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data]);
  return (
    <svg width="120" height="36" viewBox="0 0 120 36" className="opacity-90">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

export default function DashboardHome() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [sleep, setSleep] = useState([]);
  const [timerData, setTimerData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [s, w, sl, t] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/workouts?limit=6", { cache: "no-store" }),
          fetch("/api/sleep?limit=14", { cache: "no-store" }).catch(() => ({ ok: false })),
          fetch("/api/timer-data", { cache: "no-store" }),
        ]);
        const [sJ, wJ, slJ, tJ] = await Promise.all([
          s.ok ? s.json() : {},
          w.ok ? w.json() : [],
          sl && sl.ok ? sl.json() : { sessions: [] },
          t.ok ? t.json() : { sessions: [] },
        ]);
        if (!mounted) return;
        setStats(sJ || {});
        setWorkouts(wJ?.workouts || wJ || []);
        setSleep(slJ?.sessions || []);
        setTimerData(tJ?.sessions || []);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();

    const unsub1 = realTimeSync.subscribe("stats", (u) => setStats((p) => ({ ...(p || {}), ...(u || {}) })), "DashboardHome");
    return () => {
      mounted = false;
      try { unsub1?.(); } catch {}
    };
  }, []);

  const weeklyCounts = stats?.weeklyCounts || [];
  const currentStreak = stats?.currentStreak || stats?.dailyStreak || 0;
  const totalWorkouts = stats?.totalWorkouts || 0;
  const lastSleep = sleep?.[0];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left persistent sidebar comes from layout */}

      {/* Center dashboard container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">
          {/* Hero */}
          <Card className="border bg-gradient-to-br from-primary/5 via-background to-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-xl">Good to see you</span>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Flame className="h-3 w-3 text-orange-500" /> {currentStreak} day streak
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> {totalWorkouts} total workouts
                </div>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-blue-500" /> {lastSleep?.duration ? `${lastSleep.duration}h last sleep` : "sleep tracking ready"}
                </div>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Weekly: {weeklyCounts.reduce((s, v) => s + (Number(v)||0), 0)} sessions
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Row: Quick Actions + Streak Badges */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button className="justify-start gap-2" variant="outline" onClick={() => router.push("/chat")}>💬 Chat with Coach</Button>
                <Button className="justify-start gap-2" variant="outline" onClick={() => router.push("/workouts")}><Dumbbell className="h-4 w-4" /> Start Workout</Button>
                <Button className="justify-start gap-2" variant="outline" onClick={() => router.push("/sleep")}><Moon className="h-4 w-4" /> Log Sleep</Button>
                <Button className="justify-start gap-2" variant="outline" onClick={() => router.push("/analytics")}><BarChart3 className="h-4 w-4" /> Open Analytics</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" /> Streaks</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-4xl font-extrabold leading-none">{currentStreak}</div>
                  <div className="text-xs text-muted-foreground">days in a row</div>
                </div>
                <Sparkline data={weeklyCounts} color="#f59e0b" />
              </CardContent>
            </Card>
          </div>

          {/* Row: Today + Sleep */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Today’s workout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workouts?.length ? (
                  <>
                    <div className="text-sm text-muted-foreground">You have {workouts[0]?.exercises?.length || 0} exercises planned</div>
                    <Button onClick={() => router.push("/workouts")} className="gap-2">Start now <ChevronRight className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No plans yet. Create your first workout.</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Moon className="h-4 w-4" /> Sleep summary</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{lastSleep?.duration ? `${lastSleep.duration}h` : "—"}</div>
                  <div className="text-xs text-muted-foreground">last session</div>
                </div>
                <Sparkline data={sleep.slice(0,7).map(s => s.duration || 0).reverse()} color="#0ea5e9" />
              </CardContent>
            </Card>
          </div>

          {/* Row: Activity Trend + Readiness */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Weekly activity</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Workouts & minutes</div>
                  <Sparkline data={weeklyCounts} color="#22c55e" />
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-2xl font-bold">{weeklyCounts.reduce((s, v) => s + (Number(v)||0), 0)}</div>
                  <div className="text-xs text-muted-foreground">sessions this week</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Naive readiness: a blend of sleep duration + recent activity */}
                {(() => {
                  const sleepH = lastSleep?.duration || 0;
                  const recent = weeklyCounts.slice(-3).reduce((s, v) => s + (Number(v)||0), 0);
                  const score = Math.max(10, Math.min(95, Math.round((sleepH*8 + (3-recent)*8) + 50)));
                  return (
                    <>
                      <div className="text-3xl font-extrabold">{score}</div>
                      <div className="text-xs text-muted-foreground">higher is better</div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${score}%` }} />
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Row: Micro widgets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 flex items-center justify-between"><div className="text-xs text-muted-foreground">Hydration</div><div className="flex items-center gap-2"><Droplet className="h-4 w-4 text-cyan-500" /><span className="font-semibold">—</span></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between"><div className="text-xs text-muted-foreground">Steps</div><div className="flex items-center gap-2"><Footprints className="h-4 w-4 text-emerald-500" /><span className="font-semibold">—</span></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between"><div className="text-xs text-muted-foreground">Resting HR</div><div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-rose-500" /><span className="font-semibold">—</span></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between"><div className="text-xs text-muted-foreground">Focus Timer</div><div className="flex items-center gap-2"><Timer className="h-4 w-4 text-violet-500" /><span className="font-semibold">{timerData?.length || 0}</span></div></CardContent></Card>
          </div>

          {/* Row: Recent lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Recent workouts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(workouts || []).slice(0,5).map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="truncate">{w.name || "Workout"}</div>
                    <div className="text-muted-foreground">{Math.round((w.duration||0)/60)}m</div>
                  </div>
                ))}
                {!workouts?.length && <div className="text-sm text-muted-foreground">No workouts yet</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Recent sleep</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(sleep || []).slice(0,5).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="truncate">{new Date(s.createdAt || s.date || Date.now()).toLocaleDateString()}</div>
                    <div className="text-muted-foreground">{s.duration || 0}h</div>
                  </div>
                ))}
                {!sleep?.length && <div className="text-sm text-muted-foreground">No sleep data yet</div>}
              </CardContent>
            </Card>
          </div>

          {/* Row: Recommendations + CTA */}
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(() => {
                  const recs = [];
                  if (currentStreak < 3) recs.push("Build the habit: aim for 3 sessions this week");
                  if ((sleep?.[0]?.duration || 0) < 7) recs.push("Try to hit 7-9 hours sleep to improve recovery");
                  if (weeklyCounts.reduce((s, v) => s + (Number(v)||0),0) < 3) recs.push("Add a light cardio day to boost consistency");
                  if (!recs.length) recs.push("Looking great—review analytics for deeper insights");
                  return recs.map((r, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                  ));
                })()}
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Explore trends and performance</div>
                  <div className="font-semibold">Open full Analytics</div>
                </div>
                <Button onClick={() => router.push("/analytics")} variant="outline" className="gap-2"><BarChart3 className="h-4 w-4" /> Open</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Right pinned sidebar (TomorrowSidebar is already wired in main chat; keep visual parity if needed) */}
      <div className="w-80 flex-shrink-0 hidden xl:block" />
    </div>
  );
}

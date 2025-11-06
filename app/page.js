"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Flame,
  Activity,
  BarChart3,
  Moon,
  Timer,
  TrendingUp,
  Dumbbell,
  Sparkles,
  Target,
  Droplet,
  Footprints,
  HeartPulse,
  ChevronRight,
  MessageCircle,
  Calendar,
  Clock,
  Trophy,
  Zap,
  Send,
  CheckCircle2,
  Plus,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import realTimeSync from "@/app/services/realTimeSync";
import { showActionToast } from "@/lib/toasts";

// Lightweight sparkline (no heavy chart libs)
function Sparkline({ data = [], color = "#7c3aed" }) {
  const points = useMemo(() => {
    if (!data.length) return "";
    const w = 120,
      h = 36;
    const max = Math.max(1, ...data);
    const step = w / Math.max(1, data.length - 1);
    return data
      .map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`)
      .join(" ");
  }, [data]);
  return (
    <svg width="120" height="36" viewBox="0 0 120 36" className="opacity-90">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

// Tiny progress ring (SVG only)
function ProgressRing({
  progress = 0,
  size = 92,
  strokeWidth = 8,
  color = "#7c3aed",
}) {
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const offset = C - (progress / 100) * C;
  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        className="-rotate-90 drop-shadow-[0_0_8px_rgba(124,58,237,.2)]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted opacity-25"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
    </div>
  );
}

// Active hydration tracker
function HydrationWidget() {
  const [glasses, setGlasses] = useState(0);
  const goal = 8;
  const progress = Math.min(100, (glasses / goal) * 100);

  return (
    <Card
      className="hover:shadow-sm transition-all cursor-pointer"
      onClick={() => setGlasses((g) => Math.min(goal, g + 1))}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Hydration</div>
          <div className="text-lg font-semibold">
            {glasses}/{goal}
          </div>
        </div>
        <div className="relative">
          <Droplet className="h-6 w-6 text-cyan-500" />
          <div
            className="absolute inset-0 bg-cyan-500/20 rounded-full animate-pulse"
            style={{ opacity: progress / 100 }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Active steps widget
function StepsWidget() {
  const [steps, setSteps] = useState(0);
  const goal = 8000;
  const progress = Math.min(100, (steps / goal) * 100);

  return (
    <Card className="hover:shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">Steps</div>
          <Footprints className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <div className="text-lg font-semibold">{steps.toLocaleString()}</div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <Input
            type="number"
            placeholder="Update steps"
            className="text-xs h-7"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSteps(Number(e.target.value) || 0);
                e.target.value = "";
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Sleep tracker with quick log
function SleepWidget({ lastSleep, onSleepLog }) {
  const [hours, setHours] = useState("7");
  const [logging, setLogging] = useState(false);

  const quickLog = async () => {
    setLogging(true);
    try {
      const res = await fetch("/api/sleep/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: Number(hours),
          date: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        showActionToast({
          type: "sleep_updated",
          durationMin: Number(hours) * 60,
        });
        onSleepLog?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogging(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Moon className="h-4 w-4" /> Sleep
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {lastSleep?.duration ? `${lastSleep.duration}h` : "—"}
            </div>
            <div className="text-xs text-muted-foreground">last night</div>
          </div>
          <Sparkline
            data={Array.from({ length: 7 }, (_, i) => Math.random() * 9 + 6)}
            color="#0ea5e9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 8 }, (_, i) => i + 5).map((h) => (
                <SelectItem key={h} value={h.toString()}>
                  {h}h
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={quickLog}
            disabled={logging}
            className="h-8 text-xs"
          >
            {logging ? "Logging..." : "Log Sleep"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Workout creator widget
function WorkoutWidget({ workouts, onWorkoutCreate }) {
  const [creating, setCreating] = useState(false);
  const [workoutType, setWorkoutType] = useState("hiit");

  const createWorkout = async () => {
    setCreating(true);
    try {
      const templates = {
        hiit: {
          name: "Quick HIIT",
          exercises: ["Burpees", "Mountain climbers", "Jump squats"],
          duration: 20,
        },
        strength: {
          name: "Strength Training",
          exercises: ["Push-ups", "Squats", "Planks"],
          duration: 30,
        },
        cardio: {
          name: "Cardio Blast",
          exercises: ["Running", "Cycling", "Jumping jacks"],
          duration: 25,
        },
      };
      const template = templates[workoutType];
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (res.ok) {
        showActionToast({ type: "workout_created", name: template.name });
        onWorkoutCreate?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="h-4 w-4" /> Today&apos;s workout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(workouts || []).length ? (
          <>
            <div className="text-sm text-muted-foreground">
              {workouts[0]?.exercises?.length || 0} exercises ready
            </div>
            <div className="flex items-center gap-3">
              <div className="relative drop-shadow-[0_0_10px_rgba(124,58,237,.15)]">
                <ProgressRing progress={85} color="#7c3aed" size={80} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium">{workouts[0]?.name}</div>
                <Button
                  onClick={() => router.push("/workouts")}
                  className="gap-2 mt-1"
                  size="sm"
                >
                  Start <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-3">
              No workout planned
            </div>
            <div className="space-y-2">
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hiit">20min HIIT</SelectItem>
                  <SelectItem value="strength">30min Strength</SelectItem>
                  <SelectItem value="cardio">25min Cardio</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={createWorkout}
                disabled={creating}
                className="w-full gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                {creating ? "Creating..." : "Create Workout"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Right-rail components embedded (not a sidebar)
function RightRail({ stats, sleep, workouts }) {
  const weekly = stats?.weeklyCounts || [];
  const lastSleep = sleep?.[0];
  const upcoming = (workouts || []).slice(0, 2);
  const nextResetMs = (() => {
    const last = Number(stats?.lastSuccessAt || 0);
    if (!last) return 0;
    const target = last + 24 * 60 * 60 * 1000;
    return Math.max(0, target - Date.now());
  })();
  const hrs = Math.floor(nextResetMs / 3600000);
  const mins = Math.floor((nextResetMs % 3600000) / 60000);

  return (
    <div className="grid gap-4">
      {/* Coach Nudge */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/10 hover:shadow-md transition-all">
        <CardContent className="p-4 text-sm flex items-center gap-3">
          <Zap className="h-4 w-4 text-yellow-500" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">Coach tip</div>
            <div className="text-xs text-muted-foreground truncate">
              {weekly.reduce((s, v) => s + (Number(v) || 0), 0) < 3
                ? "Add cardio for consistency"
                : lastSleep?.duration < 7
                ? "Aim for 7-9h sleep"
                : "Review analytics for insights"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live reminders */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Live reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Hydrate</span>
            <Badge variant="secondary">250ml</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Stand</span>
            <Badge variant="secondary">2min</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Wind-down</span>
            <Badge variant="secondary">10:30 PM</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Today timeline */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Today timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Morning: Wake up (6:30 AM)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Afternoon: Workout planned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <span>Evening: Rest & recovery</span>
          </div>
        </CardContent>
      </Card>

      {/* Weekly pulse + Next reset */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Weekly pulse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">
                {weekly.reduce((s, v) => s + (Number(v) || 0), 0)}
              </div>
              <div className="text-[11px] text-muted-foreground">sessions</div>
            </div>
            <Sparkline data={weekly} color="#22c55e" />
          </div>
          {nextResetMs > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
              <span>Next reset</span>
              <span>
                {hrs}h {mins}m
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes scratchpad (local only) */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full h-20 text-sm rounded-md border bg-muted/30 p-2 outline-none resize-none"
            placeholder="Warm-up ideas, cues..."
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Minimal quick chat (uses existing /api/converse)
function QuickChat() {
  const [log, setLog] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    boxRef.current && (boxRef.current.scrollTop = boxRef.current.scrollHeight);
  }, [log]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || busy) return;
    setText("");
    setBusy(true);
    setLog((l) => [...l, { role: "user", content: msg }]);
    try {
      const currentTime = {
        iso: new Date().toISOString(),
        timezone: "Asia/Kolkata",
        epochMs: Date.now(),
        display: new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      };
      const res = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, timestamp: currentTime }),
      });
      const data = await res.json();
      setLog((l) => [
        ...l,
        { role: "assistant", content: data?.reply || "Got it!" },
      ]);
    } catch {
      setLog((l) => [
        ...l,
        { role: "system", content: "Connection failed. Try again." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={boxRef}
        className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-2"
      >
        {log.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            Try: &quot;Plan HIIT workout&quot;, &quot;Log 7h sleep&quot;,
            &quot;What&apos;s my streak?&quot;
          </div>
        ) : (
          log.map((m, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded ${
                m.role === "user"
                  ? "bg-primary/10 text-foreground ml-4"
                  : m.role === "assistant"
                  ? "bg-secondary/30 text-primary mr-4"
                  : "text-muted-foreground"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Quick message..."
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          size="icon"
          onClick={send}
          disabled={busy || !text.trim()}
          className="h-9 w-9"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [sleep, setSleep] = useState([]);
  const [timerData, setTimerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [macro, setMacro] = useState({
    protein: false,
    water: false,
    steps: false,
  });

  const refreshData = async () => {
    try {
      const [s, w] = await Promise.all([
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/workouts?limit=12", { cache: "no-store" }),
      ]);
      const [sJ, wJ] = await Promise.all([
        s.ok ? s.json() : {},
        w.ok ? w.json() : [],
      ]);
      setStats(sJ || {});
      setWorkouts(wJ?.workouts || wJ || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [s, w, sl, t] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/workouts?limit=12", { cache: "no-store" }),
          fetch("/api/sleep?limit=14", { cache: "no-store" }).catch(() => ({
            ok: false,
          })),
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
        mounted && setLoading(false);
      }
    };
    load();
    const unsub = realTimeSync.subscribe(
      "stats",
      (u) => setStats((p) => ({ ...(p || {}), ...(u || {}) })),
      "DashboardHome"
    );
    return () => {
      mounted = false;
      try {
        unsub?.();
      } catch {}
    };
  }, []);

  const weekly = stats?.weeklyCounts || [];
  const streak = stats?.currentStreak || stats?.dailyStreak || 0;
  const totalWorkouts = stats?.totalWorkouts || 0;
  const lastSleep = sleep?.[0];

  const todayMins = (workouts || [])
    .filter(
      (w) =>
        new Date(w.createdAt || w.date).toDateString() ===
        new Date().toDateString()
    )
    .reduce((s, w) => s + Math.round((w.duration || 0) / 60), 0);
  const workoutProgress = Math.min(100, (todayMins / 60) * 100);

  // Quick timer handlers
  const startTimer = async (label, minutes) => {
    try {
      await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, duration: minutes * 60 }),
      });
      showActionToast({ type: "timer_started", duration: `${minutes}min` });
    } catch {}
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          {/* Hero */}
          <Card className="border bg-gradient-to-br from-primary/10 via-background to-secondary/10 hover:shadow-xl transition-all backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                  </div>
                  <span className="text-2xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Welcome back
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="gap-1 animate-in fade-in slide-in-from-top-2 hover:scale-105 transition-transform"
                >
                  <Flame className="h-4 w-4 text-orange-500" /> {streak} day
                  streak
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="font-medium">{totalWorkouts}</span> workouts
                </div>
                <Separator
                  orientation="vertical"
                  className="h-5 hidden sm:block"
                />
                <div className="flex items-center gap-2 hover:text-blue-500 transition-colors cursor-pointer">
                  <Moon className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">
                    {lastSleep?.duration ? `${lastSleep.duration}h` : "0h"}
                  </span>{" "}
                  last sleep
                </div>
                <Separator
                  orientation="vertical"
                  className="h-5 hidden sm:block"
                />
                <div className="flex items-center gap-2 hover:text-emerald-500 transition-colors cursor-pointer">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">
                    {weekly.reduce((s, v) => s + (Number(v) || 0), 0)}
                  </span>{" "}
                  this week
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goals & Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card
              className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
              onClick={() => router.push("/analytics")}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Weekly goal
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {weekly.reduce((s, v) => s + (Number(v) || 0), 0)}/4
                  </div>
                </div>
                <ProgressRing
                  progress={Math.min(
                    100,
                    (weekly.reduce((s, v) => s + (Number(v) || 0), 0) / 4) * 100
                  )}
                  color="#7c3aed"
                />
              </CardContent>
            </Card>
            <Card
              className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
              onClick={() => router.push("/analytics")}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Consistency
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                    {Math.min(
                      100,
                      Math.round(
                        (weekly.filter((v) => Number(v) > 0).length / 7) * 100
                      )
                    )}
                    %
                  </div>
                </div>
                <Sparkline data={weekly} color="#22c55e" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Energy
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-rose-400 bg-clip-text text-transparent">
                    {lastSleep?.duration
                      ? lastSleep.duration >= 7
                        ? "High"
                        : "Med"
                      : "—"}
                  </div>
                </div>
                <HeartPulse className="h-7 w-7 text-rose-500 animate-pulse" />
              </CardContent>
            </Card>
          </div>

          {/* Quick timers & Macro checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            <Card className="hover:shadow-lg transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Timer className="h-5 w-5" /> Quick timers
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                {[
                  { label: "Focus", m: 10, color: "violet" },
                  { label: "HIIT", m: 20, color: "red" },
                  { label: "Walk", m: 30, color: "green" },
                ].map((t) => (
                  <Button
                    key={t.label}
                    variant="outline"
                    className="flex-col gap-1 h-16 hover:scale-105 transition-transform"
                    onClick={() => {
                      startTimer(`${t.m}m ${t.label}`, t.m);
                    }}
                  >
                    <Timer className="h-5 w-5" />
                    <div className="text-xs">
                      {t.m}m {t.label}
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5" /> Daily targets
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {[
                  { k: "protein", label: "Protein", icon: "🥩" },
                  { k: "water", label: "Water 2L", icon: "💧" },
                  { k: "steps", label: "8k steps", icon: "👟" },
                ].map(({ k, label, icon }) => (
                  <button
                    key={k}
                    onClick={() => setMacro((m) => ({ ...m, [k]: !m[k] }))}
                    className={`flex items-center justify-between rounded-lg border px-3 py-3 hover:bg-muted/50 transition-all ${
                      macro[k] ? "bg-emerald-50 border-emerald-200" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <span>{label}</span>
                    </div>
                    {macro[k] ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-muted rounded-full" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Today + Sleep + Right rail */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mt-6">
            <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <WorkoutWidget
                workouts={workouts}
                onWorkoutCreate={refreshData}
              />
              <SleepWidget lastSleep={lastSleep} onSleepLog={refreshData} />
            </div>
            <div className="xl:col-span-4">
              <RightRail stats={stats} sleep={sleep} workouts={workouts} />
            </div>
          </div>

          {/* Active widgets row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <HydrationWidget />
            <StepsWidget />
            <Card className="hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Heart Rate
                  </div>
                  <div className="text-lg font-semibold">72 BPM</div>
                </div>
                <HeartPulse className="h-5 w-5 text-rose-500 animate-pulse" />
              </CardContent>
            </Card>
            <Card
              className="hover:shadow-md transition-all cursor-pointer"
              onClick={() => router.push("/timer")}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Active Timer
                  </div>
                  <div className="text-lg font-semibold">
                    {timerData?.length || 0}
                  </div>
                </div>
                <Timer className="h-5 w-5 text-violet-500" />
              </CardContent>
            </Card>
          </div>

          {/* Bottom section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-6">
            <Card className="xl:col-span-2 hover:shadow-lg transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5" /> Smart recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(() => {
                  const recs = [];
                  if (streak < 3)
                    recs.push(
                      "Build consistency: aim for 3 sessions this week"
                    );
                  if ((sleep?.[0]?.duration || 0) < 7)
                    recs.push("Prioritize 7-9h sleep for recovery");
                  if (weekly.reduce((s, v) => s + (Number(v) || 0), 0) < 3)
                    recs.push("Add light cardio to boost weekly activity");
                  if (!recs.length)
                    recs.push(
                      "Excellent progress—explore Analytics for deeper insights"
                    );
                  return recs.map((r, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs hover:bg-primary/10 cursor-pointer transition-colors"
                    >
                      {r}
                    </Badge>
                  ));
                })()}
              </CardContent>
            </Card>
            <Card className="h-[300px] hover:shadow-lg transition-all backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Quick Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[240px]">
                <QuickChat />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

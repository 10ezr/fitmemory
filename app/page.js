"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Flame, Activity, BarChart3, Moon, Timer, TrendingUp, Dumbbell,
  Sparkles, Target, Droplet, Footprints, HeartPulse, ChevronRight,
  MessageCircle, Calendar, Clock, Trophy, Zap, Send, CheckCircle2
} from "lucide-react";
import realTimeSync from "@/app/services/realTimeSync";

// Lightweight sparkline (no heavy chart libs)
function Sparkline({ data = [], color = "#7c3aed" }) {
  const points = useMemo(() => {
    if (!data.length) return "";
    const w = 120, h = 36;
    const max = Math.max(1, ...data);
    const step = w / Math.max(1, data.length - 1);
    return data.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(" ");
  }, [data]);
  return (
    <svg width="120" height="36" viewBox="0 0 120 36" className="opacity-90">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

// Tiny progress ring (SVG only)
function ProgressRing({ progress = 0, size = 92, strokeWidth = 8, color = "#7c3aed" }) {
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const offset = C - (progress / 100) * C;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-muted opacity-25" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
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
    const target = last + 24*60*60*1000;
    return Math.max(0, target - Date.now());
  })();
  const hrs = Math.floor(nextResetMs/3600000);
  const mins = Math.floor((nextResetMs%3600000)/60000);

  return (
    <div className="grid gap-4">
      {/* Coach Nudge */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/10 hover:shadow-md transition-all">
        <CardContent className="p-4 text-sm flex items-center gap-3">
          <Zap className="h-4 w-4 text-yellow-500" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">Coach nudge</div>
            <div className="text-xs text-muted-foreground truncate">
              {(weekly.reduce((s,v)=>s+(Number(v)||0),0) < 3) ? "Add a light cardio day to build consistency" : (lastSleep?.duration < 7 ? "Aim for 7-9h sleep to boost recovery" : "Great work—review analytics for deeper insights")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Reminders</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between"><span>Hydrate</span><Badge variant="secondary">250ml</Badge></div>
          <div className="flex items-center justify-between"><span>Stand up</span><Badge variant="secondary">2 min</Badge></div>
          <div className="flex items-center justify-between"><span>Wind-down</span><Badge variant="secondary">10:30 PM</Badge></div>
        </CardContent>
      </Card>

      {/* Upcoming */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {upcoming.length ? upcoming.map((w, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="truncate">{w.name || "Workout"}</span>
              <Badge variant="outline">{Math.round((w.estimatedDuration || 0) / 60)}m</Badge>
            </div>
          )) : <div className="text-muted-foreground">No items</div>}
        </CardContent>
      </Card>

      {/* Sleep glance */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Sleep glance</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold">{lastSleep?.duration ? `${lastSleep.duration}h` : "—"}</div>
            <div className="text-[11px] text-muted-foreground">last night</div>
          </div>
          <Sparkline data={sleep.slice(0,7).map(s => s.duration || 0).reverse()} color="#0ea5e9" />
        </CardContent>
      </Card>

      {/* Weekly pulse + Next reset */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Weekly pulse</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">{weekly.reduce((s,v)=>s+(Number(v)||0),0)}</div>
              <div className="text-[11px] text-muted-foreground">sessions</div>
            </div>
            <Sparkline data={weekly} color="#22c55e" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
            <span>Next reset</span>
            <span>{hrs}h {mins}m</span>
          </div>
        </CardContent>
      </Card>

      {/* Streak milestones */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Streak milestones</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[3,7,14,30].map((m)=> (
            <Badge key={m} variant="secondary" className="gap-1 text-xs">
              <Trophy className="h-3 w-3 text-yellow-500" /> {m}d
            </Badge>
          ))}
        </CardContent>
      </Card>

      {/* Notes scratchpad (local only) */}
      <Card className="hover:shadow-sm transition-all">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
        <CardContent>
          <textarea className="w-full h-24 text-sm rounded-md border bg-muted/30 p-2 outline-none" placeholder="Warm-up ideas, cues, reminders..." />
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

  useEffect(() => { boxRef.current && (boxRef.current.scrollTop = boxRef.current.scrollHeight); }, [log]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || busy) return;
    setText("");
    setBusy(true);
    setLog(l => [...l, { role: "user", content: msg }]);
    try {
      const currentTime = {
        iso: new Date().toISOString(),
        timezone: "Asia/Kolkata",
        epochMs: Date.now(),
        display: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      };
      const res = await fetch("/api/converse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, timestamp: currentTime }) });
      const data = await res.json();
      setLog(l => [...l, { role: "assistant", content: data?.reply || "Okay." }]);
    } catch {
      setLog(l => [...l, { role: "system", content: "Failed to send. Try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={boxRef} className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-2 space-y-2">
        {log.length === 0 ? (
          <div className="text-xs text-muted-foreground">Ask: "Plan a 20-min HIIT", "Log 7h sleep", "What should I do today?"</div>
        ) : log.map((m, i) => (
          <div key={i} className={`text-xs ${m.role === 'user' ? 'text-foreground' : m.role === 'assistant' ? 'text-primary' : 'text-muted-foreground'}`}>{m.content}</div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Input value={text} onChange={e=>setText(e.target.value)} placeholder="Type quick message..." onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }} />
        <Button size="icon" onClick={send} disabled={busy || !text.trim()}><Send className="h-4 w-4" /></Button>
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
  const [macro, setMacro] = useState({ protein: false, water: false, steps: false });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [s, w, sl, t] = await Promise.all([
          fetch("/api/stats", { cache: "no-store" }),
          fetch("/api/workouts?limit=12", { cache: "no-store" }),
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
        mounted && setLoading(false);
      }
    };
    load();
    const unsub = realTimeSync.subscribe("stats", (u) => setStats(p => ({ ...(p||{}), ...(u||{}) })), "DashboardHome");
    return () => { mounted = false; try { unsub?.(); } catch {} };
  }, []);

  const weekly = stats?.weeklyCounts || [];
  const streak = stats?.currentStreak || stats?.dailyStreak || 0;
  const totalWorkouts = stats?.totalWorkouts || 0;
  const lastSleep = sleep?.[0];

  const todayMins = (workouts||[]).filter(w => new Date(w.createdAt||w.date).toDateString() === new Date().toDateString())
    .reduce((s,w)=> s + Math.round((w.duration||0)/60), 0);
  const workoutProgress = Math.min(100, (todayMins/60) * 100);

  // Quick timer handlers (noop-safe)
  const startTimer = async (label, minutes) => {
    try { await fetch("/api/timer-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, minutes }) }); } catch {}
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-background to-background/60">
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          {/* Hero */}
          <Card className="border bg-gradient-to-br from-primary/5 via-background to-primary/10 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-xl">Welcome back</span>
                </div>
                <Badge variant="secondary" className="gap-1 animate-in fade-in slide-in-from-top-2">
                  <Flame className="h-3 w-3 text-orange-500" /> {streak} day streak
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> {totalWorkouts} total workouts</div>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <div className="flex items-center gap-2"><Moon className="h-4 w-4 text-blue-500" /> {lastSleep?.duration ? `${lastSleep.duration}h last sleep` : "sleep ready"}</div>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Weekly: {weekly.reduce((s,v)=>s+(Number(v)||0),0)} sessions</div>
              </div>
            </CardContent>
          </Card>

          {/* Goals & Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Card className="hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Weekly goal</div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{weekly.reduce((s,v)=>s+(Number(v)||0),0)}/4</div>
                </div>
                <ProgressRing progress={Math.min(100, weekly.reduce((s,v)=>s+(Number(v)||0),0)/4*100)} color="#7c3aed" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Consistency</div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">{Math.min(100, Math.round((weekly.filter(v=>Number(v)>0).length/7)*100))}%</div>
                </div>
                <Sparkline data={weekly} color="#22c55e" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Energy</div>
                  <div className="text-2xl font-bold">{lastSleep?.duration ? (lastSleep.duration>=7?"High":"Medium") : "—"}</div>
                </div>
                <HeartPulse className="h-6 w-6 text-rose-500" />
              </CardContent>
            </Card>
          </div>

          {/* Quick timers & Macro checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <Card className="lg:col-span-2 hover:shadow-md transition-all">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Quick timers</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {[{label:"10m Focus",m:10},{label:"20m HIIT",m:20},{label:"30m Walk",m:30}].map(t => (
                  <Button key={t.label} variant="outline" className="gap-2" onClick={()=>startTimer(t.label,t.m)}>
                    <Timer className="h-4 w-4" /> {t.label}
                  </Button>
                ))}
                <Button variant="ghost" className="ml-auto" onClick={()=>router.push("/timer")}>Open timer</Button>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-all">
              <CardHeader className="pb-2"><CardTitle className="text-base">Macros checklist</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {[{k:"protein",label:"Protein target"},{k:"water",label:"Water 2L"},{k:"steps",label:"8k steps"}].map(({k,label})=> (
                  <button key={k} onClick={()=>setMacro(m=>({...m,[k]:!m[k]}))} className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/40">
                    <span>{label}</span>
                    {macro[k] ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-muted-foreground">Mark</span>}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Today + Sleep + Right rail */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mt-4">
            <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition-all">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Today’s workout</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(workouts||[]).length ? (
                    <>
                      <div className="text-sm text-muted-foreground">{workouts[0]?.exercises?.length || 0} exercises planned</div>
                      <div className="flex items-center gap-4">
                        <div className="relative drop-shadow-[0_0_10px_rgba(124,58,237,.15)]">
                          <ProgressRing progress={workoutProgress} color="#7c3aed" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-lg font-bold">{todayMins}</div>
                              <div className="text-[10px] text-muted-foreground">mins</div>
                            </div>
                          </div>
                        </div>
                        <Button onClick={()=>router.push("/workouts")} className="gap-2">Start now <ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    </>
                  ) : <div className="text-sm text-muted-foreground">No plans yet. Create your first workout.</div>}
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-all">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Moon className="h-4 w-4" /> Sleep summary</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">{lastSleep?.duration ? `${lastSleep.duration}h` : "—"}</div>
                    <div className="text-xs text-muted-foreground">last session</div>
                  </div>
                  <Sparkline data={sleep.slice(0,7).map(s=>s.duration||0).reverse()} color="#0ea5e9" />
                </CardContent>
              </Card>
            </div>
            <div className="xl:col-span-4"><RightRail stats={stats} sleep={sleep} workouts={workouts} /></div>
          </div>

          {/* Trend + Readiness */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <Card className="lg:col-span-2 hover:shadow-md transition-all">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Weekly activity</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1"><div className="text-sm text-muted-foreground">Workouts trend</div><Sparkline data={weekly} color="#22c55e" /></div>
                <div className="text-right"><div className="text-2xl font-bold">{weekly.reduce((s,v)=>s+(Number(v)||0),0)}</div><div className="text-xs text-muted-foreground">sessions</div></div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-all">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Readiness</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const sleepH = lastSleep?.duration || 0;
                  const recent = weekly.slice(-3).reduce((s,v)=>s+(Number(v)||0),0);
                  const score = Math.max(10, Math.min(95, Math.round((sleepH*8 + (3-recent)*8) + 50)));
                  return (<>
                    <div className="text-3xl font-extrabold">{score}</div>
                    <div className="text-xs text-muted-foreground">higher is better</div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${score}%` }} /></div>
                  </>);
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Micro widgets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Card className="hover:shadow-sm transition-all"><CardContent className="p-4 flex items-center justify-between"><div className="text-xs text-muted-foreground">Hydration</div><div className="flex items-center gap-2"><Droplet className="h-4 w-4 text-cyan-500" /><span className="font-semibold">—</span></div></CardContent></Card>
            <Card className="hover:shadow-sm transition-all"><CardContent className="p-4 flex items-center justify-between"><div className="text-xs text-muted-foreground">Steps</div><div className="flex items-center gap-2"><Footprints className="h-4 w-4 text-emerald-500" /><span className="font-semibold">—</span></div></CardContent></Card>
            <Card className="hover:shadow-sm transition-all"><CardContent className="p-4 flex items-center justify-between"><div className="text-xs text-muted-foreground">Resting HR</div><div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-rose-500" /><span className="font-semibold">—</span></div></CardContent></Card>
            <Card className="hover:shadow-sm transition-all"><CardContent className="p-4 flex items-center justify-between"><div className="text-xs text-muted-foreground">Focus Timer</div><div className="flex items-center gap-2"><Timer className="h-4 w-4 text-violet-500" /><span className="font-semibold">{timerData?.length || 0}</span></div></CardContent></Card>
          </div>

          {/* Recommendations + Quick Chat Card */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
            <Card className="xl:col-span-2 hover:shadow-md transition-all">
              <CardHeader className="pb-2"><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(() => {
                  const recs = [];
                  if (streak < 3) recs.push("Build the habit: aim for 3 sessions this week");
                  if ((sleep?.[0]?.duration || 0) < 7) recs.push("Try 7-9h sleep for better recovery");
                  if (weekly.reduce((s,v)=>s+(Number(v)||0),0) < 3) recs.push("Add a light cardio day for consistency");
                  if (!recs.length) recs.push("Looking great—open Analytics for deeper insights");
                  return recs.map((r, i) => (<Badge key={i} variant="secondary" className="text-xs">{r}</Badge>));
                })()}
              </CardContent>
            </Card>
            <Card className="h-[280px] hover:shadow-md transition-all">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Quick Chat</CardTitle></CardHeader>
              <CardContent className="h-[220px]"><QuickChat /></CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

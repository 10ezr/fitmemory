"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Timer, TrendingUp, Sparkles, Flame, Activity, Moon, HeartPulse, CheckCircle2 } from "lucide-react";
import HydrationWidget from "@/components/widgets/HydrationWidget";
import StepsWidget from "@/components/widgets/StepsWidget";
import ProgressRing from "@/components/widgets/ProgressRing";
import Sparkline from "@/components/widgets/Sparkline";
import SleepWidget from "@/components/widgets/SleepWidget";
import WorkoutWidget from "@/components/widgets/WorkoutWidget";
import RightRail from "@/components/dashboard/RightRail";
import QuickChat from "@/components/dashboard/QuickChat";
import realTimeSync from "@/app/services/realTimeSync";
import { showActionToast } from "@/lib/toasts";
import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [sleep, setSleep] = useState([]);
  const [timerData, setTimerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [macro, setMacro] = useState({ protein: false, water: false, steps: false });

  const refreshData = async () => {
    try {
      const [s, w] = await Promise.all([
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/workouts?limit=12", { cache: "no-store" }),
      ]);
      const [sJ, wJ] = await Promise.all([s.ok ? s.json() : {}, w.ok ? w.json() : []]);
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
    const unsub = realTimeSync.subscribe("stats", (u) => setStats((p) => ({ ...(p || {}), ...(u || {}) })), "DashboardHome");
    return () => { mounted = false; try { unsub?.(); } catch {} };
  }, []);

  const weekly = stats?.weeklyCounts || [];
  const streak = stats?.currentStreak || stats?.dailyStreak || 0;
  const totalWorkouts = stats?.totalWorkouts || 0;
  const lastSleep = sleep?.[0];

  const startTimer = async (label, minutes) => {
    try { 
      await fetch("/api/timer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, duration: minutes * 60 }) }); 
      showActionToast({ type: "timer_started", duration: `${minutes}min` });
    } catch {}
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          <Card className="border bg-gradient-to-br from-primary/10 via-background to-secondary/10 hover:shadow-xl transition-all backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                  </div>
                  <span className="text-2xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Welcome back</span>
                </div>
                <Badge variant="secondary" className="gap-1 animate-in fade-in slide-in-from-top-2 hover:scale-105 transition-transform">
                  <Flame className="h-4 w-4 text-orange-500" /> {streak} day streak
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
                  <Activity className="h-4 w-4 text-primary" /> 
                  <span className="font-medium">{totalWorkouts}</span> workouts
                </div>
                <Separator orientation="vertical" className="h-5 hidden sm:block" />
                <div className="flex items-center gap-2 hover:text-blue-500 transition-colors cursor-pointer">
                  <Moon className="h-4 w-4 text-blue-500" /> 
                  <span className="font-medium">{lastSleep?.duration ? `${lastSleep.duration}h` : "0h"}</span> last sleep
                </div>
                <Separator orientation="vertical" className="h-5 hidden sm:block" />
                <div className="flex items-center gap-2 hover:text-emerald-500 transition-colors cursor-pointer">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> 
                  <span className="font-medium">{weekly.reduce((s,v)=>s+(Number(v)||0),0)}</span> this week
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer" onClick={() => router.push('/analytics')}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Weekly goal</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{weekly.reduce((s,v)=>s+(Number(v)||0),0)}/4</div>
                </div>
                <ProgressRing progress={Math.min(100, weekly.reduce((s,v)=>s+(Number(v)||0),0)/4*100)} color="#7c3aed" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer" onClick={() => router.push('/analytics')}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Consistency</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">{Math.min(100, Math.round((weekly.filter(v=>Number(v)>0).length/7)*100))}%</div>
                </div>
                <Sparkline data={weekly} color="#22c55e" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Energy</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-rose-400 bg-clip-text text-transparent">{lastSleep?.duration ? (lastSleep.duration>=7?"High":"Med") : "—"}</div>
                </div>
                <HeartPulse className="h-7 w-7 text-rose-500 animate-pulse" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
            <Card className="hover:shadow-lg transition-all">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Timer className="h-5 w-5" /> Quick timers</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                {[{label:"Focus",m:10,color:"violet"},{label:"HIIT",m:20,color:"red"},{label:"Walk",m:30,color:"green"}].map(t => (
                  <Button key={t.label} variant="outline" className="flex-col gap-1 h-16 hover:scale-105 transition-transform" onClick={()=>{
                    startTimer(`${t.m}m ${t.label}`, t.m);
                  }}>
                    <Timer className="h-5 w-5" />
                    <div className="text-xs">{t.m}m {t.label}</div>
                  </Button>
                ))}
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Daily targets</CardTitle></CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {[{k:"protein",label:"Protein",icon:"🥩"},{k:"water",label:"Water 2L",icon:"💧"},{k:"steps",label:"8k steps",icon:"👟"}].map(({k,label,icon})=> (
                  <button key={k} onClick={()=>setMacro(m=>({...m,[k]:!m[k]}))} className={`flex items-center justify-between rounded-lg border px-3 py-3 hover:bg-muted/50 transition-all ${macro[k] ? 'bg-emerald-50 border-emerald-200' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <span>{label}</span>
                    </div>
                    {macro[k] ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <div className="h-5 w-5 border-2 border-muted rounded-full" />}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mt-6">
            <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <WorkoutWidget workouts={workouts} onWorkoutCreate={refreshData} />
              <SleepWidget lastSleep={lastSleep} onSleepLog={refreshData} />
            </div>
            <div className="xl:col-span-4">
              <RightRail stats={stats} sleep={sleep} workouts={workouts} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <HydrationWidget />
            <StepsWidget />
            <Card className="hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Heart Rate</div>
                  <div className="text-lg font-semibold">72 BPM</div>
                </div>
                <HeartPulse className="h-5 w-5 text-rose-500 animate-pulse" />
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-all cursor-pointer" onClick={() => router.push('/timer')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Active Timer</div>
                  <div className="text-lg font-semibold">{timerData?.length || 0}</div>
                </div>
                <Timer className="h-5 w-5 text-violet-500" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-6">
            <Card className="xl:col-span-2 hover:shadow-lg transition-all">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-5 w-5" /> Smart recommendations</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(() => {
                  const recs = [];
                  if (streak < 3) recs.push("Build consistency: aim for 3 sessions this week");
                  if ((sleep?.[0]?.duration || 0) < 7) recs.push("Prioritize 7-9h sleep for recovery");
                  if (weekly.reduce((s,v)=>s+(Number(v)||0),0) < 3) recs.push("Add light cardio to boost weekly activity");
                  if (!recs.length) recs.push("Excellent progress—explore Analytics for deeper insights");
                  return recs.map((r, i) => (<Badge key={i} variant="secondary" className="text-xs hover:bg-primary/10 cursor-pointer transition-colors">{r}</Badge>));
                })()}
              </CardContent>
            </Card>
            <Card className="h-[300px] hover:shadow-lg transition-all backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> 
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

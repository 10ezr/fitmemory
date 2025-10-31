"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Flame, BarChart3, Settings2, Clock, Calendar, Home, LogOut } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import realTimeSync from "@/app/services/realTimeSync";
import AdminPanel from "@/components/AdminPanel";

const RENDER_KEYS = ["dailyStreak", "totalWorkouts", "weeklyCounts", "lastSuccessAt"];

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

function msUntilNextDay(d = new Date()) {
  const t = new Date(d);
  t.setHours(24, 0, 0, 0);
  return Math.max(0, t.getTime() - d.getTime());
}

function msUntil24hFrom(lastMs) {
  if (!lastMs) return 0;
  const now = Date.now();
  const target = lastMs + 24 * 60 * 60 * 1000;
  return Math.max(0, target - now);
}

export default function FitnessSidebar({ stats, onDataChange, onShowAnalytics }) {
  const [realTimeStats, setRealTimeStats] = useState(stats);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const [auth, setAuth] = useState({ authenticated: false, user: null });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!active) return;
        if (res.ok) setAuth(await res.json());
      } catch { setAuth({ authenticated: false, user: null }); }
    })();
    return () => { active = false; };
  }, []);

  // current time (ticks every second for countdowns)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // realtime merge
  useEffect(() => {
    const applyUpdate = (incoming) => {
      setRealTimeStats((prev) => {
        const next = { ...(prev || {}), ...(incoming || {}) };
        return shallowEqualKeys(prev || {}, next, RENDER_KEYS) ? prev : next;
      });
    };
    const un1 = realTimeSync.subscribe("stats", applyUpdate, "FitnessSidebar");
    const un2 = realTimeSync.subscribe("streak", applyUpdate, "FitnessSidebar");
    return () => { un1(); un2(); };
  }, []);

  const current = realTimeStats || stats || {};
  const currentStreak = Number(current.dailyStreak || 0);
  const totalWorkouts = Number(current.totalWorkouts || 0);
  const weeklyCount = useMemo(() => {
    const wc = current.weeklyCounts; if (!Array.isArray(wc)) return 0;
    return wc.reduce((s, v) => s + (Number(v) || 0), 0);
  }, [current.weeklyCounts]);

  // countdowns
  const untilTomorrowMs = msUntilNextDay(new Date(now));
  const untilTomorrow = {
    hours: Math.floor(untilTomorrowMs / 3600000),
    minutes: Math.floor((untilTomorrowMs % 3600000) / 60000),
    seconds: Math.floor((untilTomorrowMs % 60000) / 1000),
  };

  const lastSuccessAt = Number(current.lastSuccessAt || 0);
  const until24hMs = msUntil24hFrom(lastSuccessAt);
  const until24h = {
    hours: Math.floor(until24hMs / 3600000),
    minutes: Math.floor((until24hMs % 3600000) / 60000),
    seconds: Math.floor((until24hMs % 60000) / 1000),
  };

  const timeFmt = new Intl.DateTimeFormat('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Sidebar side="left" className="border-r border-neutral-900/10 dark:border-neutral-900" collapsible="icon">
      <SidebarHeader className="border-b border-neutral-900/10 dark:border-neutral-900">
        <div className="flex items-center justify-between px-2 py-1">
          {!isCollapsed && (<div className="text-sm font-medium">Overview</div>)}
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShowAnalytics} title="Analytics">
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Settings2 className="h-4 w-4" /></Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-0">
                    <div className="border-b px-3 py-2 text-sm font-medium">Settings</div>
                    <div className="max-h-[60vh] overflow-y-auto"><AdminPanel onDataChange={onDataChange} /></div>
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
                <Card className="border bg-card rounded-md">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Flame className="h-5 w-5 text-primary" />
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Current Streak</span>
                    </div>
                    <div className="text-5xl font-extrabold leading-none">{currentStreak}</div>
                    <div className="text-sm text-muted-foreground mt-1">days in a row</div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Current Time</CardTitle></CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold font-mono tracking-wider">{timeFmt.format(now)}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-medium">{dateFmt.format(now)}</div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-3"><Calendar className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-muted-foreground">Until Tomorrow</span></div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Hours', value: untilTomorrow.hours },
                          { label: 'Minutes', value: untilTomorrow.minutes },
                          { label: 'Seconds', value: untilTomorrow.seconds },
                        ].map((b) => (
                          <div key={b.label} className="bg-card/50 border rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-primary font-mono">{String(b.value).padStart(2, '0')}</div>
                            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{b.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {lastSuccessAt > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-3"><Calendar className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-muted-foreground">Next reset window</span></div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Hours', value: until24h.hours },
                            { label: 'Minutes', value: until24h.minutes },
                            { label: 'Seconds', value: until24h.seconds },
                          ].map((b) => (
                            <div key={b.label} className="bg-card/50 border rounded-lg p-3 text-center">
                              <div className="text-xl font-bold text-primary font-mono">{String(b.value).padStart(2, '0')}</div>
                              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{b.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="border bg-card/30 backdrop-blur-sm"><CardContent className="p-4 text-center"><div className="text-xl font-bold text-primary">{weeklyCount}</div><div className="text-xs text-muted-foreground">This Week</div></CardContent></Card>
                  <Card className="border bg-card/30 backdrop-blur-sm"><CardContent className="p-4 text-center"><div className="text-xl font-bold text-primary">{totalWorkouts}</div><div className="text-xs text-muted-foreground">Total</div></CardContent></Card>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 pt-6">
                <div className="w-12 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm font-mono">
                  {timeFmt.format(now)}
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-3 py-2">
        {auth.authenticated ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-2 py-2 rounded-lg">
                <Avatar className="h-8 w-8"><AvatarImage src="/icon-192x192.png" alt="User" /><AvatarFallback>FM</AvatarFallback></Avatar>
                {!isCollapsed && (<div className="flex-1 text-left min-w-0"><Badge className="text-sm font-medium truncate">{auth.user?.id || 'User'}</Badge></div>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-3">
                <div className="flex items-center gap-3"><Avatar className="h-10 w-10"><AvatarImage src="/icon-192x192.png" alt="User" /><AvatarFallback>FM</AvatarFallback></Avatar><div className="min-w-0"><div className="text-sm font-medium truncate">{auth.user?.id || 'User'}</div><div className="text-xs text-muted-foreground">Role: {auth.user?.role || 'user'}</div></div></div>
                <div className="grid gap-2">
                  <Button variant="outline" className="justify-start gap-2" onClick={() => location.assign('/') }><Home className="h-4 w-4" /> Home</Button>
                  <Button variant="outline" className="justify-start gap-2" onClick={onShowAnalytics}><BarChart3 className="h-4 w-4" /> Analytics</Button>
                  <Button variant="destructive" className="justify-start gap-2" onClick={async () => { try { await fetch('/api/auth/login', { method: 'DELETE' }); } catch {} location.assign('/login'); }}><LogOut className="h-4 w-4" /> Logout</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (!isCollapsed && <div className="text-xs text-muted-foreground">FitMemory</div>)}
      </SidebarFooter>
    </Sidebar>
  );
}

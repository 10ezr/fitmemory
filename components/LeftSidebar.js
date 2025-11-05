"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Flame,
  Clock,
  Calendar,
  Home,
  LogOut,
  User,
  Settings,
  Activity,
  BarChart3,
  Moon,
  Dumbbell,
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
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import realTimeSync from "@/app/services/realTimeSync";
import SleepDashboard from "@/components/SleepDashboard";
import { SkeletonCard, SkeletonStat, SkeletonTimer } from "@/components/SkeletonLoader";
import SidebarFooterNav from "@/components/SidebarFooterNav";

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

// Navigation items
const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Activity, label: "Workouts", href: "/workouts" },
  { icon: Moon, label: "Sleep", href: "/sleep" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: User, label: "Profile", href: "/profile" },
];

export default function LeftSidebar({ stats, onDataChange, showFullStats = true }) {
  const [realTimeStats, setRealTimeStats] = useState(stats);
  const [loading, setLoading] = useState(!stats);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [auth, setAuth] = useState({ authenticated: false, user: null });
  const pathname = usePathname();
  const router = useRouter();

  // Live time with seconds (12-hour format with IST)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!active) return;
        if (res.ok) setAuth(await res.json());
      } catch {
        setAuth({ authenticated: false, user: null });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // realtime merge
  useEffect(() => {
    const applyUpdate = (incoming) => {
      setRealTimeStats((prev) => {
        const next = { ...(prev || {}), ...(incoming || {}) };
        return shallowEqualKeys(prev || {}, next, RENDER_KEYS) ? prev : next;
      });
      setLoading(false);
    };
    const un1 = realTimeSync.subscribe("stats", applyUpdate, "LeftSidebar");
    const un2 = realTimeSync.subscribe("streak", applyUpdate, "LeftSidebar");
    return () => {
      un1();
      un2();
    };
  }, []);

  const current = realTimeStats || stats || {};
  const currentStreak = Number(current.dailyStreak || 0);
  const totalWorkouts = Number(current.totalWorkouts || 0);
  const weeklyCount = useMemo(() => {
    const wc = current.weeklyCounts;
    if (!Array.isArray(wc)) return 0;
    return wc.reduce((s, v) => s + (Number(v) || 0), 0);
  }, [current.weeklyCounts]);

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

  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });

  if (loading) {
    return (
      <Sidebar side="left" className="border-r border-neutral-900/10 dark:border-neutral-900" collapsible="icon">
        <SidebarHeader className="border-b border-neutral-900/10 dark:border-neutral-900">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="text-sm font-medium">Loading...</div>
            <SidebarTrigger className="h-8 w-8" />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4 space-y-4">
          <SkeletonCard />
          <SkeletonTimer />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonStat />
            <SkeletonStat />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar side="left" className="border-r border-neutral-900/10 dark:border-neutral-900" collapsible="icon">
      <SidebarHeader className="border-b border-neutral-900/10 dark:border-neutral-900">
        <div className="flex items-center justify-between px-2 py-1">
          {!isCollapsed && <div className="text-sm font-medium">FitMemory</div>}
          <div className="flex items-center gap-1">
            <SidebarTrigger className="h-8 w-8" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto scrollbar-hide">
        {/* Navigation Links */}
        <SidebarGroup>
          <SidebarGroupContent className="px-4 py-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 px-3 py-2 h-auto ${
                      isCollapsed ? "px-2" : ""
                    }`}
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Button>
                );
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Stats Section - Only show on home or when showFullStats is true */}
        {(pathname === "/" || showFullStats) && (
          <SidebarGroup>
            <SidebarGroupContent className="p-4 space-y-4">
              {!isCollapsed ? (
                <div className="space-y-4">
                  {/* Current time with live seconds (12-hour) */}
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" /> Current Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold font-mono tracking-wider">
                          {timeFmt.format(now)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium">
                          {dateFmt.format(now)} (IST)
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Until Tomorrow
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: untilTomorrow.hours },
                            { value: untilTomorrow.minutes },
                            { value: untilTomorrow.seconds },
                          ].map((b, i) => (
                            <div key={i} className="bg-card/50 border rounded-lg p-3 text-center">
                              <div className="text-xl font-bold text-primary font-mono">
                                {String(b.value).padStart(2, "0")}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                {i === 0 ? "HRS" : i === 1 ? "MIN" : "SEC"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {lastSuccessAt > 0 && (
                        <div className="border-t pt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">
                              Next reset window
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: until24h.hours },
                              { value: until24h.minutes },
                              { value: until24h.seconds },
                            ].map((b, i) => (
                              <div key={i} className="bg-card/50 border rounded-lg p-3 text-center">
                                <div className="text-xl font-bold text-primary font-mono">
                                  {String(b.value).padStart(2, "0")}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                                  {i === 0 ? "HRS" : i === 1 ? "MIN" : "SEC"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Streak card */}
                  <Card className="border bg-card rounded-md">
                    <CardContent className="p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Flame className="h-5 w-5 text-primary" />
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          Current Streak
                        </span>
                      </div>
                      <div className="text-5xl font-extrabold leading-none">{currentStreak}</div>
                      <div className="text-sm text-muted-foreground mt-1">days in a row</div>
                    </CardContent>
                  </Card>

                  {/* Sleep Dashboard */}
                  <SleepDashboard isCollapsed={false} />

                  {/* Workout stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="border bg-card/30 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-xl font-bold text-primary">{weeklyCount}</div>
                        <div className="text-xs text-muted-foreground">This Week</div>
                      </CardContent>
                    </Card>
                    <Card className="border bg-card/30 backdrop-blur-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-xl font-bold text-primary">{totalWorkouts}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 pt-6">
                  <div className="w-16 h-14 rounded-lg bg-primary/20 flex flex-col items-center justify-center text-primary font-bold font-mono leading-tight">
                    <div className="text-sm">
                      {timeFmt.format(now).replace(/:\d{2} /, " ").replace(/ /g, "")}
                    </div>
                    <div className="text-[10px] opacity-70">{timeFmt.format(now).slice(-2)}</div>
                  </div>
                  <SleepDashboard isCollapsed={true} />
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t px-3 py-2">
        {/* Footer Navigation */}
        <SidebarFooterNav isCollapsed={isCollapsed} />
        
        {/* User Auth Section */}
        {auth.authenticated ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-2 py-2 rounded-lg mt-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/icon-192x192.png" alt="User" />
                  <AvatarFallback>FM</AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <Badge className="text-sm font-medium truncate">{auth.user?.id || "User"}</Badge>
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/icon-192x192.png" alt="User" />
                    <AvatarFallback>FM</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{auth.user?.id || "User"}</div>
                    <div className="text-xs text-muted-foreground">Role: {auth.user?.role || "user"}</div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => router.push("/")}
                  >
                    <Home className="h-4 w-4" /> Home
                  </Button>
                  <Button
                    variant="destructive"
                    className="justify-start gap-2"
                    onClick={async () => {
                      try {
                        await fetch("/api/auth/login", { method: "DELETE" });
                      } catch {}
                      location.assign("/login");
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          !isCollapsed && <div className="text-xs text-muted-foreground text-center mt-2">FitMemory</div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
"use client";

import { useEffect, useState } from "react";

export default function FeaturesPage() {
  const [goals, setGoals] = useState(null);
  const [month, setMonth] = useState(null);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [g, m, s, a] = await Promise.all([
          fetch("/api/goals")
            .then((r) => r.json())
            .catch(() => null),
          fetch("/api/month-streak")
            .then((r) => r.json())
            .catch(() => null),
          fetch("/api/stats")
            .then((r) => r.json())
            .catch(() => null),
          fetch("/api/analytics")
            .then((r) => r.json())
            .catch(() => null),
        ]);
        setGoals(g);
        setMonth(m);
        setStats(s);
        setAnalytics(a);
      } catch {}
    })();
  }, []);

  const items = [
    {
      name: "Streak Goals",
      desc: "Set 7/30/75-day goals with live progress from your streak.",
      ok: !!goals,
      details: goals
        ? `${goals.progress.current}/${goals.progress.target} (${goals.progress.progressPct}%)`
        : "loading...",
    },
    {
      name: "Monthly Streak Calendar",
      desc: "Visual calendar showing completed and missed days.",
      ok: !!month && Array.isArray(month.days),
      details: month
        ? `${month.month} ${month.year}: ${
            month.days.filter((d) => d.completed).length
          }/${month.days.length} days`
        : "loading...",
    },
    {
      name: "Adaptive Tomorrow Workout",
      desc: "Plans next workout based on today’s activity and constraints.",
      ok: true,
      details: "Enabled",
    },
    {
      name: "Analytics",
      desc: "Consistency metrics and pattern summary.",
      ok: !!analytics,
      details: analytics ? analytics.summary || "ready" : "loading...",
    },
    {
      name: "Stats",
      desc: "Daily streak, weekly counts, trend.",
      ok: !!stats,
      details: stats
        ? `streak ${stats.dailyStreak}, trend ${stats.trend}`
        : "loading...",
    },
  ];

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">FitMemory Features</h1>
      <p className="text-sm text-muted-foreground">
        Overview of active features and live status.
      </p>
      <div className="space-y-3">
        {items.map((it) => (
          <div
            key={it.name}
            className={`border rounded-md p-4 ${
              it.ok
                ? "border-green-300/40 bg-green-50/40 dark:bg-green-950/10"
                : "border-border/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{it.name}</div>
              <div
                className={`text-xs ${
                  it.ok ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                {it.ok ? "OK" : "Pending"}
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1">{it.desc}</div>
            <div className="text-xs mt-2">{it.details}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

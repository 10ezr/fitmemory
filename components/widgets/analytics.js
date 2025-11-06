"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sparkline from "@/components/widgets/Sparkline";

export default function AnalyticsOverviewWidget({ className = "" }) {
  const [data, setData] = useState({ weeklyCounts: [], rollingAverage: 0, trend: "stable" });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!active) return;
        setData({
          weeklyCounts: json.weeklyCounts || [],
          rollingAverage: json.rollingAverage || 0,
          trend: json.trend || "stable",
        });
      } catch (e) {
        if (active) setErr(e.message || "Failed");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, []);

  if (loading) return <Card className={className}><CardContent className="p-4 text-sm text-muted-foreground">Loading analytics…</CardContent></Card>;
  if (err) return <Card className={className}><CardContent className="p-4 text-sm text-rose-500">{err}</CardContent></Card>;

  const total = (data.weeklyCounts||[]).reduce((s,v)=>s+(Number(v)||0),0);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Analytics</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold">{total}</div>
          <div className="text-xs text-muted-foreground">sessions this week</div>
          <div className="text-xs mt-1">Avg: {data.rollingAverage.toFixed(1)} • {data.trend}</div>
        </div>
        <Sparkline data={data.weeklyCounts} color="#22c55e" />
      </CardContent>
    </Card>
  );
}

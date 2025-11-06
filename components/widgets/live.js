"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, MessageCircle, Timer as TimerIcon, Activity } from "lucide-react";
import Sparkline from "@/components/widgets/Sparkline";
import ProgressRing from "@/components/widgets/ProgressRing";
import { showActionToast } from "@/lib/toasts";

export function ReadinessWidget({ className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/readiness", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (active) setData(j);
      } catch (e) {
        if (active) setErr(e.message || "Failed");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, []);

  if (loading) return <Card className={className}><CardContent className="p-4 text-sm text-muted-foreground">Loading readiness…</CardContent></Card>;
  if (err) return <Card className={className}><CardContent className="p-4 text-sm text-rose-500">{err}</CardContent></Card>;

  const score = Math.max(0, Math.min(100, Number(data?.score ?? 0)));
  const tip = data?.tip || "Balanced day suggested";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> Readiness</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold">{score}</div>
          <div className="text-xs text-muted-foreground">today</div>
          <div className="text-xs mt-1">{tip}</div>
        </div>
        <ProgressRing progress={score} color="#eab308" />
      </CardContent>
    </Card>
  );
}

export function RecoveryDayWidget({ className = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/recovery-day", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (active) setData(j);
      } catch (e) {
        if (active) setErr(e.message || "Failed");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, []);

  if (loading) return <Card className={className}><CardContent className="p-4 text-sm text-muted-foreground">Loading recovery…</CardContent></Card>;
  if (err) return <Card className={className}><CardContent className="p-4 text-sm text-rose-500">{err}</CardContent></Card>;

  const msg = data?.message || "Train as usual";
  const confidence = Math.round((Number(data?.confidence ?? 0)) * 100);

  return (
    <Card className={className}>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Recovery</CardTitle></CardHeader>
      <CardContent className="pt-0 flex items-center justify-between">
        <div className="text-sm">{msg}</div>
        <Badge variant="secondary">{confidence}%</Badge>
      </CardContent>
    </Card>
  );
}

export function MessagesWidget({ limit = 5, className = "" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/messages?limit=${limit}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (active) setItems(Array.isArray(j) ? j : j?.messages || []);
      } catch (e) {
        if (active) setErr(e.message || "Failed");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, [limit]);

  if (loading) return <Card className={className}><CardContent className="p-4 text-sm text-muted-foreground">Loading messages…</CardContent></Card>;
  if (err) return <Card className={className}><CardContent className="p-4 text-sm text-rose-500">{err}</CardContent></Card>;

  return (
    <Card className={className}>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Messages</CardTitle></CardHeader>
      <CardContent className="pt-0 space-y-2 text-xs">
        {items.slice(0, limit).map((m, i) => (
          <div key={i} className={`p-2 rounded ${m.role==='assistant' ? 'bg-secondary/30' : m.role==='user' ? 'bg-primary/10' : 'bg-muted/40'}`}>{m.content}</div>
        ))}
        {items.length === 0 && <div className="text-muted-foreground">No messages yet</div>}
      </CardContent>
    </Card>
  );
}

export function TimerWidget({ className = "" }) {
  const [sessions, setSessions] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch("/api/timer-data", { cache: "no-store" });
      const j = await res.json();
      setSessions(j?.sessions || []);
    } catch {}
  };

  useEffect(() => { refresh(); }, []);

  const start = async (label, minutes) => {
    setBusy(true);
    try {
      await fetch("/api/timer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, duration: minutes * 60 }) });
      showActionToast({ type: "timer_started", duration: `${minutes}min` });
      await refresh();
    } finally { setBusy(false); }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TimerIcon className="h-4 w-4 text-violet-500" /> Timers</CardTitle></CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="text-xs text-muted-foreground">Active: {sessions.length}</div>
        <div className="grid grid-cols-3 gap-2">
          {[{label:"Focus",m:10},{label:"HIIT",m:20},{label:"Walk",m:30}].map(t => (
            <Button key={t.label} variant="outline" size="sm" disabled={busy} onClick={()=>start(`${t.m}m ${t.label}`, t.m)} className="gap-1">
              <Activity className="h-3 w-3" /> {t.m}m
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

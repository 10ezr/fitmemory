"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Moon, Target, TrendingUp } from "lucide-react";
import ProgressRing from "@/components/widgets/ProgressRing";
import Sparkline from "@/components/widgets/Sparkline";

// All widgets follow the same visual language as the app: shadcn cards, subtle gradients, compact typography.

export function StreakWidget({ days = 0, label = "Current Streak", className = "" }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex items-center justify-between">
        <div className="text-4xl font-bold leading-none">{days}</div>
        <div className="text-xs text-muted-foreground ml-3">days</div>
      </CardContent>
    </Card>
  );
}

export function SleepSummaryWidget({ durationH = 0, series = [], className = "" }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Moon className="h-4 w-4 text-blue-500" /> Sleep
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold">{durationH ? `${durationH}h` : "—"}</div>
          <div className="text-xs text-muted-foreground">last night</div>
        </div>
        <Sparkline data={series} color="#0ea5e9" />
      </CardContent>
    </Card>
  );
}

export function ConsistencyWidget({ weeklyCounts = [], className = "" }) {
  const pct = Math.min(100, Math.round((weeklyCounts.filter(v=>Number(v)>0).length/7)*100));
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" /> Consistency
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex items-center justify-between">
        <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">{pct}%</div>
        <Sparkline data={weeklyCounts} color="#22c55e" />
      </CardContent>
    </Card>
  );
}

export function GoalWidget({ value = 0, goal = 4, label = "Weekly goal", className = "" }) {
  const progress = Math.min(100, (value/goal)*100);
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-violet-500" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex items-center justify-between">
        <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{value}/{goal}</div>
        <ProgressRing progress={progress} color="#7c3aed" />
      </CardContent>
    </Card>
  );
}

export function MiniMetric({ title, value, hint, icon: Icon, colorClass = "text-primary", className = "" }) {
  return (
    <Card className={className}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
        {Icon ? <Icon className={`h-5 w-5 ${colorClass}`} /> : null}
      </CardContent>
    </Card>
  );
}

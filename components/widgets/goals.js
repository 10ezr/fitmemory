"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Footprints } from "lucide-react";

export function HydrationGoalWidget({ drunk = 0, goal = 8, onClick, className = "" }) {
  const progress = Math.min(100, (drunk/goal)*100);
  return (
    <Card className={`${className} hover:shadow-sm transition-all cursor-pointer`} onClick={onClick}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Hydration</div>
          <div className="text-lg font-semibold">{drunk}/{goal}</div>
        </div>
        <div className="relative">
          <Droplet className="h-6 w-6 text-cyan-500" />
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full" style={{ opacity: progress/100 }} />
        </div>
      </CardContent>
    </Card>
  );
}

export function StepsGoalWidget({ steps = 0, goal = 8000, className = "" }) {
  const progress = Math.min(100, (steps/goal)*100);
  return (
    <Card className={`${className} hover:shadow-sm transition-all`}>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Footprints className="h-4 w-4 text-emerald-500" /> Steps</CardTitle></CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="text-lg font-semibold">{steps.toLocaleString()}</div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

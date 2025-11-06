"use client";

import { useMemo } from "react";

export default function RightRail({ stats, sleep, workouts }) {
  const weekly = stats?.weeklyCounts || [];
  const lastSleep = sleep?.[0];
  const nextResetMs = useMemo(() => {
    const last = Number(stats?.lastSuccessAt || 0);
    if (!last) return 0;
    const target = last + 24 * 60 * 60 * 1000;
    return Math.max(0, target - Date.now());
  }, [stats?.lastSuccessAt]);

  const hrs = Math.floor(nextResetMs / 3600000);
  const mins = Math.floor((nextResetMs % 3600000) / 60000);

  return (
    <div className="grid gap-4">
      <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/10 hover:shadow-md transition-all rounded-lg border">
        <div className="p-4 text-sm flex items-center gap-3">
          <span className="inline-block w-4 h-4 rounded-sm bg-yellow-400" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">Coach tip</div>
            <div className="text-xs text-muted-foreground truncate">
              {weekly.reduce((s,v)=>s+(Number(v)||0),0) < 3 ? "Add cardio for consistency" : (lastSleep?.duration < 7 ? "Aim for 7-9h sleep" : "Review analytics for insights")}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border hover:shadow-sm transition-all">
        <div className="p-4">
          <div className="text-sm font-medium mb-2">Live reminders</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Hydrate</span><span className="px-2 py-0.5 text-xs rounded bg-muted">250ml</span></div>
            <div className="flex items-center justify-between"><span>Stand</span><span className="px-2 py-0.5 text-xs rounded bg-muted">2min</span></div>
            <div className="flex items-center justify-between"><span>Wind-down</span><span className="px-2 py-0.5 text-xs rounded bg-muted">10:30 PM</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border hover:shadow-sm transition-all">
        <div className="p-4">
          <div className="text-sm font-medium mb-2">Weekly pulse</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">{weekly.reduce((s,v)=>s+(Number(v)||0),0)}</div>
              <div className="text-[11px] text-muted-foreground">sessions</div>
            </div>
          </div>
          {nextResetMs > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
              <span>Next reset</span>
              <span>{hrs}h {mins}m</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border hover:shadow-sm transition-all">
        <div className="p-4">
          <div className="text-sm font-medium mb-2">Quick notes</div>
          <textarea className="w-full h-20 text-sm rounded-md border bg-muted/30 p-2 outline-none resize-none" placeholder="Warm-up ideas, cues..." />
        </div>
      </div>
    </div>
  );
}

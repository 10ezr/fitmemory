"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon } from "lucide-react";
import Sparkline from "@/components/widgets/Sparkline";
import { showActionToast } from "@/lib/toasts";

export default function SleepWidget({ lastSleep, onSleepLog }) {
  const [hours, setHours] = useState("7");
  const [logging, setLogging] = useState(false);

  const quickLog = async () => {
    setLogging(true);
    try {
      const res = await fetch('/api/sleep/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: Number(hours), date: new Date().toISOString() })
      });
      if (res.ok) {
        showActionToast({ type: "sleep_updated", durationMin: Number(hours) * 60 });
        onSleepLog?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogging(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Moon className="h-4 w-4" /> Sleep</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{lastSleep?.duration ? `${lastSleep.duration}h` : "—"}</div>
            <div className="text-xs text-muted-foreground">last night</div>
          </div>
          <Sparkline data={Array.from({length: 7}, (_, i) => Math.random() * 9 + 6)} color="#0ea5e9" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 8}, (_, i) => i + 5).map(h => (
                <SelectItem key={h} value={h.toString()}>{h}h</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={quickLog} disabled={logging} className="h-8 text-xs">
            {logging ? "Logging..." : "Log Sleep"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

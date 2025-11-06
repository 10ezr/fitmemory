"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsWidget({ className = "" }) {
  const [settings, setSettings] = useState({ reminderEnabled: false, reminderTime: "21:30" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/sleep/goals", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (active) setSettings({
            reminderEnabled: !!j?.preferences?.reminderEnabled,
            reminderTime: j?.preferences?.reminderTime || "21:30",
          });
        }
      } catch {}
    })();
    return () => { active = false };
  }, []);

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/sleep/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: settings })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      setErr(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {err ? <div className="text-xs text-rose-500">{err}</div> : null}
        <div className="flex items-center justify-between">
          <Label htmlFor="remind" className="text-sm">Sleep Reminder</Label>
          <Switch id="remind" checked={settings.reminderEnabled} onCheckedChange={(v)=>setSettings(s=>({...s, reminderEnabled:v}))} />
        </div>
        <div className="grid grid-cols-2 gap-2 items-center">
          <Label htmlFor="time" className="text-sm">Reminder Time</Label>
          <Input id="time" value={settings.reminderTime} onChange={e=>setSettings(s=>({...s, reminderTime:e.target.value}))} placeholder="21:30" />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} size="sm">{saving?"Saving…":"Save"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

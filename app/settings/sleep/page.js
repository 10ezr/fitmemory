"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Moon, Clock, Target, Settings } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function SleepSettingsPage() {
  const [settings, setSettings] = useState({
    sleepReminders: true,
    reminderTime: '22:00',
    targetSleepHours: [8],
    sleepQualityGoal: [7],
    weekendFlexibility: true,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const toArr = (v, def) => Array.isArray(v) ? v : [v ?? def];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          sleepReminders: data.sleepReminders ?? prev.sleepReminders,
          reminderTime: data.reminderTime ?? prev.reminderTime,
          targetSleepHours: toArr(data.targetSleepHours, 8),
          sleepQualityGoal: toArr(data.sleepQualityGoal, 7),
          weekendFlexibility: data.weekendFlexibility ?? prev.weekendFlexibility,
        }));
      }
    } catch (error) {
      console.error('Failed to load sleep settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/sleep-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSleepHours: Number(settings.targetSleepHours[0]),
          sleepQualityGoal: Number(settings.sleepQualityGoal[0]),
          reminderTime: settings.reminderTime,
          sleepReminders: settings.sleepReminders,
          weekendFlexibility: settings.weekendFlexibility,
        }),
      });

      if (response.ok) {
        toast.success('Sleep settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div className="h-8 bg-muted rounded-lg animate-pulse" />
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Sleep Goals
          </h1>
          <p className="text-muted-foreground">
            Configure your sleep targets and bedtime preferences
          </p>
        </motion.div>

        {/* Sleep Goals Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-blue-600" />
                Sleep Targets
              </CardTitle>
              <CardDescription>
                Set your ideal sleep duration and quality goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Target Sleep Duration: {settings.targetSleepHours[0]} hours</Label>
                <Slider
                  value={settings.targetSleepHours}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, targetSleepHours: value }))}
                  max={12}
                  min={6}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>6h</span><span>9h (recommended)</span><span>12h</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Sleep Quality Goal: {settings.sleepQualityGoal[0]}/10</Label>
                <Slider
                  value={settings.sleepQualityGoal}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, sleepQualityGoal: value }))}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Poor</span><span>Good</span><span>Excellent</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reminders Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Sleep Reminders
              </CardTitle>
              <CardDescription>
                Get notified when it's time to wind down for bed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Sleep Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get bedtime notifications</p>
                </div>
                <Switch
                  checked={settings.sleepReminders}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sleepReminders: checked }))}
                />
              </div>
              
              {settings.sleepReminders && (
                <div className="space-y-2">
                  <Label htmlFor="reminder-time">Bedtime Reminder</Label>
                  <Input
                    id="reminder-time"
                    type="time"
                    value={settings.reminderTime}
                    onChange={(e) => setSettings(prev => ({ ...prev, reminderTime: e.target.value }))}
                    className="w-full"
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Weekend Flexibility</Label>
                  <p className="text-sm text-muted-foreground">Allow later bedtime on weekends</p>
                </div>
                <Switch
                  checked={settings.weekendFlexibility}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, weekendFlexibility: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="w-full flex items-center gap-2"
            size="lg"
          >
            {saving ? (
              <>Saving... <Settings className="h-4 w-4 animate-spin" /></>
            ) : (
              <>Save Sleep Settings <Target className="h-4 w-4" /></>
            )}
          </Button>
        </motion.div>
      </div>
      
      <BottomNav />
    </div>
  );
}
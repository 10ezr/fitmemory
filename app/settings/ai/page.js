"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Zap, Brain, Heart, Settings, Save, Database, Target } from "lucide-react";


export default function AISettingsPage() {
  const [settings, setSettings] = useState({
    memoryThreshold: [0.7],
    flexibleMode: true,
    weekendFlexibility: true,
    adaptivePlanning: true,
    personalizedFeedback: true,
  });
  
  const [stats, setStats] = useState({
    memoryCount: 0,
    dataSize: '0 MB',
    totalWorkouts: 0,
    aiInsights: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const toArr = (v, def) => Array.isArray(v) ? v : [v ?? def];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        fetch('/api/admin/settings').catch(() => ({ ok: false })),
        fetch('/api/admin/stats').catch(() => ({ ok: false }))
      ]);
      
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(prev => ({
          ...prev,
          memoryThreshold: toArr(data.memoryThreshold, 0.7),
          flexibleMode: data.flexibleMode ?? prev.flexibleMode,
          weekendFlexibility: data.weekendFlexibility ?? prev.weekendFlexibility,
          adaptivePlanning: data.adaptivePlanning ?? prev.adaptivePlanning,
          personalizedFeedback: data.personalizedFeedback ?? prev.personalizedFeedback,
        }));
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          memoryCount: data.memoryCount || 0,
          dataSize: data.dataSize || '0 MB',
          totalWorkouts: data.totalWorkouts || 0,
          aiInsights: data.aiInsights || 0
        });
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryThreshold: Number(settings.memoryThreshold[0]),
          flexibleMode: settings.flexibleMode,
          weekendFlexibility: settings.weekendFlexibility,
          adaptivePlanning: settings.adaptivePlanning,
          personalizedFeedback: settings.personalizedFeedback,
        }),
      });

      if (response.ok) {
        toast.success('AI settings saved successfully');
        await loadData(); // Refresh stats
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI & Memory
          </h1>
          <p className="text-muted-foreground">
            Configure how FitMemory learns and adapts to your preferences
          </p>
        </motion.div>

        {/* Memory Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Memory Configuration
              </CardTitle>
              <CardDescription>
                Control how FitMemory stores and uses your personal data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>
                  Memory Storage Threshold: {(settings.memoryThreshold[0] * 100).toFixed(0)}%
                </Label>
                <Slider
                  value={settings.memoryThreshold}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, memoryThreshold: value }))}
                  max={1}
                  min={0.3}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Store more data</span>
                  <span>Balanced</span>
                  <span>Store only important</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Higher values mean FitMemory will be more selective about what to remember, 
                  storing only the most important information. Lower values store more details.
                </p>
              </div>
              
              {/* Memory Stats */}
              <div className="bg-card/30 rounded-lg p-4 space-y-3">
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Memory Statistics
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-2 bg-background/50 rounded">
                    <div className="text-lg font-semibold text-purple-600">{stats.memoryCount}</div>
                    <div className="text-xs text-muted-foreground">Stored Memories</div>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded">
                    <div className="text-lg font-semibold text-blue-600">{stats.dataSize}</div>
                    <div className="text-xs text-muted-foreground">Data Size</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Behavior Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                AI Behavior
              </CardTitle>
              <CardDescription>
                Customize how the AI coach adapts to your lifestyle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-sm font-medium">Flexible Training Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow AI to adjust your workout schedule based on your progress and availability
                    </p>
                  </div>
                  <Switch
                    checked={settings.flexibleMode}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, flexibleMode: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between space-x-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-sm font-medium">Weekend Flexibility</Label>
                    <p className="text-xs text-muted-foreground">
                      Give more relaxed recommendations on weekends
                    </p>
                  </div>
                  <Switch
                    checked={settings.weekendFlexibility}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, weekendFlexibility: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between space-x-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-sm font-medium">Adaptive Planning</Label>
                    <p className="text-xs text-muted-foreground">
                      Let AI learn from your patterns and suggest optimal workout times
                    </p>
                  </div>
                  <Switch
                    checked={settings.adaptivePlanning}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, adaptivePlanning: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between space-x-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-sm font-medium">Personalized Feedback</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive feedback tailored to your specific goals and progress
                    </p>
                  </div>
                  <Switch
                    checked={settings.personalizedFeedback}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, personalizedFeedback: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Performance Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-600" />
                AI Performance
              </CardTitle>
              <CardDescription>
                How well your AI coach is learning and adapting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.totalWorkouts}</div>
                  <div className="text-xs text-muted-foreground">Training Sessions</div>
                </div>
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.aiInsights}</div>
                  <div className="text-xs text-muted-foreground">AI Insights Generated</div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Tip:</strong> The more you use FitMemory, the better it becomes at understanding 
                  your preferences and providing personalized recommendations.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
              <>Save AI Settings <Target className="h-4 w-4" /></>
            )}
          </Button>
        </motion.div>
      </div>
      
    </div>
  );
}
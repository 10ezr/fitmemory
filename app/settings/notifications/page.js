"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bell,
  Activity,
  Moon,
  AlertTriangle,
  Settings,
  Save,
} from "lucide-react";
export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState({
    notifications: true,
    workoutNotifications: true,
    sleepReminders: true,
    streakWarnings: true,
    achievements: true,
    systemAlerts: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => ({
          ...prev,
          notifications: data.notifications ?? prev.notifications,
          workoutNotifications:
            data.workoutNotifications ?? prev.workoutNotifications,
          sleepReminders: data.sleepReminders ?? prev.sleepReminders,
          streakWarnings: data.streakWarnings ?? prev.streakWarnings,
          achievements: data.achievements ?? prev.achievements,
          systemAlerts: data.systemAlerts ?? prev.systemAlerts,
        }));
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Notification settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const notificationGroups = [
    {
      title: "Fitness & Workouts",
      icon: Activity,
      color: "text-green-600",
      items: [
        {
          key: "workoutNotifications",
          label: "Workout Completed",
          description: "Celebrate your fitness achievements and progress",
        },
        {
          key: "streakWarnings",
          label: "Streak Alerts",
          description: "Get warned before losing your workout streak",
        },
        {
          key: "achievements",
          label: "Achievement Badges",
          description: "Notifications for milestones and personal records",
        },
      ],
    },
    {
      title: "Sleep & Recovery",
      icon: Moon,
      color: "text-blue-600",
      items: [
        {
          key: "sleepReminders",
          label: "Sleep Reminders",
          description: "Bedtime and wake-up notifications",
        },
      ],
    },
    {
      title: "System & General",
      icon: Bell,
      color: "text-orange-600",
      items: [
        {
          key: "notifications",
          label: "General Notifications",
          description: "System updates and general alerts",
        },
        {
          key: "systemAlerts",
          label: "System Alerts",
          description: "Important system messages and updates",
        },
      ],
    },
  ];

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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Control when and how you receive alerts and reminders
          </p>
        </motion.div>

        {/* Master Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    All Notifications
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Master control for all FitMemory notifications
                  </p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifications: checked,
                      // Disable all other notifications if master is turned off
                      ...(checked
                        ? {}
                        : {
                            workoutNotifications: false,
                            sleepReminders: false,
                            streakWarnings: false,
                            achievements: false,
                            systemAlerts: false,
                          }),
                    }))
                  }
                  className="scale-125"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification Groups */}
        {notificationGroups.map((group, groupIndex) => {
          const GroupIcon = group.icon;
          return (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + groupIndex * 0.1 }}
            >
              <Card
                className={`${!settings.notifications ? "opacity-50" : ""}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GroupIcon className={`h-5 w-5 ${group.color}`} />
                    {group.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.items.map((item, itemIndex) => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between space-x-4">
                        <div className="space-y-1 flex-1">
                          <Label className="text-sm font-medium">
                            {item.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <Switch
                          checked={settings[item.key] && settings.notifications}
                          onCheckedChange={(checked) =>
                            setSettings((prev) => ({
                              ...prev,
                              [item.key]: checked,
                            }))
                          }
                          disabled={!settings.notifications}
                        />
                      </div>
                      {itemIndex < group.items.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* System Permissions Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Browser Permissions</h4>
                  <p className="text-xs text-muted-foreground">
                    Some notifications may require browser permission. If you
                    don&apos;t receive notifications, check your browser
                    settings or click the notification icon in your address bar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="w-full flex items-center gap-2"
            size="lg"
          >
            {saving ? (
              <>
                Saving... <Settings className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                Save Notification Settings <Save className="h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Settings, RefreshCw, Plus, Edit3, Trash2, 
  Clock, Brain, Activity, MessageSquare, 
  Calendar, TrendingUp, Database, User
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

const StatCard = ({ title, value, subtitle, icon: Icon, color = "text-primary" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    className="group"
  >
    <Card className="h-full transition-all duration-200 group-hover:shadow-md border-2 hover:border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const MemoryCard = ({ memory, isEditing, onEdit, onSave, onCancel, onDelete, onChange }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
  >
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <Input
                value={memory.type}
                onChange={(e) => onChange({ ...memory, type: e.target.value })}
                placeholder="Memory type (e.g., preference, goal, constraint)"
                className="border-2 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Content</label>
              <Textarea
                value={memory.content}
                onChange={(e) => onChange({ ...memory, content: e.target.value })}
                rows={4}
                placeholder="Memory content..."
                className="border-2 focus:border-primary resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={onSave} className="flex items-center gap-2">
                <Settings className="h-3 w-3" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs font-medium">
                {memory.type}
              </Badge>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 w-8 p-0">
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {memory.content}
            </p>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Created: {new Date(memory.createdAt || Date.now()).toLocaleDateString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [memories, setMemories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [streak, setStreak] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/context", { cache: "no-store" });
      const data = await res.json();
      setPayload(data);
      setMemories(data.memories || []);
      setStreak(data.streakData || null);
    } catch (e) {
      toast.error("Failed to load admin context");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveMemory = async (m) => {
    try {
      const res = await fetch("/api/admin/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m),
      });
      if (!res.ok) throw new Error();
      toast.success("Memory updated successfully");
      await load();
      setEditing(null);
    } catch {
      toast.error("Failed to update memory");
    }
  };

  const deleteMemory = async (id) => {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    
    try {
      const res = await fetch(
        `/api/admin/memory?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Memory deleted successfully");
      await load();
    } catch {
      toast.error("Failed to delete memory");
    }
  };

  const addMemory = async () => {
    try {
      const res = await fetch("/api/admin/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "preference",
          content: "New memory item - edit to customize",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Memory added successfully");
      await load();
    } catch {
      toast.error("Failed to add memory");
    }
  };

  const saveStreak = async () => {
    try {
      const res = await fetch("/api/admin/streak", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(streak),
      });
      if (!res.ok) throw new Error();
      toast.success("Streak data updated successfully");
      await load();
    } catch {
      toast.error("Failed to update streak");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div className="h-8 bg-muted rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
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
          className="flex items-center justify-between"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage AI context, memories, and system configuration
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={load} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Long-term Memories"
            value={memories.length}
            subtitle="Stored preferences & context"
            icon={Brain}
          />
          <StatCard
            title="Recent Messages"
            value={payload?.lastMessages?.length || 0}
            subtitle="Short-term context"
            icon={MessageSquare}
          />
          <StatCard
            title="Current Streak"
            value={`${streak?.currentStreak || 0} days`}
            subtitle={`Best: ${streak?.longestStreak || 0} days`}
            icon={TrendingUp}
            color="text-orange-500"
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-12">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="memories" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Memories
            </TabsTrigger>
            <TabsTrigger value="streak" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Streak
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="workouts" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Workouts
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm font-medium">Timezone</span>
                      <Badge variant="outline">
                        {payload?.currentDateTime?.timezone || "UTC"}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50">
                      <span className="text-sm font-medium">Local Time</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {payload?.currentDateTime?.display || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <span className="text-sm font-medium">ISO Timestamp</span>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {payload?.currentDateTime?.iso}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Memories Tab */}
          <TabsContent value="memories" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Long-term Memories</h2>
                <p className="text-sm text-muted-foreground">AI context and user preferences</p>
              </div>
              <Button onClick={addMemory} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Memory
              </Button>
            </div>
            
            <div className="grid gap-4">
              {memories.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No memories stored</h3>
                    <p className="text-muted-foreground mb-4">
                      Add memories to help the AI remember your preferences and context.
                    </p>
                    <Button onClick={addMemory} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Memory
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                memories.map((m) => (
                  <MemoryCard
                    key={m._id || m.id}
                    memory={m}
                    isEditing={editing === (m._id || m.id)}
                    onEdit={() => setEditing(m._id || m.id)}
                    onSave={() => saveMemory(m)}
                    onCancel={() => setEditing(null)}
                    onDelete={() => deleteMemory(m._id || m.id)}
                    onChange={(updated) => 
                      setMemories(memories.map(x => 
                        (x._id || x.id) === (m._id || m.id) ? updated : x
                      ))
                    }
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Streak Tab */}
          <TabsContent value="streak" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Streak Management
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage workout streak data and statistics
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Current Streak</label>
                    <Input
                      type="number"
                      value={streak?.currentStreak ?? 0}
                      onChange={(e) =>
                        setStreak({
                          ...streak,
                          currentStreak: Number(e.target.value),
                        })
                      }
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Longest Streak</label>
                    <Input
                      type="number"
                      value={streak?.longestStreak ?? 0}
                      onChange={(e) =>
                        setStreak({
                          ...streak,
                          longestStreak: Number(e.target.value),
                        })
                      }
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Missed Workouts</label>
                    <Input
                      type="number"
                      value={streak?.missedWorkouts ?? 0}
                      onChange={(e) =>
                        setStreak({
                          ...streak,
                          missedWorkouts: Number(e.target.value),
                        })
                      }
                      className="border-2 focus:border-primary"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Workout Date</label>
                  <Input
                    type="datetime-local"
                    value={streak?.lastWorkoutDate ? new Date(streak.lastWorkoutDate).toISOString().slice(0, 16) : ""}
                    onChange={(e) =>
                      setStreak({ 
                        ...streak, 
                        lastWorkoutDate: e.target.value ? new Date(e.target.value).toISOString() : "" 
                      })
                    }
                    className="border-2 focus:border-primary"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={saveStreak} className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={load}>
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recent Messages
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Short-term conversation context
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(payload?.lastMessages || []).length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No recent messages</p>
                    </div>
                  ) : (
                    (payload?.lastMessages || []).map((m, i) => (
                      <div key={i} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={m.role === 'user' ? 'default' : 'secondary'}>
                            {m.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(m.createdAt || Date.now()).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{m.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Workouts
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Latest workout sessions and data
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(payload?.recentWorkouts || []).length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No recent workouts</p>
                    </div>
                  ) : (
                    (payload?.recentWorkouts || []).map((w) => (
                      <div key={w._id || w.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{w.name || "Workout"}</h4>
                          <Badge variant="outline">
                            {w.exercises?.length || 0} exercises
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Duration: {Math.round((w.duration || 0) / 60)}min</span>
                          <span>Date: {new Date(w.date || w.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <BottomNav />
    </div>
  );
}
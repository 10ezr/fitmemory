"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

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
      toast.success("Memory updated");
      await load();
      setEditing(null);
    } catch {
      toast.error("Failed to update memory");
    }
  };

  const deleteMemory = async (id) => {
    try {
      const res = await fetch(
        `/api/admin/memory?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Memory deleted");
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
          content: "New memory item",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Memory added");
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
      toast.success("Streak updated");
      await load();
    } catch {
      toast.error("Failed to update streak");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">Loading admin context…</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">AI Context Admin</h1>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="memories">Memories</TabsTrigger>
          <TabsTrigger value="streak">Streak</TabsTrigger>
          <TabsTrigger value="messages">Short-term</TabsTrigger>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                Timezone:{" "}
                <Badge>{payload?.currentDateTime?.timezone || "UTC"}</Badge>
              </div>
              <div className="text-sm">
                Local display: {payload?.currentDateTime?.display || "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                ISO: {payload?.currentDateTime?.iso}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memories">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium">Long-term memories</h2>
            <Button onClick={addMemory} size="sm" variant="secondary">
              Add
            </Button>
          </div>
          <div className="space-y-3">
            {memories.map((m) => (
              <Card key={m._id || m.id}>
                <CardContent className="p-4 space-y-2">
                  {editing === (m._id || m.id) ? (
                    <>
                      <div className="grid gap-2">
                        <Input
                          value={m.type}
                          onChange={(e) =>
                            setMemories(
                              memories.map((x) =>
                                (x._id || x.id) === (m._id || m.id)
                                  ? { ...x, type: e.target.value }
                                  : x
                              )
                            )
                          }
                          placeholder="type"
                        />
                        <Textarea
                          value={m.content}
                          onChange={(e) =>
                            setMemories(
                              memories.map((x) =>
                                (x._id || x.id) === (m._id || m.id)
                                  ? { ...x, content: e.target.value }
                                  : x
                              )
                            )
                          }
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveMemory(m)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs uppercase text-muted-foreground">
                        {m.type}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {m.content}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(m._id || m.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMemory(m._id || m.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
            {memories.length === 0 && (
              <Card>
                <CardContent className="p-4 text-sm">
                  No memories yet.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="streak">
          <Card>
            <CardHeader>
              <CardTitle>Streak fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    currentStreak
                  </div>
                  <Input
                    type="number"
                    value={streak?.currentStreak ?? 0}
                    onChange={(e) =>
                      setStreak({
                        ...streak,
                        currentStreak: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    longestStreak
                  </div>
                  <Input
                    type="number"
                    value={streak?.longestStreak ?? 0}
                    onChange={(e) =>
                      setStreak({
                        ...streak,
                        longestStreak: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    missedWorkouts
                  </div>
                  <Input
                    type="number"
                    value={streak?.missedWorkouts ?? 0}
                    onChange={(e) =>
                      setStreak({
                        ...streak,
                        missedWorkouts: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  lastWorkoutDate (ISO)
                </div>
                <Input
                  value={streak?.lastWorkoutDate || ""}
                  onChange={(e) =>
                    setStreak({ ...streak, lastWorkoutDate: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveStreak}>Save</Button>
                <Button variant="outline" onClick={load}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Short-term context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(payload?.lastMessages || []).map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="text-muted-foreground">{m.role}:</span>{" "}
                  {m.content}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workouts">
          <Card>
            <CardHeader>
              <CardTitle>Recent workouts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(payload?.recentWorkouts || []).map((w) => (
                <div key={w._id || w.id} className="text-sm">
                  {w.name} — {w.exercises?.length || 0} exercises
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

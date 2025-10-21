"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function TomorrowSidebar() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tomorrow-workout");
      const json = await res.json();
      if (res.ok) setData(json);
    } catch (e) {
      console.error("Failed to load tomorrow plan", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();

    // Optional: refresh hook from app events
    const handler = () => fetchPlan();
    window.addEventListener("dataChanged", handler);
    return () => window.removeEventListener("dataChanged", handler);
  }, []);

  const dateLabel = data?.date
    ? new Date(data.date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Tomorrow";

  return (
    <aside className="hidden lg:flex w-80 xl:w-96 flex-col border-l bg-background/60 backdrop-blur">
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tomorrow&apos;s Workout</span>
              {data?.source === "planned" ? (
                <Badge variant="secondary">Planned</Badge>
              ) : (
                <Badge variant="outline">AI</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-sm text-muted-foreground">Loading…</div>
            )}

            {!loading && data?.workout && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {dateLabel} • {data.workout.estimatedDuration || 30} min
                </div>

                {data.constraints?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium">Adapted for:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.constraints.slice(0, 4).map((c, i) => (
                        <Badge key={i} variant="outline">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Exercises</div>
                  <ul className="space-y-1.5">
                    {data.workout.exercises.map((ex, i) => (
                      <li key={i} className="text-sm">
                        • {ex.name} — {ex.sets}x{ex.reps}
                        {ex.notes ? (
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            ({ex.notes})
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>

                {data.adaptations?.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Changes</div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {data.adaptations.map((a, i) => (
                          <li key={i}>
                            {a.from} → {a.to} — {a.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Clock,
  Target,
  Trophy,
  CheckCircle2,
  Circle,
  Flame,
} from "lucide-react";
import realTimeSync from "@/app/services/realTimeSync";

export default function TomorrowSidebar() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [challengeData, setChallengeData] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(true);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/tomorrow-workout");
      const json = await res.json();

      if (res.ok) {
        setData(json);
      } else {
        setError(json.error || "Failed to load");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChallengeData = async () => {
    try {
      setChallengeLoading(true);
      const res = await fetch("/api/challenge-30");
      const json = await res.json();
      setChallengeData(json);
    } catch (e) {
      console.error("Failed to fetch challenge data:", e);
      // Fallback skeleton data
      const today = new Date();
      const fallbackData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        fallbackData.push({
          date: date.toISOString().slice(0, 10),
          dayNum: date.getDate(),
          isToday: i === 0,
          completed: false,
        });
      }
      setChallengeData({
        challengeData: fallbackData,
        completedDays: 0,
        totalDays: 30,
        progressPercentage: 0,
        isCompleted: false,
      });
    } finally {
      setChallengeLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
    fetchChallengeData();

    // Subscribe to real-time updates for stats/workouts
    const unsubscribeStats = realTimeSync.subscribe(
      "stats",
      () => {
        fetchChallengeData();
      },
      "TomorrowSidebar"
    );

    const unsubscribeStreak = realTimeSync.subscribe(
      "streak",
      () => {
        fetchChallengeData();
      },
      "TomorrowSidebar"
    );

    return () => {
      unsubscribeStats();
      unsubscribeStreak();
    };
  }, []);

  return (
    <aside className="flex w-80 xl:w-96 flex-col border-l border-neutral-900/10 dark:border-neutral-900 bg-background">
      {/* Make inner content independently scrollable like left sidebar */}
      <div className="p-4 space-y-4 h-[100svh] overflow-y-auto scrollbar-hide">
        {/* 30-Day Challenge - connected to database */}
        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              30-Day Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {challengeLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <div className="grid grid-cols-6 gap-2">
                  {[...Array(30)].map((_, i) => (
                    <Skeleton key={i} className="w-10 h-10 rounded-md" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-muted-foreground">Progress</div>
                  <div className="text-xs font-medium text-primary">
                    {challengeData?.completedDays || 0}/
                    {challengeData?.totalDays || 30}
                  </div>
                </div>

                {challengeData?.progressPercentage > 0 && (
                  <div className="mb-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${challengeData.progressPercentage}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-center mt-1">
                      {challengeData.progressPercentage}% Complete
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-6 gap-2">
                  {challengeData?.challengeData?.map((cell, idx) => {
                    const stateClass = cell.completed
                      ? "bg-green-500 text-white border-green-600"
                      : cell.isToday
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground border-border/50";

                    const Icon = cell.completed
                      ? CheckCircle2
                      : cell.isToday
                      ? Flame
                      : Circle;

                    return (
                      <div
                        key={cell.date}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className={`w-10 h-10 rounded-md border flex items-center justify-center text-xs font-semibold transition-all hover:scale-105 ${stateClass}`}
                          aria-label={`Day ${idx + 1} ${
                            cell.completed
                              ? "completed"
                              : cell.isToday
                              ? "today"
                              : "pending"
                          }`}
                          title={`${cell.date} ${
                            cell.completed
                              ? "✓ Completed"
                              : cell.isToday
                              ? "Today"
                              : "Not completed"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium">
                          {cell.dayNum}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {challengeData?.isCompleted && (
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md text-center">
                    <div className="text-sm font-medium text-green-700 dark:text-green-300">
                      🎉 Challenge Completed!
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Tomorrow's Workout */}
        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Tomorrow&apos;s Workout
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Error: {error}</span>
              </div>
            )}

            {!loading && !error && !data && (
              <div className="text-center py-4">
                <div className="text-muted-foreground text-sm">
                  No data received
                </div>
              </div>
            )}

            {data?.workout && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    {data.workout.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      {data.workout.estimatedDuration} min
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Exercises
                  </h4>
                  <div className="space-y-1">
                    {data.workout.exercises?.map((ex, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <span className="text-sm font-medium">{ex.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {ex.sets}×{ex.reps}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

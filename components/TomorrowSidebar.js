"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Clock, Target, Trophy, CheckCircle2, Circle, Flame, BellRing } from "lucide-react"
import realTimeSync from "@/app/services/realTimeSync"

export default function TomorrowSidebar() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const [challengeData, setChallengeData] = useState(null)
  const [challengeLoading, setChallengeLoading] = useState(true)
  const warningTimerRef = useRef(null)

  const fetchPlan = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/tomorrow-workout", { cache: "no-store" })
      const json = await res.json()
      if (res.ok) setData(json); else setError(json.error || "Failed to load")
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const fetchChallengeData = async () => {
    try {
      setChallengeLoading(true)
      const res = await fetch(`/api/challenge-30-advanced?ts=${Date.now()}`, { cache: "no-store" })
      const json = await res.json()
      setChallengeData(json)
      scheduleWarning(json)
    } finally { setChallengeLoading(false) }
  }

  const scheduleWarning = (challenge) => {
    try {
      if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null }
      if (!challenge?.warningAtISO) return
      const warnAt = new Date(challenge.warningAtISO).getTime()
      const now = Date.now()
      const ms = warnAt - now
      if (ms <= 0) {
        triggerWarning(challenge)
      } else {
        warningTimerRef.current = setTimeout(() => triggerWarning(challenge), ms)
      }
    } catch {}
  }

  const triggerWarning = (challenge) => {
    try {
      // Use Notifications API if available
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Streak at risk", { body: "2 hours until reset. Don’t lose your 30-day challenge!", icon: "/icon-192x192.png" })
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") new Notification("Streak at risk", { body: "2 hours until reset. Don’t lose your 30-day challenge!", icon: "/icon-192x192.png" })
          })
        }
      }
      // Broadcast app-level toast/snackbar via realtime sync channel
      realTimeSync.broadcastDataChange?.("challenge-warning", { at: new Date().toISOString() }, "challenge")
    } catch {}
  }

  useEffect(() => {
    fetchPlan();
    fetchChallengeData();

    const unsubStats = realTimeSync.subscribe("stats", fetchChallengeData, "TomorrowSidebar")
    const unsubStreak = realTimeSync.subscribe("streak", fetchChallengeData, "TomorrowSidebar")
    const unsubWorkout = realTimeSync.subscribe?.("workout-completed", fetchChallengeData, "TomorrowSidebar")

    return () => {
      unsubStats();
      unsubStreak();
      unsubWorkout && unsubWorkout();
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    }
  }, [])

  const consecutive = challengeData?.consecutive || 0
  const progressPct = challengeData?.progressPercentage || 0

  return (
    <aside className="flex w-80 xl:w-96 flex-col border-l border-neutral-900/10 dark:border-neutral-900 bg-background">
      <div className="p-4 space-y-4 h-[100svh] overflow-y-auto scrollbar-hide">
        {/* 30-Day Challenge */}
        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> 30-Day Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {challengeLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <div className="grid grid-cols-6 gap-2">{[...Array(30)].map((_, i) => (<Skeleton key={i} className="w-10 h-10 rounded-md" />))}</div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-muted-foreground">Consecutive</div>
                  <div className="text-xs font-medium text-primary">{consecutive}/30</div>
                </div>

                <div className="mb-3">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground text-center mt-1">{progressPct}% Complete</div>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {challengeData?.challengeData?.map((cell, idx) => {
                    const stateClass = cell.completed ? "bg-green-500 text-white border-green-600" : cell.isToday ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border/50"
                    const Icon = cell.completed ? CheckCircle2 : cell.isToday ? Flame : Circle
                    return (
                      <div key={cell.date} className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-md border flex items-center justify-center text-xs font-semibold transition-all hover:scale-105 ${stateClass}`} aria-label={`Day ${idx + 1} ${cell.completed ? "completed" : cell.isToday ? "today" : "pending"}`} title={`${cell.date} ${cell.completed ? "✓ Completed" : cell.isToday ? "Today" : "Not completed"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium">{cell.dayNum}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BellRing className="h-4 w-4 text-primary" />
                    <span>Warning at</span>
                  </div>
                  <div className="text-xs font-medium">{challengeData?.warningAtISO ? new Date(challengeData.warningAtISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Resets at</span>
                  </div>
                  <div className="text-xs font-medium">{challengeData?.resetAtISO ? new Date(challengeData.resetAtISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tomorrow's Workout (unchanged) */}
        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Tomorrow&apos;s Workout
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><div className="space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div></div>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /><span className="text-sm">Error: {error}</span></div>
            ) : !data ? (
              <div className="text-center py-4"><div className="text-muted-foreground text-sm">No data received</div></div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">{data.workout.name}</h3>
                  <div className="flex items-center gap-2 mb-3"><Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />{data.workout.estimatedDuration} min</Badge></div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Exercises</h4>
                  <div className="space-y-1">
                    {data.workout.exercises?.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/50"><span className="text-sm font-medium">{ex.name}</span><Badge variant="outline" className="text-xs">{ex.sets}×{ex.reps}</Badge></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </aside>
  )
}

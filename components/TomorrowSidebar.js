"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Clock, Target, Calendar } from "lucide-react"

export default function TomorrowSidebar() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const fetchPlan = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Fetching tomorrow workout...")

      const res = await fetch("/api/tomorrow-workout")
      console.log("Response status:", res.status)

      const json = await res.json()
      console.log("Response data:", json)

      if (res.ok) {
        setData(json)
      } else {
        setError(json.error || "Failed to load")
      }
    } catch (e) {
      console.error("Fetch error:", e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlan()
  }, [])

  // Format time and date
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Calculate time until tomorrow
  const getTimeUntilTomorrow = () => {
    const now = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(now.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const diff = tomorrow.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return { hours, minutes, seconds }
  }

  const countdown = getTimeUntilTomorrow()

  return (
    <aside className="flex w-80 xl:w-96 flex-col border-l border-neutral-900/10 dark:border-neutral-900 bg-background">
      <div className="p-4 space-y-4">
        {/* Timer and Date Display */}
        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
              <Clock className="h-4 w-4 text-primary" />
              Current Time
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Current Time - Large Display */}
            <div className="text-center">
              <div className="text-3xl font-bold font-mono text-neutral-900 dark:text-neutral-100 tracking-wider">
                {formatTime(currentTime)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                {formatDate(currentTime)}
              </div>
            </div>

            {/* Countdown to Tomorrow */}
            <div className="border-t border-neutral-900/10 dark:border-neutral-900 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Until Tomorrow</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card/50 border border-neutral-900/10 dark:border-neutral-900 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-primary font-mono">
                    {countdown.hours.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    Hours
                  </div>
                </div>
                
                <div className="bg-card/50 border border-neutral-900/10 dark:border-neutral-900 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-primary font-mono">
                    {countdown.minutes.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    Minutes
                  </div>
                </div>
                
                <div className="bg-card/50 border border-neutral-900/10 dark:border-neutral-900 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-primary font-mono">
                    {countdown.seconds.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                    Seconds
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tomorrow's Workout */}
        <Card className="border border-neutral-900/10 dark:border-neutral-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Tomorrow's Workout
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
                <div className="text-muted-foreground text-sm">No data received</div>
              </div>
            )}
            
            {data?.workout && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">{data.workout.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {data.workout.estimatedDuration} min
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Exercises</h4>
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
  )
}
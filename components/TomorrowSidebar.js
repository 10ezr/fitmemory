"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Clock, Target } from "lucide-react"

export default function TomorrowSidebar() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

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

  return (
    <aside className="flex w-80 xl:w-96 flex-col border-l bg-background">
      <div className="p-4">
        <Card>
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
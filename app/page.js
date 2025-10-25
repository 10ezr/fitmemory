"use client"

import { useState, useEffect, useRef } from "react"
import {
  PaperAirplaneIcon,
  ChartBarIcon,
  BellIcon,
} from "@heroicons/react/24/solid"
import ChatMessage from "@/components/ChatMessage"
import QuickActions from "@/components/QuickActions"
import StatsSidebar from "@/components/StatsSidebar"
import TomorrowSidebar from "@/components/TomorrowSidebar"
import AdminPanel from "@/components/AdminPanel"
import WorkoutTimer from "@/components/WorkoutTimer"
import AnalyticsDashboard from "@/components/AnalyticsDashboard"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Settings2Icon } from "lucide-react"
import realTimeSync from "@/app/services/realTimeSync"

export default function Home() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [patternSummary, setPatternSummary] = useState("")
  const [showTimer, setShowTimer] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [todaysWorkout, setTodaysWorkout] = useState(null)
  const [timerData, setTimerData] = useState([])
  const [notificationService, setNotificationService] = useState(null)
  const [appStateData, setAppStateData] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    // Initialize real-time sync service at app start
    realTimeSync.initialize()
      .then(() => {
        // Seed initial caches
        realTimeSync.refreshData("stats", true)
        realTimeSync.refreshData("streak", true)
      })
      .catch(() => {})

    loadInitialData()
    setupEventListeners()

    return () => {
      cleanup()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Check streak status periodically
    if (stats?.dailyStreak && stats?.lastWorkoutDate && notificationService) {
      notificationService.checkStreakStatus(
        stats.lastWorkoutDate,
        stats.dailyStreak
      )
    }
  }, [stats, notificationService])

  const setupEventListeners = () => {
    window.addEventListener("startWorkout", handleStartWorkout)
    window.addEventListener("viewProgress", handleViewProgress)
    window.addEventListener("requestWorkoutPlan", handleRequestWorkoutPlan)

    // Bridge realTimeSync events back into local state
    realTimeSync.subscribe("stats", (data) => setStats(data), "Home")

    // Initialize notification service on client side
    import("./services/notificationService").then((module) => {
      setNotificationService(module.default)
    })
  }

  const cleanup = () => {
    window.removeEventListener("startWorkout", handleStartWorkout)
    window.removeEventListener("viewProgress", handleViewProgress)
    window.removeEventListener("requestWorkoutPlan", handleRequestWorkoutPlan)
  }

  const handleStartWorkout = () => {
    if (todaysWorkout) {
      setShowTimer(true)
    } else {
      sendMessage("Give me a quick workout plan for today")
    }
  }

  const handleViewProgress = () => {
    setShowAnalytics(true)
  }

  const handleRequestWorkoutPlan = () => {
    sendMessage("Create a workout plan for today")
  }

  const loadInitialData = async () => {
    try {
      // Load messages, stats, patterns, and today's workout in parallel
      const [messagesRes, statsRes, patternsRes, todaysWorkoutRes, timerRes] =
        await Promise.all([
          fetch("/api/messages?limit=20"),
          fetch("/api/stats"),
          fetch("/api/patternSummary"),
          fetch("/api/todaysWorkout"),
          fetch("/api/timer-data"),
        ])

      const messagesData = await messagesRes.json()
      const statsData = await statsRes.json()
      const patternsData = await patternsRes.json()

      if (messagesData.messages?.length > 0) {
        setMessages(messagesData.messages)
      } else {
        setMessages([])
      }

      setStats(statsData)
      setPatternSummary(patternsData.summary || "Building your routine...")

      // Load today's workout if available
      if (todaysWorkoutRes.ok) {
        const workoutData = await todaysWorkoutRes.json()
        setTodaysWorkout(workoutData.workout)
      }

      // Load timer data if available
      if (timerRes.ok) {
        const timerData = await timerRes.json()
        setTimerData(timerData.sessions || [])
      }
    } catch (error) {
      console.error("Failed to load initial data:", error)
      setMessages([
        {
          id: "error",
          role: "system",
          content:
            "Welcome to FitMemory! I'm having trouble loading your data, but I'm ready to help with your fitness journey.",
          createdAt: new Date().toISOString(),
        },
      ])
    }
  }

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || loading) return

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/converse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageText }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message")
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
        workoutLogged: data.workoutLogged,
        workout: data.workout,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update stats if workout was logged
      if (data.workoutLogged) {
        await refreshStats()
        // Also broadcast so listeners like StatsSidebar update immediately
        realTimeSync.broadcastDataChange("stats", await (await fetch("/api/stats")).json(), "chat-workout-logged")

        // Notify about workout completion
        if (data.workout && notificationService) {
          notificationService.workoutCompleted({
            totalDuration: data.workout.duration || 0,
            exercises: data.workout.exercises || [],
          })
        }
      }

      // Check for streak updates
      if (data.streakUpdate) {
        realTimeSync.broadcastDataChange("streak", data.streakUpdate, "chat-streak-update")
        await refreshStats()
      }

      // Check for streak status (missed workouts, resets, etc.)
      if (data.streakStatus && notificationService) {
        if (data.streakStatus.streakReset) {
          notificationService.showNotification("Streak Reset", {
            body: `Your streak was reset due to ${
              data.streakStatus.daysMissed
            } missed workouts. Time to start fresh! 💪`,
            icon: "/icon-192x192.png",
          })
        } else if (data.streakStatus.streakMaintained) {
          // Show warning if approaching reset
          if (data.streakStatus.missedWorkouts >= 2) {
            notificationService.showNotification("Streak Warning", {
              body: `You've missed ${
                data.streakStatus.missedWorkouts
              } workouts. One more and your streak resets! 🔥`,
              icon: "/icon-192x192.png",
            })
          }
        }
        await refreshStats()
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      const errorMessage = {
        id: (Date.now() + 2).toString(),
        role: "system",
        content:
          "Sorry, I'm having trouble responding right now. Please try again.",
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    try {
      const [statsRes, patternsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/patternSummary"),
      ])

      const statsData = await statsRes.json()
      const patternsData = await patternsRes.json()

      setStats(statsData)
      setPatternSummary(patternsData.summary || "Building your routine...")
    } catch (error) {
      console.error("Failed to refresh stats:", error)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const insertQuickMessage = (message) => {
    setInput(message)
  }

  const handleTimerComplete = async (workoutData) => {
    // Save workout session data
    try {
      const response = await fetch("/api/timer-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workoutData),
      })

      if (response.ok) {
        setTimerData((prev) => [...prev, workoutData])
        if (notificationService) {
          notificationService.workoutCompleted(workoutData)
        }
        await refreshStats()

        // Auto-log the workout
        const workoutSummary = `Completed ${
          workoutData.exercises.length
        } exercises in ${Math.round(workoutData.totalDuration / 60)} minutes`
        sendMessage(workoutSummary)
      }
    } catch (error) {
      console.error("Failed to save workout session:", error)
    }

    setShowTimer(false)
  }

  const handleTimerCancel = () => {
    setShowTimer(false)
  }

  return (
    // ... rest stays unchanged
    <div className="flex h-full gap-6 overflow-hidden">{/* content omitted for brevity */}</div>
  )
}

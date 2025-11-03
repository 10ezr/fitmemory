"use client"

import { useState, useEffect, useRef } from "react"
import { PaperAirplaneIcon } from "@heroicons/react/24/solid"
import ChatMessage from "@/components/ChatMessage"
import FitnessSidebar from "@/components/FitnessSidebar"
import TomorrowSidebar from "@/components/TomorrowSidebar"
import WorkoutTimer from "@/components/WorkoutTimer"
import AnalyticsDashboard from "@/components/AnalyticsDashboard"
import QuickShortcuts from "@/components/QuickShortcuts"
import BottomNav from "@/components/BottomNav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SkeletonChatList } from "@/components/SkeletonLoader"
import realTimeSync from "@/app/services/realTimeSync"

export default function Home() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [patternSummary, setPatternSummary] = useState("")
  const [showTimer, setShowTimer] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [todaysWorkout, setTodaysWorkout] = useState(null)
  const [timerData, setTimerData] = useState([])
  const [notificationService, setNotificationService] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

  useEffect(() => {
    realTimeSync.initialize().then(() => {
      realTimeSync.refreshData("stats", true)
      realTimeSync.refreshData("streak", true)
    }).catch(() => {})

    loadInitialData()
    realTimeSync.subscribe("stats", (data) => setStats(data), "Home")

    import("./services/notificationService").then((m) => setNotificationService(m.default))
  }, [])

  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    if (stats?.dailyStreak && stats?.lastWorkoutDate && notificationService) {
      notificationService.checkStreakStatus(stats.lastWorkoutDate, stats.dailyStreak)
    }
  }, [stats, notificationService])

  const loadInitialData = async () => {
    try {
      const [messagesRes, statsRes, patternsRes, todaysWorkoutRes, timerRes] = await Promise.all([
        fetch("/api/messages?limit=20"),
        fetch("/api/stats"),
        fetch("/api/patternSummary"),
        fetch("/api/todaysWorkout"),
        fetch("/api/timer-data"),
      ])
      const messagesData = await messagesRes.json()
      const statsData = await statsRes.json()
      const patternsData = await patternsRes.json()
      setMessages(messagesData.messages || [])
      setStats(statsData)
      setPatternSummary(patternsData.summary || "Building your routine...")
      if (todaysWorkoutRes.ok) setTodaysWorkout((await todaysWorkoutRes.json()).workout)
      if (timerRes.ok) setTimerData(((await timerRes.json()).sessions) || [])
    } catch (error) {
      console.error("Failed to load initial data:", error)
      setMessages([{ 
        id: "error", 
        role: "system", 
        content: "Welcome to FitMemory! I'm having trouble loading your data, but I'm ready to help with your fitness and sleep journey.", 
        createdAt: new Date().toISOString() 
      }])
    } finally {
      setInitialLoading(false)
    }
  }

  const refreshStatsAndBroadcast = async () => {
    try {
      const res = await fetch("/api/stats")
      const fresh = await res.json()
      setStats(fresh)
      realTimeSync.broadcastDataChange("stats", fresh, "page-refresh")
      setTimeout(async () => {
        try {
          const retryRes = await fetch("/api/stats")
          const retryFresh = await retryRes.json()
          setStats(retryFresh)
          realTimeSync.broadcastDataChange("stats", retryFresh, "page-refresh-retry")
        } catch {}
      }, 350)
    } catch (e) {
      console.error("refreshStatsAndBroadcast failed:", e)
    }
  }

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || loading) return
    
    const userMessage = { 
      id: Date.now().toString(), 
      role: "user", 
      content: messageText, 
      createdAt: new Date().toISOString() 
    }
    setMessages((p) => [...p, userMessage])
    setInput("")
    setLoading(true)
    
    try {
      // Include precise timestamp for sleep logging
      const currentTime = {
        iso: new Date().toISOString(),
        timezone: 'Asia/Kolkata',
        epochMs: Date.now(),
        display: new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'long',
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      }
      
      const response = await fetch("/api/converse", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          message: messageText,
          timestamp: currentTime
        }) 
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to send message")
      
      const assistantMessage = { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: data.reply, 
        createdAt: new Date().toISOString(), 
        workoutLogged: data.workoutLogged,
        sleepLogged: data.sleepLogged,
        memoryStored: data.memoryStored,
        workout: data.workout,
        sleepSession: data.sleepSession
      }
      setMessages((p) => [...p, assistantMessage])

      // Handle workout logging
      if (data.workoutLogged) {
        await refreshStatsAndBroadcast()
        if (data.workout && notificationService) {
          notificationService.workoutCompleted({ 
            totalDuration: data.workout.duration || 0, 
            exercises: data.workout.exercises || [] 
          })
        }
      }

      // Handle sleep logging with readiness refresh
      if (data.sleepLogged && data.sleepSession) {
        await refreshStatsAndBroadcast()
        // Refresh sleep-specific data
        realTimeSync.refreshSleepData()
        
        if (notificationService) {
          if (data.sleepSession.quality < 5) {
            notificationService.showNotification("Sleep Alert", {
              body: `Poor sleep quality detected (${data.sleepSession.quality}/10). Consider reviewing your sleep environment.`,
              icon: "/icon-192x192.png"
            })
          } else if (data.sleepSession.quality >= 8) {
            notificationService.showNotification("Great Sleep!", {
              body: `Excellent sleep quality (${data.sleepSession.quality}/10)! You're ready for a great day! ✨`,
              icon: "/icon-192x192.png"
            })
          }
        }
      }
      
      // Handle memory storage notification
      if (data.memoryStored) {
        console.log(`💭 Memory stored: ${data.memoryStored.type} - ${data.memoryStored.content.substring(0, 50)}...`)
      }
      
      if (data.streakUpdate) {
        realTimeSync.broadcastDataChange("streak", data.streakUpdate, "chat-streak-update")
        await refreshStatsAndBroadcast()
      }
      
      if (data.streakStatus && notificationService) {
        if (data.streakStatus.streakReset) {
          notificationService.showNotification("Streak Reset", { 
            body: `Your streak was reset due to ${data.streakStatus.daysMissed} missed workouts. Time to start fresh! 💪`, 
            icon: "/icon-192x192.png" 
          })
        } else if (data.streakStatus.streakMaintained && data.streakStatus.missedWorkouts >= 2) {
          notificationService.showNotification("Streak Warning", { 
            body: `You've missed ${data.streakStatus.missedWorkouts} workouts. One more and your streak resets! 🔥`, 
            icon: "/icon-192x192.png" 
          })
        }
        await refreshStatsAndBroadcast()
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      setMessages((p) => [...p, { 
        id: (Date.now() + 2).toString(), 
        role: "system", 
        content: "Sorry, I'm having trouble responding right now. Please try again.", 
        createdAt: new Date().toISOString() 
      }])
    } finally { 
      setLoading(false) 
    }
  }

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input) }
  const insertQuickMessage = (message) => setInput(message)

  return (
    <>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full overflow-hidden bg-background">
          <FitnessSidebar 
            stats={stats}
            onDataChange={refreshStatsAndBroadcast}
            onShowAnalytics={() => setShowAnalytics(true)}
          />
          
          <SidebarInset className="flex-1">
            <div className="flex h-full flex-col overflow-hidden">
              {/* Chat column */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="w-full max-w-4xl mx-auto space-y-4 px-4 py-6">
                  {/* Welcome state with enhanced shortcuts */}
                  {messages.length === 0 && !initialLoading && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        👋
                      </div>
                      <h2 className="text-xl font-semibold mb-2">Welcome to FitMemory!</h2>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        I'm your AI health coach. I can help you track workouts, monitor sleep, create plans, and stay motivated on your wellness journey.
                      </p>
                      
                      {/* Quick shortcuts for new users */}
                      <QuickShortcuts onSelectShortcut={insertQuickMessage} className="max-w-2xl mx-auto" />
                    </div>
                  )}

                  {/* Loading skeleton for initial load */}
                  {initialLoading && (
                    <SkeletonChatList count={4} />
                  )}

                  {/* Messages */}
                  {messages.map((message) => (
                    <ChatMessage key={message.id || message._id} message={message} />
                  ))}

                  {/* Loading indicator */}
                  {loading && (
                    <div className="flex justify-start">
                      <Card className="bg-card border">
                        <CardContent className="flex items-center space-x-2 p-4">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                          </div>
                          <span className="text-sm text-muted-foreground ml-2">FitMemory is thinking...</span>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input with shortcuts */}
              <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="w-full max-w-4xl mx-auto p-4">
                  {/* Quick shortcuts above input */}
                  {messages.length > 0 && (
                    <div className="mb-3">
                      <QuickShortcuts onSelectShortcut={insertQuickMessage} />
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit}>
                    <Card className="border-2 border-border/50 focus-within:border-primary/50 focus-within:bg-card transition-all duration-200">
                      <CardContent className="p-3">
                        <div className="flex items-end gap-3">
                          <Textarea 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            placeholder="Ask about fitness, sleep, recovery, or your health goals..." 
                            className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 placeholder:text-muted-foreground/70" 
                            rows={1} 
                            onKeyDown={(e) => { 
                              if (e.key === "Enter" && !e.shiftKey) { 
                                e.preventDefault(); 
                                handleSubmit(e) 
                              } 
                            }} 
                            onInput={(e) => { 
                              e.target.style.height = "auto"; 
                              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px" 
                            }} 
                          />
                          <Button 
                            type="submit" 
                            disabled={loading || !input.trim()} 
                            size="sm" 
                            className="shrink-0 rounded-xl px-3 h-9"
                          >
                            {loading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <PaperAirplaneIcon className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-muted-foreground">
                            Press Enter to send, Shift+Enter for new line
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {input.length}/1000
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </form>
                </div>
              </div>
            </div>
          </SidebarInset>

          {/* Right sidebar */}
          <TomorrowSidebar />

          {/* Modals */}
          <WorkoutTimer 
            workoutPlan={todaysWorkout} 
            onComplete={(w) => { 
              setTimerData((p) => [...p, w]); 
              refreshStatsAndBroadcast(); 
            }} 
            onCancel={() => {}} 
            isActive={showTimer} 
          />
          
          {showAnalytics && (
            <AnalyticsDashboard 
              workoutData={stats?.recentWorkouts || []} 
              streakData={stats?.streakHistory || []} 
              timerData={timerData} 
              onClose={() => setShowAnalytics(false)} 
            />
          )}
        </div>
      </SidebarProvider>
      
      <BottomNav />
    </>
  )
}
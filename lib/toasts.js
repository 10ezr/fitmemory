"use client"

import { toast } from "sonner"

export function showActionToast(event) {
  try {
    if (!event) return
    const type = event.type || event.action

    if (type === 'sleep_started') {
      toast.success('Started sleep session for tonight')
    } else if (type === 'sleep_updated') {
      const dur = event.durationMin ? `${Math.floor(event.durationMin/60)}h ${event.durationMin%60}m` : ''
      toast.success(`Closed sleep session${dur ? `: ${dur}` : ''}`)
    } else if (type === 'workout_logged') {
      toast.success(`Workout logged${event.exercises ? ` (${event.exercises} exercises)` : ''}`)
    } else if (type === 'streak_incremented') {
      toast('Streak updated', { description: `${event.currentStreak} days` })
    } else if (type === 'memory_add') {
      toast.success(`Saved to memory: ${event.memoryType || 'note'}`)
    }
  } catch {}
}

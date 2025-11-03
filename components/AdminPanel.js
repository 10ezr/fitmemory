"use client"

import { useState, useEffect } from 'react'
import { 
  User, Settings, Moon, Bell, Database, AlertTriangle, Save, 
  Trash2, Download, Upload, Shield, Zap, Clock, Heart 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { SkeletonCard, SkeletonStat } from '@/components/SkeletonLoader'

export default function AdminPanel({ onDataChange }) {
  const [settings, setSettings] = useState({
    notifications: true,
    sleepReminders: true,
    reminderTime: '22:00',
    workoutNotifications: true,
    streakWarnings: true,
    targetSleepHours: [8],
    sleepQualityGoal: [7],
    flexibleMode: true,
    weekendFlexibility: true,
    dataRetention: [365],
    autoBackup: false,
    memoryThreshold: [0.7]
  })

  const [profile, setProfile] = useState({
    name: '',
    weightKg: '',
    heightCm: '',
    fitnessLevel: 'intermediate',
    goals: '',
    timezone: 'Asia/Kolkata'
  })

  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalSleepSessions: 0,
    averageSleepQuality: 0,
    longestStreak: 0,
    memoryCount: 0,
    dataSize: '0 MB'
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [settingsRes, profileRes, statsRes] = await Promise.all([
        fetch('/api/admin/settings').catch(() => ({ ok: false })),
        fetch('/api/stats').catch(() => ({ ok: false })),
        fetch('/api/admin/stats').catch(() => ({ ok: false }))
      ])
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(prev => ({ ...prev, ...settingsData }))
      }
      
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(prev => ({ 
          ...prev, 
          name: profileData.name || '',
          weightKg: profileData.weightKg || '',
          heightCm: profileData.heightCm || '',
          goals: profileData.goals || ''
        }))
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSection = async (section, data) => {
    setSaving(prev => ({ ...prev, [section]: true }))
    try {
      const response = await fetch(`/api/admin/${section}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} saved successfully`)
        onDataChange?.()
      } else {
        toast.error(`Failed to save ${section}`)
      }
    } catch (error) {
      toast.error(`Error saving ${section}`)
    } finally {
      setSaving(prev => ({ ...prev, [section]: false }))
    }
  }

  const resetAllData = async () => {
    if (!confirm('⚠️ This will permanently delete ALL your data including workouts, sleep logs, memories, and settings. This cannot be undone. Are you absolutely sure?')) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/clear-all-data', { method: 'POST' })
      const result = await response.json()

      if (response.ok) {
        toast.success(`All data cleared: ${result.totalDeleted} records deleted`)
        localStorage.clear()
        setTimeout(() => window.location.reload(), 2000)
      } else {
        toast.error('Failed to reset data')
      }
    } catch (error) {
      toast.error('Error resetting data')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/admin/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `fitmemory-backup-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        toast.success('Data exported successfully')
      } else {
        toast.error('Failed to export data')
      }
    } catch (error) {
      toast.error('Error exporting data')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Profile Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>
            Your personal information and fitness preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fitness-level">Fitness Level</Label>
              <Select 
                value={profile.fitnessLevel} 
                onValueChange={(value) => setProfile(prev => ({ ...prev, fitnessLevel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={profile.weightKg}
                onChange={(e) => setProfile(prev => ({ ...prev, weightKg: e.target.value }))}
                placeholder="70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={profile.heightCm}
                onChange={(e) => setProfile(prev => ({ ...prev, heightCm: e.target.value }))}
                placeholder="175"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="goals">Fitness Goals</Label>
            <Textarea
              id="goals"
              value={profile.goals}
              onChange={(e) => setProfile(prev => ({ ...prev, goals: e.target.value }))}
              placeholder="Describe your fitness goals..."
              rows={2}
            />
          </div>
          
          <Button 
            onClick={() => saveSection('profile', profile)}
            disabled={saving.profile}
            className="w-full"
          >
            {saving.profile ? (
              <>Loading... <Zap className="ml-2 h-4 w-4 animate-pulse" /></>
            ) : (
              <>Save Profile <Save className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Sleep Goals Section */}
      <Card className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-blue-600" />
            Sleep Goals
          </CardTitle>
          <CardDescription>
            Configure your sleep targets and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Target Sleep Duration: {settings.targetSleepHours[0]} hours</Label>
            <Slider
              value={settings.targetSleepHours}
              onValueChange={(value) => setSettings(prev => ({ ...prev, targetSleepHours: value }))}
              max={12}
              min={6}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>6h</span><span>9h (recommended)</span><span>12h</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label>Sleep Quality Goal: {settings.sleepQualityGoal[0]}/10</Label>
            <Slider
              value={settings.sleepQualityGoal}
              onValueChange={(value) => setSettings(prev => ({ ...prev, sleepQualityGoal: value }))}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Bedtime Reminder</Label>
              <Input
                id="reminder-time"
                type="time"
                value={settings.reminderTime}
                onChange={(e) => setSettings(prev => ({ ...prev, reminderTime: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                checked={settings.sleepReminders}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sleepReminders: checked }))}
              />
              <Label>Enable Reminders</Label>
            </div>
          </div>
          
          <Button 
            onClick={() => saveSection('sleep-goals', { 
              targetSleepHours: settings.targetSleepHours[0], 
              sleepQualityGoal: settings.sleepQualityGoal[0],
              reminderTime: settings.reminderTime,
              sleepReminders: settings.sleepReminders
            })}
            disabled={saving['sleep-goals']}
            className="w-full"
          >
            {saving['sleep-goals'] ? 'Saving...' : 'Save Sleep Goals'}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card className="bg-gradient-to-br from-orange-50/50 to-yellow-50/50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Notifications
          </CardTitle>
          <CardDescription>
            Control when and how you receive alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {[
              { key: 'workoutNotifications', label: 'Workout Completed', desc: 'Celebrate your fitness achievements' },
              { key: 'streakWarnings', label: 'Streak Alerts', desc: 'Get warned before losing your streak' },
              { key: 'sleepReminders', label: 'Sleep Reminders', desc: 'Bedtime and wake-up notifications' },
              { key: 'notifications', label: 'General Notifications', desc: 'System alerts and updates' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between space-x-4">
                <div className="space-y-1 flex-1">
                  <Label className="text-sm font-medium">{item.label}</Label>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={settings[item.key]}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, [item.key]: checked }))}
                />
              </div>
            ))}
          </div>
          
          <Button 
            onClick={() => saveSection('notifications', {
              workoutNotifications: settings.workoutNotifications,
              streakWarnings: settings.streakWarnings,
              sleepReminders: settings.sleepReminders,
              notifications: settings.notifications
            })}
            disabled={saving.notifications}
            className="w-full"
          >
            {saving.notifications ? 'Saving...' : 'Save Notification Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Memory & AI Settings */}
      <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            AI & Memory
          </CardTitle>
          <CardDescription>
            Configure how FitMemory learns and remembers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Memory Storage Threshold: {(settings.memoryThreshold[0] * 100).toFixed(0)}%</Label>
            <Slider
              value={settings.memoryThreshold}
              onValueChange={(value) => setSettings(prev => ({ ...prev, memoryThreshold: value }))}
              max={1}
              min={0.3}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Store more</span><span>Balanced</span><span>Store only important</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-1 flex-1">
              <Label className="text-sm font-medium">Flexible Training Mode</Label>
              <p className="text-xs text-muted-foreground">Allow AI to adjust your workout schedule</p>
            </div>
            <Switch
              checked={settings.flexibleMode}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, flexibleMode: checked }))}
            />
          </div>
          
          <div className="bg-card/30 rounded-lg p-3">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Memory Stats
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Total Memories: <Badge variant="secondary">{stats.memoryCount}</Badge></div>
              <div>Data Size: <Badge variant="secondary">{stats.dataSize}</Badge></div>
            </div>
          </div>
          
          <Button 
            onClick={() => saveSection('ai-settings', {
              memoryThreshold: settings.memoryThreshold[0],
              flexibleMode: settings.flexibleMode
            })}
            disabled={saving['ai-settings']}
            className="w-full"
          >
            {saving['ai-settings'] ? 'Saving...' : 'Save AI Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-600" />
            Data Management
          </CardTitle>
          <CardDescription>
            Backup, export, and manage your FitMemory data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-card/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalWorkouts}</div>
              <div className="text-xs text-muted-foreground">Workouts</div>
            </div>
            <div className="text-center p-3 bg-card/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalSleepSessions}</div>
              <div className="text-xs text-muted-foreground">Sleep Sessions</div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Button 
              onClick={exportData}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Download className="h-4 w-4" />
              Export All Data
            </Button>
            
            <div className="space-y-1">
              <Label>Auto Backup</Label>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Automatically backup data weekly</p>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoBackup: checked }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-red-50/50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-900 dark:text-red-100">Reset All Data</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    This will permanently delete all workouts, sleep logs, memories, and settings. This action cannot be undone.
                  </p>
                  <Button 
                    onClick={resetAllData}
                    disabled={loading}
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                  >
                    {loading ? (
                      <>Processing... <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                    ) : (
                      <>Reset All Data <Trash2 className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Stats Footer */}
      <div className="text-center py-2">
        <div className="text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour12: true
          })}
        </div>
      </div>
    </div>
  )
}
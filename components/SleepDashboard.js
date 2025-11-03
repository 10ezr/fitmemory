"use client"

import { useState, useEffect } from 'react'
import { Moon, Sun, Clock, TrendingUp, Brain, Zap, Calendar, CloudMoon, Eye, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SkeletonReadiness, SkeletonWeekOverview, SkeletonStat } from '@/components/SkeletonLoader'

export default function SleepDashboard({ isCollapsed = false }) {
  const [sleepData, setSleepData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSleepData()
  }, [])

  const loadSleepData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sleep?days=7')
      if (!response.ok) {
        throw new Error('Failed to load sleep data')
      }
      const data = await response.json()
      setSleepData(data)
      setError(null)
    } catch (error) {
      console.error('Failed to load sleep data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Enhanced loading state with proper skeletons
  if (loading) {
    return (
      <div className="space-y-4">
        {isCollapsed ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
            <div className="w-8 h-4 bg-muted rounded animate-pulse" />
          </div>
        ) : (
          <>
            <SkeletonReadiness />
            <SkeletonWeekOverview />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonStat />
              <SkeletonStat />
            </div>
          </>
        )}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border bg-card/30 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <CloudMoon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-2">Unable to load sleep data</p>
          <p className="text-xs text-muted-foreground mb-3">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadSleepData}
            className="text-xs"
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // No data state
  if (!sleepData?.readiness && !sleepData?.recentSleep?.length) {
    return (
      <Card className="border bg-card/30 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Moon className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">No sleep data yet</p>
          <p className="text-xs text-muted-foreground">
            Try: "slept 7 hours, quality 8/10"
          </p>
        </CardContent>
      </Card>
    )
  }

  const { readiness, stats, recentSleep } = sleepData
  const lastNight = readiness?.lastNightSleep

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          readiness?.overall >= 80 ? 'bg-green-500/20 text-green-500' :
          readiness?.overall >= 60 ? 'bg-yellow-500/20 text-yellow-500' :
          'bg-red-500/20 text-red-500'
        }`}>
          <Moon className="h-6 w-6" />
        </div>
        <div className="text-xs font-bold text-center">
          <div className={`text-sm ${
            readiness?.overall >= 80 ? 'text-green-500' :
            readiness?.overall >= 60 ? 'text-yellow-500' :
            'text-red-500'
          }`}>
            {readiness?.overall || '--'}
          </div>
          <div className="text-muted-foreground text-xs">Sleep</div>
        </div>
      </div>
    )
  }

  const getReadinessColor = (score) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getReadinessLabel = (score) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  const getReadinessBgColor = (score) => {
    if (score >= 80) return 'from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50'
    if (score >= 60) return 'from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/50'
    return 'from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50'
  }

  return (
    <div className="space-y-4">
      {/* Sleep Readiness Score */}
      {readiness && (
        <Card className={`border bg-gradient-to-br ${getReadinessBgColor(readiness.overall)} transition-all duration-300`}>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Sleep Readiness
              </span>
            </div>
            <div className={`text-5xl font-extrabold leading-none ${getReadinessColor(readiness.overall)}`}>
              {readiness.overall}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {getReadinessLabel(readiness.overall)}
            </div>
            <Progress value={readiness.overall} className="mt-3 h-2" />
            
            {/* Quick recommendations */}
            {readiness.recommendations?.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground max-w-xs mx-auto">
                {readiness.recommendations[0]}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Last Night Summary */}
      {lastNight && (
        <Card className="border transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              Last Night
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {lastNight.totalSleepTime ? 
                    `${Math.floor(lastNight.totalSleepTime / 60)}h ${lastNight.totalSleepTime % 60}m` : 
                    '--'
                  }
                </div>
                <div className="text-xs text-muted-foreground">Duration</div>
              </div>
              <div className="text-center p-3 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {lastNight.sleepQuality || '--'}/10
                </div>
                <div className="text-xs text-muted-foreground">Quality</div>
              </div>
            </div>
            
            {lastNight.sleepEfficiency && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Sleep Efficiency</span>
                  <span className="text-sm font-medium">{lastNight.sleepEfficiency}%</span>
                </div>
                <Progress value={lastNight.sleepEfficiency} className="h-2" />
              </div>
            )}

            {lastNight.interruptions?.length > 0 && (
              <div className="border-t pt-3">
                <div className="text-sm text-muted-foreground mb-1">
                  {lastNight.interruptions.length} interruption{lastNight.interruptions.length > 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-1">
                  {lastNight.interruptions.slice(0, 3).map((interruption, i) => (
                    <Badge key={i} variant="secondary" className="text-xs capitalize">
                      {interruption.reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {lastNight.mood && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Morning Mood</span>
                  <Badge 
                    variant={lastNight.mood === 'excellent' || lastNight.mood === 'good' ? 'default' : 'secondary'}
                    className="text-xs capitalize"
                  >
                    {lastNight.mood}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sleep Patterns */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border bg-card/30 backdrop-blur-sm transition-all duration-200 hover:bg-card/50">
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-primary">
                {stats.averageSleepDuration ? 
                  `${Math.floor(stats.averageSleepDuration / 60)}h ${stats.averageSleepDuration % 60}m` : 
                  '--'
                }
              </div>
              <div className="text-xs text-muted-foreground mb-1">Avg Duration</div>
              {stats.durationTrend && (
                <Badge 
                  variant={stats.durationTrend === 'improving' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  <TrendingUp className={`h-3 w-3 mr-1 ${
                    stats.durationTrend === 'improving' ? '' : 'rotate-180'
                  }`} />
                  {stats.durationTrend}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="border bg-card/30 backdrop-blur-sm transition-all duration-200 hover:bg-card/50">
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-primary">
                {stats.averageSleepQuality ? `${stats.averageSleepQuality.toFixed(1)}` : '--'}/10
              </div>
              <div className="text-xs text-muted-foreground mb-1">Avg Quality</div>
              {stats.qualityTrend && (
                <Badge 
                  variant={stats.qualityTrend === 'improving' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  <TrendingUp className={`h-3 w-3 mr-1 ${
                    stats.qualityTrend === 'improving' ? '' : 'rotate-180'
                  }`} />
                  {stats.qualityTrend}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Week Overview */}
      {recentSleep?.length > 0 && (
        <Card className="border transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date()
                date.setDate(date.getDate() - 6 + i)
                const dateStr = date.toISOString().split('T')[0]
                const dayData = recentSleep.find(h => {
                  const sleepDate = new Date(h.date)
                  return sleepDate.toISOString().split('T')[0] === dateStr
                })
                
                return (
                  <div key={i} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">
                      {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </div>
                    <div 
                      className={`h-8 rounded-sm flex items-center justify-center text-xs font-medium transition-all duration-200 hover:scale-105 cursor-help ${
                        dayData 
                          ? dayData.sleepQuality >= 7 
                            ? 'bg-green-500 text-white shadow-sm' 
                            : dayData.sleepQuality >= 5 
                            ? 'bg-yellow-500 text-white shadow-sm'
                            : 'bg-red-500 text-white shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      title={dayData ? 
                        `${dayData.sleepQuality}/10 quality, ${Math.floor((dayData.totalSleepTime || 0) / 60)}h ${(dayData.totalSleepTime || 0) % 60}m` : 
                        'No sleep data'
                      }
                    >
                      {dayData ? dayData.sleepQuality : '-'}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="text-xs text-muted-foreground text-center mt-2">
              Sleep quality scores (1-10) • Hover for details
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sleep Debt Warning */}
      {stats?.sleepDebt > 120 && (
        <Card className="border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20 transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Sleep Debt Alert
              </span>
            </div>
            <p className="text-xs text-orange-800 dark:text-orange-200">
              You have {Math.round(stats.sleepDebt / 60)} hours of sleep debt. 
              Consider going to bed earlier tonight for better recovery.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Consistency Score */}
      {stats?.consistencyScore !== undefined && (
        <Card className="border bg-card/30 backdrop-blur-sm transition-all duration-200 hover:bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Sleep Consistency</span>
              </div>
              <Badge variant={stats.consistencyScore >= 70 ? 'default' : 'secondary'}>
                {stats.consistencyScore}/100
              </Badge>
            </div>
            <Progress value={stats.consistencyScore} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {stats.consistencyScore >= 70 ? 
                'Great job maintaining consistent sleep times! 🎆' :
                stats.consistencyScore >= 40 ?
                'Try to keep more consistent bedtimes for better rest.' :
                'Focus on establishing a regular sleep schedule.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
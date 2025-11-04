"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, AreaChart, Area, ComposedChart
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { 
  Activity, Clock, TrendingUp, Target, Moon, Sun, 
  Calendar, BarChart3, Zap, Award, Timer
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const MetricCard = ({ title, value, subtitle, icon: Icon, trend, color = "text-primary", gradient = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5 }}
    transition={{ duration: 0.2 }}
  >
    <Card className={`hover:shadow-lg transition-all duration-300 ${gradient ? 'bg-gradient-to-br from-primary/5 via-background to-primary/10' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
            <p className={`text-3xl font-bold tracking-tight ${color}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {trend !== undefined && (
            <div className="text-right">
              <Badge variant={trend >= 0 ? "default" : "destructive"} className="text-xs">
                {trend >= 0 ? "↗" : "↘"} {Math.abs(trend)}%
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const ChartContainer = ({ title, children, description }) => (
  <Card className="overflow-hidden">
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        {title}
      </CardTitle>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [workoutData, setWorkoutData] = useState([]);
  const [sleepData, setSleepData] = useState([]);
  const [timerData, setTimerData] = useState([]);
  const [timeframe, setTimeframe] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const [statsRes, workoutsRes, sleepRes, timerRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/workouts?limit=100"),
        fetch("/api/sleep?limit=100"),
        fetch("/api/timer-data")
      ]);

      const [statsData, workoutsData, sleepDataResponse, timerDataResponse] = await Promise.all([
        statsRes.json(),
        workoutsRes.json(),
        sleepRes.json(),
        timerRes.json()
      ]);

      setStats(statsData || {});
      setWorkoutData(Array.isArray(workoutsData) ? workoutsData : workoutsData?.workouts || []);
      setSleepData(Array.isArray(sleepDataResponse) ? sleepDataResponse : sleepDataResponse?.sessions || []);
      setTimerData(Array.isArray(timerDataResponse) ? timerDataResponse : timerDataResponse?.sessions || []);
    } catch (error) {
      console.error("Failed to load analytics data:", error);
      // Set default empty arrays to prevent errors
      setStats({});
      setWorkoutData([]);
      setSleepData([]);
      setTimerData([]);
    } finally {
      setLoading(false);
    }
  };

  // Data processing functions
  const processWorkoutFrequency = () => {
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    return dateRange.map(date => {
      const workoutsOnDate = Array.isArray(workoutData) ? workoutData.filter(workout => 
        format(new Date(workout.date || workout.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ) : [];
      
      return {
        date: format(date, 'MMM dd'),
        workouts: workoutsOnDate.length,
        duration: workoutsOnDate.reduce((sum, w) => sum + (w.duration || 0), 0) / 60, // minutes
        exercises: workoutsOnDate.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)
      };
    });
  };

  const processSleepData = () => {
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    return dateRange.map(date => {
      const sleepOnDate = Array.isArray(sleepData) ? sleepData.filter(session => 
        format(new Date(session.date || session.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ) : [];
      
      const avgQuality = sleepOnDate.length ? 
        sleepOnDate.reduce((sum, s) => sum + (s.quality || 0), 0) / sleepOnDate.length : 0;
      const totalDuration = sleepOnDate.reduce((sum, s) => sum + (s.duration || 0), 0);
      
      return {
        date: format(date, 'MMM dd'),
        quality: Math.round(avgQuality * 10) / 10,
        duration: Math.round(totalDuration * 10) / 10,
        sessions: sleepOnDate.length
      };
    });
  };

  const getWorkoutMetrics = () => {
    const safeWorkoutData = Array.isArray(workoutData) ? workoutData : [];
    const totalWorkouts = safeWorkoutData.length;
    const totalHours = safeWorkoutData.reduce((sum, w) => sum + (w.duration || 0), 0) / 3600;
    const avgDuration = totalWorkouts ? (totalHours / totalWorkouts * 60) : 0;
    const totalExercises = safeWorkoutData.reduce((sum, w) => sum + (w.exercises?.length || 0), 0);
    const currentStreak = stats?.currentStreak || 0;
    const longestStreak = stats?.longestStreak || 0;
    
    return {
      totalWorkouts,
      totalHours: Math.round(totalHours * 10) / 10,
      avgDuration: Math.round(avgDuration),
      totalExercises,
      currentStreak,
      longestStreak
    };
  };

  const getSleepMetrics = () => {
    const safeSleepData = Array.isArray(sleepData) ? sleepData : [];
    const totalSessions = safeSleepData.length;
    const avgQuality = safeSleepData.length ? 
      safeSleepData.reduce((sum, s) => sum + (s.quality || 0), 0) / safeSleepData.length : 0;
    const avgDuration = safeSleepData.length ? 
      safeSleepData.reduce((sum, s) => sum + (s.duration || 0), 0) / safeSleepData.length : 0;
    const lastWeekAvg = safeSleepData.slice(-7).length ? 
      safeSleepData.slice(-7).reduce((sum, s) => sum + (s.quality || 0), 0) / safeSleepData.slice(-7).length : 0;
    
    const qualityTrend = lastWeekAvg && avgQuality ? 
      Math.round(((lastWeekAvg - avgQuality) / avgQuality) * 100) : 0;
    
    return {
      totalSessions,
      avgQuality: Math.round(avgQuality * 10) / 10,
      avgDuration: Math.round(avgDuration * 10) / 10,
      qualityTrend
    };
  };

  const processExerciseTypes = () => {
    const exerciseCount = {};
    const safeWorkoutData = Array.isArray(workoutData) ? workoutData : [];
    
    safeWorkoutData.forEach(workout => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach(exercise => {
          const type = exercise.type || exercise.name?.split(' ')[0] || 'Other';
          exerciseCount[type] = (exerciseCount[type] || 0) + 1;
        });
      }
    });
    
    return Object.entries(exerciseCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([name, value], index) => ({
        name,
        value,
        fill: COLORS[index % COLORS.length]
      }));
  };

  const workoutFrequencyData = processWorkoutFrequency();
  const sleepTrendData = processSleepData();
  const workoutMetrics = getWorkoutMetrics();
  const sleepMetrics = getSleepMetrics();
  const exerciseTypeData = processExerciseTypes();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your fitness and sleep journey
        </p>
        
        {/* Timeframe selector */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-sm text-muted-foreground">Timeframe:</span>
          <div className="flex rounded-lg border p-1 bg-muted/30">
            {["7d", "30d", "90d"].map(period => (
              <Button
                key={period}
                variant={timeframe === period ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeframe(period)}
                className="text-xs"
              >
                {period === "7d" ? "7 Days" : period === "30d" ? "30 Days" : "90 Days"}
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="workouts" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Workouts
          </TabsTrigger>
          <TabsTrigger value="sleep" className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Sleep
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Workouts"
              value={workoutMetrics.totalWorkouts}
              subtitle={`${Math.round(workoutMetrics.totalWorkouts / 30)} per month avg`}
              icon={Activity}
              gradient
            />
            <MetricCard
              title="Training Hours"
              value={`${workoutMetrics.totalHours}h`}
              subtitle={`${workoutMetrics.avgDuration} min average`}
              icon={Clock}
            />
            <MetricCard
              title="Current Streak"
              value={`${workoutMetrics.currentStreak}`}
              subtitle={`Best: ${workoutMetrics.longestStreak} days`}
              icon={Award}
              color="text-orange-500"
            />
            <MetricCard
              title="Sleep Quality"
              value={`${sleepMetrics.avgQuality}/10`}
              subtitle={`${sleepMetrics.avgDuration}h average`}
              icon={Moon}
              trend={sleepMetrics.qualityTrend}
              color="text-blue-500"
            />
          </div>

          {/* Combined Overview Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer 
              title="Activity Overview" 
              description="Workout frequency and duration trends"
            >
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={workoutFrequencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="workouts" fill="#8884d8" radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="duration" stroke="#82ca9d" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer 
              title="Sleep Trends" 
              description="Sleep quality and duration patterns"
            >
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={sleepTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area type="monotone" dataKey="quality" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="duration" stroke="#82ca9d" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </TabsContent>

        {/* Workouts Tab */}
        <TabsContent value="workouts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Exercises"
              value={workoutMetrics.totalExercises}
              subtitle={`${Math.round(workoutMetrics.totalExercises / (workoutMetrics.totalWorkouts || 1))} per workout`}
              icon={Target}
            />
            <MetricCard
              title="Avg Duration"
              value={`${workoutMetrics.avgDuration}min`}
              subtitle="Per workout session"
              icon={Timer}
            />
            <MetricCard
              title="Consistency"
              value={`${Math.round((workoutMetrics.currentStreak / 30) * 100)}%`}
              subtitle="This month"
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Workout Frequency" description="Daily workout distribution">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={workoutFrequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="workouts" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Exercise Types" description="Most common exercises">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={exerciseTypeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {exerciseTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </TabsContent>

        {/* Sleep Tab */}
        <TabsContent value="sleep" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Sessions"
              value={sleepMetrics.totalSessions}
              subtitle="Recorded sleep sessions"
              icon={Moon}
            />
            <MetricCard
              title="Avg Quality"
              value={`${sleepMetrics.avgQuality}/10`}
              subtitle="Sleep quality rating"
              icon={Award}
              trend={sleepMetrics.qualityTrend}
            />
            <MetricCard
              title="Avg Duration"
              value={`${sleepMetrics.avgDuration}h`}
              subtitle="Per night"
              icon={Clock}
            />
          </div>

          <ChartContainer title="Sleep Quality Trends" description="Sleep quality and duration over time">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={sleepTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} />
                <Tooltip />
                <Bar yAxisId="left" dataKey="quality" fill="#8884d8" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="duration" stroke="#82ca9d" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold text-primary mb-2">🔥 Streak Status</h4>
                  <p className="text-sm text-muted-foreground">
                    {workoutMetrics.currentStreak >= 7 ? 
                      "Great consistency! You're building strong habits." :
                      "Focus on consistency to build momentum."
                    }
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <h4 className="font-semibold text-blue-700 mb-2">😴 Sleep Quality</h4>
                  <p className="text-sm text-muted-foreground">
                    {sleepMetrics.avgQuality >= 7 ? 
                      "Excellent sleep quality! This supports your fitness goals." :
                      "Consider improving sleep hygiene for better recovery."
                    }
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <h4 className="font-semibold text-green-700 mb-2">💪 Workout Volume</h4>
                  <p className="text-sm text-muted-foreground">
                    {workoutMetrics.avgDuration >= 45 ? 
                      "Good workout duration. You're putting in solid effort!" :
                      "Consider slightly longer sessions for better results."
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-sm">Maintain Consistency</h5>
                      <p className="text-xs text-muted-foreground">Aim for at least 3-4 workouts per week</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-sm">Optimize Sleep</h5>
                      <p className="text-xs text-muted-foreground">7-9 hours of quality sleep supports recovery</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-sm">Progressive Overload</h5>
                      <p className="text-xs text-muted-foreground">Gradually increase intensity or duration</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-sm">Track Recovery</h5>
                      <p className="text-xs text-muted-foreground">Monitor sleep quality for optimal performance</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, AreaChart, Area 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const MetricCard = ({ title, value, subtitle, icon, trend, color = "text-primary" }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
  >
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="text-2xl">{icon}</div>
        </div>
        {trend && (
          <div className="flex items-center mt-2">
            <Badge variant={trend > 0 ? "default" : "destructive"} className="text-xs">
              {trend > 0 ? "↗" : "↘"} {Math.abs(trend)}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

export default function AnalyticsDashboard({ 
  workoutData = [], 
  streakData = [], 
  timerData = [],
  onClose 
}) {
  const [timeframe, setTimeframe] = useState("30d");
  const [activeMetric, setActiveMetric] = useState("frequency");

  // Process data for different visualizations
  const processWorkoutFrequency = () => {
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    return dateRange.map(date => {
      const workoutsOnDate = workoutData.filter(workout => 
        format(new Date(workout.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      return {
        date: format(date, 'MMM dd'),
        workouts: workoutsOnDate.length,
        totalDuration: workoutsOnDate.reduce((sum, w) => sum + (w.duration || 0), 0),
        exercises: workoutsOnDate.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)
      };
    });
  };

  const processExerciseTypes = () => {
    const exerciseCount = {};
    
    workoutData.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        const type = exercise.type || 'Other';
        exerciseCount[type] = (exerciseCount[type] || 0) + 1;
      });
    });
    
    return Object.entries(exerciseCount).map(([name, value], index) => ({
      name,
      value,
      fill: COLORS[index % COLORS.length]
    }));
  };

  const processWorkoutDuration = () => {
    return timerData.slice(-20).map((session, index) => ({
      session: `Session ${index + 1}`,
      duration: Math.round(session.totalDuration / 60), // Convert to minutes
      exercises: session.exerciseTimes?.length || 0,
      avgPerExercise: session.exerciseTimes?.length ? 
        Math.round(session.totalDuration / session.exerciseTimes.length / 60) : 0
    }));
  };

  const processWeeklyProgress = () => {
    const weeks = [];
    const endDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(endDate, i * 7));
      const weekEnd = endOfWeek(weekStart);
      
      const weekWorkouts = workoutData.filter(workout => {
        const workoutDate = new Date(workout.date);
        return workoutDate >= weekStart && workoutDate <= weekEnd;
      });
      
      const totalDuration = weekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
      
      weeks.push({
        week: format(weekStart, 'MMM dd'),
        workouts: weekWorkouts.length,
        hours: Math.round(totalDuration / 3600 * 10) / 10,
        exercises: weekWorkouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)
      });
    }
    
    return weeks;
  };

  const getStreakMetrics = () => {
    const current = streakData[streakData.length - 1]?.currentStreak || 0;
    const longest = Math.max(...streakData.map(s => s.longestStreak || 0), 0);
    const average = streakData.length ? 
      streakData.reduce((sum, s) => sum + (s.currentStreak || 0), 0) / streakData.length : 0;
    
    return { current, longest, average: Math.round(average * 10) / 10 };
  };

  const workoutFrequencyData = processWorkoutFrequency();
  const exerciseTypeData = processExerciseTypes();
  const durationData = processWorkoutDuration();
  const weeklyData = processWeeklyProgress();
  const streakMetrics = getStreakMetrics();

  const totalWorkouts = workoutData.length;
  const totalHours = Math.round(workoutData.reduce((sum, w) => sum + (w.duration || 0), 0) / 3600 * 10) / 10;
  const avgDuration = totalWorkouts ? Math.round(totalHours / totalWorkouts * 60) : 0;
  const totalExercises = workoutData.reduce((sum, w) => sum + (w.exercises?.length || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
    >
      <div className="container mx-auto p-4 h-full overflow-y-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Comprehensive insights into your fitness journey</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-1">
                {["7d", "30d", "90d"].map(period => (
                  <Button
                    key={period}
                    variant={timeframe === period ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimeframe(period)}
                  >
                    {period}
                  </Button>
                ))}
              </div>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Workouts"
              value={totalWorkouts}
              icon="🏋️"
              subtitle={`${Math.round(totalWorkouts / (workoutData.length ? 
                (new Date() - new Date(workoutData[0].date)) / (1000 * 60 * 60 * 24) : 1))} per day avg`}
            />
            <MetricCard
              title="Total Hours"
              value={totalHours}
              icon="⏰"
              subtitle={`${avgDuration} min average`}
            />
            <MetricCard
              title="Current Streak"
              value={streakMetrics.current}
              icon="🔥"
              subtitle={`Best: ${streakMetrics.longest} days`}
              color="text-orange-500"
            />
            <MetricCard
              title="Total Exercises"
              value={totalExercises}
              icon="💪"
              subtitle={`${Math.round(totalExercises / (totalWorkouts || 1))} per workout`}
            />
          </div>

          {/* Charts */}
          <Tabs defaultValue="frequency" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="frequency">Frequency</TabsTrigger>
              <TabsTrigger value="duration">Duration</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            </TabsList>

            {/* Workout Frequency */}
            <TabsContent value="frequency" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Workout Frequency ({timeframe})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={workoutFrequencyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="workouts" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Duration Analysis */}
            <TabsContent value="duration" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Session Duration Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={durationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="session" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="duration" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Duration Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={durationData.slice(-10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="session" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="duration" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Weekly Progress */}
            <TabsContent value="progress" className="space-y-4">
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle>12-Week Progress Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="workouts" fill="#8884d8" />
                      <Line yAxisId="right" type="monotone" dataKey="hours" stroke="#82ca9d" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Exercise Breakdown */}
            <TabsContent value="breakdown" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Exercise Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={exerciseTypeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {exerciseTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Streak Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span>Current Streak</span>
                        <Badge variant="default" className="text-lg px-3 py-1">
                          {streakMetrics.current} days
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span>Longest Streak</span>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {streakMetrics.longest} days
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span>Average Streak</span>
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          {streakMetrics.average} days
                        </Badge>
                      </div>
                      
                      <div className="mt-6">
                        <ResponsiveContainer width="100%" height={120}>
                          <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="40%"
                            outerRadius="80%"
                            data={[{
                              name: 'Streak Progress',
                              value: (streakMetrics.current / (streakMetrics.longest || 1)) * 100,
                              fill: '#8884d8'
                            }]}
                            startAngle={90}
                            endAngle={-270}
                          >
                            <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}

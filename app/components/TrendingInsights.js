"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  ClockIcon,
  CalendarIcon,
  FireIcon 
} from "@heroicons/react/24/outline";

const TrendCard = ({ title, value, change, changeType, icon, color = "primary" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    className="group"
  >
    <Card className="transition-all duration-200 group-hover:shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold text-${color}`}>{value}</p>
          </div>
          <div className={`p-2 rounded-full bg-${color}/10`}>
            {icon}
          </div>
        </div>
        {change !== undefined && (
          <div className="flex items-center mt-3">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              changeType === 'positive' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                : changeType === 'negative'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {changeType === 'positive' && <TrendingUpIcon className="w-3 h-3" />}
              {changeType === 'negative' && <TrendingDownIcon className="w-3 h-3" />}
              {Math.abs(change)}% vs last period
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const InsightCard = ({ insight }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    whileHover={{ x: 4 }}
    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all cursor-default"
  >
    <div className="flex items-start gap-3">
      <div className="text-2xl">{insight.emoji}</div>
      <div className="flex-1">
        <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
        {insight.action && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">{insight.action}</Badge>
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

export default function TrendingInsights({ workoutData = [], timeFrame = 'month' }) {
  const [insights, setInsights] = useState([]);
  const [trends, setTrends] = useState({});
  
  useEffect(() => {
    analyzeWorkouts();
  }, [workoutData, timeFrame]); // eslint-disable-line react-hooks/exhaustive-deps

  const analyzeWorkouts = () => {
    if (!workoutData.length) return;

    const now = new Date();
    const currentPeriod = getTimeframeData(workoutData, timeFrame);
    const previousPeriod = getTimeframeData(workoutData, timeFrame, 1);
    
    // Calculate trends
    const currentMetrics = calculateMetrics(currentPeriod);
    const previousMetrics = calculateMetrics(previousPeriod);
    
    const trendData = {
      frequency: calculateChange(currentMetrics.frequency, previousMetrics.frequency),
      duration: calculateChange(currentMetrics.avgDuration, previousMetrics.avgDuration),
      consistency: calculateChange(currentMetrics.consistency, previousMetrics.consistency),
      variety: calculateChange(currentMetrics.exerciseVariety, previousMetrics.exerciseVariety),
      volume: calculateChange(currentMetrics.totalVolume, previousMetrics.totalVolume)
    };
    
    setTrends(trendData);
    
    // Generate insights
    const generatedInsights = generateInsights(currentMetrics, trendData, currentPeriod);
    setInsights(generatedInsights);
  };

  const getTimeframeData = (data, frame, offset = 0) => {
    const now = new Date();
    const days = frame === 'week' ? 7 : frame === 'month' ? 30 : 90;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (days * (offset + 1)));
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - (days * offset));

    return data.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= startDate && workoutDate <= endDate;
    });
  };

  const calculateMetrics = (periodData) => {
    if (!periodData.length) {
      return {
        frequency: 0,
        avgDuration: 0,
        consistency: 0,
        exerciseVariety: 0,
        totalVolume: 0,
        strongestDay: null,
        preferredTime: null
      };
    }

    const totalDuration = periodData.reduce((sum, w) => sum + (w.duration || 0), 0);
    const exerciseTypes = new Set();
    const dayFrequency = {};
    const timeSlots = {};

    periodData.forEach(workout => {
      // Exercise variety
      workout.exercises?.forEach(ex => {
        exerciseTypes.add(ex.type || ex.name);
      });

      // Day patterns
      const day = new Date(workout.date).toLocaleDateString('en', { weekday: 'long' });
      dayFrequency[day] = (dayFrequency[day] || 0) + 1;

      // Time patterns
      const hour = new Date(workout.date).getHours();
      const timeSlot = hour < 6 ? 'early' : 
                     hour < 12 ? 'morning' : 
                     hour < 18 ? 'afternoon' : 'evening';
      timeSlots[timeSlot] = (timeSlots[timeSlot] || 0) + 1;
    });

    const strongestDay = Object.entries(dayFrequency).reduce((a, b) => 
      dayFrequency[a] > dayFrequency[b] ? a : b, Object.keys(dayFrequency)[0]);
    
    const preferredTime = Object.entries(timeSlots).reduce((a, b) => 
      timeSlots[a] > timeSlots[b] ? a : b, Object.keys(timeSlots)[0]);

    return {
      frequency: periodData.length,
      avgDuration: Math.round(totalDuration / periodData.length / 60), // minutes
      consistency: calculateConsistency(periodData),
      exerciseVariety: exerciseTypes.size,
      totalVolume: periodData.reduce((sum, w) => 
        sum + (w.exercises?.reduce((es, e) => es + ((e.sets || 1) * (e.reps || 1)), 0) || 0), 0),
      strongestDay,
      preferredTime
    };
  };

  const calculateConsistency = (workouts) => {
    if (workouts.length < 2) return 100;
    
    const dates = workouts.map(w => new Date(w.date)).sort();
    const gaps = [];
    
    for (let i = 1; i < dates.length; i++) {
      const gap = Math.abs(dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }
    
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const consistency = Math.max(0, 100 - (avgGap - 1) * 10); // Penalty for gaps > 1 day
    
    return Math.round(consistency);
  };

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return { value: 0, type: 'neutral' };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.round(Math.abs(change)),
      type: change > 5 ? 'positive' : change < -5 ? 'negative' : 'neutral'
    };
  };

  const generateInsights = (metrics, trends, workouts) => {
    const insights = [];

    // Frequency insights
    if (trends.frequency.type === 'positive') {
      insights.push({
        emoji: '🚀',
        title: 'Workout Frequency Up!',
        description: `You're working out ${trends.frequency.value}% more than last period. Great momentum!`,
        action: 'Keep it up!'
      });
    } else if (trends.frequency.type === 'negative' && trends.frequency.value > 20) {
      insights.push({
        emoji: '⚠️',
        title: 'Frequency Dropping',
        description: `Your workout frequency is down ${trends.frequency.value}%. Let's get back on track.`,
        action: 'Schedule more sessions'
      });
    }

    // Duration insights
    if (metrics.avgDuration > 45) {
      insights.push({
        emoji: '⏰',
        title: 'Long Workout Sessions',
        description: `Your average workout is ${metrics.avgDuration} minutes. Consider shorter, high-intensity sessions if time is tight.`,
        action: 'Try HIIT workouts'
      });
    } else if (metrics.avgDuration < 20) {
      insights.push({
        emoji: '⚡',
        title: 'Quick & Efficient',
        description: `Your ${metrics.avgDuration}-minute sessions are perfect for maintaining consistency!`,
        action: 'Great approach!'
      });
    }

    // Consistency insights
    if (metrics.consistency > 80) {
      insights.push({
        emoji: '🎯',
        title: 'Amazing Consistency',
        description: `${metrics.consistency}% consistency score! You're building strong habits.`,
        action: 'Habit master!'
      });
    } else if (metrics.consistency < 60) {
      insights.push({
        emoji: '📅',
        title: 'Consistency Opportunity',
        description: `Try scheduling workouts at the same time daily to improve your ${metrics.consistency}% consistency.`,
        action: 'Set reminders'
      });
    }

    // Variety insights
    if (metrics.exerciseVariety < 5) {
      insights.push({
        emoji: '🔄',
        title: 'Add Some Variety',
        description: `You're using ${metrics.exerciseVariety} different exercise types. Try mixing in cardio, strength, or flexibility work.`,
        action: 'Explore new exercises'
      });
    } else if (metrics.exerciseVariety > 10) {
      insights.push({
        emoji: '🌟',
        title: 'Great Exercise Variety',
        description: `${metrics.exerciseVariety} different exercise types keep your workouts interesting and well-rounded!`,
        action: 'Well balanced!'
      });
    }

    // Pattern insights
    if (metrics.strongestDay) {
      insights.push({
        emoji: '📊',
        title: `${metrics.strongestDay} Warrior`,
        description: `${metrics.strongestDay} is your strongest workout day. Consider planning your toughest sessions then.`,
        action: 'Leverage your pattern'
      });
    }

    if (metrics.preferredTime) {
      const timeEmojis = { early: '🌅', morning: '🌤️', afternoon: '☀️', evening: '🌙' };
      insights.push({
        emoji: timeEmojis[metrics.preferredTime] || '⏰',
        title: `${metrics.preferredTime.charAt(0).toUpperCase() + metrics.preferredTime.slice(1)} Person`,
        description: `You prefer ${metrics.preferredTime} workouts. Consistent timing helps with habit formation.`,
        action: 'Stick to your rhythm'
      });
    }

    return insights.slice(0, 6); // Limit to 6 insights
  };

  const currentMetrics = calculateMetrics(getTimeframeData(workoutData, timeFrame));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fitness Insights</h2>
          <p className="text-muted-foreground">Patterns and trends in your workout journey</p>
        </div>
        <Badge variant="outline" className="text-sm capitalize">{timeFrame} view</Badge>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          {/* Trend Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <TrendCard
              title="Workout Frequency"
              value={currentMetrics.frequency}
              change={trends.frequency?.value}
              changeType={trends.frequency?.type}
              icon={<CalendarIcon className="w-5 h-5" />}
              color="blue-500"
            />
            
            <TrendCard
              title="Avg Duration"
              value={`${currentMetrics.avgDuration}min`}
              change={trends.duration?.value}
              changeType={trends.duration?.type}
              icon={<ClockIcon className="w-5 h-5" />}
              color="green-500"
            />
            
            <TrendCard
              title="Consistency"
              value={`${currentMetrics.consistency}%`}
              change={trends.consistency?.value}
              changeType={trends.consistency?.type}
              icon={<FireIcon className="w-5 h-5" />}
              color="orange-500"
            />
          </div>

          {/* Detailed Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Consistency Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Current Score</span>
                    <span className="font-medium">{currentMetrics.consistency}%</span>
                  </div>
                  <Progress value={currentMetrics.consistency} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Based on workout frequency and regularity
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Exercise Variety</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Exercise Types</span>
                    <span className="font-medium">{currentMetrics.exerciseVariety}</span>
                  </div>
                  <Progress 
                    value={Math.min(currentMetrics.exerciseVariety * 8, 100)} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Variety helps prevent plateaus and keeps workouts interesting
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
          
          {insights.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                📊
              </div>
              <h3 className="font-medium mb-2">Building Insights</h3>
              <p className="text-muted-foreground text-sm">
                Keep logging workouts to unlock personalized insights and recommendations!
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

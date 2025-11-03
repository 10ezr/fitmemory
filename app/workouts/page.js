"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Activity, Clock, Target, TrendingUp, 
  Play, Pause, RotateCcw, Plus,
  Dumbbell, Timer, Calendar
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import WorkoutTimer from "@/components/WorkoutTimer";

const WorkoutCard = ({ workout, onStart }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
  >
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">{workout.name || "Untitled Workout"}</h3>
            <p className="text-sm text-muted-foreground">{workout.description}</p>
          </div>
          <Button onClick={() => onStart(workout)} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Start
          </Button>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {Math.round((workout.estimatedDuration || 0) / 60)}min
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            {workout.exercises?.length || 0} exercises
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            {workout.difficulty || "Moderate"}
          </div>
        </div>
        
        {workout.exercises && workout.exercises.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Exercises:</p>
            <div className="flex flex-wrap gap-1">
              {workout.exercises.slice(0, 3).map((exercise, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {exercise.name}
                </Badge>
              ))}
              {workout.exercises.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{workout.exercises.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const RecentWorkoutCard = ({ workout }) => (
  <Card className="hover:shadow-sm transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{workout.name || "Workout"}</h4>
        <Badge variant="outline" className="text-xs">
          {new Date(workout.date || workout.createdAt).toLocaleDateString()}
        </Badge>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {Math.round((workout.duration || 0) / 60)}min
        </div>
        <div className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          {workout.exercises?.length || 0} exercises
        </div>
      </div>
      
      {workout.exercises && workout.exercises.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {workout.exercises.slice(0, 2).map((exercise, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {exercise.name}
              </Badge>
            ))}
            {workout.exercises.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{workout.exercises.length - 2}
              </Badge>
            )}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

export default function WorkoutsPage() {
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadWorkoutData();
  }, []);

  const loadWorkoutData = async () => {
    try {
      const [workoutsRes, recentRes, statsRes] = await Promise.all([
        fetch("/api/workout-plans"),
        fetch("/api/workouts?limit=10"),
        fetch("/api/stats")
      ]);

      const [workoutsData, recentData, statsData] = await Promise.all([
        workoutsRes.json(),
        recentRes.json(),
        statsRes.json()
      ]);

      setWorkouts(workoutsData.plans || workoutsData || []);
      setRecentWorkouts(recentData.workouts || recentData || []);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load workout data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = (workout) => {
    setActiveWorkout(workout);
    setShowTimer(true);
  };

  const filteredWorkouts = workouts.filter(workout =>
    workout.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workout.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div className="h-8 bg-muted rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Workouts
              </h1>
              <p className="text-muted-foreground">
                Start a workout or browse your training history
              </p>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Workout
            </Button>
          </div>
          
          {/* Search */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search workouts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </motion.div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl font-bold">{recentWorkouts.length}</p>
                <p className="text-xs text-muted-foreground">Total Workouts</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
                <p className="text-2xl font-bold">{stats.currentStreak || 0}</p>
                <p className="text-xs text-muted-foreground">Current Streak</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">
                  {Math.round(recentWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0) / 3600)}h
                </p>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Target className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-2xl font-bold">
                  {recentWorkouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Exercises</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Workout Plans
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Recent History
            </TabsTrigger>
          </TabsList>

          {/* Workout Plans */}
          <TabsContent value="plans" className="space-y-6">
            {filteredWorkouts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Dumbbell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No workout plans found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? "Try adjusting your search terms" : "Create your first workout plan to get started"}
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workout Plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWorkouts.map((workout, index) => (
                  <WorkoutCard
                    key={workout._id || workout.id || index}
                    workout={workout}
                    onStart={startWorkout}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Recent History */}
          <TabsContent value="history" className="space-y-6">
            {recentWorkouts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No workout history</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete your first workout to see it here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentWorkouts.map((workout, index) => (
                  <RecentWorkoutCard
                    key={workout._id || workout.id || index}
                    workout={workout}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Workout Timer Modal */}
      {showTimer && activeWorkout && (
        <WorkoutTimer
          workoutPlan={activeWorkout}
          onComplete={(completedWorkout) => {
            setShowTimer(false);
            setActiveWorkout(null);
            loadWorkoutData(); // Refresh data
          }}
          onCancel={() => {
            setShowTimer(false);
            setActiveWorkout(null);
          }}
          isActive={showTimer}
        />
      )}
      
      <BottomNav />
    </div>
  );
}
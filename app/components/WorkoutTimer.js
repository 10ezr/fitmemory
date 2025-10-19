"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  CheckIcon,
  FireIcon,
  HeartIcon,
  BoltIcon
} from "@heroicons/react/24/solid";

export default function WorkoutTimer({ 
  workoutPlan, 
  onComplete, 
  onCancel,
  isActive = false 
}) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [exerciseStartTime, setExerciseStartTime] = useState(null);
  const [exerciseTimes, setExerciseTimes] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [exerciseComplete, setExerciseComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [motivation, setMotivation] = useState('');
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        setTimeElapsed(elapsed);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, isPaused]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startWorkout = () => {
    if (!isRunning) {
      startTimeRef.current = Date.now();
      setExerciseStartTime(Date.now());
      setIsRunning(true);
      setIsPaused(false);
    } else if (isPaused) {
      // Resume - adjust start time to account for paused duration
      const pausedDuration = Date.now() - (startTimeRef.current + (timeElapsed * 1000));
      startTimeRef.current = Date.now() - (timeElapsed * 1000);
      setIsPaused(false);
    }
  };

  const pauseWorkout = () => {
    setIsPaused(true);
  };

  const stopWorkout = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeElapsed(0);
    setCurrentExercise(0);
    setExerciseTimes([]);
    clearInterval(intervalRef.current);
    if (onCancel) onCancel();
  };

  const completeWorkout = async () => {
    const workoutData = {
      totalDuration: timeElapsed,
      exerciseTimes,
      completedAt: new Date(),
      exercises: workoutPlan?.exercises || []
    };
    
    // Show completion celebration
    setShowCelebration(true);
    playCompletionSound();
    
    // Save to database and update streak
    try {
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workoutPlan?.name || 'Timer Workout',
          exercises: workoutPlan?.exercises || [],
          duration: timeElapsed,
          date: new Date()
        })
      });
      
      if (response.ok) {
        setStreak(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error saving workout:', error);
    }
    
    // Wait for celebration animation
    setTimeout(() => {
      setIsRunning(false);
      setIsPaused(false);
      clearInterval(intervalRef.current);
      
      if (onComplete) onComplete(workoutData);
    }, 2000);
  };

  const nextExercise = () => {
    if (exerciseStartTime) {
      const exerciseDuration = Math.floor((Date.now() - exerciseStartTime) / 1000);
      setExerciseTimes(prev => [...prev, {
        exercise: workoutPlan?.exercises[currentExercise]?.name || `Exercise ${currentExercise + 1}`,
        duration: exerciseDuration
      }]);
    }
    
    // Show exercise completion celebration
    setExerciseComplete(true);
    playExerciseCompleteSound();
    showRandomMotivation();
    
    // Trigger shake animation for celebration
    setShakeTrigger(prev => prev + 1);
    
    setTimeout(() => {
      setExerciseComplete(false);
      
      if (currentExercise < (workoutPlan?.exercises?.length || 0) - 1) {
        setCurrentExercise(prev => prev + 1);
        setExerciseStartTime(Date.now());
      }
    }, 1500);
  };
  
  const showRandomMotivation = () => {
    const motivations = [
      "Crushing it! 💪",
      "You're unstoppable! 🔥",
      "Beast mode activated! 🦁",
      "Keep that energy up! ⚡",
      "Smashing those goals! 🏆",
      "On fire today! 🔥",
      "Incredible work! ⭐",
      "Power through! 🚀",
      "You're a champion! 🏅",
      "Nothing stops you! 💯"
    ];
    
    const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
    setMotivation(randomMotivation);
    
    setTimeout(() => setMotivation(''), 2000);
  };
  
  const playExerciseCompleteSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Success chord (C-E-G)
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + i * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + i * 0.1 + 0.4);
        
        oscillator.start(audioContext.currentTime + i * 0.1);
        oscillator.stop(audioContext.currentTime + i * 0.1 + 0.4);
      });
    } catch (error) {
      console.log('Audio not supported');
    }
  };
  
  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Triumphant fanfare
      const notes = [261.63, 329.63, 392, 523.25, 659.25]; // C-E-G-C-E
      notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime + i * 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + i * 0.15 + 0.6);
        
        oscillator.start(audioContext.currentTime + i * 0.15);
        oscillator.stop(audioContext.currentTime + i * 0.15 + 0.6);
      });
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const progress = workoutPlan?.exercises?.length ? 
    ((currentExercise + 1) / workoutPlan.exercises.length) * 100 : 0;

  if (!isActive) {
    return null;
  }

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Background blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            onClick={stopWorkout} 
          />
          
          {/* Main workout card */}
          <motion.div
            key={shakeTrigger}
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ 
              scale: 1, 
              y: 0, 
              opacity: 1,
rotate: exerciseComplete ? [0, 2] : 0
            }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              rotate: { duration: 0.6, ease: "easeInOut" }
            }}
            className="relative w-full max-w-lg mx-4"
          >
            <Card className="bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl border-2 border-primary/20 overflow-hidden">
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 opacity-10"
                animate={{
                  background: [
                    "linear-gradient(45deg, #3b82f6, #8b5cf6)",
                    "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                    "linear-gradient(225deg, #06b6d4, #3b82f6)",
                    "linear-gradient(315deg, #3b82f6, #8b5cf6)"
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Header */}
              <CardHeader className="text-center pb-4 relative z-10">
                <motion.div
                  animate={{
                    scale: isRunning ? [1, 1.05] : 1
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <CardTitle className="text-xl font-bold flex items-center justify-center gap-2 mb-2">
                    <motion.div
                      animate={{ rotate: isRunning ? 360 : 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      🏋️
                    </motion.div>
                    Workout in Progress
                  </CardTitle>
                  
                  <motion.div 
                    className="text-4xl font-mono font-bold text-primary"
                    animate={{
                      scale: isRunning && !isPaused ? [1, 1.02] : 1,
                      color: isRunning ? ["#3b82f6", "#06b6d4"] : "#3b82f6"
                    }}
                    transition={{
                      scale: { duration: 1, repeat: Infinity },
                      color: { duration: 3, repeat: Infinity }
                    }}
                  >
                    {formatTime(timeElapsed)}
                  </motion.div>
                </motion.div>
              </CardHeader>

              <CardContent className="space-y-6 relative z-10">
                {/* Current Exercise */}
                {workoutPlan?.exercises && (
                  <motion.div 
                    className="space-y-3"
animate={{ y: exerciseComplete ? [0, -5] : 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span className="font-medium">Exercise {currentExercise + 1} of {workoutPlan.exercises.length}</span>
                      <motion.span 
                        className="px-2 py-1 bg-primary/10 rounded-full text-primary font-bold"
animate={{ scale: exerciseComplete ? [1, 1.2] : 1 }}
                      >
                        {Math.round(progress)}%
                      </motion.span>
                    </div>
                    
                    <motion.div
                      animate={{ scaleX: progress / 100 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      <Progress value={progress} className="h-3 bg-muted" />
                    </motion.div>
                    
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentExercise}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ 
                          opacity: 1, 
                          x: 0, 
scale: exerciseComplete ? [1, 1.05] : 1
                        }}
                        exit={{ opacity: 0, x: -50, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2 border-primary/20 relative overflow-hidden"
                      >
                        {/* Exercise completion overlay */}
                        <AnimatePresence>
                          {exerciseComplete && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0 }}
                              className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-sm"
                            >
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="text-4xl"
                              >
                                ✅
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-lg">
                            {workoutPlan.exercises[currentExercise]?.name || 'Current Exercise'}
                          </div>
                          <motion.div
                            animate={{ 
                              scale: isRunning ? [1, 1.1] : 1,
                              rotate: [0, 5]
                            }}
                            transition={{ 
                              scale: { duration: 2, repeat: Infinity },
                              rotate: { duration: 1, repeat: Infinity, delay: 1 }
                            }}
                            className="text-2xl"
                          >
                            💪
                          </motion.div>
                        </div>
                        
                        {workoutPlan.exercises[currentExercise]?.reps && (
                          <div className="text-sm text-muted-foreground bg-background/50 px-3 py-1 rounded-full inline-block">
                            {workoutPlan.exercises[currentExercise].sets}x{workoutPlan.exercises[currentExercise].reps}
                            {workoutPlan.exercises[currentExercise].weightKg && 
                              ` @ ${workoutPlan.exercises[currentExercise].weightKg}kg`
                            }
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Motivation Message */}
                <AnimatePresence>
                  {motivation && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.8 }}
                      className="text-center p-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl border border-green-300/50"
                    >
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">
                        {motivation}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Timer Controls */}
                <div className="flex justify-center gap-3">
                  {!isRunning ? (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        onClick={startWorkout} 
                        size="lg" 
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center gap-2"
                      >
                        <PlayIcon className="w-5 h-5" />
                        Start Workout
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="flex gap-3">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {!isPaused ? (
                          <Button 
                            onClick={pauseWorkout} 
                            variant="outline" 
                            size="lg"
                            className="flex items-center gap-2 border-2"
                          >
                            <PauseIcon className="w-5 h-5" />
                            Pause
                          </Button>
                        ) : (
                          <Button 
                            onClick={startWorkout} 
                            size="lg"
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 flex items-center gap-2"
                          >
                            <PlayIcon className="w-5 h-5" />
                            Resume
                          </Button>
                        )}
                      </motion.div>
                      
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          onClick={stopWorkout} 
                          variant="destructive" 
                          size="lg"
                          className="flex items-center gap-2"
                        >
                          <StopIcon className="w-5 h-5" />
                          Stop
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* Exercise Controls */}
                {isRunning && workoutPlan?.exercises && (
                  <motion.div 
                    className="space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {currentExercise < workoutPlan.exercises.length - 1 ? (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          onClick={nextExercise} 
                          className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold py-3 px-4 rounded-xl shadow-md"
                        >
                          ✅ Exercise Done - Next →
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        animate={{ 
                          boxShadow: [
                            "0 4px 15px rgba(34, 197, 94, 0.3)",
                            "0 4px 25px rgba(34, 197, 94, 0.5)"
                          ]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Button 
                          onClick={completeWorkout} 
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg"
                        >
                          <CheckIcon className="w-6 h-6" />
                          🏆 Complete Workout!
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Quick Complete */}
                {isRunning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    <Button 
                      onClick={completeWorkout} 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      Finish workout early
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Workout Completion Celebration */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center z-10"
              >
                <motion.div
                  animate={{
                    rotate: [0, 10],
                    scale: [1, 1.2]
                  }}
                  transition={{ duration: 2, repeat: 2 }}
                  className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white p-8 rounded-3xl shadow-2xl text-center"
                >
                  <div className="text-6xl mb-4">🏆</div>
                  <div className="text-2xl font-bold mb-2">Workout Complete!</div>
                  <div className="text-lg">Amazing work! 💪</div>
                  {streak > 0 && (
                    <div className="mt-4 text-sm bg-white/20 px-4 py-2 rounded-full">
                      🔥 Streak: {streak} days!
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import StatsSidebar from "../app/components/StatsSidebar";

export default function Sidebar() {
  const [stats, setStats] = useState(null);
  const [patternSummary, setPatternSummary] = useState("");
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSidebarData();
  }, []);

  const loadSidebarData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, patternsRes, workoutRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/patternSummary"),
        fetch("/api/todaysWorkout")
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (patternsRes.ok) {
        const patternsData = await patternsRes.json();
        setPatternSummary(patternsData.summary || "Building your routine...");
      }

      if (workoutRes.ok) {
        const workoutData = await workoutRes.json();
        setTodaysWorkout(workoutData.workout);
      }
    } catch (error) {
      console.error("Failed to load sidebar data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWorkout = () => {
    // Dispatch event to trigger workout timer
    window.dispatchEvent(new CustomEvent('startWorkout'));
  };

  if (isLoading) {
    return (
      <aside className="hidden md:flex md:w-72 lg:w-96 flex-col border-r overflow-hidden bg-gradient-to-b from-background to-muted/30">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex md:w-72 lg:w-96 flex-col border-r overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <div className="flex items-center justify-between border-b px-4 py-3 bg-background/80 backdrop-blur">
        <div className="text-sm font-semibold">Fitness Dashboard</div>
        <motion.div
animate={{ scale: [1, 1.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-lg"
        >
          🏋️
        </motion.div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <StatsSidebar
          stats={stats}
          patternSummary={patternSummary}
          todaysWorkout={todaysWorkout}
          onStartWorkout={handleStartWorkout}
        />
      </div>
      
      <div className="border-t px-4 py-3 text-xs text-muted-foreground bg-background/50">
        <div className="flex items-center justify-between">
          <span>FitMemory AI Coach</span>
          <motion.span
animate={{ opacity: [0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-1"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Active
          </motion.span>
        </div>
      </div>
    </aside>
  );
}

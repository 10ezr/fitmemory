"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Droplet } from "lucide-react";
import { FITNESS_GOALS } from "@/lib/constants/appConfig";

/**
 * Active hydration tracker widget
 */
export default function HydrationWidget({ onGlassAdded }) {
  const [glasses, setGlasses] = useState(0);
  const goal = FITNESS_GOALS.DAILY_WATER_GLASSES;
  const progress = Math.min(100, (glasses / goal) * 100);
  
  const handleClick = () => {
    const newCount = Math.min(goal, glasses + 1);
    setGlasses(newCount);
    onGlassAdded?.(newCount);
  };
  
  return (
    <Card 
      className="hover:shadow-sm transition-all cursor-pointer" 
      onClick={handleClick}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Hydration</div>
          <div className="text-lg font-semibold">{glasses}/{goal}</div>
        </div>
        <div className="relative">
          <Droplet className="h-6 w-6 text-cyan-500" />
          <div 
            className="absolute inset-0 bg-cyan-500/20 rounded-full animate-pulse" 
            style={{ opacity: progress / 100 }} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
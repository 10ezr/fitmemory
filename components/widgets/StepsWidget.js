"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Footprints } from "lucide-react";
import { FITNESS_GOALS } from "@/lib/constants/appConfig";

/**
 * Active steps tracking widget
 */
export default function StepsWidget({ onStepsUpdated }) {
  const [steps, setSteps] = useState(0);
  const goal = FITNESS_GOALS.DAILY_STEPS;
  const progress = Math.min(100, (steps / goal) * 100);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const newSteps = Number(e.target.value) || 0;
      setSteps(newSteps);
      onStepsUpdated?.(newSteps);
      e.target.value = '';
    }
  };
  
  return (
    <Card className="hover:shadow-sm transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-muted-foreground">Steps</div>
          <Footprints className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <div className="text-lg font-semibold">{steps.toLocaleString()}</div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <Input 
            type="number" 
            placeholder="Update steps" 
            className="text-xs h-7"
            onKeyDown={handleKeyDown}
          />
        </div>
      </CardContent>
    </Card>
  );
}
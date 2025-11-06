"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, PlayCircle, ChevronRight, Plus } from "lucide-react";
import ProgressRing from "@/components/widgets/ProgressRing";
import { showActionToast } from "@/lib/toasts";
import { useRouter } from "next/navigation";

export default function WorkoutWidget({ workouts, onWorkoutCreate }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [workoutType, setWorkoutType] = useState("hiit");

  const createWorkout = async () => {
    setCreating(true);
    try {
      const templates = {
        hiit: { name: "Quick HIIT", exercises: ["Burpees", "Mountain climbers", "Jump squats"], duration: 20 },
        strength: { name: "Strength Training", exercises: ["Push-ups", "Squats", "Planks"], duration: 30 },
        cardio: { name: "Cardio Blast", exercises: ["Running", "Cycling", "Jumping jacks"], duration: 25 }
      };
      const template = templates[workoutType];
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      if (res.ok) {
        showActionToast({ type: "workout_created", name: template.name });
        onWorkoutCreate?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Today&apos;s workout</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {(workouts||[]).length ? (
          <>
            <div className="text-sm text-muted-foreground">{workouts[0]?.exercises?.length || 0} exercises ready</div>
            <div className="flex items-center gap-3">
              <div className="relative drop-shadow-[0_0_10px_rgba(124,58,237,.15)]">
                <ProgressRing progress={85} color="#7c3aed" size={80} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <PlayCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium">{workouts[0]?.name}</div>
                <Button onClick={()=>router.push("/workouts")} className="gap-2 mt-1" size="sm">Start <ChevronRight className="h-3 w-3" /></Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-3">No workout planned</div>
            <div className="space-y-2">
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hiit">20min HIIT</SelectItem>
                  <SelectItem value="strength">30min Strength</SelectItem>
                  <SelectItem value="cardio">25min Cardio</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={createWorkout} disabled={creating} className="w-full gap-2" size="sm">
                <Plus className="h-4 w-4" />
                {creating ? "Creating..." : "Create Workout"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

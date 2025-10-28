import { NextResponse } from "next/server";
import connectDB from "@/lib/database";
import { Workout } from "@/models";
import MemoryService from "@/services/memoryService";

function analyzeStrengthsAndWeaknesses(memories, recentWorkouts) {
  const analysis = {
    weak: [],
    strong: [],
    focus: null,
  };

  memories.forEach((m) => {
    const content = m.content.toLowerCase();
    if (
      content.includes("weak") ||
      content.includes("lagging") ||
      content.includes("struggle")
    ) {
      if (content.includes("chest")) analysis.weak.push("chest");
      if (content.includes("shoulder")) analysis.weak.push("shoulders");
      if (content.includes("back")) analysis.weak.push("back");
      if (content.includes("leg") || content.includes("quad"))
        analysis.weak.push("legs");
      if (content.includes("core") || content.includes("abs"))
        analysis.weak.push("core");
    }

    if (
      content.includes("strong") ||
      content.includes("good at") ||
      content.includes("improving")
    ) {
      if (content.includes("chest")) analysis.strong.push("chest");
      if (content.includes("shoulder")) analysis.strong.push("shoulders");
      if (content.includes("back")) analysis.strong.push("back");
      if (content.includes("leg") || content.includes("quad"))
        analysis.strong.push("legs");
      if (content.includes("core") || content.includes("abs"))
        analysis.strong.push("core");
    }

    if (
      content.includes("focus on") ||
      content.includes("work on") ||
      content.includes("emphasize")
    ) {
      if (content.includes("chest")) analysis.focus = "chest";
      if (content.includes("shoulder")) analysis.focus = "shoulders";
      if (content.includes("back")) analysis.focus = "back";
      if (content.includes("leg")) analysis.focus = "legs";
      if (content.includes("core")) analysis.focus = "core";
    }
  });

  return analysis;
}

function buildAdaptiveWorkout(baseDay, analysis, constraints, context) {
  const workouts = {
    chest_focus: {
      name: "Tomorrow — Chest Power Focus",
      estimatedDuration: 40,
      exercises: [
        {
          name: "Barbell Bench Press",
          sets: 4,
          reps: "6-8",
          type: "strength",
          priority: "high",
        },
        {
          name: "Incline Dumbbell Press",
          sets: 3,
          reps: "8-10",
          type: "strength",
          priority: "high",
        },
        {
          name: "Chest Flyes",
          sets: 3,
          reps: "10-12",
          type: "accessory",
          priority: "high",
        },
        {
          name: "Push-ups (burnout)",
          sets: 2,
          reps: "max",
          type: "finisher",
          priority: "high",
        },
        {
          name: "Light Back Rows",
          sets: 2,
          reps: "12-15",
          type: "maintenance",
          priority: "low",
        },
      ],
    },
    back_focus: {
      name: "Tomorrow — Back Development",
      estimatedDuration: 40,
      exercises: [
        {
          name: "Deadlifts",
          sets: 4,
          reps: "5-6",
          type: "strength",
          priority: "high",
        },
        {
          name: "Pull-ups/Lat Pulldowns",
          sets: 3,
          reps: "8-10",
          type: "strength",
          priority: "high",
        },
        {
          name: "Barbell Rows",
          sets: 3,
          reps: "8-10",
          type: "strength",
          priority: "high",
        },
        {
          name: "Face Pulls",
          sets: 3,
          reps: "12-15",
          type: "accessory",
          priority: "high",
        },
        {
          name: "Light Chest Press",
          sets: 2,
          reps: "12-15",
          type: "maintenance",
          priority: "low",
        },
      ],
    },
    shoulders_focus: {
      name: "Tomorrow — Shoulder Builder",
      estimatedDuration: 35,
      exercises: [
        {
          name: "Overhead Press",
          sets: 4,
          reps: "6-8",
          type: "strength",
          priority: "high",
        },
        {
          name: "Lateral Raises",
          sets: 4,
          reps: "10-12",
          type: "accessory",
          priority: "high",
        },
        {
          name: "Rear Delt Flyes",
          sets: 3,
          reps: "12-15",
          type: "accessory",
          priority: "high",
        },
        {
          name: "Front Raises",
          sets: 3,
          reps: "10-12",
          type: "accessory",
          priority: "high",
        },
        {
          name: "Shrugs",
          sets: 3,
          reps: "12-15",
          type: "accessory",
          priority: "medium",
        },
      ],
    },
    legs_focus: {
      name: "Tomorrow — Leg Power",
      estimatedDuration: 45,
      exercises: [
        {
          name: "Squats",
          sets: 4,
          reps: "6-8",
          type: "strength",
          priority: "high",
        },
        {
          name: "Romanian Deadlifts",
          sets: 3,
          reps: "8-10",
          type: "strength",
          priority: "high",
        },
        {
          name: "Lunges",
          sets: 3,
          reps: "10-12",
          type: "strength",
          priority: "high",
        },
        {
          name: "Leg Curls",
          sets: 3,
          reps: "10-12",
          type: "accessory",
          priority: "high",
        },
        {
          name: "Calf Raises",
          sets: 3,
          reps: "15-20",
          type: "accessory",
          priority: "medium",
        },
      ],
    },
    balanced: {
      name: "Tomorrow — Balanced Upper Body",
      estimatedDuration: 35,
      exercises: [
        {
          name: "Push-ups",
          sets: 3,
          reps: 10,
          type: "strength",
          priority: "medium",
        },
        {
          name: "Pull-ups",
          sets: 3,
          reps: 8,
          type: "strength",
          priority: "medium",
        },
        {
          name: "Overhead Press",
          sets: 3,
          reps: 8,
          type: "strength",
          priority: "medium",
        },
        {
          name: "Rows",
          sets: 3,
          reps: 10,
          type: "strength",
          priority: "medium",
        },
        { name: "Plank", sets: 3, reps: "30s", type: "core", priority: "low" },
      ],
    },
  };

  let selectedWorkout;
  if (analysis.focus) {
    selectedWorkout = workouts[`${analysis.focus}_focus`] || workouts.balanced;
  } else if (analysis.weak.length > 0) {
    selectedWorkout =
      workouts[`${analysis.weak[0]}_focus`] || workouts.balanced;
  } else {
    selectedWorkout = workouts.balanced;
  }

  const adaptations = [];

  if (constraints.some((c) => c.content.toLowerCase().includes("shoulder"))) {
    selectedWorkout.exercises = selectedWorkout.exercises.map((ex) => {
      if (
        ex.name.toLowerCase().includes("overhead") ||
        ex.name.toLowerCase().includes("press")
      ) {
        adaptations.push(`${ex.name} → Machine Press (shoulder constraint)`);
        return {
          ...ex,
          name: "Machine Chest Press",
          notes: "Shoulder-safe variation",
        };
      }
      return ex;
    });
  }

  if (constraints.some((c) => c.content.toLowerCase().includes("knee"))) {
    selectedWorkout.exercises = selectedWorkout.exercises.map((ex) => {
      if (
        ex.name.toLowerCase().includes("squat") ||
        ex.name.toLowerCase().includes("lunge")
      ) {
        adaptations.push(`${ex.name} → Leg Press (knee constraint)`);
        return { ...ex, name: "Leg Press", notes: "Knee-friendly option" };
      }
      return ex;
    });
  }

  // Adapt based on today's training to avoid overuse and alternate focus
  if (context?.today?.workedOut) {
    const todayName = (context.today.lastWorkoutName || "").toLowerCase();
    const contains = (s) => todayName.includes(s);
    if (contains("chest") && selectedWorkout === workouts.chest_focus)
      selectedWorkout = workouts.back_focus;
    if (contains("legs") && selectedWorkout === workouts.legs_focus)
      selectedWorkout = workouts.shoulders_focus;
    if (contains("back") && selectedWorkout === workouts.back_focus)
      selectedWorkout = workouts.chest_focus;
  }

  return { workout: selectedWorkout, adaptations, analysis };
}

export async function GET() {
  try {
    await connectDB();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    let constraints = [];
    let memories = [];
    let recentWorkouts = [];

    try {
      const memoryService = new MemoryService();
      const [constraintMems, injuryMems, allMems, workouts] = await Promise.all(
        [
          memoryService.getMemoriesByType("constraint", 10),
          memoryService.getMemoriesByType("injury", 10),
          memoryService.getMemoriesByType("pattern", 20),
          memoryService.getRecentWorkouts(5),
        ]
      );
      constraints = [...(constraintMems || []), ...(injuryMems || [])];
      memories = [...(allMems || []), ...constraints];
      recentWorkouts = workouts || [];
    } catch (memoryError) {
      console.log("Memory service unavailable");
    }

    // Detect if today had a workout and capture last workout name
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const todayWorkouts = await Workout.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .sort({ date: -1 })
      .limit(1)
      .lean();
    const todayContext = {
      workedOut: todayWorkouts.length > 0,
      lastWorkoutName: todayWorkouts[0]?.name || null,
    };

    const analysis = analyzeStrengthsAndWeaknesses(memories, recentWorkouts);
    const result = buildAdaptiveWorkout("upper", analysis, constraints, {
      today: todayContext,
    });

    return NextResponse.json({
      date: tomorrow.toISOString(),
      workout: result.workout,
      constraints: constraints.map((c) => c.content),
      adaptations: result.adaptations,
      analysis: {
        weakAreas: analysis.weak,
        strongAreas: analysis.strong,
        currentFocus: analysis.focus,
      },
      source: "ai-adaptive",
      context: todayContext,
    });
  } catch (err) {
    console.error("Error generating adaptive workout:", err);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}

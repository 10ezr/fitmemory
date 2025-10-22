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

  // Check memories for strength assessments
  memories.forEach((m) => {
    const content = m.content.toLowerCase();

    // Weak areas
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

    // Strong areas
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

    // Focus requests
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

function buildAdaptiveWorkout(baseDay, analysis, constraints) {
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

  // Choose workout based on analysis
  let selectedWorkout;

  if (analysis.focus) {
    selectedWorkout = workouts[`${analysis.focus}_focus`] || workouts.balanced;
  } else if (analysis.weak.length > 0) {
    // Focus on first weak area
    selectedWorkout =
      workouts[`${analysis.weak[0]}_focus`] || workouts.balanced;
  } else {
    selectedWorkout = workouts.balanced;
  }

  // Apply constraint modifications
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

      // Get all relevant data
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

    // Analyze and build adaptive workout
    const analysis = analyzeStrengthsAndWeaknesses(memories, recentWorkouts);
    const result = buildAdaptiveWorkout("upper", analysis, constraints);

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
    });
  } catch (err) {
    console.error("Error generating adaptive workout:", err);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}

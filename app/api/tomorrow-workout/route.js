import { NextResponse } from "next/server";
import connectDB from "@/lib/database";
import { Workout } from "@/models";
import MemoryService from "@/services/memoryService";

// Simple adaptation rules based on constraints
function adaptPlan(basePlan, constraints) {
  if (!constraints || constraints.length === 0)
    return { workout: basePlan, adaptations: [] };

  const lower = (s) => (s || "").toLowerCase();
  const text = constraints
    .map((c) => `${c.type}:${c.content}`)
    .join(" ")
    .toLowerCase();

  const adaptations = [];
  const out = JSON.parse(JSON.stringify(basePlan));

  const shoulder = /shoulder|overhead|press|rotator/i.test(text);
  const knee = /knee|patella|squat|impact/i.test(text);
  const back = /lower back|deadlift|hinge|spine/i.test(text);
  const elbow = /elbow|tricep|pressdown/i.test(text);

  // Iterate exercises and replace risky ones
  out.exercises = out.exercises.map((ex) => {
    const name = lower(ex.name);

    // Shoulder: avoid overhead pressing/painful abduction
    if (
      shoulder &&
      (name.includes("overhead") ||
        name.includes("shoulder press") ||
        name.includes("military"))
    ) {
      adaptations.push({
        from: ex.name,
        to: "Machine Chest Press",
        reason: "shoulder constraint",
      });
      return {
        ...ex,
        name: "Machine Chest Press",
        notes: "Avoid overhead; neutral grip if possible",
      };
    }
    if (shoulder && name.includes("lateral raise")) {
      // Keep but lighten
      return {
        ...ex,
        sets: ex.sets,
        reps: ex.reps,
        notes: "Light weight, slow tempo, pain-free ROM",
      };
    }

    // Knee: avoid heavy squats/jumps; prefer machines/split-stable
    if (
      knee &&
      (name.includes("squat") || name.includes("jump") || name.includes("box"))
    ) {
      adaptations.push({
        from: ex.name,
        to: "Leg Press (light) or Step-Ups",
        reason: "knee constraint",
      });
      return {
        ...ex,
        name: "Leg Press (light)",
        sets: 3,
        reps: 12,
        notes: "Slow tempo, short ROM, pain-free",
      };
    }

    // Back: reduce heavy hinges; keep core stability
    if (
      back &&
      (name.includes("deadlift") ||
        name.includes("rdl") ||
        name.includes("good morning"))
    ) {
      adaptations.push({
        from: ex.name,
        to: "Back Extension (light) or Hip Thrust",
        reason: "lower-back constraint",
      });
      return {
        ...ex,
        name: "Back Extension (light)",
        sets: 3,
        reps: 12,
        notes: "Neutral spine, no pain",
      };
    }

    // Elbow: avoid deep elbow flexion under load
    if (elbow && (name.includes("skullcrusher") || name.includes("curl"))) {
      adaptations.push({
        from: ex.name,
        to: "Cable Curl (EZ/neutral) / Rope Pushdown",
        reason: "elbow constraint",
      });
      return {
        ...ex,
        name: "Rope Pushdown (light)",
        sets: 3,
        reps: 12,
        notes: "Neutral wrist, high rep, pain-free",
      };
    }

    return ex;
  });

  return { workout: out, adaptations };
}

export async function GET() {
  try {
    await connectDB();

    // Build tomorrow range
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(start);
    tomorrowStart.setDate(start.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowStart.getDate() + 1);

    // If there's an explicit plan saved for tomorrow, use it
    const plan = await Workout.findOne({
      date: { $gte: tomorrowStart, $lt: tomorrowEnd },
    }).sort({ createdAt: -1 });

    // Baseline fallback (upper/lower split sample)
    const baseline = plan || {
      name: "Tomorrow — Upper Body (Adaptive)",
      estimatedDuration: 35,
      exercises: [
        { name: "Overhead Press", sets: 3, reps: 8, type: "strength" },
        { name: "Lat Pulldown", sets: 3, reps: 10, type: "strength" },
        { name: "Lateral Raise", sets: 3, reps: 12, type: "accessory" },
        { name: "Cable Row", sets: 3, reps: 10, type: "strength" },
        { name: "Core: Dead Bug", sets: 2, reps: 10, type: "core" },
      ],
    };

    // Pull active constraints via MemoryService
    const memoryService = new MemoryService();
    const constraintMemories = await memoryService.getMemoriesByType(
      "constraint",
      15
    );
    const injuryMemories = await memoryService.getMemoriesByType("injury", 15);

    // Heuristic: only consider recent / high-confidence items
    const active = [...(constraintMemories || []), ...(injuryMemories || [])]
      .filter(
        (m) => m?.meta?.confidence === undefined || m.meta.confidence >= 0.6
      )
      .slice(0, 10);

    // Adapt plan
    const { workout: adapted, adaptations } = adaptPlan(
      typeof baseline.toObject === "function" ? baseline.toObject() : baseline,
      active
    );

    // Include constraint summary for UI
    const constraintSummary = active.map((m) => m.content);

    return NextResponse.json({
      date: tomorrowStart.toISOString(),
      workout: adapted,
      adaptations,
      constraints: constraintSummary,
      source: plan ? "planned" : "generated",
    });
  } catch (err) {
    console.error("Error generating tomorrow workout:", err);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}

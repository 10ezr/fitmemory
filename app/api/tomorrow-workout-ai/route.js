import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import MemoryService from "@/services/memoryService";
import GeminiService from "@/services/geminiService";
import { User, Workout, Streak } from "@/models";

function parsePlanFromMarkdown(md) {
  if (!md || typeof md !== "string") return null;
  const lines = md.replace(/\r\n/g, "\n").split(/\n/);
  const plan = { name: "Tomorrow — Personalized Session", estimatedDuration: 35, exercises: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Title
    const titleMatch = line.match(/^##\s+(.*)$/);
    if (titleMatch && !plan._gotTitle) {
      plan.name = titleMatch[1].replace(/^Today’|^Today'|^Tomorrow’|^Tomorrow'/, "Tomorrow").trim();
      plan._gotTitle = true;
      continue;
    }

    // Duration badge like "35 min"
    const durMatch = line.match(/(\d{2,3})\s*min/i);
    if (durMatch) plan.estimatedDuration = Math.max(10, Math.min(120, parseInt(durMatch[1], 10)));

    // Exercise bullet with sets×reps: "- Push-ups 3×10" or "3x10"
    const exMatch = line.match(/^[\-*]\s*(.+?)\s+(\d+)\s*[×x]\s*([\dA-Za-z]+)\b/);
    if (exMatch) {
      plan.exercises.push({ name: exMatch[1].trim(), sets: Number(exMatch[2]), reps: exMatch[3] });
      continue;
    }

    // Alternate pattern: "Push-ups" line then next token like "3×10"
    if (/^[\-*]\s*.+/.test(line)) {
      const name = line.replace(/^[\-*]\s*/, "").trim();
      const next = (lines[i + 1] || "").trim();
      const sr = next.match(/^(\d+)\s*[×x]\s*([\dA-Za-z]+)/);
      if (sr) {
        plan.exercises.push({ name, sets: Number(sr[1]), reps: sr[2] });
        i++; // consume next line
      }
    }
  }

  if (!plan.exercises.length) return null;
  delete plan._gotTitle;
  return plan;
}

export async function GET() {
  try {
    await connectDatabase();

    // Build context similar to converse route
    const memoryService = new MemoryService();
    const user = await User.findById("local");
    const recentWorkouts = await memoryService.getRecentWorkouts(5);
    const memories = await memoryService.getMemoriesByType("pattern", 20);
    const constraints = await memoryService.getMemoriesByType("constraint", 10);
    const injuries = await memoryService.getMemoriesByType("injury", 10);
    const streak = await Streak.findById("local");

    const context = {
      user,
      recentWorkouts,
      memories: [...(memories || []), ...(constraints || []), ...(injuries || [])],
      lastMessages: [],
      workoutJustLogged: null,
      streakData: streak
        ? {
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastWorkoutDate: streak.lastWorkoutDate,
          }
        : null,
    };

    const gemini = new GeminiService();
    const prompt = "Based on my recent training, soreness, constraints, and streak, what should be my workout tomorrow? Output a short Markdown plan with a '##' title, an optional line containing '<nn> min', and 5–6 bullets for exercises where each bullet ends with sets×reps like '3×10'. Keep it concise and actionable.";

    const { reply } = await gemini.generateResponse(prompt, context);
    const plan = parsePlanFromMarkdown(reply);

    if (!plan) {
      return NextResponse.json({ error: "AI did not return a parseable plan" }, { status: 502 });
    }

    return NextResponse.json({
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      workout: plan,
      source: "ai",
    });
  } catch (e) {
    console.error("tomorrow-workout-ai error:", e);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}

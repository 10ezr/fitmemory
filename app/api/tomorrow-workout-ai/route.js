import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import MemoryService from "@/services/memoryService";
import GeminiService from "@/services/geminiService";
import { User, Workout, Streak } from "@/models";

// 30 min cache TTL for tomorrow plan to avoid flicker and API overuse
const CACHE_TTL_MS = 30 * 60 * 1000;
let inMemoryCache = { plan: null, expiresAt: 0, key: "" };

function buildCacheKey({ user, streak, lastWorkoutAt }) {
  // Key factors: user id, streak current, last workout date day, and local date for tomorrow
  const uid = user?._id || "local";
  const streakK = streak ? `${streak.currentStreak}-${streak.longestStreak}` : "0-0";
  const lastW = lastWorkoutAt ? new Date(lastWorkoutAt).toDateString() : "none";
  const tomorrowLocal = new Date();
  tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);
  tomorrowLocal.setHours(0, 0, 0, 0);
  const dayKey = tomorrowLocal.toDateString();
  return `${uid}|${streakK}|${lastW}|${dayKey}`;
}

function parsePlanFromMarkdown(md) {
  if (!md || typeof md !== "string") return null;
  const lines = md.replace(/\r\n/g, "\n").split(/\n/);
  const plan = { name: "Tomorrow — Personalized Session", estimatedDuration: 35, exercises: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const titleMatch = line.match(/^##\s+(.*)$/);
    if (titleMatch && !plan._gotTitle) {
      plan.name = titleMatch[1].replace(/^Today’|^Today'|^Tomorrow’|^Tomorrow'/, "Tomorrow").trim();
      plan._gotTitle = true;
      continue;
    }

    const durMatch = line.match(/(\d{2,3})\s*min/i);
    if (durMatch) plan.estimatedDuration = Math.max(10, Math.min(120, parseInt(durMatch[1], 10)));

    const exMatch = line.match(/^[\-*]\s*(.+?)\s+(\d+)\s*[×x]\s*([\dA-Za-z]+)\b/);
    if (exMatch) {
      plan.exercises.push({ name: exMatch[1].trim(), sets: Number(exMatch[2]), reps: exMatch[3] });
      continue;
    }

    if (/^[\-*]\s*.+/.test(line)) {
      const name = line.replace(/^[\-*]\s*/, "").trim();
      const next = (lines[i + 1] || "").trim();
      const sr = next.match(/^(\d+)\s*[×x]\s*([\dA-Za-z]+)/);
      if (sr) {
        plan.exercises.push({ name, sets: Number(sr[1]), reps: sr[2] });
        i++;
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

    // Build context
    const memoryService = new MemoryService();
    const user = await User.findById("local");
    const recentWorkouts = await memoryService.getRecentWorkouts(5);
    const memories = await memoryService.getMemoriesByType("pattern", 20);
    const constraints = await memoryService.getMemoriesByType("constraint", 10);
    const injuries = await memoryService.getMemoriesByType("injury", 10);
    const streak = await Streak.findById("local");

    const lastWorkoutAt = recentWorkouts?.[0]?.date || streak?.lastWorkoutDate || null;
    const cacheKey = buildCacheKey({ user, streak, lastWorkoutAt });

    // Serve from cache if valid
    const now = Date.now();
    if (inMemoryCache.plan && inMemoryCache.expiresAt > now && inMemoryCache.key === cacheKey) {
      return NextResponse.json({ date: new Date(now + 24 * 60 * 60 * 1000).toISOString(), workout: inMemoryCache.plan, source: "ai-cache" });
    }

    const context = {
      user,
      recentWorkouts,
      memories: [...(memories || []), ...(constraints || []), ...(injuries || [])],
      lastMessages: [],
      workoutJustLogged: null,
      streakData: streak ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, lastWorkoutDate: streak.lastWorkoutDate } : null,
    };

    const gemini = new GeminiService();
    const prompt = "Based on my recent training, soreness notes, constraints, and streak, what should be my workout tomorrow? Output a short Markdown plan with a '##' title, an optional '<nn> min' line, and 5–6 bullets where each bullet ends with sets×reps like '3×10'. Keep it concise and actionable. If tomorrow should be active recovery, say so in the title and give 4–5 gentle movements with times instead of sets×reps.";

    const { reply } = await gemini.generateResponse(prompt, context);
    const plan = parsePlanFromMarkdown(reply);

    if (!plan) {
      return NextResponse.json({ error: "AI did not return a parseable plan" }, { status: 502 });
    }

    // Cache it
    inMemoryCache = { plan, key: cacheKey, expiresAt: now + CACHE_TTL_MS };

    return NextResponse.json({ date: new Date(now + 24 * 60 * 60 * 1000).toISOString(), workout: plan, source: "ai" });
  } catch (e) {
    console.error("tomorrow-workout-ai error:", e);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}

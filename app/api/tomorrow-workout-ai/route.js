import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import MemoryService from "@/services/memoryService";
import GeminiService from "@/services/geminiService";
import { User, Streak, Message } from "@/models";

// Simple policy: generate once per day, store in-memory, refresh on workout-completed broadcast (client) or next day
let dailyCache = { dateKey: "", plan: null };

function todayKeyIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function parsePlan(md) {
  if (!md || typeof md !== "string") return null;
  const lines = md.replace(/\r\n/g, "\n").split(/\n/);
  const plan = { name: "Tomorrow — Personalized", estimatedDuration: 35, exercises: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const h = line.match(/^##\s+(.+)$/);
    if (h && !plan._t) { plan.name = h[1].replace(/^Today/i, "Tomorrow"); plan._t = true; continue; }
    const dur = line.match(/(\d{2,3})\s*min/i); if (dur) plan.estimatedDuration = Math.max(10, Math.min(120, parseInt(dur[1], 10)));
    const ex = line.match(/^[\-*]\s*(.+?)\s+(\d+)\s*[×x]\s*([\dA-Za-z]+)/);
    if (ex) { plan.exercises.push({ name: ex[1], sets: Number(ex[2]), reps: ex[3] }); continue; }
    if (/^[\-*]\s+.+/.test(line)) {
      const name = line.replace(/^[\-*]\s+/, "");
      const next = (lines[i + 1] || "").trim();
      const sr = next.match(/^(\d+)\s*[×x]\s*([\dA-Za-z]+)/);
      if (sr) { plan.exercises.push({ name, sets: Number(sr[1]), reps: sr[2] }); i++; }
    }
  }
  if (!plan.exercises.length) return null;
  delete plan._t; return plan;
}

export async function GET() {
  try {
    await connectDatabase();

    const dateKey = todayKeyIST();
    if (dailyCache.plan && dailyCache.dateKey === dateKey) {
      return NextResponse.json({ date: new Date(Date.now() + 86400000).toISOString(), workout: dailyCache.plan, source: "daily-cache" });
    }

    const memoryService = new MemoryService();
    const user = await User.findById("local");
    const streak = await Streak.findById("local");
    const recentWorkouts = await memoryService.getRecentWorkouts(3);
    const lastMessages = await Message.find({}).sort({ createdAt: -1 }).limit(3).lean();

    const gemini = new GeminiService();
    const prompt = "Give a compact plan for tomorrow based on my last few workouts and any recent soreness notes. Use: '##' title, optional '<nn> min', and 5–6 bullets each ending with sets×reps like 3×10. If active recovery is better, list 4–5 gentle movements with durations.";

    const context = {
      user,
      recentWorkouts,
      memories: [],
      lastMessages: (lastMessages || []).reverse().map(m => ({ role: m.role, content: m.content })),
      streakData: streak ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, lastWorkoutDate: streak.lastWorkoutDate } : null,
    };

    const { reply } = await gemini.generateResponse(prompt, context);
    const plan = parsePlan(reply);
    if (!plan) return NextResponse.json({ error: "Could not parse plan" }, { status: 502 });

    dailyCache = { dateKey, plan };
    return NextResponse.json({ date: new Date(Date.now() + 86400000).toISOString(), workout: plan, source: "ai-simple" });
  } catch (e) {
    console.error("tomorrow-workout-ai simple error:", e);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}

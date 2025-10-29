import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import MemoryService from "@/services/memoryService";
import GeminiService from "@/services/geminiService";
import { User, Workout, Streak } from "@/models";

// Smart cache: 60 min TTL; bust on workout completion or strong context
const CACHE_TTL_MS = 60 * 60 * 1000;
let cache = { plan: null, key: "", expiresAt: 0, strength: 0 };

function tomorrowDayKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function buildKey({ userId, lastWorkoutISO, streakCurrent }) {
  return [userId || "local", (lastWorkoutISO || "none").slice(0, 10), streakCurrent || 0, tomorrowDayKey()].join("|");
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

function contextStrength(memories) {
  let s = 0;
  for (const m of memories || []) {
    const c = (m.content || "").toLowerCase();
    if (/injur|sprain|fracture|doctor|medical/.test(c)) s += 5;
    if (/(knee|shoulder|back|leg|arm).*(hurt|pain|sore)/.test(c)) s += 3;
    if (/(active recovery|walk|rest day|can't lift|cannot lift)/.test(c)) s += 3;
    if (/(travel|no equipment|time constraint|busy)/.test(c)) s += 2;
  }
  return s;
}

export async function GET() {
  try {
    await connectDatabase();
    const memoryService = new MemoryService();
    const user = await User.findById("local");
    const streak = await Streak.findById("local");
    const recentWorkouts = await memoryService.getRecentWorkouts(5);
    const lastWorkoutISO = recentWorkouts?.[0]?.date || streak?.lastWorkoutDate || null;
    const patternMems = await memoryService.getMemoriesByType("pattern", 50);
    const constraints = await memoryService.getMemoriesByType("constraint", 20);
    const injuries = await memoryService.getMemoriesByType("injury", 20);
    const memories = [...(patternMems || []), ...(constraints || []), ...(injuries || [])];

    const key = buildKey({ userId: user?._id, lastWorkoutISO: lastWorkoutISO ? new Date(lastWorkoutISO).toISOString() : null, streakCurrent: streak?.currentStreak });
    const strength = contextStrength(memories);

    const now = Date.now();
    // Smart cache policy: serve cache when valid unless very strong signal (>=6)
    if (cache.plan && cache.key === key && cache.expiresAt > now && strength < 6) {
      return NextResponse.json({ date: new Date(now + 86400000).toISOString(), workout: cache.plan, source: "ai-cache", strength: cache.strength });
    }

    const context = {
      user,
      recentWorkouts,
      memories,
      streakData: streak ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, lastWorkoutDate: streak.lastWorkoutDate } : null,
    };

    const gemini = new GeminiService();
    const prompt = "Plan my workout for tomorrow based on my recent training, soreness and constraints. Output concise Markdown: '##' title, optional '<nn> min', then 5–6 bullets (each ends with sets×reps like 3×10). If active recovery is best, title it accordingly and list 4–5 gentle movements with durations.";
    const { reply } = await gemini.generateResponse(prompt, context);
    const plan = parsePlan(reply);

    if (!plan) {
      if (cache.plan && cache.key === key) {
        return NextResponse.json({ date: new Date(now + 86400000).toISOString(), workout: cache.plan, source: "ai-cache", strength: cache.strength, warning: "unparseable_ai_reply" });
      }
      return NextResponse.json({ error: "AI did not return a parseable plan" }, { status: 502 });
    }

    cache = { plan, key, expiresAt: now + CACHE_TTL_MS, strength };
    return NextResponse.json({ date: new Date(now + 86400000).toISOString(), workout: plan, source: "ai", strength });
  } catch (e) {
    console.error("tomorrow-workout-ai error:", e);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}

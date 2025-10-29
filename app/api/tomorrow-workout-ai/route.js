import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import MemoryService from "@/services/memoryService";
import GeminiService from "@/services/geminiService";
import { User, Streak, Message } from "@/models";

let dailyCache = { dateKey: "", plan: null, lastGenerated: 0, lastContextHash: "", generationCount: 0 };
const MAX_DAILY_GENERATIONS = 3;
const MIN_GENERATION_INTERVAL = 2 * 60 * 60 * 1000;
const CACHE_TTL = 6 * 60 * 60 * 1000;

function todayKeyIST() { const now = new Date(); const ist = new Date(now.getTime() + 330 * 60 * 1000); return ist.toISOString().slice(0, 10); }
function tomorrowKeyIST() { const now = new Date(); const tomorrow = new Date(now.getTime() + 330 * 60 * 1000 + 24 * 60 * 60 * 1000); return { dateKey: tomorrow.toISOString().slice(0, 10), dayName: tomorrow.toLocaleDateString('en-US', { weekday: 'long' }), date: tomorrow }; }
function hashContext(context) { const relevant = { recentWorkouts: context.recentWorkouts?.slice(0, 2).map(w => ({ date: w.date, exercises: w.exercises?.length })), streakData: context.streakData?.currentStreak, lastMessages: context.lastMessages?.slice(-2).map(m => m.content?.slice(0, 50)) }; return JSON.stringify(relevant); }

function normalizeName(raw) { if (!raw) return ""; return raw.replace(/\s+/g, " ").replace(/^[-*•]\s*/, "").replace(/^\*+|\*+$/g, "").trim(); }
function titleCase(s) { return s.replace(/\b\w/g, c => c.toUpperCase()); }

function parsePlan(md, fallbackName = "Tomorrow's Workout") {
  if (!md || typeof md !== "string") return null;
  const lines = md.replace(/\r\n/g, "\n").split(/\n/).map(l => l.trim()).filter(Boolean);
  const plan = { name: fallbackName, estimatedDuration: 35, exercises: [] };

  // Title/duration
  for (const line of lines) {
    const t = line.match(/^#+\s*(.+?(?:workout|session|training|plan|routine)).*$/i); if (t) { plan.name = t[1].replace(/^Today/i, "Tomorrow").trim(); }
    const d = line.match(/(\d{1,3})\s*(?:min|minutes?)/i); if (d) { plan.estimatedDuration = Math.max(15, Math.min(120, parseInt(d[1], 10))); }
  }

  // Build merged exercise lines: merge name-only bullet with next sets×reps line
  const merged = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    const next = lines[i + 1] || "";
    const nameOnly = /^[-*•]\s*[A-Za-z][A-Za-z\s'()-]{2,}$/.test(cur) && !/(\d+\s*[×x]\s*[\dA-Za-z-]+|\d+\s*sets?)/i.test(cur);
    const setsLine = /^(\d+)\s*[×x]\s*([\dA-Za-z-]+)$/.test(next) || /^\d+\s*sets?/i.test(next);
    if (nameOnly && setsLine) {
      merged.push(`${cur} ${next}`);
      i++; // skip next since merged
    } else {
      merged.push(cur);
    }
  }

  // Extract exercises from merged lines strictly
  const seen = new Set();
  for (const line of merged) {
    // bullet enforced
    const bullet = line.match(/^[-*•]\s*(.+)$/);
    if (!bullet) continue;
    const body = bullet[1].trim();

    // Skip long descriptive bullets
    if (body.length > 80) continue;
    if (/(thanks|approach|ensure|healing|process|ready|truly|support|body|come back|stronger|pressure|tender|area)/i.test(body)) continue;

    // Formats
    let m = body.match(/^(.+?)\s+(\d+)\s*[×x]\s*([\dA-Za-z-]+)$/);
    if (!m) m = body.match(/^(.+?):\s*(\d+)\s*sets?\s*(?:of\s*)?(\d+|[\dA-Za-z-]+)/i);
    if (!m) m = body.match(/^(\d+)\s*[×x]\s*([\dA-Za-z-]+)\s+(.+)$/);

    let ex = null;
    if (m) {
      const name = normalizeName(m[1] || m[3]);
      if (name && !/^(\d+\s*[×x]\s*[\dA-Za-z-]+)$/.test(name)) {
        ex = { name: titleCase(name), sets: parseInt(m[2]), reps: m[3] || m[2] };
      }
    } else {
      const name = normalizeName(body);
      if (name && /push|pull|squat|lunge|plank|curl|press|row|dip|crunch|raise|fly|extension|bridge|twist|hold|stretch/i.test(name)) {
        ex = { name: titleCase(name), sets: 3, reps: "10-12" };
      }
    }

    if (ex && ex.name && ex.sets && ex.reps) {
      const key = ex.name.toLowerCase();
      if (!seen.has(key)) { plan.exercises.push(ex); seen.add(key); }
    }
  }

  if (!plan.exercises.length) {
    plan.exercises = [
      { name: "Push-Ups", sets: 3, reps: "10-15" },
      { name: "Bodyweight Squats", sets: 3, reps: "15-20" },
      { name: "Curl Bar Bicep Curls", sets: 3, reps: "8-12" },
      { name: "Plank", sets: 3, reps: "30-45s" },
    ];
  }

  return plan;
}

export async function GET() {
  try {
    await connectDatabase();
    const dateKey = todayKeyIST();
    const tomorrow = tomorrowKeyIST();
    const now = Date.now();

    const canUseCache = dailyCache.plan && dailyCache.dateKey === dateKey && now - dailyCache.lastGenerated < CACHE_TTL;
    if (canUseCache) {
      return NextResponse.json({ date: tomorrow.date.toISOString(), workout: dailyCache.plan, source: "cache", dayName: tomorrow.dayName });
    }

    if (dailyCache.dateKey === dateKey) {
      if (dailyCache.generationCount >= MAX_DAILY_GENERATIONS && dailyCache.plan) {
        return NextResponse.json({ date: tomorrow.date.toISOString(), workout: dailyCache.plan, source: "rate-limited", dayName: tomorrow.dayName });
      }
      if (now - dailyCache.lastGenerated < MIN_GENERATION_INTERVAL && dailyCache.plan) {
        return NextResponse.json({ date: tomorrow.date.toISOString(), workout: dailyCache.plan, source: "throttled", dayName: tomorrow.dayName });
      }
    }

    const memoryService = new MemoryService();
    const user = await User.findById("local");
    const streak = await Streak.findById("local");
    const recentWorkouts = await memoryService.getRecentWorkouts(5);
    const lastMessages = await Message.find({}).sort({ createdAt: -1 }).limit(5).lean();

    const context = {
      user,
      recentWorkouts,
      memories: [],
      lastMessages: (lastMessages || []).reverse().map(m => ({ role: m.role, content: m.content })),
      streakData: streak ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, lastWorkoutDate: streak.lastWorkoutDate } : null,
    };

    const contextHash = hashContext(context);
    const contextChanged = dailyCache.lastContextHash !== contextHash;
    if (!contextChanged && dailyCache.plan && dailyCache.dateKey === dateKey) {
      return NextResponse.json({ date: tomorrow.date.toISOString(), workout: dailyCache.plan, source: "context-stable", dayName: tomorrow.dayName });
    }

    const gemini = new GeminiService();
    const prompt = `Create tomorrow's workout plan (${tomorrow.dayName}, ${tomorrow.dateKey}).\n\nIMPORTANT: Output EXACTLY this shape with clean bullets only, no extra prose.\n\n## Tomorrow's [Focus] Workout\n**Duration:** XX min\n\n**Exercises:**\n- Name: 3×10-12\n- Name: 3×8-10\n- Name: 3×10-15\n- Name: 2×30-60s\n- Name: 3×8-12`;

    const { reply } = await gemini.generateResponse(prompt, context);
    const plan = parsePlan(reply, `${tomorrow.dayName}'s Workout`);
    if (!plan || !plan.exercises?.length) {
      return NextResponse.json({ error: "Could not parse workout plan" }, { status: 502 });
    }

    if (dailyCache.dateKey !== dateKey) dailyCache.generationCount = 0;
    dailyCache = { dateKey, plan, lastGenerated: now, lastContextHash: contextHash, generationCount: dailyCache.generationCount + 1 };

    return NextResponse.json({ date: tomorrow.date.toISOString(), workout: plan, source: "ai-generated", dayName: tomorrow.dayName, generationCount: dailyCache.generationCount });
  } catch (error) {
    if (dailyCache.plan) {
      const tomorrow = tomorrowKeyIST();
      return NextResponse.json({ date: tomorrow.date.toISOString(), workout: dailyCache.plan, source: "error-fallback", dayName: tomorrow.dayName });
    }
    return NextResponse.json({ error: "Failed to generate workout plan" }, { status: 500 });
  }
}

export async function POST() { dailyCache = { dateKey: "", plan: null, lastGenerated: 0, lastContextHash: "", generationCount: 0 }; return GET(); }

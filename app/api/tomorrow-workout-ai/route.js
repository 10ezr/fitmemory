import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import MemoryService from "@/services/memoryService";
import GeminiService from "@/services/geminiService";
import { User, Streak, Message } from "@/models";

// Enhanced daily cache with more granular control
let dailyCache = { 
  dateKey: "", 
  plan: null, 
  lastGenerated: 0,
  lastContextHash: "",
  generationCount: 0
};

// Rate limiting: max 3 generations per day, with smart context-based refresh
const MAX_DAILY_GENERATIONS = 3;
const MIN_GENERATION_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function todayKeyIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function tomorrowKeyIST() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 330 * 60 * 1000 + 24 * 60 * 60 * 1000);
  return {
    dateKey: tomorrow.toISOString().slice(0, 10),
    dayName: tomorrow.toLocaleDateString('en-US', { weekday: 'long' }),
    date: tomorrow
  };
}

function hashContext(context) {
  // Create a hash of relevant context to detect meaningful changes
  const relevant = {
    recentWorkouts: context.recentWorkouts?.slice(0, 2).map(w => ({ date: w.date, exercises: w.exercises?.length })),
    streakData: context.streakData?.currentStreak,
    lastMessages: context.lastMessages?.slice(-2).map(m => m.content?.slice(0, 50))
  };
  return JSON.stringify(relevant);
}

// Enhanced parsing with multiple strategies and better error handling
function parsePlan(md, fallbackName = "Tomorrow's Workout") {
  if (!md || typeof md !== "string") {
    console.log("[Parser] No markdown content to parse");
    return null;
  }

  console.log("[Parser] Attempting to parse:", md.slice(0, 200) + "...");
  
  const lines = md.replace(/\r\n/g, "\n").split(/\n/).map(l => l.trim()).filter(l => l);
  const plan = {
    name: fallbackName,
    estimatedDuration: 35,
    exercises: []
  };

  let currentSection = "";
  let foundExercises = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Strategy 1: Look for workout title
    const titleMatch = line.match(/^#+\s*(.+?(?:workout|session|training|plan|routine)).*$/i);
    if (titleMatch) {
      plan.name = titleMatch[1].replace(/^Today/i, "Tomorrow").replace(/^today/i, "tomorrow").trim();
      continue;
    }

    // Strategy 2: Look for duration
    const durationMatch = line.match(/(\d{1,3})\s*(?:min|minutes?)/i);
    if (durationMatch) {
      plan.estimatedDuration = Math.max(15, Math.min(120, parseInt(durationMatch[1], 10)));
      continue;
    }

    // Strategy 3: Detect section headers
    if (line.match(/^\*\*\s*(main|exercises?|workout|training)\s*.*\*\*:?/i)) {
      currentSection = "exercises";
      continue;
    }
    if (line.match(/^\*\*\s*(warm.?up|cool.?down|notes?)\s*.*\*\*:?/i)) {
      currentSection = "other";
      continue;
    }

    // Strategy 4: Parse exercises - Multiple patterns
    if (currentSection === "exercises" || !foundExercises) {
      const exercise = parseExerciseLine(line);
      if (exercise) {
        plan.exercises.push(exercise);
        foundExercises = true;
        continue;
      }
    }

    // Strategy 5: Fallback - any line with exercise pattern
    if (!foundExercises) {
      const exercise = parseExerciseLine(line);
      if (exercise) {
        plan.exercises.push(exercise);
        foundExercises = true;
      }
    }
  }

  // Strategy 6: If no exercises found, try parsing the entire text as one block
  if (plan.exercises.length === 0) {
    console.log("[Parser] No exercises found, trying block parsing...");
    const blockExercises = parseExerciseBlock(md);
    plan.exercises = blockExercises;
  }

  // Strategy 7: Last resort - create a simple bodyweight routine if nothing works
  if (plan.exercises.length === 0) {
    console.log("[Parser] Creating fallback routine");
    plan.exercises = [
      { name: "Push-ups", sets: 3, reps: "10-15" },
      { name: "Bodyweight Squats", sets: 3, reps: "15-20" },
      { name: "Plank", sets: 3, reps: "30-60s" },
      { name: "Curl Bar Bicep Curls", sets: 3, reps: "10-12" }
    ];
    plan.name = "Tomorrow's Recovery Workout";
  }

  console.log(`[Parser] Successfully parsed ${plan.exercises.length} exercises:`, 
    plan.exercises.map(e => `${e.name} ${e.sets}×${e.reps}`).join(", "));

  return plan;
}

function parseExerciseLine(line) {
  // Pattern 1: "- Push-ups 3×10" or "* Push-ups 3x10"
  let match = line.match(/^[\-\*]\s*(.+?)\s+(\d+)\s*[×x]\s*([\dA-Za-z\-]+)(?:\s|$)/i);
  if (match) {
    return {
      name: match[1].trim(),
      sets: parseInt(match[2]),
      reps: match[3]
    };
  }

  // Pattern 2: "- Push-ups: 3 sets of 10"
  match = line.match(/^[\-\*]\s*(.+?):\s*(\d+)\s*sets?\s*(?:of\s*)?(\d+|[\dA-Za-z\-]+)/i);
  if (match) {
    return {
      name: match[1].trim(),
      sets: parseInt(match[2]),
      reps: match[3]
    };
  }

  // Pattern 3: "3×10 Push-ups" (sets first)
  match = line.match(/^[\-\*]?\s*(\d+)\s*[×x]\s*([\dA-Za-z\-]+)\s+(.+)$/i);
  if (match) {
    return {
      name: match[3].trim(),
      sets: parseInt(match[1]),
      reps: match[2]
    };
  }

  // Pattern 4: Just exercise name with bullet
  match = line.match(/^[\-\*]\s*([A-Za-z][A-Za-z\s\-']+)\s*$/i);
  if (match && match[1].length > 3) {
    return {
      name: match[1].trim(),
      sets: 3,
      reps: "10-12"
    };
  }

  return null;
}

function parseExerciseBlock(text) {
  const exercises = [];
  const exerciseNames = [
    'push.?ups?', 'squats?', 'lunges?', 'plank', 'burpees?', 'jumping jacks?',
    'curl', 'press', 'row', 'pull.?ups?', 'chin.?ups?', 'dips?', 'crunches?',
    'deadlifts?', 'overhead', 'lateral', 'tricep', 'bicep', 'shoulder'
  ];

  for (const pattern of exerciseNames) {
    const regex = new RegExp(`([^\n]*${pattern}[^\n]*)`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const line = match[1].trim();
      if (line.length > 3) {
        const setsMatch = line.match(/(\d+)\s*[×x]\s*([\dA-Za-z\-]+)/);
        exercises.push({
          name: line.replace(/\d+\s*[×x]\s*[\dA-Za-z\-]+/g, '').replace(/[\-\*]/, '').trim(),
          sets: setsMatch ? parseInt(setsMatch[1]) : 3,
          reps: setsMatch ? setsMatch[2] : "10-12"
        });
        break; // Only take first match per exercise type
      }
    }
  }

  return exercises.slice(0, 6); // Limit to 6 exercises
}

export async function GET() {
  try {
    await connectDatabase();

    const dateKey = todayKeyIST();
    const tomorrow = tomorrowKeyIST();
    const now = Date.now();

    // Check if we can use cache
    const canUseCache = dailyCache.plan && 
      dailyCache.dateKey === dateKey &&
      (now - dailyCache.lastGenerated) < CACHE_TTL;

    if (canUseCache) {
      console.log("[TomorrowAI] Using cached plan");
      return NextResponse.json({
        date: tomorrow.date.toISOString(),
        workout: dailyCache.plan,
        source: "cache",
        dayName: tomorrow.dayName
      });
    }

    // Rate limiting check
    if (dailyCache.dateKey === dateKey) {
      if (dailyCache.generationCount >= MAX_DAILY_GENERATIONS) {
        console.log("[TomorrowAI] Daily generation limit reached");
        if (dailyCache.plan) {
          return NextResponse.json({
            date: tomorrow.date.toISOString(),
            workout: dailyCache.plan,
            source: "rate-limited",
            dayName: tomorrow.dayName
          });
        }
      }

      if ((now - dailyCache.lastGenerated) < MIN_GENERATION_INTERVAL) {
        console.log("[TomorrowAI] Generation interval not met");
        if (dailyCache.plan) {
          return NextResponse.json({
            date: tomorrow.date.toISOString(),
            workout: dailyCache.plan,
            source: "throttled",
            dayName: tomorrow.dayName
          });
        }
      }
    }

    // Gather context
    const memoryService = new MemoryService();
    const user = await User.findById("local");
    const streak = await Streak.findById("local");
    const recentWorkouts = await memoryService.getRecentWorkouts(5);
    const lastMessages = await Message.find({}).sort({ createdAt: -1 }).limit(5).lean();

    const context = {
      user,
      recentWorkouts,
      memories: [],
      lastMessages: (lastMessages || []).reverse().map(m => ({ 
        role: m.role, 
        content: m.content 
      })),
      streakData: streak ? {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastWorkoutDate: streak.lastWorkoutDate
      } : null,
    };

    // Check if context has changed meaningfully
    const contextHash = hashContext(context);
    const contextChanged = dailyCache.lastContextHash !== contextHash;

    if (!contextChanged && dailyCache.plan && dailyCache.dateKey === dateKey) {
      console.log("[TomorrowAI] Context unchanged, using existing plan");
      return NextResponse.json({
        date: tomorrow.date.toISOString(),
        workout: dailyCache.plan,
        source: "context-stable",
        dayName: tomorrow.dayName
      });
    }

    // Generate new plan with enhanced prompt
    const gemini = new GeminiService();
    
    // Enhanced prompt with clear structure and context awareness
    const prompt = `Create tomorrow's workout plan (${tomorrow.dayName}, ${tomorrow.dateKey}). 

Based on my recent training and available equipment (curl bar max 25kg, bodyweight exercises), design a focused session.

Format as follows:
## Tomorrow's [Focus] Workout
**Duration:** XX min
**Main Exercises:**
- Exercise 1: 3×10-12
- Exercise 2: 3×8-10  
- Exercise 3: 3×10-15
- Exercise 4: 2×30-60s
- Exercise 5: 3×8-12

Consider my recent workouts to ensure good progression and recovery. Keep it practical for home training.`;

    console.log("[TomorrowAI] Generating new plan with context:", {
      recentWorkouts: recentWorkouts?.length || 0,
      streakDays: context.streakData?.currentStreak || 0,
      tomorrow: tomorrow.dayName
    });

    const { reply } = await gemini.generateResponse(prompt, context);
    
    if (!reply) {
      throw new Error("No response from Gemini");
    }

    console.log("[TomorrowAI] Raw Gemini response:", reply.slice(0, 300) + "...");

    const plan = parsePlan(reply, `${tomorrow.dayName}'s Workout`);
    
    if (!plan || plan.exercises.length === 0) {
      console.error("[TomorrowAI] Failed to parse plan from response:", reply);
      return NextResponse.json({ 
        error: "Could not parse workout plan", 
        debug: {
          responseLength: reply?.length || 0,
          responsePreview: reply?.slice(0, 200) || "No response"
        }
      }, { status: 502 });
    }

    // Update cache
    if (dailyCache.dateKey !== dateKey) {
      dailyCache.generationCount = 0;
    }
    dailyCache = {
      dateKey,
      plan,
      lastGenerated: now,
      lastContextHash: contextHash,
      generationCount: dailyCache.generationCount + 1
    };

    console.log(`[TomorrowAI] Generated new plan: ${plan.name} with ${plan.exercises.length} exercises`);

    return NextResponse.json({
      date: tomorrow.date.toISOString(),
      workout: plan,
      source: "ai-generated",
      dayName: tomorrow.dayName,
      generationCount: dailyCache.generationCount
    });

  } catch (error) {
    console.error("[TomorrowAI] Error:", error);
    
    // Fallback to cached plan if available
    if (dailyCache.plan) {
      const tomorrow = tomorrowKeyIST();
      return NextResponse.json({
        date: tomorrow.date.toISOString(),
        workout: dailyCache.plan,
        source: "error-fallback",
        dayName: tomorrow.dayName
      });
    }

    return NextResponse.json({ 
      error: "Failed to generate workout plan",
      details: error.message
    }, { status: 500 });
  }
}

// Add a POST endpoint to force refresh (for manual updates)
export async function POST() {
  try {
    console.log("[TomorrowAI] Manual refresh requested");
    
    // Clear cache to force regeneration
    dailyCache = {
      dateKey: "",
      plan: null,
      lastGenerated: 0,
      lastContextHash: "",
      generationCount: 0
    };

    // Redirect to GET
    const response = await GET();
    return response;
  } catch (error) {
    console.error("[TomorrowAI] Manual refresh error:", error);
    return NextResponse.json({ 
      error: "Failed to refresh workout plan" 
    }, { status: 500 });
  }
}
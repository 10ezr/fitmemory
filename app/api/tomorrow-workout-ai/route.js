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

// Clean and enhanced parsing with strict filtering
function parsePlan(md, fallbackName = "Tomorrow's Workout") {
  if (!md || typeof md !== "string") {
    console.log("[Parser] No markdown content to parse");
    return null;
  }

  console.log("[Parser] Raw response:", md.slice(0, 300) + "...");
  
  const lines = md.replace(/\r\n/g, "\n").split(/\n/).map(l => l.trim()).filter(l => l);
  const plan = {
    name: fallbackName,
    estimatedDuration: 35,
    exercises: []
  };

  let foundTitle = false;
  let foundDuration = false;
  
  // First pass: Extract title and duration
  for (const line of lines) {
    // Look for workout title
    if (!foundTitle) {
      const titleMatch = line.match(/^#+\s*(.+?(?:workout|session|training|plan|routine)).*$/i);
      if (titleMatch) {
        plan.name = titleMatch[1].replace(/^Today/i, "Tomorrow").replace(/^today/i, "tomorrow").trim();
        foundTitle = true;
        continue;
      }
    }

    // Look for duration
    if (!foundDuration) {
      const durationMatch = line.match(/(\d{1,3})\s*(?:min|minutes?)/i);
      if (durationMatch) {
        plan.estimatedDuration = Math.max(15, Math.min(120, parseInt(durationMatch[1], 10)));
        foundDuration = true;
        continue;
      }
    }
  }

  // Second pass: Extract exercises with strict filtering
  const exercises = [];
  let inExerciseSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect exercise section start
    if (line.match(/^\*\*\s*(main|exercises?|workout|training)\s*.*\*\*:?/i)) {
      inExerciseSection = true;
      continue;
    }
    
    // Skip non-exercise sections
    if (line.match(/^\*\*\s*(warm.?up|cool.?down|notes?|foam rolling|gentle|stretching)\s*.*\*\*:?/i)) {
      inExerciseSection = false;
      continue;
    }

    // Parse exercise lines only in exercise sections or if they clearly look like exercises
    if (inExerciseSection || !exercises.length) {
      const exercise = parseExerciseLineStrict(line);
      if (exercise) {
        exercises.push(exercise);
      }
    }
  }

  // If no exercises found with strict parsing, try more lenient approach
  if (exercises.length === 0) {
    console.log("[Parser] No exercises found with strict parsing, trying lenient approach");
    for (const line of lines) {
      const exercise = parseExerciseLineLenient(line);
      if (exercise && isValidExercise(exercise.name)) {
        exercises.push(exercise);
      }
    }
  }

  // Final fallback - use default exercises
  if (exercises.length === 0) {
    console.log("[Parser] Creating fallback routine");
    exercises.push(
      { name: "Push-ups", sets: 3, reps: "10-15" },
      { name: "Bodyweight Squats", sets: 3, reps: "15-20" },
      { name: "Curl Bar Bicep Curls", sets: 3, reps: "10-12" },
      { name: "Plank", sets: 3, reps: "30-45s" }
    );
    plan.name = "Tomorrow's Recovery Workout";
  } else {
    plan.exercises = exercises.slice(0, 6); // Limit to 6 exercises
  }

  console.log(`[Parser] Successfully parsed ${plan.exercises.length} exercises:`, 
    plan.exercises.map(e => `${e.name} ${e.sets}×${e.reps}`).join(", "));

  return plan;
}

function parseExerciseLineStrict(line) {
  // Only parse lines that start with bullet points or dashes
  if (!line.match(/^[-*•]\s/)) {
    return null;
  }

  // Remove bullet point
  const cleanLine = line.replace(/^[-*•]\s*/, '').trim();
  
  // Skip if line is too long (likely description text)
  if (cleanLine.length > 50) {
    return null;
  }

  // Skip lines with certain words that indicate it's not an exercise
  const skipWords = ['thanks', 'approach', 'ensures', 'healing', 'process', 'come back', 'stronger', 'truly ready', 'if you', 'use light', 'moderate pressure'];
  if (skipWords.some(word => cleanLine.toLowerCase().includes(word))) {
    return null;
  }

  return parseExerciseFormat(cleanLine);
}

function parseExerciseLineLenient(line) {
  // More permissive parsing for lines that might be exercises
  const cleanLine = line.replace(/^[-*•]\s*/, '').replace(/^\*\*|\*\*$/g, '').trim();
  
  // Skip very long lines
  if (cleanLine.length > 60) {
    return null;
  }

  return parseExerciseFormat(cleanLine);
}

function parseExerciseFormat(text) {
  // Pattern 1: "Push-ups 3×10" or "Push-ups 3x10"
  let match = text.match(/^(.+?)\s+(\d+)\s*[×x]\s*([\dA-Za-z\-]+)$/i);
  if (match) {
    return {
      name: match[1].trim(),
      sets: parseInt(match[2]),
      reps: match[3]
    };
  }

  // Pattern 2: "Push-ups: 3 sets of 10"
  match = text.match(/^(.+?):\s*(\d+)\s*sets?\s*(?:of\s*)?(\d+|[\dA-Za-z\-]+)/i);
  if (match) {
    return {
      name: match[1].trim(),
      sets: parseInt(match[2]),
      reps: match[3]
    };
  }

  // Pattern 3: "3×10 Push-ups" (sets first)
  match = text.match(/^(\d+)\s*[×x]\s*([\dA-Za-z\-]+)\s+(.+)$/i);
  if (match) {
    return {
      name: match[3].trim(),
      sets: parseInt(match[1]),
      reps: match[2]
    };
  }

  // Pattern 4: Just exercise name (add default sets/reps)
  if (isValidExercise(text)) {
    return {
      name: text.trim(),
      sets: 3,
      reps: "10-12"
    };
  }

  return null;
}

function isValidExercise(name) {
  if (!name || name.length < 3 || name.length > 30) {
    return false;
  }

  // Must contain at least one exercise-related word
  const exerciseWords = [
    'push', 'pull', 'squat', 'lunge', 'plank', 'curl', 'press', 'row', 'dip',
    'crunch', 'deadlift', 'burpee', 'jump', 'stretch', 'hold', 'raise', 'fly',
    'extension', 'flexion', 'rotation', 'bridge', 'twist', 'climb', 'step'
  ];
  
  const hasExerciseWord = exerciseWords.some(word => 
    name.toLowerCase().includes(word)
  );

  // Skip if it contains non-exercise words
  const skipWords = [
    'thanks', 'approach', 'ensure', 'process', 'ready', 'truly', 'healing',
    'support', 'body', 'come back', 'stronger', 'session', 'friday', 'saturday',
    'sunday', 'needed', 'pressure', 'focusing', 'groups', 'muscle', 'tender',
    'spot', 'ease', 'area', 'reaching', 'plan', 'minutes', 'use light'
  ];
  
  const hasSkipWord = skipWords.some(word => 
    name.toLowerCase().includes(word)
  );

  return hasExerciseWord && !hasSkipWord;
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

    // Generate new plan with enhanced prompt for cleaner output
    const gemini = new GeminiService();
    
    const prompt = `Create tomorrow's workout plan (${tomorrow.dayName}, ${tomorrow.dateKey}).

IMPORTANT: Format EXACTLY as shown below with clean bullet points only:

## Tomorrow's [Focus] Workout
**Duration:** XX min

**Exercises:**
- Push-ups: 3×10-12
- Squats: 3×15-20
- Curl Bar Bicep Curls: 3×8-10
- Plank: 3×30-45s
- Lunges: 2×10 each leg

Equipment: Curl bar (max 25kg), bodyweight exercises only.
Keep it simple and focused for home training. NO explanatory text, just clean exercise list.`;

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
      console.error("[TomorrowAI] Failed to parse plan from response");
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
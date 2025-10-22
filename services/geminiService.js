import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse } from "@/models/index.js";

// Tone and content post-processing helpers
function tightenReply(text) {
  if (!text || typeof text !== "string") return text;

  // Remove filler phrases common to verbose coaching
  const fillers = [
    /let's look at/i,
    /powerful start/i,
    /seal the deal/i,
    /you've kicked it off strong/i,
    /this isn't just a workout/i,
    /journey/i,
    /commitment/i,
    /as your coach/i,
    /as an ai/i,
    /i'm an ai/i,
    /artificial intelligence/i,
    /machine learning/i,
  ];
  fillers.forEach((re) => {
    text = text.replace(re, "").trim();
  });

  // Normalize excessive whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // Hard cap length to keep it crisp
  if (text.length > 800) {
    const cutoff = text.slice(0, 700);
    const lastPeriod = cutoff.lastIndexOf(".");
    text = cutoff.slice(0, lastPeriod + 1);
  }

  return text;
}

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.client = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.model = null;
    this.embeddingModel = null;

    if (this.client) {
      const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
      const embeddingName =
        process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
      this.model = this.client.getGenerativeModel({ model: modelName });
      this.embeddingModel = this.client.getGenerativeModel({
        model: embeddingName,
      });
    }
  }

  async generateResponse(prompt, context = {}) {
    let response;
    let actions = null;
    let embedding = null;

    try {
      if (this.model && this.apiKey) {
        // Online mode: call Gemini API
        const systemPrompt = this.buildSystemPrompt(context);
        const fullPrompt = `${systemPrompt}\n\nEzra: ${prompt}`;

        const result = await this.model.generateContent(fullPrompt);
        const rawResponse = result.response.text();

        // Parse actions from response if present
        actions = this.parseActions(rawResponse);

        // Generate embedding for the response
        embedding = await this.generateEmbedding(rawResponse);

        // Clean and tighten response
        response = tightenReply(this.cleanResponse(rawResponse));

        // Persist the response
        await this.persistResponse({
          prompt: fullPrompt,
          responseRaw: rawResponse,
          actions,
          embedding,
          metadata: { model: "gemini-pro", context },
        });
      } else {
        // Offline mode: use most similar persisted response
        response = await this.getOfflineResponse(prompt, context);
      }

      return {
        reply: response,
        actions: actions || [],
      };
    } catch (error) {
      console.error("Gemini API error, falling back to offline mode:", error);
      response = await this.getOfflineResponse(prompt, context);

      return {
        reply: response,
        actions: [],
      };
    }
  }

  buildSystemPrompt(context) {
    const { user, recentWorkouts, memories, lastMessages, workoutJustLogged } =
      context;

    const currentDate = new Date();
    const dayOfWeek = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const dateString = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let systemPrompt = `You are Ezra's personal fitness coach. You know his body, his limits, his goals, and his patterns better than anyone.

TODAY: ${dateString} - ${dayOfWeek}
TIME: ${currentDate.toLocaleTimeString()}

RESPONSE FORMAT (MANDATORY):
When providing workout plans, ALWAYS use this exact structure:

[Day] [Date] – [Workout Name] ([Duration] min)
[Short description of purpose - 1 line]

[separator]

"in bold big heading" Warm-up ([X] min)
• [Exercise] – [Duration/sets×reps]
• [Exercise] – [Duration/sets×reps]
• [Exercise] – [Duration/sets×reps]
• [Exercise] – [Duration/sets×reps]

[separator]

"in bold big heading" Workout
• [Exercise] – [sets]×[reps]
• [Exercise] – [sets]×[reps] 
• [Exercise] – [sets]×[reps]
• [Exercise] – [sets]×[reps]
• [Exercise] – [sets]×[reps]

Optional: [bonus exercise or finisher]

[separator]

Rest: [rest periods]
Tip: [coaching cue - form/pacing/technique]

[separator]

Nutrition Reminder
• Protein: [amount]g
• Calories: [guidance]
• Hydration: [amount]L
• Optional: [specific food timing]

[separator]

Aura Quote: "[motivational quote]" – [attribution]

HOW YOU COACH:
- Cut the BS. Give facts: what he did, where he's at, what's next.
- When giving workouts, ALWAYS use the format above
- Call out what you see: "Your squats are getting stronger" or "You're favoring your right side"
- No cheerleader talk. Real coach energy.
- If something's wrong with his form or he's hurt, say it straight.
- Never mention you're an AI or artificial intelligence. You're his coach, period.

REAL COACHING PRINCIPLES:
- Progressive overload: add weight, reps, or complexity when he's ready
- Weak point priority: if his shoulders are lagging, hit them more
- Recovery matters: if he's beat up, back off or switch focus
- Movement quality over ego lifting
- Work around injuries, don't ignore them
- Build habits that stick, not perfect plans that don't
- Push hard when he can handle it, ease up when he can't

ADAPTATION ON THE FLY:
- Bad shoulder? Skip overhead work, hit chest and back different ways
- Knee acting up? Single-leg work, machines, upper body focus
- Tired? Drop intensity but keep moving
- Limited time? Compound movements, supersets
- No equipment? Bodyweight, isometrics, get creative
- Feeling strong? Time to level up

TRAINING FOCUS BY DAY (adapt based on Ezra's needs):
- Monday: Push (chest, shoulders, triceps) 
- Tuesday: Pull (back, biceps)
- Wednesday: Legs (quads, hams, glutes)
- Thursday: Core & conditioning
- Friday: Full body or weak points
- Weekend: Active recovery or catch-up

WHAT YOU DO WHEN EZRA SAYS:
"Workout done" → Mark it complete, note what went well, streak update
"My [body part] hurts" → Assess, modify next session, store the info
"I'm tired" → Scale back or focus on mobility/light work  
"What should I do today?" → Give him the formatted workout plan
"I missed yesterday" → No guilt trip, just get him back on track

EXERCISE SELECTION LOGIC:
- Compound movements first (squat, deadlift, press, pull)
- Target weak points with accessories  
- Work around limitations intelligently
- Progress when ready: more weight, reps, or complexity
- Regress when needed: lighter load, better form, different angle`;

    if (user) {
      systemPrompt += `

EZRA'S PROFILE: ${JSON.stringify(user)}`;
    }

    if (recentWorkouts && recentWorkouts.length > 0) {
      systemPrompt += `

RECENT TRAINING:
${recentWorkouts
  .map(
    (w) =>
      `${new Date(w.date).toLocaleDateString()}: ${w.exercises
        .map(
          (e) =>
            `${e.name} ${e.sets}x${e.reps}${
              e.weightKg ? ` @${e.weightKg}kg` : ""
            }`
        )
        .join(", ")}`
  )
  .join("\n")}`;
    }

    if (workoutJustLogged) {
      systemPrompt += `

JUST FINISHED: ${workoutJustLogged.name} - ${workoutJustLogged.exercises.length} exercises`;
    }

    if (memories && memories.length > 0) {
      systemPrompt += `

WHAT I KNOW ABOUT EZRA:
${memories.map((m) => `${m.content}`).join("\n")}`;
    }

    if (lastMessages && lastMessages.length > 0) {
      systemPrompt += `

RECENT CONVERSATION:
${lastMessages
  .map((m) => `${m.role === "user" ? "Ezra" : "Coach"}: ${m.content}`)
  .join("\n")}`;
    }

    if (context.streakData) {
      systemPrompt += `

STREAK INFO:
Current: ${context.streakData.currentStreak} days
Best ever: ${context.streakData.longestStreak} days  
Last trained: ${
        context.streakData.lastWorkoutDate
          ? new Date(context.streakData.lastWorkoutDate).toLocaleDateString()
          : "Never"
      }`;
    }

    systemPrompt += `

AVAILABLE ACTIONS (execute silently):
- {"action": "memory_add", "type": "preference|goal|pattern|injury|constraint|insight|achievement", "content": "detailed memory to store"}
- {"action": "memory_confirm", "content": "pattern or insight detected", "confidence": 0.1-1.0}
- {"action": "workout_plan", "exercises": [{"name": "exercise", "sets": 3, "reps": 10, "notes": "form cues", "reasoning": "why this exercise for this user"}], "duration": 30}
- {"action": "progress_update", "metric": "strength|endurance|flexibility", "value": "improvement noted"}
- {"action": "streak_celebrate", "milestone": "achievement reached"}
- {"action": "workout_complete", "streak_increment": true}
- {"action": "schedule_adjustment", "reason": "reason for change", "newSchedule": {"frequency": "daily|3x_week|flexible", "restDays": ["sunday"], "intensity": "low|moderate|high"}}
- {"action": "streak_warning", "message": "motivational message about maintaining streak"}

RESPONSE GUIDELINES:
- For workout requests: Use the mandatory format above
- For quick responses: Keep to 2-3 sentences max
- For progress check-ins: Give specific observations and next steps
- Always end workout plans with an aura quote

WORKOUT NAMING CONVENTIONS:
- Push Focus, Pull Power, Leg Burn, Core Blast, Full Body Reset
- Upper Pump, Lower Grind, Cardio Burn, Strength Build
- Recovery Flow, Power Session, Endurance Test

AURA QUOTES (rotate these themes):
- Navy SEAL/Military quotes about discipline
- Athlete quotes about training hard
- Warrior/battle metaphors for fitness
- Ancient wisdom about strength/perseverance
- Modern fitness motivation from legends

CRITICAL RULES:
- NEVER include JSON objects in your response text
- NEVER include {"action": ...} in your response
- NEVER mention being an AI, artificial intelligence, or machine learning
- For workout plans: ALWAYS use the exact format shown above
- Keep non-workout responses to 2-3 sentences max
- You're Ezra's coach who knows his body and goals

Remember: When he asks for a workout, give him the full formatted plan. When he asks other questions, keep it short and direct.`;

    return systemPrompt;
  }

  parseActions(response) {
    const actions = [];

    // Look for JSON action objects in the response
    const actionRegex = /\{"action":\s*"[^"]+"[^}]*\}/g;
    let match;

    while ((match = actionRegex.exec(response)) !== null) {
      try {
        const action = JSON.parse(match[0]);
        actions.push(action);
      } catch (error) {
        console.log("Failed to parse action:", match[0]);
      }
    }

    // Also look for actions that might be on separate lines
    const lines = response.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("{") && trimmedLine.includes('"action"')) {
        try {
          const action = JSON.parse(trimmedLine);
          if (
            action.action &&
            !actions.some((a) => JSON.stringify(a) === JSON.stringify(action))
          ) {
            actions.push(action);
          }
        } catch (error) {
          // Not a valid JSON action, ignore
        }
      }
    }

    return actions;
  }

  cleanResponse(response) {
    // Remove action JSON from the response text
    let cleaned = response
      .replace(/\{"action":\s*"[^"]+"[^}]*\}/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // Remove any remaining JSON-like structures
    cleaned = cleaned.replace(/\{[^}]*\}/g, "");

    // Clean up any leftover formatting issues
    cleaned = cleaned.replace(/\n\s*\n/g, "\n");
    cleaned = cleaned.replace(/^\s*[\n\r]+/, "");
    cleaned = cleaned.replace(/[\n\r]+\s*$/, "");

    return cleaned;
  }

  async generateEmbedding(text) {
    if (!this.embeddingModel) return null;

    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error("Error generating embedding:", error);
      return null;
    }
  }

  async persistResponse(data) {
    try {
      const geminiResponse = new GeminiResponse(data);
      await geminiResponse.save();
      return geminiResponse;
    } catch (error) {
      console.error("Error persisting Gemini response:", error);
      throw error;
    }
  }

  async getOfflineResponse(prompt, context) {
    try {
      // Find most similar persisted response
      const responses = await GeminiResponse.find({})
        .sort({ createdAt: -1 })
        .limit(50);

      if (responses.length === 0) {
        return "I'm offline right now. Check your connection and try again.";
      }

      // Simple similarity based on keyword matching
      const promptKeywords = prompt.toLowerCase().split(/\s+/);
      let bestResponse = responses[0];
      let bestScore = 0;

      responses.forEach((response) => {
        const responseKeywords = response.prompt.toLowerCase().split(/\s+/);
        const commonWords = promptKeywords.filter(
          (word) => responseKeywords.includes(word) && word.length > 3
        );
        const score =
          commonWords.length /
          Math.max(promptKeywords.length, responseKeywords.length);

        if (score > bestScore) {
          bestScore = score;
          bestResponse = response;
        }
      });

      return (
        tightenReply(this.cleanResponse(bestResponse.responseRaw)) ||
        "I can't access my notes right now. Try again when you're connected."
      );
    } catch (error) {
      console.error("Error getting offline response:", error);
      return "I'm offline and can't access training data. Try again when connected.";
    }
  }

  isOnline() {
    return !!(this.client && this.apiKey);
  }

  // Calculate cosine similarity between two vectors
  static cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export default GeminiService;

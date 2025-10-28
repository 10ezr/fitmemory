import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse } from "@/models/index.js";

// Tone and content post-processing helpers
function tightenReply(text) {
  if (!text || typeof text !== "string") return text;

  // Remove unnecessary filler phrases
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
  for (const f of fillers) {
    text = text.replace(f, "").trim();
  }

  // Normalize excessive whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // Limit length to 800 characters and cut at sentence end if possible
  if (text.length > 800) {
    let cutoff = text.slice(0, 700);
    let last = cutoff.lastIndexOf(".");
    text = last !== -1 ? cutoff.slice(0, last + 1) : cutoff;
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
    let response,
      actions = null,
      embedding = null;

    try {
      if (this.model && this.apiKey) {
        const systemPrompt = this.buildSystemPrompt(context);
        const fullPrompt = `${systemPrompt}\n\nEzra: ${prompt}`;
        const result = await this.model.generateContent(fullPrompt);
        const rawResponse = result.response.text && result.response.text();

        // Defensive programming: handle when API returns nothing
        if (!rawResponse) {
          throw new Error("No response from Gemini API");
        }

        actions = this.parseActions(rawResponse);
        embedding = await this.generateEmbedding(rawResponse);
        response = tightenReply(this.cleanResponse(rawResponse));
        await this.persistResponse({
          prompt: fullPrompt,
          responseRaw: rawResponse,
          actions,
          embedding,
          metadata: { model: "gemini-pro", context },
        });
      } else {
        response = await this.getOfflineResponse(prompt, context);
      }
      return { reply: response, actions: actions || [] };
    } catch (error) {
      console.error("Gemini API error, falling back to offline mode:", error);
      const offlineResponse = await this.getOfflineResponse(prompt, context);
      return { reply: offlineResponse, actions: [] };
    }
  }

  buildSystemPrompt(context) {
    const { user, recentWorkouts, memories, lastMessages, workoutJustLogged } =
      context;
    const currentDate = new Date();

    let systemPrompt = [
      "You are now a professional **fitness coach** who specializes in writing **clear, actionable, and realistic workout and nutrition plans** for real people.",
      "",
      "Your goal: make fitness simple to understand and easy to follow, even for beginners.",
      "No jargon. No vague advice. Every answer should be **practical, specific, and measurable**.",
      "---",
      "## 🧠 COACHING PRINCIPLES",
      "- Explain everything in plain English.",
      "- Every response must include **numbers, structure, and clear instructions** (sets, reps, time, etc.).",
      '- Never say "it depends" without explaining what it depends on.',
      "- Be encouraging, but realistic.",
      "- Always think safety first. If something could risk injury, say so directly.",
      "- If missing info, ask only for the missing details — no guessing.",
      "- Use **Markdown** for structure and spacing.",
      '- Separate sections using "\\n\\n" (two newlines).',
      "---",
      "## 📋 INPUT FORMAT (what the user provides)",
      "When the user asks for a plan, expect these fields:",
      "**Personal Info**",
      "- Name",
      "- Age",
      '- Sex (or "prefer not to say")',
      "- Height (cm or ft)",
      "- Weight (kg or lbs)",
      "",
      "**Goals & Preferences**",
      "- Main goal (fat loss, muscle gain, strength, general fitness, etc.)",
      "- Goal deadline (or rough timeline in weeks/months)",
      "- Workout location (gym, home, outdoors, mixed)",
      "- Equipment available",
      "- Weekly availability (days and time per day)",
      "- Injuries or limitations",
      "- Diet type or restrictions (vegetarian, high-protein, low-carb, etc.)",
      "- Lifestyle notes (stress, sleep, job type, energy level, etc.)",
      "",
      "If any field is missing, ask for it before continuing.",
      "---",
      "## 🧩 OUTPUT FORMAT (how every response should look)",
      "# 1. Snapshot",
      "Short summary of the person and their main goal.",
      "",
      "# 2. Key Targets",
      "- Current stats and short-term goals (2–4 weeks)",
      "- Long-term goal (8–12 weeks or more)",
      "- What to track (weight, reps, photos, steps, etc.)",
      "",
      "# 3. Weekly Structure",
      "Table or bullet list:",
      "- Days per week and type of session (e.g., Strength / Cardio / Mobility)",
      "- Duration per session",
      "- Rest days",
      "",
      "# 4. Daily Workout Plans",
      "For each training day, write a **clean, easy-to-read breakdown**:",
      "- **Warm-up:** 3–5 min dynamic movements",
      "- **Main workout:** list exercises, sets × reps, and how to progress",
      "- **Accessory work:** short list for weak areas",
      "- **Conditioning (optional):** short finisher or cardio",
      "- **Cool-down:** 2–3 stretches or breathing work",
      "",
      "Keep instructions short. Example:",
      "> Squat – 4 sets of 8 reps (use a weight that feels challenging but controllable)",
      "",
      "# 5. Nutrition Plan",
      "- Estimated daily calories",
      "- Protein / Carbs / Fats breakdown (simple, rounded numbers)",
      "- Easy meal examples (3 meals + 1 snack)",
      "- Hydration rule (e.g., 2.5–3L water/day)",
      "- Adjustment rule (e.g., drop 150 kcal if no progress in 2 weeks)",
      "",
      "# 6. Recovery & Lifestyle",
      "- Sleep target (hours)",
      "- Active rest ideas",
      "- Stress management basics",
      "- Optional supplements (if safe and supported by evidence)",
      "",
      "# 7. Safety Notes",
      "- Common form mistakes to avoid",
      "- Red flags that need medical advice",
      "- Exercise swaps for injuries (e.g., lunges → step-ups)",
      "",
      "# 8. Progress Tracking",
      "- What to measure weekly",
      "- How to know when to increase intensity",
      "- How to adapt if traveling or sick",
      "",
      "# 9. Motivation & Coaching Tips",
      "- One short motivational cue",
      "- A weekly reminder for consistency",
      "",
      "***",
      "## 🧱 STYLE RULES (must always follow)",
      "- Keep tone calm, clear, and supportive.",
      "- Avoid all jargon (no “hypertrophy,” say “muscle growth”).",
      "- Use simple verbs like “lift,” “push,” “rest,” “stretch.”",
      "- Always give exact numbers, not ranges like “some” or “a bit.”",
      "- Never say “it depends” without giving specific examples.",
      "- Make formatting look clean with clear spacing, headings, and dividers.",
      "- Keep sentences short and punchy.",
      "- Avoid emoji overload (max 2 per section if any).",
      "",
      "***",
      "## ⚙️ EXAMPLE OUTPUT (short version)",
      "# Snapshot",
      "28-year-old male, 78 kg, training at home. Goal: lose fat and improve strength in 10 weeks.",
      "***",
      "# Key Targets",
      "- Starting weight: 78 kg",
      "- Target: 72 kg in 10 weeks",
      "- Track: weight (every 3 days), steps, and weekly photos",
      "***",
      "# Weekly Structure",
      "- Monday: Strength (Upper)",
      "- Tuesday: Cardio (HIIT)",
      "- Wednesday: Rest",
      "- Thursday: Strength (Lower)",
      "- Friday: Core & Mobility",
      "- Saturday: Optional Cardio",
      "- Sunday: Rest  ",
      "⏱ 45–60 min per session",
      "***",
      "# Sample Day – Upper Strength",
      "**Warm-up (5 min):**",
      "Arm circles, push-ups, band rows",
      "",
      "**Main workout:**",
      "- Push-up 4×12",
      "- Dumbbell Row 4×10",
      "- Shoulder Press 3×10",
      "- Bicep Curl 3×12",
      "- Plank 3×30 sec",
      "",
      "**Cool-down:**",
      "Stretch chest and shoulders for 2 min",
      "***",
      "# Nutrition Plan",
      "- Calories: 2100/day",
      "- Protein: 150 g | Carbs: 200 g | Fat: 70 g",
      "- Meals:",
      "  - Breakfast: eggs + oats",
      "  - Lunch: rice + chicken + salad",
      "  - Dinner: veggies + paneer/tofu + roti",
      "  - Snack: yogurt or nuts",
      "- Water: 3L/day",
      "***",
      "# Recovery",
      "- Sleep: 7–8 hrs",
      "- Walk 20–30 min daily",
      "- Foam roll legs twice a week",
      "***",
      "# Motivation",
      "“Progress, not perfection. One session at a time.”",
      "***",
      "## 🪄 When you’re ready to start",
      "If the user asks for a plan, ask questions to get the necessary information to build the plan.",
    ].join("\n");

    if (user) {
      systemPrompt += `\n\nEZRA'S PROFILE: ${JSON.stringify(user)}`;
    }
    if (recentWorkouts && recentWorkouts.length > 0) {
      systemPrompt += `\n\nRECENT TRAINING:\n${recentWorkouts
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
      systemPrompt += `\n\nJUST FINISHED: ${workoutJustLogged.name} - ${workoutJustLogged.exercises.length} exercises`;
    }
    if (memories && memories.length > 0) {
      systemPrompt += `\n\nWHAT I KNOW ABOUT EZRA:\n${memories
        .map((m) => `${m.content}`)
        .join("\n")}`;
    }
    if (lastMessages && lastMessages.length > 0) {
      systemPrompt += `\n\nRECENT CONVERSATION:\n${lastMessages
        .map((m) => `${m.role === "user" ? "Ezra" : "Coach"}: ${m.content}`)
        .join("\n")}`;
    }
    if (context.streakData) {
      systemPrompt += `\n\nSTREAK INFO:\nCurrent: ${
        context.streakData.currentStreak
      } days\nBest ever: ${
        context.streakData.longestStreak
      } days  \nLast trained: ${
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

    // Find all JSON objects that look like {"action": ...}
    const actionRegex = /\{[\s\S]*?"action"\s*:[\s\S]*?\}/g;
    let match;

    while ((match = actionRegex.exec(response)) !== null) {
      try {
        const candidate = match[0];
        const jsonStr = candidate.replace(/\n/g, " ");
        const action = JSON.parse(jsonStr);
        if (
          action.action &&
          !actions.find((a) => JSON.stringify(a) === JSON.stringify(action))
        ) {
          actions.push(action);
        }
      } catch (e) {
        // Malformed JSON: ignore
      }
    }
    return actions;
  }

  cleanResponse(response) {
    if (!response || typeof response !== "string") return response;

    // Remove all JSON-like action objects from the response
    let cleaned = response.replace(/\{[\s\S]*?"action"\s*:[\s\S]*?\}/g, "");
    // Remove excessive blank lines and surrounding whitespace
    cleaned = cleaned.replace(/(\r?\n){3,}/g, "\n\n").trim();
    // Remove stray braces that look like JSON
    cleaned = cleaned.replace(/\{[^}]*\}/g, "");
    // Remove any trailing or leading blank lines
    cleaned = cleaned.replace(/^\s*[\r\n]+|[\r\n]+\s*$/g, "");
    return cleaned;
  }

  async generateEmbedding(text) {
    if (!this.embeddingModel) return null;
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding && result.embedding.values
        ? result.embedding.values
        : null;
    } catch (e) {
      console.error("Error generating embedding:", e);
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
      const responses = await GeminiResponse.find({})
        .sort({ createdAt: -1 })
        .limit(50);
      if (!responses.length) {
        return "I'm offline right now. Check your connection and try again.";
      }

      // Simple word matching; prefer longer matches
      const promptWords = prompt.toLowerCase().split(/\s+/).filter(Boolean);
      let best = responses[0],
        bestScore = 0;

      for (const resp of responses) {
        const respWords = resp.prompt
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        const shared = promptWords.filter(
          (w) => respWords.includes(w) && w.length > 3
        );
        const score =
          shared.length / Math.max(promptWords.length, respWords.length);
        if (score > bestScore) {
          bestScore = score;
          best = resp;
        }
      }

      return (
        tightenReply(this.cleanResponse(best.responseRaw)) ||
        "I can't access my notes right now. Try again when you're connected."
      );
    } catch (e) {
      console.error("Error getting offline response:", e);
      return "I'm offline and can't access training data. Try again when connected.";
    }
  }

  isOnline() {
    return !!this.client && !!this.apiKey;
  }

  static cosineSimilarity(vecA, vecB) {
    if (
      !Array.isArray(vecA) ||
      !Array.isArray(vecB) ||
      vecA.length !== vecB.length
    )
      return 0;
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < vecA.length; ++i) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] ** 2;
      normB += vecB[i] ** 2;
    }
    return Math.sqrt(normA) && Math.sqrt(normB)
      ? dot / (Math.sqrt(normA) * Math.sqrt(normB))
      : 0;
  }
}

export default GeminiService;

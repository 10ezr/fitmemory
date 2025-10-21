import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse } from "@/models/index.js";

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
        const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;

        const result = await this.model.generateContent(fullPrompt);
        const rawResponse = result.response.text();

        // Parse actions from response if present
        actions = this.parseActions(rawResponse);

        // Generate embedding for the response
        embedding = await this.generateEmbedding(rawResponse);

        response = this.cleanResponse(rawResponse);

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

    let systemPrompt = `You are FitMemory, an intelligent AI fitness coach with exceptional memory and reasoning skills. You are supportive yet challenging, adaptive to each user's needs, and constantly pushing them to new limits.

CURRENT CONTEXT:
- Today is ${dateString}
- Current time: ${currentDate.toLocaleTimeString()}
- Day of week: ${dayOfWeek}

PERSONALITY TRAITS:
- ADAPTIVE: Flexible coaching style based on user's current state, mood, and progress
- MOTIVATIONAL: Push users beyond their comfort zone with intelligent encouragement
- KNOWLEDGEABLE: Deep understanding of fitness, nutrition, and human psychology
- MEMORY-FOCUSED: Remember everything about the user and use it to provide personalized guidance
- GOAL-ORIENTED: Always working toward the user's long-term fitness objectives
- EMPATHETIC: Understanding when to push and when to support

CORE CAPABILITIES:
- Database manipulation for tracking progress and patterns
- Advanced workout planning with progressive overload
- Nutritional guidance and meal planning
- Injury prevention and recovery protocols
- Motivation and habit formation psychology
- Real-time adaptation based on user feedback`;

    if (user) {
      systemPrompt += `\n\nUSER PROFILE: ${JSON.stringify(user)}`;
    }

    if (recentWorkouts && recentWorkouts.length > 0) {
      systemPrompt += `\n\nRECENT WORKOUT HISTORY:\n${recentWorkouts
        .map(
          (w) =>
            `• ${new Date(w.date).toLocaleDateString()}: ${
              w.name || "Workout"
            } - ${w.exercises
              .map(
                (e) =>
                  `${e.name}${e.sets && e.reps ? ` ${e.sets}x${e.reps}` : ""}${
                    e.weightKg ? ` @ ${e.weightKg}kg` : ""
                  }`
              )
              .join(", ")}`
        )
        .join("\n")}`;
    }

    if (workoutJustLogged) {
      systemPrompt += `\n\nJUST COMPLETED WORKOUT: ${workoutJustLogged.name} - ${workoutJustLogged.exercises.length} exercises`;
    }

    if (memories && memories.length > 0) {
      systemPrompt += `\n\nRELEVANT USER MEMORIES:\n${memories
        .map((m) => `• [${m.type.toUpperCase()}] ${m.content}`)
        .join("\n")}`;
    }

    if (lastMessages && lastMessages.length > 0) {
      systemPrompt += `\n\nRECENT CONVERSATION CONTEXT:\n${lastMessages
        .map((m) => `${m.role === "user" ? "User" : "You"}: ${m.content}`)
        .join("\n")}`;
    }

    // Add streak context if available
    if (context.streakData) {
      systemPrompt += `\n\nSTREAK STATUS:\nCurrent Streak: ${
        context.streakData.currentStreak
      } days\nLongest Streak: ${
        context.streakData.longestStreak
      } days\nLast Workout: ${
        context.streakData.lastWorkoutDate
          ? new Date(context.streakData.lastWorkoutDate).toLocaleDateString()
          : "Never"
      }\nMissed Workouts: ${
        context.streakData.missedWorkouts
      }\nFlexible Mode: ${
        context.streakData.flexibleMode ? "Enabled" : "Disabled"
      }`;
    }

    systemPrompt += `

WORKOUT DAY SYSTEM:
Based on the day of week, provide appropriate workout plans:
- Monday: Push Day (chest, shoulders, triceps)
- Tuesday: Pull Day (back, biceps)
- Wednesday: Leg Day (quads, hamstrings, glutes, calves)
- Thursday: Core Day (abs, obliques, lower back)
- Friday: Cardio Day (HIIT, conditioning)
- Saturday: Full Body (compound movements)
- Sunday: Active Recovery (yoga, stretching, light movement)

AVAILABLE ACTIONS:
- {"action": "memory_add", "type": "preference|goal|pattern|injury|constraint|insight|achievement", "content": "detailed memory to store"}
- {"action": "memory_confirm", "content": "pattern or insight detected", "confidence": 0.1-1.0}
- {"action": "workout_plan", "exercises": [{"name": "exercise", "sets": 3, "reps": 10, "notes": "form cues"}], "duration": 30}
- {"action": "progress_update", "metric": "strength|endurance|flexibility", "value": "improvement noted"}
- {"action": "streak_celebrate", "milestone": "achievement reached"}
- {"action": "workout_complete", "streak_increment": true}
- {"action": "schedule_adjustment", "reason": "reason for change", "newSchedule": {"frequency": "daily|3x_week|flexible", "restDays": ["sunday"], "intensity": "low|moderate|high"}}
- {"action": "streak_warning", "message": "motivational message about maintaining streak"}

INSTRUCTIONS:
1. ALWAYS be contextually aware of the current date and day of week
2. When user says "start today's workout" or similar, provide the appropriate workout for the current day
3. Format workout responses with bullet points, bold text, and clear structure
4. When user says "workout is done", automatically increment their streak
5. Detect workout patterns and progression automatically
6. Provide database-informed responses using actual user data
7. Push users to new challenges while respecting their limits
8. Celebrate achievements and milestone moments
9. Adapt coaching style based on user's current streak, mood, and recent performance
10. Be flexible - sometimes motivational, sometimes analytical, always helpful
11. Use workout-focused language and fitness terminology naturally
12. Remember user preferences and apply them consistently

RESPONSE STYLE:
- Use **bold text** for emphasis
- Use bullet points (•) for lists
- Use line breaks for better readability
- Concise but comprehensive (1-4 sentences unless detailed explanation requested)
- Use fitness coaching language and motivational tone
- Include specific, actionable advice
- Reference past conversations and progress when relevant
- Always end with encouragement or next steps

IMPORTANT: 
- NEVER include JSON objects in your response text
- NEVER include {"action": ...} in your response
- Keep responses natural and conversational
- If you need to trigger actions, do so silently without showing JSON in the response`;

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
        return "I'm currently offline. Please check your connection and try again.";
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

      // If we have embeddings, use cosine similarity (simplified version)
      if (bestResponse.embedding && context.queryEmbedding) {
        // In a full implementation, you'd calculate cosine similarity here
      }

      return (
        this.cleanResponse(bestResponse.responseRaw) ||
        "I understand you want to track your fitness. When I'm online, I can provide better personalized advice."
      );
    } catch (error) {
      console.error("Error getting offline response:", error);
      return "I'm currently offline and can't access my training data. Please try again when connected.";
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

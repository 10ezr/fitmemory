import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse } from "@/models/index.js";

// Tone and content post-processing helpers
function tightenReply(text) {
  if (!text || typeof text !== "string") return text;
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
  for (const f of fillers) text = text.replace(f, "").trim();
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  if (text.length > 8000) {
    let cutoff = text.slice(0, 7600);
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
      const embeddingName = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
      this.model = this.client.getGenerativeModel({ model: modelName });
      this.embeddingModel = this.client.getGenerativeModel({ model: embeddingName });
    }
  }

  async generateResponse(prompt, context = {}) {
    let response, actions = null, embedding = null;
    try {
      if (this.model && this.apiKey) {
        const systemPrompt = this.buildSystemPrompt(context);
        const fullPrompt = `${systemPrompt}\n\nEzra: ${prompt}`;
        const result = await this.model.generateContent(fullPrompt);
        const rawResponse = result.response.text && result.response.text();
        if (!rawResponse) throw new Error("No response from Gemini API");
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
    // Compute India Standard Time strings explicitly
    const now = new Date();
    const istMs = now.getTime() + 330 * 60 * 1000; // UTC+5:30 offset in minutes
    const ist = new Date(istMs);
    const pad = (n) => String(n).padStart(2, "0");
    const istIso = `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}+05:30`;
    const istHuman = ist.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    let systemPrompt = `Current date/time (India): ${istHuman} (IST)\nISO timestamp IST: ${istIso}\nUse the exact date/time above whenever referring to “today”, “tomorrow”, day names, or deadlines.\n\nYou are an intelligent and experienced **fitness coach AI**.  \nYour goal is to provide simple, clear, and realistic fitness advice for any scenario.  \nYou automatically decide the **best output format** (plan, tip, question, adjustment, or motivation) based on the user’s message.  \nWrite like a human coach — direct, friendly, no jargon, no marketing tone.  \nUse **Markdown headings**, **bullet points**, and **horizontal dividers (---)** for clarity.  \nNever start with greetings like “Hi” or “Welcome.”  \nNever explain your formatting — just present it naturally.\n\n---\n\n## 🔁 BEHAVIOR LOGIC\nDetect the user’s intent and match it to one of the following styles:\n\n### 1. FULL PLAN\nTrigger: user gives full profile or requests a full workout/diet plan.\n\n**Format:**\n## 🧩 Snapshot  \nBrief description of user and goal.\n\n---\n\n## 🎯 Key Targets  \n- Current stats  \n- Target metrics  \n- Timeline  \n\n---\n\n## 🗓️ Weekly Schedule  \n- Training days per week  \n- Focus per day  \n- Duration  \n\n---\n\n## 💪 Sample Workout  \n**Warm-Up:** short list (mobility or cardio)  \n**Main Exercises:** bullet list with sets × reps  \n**Cool-Down:** short mobility or stretch  \n\n---\n\n## 🍎 Nutrition Guide  \n- Calorie goal  \n- Protein / carbs / fat balance  \n- Example meals  \n- Hydration notes  \n\n---\n\n## 💤 Recovery  \n- Sleep  \n- Active rest  \n- Mental recovery  \n\n---\n\n## ⚠️ Notes  \nForm tips, safety swaps, or progression rules.\n\n---\n\n### 2. QUICK ANSWER\nTrigger: user asks a short question (e.g., timing, exercises, food).\n\n**Format:**\n### Question  \nParaphrase briefly.\n\n---\n\n### Answer  \nDirect, short, practical.\n\n---\n\n### Why It Matters  \nOne paragraph max, plain explanation.\n\n---\n\n### 3. PLAN ADJUSTMENT\nTrigger: user wants to modify a plan (injury, less time, new goal).\n\n**Format:**\n### Update Summary  \nDescribe what changed.\n\n---\n\n### New Plan  \nOnly show revised parts (schedule, nutrition, or exercise swaps).\n\n---\n\n### Next Step  \nClear next action or what to track.\n\n---\n\n### 4. MOTIVATION / MINDSET\nTrigger: user feels stuck, tired, or needs mental push.\n\n**Format:**\n### Reminder  \nShort, grounded statement or quote.\n\n---\n\n### Reflection  \n1–2 lines connecting it to their current struggle.\n\n---\n\n### Small Action  \nTiny step they can take today.\n\n---\n\n### 5. MISSING INFO\nTrigger: user’s input incomplete.\n\n**Format:**\n### Missing Details  \nList only the missing fields.\n\n---\n\n### Example Input  \nShow exactly how to format the missing info.\n\n---\n\n### 6. SAFETY MODE\nTrigger: user mentions injury, pain, illness, or high-risk goal.\n\n**Format:**\n### Caution  \nIdentify what may be unsafe.\n\n---\n\n### Recommendation  \nAdvise to pause, rest, or get medical clearance.\n\n---\n\n### Safe Alternatives  \nList 2–3 light or modified options.\n\n---\n\n## 🧠 STYLE RULES\n- Plain, clear, and minimal. No greetings or emojis unless they improve clarity.  \n- Use Markdown headers (##, ###) and dividers (---) automatically.  \n- Always output readable sections with spacing.  \n- Never repeat the same structure twice; vary tone slightly by context.  \n- Explain why when relevant, but briefly.  \n- Prioritize usability over completeness.  \n- Never use filler like “I’ve gathered your info” or “Here’s your plan.” Just start.\n\n---\n\n## ⚙️ EXAMPLES OF CONTEXT DETECTION\n...`;

    const { user, recentWorkouts, memories, lastMessages, workoutJustLogged, streakData } = context;
    if (user) systemPrompt += `\n\nUSER PROFILE: ${JSON.stringify(user)}`;
    if (recentWorkouts && recentWorkouts.length > 0) {
      systemPrompt += `\n\nRECENT TRAINING:\n${recentWorkouts
        .map((w) => `${new Date(w.date).toLocaleDateString()}: ${w.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}${e.weightKg ? ` @${e.weightKg}kg` : ""}`).join(", ")}`)
        .join("\n")}`;
    }
    if (workoutJustLogged) {
      systemPrompt += `\n\nJUST FINISHED: ${workoutJustLogged.name} - ${workoutJustLogged.exercises.length} exercises`;
    }
    if (memories && memories.length > 0) {
      systemPrompt += `\n\nPRIOR NOTES:\n${memories.map((m) => `${m.content}`).join("\n")}`;
    }
    if (lastMessages && lastMessages.length > 0) {
      systemPrompt += `\n\nRECENT CONVERSATION:\n${lastMessages.map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`).join("\n")}`;
    }
    if (streakData) {
      systemPrompt += `\n\nSTREAK DATA:\nCurrent: ${streakData.currentStreak} days\nBest: ${streakData.longestStreak} days\nLast workout: ${streakData.lastWorkoutDate ? new Date(streakData.lastWorkoutDate).toLocaleDateString() : "Never"}`;
    }

    return systemPrompt;
  }

  parseActions(response) {
    const actions = [];
    const actionRegex = /\{[\s\S]*?"action"\s*:[\s\S]*?\}/g;
    let match;
    while ((match = actionRegex.exec(response)) !== null) {
      try {
        const candidate = match[0];
        const jsonStr = candidate.replace(/\n/g, " ");
        const action = JSON.parse(jsonStr);
        if (action.action && !actions.find((a) => JSON.stringify(a) === JSON.stringify(action))) {
          actions.push(action);
        }
      } catch (e) {}
    }
    return actions;
  }

  cleanResponse(response) {
    if (!response || typeof response !== "string") return response;
    let cleaned = response.replace(/\{[\s\S]*?"action"\s*:[\s\S]*?\}/g, "");
    cleaned = cleaned.replace(/(\r?\n){3,}/g, "\n\n").trim();
    // Removed generic brace-stripper to avoid deleting legitimate text with braces
    cleaned = cleaned.replace(/^\s*[\r\n]+|[\r\n]+\s*$/g, "");
    return cleaned;
  }

  async generateEmbedding(text) {
    if (!this.embeddingModel) return null;
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding && result.embedding.values ? result.embedding.values : null;
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
      const responses = await GeminiResponse.find({}).sort({ createdAt: -1 }).limit(50);
      if (!responses.length) return "I'm offline right now. Check your connection and try again.";
      const promptWords = prompt.toLowerCase().split(/\s+/).filter(Boolean);
      let best = responses[0], bestScore = 0;
      for (const resp of responses) {
        const respWords = resp.prompt.toLowerCase().split(/\s+/).filter(Boolean);
        const shared = promptWords.filter((w) => respWords.includes(w) && w.length > 3);
        const score = shared.length / Math.max(promptWords.length, respWords.length);
        if (score > bestScore) { bestScore = score; best = resp; }
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

  isOnline() { return !!this.client && !!this.apiKey; }

  static cosineSimilarity(vecA, vecB) {
    if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; ++i) { dot += vecA[i] * vecB[i]; normA += vecA[i] ** 2; normB += vecB[i] ** 2; }
    return Math.sqrt(normA) && Math.sqrt(normB) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }
}

export default GeminiService;

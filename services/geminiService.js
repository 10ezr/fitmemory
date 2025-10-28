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

  // Limit length to 8000 characters and cut at sentence end if possible
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
    /**
     * Completely replace with the given system prompt,
     * optionally appending contextual observations as extra info.
     */
    let systemPrompt = `
You are an intelligent and experienced **fitness coach AI**.  
Your goal is to provide simple, clear, and realistic fitness advice for any scenario.  
You automatically decide the **best output format** (plan, tip, question, adjustment, or motivation) based on the user’s message.  
Write like a human coach — direct, friendly, no jargon, no marketing tone.  
Use **Markdown headings**, **bullet points**, and **horizontal dividers (---)** for clarity.  
Never start with greetings like “Hi” or “Welcome.”  
Never explain your formatting — just present it naturally.

---

## 🔁 BEHAVIOR LOGIC
Detect the user’s intent and match it to one of the following styles:

### 1. FULL PLAN
Trigger: user gives full profile or requests a full workout/diet plan.

**Format:**
## 🧩 Snapshot  
Brief description of user and goal.

---

## 🎯 Key Targets  
- Current stats  
- Target metrics  
- Timeline  

---

## 🗓️ Weekly Schedule  
- Training days per week  
- Focus per day  
- Duration  

---

## 💪 Sample Workout  
**Warm-Up:** short list (mobility or cardio)  
**Main Exercises:** bullet list with sets × reps  
**Cool-Down:** short mobility or stretch  

---

## 🍎 Nutrition Guide  
- Calorie goal  
- Protein / carbs / fat balance  
- Example meals  
- Hydration notes  

---

## 💤 Recovery  
- Sleep  
- Active rest  
- Mental recovery  

---

## ⚠️ Notes  
Form tips, safety swaps, or progression rules.

---

### 2. QUICK ANSWER
Trigger: user asks a short question (e.g., timing, exercises, food).

**Format:**
### Question  
Paraphrase briefly.

---

### Answer  
Direct, short, practical.

---

### Why It Matters  
One paragraph max, plain explanation.

---

### 3. PLAN ADJUSTMENT
Trigger: user wants to modify a plan (injury, less time, new goal).

**Format:**
### Update Summary  
Describe what changed.

---

### New Plan  
Only show revised parts (schedule, nutrition, or exercise swaps).

---

### Next Step  
Clear next action or what to track.

---

### 4. MOTIVATION / MINDSET
Trigger: user feels stuck, tired, or needs mental push.

**Format:**
### Reminder  
Short, grounded statement or quote.

---

### Reflection  
1–2 lines connecting it to their current struggle.

---

### Small Action  
Tiny step they can take today.

---

### 5. MISSING INFO
Trigger: user’s input incomplete.

**Format:**
### Missing Details  
List only the missing fields.

---

### Example Input  
Show exactly how to format the missing info.

---

### 6. SAFETY MODE
Trigger: user mentions injury, pain, illness, or high-risk goal.

**Format:**
### Caution  
Identify what may be unsafe.

---

### Recommendation  
Advise to pause, rest, or get medical clearance.

---

### Safe Alternatives  
List 2–3 light or modified options.

---

## 🧠 STYLE RULES
- Plain, clear, and minimal. No greetings or emojis unless they improve clarity.  
- Use Markdown headers (\`##\`, \`###\`) and dividers (\`---\`) automatically.  
- Always output readable sections with spacing.  
- Never repeat the same structure twice; vary tone slightly by context.  
- Explain *why* when relevant, but briefly.  
- Prioritize usability over completeness.  
- Never use filler like “I’ve gathered your info” or “Here’s your plan.” Just start.

---

## ⚙️ EXAMPLES OF CONTEXT DETECTION

**User:** “I’m 25, 180cm, 70kg, want to gain muscle at home with dumbbells.”  
→ Output full plan format.

**User:** “Can I eat rice at night when cutting?”  
→ Output quick answer format.

**User:** “I hurt my knee, can we modify the lower body days?”  
→ Output plan adjustment format.

**User:** “I’ve lost motivation lately.”  
→ Output motivation format.

**User:** “I want a plan but forgot to mention my weight.”  
→ Output missing info format.

**User:** “I’m having back pain during squats.”  
→ Output safety mode format.

---

Always produce clean, structured Markdown that looks natural in ChatGPT or an API front-end.
No extra greetings, no explanations, no system notes.
Just the final, human-readable output.

VERY IMPORTANT NOTE: Always remember todays date and time(india) while generating the response.
`;

    // Optional: append extra user context to help Gemini with more relevance.
    const {
      user,
      recentWorkouts,
      memories,
      lastMessages,
      workoutJustLogged,
      streakData,
    } = context;

    if (user) {
      systemPrompt += `\n\nUSER PROFILE: ${JSON.stringify(user)}`;
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
      systemPrompt += `\n\nPRIOR NOTES:\n${memories
        .map((m) => `${m.content}`)
        .join("\n")}`;
    }
    if (lastMessages && lastMessages.length > 0) {
      systemPrompt += `\n\nRECENT CONVERSATION:\n${lastMessages
        .map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`)
        .join("\n")}`;
    }
    if (streakData) {
      systemPrompt += `\n\nSTREAK DATA:\nCurrent: ${
        streakData.currentStreak
      } days\nBest: ${streakData.longestStreak} days\nLast workout: ${
        streakData.lastWorkoutDate
          ? new Date(streakData.lastWorkoutDate).toLocaleDateString()
          : "Never"
      }`;
    }

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

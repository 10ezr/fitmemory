import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiResponse } from "@/models/index.js";

function tightenReply(text) {
  if (!text || typeof text !== "string") return text;
  const fillers = [/let's look at/i, /powerful start/i, /seal the deal/i, /you've kicked it off strong/i, /this isn't just a workout/i, /journey/i, /commitment/i, /as your coach/i, /as an ai/i, /i'm an ai/i, /artificial intelligence/i, /machine learning/i];
  for (const f of fillers) text = text.replace(f, "").trim();
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  if (text.length > 8000) { let cutoff = text.slice(0, 7600); let last = cutoff.lastIndexOf("."); text = last !== -1 ? cutoff.slice(0, last + 1) : cutoff; }
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
        const systemPrompt = this.buildSystemPrompt(context, prompt);
        const fullPrompt = `${systemPrompt}\n\nEzra: ${prompt}`;
        const result = await this.model.generateContent(fullPrompt);
        const rawResponse = result.response.text && result.response.text();
        if (!rawResponse) throw new Error("No response from Gemini API");
        actions = this.parseActions(rawResponse);
        embedding = await this.generateEmbedding(rawResponse);
        response = tightenReply(this.cleanResponse(rawResponse));
        await this.persistResponse({ prompt: fullPrompt, responseRaw: rawResponse, actions, embedding, metadata: { model: "gemini-pro", context } });
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

  buildSystemPrompt(context, userPrompt = "") {
    const now = new Date();
    const istMs = now.getTime() + 330 * 60 * 1000;
    const ist = new Date(istMs);
    const pad = (n) => String(n).padStart(2, "0");
    const istIso = `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}+05:30`;
    const istHuman = ist.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

    // Detect workout intent
    const p = (userPrompt || "").toLowerCase();
    const askToday = /(today('|)s|todays|today|for today|what'?s today|today workout|today session)/i.test(p) && /workout|session|plan/.test(p);
    
    // Detect sleep intent
    const sleepKeywords = ['sleep', 'slept', 'bedtime', 'wake up', 'woke up', 'tired', 'rest', 'insomnia'];
    const isSleepRelated = sleepKeywords.some(keyword => p.includes(keyword));

    // High-priority rule block first
    let systemPrompt = `Current date/time (India): ${istHuman} (IST)\nISO timestamp IST: ${istIso}\nUse the exact date/time above when referring to today/tomorrow/day names.\n\n`;

    if (askToday) {
      systemPrompt += `You are a fitness coach. If the user asks for today's workout, respond conversationally with a compact, actionable workout card — not Q/A format.\nOutput this exact structure (Markdown):\n\n## Today's Workout — <focus/name>\n**Warm-up (3–5 min):** short bullets\n**Main (30–45 min):** list exercises with sets × reps and rest (e.g., 3×10, Rest 60s)\n**Finisher (optional):** 1 line if useful\n**Notes:** 1–2 short form cues or substitutions\n\nRules:\n- No sections named Question/Answer/Why It Matters.\n- Keep tone direct and conversational.\n- Keep only what's needed to start training now.\n- Do not generate tomorrow's plan here.\n- If a plan was just suggested, also include an action object only in hidden JSON form: {"action":"workout_plan_suggested","startTimerHint":true}.\n`;
    } else {
      systemPrompt += `You are an intelligent and experienced **holistic health coach AI** who understands both FITNESS and SLEEP.\n\nYour expertise covers:\n- Workout planning and technique\n- Sleep optimization and recovery\n- How sleep affects workout performance\n- Integrated wellness coaching\n\nWrite in clean Markdown with headings, bullets, and (---) dividers when helpful.\nUse plan formats when full info is provided, quick direct answers for small questions, adjustments for changes, motivation when asked. Avoid filler and Q/A templates unless explicitly requested.\n\n`;
    }

    // Append context
    const { user, recentWorkouts, memories, lastMessages, workoutJustLogged, sleepJustLogged, sleepReadiness, streakData } = context;
    
    if (user) systemPrompt += `\nUSER PROFILE: ${JSON.stringify(user)}`;
    
    // Sleep readiness context
    if (sleepReadiness) {
      systemPrompt += `\n\nSLEEP & READINESS STATUS:\n- Overall Readiness: ${sleepReadiness.overall}/100 (${sleepReadiness.status})\n- Sleep Component: ${sleepReadiness.components?.sleep || 'N/A'}/100\n- Recovery Component: ${sleepReadiness.components?.recovery || 'N/A'}/100\n- Consistency: ${sleepReadiness.components?.consistency || 'N/A'}/100`;
      
      if (sleepReadiness.lastNightSleep) {
        const sleep = sleepReadiness.lastNightSleep;
        const hours = Math.floor(sleep.totalSleepTime / 60);
        const mins = sleep.totalSleepTime % 60;
        systemPrompt += `\n- Last Night: ${hours}h ${mins}m, Quality: ${sleep.sleepQuality}/10`;
        if (sleep.sleepEfficiency) systemPrompt += `, Efficiency: ${sleep.sleepEfficiency}%`;
      }
      
      if (sleepReadiness.recommendations?.length > 0) {
        systemPrompt += `\n- Key Recommendations: ${sleepReadiness.recommendations.slice(0, 2).join('; ')}`;
      }
    }
    
    if (recentWorkouts && recentWorkouts.length > 0) {
      systemPrompt += `\n\nRECENT TRAINING:\n${recentWorkouts.map((w) => `${new Date(w.date).toLocaleDateString()}: ${w.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}${e.weightKg ? ` @${e.weightKg}kg` : ""}`).join(", ")}`).join("\n")}`;
    }
    
    if (workoutJustLogged) {
      systemPrompt += `\n\nJUST FINISHED: ${workoutJustLogged.name} - ${workoutJustLogged.exercises.length} exercises`;
    }
    
    if (sleepJustLogged) {
      const hours = Math.floor(sleepJustLogged.totalSleepTime / 60);
      const mins = sleepJustLogged.totalSleepTime % 60;
      systemPrompt += `\n\nJUST LOGGED SLEEP: ${hours}h ${mins}m, Quality: ${sleepJustLogged.sleepQuality}/10`;
      if (sleepJustLogged.notes) systemPrompt += ` (${sleepJustLogged.notes})`;
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

    // Add sleep-fitness integration guidelines
    systemPrompt += `\n\nSLEEP-FITNESS INTEGRATION GUIDELINES:\n- If readiness < 60: Recommend lighter workouts, focus on recovery\n- If readiness 60-79: Moderate intensity, listen to body\n- If readiness 80+: User is primed for intense training\n- Always consider sleep quality when suggesting workout intensity\n- If poor sleep detected: Suggest recovery-focused activities\n- If excellent sleep: Encourage challenging workouts\n- Provide sleep tips when workout recovery might benefit\n- Address sleep issues that could impact fitness goals\n\nRESPONSE GUIDELINES:\n- Be supportive and knowledgeable about both fitness AND sleep\n- Make connections between sleep and workout performance\n- Give actionable advice for both domains\n- If user mentions sleep, acknowledge and provide insights\n- If user mentions fatigue/tiredness, consider sleep factors\n- Maintain encouraging and holistic health perspective`;

    return systemPrompt;
  }

  parseActions(response) {
    const actions = [];
    const actionRegex = /\{[\s\S]*?"action"\s*:[\s\S]*?\}/g;
    let match;
    while ((match = actionRegex.exec(response)) !== null) {
      try {
        const jsonStr = match[0].replace(/\n/g, " ");
        const action = JSON.parse(jsonStr);
        if (action.action && !actions.find((a) => JSON.stringify(a) === JSON.stringify(action))) actions.push(action);
      } catch (e) {}
    }
    return actions;
  }

  cleanResponse(response) {
    if (!response || typeof response !== "string") return response;
    let cleaned = response.replace(/\{[\s\S]*?"action"\s*:[\s\S]*?\}/g, "");
    cleaned = cleaned.replace(/(\r?\n){3,}/g, "\n\n").trim();
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
  
  async getOfflineResponse(prompt, context = {}) { 
    // Enhanced offline responses with sleep awareness
    const p = prompt.toLowerCase();
    
    if (p.includes('sleep') || p.includes('tired') || p.includes('rest')) {
      return "I'm offline right now, but sleep is crucial for recovery and performance! When I'm back online, I can help you track your sleep patterns and optimize your rest for better workouts. Check your connection and try again.";
    }
    
    if (p.includes('readiness') || p.includes('recovery')) {
      return "I'm offline right now, but I'd love to help assess your readiness based on your sleep and recovery data! Check your connection and try again.";
    }
    
    return "I'm offline right now. Check your connection and try again to get personalized fitness and sleep coaching!";
  }
  
  isOnline() { 
    return !!this.client && !!this.apiKey; 
  }
  
  static cosineSimilarity(vecA, vecB) { 
    if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) return 0; 
    let dot=0,normA=0,normB=0; 
    for (let i=0;i<vecA.length;++i){
      dot+=vecA[i]*vecB[i];
      normA+=vecA[i]**2;
      normB+=vecB[i]**2;
    } 
    return Math.sqrt(normA)&&Math.sqrt(normB)?dot/(Math.sqrt(normA)*Math.sqrt(normB)):0; 
  }
}

export default GeminiService;
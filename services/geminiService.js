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

// Smart message categorization for contextual responses
function categorizeMessage(message, context = {}) {
  const msg = message.toLowerCase().trim();
  
  // Sleep-related patterns
  const sleepPatterns = {
    goingToBed: /^(i am|i'm|im|going to|gonna|about to).*(sleep|bed|rest)|^(sleep|bed|bedtime|sleepy|tired)( now)?$/i,
    wakeUp: /^(just|i).*(woke up|awake|up|morning)|^(good morning|wake up|awake now)$/i,
    sleepUpdate: /slept.*(hours?|well|badly|good|bad)|got.*(hours?|sleep)|sleep quality/i,
    sleepQuestion: /how.*(sleep|rest)|sleep.*(better|tips|help)/i
  };
  
  // Workout-related patterns
  const workoutPatterns = {
    completed: /(workout|exercise|training|session).*(done|finished|complete)|^(done|finished|complete).*(workout|exercise|training)/i,
    starting: /^(starting|about to|gonna|going to).*(workout|exercise|training|gym)/i,
    question: /what.*(workout|exercise|training)|workout.*(today|plan|should)/i,
    tired: /tired|exhausted|worn out|beat/i
  };
  
  // General patterns
  const generalPatterns = {
    greeting: /^(hi|hello|hey|good morning|good evening|sup|what's up|how are you)$/i,
    thanks: /^(thanks|thank you|thx|appreciate|cheers)$/i,
    yes: /^(yes|yeah|yep|sure|ok|okay|alright)$/i,
    no: /^(no|nope|nah|not really)$/i,
    casual: msg.split(' ').length <= 3 && !/\?/.test(msg)
  };
  
  // Check each category
  for (const [type, pattern] of Object.entries(sleepPatterns)) {
    if (pattern.test(message)) return { category: 'sleep', type, isCasual: true };
  }
  
  for (const [type, pattern] of Object.entries(workoutPatterns)) {
    if (pattern.test(message)) return { category: 'workout', type };
  }
  
  for (const [type, pattern] of Object.entries(generalPatterns)) {
    if (pattern.test(message)) return { category: 'general', type, isCasual: true };
  }
  
  // Default: determine if it's a detailed question or casual statement
  const isQuestion = message.includes('?') || /^(how|what|when|where|why|which|should|can|could|would|will|do|does)/i.test(message);
  const isLong = message.split(' ').length > 8;
  
  return {
    category: 'general',
    type: isQuestion ? 'question' : 'statement',
    isCasual: !isQuestion && !isLong,
    isDetailed: isQuestion && isLong
  };
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
        const messageCategory = categorizeMessage(prompt, context);
        const systemPrompt = this.buildSystemPrompt(context, prompt, messageCategory);
        const fullPrompt = `${systemPrompt}\n\nEzra: ${prompt}`;
        const result = await this.model.generateContent(fullPrompt);
        const rawResponse = result.response.text && result.response.text();
        if (!rawResponse) throw new Error("No response from Gemini API");
        actions = this.parseActions(rawResponse);
        embedding = await this.generateEmbedding(rawResponse);
        response = tightenReply(this.cleanResponse(rawResponse));
        await this.persistResponse({ prompt: fullPrompt, responseRaw: rawResponse, actions, embedding, metadata: { model: "gemini-pro", context, messageCategory } });
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

  buildSystemPrompt(context, userPrompt = "", messageCategory = {}) {
    const now = new Date();
    const istMs = now.getTime() + 330 * 60 * 1000;
    const ist = new Date(istMs);
    const pad = (n) => String(n).padStart(2, "0");
    const istIso = `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}+05:30`;
    const istHuman = ist.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

    // Detect workout intent
    const p = (userPrompt || "").toLowerCase();
    const askToday = /(today('|)s|todays|today|for today|what'?s today|today workout|today session)/i.test(p) && /workout|session|plan/.test(p);
    
    let systemPrompt = `Current date/time (India): ${istHuman} (IST)\nISO timestamp IST: ${istIso}\nUse the exact date/time above when referring to today/tomorrow/day names.\n\n`;

    // Response style based on message category
    if (messageCategory.isCasual || messageCategory.category === 'sleep' && messageCategory.type === 'goingToBed') {
      systemPrompt += `RESPONSE STYLE: CASUAL & BRIEF\n- User sent a casual/simple message: "${userPrompt}"\n- Respond naturally and briefly (1-2 sentences max)\n- Be supportive but don't lecture or over-explain\n- Match their energy level - if they're casual, be casual\n- No bullet points, lists, or detailed explanations unless specifically asked\n- Examples of good responses: "Sleep well! Tomorrow's a new day 💪", "Nice work! How did it feel?", "Good morning! How'd you sleep?"\n\n`;
    } else if (messageCategory.isDetailed || askToday) {
      systemPrompt += `RESPONSE STYLE: DETAILED & HELPFUL\n- User asked a detailed question or requested specific info\n- Provide comprehensive, structured response\n- Use bullet points, headings, and formatting as needed\n- Include actionable advice and specific recommendations\n\n`;
    } else {
      systemPrompt += `RESPONSE STYLE: BALANCED\n- Respond appropriately to the context and question\n- Be helpful but not overwhelming\n- 2-4 sentences typically unless more detail is specifically needed\n\n`;
    }

    if (askToday) {
      systemPrompt += `You are a fitness coach. If the user asks for today's workout, respond conversationally with a compact, actionable workout card — not Q/A format.\nOutput this exact structure (Markdown):\n\n## Today's Workout — <focus/name>\n**Warm-up (3–5 min):** short bullets\n**Main (30–45 min):** list exercises with sets × reps and rest (e.g., 3×10, Rest 60s)\n**Finisher (optional):** 1 line if useful\n**Notes:** 1–2 short form cues or substitutions\n\nRules:\n- No sections named Question/Answer/Why It Matters.\n- Keep tone direct and conversational.\n- Keep only what's needed to start training now.\n- Do not generate tomorrow's plan here.\n- If a plan was just suggested, also include an action object only in hidden JSON form: {"action":"workout_plan_suggested","startTimerHint":true}.\n`;
    } else {
      systemPrompt += `You are an intelligent and experienced **holistic health coach AI** who understands both FITNESS and SLEEP.\n\nYour expertise covers:\n- Workout planning and technique\n- Sleep optimization and recovery\n- How sleep affects workout performance\n- Integrated wellness coaching\n\nWrite in clean Markdown with headings, bullets, and (---) dividers when helpful for DETAILED responses only.\nFor casual messages, respond naturally and conversationally without excessive formatting.\n\n`;
    }

    // Context data (same as before but only include if relevant to response type)
    const { user, recentWorkouts, memories, lastMessages, workoutJustLogged, sleepJustLogged, sleepReadiness, streakData } = context;
    
    if (user) systemPrompt += `\nUSER PROFILE: ${JSON.stringify(user)}`;
    
    // Only include sleep readiness for detailed responses or sleep-related messages
    if (sleepReadiness && (messageCategory.category === 'sleep' || !messageCategory.isCasual)) {
      systemPrompt += `\n\nSLEEP & READINESS STATUS:\n- Overall Readiness: ${sleepReadiness.overall}/100 (${sleepReadiness.status})\n- Sleep Component: ${sleepReadiness.components?.sleep || 'N/A'}/100`;
      
      if (sleepReadiness.lastNightSleep && messageCategory.category === 'sleep') {
        const sleep = sleepReadiness.lastNightSleep;
        const hours = Math.floor(sleep.totalSleepTime / 60);
        const mins = sleep.totalSleepTime % 60;
        systemPrompt += `\n- Last Night: ${hours}h ${mins}m, Quality: ${sleep.sleepQuality}/10`;
      }
    }
    
    // Include recent workouts only for workout-related or detailed queries
    if (recentWorkouts && recentWorkouts.length > 0 && (messageCategory.category === 'workout' || !messageCategory.isCasual)) {
      systemPrompt += `\n\nRECENT TRAINING:\n${recentWorkouts.slice(0, 3).map((w) => `${new Date(w.date).toLocaleDateString()}: ${w.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}${e.weightKg ? ` @${e.weightKg}kg` : ""}`).join(", ")}`).join("\n")}`;
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
    
    // Only include memories for non-casual responses
    if (memories && memories.length > 0 && !messageCategory.isCasual) {
      systemPrompt += `\n\nPRIOR NOTES:\n${memories.slice(0, 2).map((m) => `${m.content}`).join("\n")}`;
    }
    
    // Always include recent conversation for context
    if (lastMessages && lastMessages.length > 0) {
      systemPrompt += `\n\nRECENT CONVERSATION:\n${lastMessages.slice(-2).map((m) => `${m.role === "user" ? "Ezra" : "Coach"}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`).join("\n")}`;
    }
    
    if (streakData && (messageCategory.category === 'workout' || !messageCategory.isCasual)) {
      systemPrompt += `\n\nSTREAK DATA:\nCurrent: ${streakData.currentStreak} days\nBest: ${streakData.longestStreak} days`;
    }

    // Specific response patterns for common messages
    if (messageCategory.category === 'sleep' && messageCategory.type === 'goingToBed') {
      systemPrompt += `\n\nSPECIFIC INSTRUCTION: User is going to sleep. Respond with a brief, supportive goodnight message. Keep it to 1-2 sentences. Be encouraging about their rest and maybe mention tomorrow briefly. DO NOT lecture about sleep benefits or provide detailed advice unless specifically requested.`;
    }
    
    if (messageCategory.category === 'workout' && messageCategory.type === 'completed') {
      systemPrompt += `\n\nSPECIFIC INSTRUCTION: User completed a workout. Congratulate them briefly and ask how it felt or acknowledge their effort. Keep it to 1-2 sentences unless they want more detail.`;
    }
    
    if (messageCategory.category === 'general' && messageCategory.type === 'greeting') {
      systemPrompt += `\n\nSPECIFIC INSTRUCTION: User is greeting you. Respond with a friendly greeting and maybe ask how they're doing or what they're planning. Keep it natural and brief.`;
    }

    systemPrompt += `\n\nIMPORTANT RULES:\n- Match the user's communication style and energy\n- If they're brief/casual, be brief/casual\n- If they ask detailed questions, give detailed answers\n- Don't over-explain unless specifically asked\n- Use natural language, avoid corporate/coach speak\n- Be supportive but not preachy\n- Remember context but don't repeat information unnecessarily`;

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
    const messageCategory = categorizeMessage(prompt, context);
    
    if (messageCategory.category === 'sleep' && messageCategory.type === 'goingToBed') {
      return "Sleep well! Rest up for tomorrow 💤";
    }
    
    if (messageCategory.category === 'workout' && messageCategory.type === 'completed') {
      return "Nice work! I'm offline right now, but great job getting it done 💪";
    }
    
    if (messageCategory.category === 'general' && messageCategory.type === 'greeting') {
      return "Hey! I'm offline right now, but I'll be back to help with your fitness and sleep goals soon.";
    }
    
    return "I'm offline right now. Check your connection and try again for personalized coaching!";
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
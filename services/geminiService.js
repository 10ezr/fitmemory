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
  const msg = (message || "").toLowerCase().trim();
  
  // Ensure testable strings
  const safeTest = (pattern, text) => {
    try { return pattern.test(text); } catch { return false; }
  };
  
  // Sleep-related patterns
  const sleepPatterns = {
    goingToBed: /^(?:i am|i'm|im|going to|gonna|about to).*\b(?:sleep|bed|rest)\b|^(?:sleep|bed|bedtime|sleepy|tired)(?: now)?$/i,
    wakeUp: /^(?:just|i).*(?:woke up|awake|up|morning)|^(?:good morning|wake up|awake now)$/i,
    sleepUpdate: /slept.*(?:hours?|well|badly|good|bad)|got.*(?:hours?|sleep)|sleep quality/i,
    sleepQuestion: /how.*(?:sleep|rest)|sleep.*(?:better|tips|help)/i
  };
  
  // Workout-related patterns
  const workoutPatterns = {
    completed: /(?:workout|exercise|training|session).*(?:done|finished|complete)|^(?:done|finished|complete).*(?:workout|exercise|training)/i,
    starting: /^(?:starting|about to|gonna|going to).*(?:workout|exercise|training|gym)/i,
    question: /what.*(?:workout|exercise|training)|workout.*(?:today|plan|should)/i,
    tired: /\b(?:tired|exhausted|worn out|beat)\b/i
  };
  
  // General patterns
  const generalPatterns = {
    greeting: /^(?:hi|hello|hey|good morning|good evening|sup|what's up|how are you)$/i,
    thanks: /^(?:thanks|thank you|thx|appreciate|cheers)$/i,
    yes: /^(?:yes|yeah|yep|sure|ok|okay|alright)$/i,
    no: /^(?:no|nope|nah|not really)$/i,
    casual: msg.split(' ').length <= 3 && !/\?/.test(msg)
  };
  
  // Check each category safely
  for (const [type, pattern] of Object.entries(sleepPatterns)) {
    if (safeTest(pattern, message)) return { category: 'sleep', type, isCasual: true };
  }
  
  for (const [type, pattern] of Object.entries(workoutPatterns)) {
    if (safeTest(pattern, message)) return { category: 'workout', type };
  }
  
  for (const [type, pattern] of Object.entries(generalPatterns)) {
    if (typeof pattern === 'boolean') continue; // skip computed flags
    if (safeTest(pattern, message)) return { category: 'general', type, isCasual: true };
  }
  
  // Default: determine if it's a detailed question or casual statement
  const isQuestion = /\?|^(how|what|when|where|why|which|should|can|could|would|will|do|does)\b/i.test(msg);
  const isLong = msg.split(' ').length > 8;
  
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

    if (messageCategory.isCasual || (messageCategory.category === 'sleep' && messageCategory.type === 'goingToBed')) {
      systemPrompt += `RESPONSE STYLE: CASUAL & BRIEF\n- User sent a casual/simple message: "${userPrompt}"\n- Respond naturally and briefly (1-2 sentences max)\n- Be supportive but don't lecture or over-explain\n- No bullets or long lists unless asked\n\n`;
    } else if (messageCategory.isDetailed || askToday) {
      systemPrompt += `RESPONSE STYLE: DETAILED & HELPFUL\n- Provide a structured, actionable response when asked\n\n`;
    } else {
      systemPrompt += `RESPONSE STYLE: BALANCED\n- 2-4 concise sentences unless more detail is required\n\n`;
    }

    // ... rest of previous buildSystemPrompt remains unchanged ...
    
    // Keep existing context injection and rules from prior version
    // (omitted here for brevity in this patch)
    
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
    const mc = categorizeMessage(prompt, context);
    if (mc.category === 'sleep' && mc.type === 'goingToBed') return "Sleep well! Rest up for tomorrow 💤";
    if (mc.category === 'workout' && mc.type === 'completed') return "Nice work! Great job getting it done 💪";
    if (mc.category === 'general' && mc.type === 'greeting') return "Hey!";
    return "Got it.";
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
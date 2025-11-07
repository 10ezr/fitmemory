import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiContext, GeminiResponse, AiAction } from '@/types';

/**
 * GeminiService - AI-powered conversation and coaching
 * Integrates with Google's Gemini AI for intelligent responses
 */
export default class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    } else {
      console.warn('GEMINI_API_KEY not found. AI responses will be fallback only.');
    }
  }

  /**
   * Generate AI response based on user message and context
   */
  async generateResponse(
    message: string,
    context: GeminiContext
  ): Promise<GeminiResponse> {
    try {
      if (!this.model) {
        return this.getFallbackResponse(message, context);
      }

      const prompt = this.buildPrompt(message, context);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse actions from response
      const actions = this.parseActions(text);

      // Clean response text (remove action markers)
      const cleanedReply = this.cleanResponseText(text);

      return {
        reply: cleanedReply,
        actions,
        confidence: 0.9
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackResponse(message, context);
    }
  }

  /**
   * Build comprehensive prompt for Gemini
   */
  private buildPrompt(message: string, context: GeminiContext): string {
    const parts: string[] = [];

    // System instruction
    parts.push(
      'You are a personal fitness coach named FitMemory. You help users track workouts, ' +
      'improve consistency, maintain streaks, optimize sleep, and achieve fitness goals. ' +
      'Be encouraging, motivational, and provide actionable advice.'
    );

    // User context
    if (context.user) {
      parts.push(`\n\nUser Profile: ${JSON.stringify(context.user, null, 2)}`);
    }

    // Recent workouts
    if (context.recentWorkouts && context.recentWorkouts.length > 0) {
      parts.push('\n\nRecent Workouts:');
      context.recentWorkouts.forEach(workout => {
        parts.push(`- ${workout.name} (${workout.exercises.length} exercises)`);
      });
    }

    // Workout just logged
    if (context.workoutJustLogged) {
      parts.push(
        `\n\n✅ The user just logged a workout: ${context.workoutJustLogged.name} ` +
        `with ${context.workoutJustLogged.exercises.length} exercises.`
      );
    }

    // Sleep just logged
    if (context.sleepJustLogged) {
      parts.push(
        `\n\n😴 The user just logged sleep: ${context.sleepJustLogged.totalSleepTime} minutes, ` +
        `quality: ${context.sleepJustLogged.sleepQuality}`
      );
    }

    // Sleep readiness
    if (context.sleepReadiness) {
      parts.push(
        `\n\n💤 Sleep Readiness Score: ${context.sleepReadiness.score}/100 ` +
        `(${context.sleepReadiness.status})`
      );
    }

    // Streak data
    if (context.streakData) {
      parts.push(
        `\n\n🔥 Current Streak: ${context.streakData.currentStreak} days ` +
        `(Longest: ${context.streakData.longestStreak})`
      );
    }

    // Relevant memories
    if (context.memories && context.memories.length > 0) {
      parts.push('\n\nRelevant Memories:');
      context.memories.forEach(memory => {
        parts.push(`- ${memory.type}: ${memory.content}`);
      });
    }

    // Recent conversation
    if (context.lastMessages && context.lastMessages.length > 0) {
      parts.push('\n\nRecent Conversation:');
      context.lastMessages.slice(-3).forEach(msg => {
        parts.push(`${msg.role}: ${msg.content}`);
      });
    }

    // Current datetime
    parts.push(`\n\nCurrent Time: ${context.currentDateTime.display}`);

    // User message
    parts.push(`\n\nUser: ${message}`);
    parts.push('\n\nAssistant:');

    return parts.join('');
  }

  /**
   * Parse actions from AI response
   * Actions are marked with [ACTION:type:content]
   */
  private parseActions(text: string): AiAction[] {
    const actions: AiAction[] = [];
    const actionPattern = /\[ACTION:([^:]+):([^\]]+)\]/g;
    let match;

    while ((match = actionPattern.exec(text)) !== null) {
      actions.push({
        action: match[1] as any,
        content: match[2]
      });
    }

    return actions;
  }

  /**
   * Remove action markers from response text
   */
  private cleanResponseText(text: string): string {
    return text.replace(/\[ACTION:[^\]]+\]/g, '').trim();
  }

  /**
   * Fallback response when AI is unavailable
   */
  private getFallbackResponse(
    message: string,
    context: GeminiContext
  ): GeminiResponse {
    const messageLower = message.toLowerCase();

    // Workout logged
    if (context.workoutJustLogged) {
      return {
        reply: `Great job logging that ${context.workoutJustLogged.name}! ` +
               `Keep up the consistency! 💪`,
        actions: []
      };
    }

    // Sleep logged
    if (context.sleepJustLogged) {
      return {
        reply: `Thanks for logging your sleep! ` +
               `${context.sleepJustLogged.totalSleepTime} minutes of ` +
               `${context.sleepJustLogged.sleepQuality} quality rest. 😴`,
        actions: []
      };
    }

    // Asking about progress
    if (messageLower.includes('progress') || messageLower.includes('how am i doing')) {
      const streak = context.streakData?.currentStreak || 0;
      return {
        reply: `You're doing great! Current streak: ${streak} days. ` +
               `Keep pushing forward! 🔥`,
        actions: []
      };
    }

    // Default
    return {
      reply: "I'm here to help with your fitness journey! Tell me about your workouts, " +
             "sleep, or ask me anything about your progress. 💪",
      actions: []
    };
  }

  /**
   * Generate text embeddings for semantic search
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.genAI) {
        // Return dummy embedding if API not available
        return Array(768).fill(0).map(() => Math.random() * 2 - 1);
      }

      const embeddingModel = this.genAI.getGenerativeModel({ 
        model: 'embedding-001' 
      });
      
      const result = await embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return dummy embedding on error
      return Array(768).fill(0).map(() => Math.random() * 2 - 1);
    }
  }
}

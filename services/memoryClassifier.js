/**
 * Intelligent memory classification service
 * Determines what chat messages are worth storing as long-term memories
 */
class MemoryClassifier {
  constructor() {
    this.thresholds = {
      minScore: 0.7,
      maxContentLength: 500,
      minContentLength: 10
    };

    // Keywords that indicate lasting information
    this.permanentKeywords = {
      preferences: ['prefer', 'like', 'hate', 'dislike', 'favorite', 'love', 'avoid', 'never', 'always'],
      goals: ['goal', 'target', 'want to', 'trying to', 'aiming for', 'plan to', 'hope to'],
      constraints: ['can\'t', 'cannot', 'unable', 'difficulty', 'problem with', 'struggle with', 'limited by'],
      injuries: ['injury', 'injured', 'hurt', 'pain', 'sore', 'strain', 'tear', 'recovery', 'healing'],
      patterns: ['usually', 'typically', 'often', 'rarely', 'sometimes', 'pattern', 'routine', 'habit'],
      insights: ['learned', 'realized', 'discovered', 'found out', 'noticed', 'observation', 'insight']
    };

    // Sleep-specific keywords
    this.sleepKeywords = {
      sleep_pattern: ['sleep schedule', 'bedtime routine', 'sleep habit', 'sleep pattern', 'sleep cycle'],
      sleep_goal: ['sleep goal', 'want to sleep', 'sleep target', 'bedtime goal', 'wake time goal']
    };

    // Temporal keywords that indicate temporary vs lasting information
    this.temporalKeywords = {
      temporary: ['today', 'yesterday', 'right now', 'currently', 'this time', 'just now'],
      lasting: ['always', 'never', 'usually', 'typically', 'generally', 'from now on']
    };

    // Question words that usually indicate temporary queries
    this.questionWords = ['what', 'when', 'where', 'why', 'how', 'who', 'which', 'should'];
  }

  /**
   * Analyze a message and determine if it should be stored as long-term memory
   * @param {string} message - The user's message
   * @returns {Object} Classification result with type, score, reason, and content
   */
  classifyMemory(message) {
    if (!message || typeof message !== 'string') {
      return { shouldStore: false, reason: 'Invalid message' };
    }

    const content = message.trim();
    
    // Length checks
    if (content.length < this.thresholds.minContentLength) {
      return { shouldStore: false, reason: 'Message too short' };
    }
    
    if (content.length > this.thresholds.maxContentLength) {
      return { shouldStore: false, reason: 'Message too long' };
    }

    const messageLower = content.toLowerCase();
    
    // Skip if it's a question (usually temporary)
    const isQuestion = messageLower.includes('?') || 
      this.questionWords.some(word => messageLower.startsWith(word));
    
    if (isQuestion && !this.hasLastingContext(messageLower)) {
      return { shouldStore: false, reason: 'Temporary question' };
    }

    // Skip workout/sleep logs (already handled by parsers)
    if (this.isWorkoutLog(messageLower) || this.isSleepLog(messageLower)) {
      return { shouldStore: false, reason: 'Already logged by parsers' };
    }

    // Skip generic conversation
    if (this.isGenericConversation(messageLower)) {
      return { shouldStore: false, reason: 'Generic conversation' };
    }

    // Analyze for memory-worthy content
    const analysis = this.analyzeContent(messageLower);
    
    if (analysis.score >= this.thresholds.minScore) {
      return {
        shouldStore: true,
        type: analysis.type,
        content: this.cleanContent(content),
        score: analysis.score,
        reason: analysis.reason,
        meta: {
          keywords: analysis.keywords,
          confidence: analysis.score,
          timestamp: new Date()
        }
      };
    }

    return {
      shouldStore: false,
      reason: `Low relevance score: ${analysis.score} (threshold: ${this.thresholds.minScore})`,
      type: analysis.type
    };
  }

  /**
   * Analyze content for memory worthiness
   */
  analyzeContent(messageLower) {
    let maxScore = 0;
    let bestType = 'insight';
    let bestReason = 'General insight';
    let matchedKeywords = [];

    // Check each memory type
    for (const [type, keywords] of Object.entries(this.permanentKeywords)) {
      const matches = keywords.filter(keyword => messageLower.includes(keyword));
      if (matches.length > 0) {
        let score = matches.length * 0.3; // Base score from keyword matches
        
        // Boost score for lasting temporal context
        if (this.hasLastingContext(messageLower)) {
          score += 0.3;
        }
        
        // Boost for multiple related concepts
        if (matches.length > 1) {
          score += 0.2;
        }
        
        // Boost for specific statements
        if (this.hasSpecificStatements(messageLower)) {
          score += 0.3;
        }
        
        if (score > maxScore) {
          maxScore = score;
          bestType = type;
          bestReason = `Contains ${type} indicators: ${matches.join(', ')}`;
          matchedKeywords = matches;
        }
      }
    }

    // Check sleep-specific keywords
    for (const [type, keywords] of Object.entries(this.sleepKeywords)) {
      const matches = keywords.filter(keyword => messageLower.includes(keyword));
      if (matches.length > 0) {
        let score = matches.length * 0.4; // Slightly higher for sleep patterns
        
        if (this.hasLastingContext(messageLower)) {
          score += 0.3;
        }
        
        if (score > maxScore) {
          maxScore = score;
          bestType = type;
          bestReason = `Contains ${type} indicators: ${matches.join(', ')}`;
          matchedKeywords = matches;
        }
      }
    }

    // Check for explicit "remember" commands
    if (messageLower.includes('remember') || messageLower.includes('don\'t forget')) {
      maxScore = Math.max(maxScore, 0.9);
      bestReason = 'Explicit remember command';
    }

    return {
      score: Math.min(1.0, maxScore),
      type: bestType,
      reason: bestReason,
      keywords: matchedKeywords
    };
  }

  /**
   * Check if message has lasting context (not just temporary)
   */
  hasLastingContext(messageLower) {
    const hasLasting = this.temporalKeywords.lasting.some(word => messageLower.includes(word));
    const hasTemporary = this.temporalKeywords.temporary.some(word => messageLower.includes(word));
    
    // Lasting context wins over temporary
    return hasLasting || (!hasTemporary && !messageLower.includes('today') && !messageLower.includes('now'));
  }

  /**
   * Check for specific, actionable statements
   */
  hasSpecificStatements(messageLower) {
    const specificPatterns = [
      /i (always|never|usually|typically) (do|don't|like|hate|prefer)/,
      /my (goal|target|preference) is/,
      /i (can't|cannot|won't|will not) (do|perform|handle)/,
      /i have (trouble|difficulty|problems?) with/,
      /my (injury|limitation|constraint)/,
      /i (discovered|learned|realized|found) that/
    ];
    
    return specificPatterns.some(pattern => pattern.test(messageLower));
  }

  /**
   * Check if message is a workout log (already handled by WorkoutParser)
   */
  isWorkoutLog(messageLower) {
    const workoutLogIndicators = [
      /\d+x\d+/, // 3x10
      /\d+\s*(sets?|reps?|kg|lb|minutes?|mins?)/, // 3 sets, 10 reps, 80kg
      /(did|completed|finished).*workout/,
      /(squats?|deadlifts?|bench|press|curls?|rows?)/
    ];
    
    return workoutLogIndicators.some(pattern => pattern.test(messageLower));
  }

  /**
   * Check if message is a sleep log (already handled by SleepParser)
   */
  isSleepLog(messageLower) {
    const sleepLogIndicators = [
      /slept.*\d+.*hours?/,
      /went to bed.*\d+/,
      /woke up.*\d+/,
      /sleep.*quality.*\d+/,
      /\d+.*hours?.*sleep/
    ];
    
    return sleepLogIndicators.some(pattern => pattern.test(messageLower));
  }

  /**
   * Check if message is generic conversation
   */
  isGenericConversation(messageLower) {
    const genericPhrases = [
      'hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no',
      'good morning', 'good night', 'goodbye', 'bye', 'see you', 'cool', 'nice',
      'great', 'awesome', 'sounds good', 'perfect', 'got it'
    ];
    
    const isShort = messageLower.length < 50;
    const isGeneric = genericPhrases.some(phrase => 
      messageLower === phrase || 
      (messageLower.startsWith(phrase) && messageLower.length < phrase.length + 10)
    );
    
    return isShort && isGeneric;
  }

  /**
   * Clean content for storage
   */
  cleanContent(content) {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n]+/g, ' ') // Remove line breaks
      .trim();
  }

  /**
   * Get classification summary for debugging
   */
  getClassificationSummary(message) {
    const result = this.classifyMemory(message);
    return {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      shouldStore: result.shouldStore,
      type: result.type,
      score: result.score,
      reason: result.reason
    };
  }
}

export default new MemoryClassifier();
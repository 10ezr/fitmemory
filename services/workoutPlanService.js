/**
 * Workout Plan Service
 * Handles intelligent caching, context-aware updates, and plan generation for tomorrow's workouts
 */

class WorkoutPlanService {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Set();
  }

  /**
   * Generate a context-aware cache key
   */
  generateCacheKey(date, context) {
    const relevant = {
      date,
      recentWorkouts: context.recentWorkouts?.slice(0, 2).map(w => ({
        date: w.date,
        exercises: w.exercises?.map(e => e.name).slice(0, 3)
      })),
      streak: context.streakData?.currentStreak,
      lastWorkout: context.streakData?.lastWorkoutDate
    };
    
    return `plan_${JSON.stringify(relevant).replace(/\s/g, '')}`;
  }

  /**
   * Check if a cached plan is still valid
   */
  isCacheValid(cacheEntry, maxAge = 6 * 60 * 60 * 1000) {
    if (!cacheEntry) return false;
    
    const age = Date.now() - cacheEntry.timestamp;
    return age < maxAge;
  }

  /**
   * Get a cached plan or null if not available/valid
   */
  getCachedPlan(date, context) {
    const key = this.generateCacheKey(date, context);
    const cached = this.cache.get(key);
    
    if (this.isCacheValid(cached)) {
      console.log('[WorkoutPlanService] Using cached plan:', key);
      return {
        ...cached.plan,
        source: 'cache',
        cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000 / 60) // minutes
      };
    }
    
    return null;
  }

  /**
   * Store a plan in cache
   */
  cachePlan(date, context, plan) {
    const key = this.generateCacheKey(date, context);
    
    this.cache.set(key, {
      plan,
      timestamp: Date.now(),
      context: {
        date,
        workoutCount: context.recentWorkouts?.length || 0,
        streak: context.streakData?.currentStreak || 0
      }
    });
    
    console.log('[WorkoutPlanService] Cached plan:', key);
    
    // Clean old entries (keep max 10)
    if (this.cache.size > 10) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Invalidate cache when workout is completed
   */
  invalidateOnWorkoutComplete() {
    console.log('[WorkoutPlanService] Invalidating cache due to workout completion');
    this.cache.clear();
    this.notifySubscribers('workout-complete');
  }

  /**
   * Determine if plan should be regenerated based on context changes
   */
  shouldRegenerate(lastContext, currentContext) {
    if (!lastContext) return true;
    
    // Check if significant context changes occurred
    const lastWorkouts = lastContext.recentWorkouts?.slice(0, 2) || [];
    const currentWorkouts = currentContext.recentWorkouts?.slice(0, 2) || [];
    
    // New workout added
    if (currentWorkouts.length > lastWorkouts.length) {
      console.log('[WorkoutPlanService] New workout detected, should regenerate');
      return true;
    }
    
    // Streak changed significantly
    const streakChange = Math.abs(
      (currentContext.streakData?.currentStreak || 0) - 
      (lastContext.streakData?.currentStreak || 0)
    );
    
    if (streakChange > 0) {
      console.log('[WorkoutPlanService] Streak changed, should regenerate');
      return true;
    }
    
    return false;
  }

  /**
   * Generate workout plan with intelligent caching
   */
  async generatePlan(date, context, geminiService, options = {}) {
    const { forceRefresh = false, maxRetries = 2 } = options;
    
    // Try cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = this.getCachedPlan(date, context);
      if (cached) return cached;
    }
    
    // Generate new plan
    const tomorrowDate = new Date(date);
    const dayName = tomorrowDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dateKey = tomorrowDate.toISOString().slice(0, 10);
    
    const prompt = this.buildPrompt(dayName, dateKey, context);
    
    let attempt = 0;
    let lastError = null;
    
    while (attempt < maxRetries) {
      try {
        console.log(`[WorkoutPlanService] Generating plan (attempt ${attempt + 1})`);
        
        const { reply } = await geminiService.generateResponse(prompt, context);
        
        if (!reply) {
          throw new Error('No response from Gemini');
        }
        
        const plan = this.parsePlan(reply, `${dayName}'s Workout`);
        
        if (!plan || plan.exercises.length === 0) {
          throw new Error('Failed to parse workout plan from response');
        }
        
        // Cache the successful plan
        this.cachePlan(date, context, plan);
        
        return {
          ...plan,
          source: 'ai-generated',
          attempt: attempt + 1
        };
        
      } catch (error) {
        console.error(`[WorkoutPlanService] Attempt ${attempt + 1} failed:`, error.message);
        lastError = error;
        attempt++;
        
        // Wait before retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All attempts failed, return fallback
    console.warn('[WorkoutPlanService] All attempts failed, using fallback');
    return this.getFallbackPlan(dayName, lastError);
  }

  /**
   * Build context-aware prompt for Gemini
   */
  buildPrompt(dayName, dateKey, context) {
    const recentWorkouts = context.recentWorkouts?.slice(0, 3) || [];
    const streak = context.streakData?.currentStreak || 0;
    
    let workoutHistory = '';
    if (recentWorkouts.length > 0) {
      workoutHistory = `\n\nRecent workouts:\n${recentWorkouts.map(w => 
        `${new Date(w.date).toLocaleDateString()}: ${w.exercises?.map(e => e.name).join(', ')}`
      ).join('\n')}`;
    }
    
    let streakContext = '';
    if (streak > 0) {
      streakContext = `\n\nCurrent streak: ${streak} days. `;
      if (streak >= 7) {
        streakContext += 'Great momentum! ';
      } else if (streak >= 3) {
        streakContext += 'Building consistency. ';
      }
    }
    
    return `Create tomorrow's workout plan (${dayName}, ${dateKey}). 

Based on my home gym setup (curl bar max 25kg, bodyweight exercises) and training history, design a focused session.${workoutHistory}${streakContext}

Format exactly as follows:
## Tomorrow's [Focus] Workout
**Duration:** XX min
**Main Exercises:**
- Exercise 1: 3×10-12
- Exercise 2: 3×8-10  
- Exercise 3: 3×10-15
- Exercise 4: 2×30-60s
- Exercise 5: 3×8-12

Consider progression, recovery needs, and equipment limitations. Keep it practical for home training.`;
  }

  /**
   * Enhanced parsing with multiple strategies
   */
  parsePlan(md, fallbackName = "Tomorrow's Workout") {
    if (!md || typeof md !== "string") {
      return null;
    }

    const lines = md.replace(/\r\n/g, "\n").split(/\n/).map(l => l.trim()).filter(l => l);
    const plan = {
      name: fallbackName,
      estimatedDuration: 35,
      exercises: []
    };

    let currentSection = "";
    let foundExercises = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Look for workout title
      const titleMatch = line.match(/^#+\s*(.+?(?:workout|session|training|plan|routine)).*$/i);
      if (titleMatch) {
        plan.name = titleMatch[1].replace(/^Today/i, "Tomorrow").replace(/^today/i, "tomorrow").trim();
        continue;
      }

      // Look for duration
      const durationMatch = line.match(/(\d{1,3})\s*(?:min|minutes?)/i);
      if (durationMatch) {
        plan.estimatedDuration = Math.max(15, Math.min(120, parseInt(durationMatch[1], 10)));
        continue;
      }

      // Parse exercises
      const exercise = this.parseExerciseLine(line);
      if (exercise) {
        plan.exercises.push(exercise);
        foundExercises = true;
      }
    }

    // Fallback if no exercises found
    if (plan.exercises.length === 0) {
      plan.exercises = this.getDefaultExercises();
    }

    return plan;
  }

  /**
   * Parse individual exercise line
   */
  parseExerciseLine(line) {
    // Pattern 1: "- Push-ups 3×10" or "* Push-ups 3x10"
    let match = line.match(/^[\-\*]\s*(.+?)\s+(\d+)\s*[×x]\s*([\dA-Za-z\-]+)(?:\s|$)/i);
    if (match) {
      return {
        name: match[1].trim(),
        sets: parseInt(match[2]),
        reps: match[3]
      };
    }

    // Pattern 2: "- Push-ups: 3 sets of 10"
    match = line.match(/^[\-\*]\s*(.+?):\s*(\d+)\s*sets?\s*(?:of\s*)?(\d+|[\dA-Za-z\-]+)/i);
    if (match) {
      return {
        name: match[1].trim(),
        sets: parseInt(match[2]),
        reps: match[3]
      };
    }

    // Pattern 3: Just exercise name with bullet
    match = line.match(/^[\-\*]\s*([A-Za-z][A-Za-z\s\-']+)\s*$/i);
    if (match && match[1].length > 3) {
      return {
        name: match[1].trim(),
        sets: 3,
        reps: "10-12"
      };
    }

    return null;
  }

  /**
   * Get default exercises when parsing fails
   */
  getDefaultExercises() {
    return [
      { name: "Push-ups", sets: 3, reps: "10-15" },
      { name: "Bodyweight Squats", sets: 3, reps: "15-20" },
      { name: "Curl Bar Bicep Curls", sets: 3, reps: "10-12" },
      { name: "Plank", sets: 3, reps: "30-45s" },
      { name: "Lunges", sets: 2, reps: "10 each leg" }
    ];
  }

  /**
   * Get fallback plan when all generation attempts fail
   */
  getFallbackPlan(dayName, error) {
    return {
      name: `${dayName}'s Recovery Workout`,
      estimatedDuration: 25,
      exercises: this.getDefaultExercises(),
      source: 'fallback',
      error: error?.message || 'Generation failed'
    };
  }

  /**
   * Subscribe to plan updates
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify subscribers of changes
   */
  notifySubscribers(event) {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[WorkoutPlanService] Subscriber error:', error);
      }
    });
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[WorkoutPlanService] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Math.floor((Date.now() - value.timestamp) / 1000 / 60), // minutes
        context: value.context
      }))
    };
  }
}

// Export singleton instance
const workoutPlanService = new WorkoutPlanService();
export default workoutPlanService;
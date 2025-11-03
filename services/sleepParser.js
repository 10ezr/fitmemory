import { SleepSession } from '@/models/index.js';

/**
 * Enhanced sleep parser with precise timestamp handling
 * Processes natural language sleep descriptions with exact timing
 */
class SleepParser {
  constructor() {
    // Enhanced time patterns with more precision
    this.timePatterns = {
      bedtime: /(?:went to bed|bedtime|bed time|got to bed|in bed)(?:\s+(?:at|around|by)?\s*)([0-9]{1,2}(?:[:.]?[0-9]{2})?\s*(?:am|pm|AM|PM)?)/gi,
      sleepTime: /(?:fell asleep|sleep time|actually slept|dozed off)(?:\s+(?:at|around|by)?\s*)([0-9]{1,2}(?:[:.]?[0-9]{2})?\s*(?:am|pm|AM|PM)?)/gi,
      wakeTime: /(?:woke up|wake time|awoke|woke|got up)(?:\s+(?:at|around|by)?\s*)([0-9]{1,2}(?:[:.]?[0-9]{2})?\s*(?:am|pm|AM|PM)?)/gi,
      currentTime: /(?:right now|just now|currently|at this time)/gi
    };

    // Duration patterns with more flexibility
    this.durationPatterns = {
      total: /(?:slept|sleep|total sleep)(?:\s+(?:for|about|around)?\s*)([0-9]+(?:\.[0-9]+)?)\s*(?:hours?|hrs?|h)/gi,
      inBed: /(?:in bed|time in bed)(?:\s+(?:for|about|around)?\s*)([0-9]+(?:\.[0-9]+)?)\s*(?:hours?|hrs?|h)/gi
    };

    // Enhanced quality patterns
    this.qualityPatterns = {
      rating: /(?:quality|sleep quality|rating)(?:\s+(?:was|is)?\s*)([0-9]+(?:\.[0-9]+)?)(?:\/10|\s*(?:out of|of)\s*10)?/gi,
      descriptive: {
        terrible: /(?:terrible|awful|horrible|worst|1\/10|2\/10)/gi,
        poor: /(?:poor|bad|restless|3\/10|4\/10)/gi,
        okay: /(?:okay|ok|average|decent|5\/10|6\/10)/gi,
        good: /(?:good|well|rested|7\/10|8\/10)/gi,
        excellent: /(?:excellent|amazing|perfect|great|9\/10|10\/10)/gi
      }
    };

    // Mood patterns
    this.moodPatterns = {
      terrible: /(?:exhausted|drained|zombie|dead|terrible)/gi,
      poor: /(?:tired|groggy|sluggish|poor|rough)/gi,
      okay: /(?:okay|ok|average|normal)/gi,
      good: /(?:good|fresh|rested|alert)/gi,
      excellent: /(?:excellent|amazing|energized|fantastic)/gi
    };

    // Interruption patterns
    this.interruptionPatterns = {
      wakeups: /(?:woke up|woke|awakened)\s*([0-9]+)\s*(?:times?|x)/gi,
      bathroom: /(?:bathroom|pee|toilet|restroom)/gi,
      noise: /(?:noise|noisy|loud|neighbors?|traffic)/gi,
      stress: /(?:stress|anxiety|worried|thinking)/gi,
      pain: /(?:pain|ache|discomfort|sore)/gi
    };
  }

  /**
   * Check if a message contains sleep-related content
   */
  static isSleepMessage(message) {
    if (!message || typeof message !== 'string') return false;
    
    const sleepKeywords = [
      'sleep', 'slept', 'sleeping', 'bedtime', 'bed time', 'wake up', 'woke up',
      'fell asleep', 'went to bed', 'got up', 'tired', 'exhausted', 'rested',
      'insomnia', 'nightmare', 'dream', 'nap', 'doze', 'drowsy', 'sleepy',
      'sleep quality', 'sleep duration', 'interrupted sleep'
    ];
    
    const logPatterns = [
      /sleep.*hours?/i,
      /went to bed/i,
      /woke up/i,
      /fell asleep/i,
      /quality.*\d/i,
      /slept.*\d/i,
      /hours?.*sleep/i,
      /\d{1,2}:\d{2}\s*(?:am|pm)/i // Time patterns
    ];
    
    const messageLower = message.toLowerCase();
    const hasKeyword = sleepKeywords.some(keyword => messageLower.includes(keyword));
    const matchesPattern = logPatterns.some(pattern => pattern.test(message));
    
    return hasKeyword || matchesPattern;
  }

  /**
   * Parse sleep description with precise timestamp context
   * @param {string} text - Natural language sleep description
   * @param {Object} currentDateTime - Current timestamp context with timezone info
   * @returns {Object} Parsed sleep data with proper timezone handling
   */
  parseSleepDescription(text, currentDateTime = null) {
    if (!text || typeof text !== 'string') {
      throw new Error('Sleep description is required');
    }

    const now = currentDateTime?.epochMs ? new Date(currentDateTime.epochMs) : new Date();
    const timezone = currentDateTime?.timezone || 'Asia/Kolkata';
    
    console.log(`🕐 Parsing sleep with context time: ${now.toISOString()} (${timezone})`);

    const sleepData = {
      date: this.normalizeToSleepDate(now),
      notes: text.trim(),
      timezone,
      parsedAt: now
    };

    // Parse all components
    const times = this.parseTimes(text, now);
    const durations = this.parseDurations(text);
    const quality = this.parseQuality(text);
    const mood = this.parseMood(text);
    const interruptions = this.parseInterruptions(text);

    // Merge all parsed data
    Object.assign(sleepData, times, durations, quality);
    if (mood) sleepData.mood = mood;
    if (interruptions.length > 0) sleepData.interruptions = interruptions;

    // Calculate derived values
    this.calculateDerivedValues(sleepData);

    console.log(`😴 Parsed sleep data:`, {
      date: sleepData.date.toISOString(),
      duration: sleepData.totalSleepTime,
      quality: sleepData.sleepQuality,
      bedTime: sleepData.bedTime?.toISOString(),
      wakeTime: sleepData.wakeTime?.toISOString()
    });

    return sleepData;
  }

  /**
   * Parse times with current datetime context
   */
  parseTimes(text, contextTime) {
    const times = {};
    
    // Handle "right now" or "currently" for current time
    if (this.timePatterns.currentTime.test(text)) {
      // Determine if this is bedtime or wake time based on hour
      const hour = contextTime.getHours();
      if (hour >= 20 || hour <= 2) {
        times.bedTime = new Date(contextTime);
      } else if (hour >= 5 && hour <= 11) {
        times.wakeTime = new Date(contextTime);
      }
    }
    
    // Extract explicit times
    Object.entries(this.timePatterns).forEach(([key, pattern]) => {
      if (key === 'currentTime') return; // Already handled
      
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const timeStr = matches[matches.length - 1][1]; // Use last match
        const parsedTime = this.parseTimeString(timeStr, contextTime);
        if (parsedTime) {
          times[key] = parsedTime;
        }
      }
    });

    return times;
  }

  /**
   * Parse time string with context awareness
   */
  parseTimeString(timeStr, contextTime) {
    if (!timeStr) return null;
    
    let cleaned = timeStr.toLowerCase().trim();
    let hours, minutes = 0;

    // Parse time components
    if (cleaned.includes(':') || cleaned.includes('.')) {
      const parts = cleaned.split(/[:.]/);
      hours = parseInt(parts[0]);
      minutes = parseInt(parts[1]) || 0;
    } else {
      hours = parseInt(cleaned.replace(/[^0-9]/g, ''));
    }

    // Handle AM/PM
    if (cleaned.includes('pm') && hours !== 12) {
      hours += 12;
    } else if (cleaned.includes('am') && hours === 12) {
      hours = 0;
    } else if (!cleaned.includes('am') && !cleaned.includes('pm')) {
      // Smart detection based on context and hour
      const contextHour = contextTime.getHours();
      
      // Bedtime heuristics
      if (hours >= 8 && hours <= 11) {
        hours += 12; // Assume PM for bedtime 8-11
      }
      // Wake time heuristics
      else if (hours >= 1 && hours <= 7 && contextHour >= 6) {
        // Keep as AM for wake times
      }
      // If it's currently evening and time is 1-7, probably next morning
      else if (hours >= 1 && hours <= 7 && contextHour >= 18) {
        // Keep as AM but for next day
      }
    }

    // Create the time object
    const timeObj = new Date(contextTime);
    timeObj.setHours(hours, minutes, 0, 0);
    
    // Adjust date if necessary
    // If parsed time is significantly in the future, it was probably yesterday
    if (timeObj > contextTime && (timeObj - contextTime) > 12 * 60 * 60 * 1000) {
      timeObj.setDate(timeObj.getDate() - 1);
    }
    // If it's a morning wake time and current time is also morning, it's today
    else if (hours <= 12 && contextTime.getHours() <= 12 && contextTime.getHours() >= 6) {
      // Keep as today
    }

    return timeObj;
  }

  /**
   * Normalize date to the logical "sleep date" (the night you went to bed)
   */
  normalizeToSleepDate(dateTime) {
    const sleepDate = new Date(dateTime);
    
    // If it's early morning (before 12 PM), the sleep date is actually yesterday
    if (sleepDate.getHours() < 12) {
      sleepDate.setDate(sleepDate.getDate() - 1);
    }
    
    sleepDate.setHours(0, 0, 0, 0);
    return sleepDate;
  }

  parseDurations(text) {
    const durations = {};
    
    Object.entries(this.durationPatterns).forEach(([key, pattern]) => {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const hours = parseFloat(matches[0][1]);
        if (key === 'total') {
          durations.totalSleepTime = Math.round(hours * 60);
        } else if (key === 'inBed') {
          durations.totalTimeInBed = Math.round(hours * 60);
        }
      }
    });

    return durations;
  }

  parseQuality(text) {
    const quality = {};
    
    // Try numeric rating first
    const ratingMatches = [...text.matchAll(this.qualityPatterns.rating)];
    if (ratingMatches.length > 0) {
      const rating = parseFloat(ratingMatches[0][1]);
      quality.sleepQuality = Math.max(1, Math.min(10, rating));
      return quality;
    }

    // Try descriptive quality
    for (const [level, pattern] of Object.entries(this.qualityPatterns.descriptive)) {
      if (pattern.test(text)) {
        quality.sleepQuality = this.mapDescriptiveQuality(level);
        break;
      }
    }

    return quality;
  }

  parseMood(text) {
    for (const [mood, pattern] of Object.entries(this.moodPatterns)) {
      if (pattern.test(text)) {
        return mood;
      }
    }
    return null;
  }

  parseInterruptions(text) {
    const interruptions = [];
    
    // Count general wake-ups
    const wakeupMatches = [...text.matchAll(this.interruptionPatterns.wakeups)];
    const wakeupCount = wakeupMatches.length > 0 ? parseInt(wakeupMatches[0][1]) : 0;
    
    // Identify reasons
    const reasons = [];
    Object.entries(this.interruptionPatterns).forEach(([reason, pattern]) => {
      if (reason !== 'wakeups' && pattern.test(text)) {
        reasons.push(reason);
      }
    });

    // Create interruption objects
    if (wakeupCount > 0) {
      for (let i = 0; i < wakeupCount; i++) {
        interruptions.push({
          reason: reasons[i] || 'unknown',
          duration: 5 // Default 5 minutes
        });
      }
    } else if (reasons.length > 0) {
      interruptions.push({
        reason: reasons[0],
        duration: 5
      });
    }

    return interruptions;
  }

  mapDescriptiveQuality(level) {
    const mapping = {
      terrible: 2,
      poor: 4,
      okay: 6,
      good: 8,
      excellent: 10
    };
    return mapping[level] || 6;
  }

  calculateDerivedValues(sleepData) {
    // Calculate sleep efficiency if we have both values
    if (sleepData.totalSleepTime && sleepData.totalTimeInBed) {
      sleepData.sleepEfficiency = Math.round((sleepData.totalSleepTime / sleepData.totalTimeInBed) * 100);
    }

    // Estimate total sleep time from bed/wake times if not provided
    if (sleepData.bedTime && sleepData.wakeTime && !sleepData.totalSleepTime) {
      const bedMs = sleepData.bedTime.getTime();
      let wakeMs = sleepData.wakeTime.getTime();
      
      // If wake time is before bed time, assume next day
      if (wakeMs <= bedMs) {
        wakeMs += 24 * 60 * 60 * 1000;
      }
      
      const diffMs = wakeMs - bedMs;
      sleepData.totalTimeInBed = Math.round(diffMs / (1000 * 60));
      
      // Estimate actual sleep (assume 15 min to fall asleep, subtract interruptions)
      let estimatedSleep = sleepData.totalTimeInBed - 15;
      if (sleepData.interruptions) {
        const interruptionTime = sleepData.interruptions.reduce((sum, i) => sum + (i.duration || 5), 0);
        estimatedSleep -= interruptionTime;
      }
      sleepData.totalSleepTime = Math.max(0, estimatedSleep);
    }

    // Set default quality if not provided
    if (!sleepData.sleepQuality) {
      sleepData.sleepQuality = 6;
    }

    // Calculate efficiency if we now have the values
    if (sleepData.totalSleepTime && sleepData.totalTimeInBed && !sleepData.sleepEfficiency) {
      sleepData.sleepEfficiency = Math.round((sleepData.totalSleepTime / sleepData.totalTimeInBed) * 100);
    }
  }

  /**
   * Create or update sleep session in database with precise timing
   */
  async saveSleepSession(sleepData) {
    try {
      const normalizedDate = sleepData.date;
      
      console.log(`💾 Saving sleep session for date: ${normalizedDate.toISOString()}`);
      
      // Check if sleep session already exists for this date
      const existingSession = await SleepSession.findOne({
        date: normalizedDate
      });

      if (existingSession) {
        // Update existing session, preserving ID
        Object.assign(existingSession, {
          ...sleepData,
          date: normalizedDate,
          updatedAt: new Date()
        });
        await existingSession.save();
        console.log(`✏️ Updated existing sleep session: ${existingSession._id}`);
        return existingSession;
      } else {
        // Create new session
        const newSession = new SleepSession({
          ...sleepData,
          date: normalizedDate
        });
        await newSession.save();
        console.log(`✨ Created new sleep session: ${newSession._id}`);
        return newSession;
      }
    } catch (error) {
      console.error('Error saving sleep session:', error);
      throw error;
    }
  }
}

export default new SleepParser();
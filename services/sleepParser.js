import { SleepSession } from '@/models/index.js';

/**
 * Parses natural language sleep descriptions into structured data
 * Similar to workoutParser but for sleep sessions
 */
class SleepParser {
  constructor() {
    // Time patterns
    this.timePatterns = {
      bedtime: /(?:went to bed|bedtime|bed time|got to bed|in bed)(?:\s+(?:at|around|by)?\s*)([0-9]{1,2}(?:[:.]?[0-9]{2})?\s*(?:am|pm|AM|PM)?)/gi,
      sleepTime: /(?:fell asleep|sleep time|actually slept|dozed off)(?:\s+(?:at|around|by)?\s*)([0-9]{1,2}(?:[:.]?[0-9]{2})?\s*(?:am|pm|AM|PM)?)/gi,
      wakeTime: /(?:woke up|wake time|awoke|woke)(?:\s+(?:at|around|by)?\s*)([0-9]{1,2}(?:[:.]?[0-9]{2})?\s*(?:am|pm|AM|PM)?)/gi,
      getUpTime: /(?:got up|get up time|out of bed|left bed)(?:\s+(?:at|around|by)?\s*)([0-9]{1,2}(?:[:.]?[0-9]{2})?\s*(?:am|pm|AM|PM)?)/gi
    };

    // Duration patterns
    this.durationPatterns = {
      total: /(?:slept|sleep|total sleep)(?:\s+(?:for|about|around)?\s*)([0-9]+(?:\.[0-9]+)?)\s*(?:hours?|hrs?|h)/gi,
      inBed: /(?:in bed|time in bed)(?:\s+(?:for|about|around)?\s*)([0-9]+(?:\.[0-9]+)?)\s*(?:hours?|hrs?|h)/gi
    };

    // Quality patterns
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

    // Environment patterns
    this.environmentPatterns = {
      temperature: {
        hot: /(?:hot|warm|too warm|stuffy|sweaty)/gi,
        cold: /(?:cold|chilly|too cold|freezing)/gi,
        comfortable: /(?:comfortable|good temp|perfect)/gi
      },
      noise: {
        quiet: /(?:quiet|silent|peaceful)/gi,
        moderate: /(?:some noise|moderate|normal)/gi,
        noisy: /(?:noisy|loud|disruptive)/gi
      },
      light: {
        dark: /(?:dark|pitch black|blackout)/gi,
        dim: /(?:dim|low light|soft light)/gi,
        bright: /(?:bright|too bright|light)/gi
      }
    };

    // Tag patterns
    this.tagPatterns = {
      caffeine: /(?:coffee|caffeine|tea|energy drink|late coffee)/gi,
      alcohol: /(?:alcohol|wine|beer|drink|drinks)/gi,
      exercise: /(?:workout|exercise|gym|run|training)/gi,
      stress: /(?:stress|work|deadline|anxiety)/gi,
      screen: /(?:phone|tv|screen|laptop|computer)/gi,
      food: /(?:late meal|dinner|snack|heavy meal)/gi
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
      /hours?.*sleep/i
    ];
    
    const messageLower = message.toLowerCase();
    const hasKeyword = sleepKeywords.some(keyword => messageLower.includes(keyword));
    const matchesPattern = logPatterns.some(pattern => pattern.test(message));
    
    return hasKeyword || matchesPattern;
  }

  /**
   * Parse natural language sleep description
   * @param {string} text - Natural language sleep description
   * @param {Date} date - Date of sleep session (optional, defaults to today)
   * @returns {Object} Parsed sleep data
   */
  parseSleepDescription(text, date = new Date()) {
    if (!text || typeof text !== 'string') {
      throw new Error('Sleep description is required');
    }

    const sleepData = {
      date: this.normalizeDate(date),
      notes: text.trim()
    };

    // Parse times
    const times = this.parseTimes(text);
    Object.assign(sleepData, times);

    // Parse durations
    const durations = this.parseDurations(text);
    Object.assign(sleepData, durations);

    // Parse quality
    const quality = this.parseQuality(text);
    Object.assign(sleepData, quality);

    // Parse mood
    const mood = this.parseMood(text);
    if (mood) sleepData.mood = mood;

    // Parse interruptions
    const interruptions = this.parseInterruptions(text);
    if (interruptions.length > 0) sleepData.interruptions = interruptions;

    // Parse environment
    const environment = this.parseEnvironment(text);
    if (Object.keys(environment).length > 0) sleepData.environment = environment;

    // Parse tags
    const tags = this.parseTags(text);
    if (tags.length > 0) sleepData.tags = tags;

    // Calculate derived values
    this.calculateDerivedValues(sleepData);

    return sleepData;
  }

  parseTimes(text) {
    const times = {};
    
    // Extract times using patterns
    Object.entries(this.timePatterns).forEach(([key, pattern]) => {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const timeStr = matches[matches.length - 1][1]; // Use last match
        times[key] = this.parseTimeString(timeStr);
      }
    });

    return times;
  }

  parseDurations(text) {
    const durations = {};
    
    Object.entries(this.durationPatterns).forEach(([key, pattern]) => {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const hours = parseFloat(matches[0][1]);
        if (key === 'total') {
          durations.totalSleepTime = Math.round(hours * 60); // Convert to minutes
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
      // At least one interruption if reasons found
      interruptions.push({
        reason: reasons[0],
        duration: 5
      });
    }

    return interruptions;
  }

  parseEnvironment(text) {
    const environment = {};
    
    // Temperature
    Object.entries(this.environmentPatterns.temperature).forEach(([temp, pattern]) => {
      if (pattern.test(text)) {
        if (temp === 'hot') environment.roomTemp = 26; // Celsius
        else if (temp === 'cold') environment.roomTemp = 18;
        else environment.roomTemp = 22;
      }
    });

    // Noise level
    Object.entries(this.environmentPatterns.noise).forEach(([level, pattern]) => {
      if (pattern.test(text)) {
        environment.noiseLevel = level;
      }
    });

    // Light level
    Object.entries(this.environmentPatterns.light).forEach(([level, pattern]) => {
      if (pattern.test(text)) {
        environment.lightLevel = level;
      }
    });

    return environment;
  }

  parseTags(text) {
    const tags = [];
    
    Object.entries(this.tagPatterns).forEach(([tag, pattern]) => {
      if (pattern.test(text)) {
        tags.push(tag);
      }
    });

    return tags;
  }

  parseTimeString(timeStr) {
    if (!timeStr) return null;
    
    // Clean and normalize time string
    let cleaned = timeStr.toLowerCase().trim();
    
    // Handle different formats
    if (cleaned.includes(':') || cleaned.includes('.')) {
      const parts = cleaned.split(/[:.]/);
      let hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]) || 0;
      
      // Handle AM/PM
      if (cleaned.includes('pm') && hours !== 12) hours += 12;
      if (cleaned.includes('am') && hours === 12) hours = 0;
      
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    } else {
      // Just hour
      let hours = parseInt(cleaned.replace(/[^0-9]/g, ''));
      
      // Smart AM/PM detection for bedtime
      if (!cleaned.includes('am') && !cleaned.includes('pm')) {
        // Bedtime heuristics (assume PM for 8-11, AM for wake times 1-7)
        if (hours >= 8 && hours <= 11) {
          hours += 12; // PM for bedtime
        } else if (hours >= 1 && hours <= 7) {
          // Keep as AM for wake time
        } else if (hours === 12) {
          // Keep as noon
        }
      } else {
        if (cleaned.includes('pm') && hours !== 12) hours += 12;
        if (cleaned.includes('am') && hours === 12) hours = 0;
      }
      
      const date = new Date();
      date.setHours(hours, 0, 0, 0);
      return date;
    }
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
      const wakeMs = sleepData.wakeTime.getTime();
      const diffMs = wakeMs > bedMs ? wakeMs - bedMs : (wakeMs + 24*60*60*1000) - bedMs;
      sleepData.totalTimeInBed = Math.round(diffMs / (1000 * 60));
      
      // Estimate actual sleep (assume 15 min to fall asleep, subtract interruptions)
      let estimatedSleep = sleepData.totalTimeInBed - 15;
      if (sleepData.interruptions) {
        const interruptionTime = sleepData.interruptions.reduce((sum, i) => sum + (i.duration || 5), 0);
        estimatedSleep -= interruptionTime;
      }
      sleepData.totalSleepTime = Math.max(0, estimatedSleep);
    }

    // Set default quality if not provided but we have other indicators
    if (!sleepData.sleepQuality) {
      sleepData.sleepQuality = 6; // Default to "okay"
    }
  }

  normalizeDate(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Create or update sleep session in database
   */
  async saveSleepSession(sleepData) {
    try {
      // Normalize the date for consistent querying
      const normalizedDate = this.normalizeDate(sleepData.date);
      
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
        return existingSession;
      } else {
        // Create new session
        const newSession = new SleepSession({
          ...sleepData,
          date: normalizedDate
        });
        await newSession.save();
        return newSession;
      }
    } catch (error) {
      console.error('Error saving sleep session:', error);
      throw error;
    }
  }
}

export default new SleepParser();
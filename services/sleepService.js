import { SleepSession, SleepGoals, SleepPatterns, Workout, Memory } from '@/models/index.js';
import sleepParser from './sleepParser.js';

/**
 * Sleep service for managing sleep data, analytics, and correlations
 */
class SleepService {
  constructor() {
    this.defaultGoals = {
      targetBedTime: "22:30",
      targetWakeTime: "06:30",
      targetSleepDuration: 480, // 8 hours in minutes
      sleepQualityGoal: 8,
      preferences: {
        trackingMethods: ['manual'],
        reminderEnabled: true,
        reminderTime: "21:30",
        weekendFlexibility: true
      }
    };
  }

  /**
   * Check if a message is sleep-related - use parser's static method
   */
  isSleepMessage(message) {
    // Import the parser's static method logic
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
   * Process natural language sleep input and save to database
   */
  async logSleep(text, date = new Date()) {
    try {
      const sleepData = sleepParser.parseSleepDescription(text, date);
      const session = await sleepParser.saveSleepSession(sleepData);
      
      // Update patterns after logging
      await this.updateSleepPatterns();
      
      // Create memory if significant
      await this.createSleepMemoryIfSignificant(session);
      
      return {
        session,
        summary: this.generateSessionSummary(session),
        insights: await this.generateSleepInsights(session)
      };
    } catch (error) {
      console.error('Error logging sleep:', error);
      throw error;
    }
  }

  /**
   * Get recent sleep sessions
   */
  async getRecentSleep(limit = 7) {
    try {
      return await SleepSession.find()
        .sort({ date: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('Error getting recent sleep:', error);
      return [];
    }
  }

  /**
   * Get sleep for specific date
   */
  async getSleepForDate(date) {
    try {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(0, 0, 0, 0);
      
      return await SleepSession.findOne({ date: normalizedDate }).lean();
    } catch (error) {
      console.error('Error getting sleep for date:', error);
      return null;
    }
  }

  /**
   * Get sleep statistics for dashboard
   */
  async getSleepStats(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const sessions = await SleepSession.find({
        date: { $gte: startDate }
      }).sort({ date: -1 }).lean();

      if (sessions.length === 0) {
        return this.getEmptyStats();
      }

      return {
        totalSessions: sessions.length,
        averageSleepDuration: this.calculateAverage(sessions, 'totalSleepTime'),
        averageSleepQuality: this.calculateAverage(sessions, 'sleepQuality'),
        averageTimeInBed: this.calculateAverage(sessions, 'totalTimeInBed'),
        averageSleepEfficiency: this.calculateAverage(sessions, 'sleepEfficiency'),
        sleepDebt: this.calculateSleepDebt(sessions),
        consistencyScore: this.calculateConsistencyScore(sessions),
        qualityTrend: this.calculateTrend(sessions, 'sleepQuality'),
        durationTrend: this.calculateTrend(sessions, 'totalSleepTime'),
        recentSessions: sessions.slice(0, 7),
        weeklyBreakdown: this.calculateWeeklyBreakdown(sessions)
      };
    } catch (error) {
      console.error('Error getting sleep stats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Calculate health readiness score
   */
  async calculateHealthReadiness() {
    try {
      // Get last night's sleep
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lastNightSleep = await this.getSleepForDate(yesterday);
      
      // Get recent workouts for recovery assessment
      const recentWorkouts = await Workout.find()
        .sort({ date: -1 })
        .limit(3)
        .lean();

      const readiness = {
        overall: 50, // Default
        components: {
          sleep: this.calculateSleepReadiness(lastNightSleep),
          recovery: this.calculateRecoveryReadiness(recentWorkouts),
          consistency: await this.calculateConsistencyReadiness()
        },
        recommendations: [],
        status: 'fair',
        lastNightSleep
      };

      // Calculate weighted overall score
      const weights = { sleep: 0.5, recovery: 0.3, consistency: 0.2 };
      readiness.overall = Math.round(
        (readiness.components.sleep * weights.sleep) +
        (readiness.components.recovery * weights.recovery) +
        (readiness.components.consistency * weights.consistency)
      );

      readiness.status = this.getReadinessStatus(readiness.overall);
      readiness.recommendations = this.generateReadinessRecommendations(readiness);

      return readiness;
    } catch (error) {
      console.error('Error calculating health readiness:', error);
      return {
        overall: 50,
        status: 'unknown',
        recommendations: ['Unable to assess readiness - log your sleep data'],
        components: { sleep: 50, recovery: 50, consistency: 50 }
      };
    }
  }

  /**
   * Update sleep patterns and analytics
   */
  async updateSleepPatterns() {
    try {
      const stats = await this.getSleepStats(30);
      const sessions = await this.getRecentSleep(30);
      
      const patterns = {
        averageBedTime: this.calculateAverageTime(sessions, 'bedTime'),
        averageWakeTime: this.calculateAverageTime(sessions, 'wakeTime'),
        averageSleepDuration: stats.averageSleepDuration,
        averageSleepQuality: stats.averageSleepQuality,
        sleepDebt: stats.sleepDebt,
        consistencyScore: stats.consistencyScore,
        trends: {
          sleepDuration: stats.durationTrend,
          sleepQuality: stats.qualityTrend,
          bedTimeConsistency: this.getBedTimeConsistencyTrend(stats.consistencyScore)
        },
        lastAnalyzed: new Date()
      };

      await SleepPatterns.findOneAndUpdate(
        { _id: 'local' },
        patterns,
        { upsert: true, new: true }
      );

      return patterns;
    } catch (error) {
      console.error('Error updating sleep patterns:', error);
      return {};
    }
  }

  // Helper methods
  calculateAverage(sessions, field) {
    if (sessions.length === 0) return 0;
    const values = sessions.filter(s => s[field] != null).map(s => s[field]);
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  }

  calculateSleepDebt(sessions) {
    const targetDuration = 480; // 8 hours
    let debt = 0;
    sessions.forEach(session => {
      if (session.totalSleepTime && session.totalSleepTime < targetDuration) {
        debt += targetDuration - session.totalSleepTime;
      }
    });
    return debt;
  }

  calculateConsistencyScore(sessions) {
    if (sessions.length < 3) return 50;
    
    const bedTimes = sessions.filter(s => s.bedTime).map(s => {
      const time = new Date(s.bedTime);
      return time.getHours() * 60 + time.getMinutes();
    });
    
    if (bedTimes.length < 2) return 50;
    
    const avgBedTime = bedTimes.reduce((a, b) => a + b, 0) / bedTimes.length;
    const variance = bedTimes.reduce((sum, time) => sum + Math.pow(time - avgBedTime, 2), 0) / bedTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    return Math.max(0, Math.round(100 - (standardDeviation / 30)));
  }

  calculateTrend(sessions, field) {
    if (sessions.length < 3) return 'stable';
    
    const values = sessions.slice(0, Math.min(10, sessions.length))
      .reverse()
      .filter(s => s[field] != null)
      .map(s => s[field]);
    
    if (values.length < 3) return 'stable';
    
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return 'improving';
    if (change < -10) return 'declining';
    return 'stable';
  }

  calculateWeeklyBreakdown(sessions) {
    const weeklyData = Array(7).fill(0).map(() => ({ 
      count: 0, 
      avgQuality: 0, 
      avgDuration: 0,
      totalQuality: 0,
      totalDuration: 0
    }));
    
    sessions.forEach(session => {
      const dayOfWeek = new Date(session.date).getDay();
      weeklyData[dayOfWeek].count++;
      if (session.sleepQuality) {
        weeklyData[dayOfWeek].totalQuality += session.sleepQuality;
      }
      if (session.totalSleepTime) {
        weeklyData[dayOfWeek].totalDuration += session.totalSleepTime;
      }
    });
    
    // Calculate averages
    weeklyData.forEach(day => {
      if (day.count > 0) {
        day.avgQuality = Math.round((day.totalQuality / day.count) * 10) / 10;
        day.avgDuration = Math.round(day.totalDuration / day.count);
      }
      delete day.totalQuality;
      delete day.totalDuration;
    });
    
    return weeklyData;
  }

  calculateAverageTime(sessions, field) {
    const times = sessions.filter(s => s[field]).map(s => {
      const time = new Date(s[field]);
      return time.getHours() * 60 + time.getMinutes();
    });
    
    if (times.length === 0) return null;
    
    const avgMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  calculateSleepReadiness(lastNightSleep) {
    if (!lastNightSleep) return 30;
    
    let score = 0;
    
    // Duration component (0-40 points)
    if (lastNightSleep.totalSleepTime) {
      const hours = lastNightSleep.totalSleepTime / 60;
      if (hours >= 7 && hours <= 9) score += 40;
      else if (hours >= 6 && hours <= 10) score += 25;
      else if (hours >= 5 && hours <= 11) score += 15;
      else score += 5;
    }
    
    // Quality component (0-40 points)
    if (lastNightSleep.sleepQuality) {
      score += lastNightSleep.sleepQuality * 4;
    }
    
    // Efficiency component (0-20 points)
    if (lastNightSleep.sleepEfficiency) {
      if (lastNightSleep.sleepEfficiency >= 85) score += 20;
      else if (lastNightSleep.sleepEfficiency >= 70) score += 12;
      else score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  calculateRecoveryReadiness(recentWorkouts) {
    if (recentWorkouts.length === 0) return 80;
    
    const lastWorkout = recentWorkouts[0];
    const daysSinceLastWorkout = (Date.now() - new Date(lastWorkout.date)) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastWorkout > 2) return 90;
    if (daysSinceLastWorkout > 1) return 70;
    if (daysSinceLastWorkout > 0.5) return 50;
    return 30;
  }

  async calculateConsistencyReadiness() {
    try {
      const stats = await this.getSleepStats(7);
      return stats.consistencyScore || 50;
    } catch (error) {
      return 50;
    }
  }

  getReadinessStatus(score) {
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 50) return 'poor';
    return 'very poor';
  }

  generateReadinessRecommendations(readiness) {
    const recommendations = [];
    
    if (readiness.components.sleep < 60) {
      recommendations.push("Focus on getting 7-8 hours of quality sleep tonight");
    }
    
    if (readiness.components.recovery < 50) {
      recommendations.push("Consider lighter training today - your body needs recovery");
    }
    
    if (readiness.components.consistency < 60) {
      recommendations.push("Try to maintain consistent sleep and wake times");
    }
    
    if (readiness.overall >= 80) {
      recommendations.push("You're well-rested and ready for intense training! 💪");
    } else if (readiness.overall < 50) {
      recommendations.push("Prioritize recovery today - light movement and early bedtime");
    }
    
    return recommendations;
  }

  generateSessionSummary(session) {
    const parts = [];
    
    if (session.totalSleepTime) {
      const hours = Math.floor(session.totalSleepTime / 60);
      const minutes = session.totalSleepTime % 60;
      parts.push(`${hours}h ${minutes}m sleep`);
    }
    
    if (session.sleepQuality) {
      parts.push(`quality: ${session.sleepQuality}/10`);
    }
    
    if (session.interruptions && session.interruptions.length > 0) {
      parts.push(`${session.interruptions.length} interruption(s)`);
    }
    
    return parts.join(', ') || 'Sleep session logged';
  }

  async generateSleepInsights(session) {
    const insights = [];
    
    if (session.sleepQuality <= 4) {
      insights.push("Poor sleep quality detected. Consider reviewing your bedtime routine and sleep environment.");
    } else if (session.sleepQuality >= 8) {
      insights.push("Excellent sleep quality! Whatever you did last night, keep it up! ✨");
    }
    
    if (session.totalSleepTime < 360) {
      insights.push("Sleep duration is below recommended minimum. Try to get to bed earlier tonight.");
    } else if (session.totalSleepTime > 540) {
      insights.push("Long sleep duration detected. This might indicate recovery needs or sleep debt repayment.");
    }
    
    if (session.sleepEfficiency && session.sleepEfficiency < 80) {
      insights.push("Low sleep efficiency suggests you spent too much time awake in bed. Consider sleep hygiene improvements.");
    }
    
    if (session.interruptions && session.interruptions.length > 2) {
      insights.push("Multiple sleep interruptions detected. Consider addressing environmental factors or stress levels.");
    }
    
    return insights;
  }

  async createSleepMemoryIfSignificant(session) {
    try {
      const memories = [];
      
      if (session.sleepQuality <= 4) {
        memories.push({
          type: 'sleep_pattern',
          content: `Poor sleep quality (${session.sleepQuality}/10) on ${session.date.toDateString()}. ${session.notes || 'No additional notes.'}`,
          meta: { sleepQuality: session.sleepQuality, date: session.date }
        });
      }
      
      if (session.sleepQuality >= 9) {
        memories.push({
          type: 'sleep_pattern',
          content: `Excellent sleep quality (${session.sleepQuality}/10) on ${session.date.toDateString()}. ${session.notes || 'No additional notes.'}`,
          meta: { sleepQuality: session.sleepQuality, date: session.date }
        });
      }
      
      if (session.totalSleepTime && (session.totalSleepTime < 300 || session.totalSleepTime > 600)) {
        const hours = Math.round(session.totalSleepTime / 60 * 10) / 10;
        memories.push({
          type: 'sleep_pattern',
          content: `Unusual sleep duration: ${hours} hours on ${session.date.toDateString()}. ${session.notes || ''}`,
          meta: { sleepDuration: session.totalSleepTime, date: session.date }
        });
      }
      
      for (const memory of memories) {
        const newMemory = new Memory(memory);
        await newMemory.save();
      }
    } catch (error) {
      console.error('Error creating sleep memory:', error);
    }
  }

  getBedTimeConsistencyTrend(consistencyScore) {
    if (consistencyScore > 75) return 'improving';
    if (consistencyScore < 40) return 'declining';
    return 'stable';
  }

  getEmptyStats() {
    return {
      totalSessions: 0,
      averageSleepDuration: 0,
      averageSleepQuality: 0,
      averageTimeInBed: 0,
      averageSleepEfficiency: 0,
      sleepDebt: 0,
      consistencyScore: 0,
      qualityTrend: 'stable',
      durationTrend: 'stable',
      recentSessions: [],
      weeklyBreakdown: Array(7).fill({ count: 0, avgQuality: 0, avgDuration: 0 })
    };
  }
}

export default new SleepService();
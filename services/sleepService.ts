import { Sleep } from '@/models';
import { SleepSession, SleepQuality, SleepReadiness, LocalDateTime } from '@/types';

/**
 * SleepService - Manages sleep tracking and analysis
 * Handles sleep logging, quality assessment, and readiness calculation
 */
class SleepService {
  /**
   * Check if message contains sleep information
   */
  isSleepMessage(message: string): boolean {
    const sleepKeywords = [
      'sleep', 'slept', 'sleeping', 'bedtime', 'wake', 'woke',
      'rest', 'rested', 'nap', 'napped', 'tired', 'exhausted',
      'hours', 'quality', 'insomnia', 'dream'
    ];

    const messageLower = message.toLowerCase();
    return sleepKeywords.some(keyword => messageLower.includes(keyword));
  }

  /**
   * Log sleep session from natural language
   * 
   * Examples:
   * - "Slept 8 hours, quality was good"
   * - "Had 7.5 hours of sleep last night"
   * - "Slept from 11pm to 7am"
   */
  async logSleep(
    message: string,
    currentTime: LocalDateTime
  ): Promise<{ session: SleepSession }> {
    const parsed = this.parseSleepData(message, currentTime);

    const sleep = new Sleep({
      userId: 'local',
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      totalSleepTime: parsed.totalSleepTime,
      sleepQuality: parsed.quality,
      notes: message
    });

    await sleep.save();

    return {
      session: sleep.toObject() as SleepSession
    };
  }

  /**
   * Parse sleep data from message
   */
  private parseSleepData(
    message: string,
    currentTime: LocalDateTime
  ): {
    startTime: Date;
    endTime: Date;
    totalSleepTime: number;
    quality: SleepQuality;
  } {
    const messageLower = message.toLowerCase();

    // Extract duration (e.g., "8 hours", "7.5 hours")
    let totalSleepTime = 480; // default 8 hours in minutes
    const hoursMatch = messageLower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
    if (hoursMatch) {
      totalSleepTime = parseFloat(hoursMatch[1]) * 60;
    }

    // Extract quality
    let quality: SleepQuality = SleepQuality.GOOD;
    if (messageLower.includes('excellent') || messageLower.includes('great') || messageLower.includes('amazing')) {
      quality = SleepQuality.EXCELLENT;
    } else if (messageLower.includes('poor') || messageLower.includes('bad') || messageLower.includes('terrible')) {
      quality = SleepQuality.POOR;
    } else if (messageLower.includes('ok') || messageLower.includes('okay') || messageLower.includes('fair')) {
      quality = SleepQuality.FAIR;
    }

    // Calculate times (assume sleep ended at wake time, typically this morning)
    const endTime = new Date(currentTime.iso);
    const startTime = new Date(endTime.getTime() - totalSleepTime * 60 * 1000);

    return {
      startTime,
      endTime,
      totalSleepTime,
      quality
    };
  }

  /**
   * Calculate health readiness based on recent sleep
   */
  async calculateHealthReadiness(): Promise<SleepReadiness | null> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get recent sleep sessions
      const last7Days = await Sleep.find({
        userId: 'local',
        endTime: { $gte: sevenDaysAgo }
      }).lean();

      const last30Days = await Sleep.find({
        userId: 'local',
        endTime: { $gte: thirtyDaysAgo }
      }).lean();

      if (last7Days.length === 0) {
        return null;
      }

      // Calculate averages
      const avg7Days = last7Days.reduce((sum, s) => sum + s.totalSleepTime, 0) / last7Days.length;
      const avg30Days = last30Days.length > 0
        ? last30Days.reduce((sum, s) => sum + s.totalSleepTime, 0) / last30Days.length
        : avg7Days;

      // Calculate quality score
      const qualityScores = {
        [SleepQuality.EXCELLENT]: 100,
        [SleepQuality.GOOD]: 75,
        [SleepQuality.FAIR]: 50,
        [SleepQuality.POOR]: 25
      };

      const avgQuality = last7Days.reduce((sum, s) => {
        return sum + qualityScores[s.sleepQuality as SleepQuality];
      }, 0) / last7Days.length;

      // Calculate readiness score (0-100)
      const durationScore = Math.min(100, (avg7Days / 480) * 100); // 480 min = 8 hours target
      const score = Math.round((durationScore * 0.6) + (avgQuality * 0.4));

      // Determine status
      let status: 'poor' | 'fair' | 'good' | 'excellent';
      if (score >= 80) status = 'excellent';
      else if (score >= 60) status = 'good';
      else if (score >= 40) status = 'fair';
      else status = 'poor';

      // Generate recommendations
      const recommendations: string[] = [];
      if (avg7Days < 420) {
        recommendations.push('Aim for 7-8 hours of sleep per night');
      }
      if (avgQuality < 60) {
        recommendations.push('Focus on improving sleep quality');
      }
      if (last7Days.length < 5) {
        recommendations.push('Try to maintain consistent sleep tracking');
      }

      return {
        score,
        status,
        recentSleep: {
          last7Days: avg7Days,
          last30Days: avg30Days,
          quality: this.getAverageQuality(last7Days as any[])
        },
        recommendations
      };
    } catch (error) {
      console.error('Error calculating health readiness:', error);
      return null;
    }
  }

  /**
   * Get average quality from sessions
   */
  private getAverageQuality(sessions: Array<{ sleepQuality: string }>): SleepQuality {
    const qualityMap = {
      [SleepQuality.EXCELLENT]: 4,
      [SleepQuality.GOOD]: 3,
      [SleepQuality.FAIR]: 2,
      [SleepQuality.POOR]: 1
    };

    const reverseMap = [SleepQuality.POOR, SleepQuality.FAIR, SleepQuality.GOOD, SleepQuality.EXCELLENT];

    const avgScore = sessions.reduce((sum, s) => {
      return sum + (qualityMap[s.sleepQuality as SleepQuality] || 2);
    }, 0) / sessions.length;

    return reverseMap[Math.round(avgScore) - 1] || SleepQuality.FAIR;
  }

  /**
   * Generate session summary (optional method)
   */
  async generateSessionSummary(session: SleepSession): Promise<string> {
    const hours = Math.floor(session.totalSleepTime / 60);
    const minutes = session.totalSleepTime % 60;

    return `${hours}h ${minutes}m of ${session.sleepQuality} quality sleep`;
  }
}

// Export singleton instance
const sleepService = new SleepService();
export default sleepService;

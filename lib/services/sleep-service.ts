import connectDatabase from '@/lib/database';
import { SleepSession } from '@/models';
import type { 
  SleepSession as SleepSessionType, 
  SleepStats, 
  CreateSleepSessionData 
} from '@/lib/types';

/**
 * Consolidated Sleep Service
 * Handles all sleep-related business logic and database operations
 */
export class SleepService {
  /**
   * Get the most recent sleep session
   */
  async getLatestSleep(): Promise<SleepSessionType | null> {
    await connectDatabase();
    
    const session = await SleepSession.findOne()
      .sort({ date: -1 })
      .lean<SleepSessionType>();
    
    return session;
  }

  /**
   * Get sleep sessions with optional limit
   */
  async getSleepSessions(limit: number = 14): Promise<SleepSessionType[]> {
    await connectDatabase();
    
    const sessions = await SleepSession.find()
      .sort({ date: -1 })
      .limit(limit)
      .lean<SleepSessionType[]>();
    
    return sessions;
  }

  /**
   * Get sleep sessions within a date range
   */
  async getSleepByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<SleepSessionType[]> {
    await connectDatabase();
    
    const sessions = await SleepSession.find({
      date: { $gte: startDate, $lte: endDate }
    })
    .sort({ date: -1 })
    .lean<SleepSessionType[]>();
    
    return sessions;
  }

  /**
   * Create a new sleep session
   */
  async createSleepSession(
    data: CreateSleepSessionData
  ): Promise<SleepSessionType> {
    await connectDatabase();
    
    // Calculate duration if times are provided
    let totalSleepTime: number | undefined;
    let sleepEfficiency: number | undefined;
    
    if (data.bedTime && data.wakeTime) {
      const bedTime = new Date(data.bedTime);
      const wakeTime = new Date(data.wakeTime);
      
      // Calculate total time in bed (minutes)
      const totalTimeInBed = Math.round(
        (wakeTime.getTime() - bedTime.getTime()) / (1000 * 60)
      );
      
      // Assume 85-95% sleep efficiency for now
      // This can be improved with more detailed tracking
      const efficiency = 0.85 + (data.sleepQuality / 10) * 0.1;
      totalSleepTime = Math.round(totalTimeInBed * efficiency);
      sleepEfficiency = Math.round(efficiency * 100);
    }
    
    const session = await SleepSession.create({
      ...data,
      date: data.date || new Date(),
      totalSleepTime,
      sleepEfficiency,
      createdAt: new Date(),
    });
    
    return session.toObject() as SleepSessionType;
  }

  /**
   * Update an existing sleep session
   */
  async updateSleepSession(
    sessionId: string,
    updates: Partial<CreateSleepSessionData>
  ): Promise<SleepSessionType | null> {
    await connectDatabase();
    
    const session = await SleepSession.findByIdAndUpdate(
      sessionId,
      updates,
      { new: true }
    ).lean<SleepSessionType>();
    
    return session;
  }

  /**
   * Delete a sleep session
   */
  async deleteSleepSession(sessionId: string): Promise<boolean> {
    await connectDatabase();
    
    const result = await SleepSession.findByIdAndDelete(sessionId);
    return !!result;
  }

  /**
   * Calculate sleep statistics for a given period
   */
  async calculateSleepStats(days: number = 7): Promise<SleepStats> {
    await connectDatabase();
    
    const sessions = await this.getSleepSessions(days);
    
    if (sessions.length === 0) {
      return {
        avgDuration: 0,
        avgQuality: 0,
        totalSessions: 0,
        trend: 'stable',
      };
    }
    
    // Calculate averages
    const totalDuration = sessions.reduce(
      (sum, s) => sum + (s.totalSleepTime || 0),
      0
    );
    const totalQuality = sessions.reduce(
      (sum, s) => sum + s.sleepQuality,
      0
    );
    
    const avgDuration = Math.round((totalDuration / sessions.length) / 60 * 10) / 10; // Hours
    const avgQuality = Math.round((totalQuality / sessions.length) * 10) / 10;
    
    // Determine trend (compare first half vs second half)
    const trend = this.calculateTrend(sessions);
    
    return {
      avgDuration,
      avgQuality,
      totalSessions: sessions.length,
      trend,
    };
  }

  /**
   * Calculate sleep quality trend
   */
  private calculateTrend(
    sessions: SleepSessionType[]
  ): 'improving' | 'declining' | 'stable' {
    if (sessions.length < 4) {
      return 'stable';
    }
    
    const midPoint = Math.floor(sessions.length / 2);
    const recentSessions = sessions.slice(0, midPoint);
    const olderSessions = sessions.slice(midPoint);
    
    const recentAvgQuality = recentSessions.reduce(
      (sum, s) => sum + s.sleepQuality,
      0
    ) / recentSessions.length;
    
    const olderAvgQuality = olderSessions.reduce(
      (sum, s) => sum + s.sleepQuality,
      0
    ) / olderSessions.length;
    
    const diff = recentAvgQuality - olderAvgQuality;
    
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  }

  /**
   * Get sleep duration in hours (helper method)
   */
  getSleepDurationHours(session: SleepSessionType): number {
    if (!session.totalSleepTime) return 0;
    return Math.round((session.totalSleepTime / 60) * 10) / 10;
  }

  /**
   * Get sleep quality category
   */
  getSleepQualityCategory(quality: number): string {
    if (quality >= 8) return 'Excellent';
    if (quality >= 6) return 'Good';
    if (quality >= 4) return 'Fair';
    return 'Poor';
  }

  /**
   * Calculate sleep debt (difference from target 8 hours)
   */
  async calculateSleepDebt(days: number = 7): Promise<number> {
    const sessions = await this.getSleepSessions(days);
    const targetMinutes = 8 * 60; // 8 hours
    
    const totalDebt = sessions.reduce((debt, session) => {
      const actualSleep = session.totalSleepTime || 0;
      const dailyDebt = targetMinutes - actualSleep;
      return debt + dailyDebt;
    }, 0);
    
    // Return debt in hours
    return Math.round((totalDebt / 60) * 10) / 10;
  }
}

// Export singleton instance
export const sleepService = new SleepService();

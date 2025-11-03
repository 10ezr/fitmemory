import { NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import sleepService from '@/services/sleepService';
import { Workout, Streak } from '@/models';

export async function GET(request) {
  try {
    await connectDatabase();
    
    // Get sleep readiness
    const sleepReadiness = await sleepService.calculateHealthReadiness();
    
    // Get workout streak data
    const streak = await Streak.findById('local');
    const recentWorkouts = await Workout.find()
      .sort({ date: -1 })
      .limit(5)
      .lean();
    
    // Calculate combined readiness
    const workoutReadiness = calculateWorkoutReadiness(streak, recentWorkouts);
    
    const overallReadiness = Math.round(
      (sleepReadiness.overall * 0.6) + (workoutReadiness * 0.4)
    );
    
    const combinedRecommendations = [
      ...sleepReadiness.recommendations.slice(0, 2),
      ...getWorkoutRecommendations(workoutReadiness, overallReadiness)
    ];
    
    return NextResponse.json({
      overall: overallReadiness,
      status: getOverallStatus(overallReadiness),
      components: {
        sleep: sleepReadiness.overall,
        workout: workoutReadiness,
        recovery: sleepReadiness.components.recovery
      },
      recommendations: combinedRecommendations,
      sleepData: {
        lastNight: sleepReadiness.lastNightSleep,
        quality: sleepReadiness.lastNightSleep?.sleepQuality,
        duration: sleepReadiness.lastNightSleep?.totalSleepTime
      },
      workoutData: {
        currentStreak: streak?.currentStreak || 0,
        daysSinceLastWorkout: recentWorkouts.length > 0 ? 
          Math.floor((Date.now() - new Date(recentWorkouts[0].date)) / (1000 * 60 * 60 * 24)) : null
      }
    });
  } catch (error) {
    console.error('Health readiness error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate readiness',
        overall: 50,
        status: 'unknown',
        recommendations: ['Unable to assess readiness - please try again']
      },
      { status: 500 }
    );
  }
}

function calculateWorkoutReadiness(streak, recentWorkouts) {
  let score = 50; // Base score
  
  // Streak bonus
  if (streak?.currentStreak > 0) {
    score += Math.min(streak.currentStreak * 3, 30); // Max 30 points for streak
  }
  
  // Recent activity
  if (recentWorkouts.length > 0) {
    const daysSinceLastWorkout = Math.floor(
      (Date.now() - new Date(recentWorkouts[0].date)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastWorkout === 0) score += 20; // Worked out today
    else if (daysSinceLastWorkout === 1) score += 15; // Yesterday
    else if (daysSinceLastWorkout <= 3) score += 10; // Within 3 days
    else if (daysSinceLastWorkout > 7) score -= 20; // More than a week
  } else {
    score -= 20; // No recent workouts
  }
  
  // Consistency bonus
  if (recentWorkouts.length >= 3) {
    score += 10; // Active user bonus
  }
  
  return Math.min(100, Math.max(0, score));
}

function getWorkoutRecommendations(workoutReadiness, overallReadiness) {
  const recommendations = [];
  
  if (workoutReadiness < 40) {
    recommendations.push('Consider starting a consistent workout routine');
  } else if (workoutReadiness < 70) {
    recommendations.push('Keep up the good work - consistency is key!');
  } else {
    recommendations.push('Excellent workout consistency! 💪');
  }
  
  if (overallReadiness >= 80) {
    recommendations.push('Perfect day for an intense training session!');
  } else if (overallReadiness < 50) {
    recommendations.push('Focus on recovery today - light movement only');
  }
  
  return recommendations;
}

function getOverallStatus(score) {
  if (score >= 80) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 50) return 'poor';
  return 'very poor';
}
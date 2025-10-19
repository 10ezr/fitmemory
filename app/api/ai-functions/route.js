import { NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { Workout, User, AppConfig, Memory } from '@/models';
import MemoryService from '@/services/memoryService';

export async function POST(request) {
  try {
    await connectDB();
    
    const { action, data } = await request.json();
    
    switch (action) {
      case 'get_user_progress':
        return await getUserProgress();
        
      case 'create_workout_plan':
        return await createWorkoutPlan(data);
        
      case 'update_user_goals':
        return await updateUserGoals(data);
        
      case 'get_workout_suggestions':
        return await getWorkoutSuggestions(data);
        
      case 'track_achievement':
        return await trackAchievement(data);
        
      case 'analyze_patterns':
        return await analyzePatterns();
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('AI Function error:', error);
    return NextResponse.json({ error: 'Function execution failed' }, { status: 500 });
  }
}

async function getUserProgress() {
  try {
    const user = await User.findById('local');
    const recentWorkouts = await Workout.find({}).sort({ date: -1 }).limit(10);
    const config = await AppConfig.findById('singleton');
    
    const progress = {
      totalWorkouts: await Workout.countDocuments(),
      currentStreak: config?.consistency?.dailyStreak || 0,
      longestStreak: config?.consistency?.longestStreak || 0,
      recentActivity: recentWorkouts.map(w => ({
        date: w.date,
        name: w.name,
        exercises: w.exercises.length,
        duration: w.exercises.reduce((sum, e) => sum + (e.durationS || 0), 0)
      })),
      weeklyGoal: user?.goals?.weeklyWorkouts || 3,
      currentWeekWorkouts: recentWorkouts.filter(w => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(w.date) >= weekAgo;
      }).length
    };
    
    return NextResponse.json({ progress });
    
  } catch (error) {
    console.error('Error getting user progress:', error);
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 });
  }
}

async function createWorkoutPlan(data) {
  try {
    const { focusAreas, difficulty, duration, userPreferences } = data;
    
    // Get user's workout history for personalization
    const recentWorkouts = await Workout.find({}).sort({ date: -1 }).limit(5);
    const memoryService = new MemoryService();
    const userMemories = await memoryService.getMemoriesByType('preference', 10);
    
    // Create intelligent workout plan based on data
    const exerciseDatabase = {
      strength: [
        { name: 'Push-ups', sets: 3, reps: 12, difficulty: 'beginner', muscles: ['chest', 'triceps'] },
        { name: 'Squats', sets: 3, reps: 15, difficulty: 'beginner', muscles: ['legs', 'glutes'] },
        { name: 'Lunges', sets: 3, reps: 10, difficulty: 'intermediate', muscles: ['legs', 'glutes'] },
        { name: 'Pull-ups', sets: 3, reps: 8, difficulty: 'advanced', muscles: ['back', 'biceps'] },
        { name: 'Planks', sets: 3, reps: '30s', difficulty: 'beginner', muscles: ['core'] },
        { name: 'Burpees', sets: 3, reps: 8, difficulty: 'advanced', muscles: ['full-body'] }
      ],
      cardio: [
        { name: 'Jumping Jacks', sets: 3, reps: 20, difficulty: 'beginner' },
        { name: 'High Knees', sets: 3, reps: 30, difficulty: 'beginner' },
        { name: 'Mountain Climbers', sets: 3, reps: 15, difficulty: 'intermediate' },
        { name: 'Burpees', sets: 2, reps: 10, difficulty: 'advanced' }
      ],
      flexibility: [
        { name: 'Cat-Cow Stretch', sets: 2, reps: 8, difficulty: 'beginner' },
        { name: 'Downward Dog', sets: 2, reps: '30s', difficulty: 'beginner' },
        { name: 'Pigeon Pose', sets: 2, reps: '45s', difficulty: 'intermediate' }
      ]
    };
    
    let exercises = [];
    
    // Select exercises based on focus areas and difficulty
    if (focusAreas.includes('strength')) {
      exercises = exercises.concat(
        exerciseDatabase.strength.filter(e => 
          difficulty === 'any' || e.difficulty === difficulty
        ).slice(0, 4)
      );
    }
    
    if (focusAreas.includes('cardio')) {
      exercises = exercises.concat(
        exerciseDatabase.cardio.filter(e => 
          difficulty === 'any' || e.difficulty === difficulty
        ).slice(0, 3)
      );
    }
    
    if (focusAreas.includes('flexibility')) {
      exercises = exercises.concat(
        exerciseDatabase.flexibility.slice(0, 2)
      );
    }
    
    // Adjust for duration
    if (duration < 20) {
      exercises = exercises.slice(0, 4);
    } else if (duration > 40) {
      exercises = exercises.concat(exercises.slice(0, 2)); // Add variety
    }
    
    const workoutPlan = {
      name: `${focusAreas.join(' & ').replace(/^\w/, c => c.toUpperCase())} Workout`,
      exercises,
      estimatedDuration: duration,
      difficulty,
      focusAreas,
      createdAt: new Date()
    };
    
    // Store as memory for future reference
    await memoryService.addMemory(
      'pattern',
      `Created workout plan: ${workoutPlan.name} with ${exercises.length} exercises`,
      { workoutPlan, userRequested: true }
    );
    
    return NextResponse.json({ workoutPlan });
    
  } catch (error) {
    console.error('Error creating workout plan:', error);
    return NextResponse.json({ error: 'Failed to create workout plan' }, { status: 500 });
  }
}

async function updateUserGoals(data) {
  try {
    const { goals } = data;
    
    await User.findByIdAndUpdate('local', {
      $set: { goals }
    }, { upsert: true });
    
    // Store in memory
    const memoryService = new MemoryService();
    await memoryService.addMemory(
      'goal',
      `Updated fitness goals: ${JSON.stringify(goals)}`,
      { confidence: 1.0, userRequested: true }
    );
    
    return NextResponse.json({ success: true, goals });
    
  } catch (error) {
    console.error('Error updating user goals:', error);
    return NextResponse.json({ error: 'Failed to update goals' }, { status: 500 });
  }
}

async function getWorkoutSuggestions(data) {
  try {
    const { currentTime, dayOfWeek, lastWorkout } = data;
    
    const suggestions = [];
    const hour = new Date(currentTime).getHours();
    
    // Morning suggestions
    if (hour < 12) {
      suggestions.push({
        title: 'Morning Energy Booster',
        description: 'Quick 15-minute routine to start your day strong',
        exercises: ['Jumping Jacks', 'Push-ups', 'Squats', 'Plank'],
        duration: 15,
        energy: 'high'
      });
    }
    
    // Evening suggestions
    if (hour >= 18) {
      suggestions.push({
        title: 'Evening Strength Session',
        description: 'Build muscle with this focused strength workout',
        exercises: ['Push-ups', 'Lunges', 'Planks', 'Burpees'],
        duration: 25,
        energy: 'medium'
      });
    }
    
    // Day-specific suggestions
    const dayWorkouts = {
      'Monday': 'Start strong with full-body power',
      'Wednesday': 'Mid-week strength maintenance',
      'Friday': 'End the week with high-intensity training',
      'Sunday': 'Gentle recovery and flexibility'
    };
    
    if (dayWorkouts[dayOfWeek]) {
      suggestions.push({
        title: `${dayOfWeek} Special`,
        description: dayWorkouts[dayOfWeek],
        exercises: ['Varies based on day'],
        duration: 20,
        energy: 'medium'
      });
    }
    
    return NextResponse.json({ suggestions });
    
  } catch (error) {
    console.error('Error getting workout suggestions:', error);
    return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 });
  }
}

async function trackAchievement(data) {
  try {
    const { achievement, value, metric } = data;
    
    const memoryService = new MemoryService();
    await memoryService.addMemory(
      'achievement',
      `Achievement unlocked: ${achievement}`,
      { 
        value, 
        metric, 
        achievedAt: new Date(),
        confidence: 1.0 
      }
    );
    
    return NextResponse.json({ success: true, achievement });
    
  } catch (error) {
    console.error('Error tracking achievement:', error);
    return NextResponse.json({ error: 'Failed to track achievement' }, { status: 500 });
  }
}

async function analyzePatterns() {
  try {
    const workouts = await Workout.find({}).sort({ date: -1 }).limit(30);
    
    if (workouts.length === 0) {
      return NextResponse.json({ patterns: [] });
    }
    
    // Analyze workout patterns
    const patterns = [];
    
    // Day of week preference
    const dayFrequency = {};
    workouts.forEach(workout => {
      const day = new Date(workout.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayFrequency[day] = (dayFrequency[day] || 0) + 1;
    });
    
    const mostFrequentDay = Object.keys(dayFrequency).reduce((a, b) => 
      dayFrequency[a] > dayFrequency[b] ? a : b
    );
    
    patterns.push({
      type: 'schedule',
      pattern: `Most active on ${mostFrequentDay}s`,
      confidence: 0.8
    });
    
    // Exercise preferences
    const exerciseFrequency = {};
    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exerciseFrequency[exercise.name] = (exerciseFrequency[exercise.name] || 0) + 1;
      });
    });
    
    const favoriteExercises = Object.entries(exerciseFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);
    
    if (favoriteExercises.length > 0) {
      patterns.push({
        type: 'preference',
        pattern: `Frequently does: ${favoriteExercises.join(', ')}`,
        confidence: 0.9
      });
    }
    
    // Consistency analysis
    const avgWorkoutsPerWeek = (workouts.length / 4); // Assuming 4 weeks of data
    patterns.push({
      type: 'consistency',
      pattern: `Averages ${avgWorkoutsPerWeek.toFixed(1)} workouts per week`,
      confidence: 0.7
    });
    
    return NextResponse.json({ patterns });
    
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    return NextResponse.json({ error: 'Failed to analyze patterns' }, { status: 500 });
  }
}

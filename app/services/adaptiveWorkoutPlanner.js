"use client";

import exerciseDatabase, { 
  getExercisesByCategory, 
  getExercisesByDifficulty, 
  getRandomExercises 
} from '../data/exercises';

class AdaptiveWorkoutPlanner {
  constructor() {
    this.userProfile = {
      fitnessLevel: 'beginner', // beginner, intermediate, advanced
      preferences: {
        equipment: 'none', // none, dumbbells, gym
        duration: 30, // minutes
        intensity: 'moderate', // low, moderate, high
        focus: 'general', // general, strength, cardio, flexibility
        excludeExercises: [],
        favoriteExercises: []
      },
      goals: {
        primary: 'general_fitness', // weight_loss, muscle_gain, endurance, general_fitness
        timeline: 'medium', // short, medium, long
        weeklyFrequency: 3
      },
      limitations: {
        injuries: [],
        timeConstraints: [],
        physicalLimitations: []
      }
    };
    this.loadUserProfile();
  }

  loadUserProfile() {
    const saved = localStorage.getItem('userFitnessProfile');
    if (saved) {
      this.userProfile = { ...this.userProfile, ...JSON.parse(saved) };
    }
  }

  saveUserProfile() {
    localStorage.setItem('userFitnessProfile', JSON.stringify(this.userProfile));
  }

  updateProfile(updates) {
    this.userProfile = { ...this.userProfile, ...updates };
    this.saveUserProfile();
  }

  // Analyze user progress and adapt plans
  analyzeProgress(workoutHistory, userFeedback = []) {
    const analysis = {
      progressTrend: 'stable',
      consistencyScore: 0,
      performanceMetrics: {},
      adaptationNeeds: [],
      recommendations: []
    };

    if (!workoutHistory.length) return analysis;

    // Calculate consistency
    analysis.consistencyScore = this.calculateConsistency(workoutHistory);
    
    // Analyze progression
    analysis.progressTrend = this.analyzeProgressTrend(workoutHistory);
    
    // Performance analysis
    analysis.performanceMetrics = this.analyzePerformance(workoutHistory);
    
    // Generate adaptations
    analysis.adaptationNeeds = this.identifyAdaptations(
      workoutHistory, 
      userFeedback, 
      analysis
    );
    
    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  calculateConsistency(workouts) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const recentWorkouts = workouts.filter(w => new Date(w.date) >= thirtyDaysAgo);
    
    if (recentWorkouts.length === 0) return 0;
    
    const targetWorkouts = this.userProfile.goals.weeklyFrequency * 4; // 4 weeks
    return Math.min((recentWorkouts.length / targetWorkouts) * 100, 100);
  }

  analyzeProgressTrend(workouts) {
    if (workouts.length < 3) return 'insufficient_data';
    
    const recentWorkouts = workouts.slice(-6); // Last 6 workouts
    const durations = recentWorkouts.map(w => w.duration || 0);
    const volumes = recentWorkouts.map(w => 
      w.exercises?.reduce((sum, ex) => sum + (ex.sets * ex.reps || 0), 0) || 0
    );
    
    const durationTrend = this.calculateTrend(durations);
    const volumeTrend = this.calculateTrend(volumes);
    
    if (durationTrend > 0.1 || volumeTrend > 0.1) return 'improving';
    if (durationTrend < -0.1 || volumeTrend < -0.1) return 'declining';
    return 'stable';
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const first = values.slice(0, Math.floor(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = first.reduce((sum, v) => sum + v, 0) / first.length;
    const secondAvg = second.reduce((sum, v) => sum + v, 0) / second.length;
    
    return firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
  }

  analyzePerformance(workouts) {
    const metrics = {
      averageDuration: 0,
      averageExercises: 0,
      mostUsedExercises: {},
      exerciseVariety: 0,
      intensityProgression: 'stable'
    };

    if (!workouts.length) return metrics;

    // Duration analysis
    const durations = workouts.map(w => w.duration || 0);
    metrics.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    // Exercise analysis
    const allExercises = workouts.flatMap(w => w.exercises || []);
    const exerciseCounts = {};
    
    allExercises.forEach(exercise => {
      const name = exercise.name;
      exerciseCounts[name] = (exerciseCounts[name] || 0) + 1;
    });

    metrics.mostUsedExercises = Object.entries(exerciseCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .reduce((obj, [name, count]) => {
        obj[name] = count;
        return obj;
      }, {});

    metrics.exerciseVariety = Object.keys(exerciseCounts).length;
    metrics.averageExercises = workouts.reduce((sum, w) => 
      sum + (w.exercises?.length || 0), 0) / workouts.length;

    return metrics;
  }

  identifyAdaptations(workouts, feedback, analysis) {
    const adaptations = [];

    // Consistency-based adaptations
    if (analysis.consistencyScore < 50) {
      adaptations.push({
        type: 'schedule',
        priority: 'high',
        action: 'reduce_frequency',
        reason: 'Low consistency - recommend fewer but more achievable sessions'
      });
    } else if (analysis.consistencyScore > 90) {
      adaptations.push({
        type: 'progression',
        priority: 'medium',
        action: 'increase_intensity',
        reason: 'High consistency - ready for progression'
      });
    }

    // Progress-based adaptations
    if (analysis.progressTrend === 'declining') {
      adaptations.push({
        type: 'difficulty',
        priority: 'high',
        action: 'reduce_intensity',
        reason: 'Declining performance - prevent burnout'
      });
    } else if (analysis.progressTrend === 'improving') {
      adaptations.push({
        type: 'progression',
        priority: 'medium',
        action: 'progressive_overload',
        reason: 'Improving performance - apply progressive overload'
      });
    }

    // Variety-based adaptations
    if (analysis.performanceMetrics.exerciseVariety < 5) {
      adaptations.push({
        type: 'variety',
        priority: 'medium',
        action: 'add_variety',
        reason: 'Limited exercise variety - prevent plateaus'
      });
    }

    // Feedback-based adaptations
    feedback.forEach(fb => {
      if (fb.difficulty === 'too_easy') {
        adaptations.push({
          type: 'difficulty',
          priority: 'high',
          action: 'increase_difficulty',
          reason: 'User feedback: workouts too easy'
        });
      } else if (fb.difficulty === 'too_hard') {
        adaptations.push({
          type: 'difficulty',
          priority: 'high',
          action: 'decrease_difficulty',
          reason: 'User feedback: workouts too challenging'
        });
      }
    });

    return adaptations;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // Consistency recommendations
    if (analysis.consistencyScore < 70) {
      recommendations.push({
        category: 'consistency',
        title: 'Improve Workout Consistency',
        description: 'Try scheduling shorter, more manageable sessions at the same time each day.',
        action: 'Set daily reminders and start with 15-minute sessions'
      });
    }

    // Progress recommendations
    if (analysis.progressTrend === 'stable') {
      recommendations.push({
        category: 'progression',
        title: 'Time for Progression',
        description: 'Your performance has plateaued. Consider increasing intensity or trying new exercises.',
        action: 'Add 10% more reps or try advanced variations'
      });
    }

    // Variety recommendations
    if (analysis.performanceMetrics.exerciseVariety < 6) {
      recommendations.push({
        category: 'variety',
        title: 'Increase Exercise Variety',
        description: 'Adding variety prevents boredom and works different muscle groups.',
        action: 'Try 2-3 new exercises this week'
      });
    }

    return recommendations;
  }

  // Generate adaptive workout plan
  generateWorkoutPlan(options = {}) {
    const {
      duration = this.userProfile.preferences.duration,
      focus = this.userProfile.preferences.focus,
      equipment = this.userProfile.preferences.equipment,
      difficulty = this.userProfile.fitnessLevel,
      workoutHistory = []
    } = options;

    // Analyze current state
    const analysis = this.analyzeProgress(workoutHistory);
    
    // Apply adaptations
    const adaptedPreferences = this.applyAdaptations(
      this.userProfile.preferences, 
      analysis.adaptationNeeds
    );

    // Generate exercises
    const exercises = this.selectExercises({
      duration,
      focus,
      equipment,
      difficulty,
      adaptedPreferences,
      recentExercises: this.getRecentExercises(workoutHistory)
    });

    // Structure workout
    const workout = this.structureWorkout(exercises, duration, focus);
    
    // Add adaptive elements
    workout.adaptations = analysis.adaptationNeeds;
    workout.recommendations = analysis.recommendations;
    workout.progressionNotes = this.generateProgressionNotes(analysis);

    return workout;
  }

  applyAdaptations(preferences, adaptations) {
    const adapted = { ...preferences };
    
    adaptations.forEach(adaptation => {
      switch (adaptation.action) {
        case 'reduce_intensity':
          adapted.intensity = adapted.intensity === 'high' ? 'moderate' : 'low';
          break;
        case 'increase_intensity':
          adapted.intensity = adapted.intensity === 'low' ? 'moderate' : 'high';
          break;
        case 'reduce_frequency':
          adapted.duration = Math.max(15, adapted.duration - 10);
          break;
        case 'progressive_overload':
          // Will be handled in exercise selection
          adapted.progressiveOverload = true;
          break;
      }
    });
    
    return adapted;
  }

  selectExercises(options) {
    const {
      duration,
      focus,
      equipment,
      difficulty,
      recentExercises = []
    } = options;

    // Filter available exercises
    let availableExercises = Object.entries(exerciseDatabase)
      .filter(([key, exercise]) => {
        // Equipment filter
        if (exercise.equipment !== equipment && equipment !== 'any') {
          if (equipment === 'none' && exercise.equipment !== 'none') return false;
          if (equipment !== 'none' && exercise.equipment === 'none') return false;
        }
        
        // Difficulty filter (allow same level and one level easier/harder)
        const difficultyLevels = { beginner: 0, intermediate: 1, advanced: 2 };
        const userLevel = difficultyLevels[difficulty] || 0;
        const exerciseLevel = difficultyLevels[exercise.difficulty] || 0;
        
        return Math.abs(userLevel - exerciseLevel) <= 1;
      })
      .map(([key, exercise]) => ({ key, ...exercise }));

    // Focus-based filtering
    if (focus !== 'general') {
      availableExercises = availableExercises.filter(ex => 
        ex.category === focus || ex.type === focus
      );
    }

    // Avoid recent exercises (add variety)
    const recentExerciseNames = recentExercises.map(ex => ex.name);
    const freshExercises = availableExercises.filter(ex => 
      !recentExerciseNames.includes(ex.name)
    );

    // Select exercises based on duration
    const targetExerciseCount = this.calculateExerciseCount(duration, difficulty);
    
    // Prioritize fresh exercises, fall back to all if needed
    const selectedPool = freshExercises.length >= targetExerciseCount 
      ? freshExercises 
      : availableExercises;

    // Select balanced mix
    return this.selectBalancedExercises(selectedPool, targetExerciseCount, focus);
  }

  calculateExerciseCount(duration, difficulty) {
    const baseCount = Math.floor(duration / 8); // ~8 minutes per exercise
    const difficultyMultiplier = {
      beginner: 0.8,
      intermediate: 1.0,
      advanced: 1.2
    };
    
    return Math.max(3, Math.min(8, Math.floor(baseCount * difficultyMultiplier[difficulty])));
  }

  selectBalancedExercises(exercises, count, focus) {
    if (focus === 'general') {
      // Try to balance categories
      const categories = ['chest', 'legs', 'back', 'core', 'cardio'];
      const selected = [];
      
      categories.forEach(category => {
        const categoryExercises = exercises.filter(ex => ex.category === category);
        if (categoryExercises.length > 0) {
          const random = categoryExercises[Math.floor(Math.random() * categoryExercises.length)];
          selected.push(random);
        }
      });
      
      // Fill remaining slots randomly
      while (selected.length < count && selected.length < exercises.length) {
        const remaining = exercises.filter(ex => !selected.includes(ex));
        if (remaining.length === 0) break;
        
        const random = remaining[Math.floor(Math.random() * remaining.length)];
        selected.push(random);
      }
      
      return selected.slice(0, count);
    } else {
      // Focus-specific selection
      const shuffled = [...exercises].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }
  }

  structureWorkout(exercises, duration, focus) {
    const workout = {
      name: this.generateWorkoutName(focus),
      estimatedDuration: duration,
      focus,
      exercises: [],
      structure: {
        warmup: [],
        main: [],
        cooldown: []
      },
      instructions: [],
      progressionNotes: []
    };

    // Add warmup (if duration > 20 minutes)
    if (duration > 20) {
      workout.structure.warmup = [
        { name: 'Light Cardio', duration: '3-5 minutes', type: 'warmup' },
        { name: 'Dynamic Stretches', duration: '2-3 minutes', type: 'warmup' }
      ];
    }

    // Structure main exercises
    exercises.forEach((exercise, index) => {
      const workoutExercise = {
        name: exercise.name,
        category: exercise.category,
        type: exercise.type,
        sets: this.calculateSets(exercise, duration),
        reps: this.calculateReps(exercise),
        rest: this.calculateRest(exercise.type),
        image: exercise.image,
        instructions: exercise.instructions,
        tips: exercise.tips
      };

      workout.exercises.push(workoutExercise);
      workout.structure.main.push(workoutExercise);
    });

    // Add cooldown (if duration > 15 minutes)
    if (duration > 15) {
      workout.structure.cooldown = [
        { name: 'Cool Down Walk', duration: '2-3 minutes', type: 'cooldown' },
        { name: 'Static Stretches', duration: '3-5 minutes', type: 'cooldown' }
      ];
    }

    // Add general instructions
    workout.instructions = [
      'Maintain proper form throughout each exercise',
      'Rest 30-60 seconds between sets',
      'Stay hydrated during your workout',
      'Listen to your body and adjust intensity as needed'
    ];

    return workout;
  }

  calculateSets(exercise, duration) {
    const baseSets = {
      strength: 3,
      cardio: 2,
      flexibility: 2
    };
    
    const sets = baseSets[exercise.type] || 3;
    
    // Adjust based on duration
    if (duration < 20) return Math.max(2, sets - 1);
    if (duration > 45) return sets + 1;
    return sets;
  }

  calculateReps(exercise) {
    const repRanges = {
      strength: { min: 8, max: 12 },
      cardio: { min: 15, max: 20 },
      flexibility: { min: 1, max: 1, unit: '30s hold' }
    };
    
    const range = repRanges[exercise.type] || repRanges.strength;
    
    if (range.unit) return range.unit;
    return `${range.min}-${range.max}`;
  }

  calculateRest(exerciseType) {
    const restTimes = {
      strength: '45-60 seconds',
      cardio: '30-45 seconds',
      flexibility: '15-30 seconds'
    };
    
    return restTimes[exerciseType] || restTimes.strength;
  }

  generateWorkoutName(focus) {
    const names = {
      general: ['Full Body Blast', 'Total Body Workout', 'Complete Fitness'],
      strength: ['Strength Builder', 'Power Session', 'Muscle Focus'],
      cardio: ['Cardio Crusher', 'Heart Pumper', 'Endurance Booster'],
      legs: ['Leg Day', 'Lower Body Power', 'Quad & Glute Focus'],
      chest: ['Chest Blast', 'Upper Body Push', 'Pec Power'],
      back: ['Back Builder', 'Pull Power', 'Posture Perfect'],
      core: ['Core Crusher', 'Ab Attack', 'Core Stability']
    };
    
    const options = names[focus] || names.general;
    return options[Math.floor(Math.random() * options.length)];
  }

  generateProgressionNotes(analysis) {
    const notes = [];
    
    if (analysis.progressTrend === 'improving') {
      notes.push('🎯 You\'re progressing well! Consider increasing reps by 2-3 next session.');
    }
    
    if (analysis.consistencyScore > 80) {
      notes.push('🔥 Great consistency! You\'re ready for more challenging variations.');
    }
    
    if (analysis.performanceMetrics.exerciseVariety < 5) {
      notes.push('🔄 Try to incorporate 1-2 new exercises to keep progressing.');
    }
    
    return notes;
  }

  getRecentExercises(workoutHistory) {
    if (!workoutHistory.length) return [];
    
    const recentWorkouts = workoutHistory.slice(-3); // Last 3 workouts
    return recentWorkouts.flatMap(workout => workout.exercises || []);
  }

  // Get user feedback and update profile
  recordFeedback(workoutId, feedback) {
    const feedbackData = {
      workoutId,
      difficulty: feedback.difficulty, // too_easy, just_right, too_hard
      enjoyment: feedback.enjoyment, // 1-5 scale
      completion: feedback.completion, // completed, partial, skipped
      exercises: feedback.exercises || [], // per-exercise feedback
      notes: feedback.notes || '',
      timestamp: new Date().toISOString()
    };
    
    // Store feedback (in real app, this would go to database)
    const existingFeedback = JSON.parse(localStorage.getItem('workoutFeedback') || '[]');
    existingFeedback.push(feedbackData);
    localStorage.setItem('workoutFeedback', JSON.stringify(existingFeedback));
    
    // Update profile based on feedback
    this.adaptProfileFromFeedback(feedbackData);
  }

  adaptProfileFromFeedback(feedback) {
    // Adjust difficulty preference
    if (feedback.difficulty === 'too_easy' && feedback.completion === 'completed') {
      if (this.userProfile.fitnessLevel === 'beginner') {
        this.userProfile.fitnessLevel = 'intermediate';
      } else if (this.userProfile.fitnessLevel === 'intermediate') {
        this.userProfile.fitnessLevel = 'advanced';
      }
    } else if (feedback.difficulty === 'too_hard') {
      if (this.userProfile.fitnessLevel === 'advanced') {
        this.userProfile.fitnessLevel = 'intermediate';
      } else if (this.userProfile.fitnessLevel === 'intermediate') {
        this.userProfile.fitnessLevel = 'beginner';
      }
    }
    
    // Update preferences based on exercise feedback
    feedback.exercises?.forEach(exerciseFeedback => {
      if (exerciseFeedback.enjoyment >= 4) {
        if (!this.userProfile.preferences.favoriteExercises.includes(exerciseFeedback.name)) {
          this.userProfile.preferences.favoriteExercises.push(exerciseFeedback.name);
        }
      } else if (exerciseFeedback.enjoyment <= 2) {
        if (!this.userProfile.preferences.excludeExercises.includes(exerciseFeedback.name)) {
          this.userProfile.preferences.excludeExercises.push(exerciseFeedback.name);
        }
      }
    });
    
    this.saveUserProfile();
  }
}

// Create singleton instance
const adaptiveWorkoutPlanner = new AdaptiveWorkoutPlanner();

export default adaptiveWorkoutPlanner;

import { WorkoutData, Workout } from '@/types';
import { Workout as WorkoutModel } from '@/models';

/**
 * WorkoutParser Service
 * Parses natural language workout descriptions into structured data
 */
export default class WorkoutParser {
  /**
   * Check if a message contains workout information
   */
  static isWorkoutMessage(message: string): boolean {
    const workoutKeywords = [
      'workout', 'exercise', 'training', 'gym', 'lift', 'run', 'cardio',
      'squat', 'bench', 'deadlift', 'press', 'curl', 'row', 'pull',
      'sets', 'reps', 'kg', 'lbs', 'miles', 'km'
    ];
    
    const messageLower = message.toLowerCase();
    return workoutKeywords.some(keyword => messageLower.includes(keyword));
  }

  /**
   * Parse workout information from natural language
   * 
   * Examples:
   * - "Did 3x10 squats 80kg today"
   * - "Ran 5km in 25 minutes"
   * - "Upper body session - bench press, rows"
   */
  static parseWorkout(message: string): WorkoutData | null {
    try {
      const exercises = this.extractExercises(message);
      
      if (exercises.length === 0) {
        return null;
      }

      return {
        name: this.generateWorkoutName(message, exercises),
        date: new Date(),
        exercises,
        notes: message
      };
    } catch (error) {
      console.error('Error parsing workout:', error);
      return null;
    }
  }

  /**
   * Extract exercises from message
   */
  private static extractExercises(message: string): any[] {
    const exercises: any[] = [];
    const messageLower = message.toLowerCase();

    // Pattern: "3x10 squats 80kg"
    const setsRepsWeightPattern = /(\d+)x(\d+)\s+([a-z\s]+?)\s+(\d+(?:\.\d+)?)(kg|lbs)/gi;
    let match;

    while ((match = setsRepsWeightPattern.exec(message)) !== null) {
      exercises.push({
        name: match[3].trim(),
        sets: parseInt(match[1]),
        reps: parseInt(match[2]),
        weightKg: match[5].toLowerCase() === 'kg' ? parseFloat(match[4]) : parseFloat(match[4]) * 0.453592
      });
    }

    // Pattern: "ran 5km" or "5 miles"
    const distancePattern = /(\d+(?:\.\d+)?)\s*(km|miles?|mi)/gi;
    while ((match = distancePattern.exec(message)) !== null) {
      const isCardio = /run|jog|walk|bike|cycle|swim/i.test(message);
      if (isCardio) {
        exercises.push({
          name: 'cardio',
          distance: parseFloat(match[1]),
          distanceUnit: match[2].toLowerCase().startsWith('k') ? 'km' : 'mi'
        });
      }
    }

    // Pattern: "20 minutes cardio"
    const durationPattern = /(\d+)\s*(?:min|minutes?)\s+([a-z]+)/gi;
    while ((match = durationPattern.exec(message)) !== null) {
      exercises.push({
        name: match[2].trim(),
        durationMin: parseInt(match[1])
      });
    }

    return exercises;
  }

  /**
   * Generate a workout name from the message
   */
  private static generateWorkoutName(message: string, exercises: any[]): string {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('leg')) return 'Leg Workout';
    if (messageLower.includes('upper')) return 'Upper Body Workout';
    if (messageLower.includes('push')) return 'Push Workout';
    if (messageLower.includes('pull')) return 'Pull Workout';
    if (messageLower.includes('cardio') || messageLower.includes('run')) return 'Cardio Session';
    
    if (exercises.length > 0) {
      return exercises[0].name.charAt(0).toUpperCase() + exercises[0].name.slice(1) + ' Workout';
    }
    
    return 'Workout Session';
  }

  /**
   * Save parsed workout to database
   */
  static async saveWorkout(data: WorkoutData): Promise<Workout> {
    const workout = new WorkoutModel({
      ...data,
      userId: 'local'
    });
    
    await workout.save();
    return workout.toObject() as Workout;
  }
}

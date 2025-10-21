import { Workout } from "@/models/index.js";

class WorkoutParser {
  static workoutKeywords = [
    "did",
    "completed",
    "finished",
    "workout",
    "trained",
    "session",
    "squats",
    "deadlifts",
    "bench",
    "press",
    "curls",
    "rows",
    "pullups",
    "pushups",
    "lunges",
    "dips",
    "chinups",
    "overhead",
    "lateral",
    "cardio",
    "running",
    "cycling",
    "treadmill",
    "elliptical",
  ];

  static exercisePatterns = [
    // Pattern: "3x10 squats 80kg" or "3 sets of 10 squats at 80kg"
    /(\d+)\s*x\s*(\d+)\s+([a-zA-Z\s]+?)(?:\s+(\d+(?:\.\d+)?)\s*kg)?/gi,

    // Pattern: "10 reps of squats" or "squats for 10 reps"
    /(\d+)\s+reps?\s+(?:of\s+)?([a-zA-Z\s]+)|([a-zA-Z\s]+)\s+for\s+(\d+)\s+reps?/gi,

    // Pattern: "3 sets squats" or "squats 3 sets"
    /(\d+)\s+sets?\s+(?:of\s+)?([a-zA-Z\s]+)|([a-zA-Z\s]+)\s+(\d+)\s+sets?/gi,

    // Pattern: "ran 5km" or "cycling 30 minutes"
    /(?:ran|running|cycled?|cycling|walked?|walking)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(km|miles?|minutes?|mins?|hours?|hrs?)/gi,

    // Pattern: "20 minutes cardio"
    /(\d+)\s*(minutes?|mins?|hours?|hrs?)\s+([a-zA-Z\s]+)/gi,
  ];

  static isWorkoutMessage(message) {
    const lowerMessage = message.toLowerCase();
    return (
      this.workoutKeywords.some((keyword) => lowerMessage.includes(keyword)) ||
      this.exercisePatterns.some((pattern) => pattern.test(message))
    );
  }

  static parseWorkout(message) {
    if (!this.isWorkoutMessage(message)) {
      return null;
    }

    const exercises = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Extract date if mentioned (simple patterns)
    let workoutDate = today;
    const dateMatches = message.match(
      /(?:yesterday|today|(\d{1,2}[\/\-]\d{1,2}))/i
    );
    if (dateMatches) {
      if (dateMatches[0].toLowerCase() === "yesterday") {
        workoutDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      } else if (dateMatches[1]) {
        // Simple date parsing - extend as needed
        const [month, day] = dateMatches[1].split(/[\/\-]/);
        const currentYear = new Date().getFullYear();
        workoutDate = new Date(currentYear, parseInt(month) - 1, parseInt(day));
      }
    }

    // Parse exercises using patterns
    this.exercisePatterns.forEach((pattern) => {
      let match;
      pattern.lastIndex = 0; // Reset regex

      while ((match = pattern.exec(message)) !== null) {
        const exercise = this.extractExerciseFromMatch(match, pattern);
        if (exercise && exercise.name) {
          exercises.push(exercise);
        }
      }
    });

    // Remove duplicates and clean up exercise names
    const uniqueExercises = this.deduplicateExercises(exercises);

    if (uniqueExercises.length === 0) {
      return null;
    }

    // Extract workout name from context
    let workoutName = this.extractWorkoutName(message);

    return {
      date: workoutDate,
      name: workoutName,
      notes: message, // Store original message as notes
      exercises: uniqueExercises,
    };
  }

  static extractExerciseFromMatch(match, pattern) {
    // Different handling based on pattern matched
    const exercise = {
      name: "",
      sets: null,
      reps: null,
      weightKg: null,
      durationS: null,
    };

    // Pattern 1: "3x10 squats 80kg"
    if (match[3] && match[1] && match[2]) {
      exercise.name = this.cleanExerciseName(match[3]);
      exercise.sets = parseInt(match[1]);
      exercise.reps = parseInt(match[2]);
      exercise.weightKg = match[4] ? parseFloat(match[4]) : null;
    }
    // Pattern 2: "10 reps of squats" or "squats for 10 reps"
    else if ((match[1] && match[2]) || (match[3] && match[4])) {
      exercise.name = this.cleanExerciseName(match[2] || match[3]);
      exercise.reps = parseInt(match[1] || match[4]);
    }
    // Pattern 3: Cardio with duration "ran 5km" or "20 minutes cardio"
    else if (match[1] && match[2] && match[3]) {
      exercise.name = this.cleanExerciseName(match[3] || "cardio");
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();

      if (unit.includes("minute") || unit.includes("min")) {
        exercise.durationS = value * 60;
      } else if (unit.includes("hour") || unit.includes("hr")) {
        exercise.durationS = value * 3600;
      } else if (unit.includes("km")) {
        exercise.name = `running ${value}km`;
      } else if (unit.includes("mile")) {
        exercise.name = `running ${value}mi`;
      }
    }

    return exercise.name ? exercise : null;
  }

  static cleanExerciseName(name) {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  static extractWorkoutName(message) {
    const lowerMessage = message.toLowerCase();

    // Look for body part mentions
    const bodyParts = [
      "legs",
      "arms",
      "chest",
      "back",
      "shoulders",
      "core",
      "abs",
    ];
    const mentionedParts = bodyParts.filter((part) =>
      lowerMessage.includes(part)
    );

    if (mentionedParts.length > 0) {
      return mentionedParts.join(" + ") + " workout";
    }

    // Look for workout type mentions
    if (lowerMessage.includes("cardio")) return "Cardio Session";
    if (lowerMessage.includes("strength") || lowerMessage.includes("lifting"))
      return "Strength Training";
    if (lowerMessage.includes("run")) return "Running Session";

    return null; // Let it be auto-named by date
  }

  static deduplicateExercises(exercises) {
    const seen = new Map();

    exercises.forEach((exercise) => {
      const key = exercise.name;
      if (seen.has(key)) {
        // Merge data - take highest values
        const existing = seen.get(key);
        existing.sets =
          Math.max(existing.sets || 0, exercise.sets || 0) || null;
        existing.reps =
          Math.max(existing.reps || 0, exercise.reps || 0) || null;
        existing.weightKg =
          Math.max(existing.weightKg || 0, exercise.weightKg || 0) || null;
        existing.durationS =
          Math.max(existing.durationS || 0, exercise.durationS || 0) || null;
      } else {
        seen.set(key, { ...exercise });
      }
    });

    return Array.from(seen.values());
  }

  static async saveWorkout(workoutData) {
    try {
      const workout = new Workout(workoutData);

      // Set workoutId for each exercise
      workout.exercises.forEach((exercise) => {
        exercise.workoutId = workout._id;
      });

      await workout.save();
      return workout;
    } catch (error) {
      console.error("Error saving workout:", error);
      throw error;
    }
  }
}

export default WorkoutParser;

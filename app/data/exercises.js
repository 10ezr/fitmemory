// Exercise database with images and detailed information
export const exerciseDatabase = {
  // Chest Exercises
  "push-ups": {
    name: "Push-ups",
    category: "chest",
    type: "strength",
    muscle: ["chest", "triceps", "shoulders"],
    difficulty: "beginner",
    equipment: "none",
    image: "/images/exercises/push-ups.jpg",
    description: "Classic bodyweight exercise targeting chest, shoulders, and triceps",
    instructions: [
      "Start in plank position with hands slightly wider than shoulders",
      "Lower body until chest nearly touches floor",
      "Push back up to starting position",
      "Keep body in straight line throughout"
    ],
    tips: [
      "Keep core engaged",
      "Don't let hips sag",
      "Control the descent"
    ]
  },
  
  "bench-press": {
    name: "Bench Press",
    category: "chest",
    type: "strength",
    muscle: ["chest", "triceps", "shoulders"],
    difficulty: "intermediate",
    equipment: "barbell",
    image: "/images/exercises/bench-press.jpg",
    description: "Fundamental upper body strength exercise",
    instructions: [
      "Lie on bench with feet flat on floor",
      "Grip bar slightly wider than shoulders",
      "Lower bar to chest with control",
      "Press bar back to starting position"
    ]
  },

  // Leg Exercises
  "squats": {
    name: "Squats",
    category: "legs",
    type: "strength",
    muscle: ["quadriceps", "glutes", "hamstrings"],
    difficulty: "beginner",
    equipment: "none",
    image: "/images/exercises/squats.jpg",
    description: "Fundamental lower body compound movement",
    instructions: [
      "Stand with feet shoulder-width apart",
      "Lower hips back and down as if sitting in chair",
      "Keep chest up and knees tracking over toes",
      "Return to starting position"
    ]
  },

  "deadlifts": {
    name: "Deadlifts",
    category: "legs",
    type: "strength",
    muscle: ["hamstrings", "glutes", "back"],
    difficulty: "intermediate",
    equipment: "barbell",
    image: "/images/exercises/deadlifts.jpg",
    description: "King of all exercises - works entire posterior chain",
    instructions: [
      "Stand with feet hip-width apart",
      "Hinge at hips to grab bar",
      "Drive through heels to stand up straight",
      "Reverse movement to lower bar"
    ]
  },

  "lunges": {
    name: "Lunges",
    category: "legs",
    type: "strength",
    muscle: ["quadriceps", "glutes", "hamstrings"],
    difficulty: "beginner",
    equipment: "none",
    image: "/images/exercises/lunges.jpg",
    description: "Unilateral leg exercise for strength and balance"
  },

  // Back Exercises
  "pull-ups": {
    name: "Pull-ups",
    category: "back",
    type: "strength",
    muscle: ["lats", "biceps", "rhomboids"],
    difficulty: "intermediate",
    equipment: "pull-up bar",
    image: "/images/exercises/pull-ups.jpg",
    description: "Ultimate upper body pulling exercise"
  },

  "rows": {
    name: "Rows",
    category: "back",
    type: "strength",
    muscle: ["lats", "rhomboids", "rear delts"],
    difficulty: "beginner",
    equipment: "dumbbells",
    image: "/images/exercises/rows.jpg",
    description: "Essential pulling movement for back development"
  },

  // Shoulder Exercises
  "shoulder-press": {
    name: "Shoulder Press",
    category: "shoulders",
    type: "strength",
    muscle: ["shoulders", "triceps"],
    difficulty: "beginner",
    equipment: "dumbbells",
    image: "/images/exercises/shoulder-press.jpg",
    description: "Primary shoulder strengthening exercise"
  },

  // Core Exercises
  "plank": {
    name: "Plank",
    category: "core",
    type: "strength",
    muscle: ["abs", "core"],
    difficulty: "beginner",
    equipment: "none",
    image: "/images/exercises/plank.jpg",
    description: "Isometric core strengthening exercise",
    instructions: [
      "Start in push-up position",
      "Hold body in straight line",
      "Keep core engaged",
      "Breathe normally"
    ]
  },

  "crunches": {
    name: "Crunches",
    category: "core",
    type: "strength",
    muscle: ["abs"],
    difficulty: "beginner",
    equipment: "none",
    image: "/images/exercises/crunches.jpg",
    description: "Targeted abdominal exercise"
  },

  // Cardio Exercises
  "jumping-jacks": {
    name: "Jumping Jacks",
    category: "cardio",
    type: "cardio",
    muscle: ["full-body"],
    difficulty: "beginner",
    equipment: "none",
    image: "/images/exercises/jumping-jacks.jpg",
    description: "Full-body cardiovascular exercise"
  },

  "burpees": {
    name: "Burpees",
    category: "cardio",
    type: "cardio",
    muscle: ["full-body"],
    difficulty: "intermediate",
    equipment: "none",
    image: "/images/exercises/burpees.jpg",
    description: "High-intensity full-body exercise"
  },

  "mountain-climbers": {
    name: "Mountain Climbers",
    category: "cardio",
    type: "cardio",
    muscle: ["core", "legs"],
    difficulty: "beginner",
    equipment: "none",
    image: "/images/exercises/mountain-climbers.jpg",
    description: "Dynamic cardio and core exercise"
  },

  "high-knees": {
    name: "High Knees",
    category: "cardio",
    type: "cardio",
    muscle: ["legs", "core"],
    difficulty: "beginner",
    equipment: "none",
    image: "/images/exercises/high-knees.jpg",
    description: "Running in place with high knee lift"
  }
};

// Helper functions
export const getExercisesByCategory = (category) => {
  return Object.entries(exerciseDatabase)
    .filter(([key, exercise]) => exercise.category === category)
    .reduce((obj, [key, exercise]) => {
      obj[key] = exercise;
      return obj;
    }, {});
};

export const getExercisesByDifficulty = (difficulty) => {
  return Object.entries(exerciseDatabase)
    .filter(([key, exercise]) => exercise.difficulty === difficulty)
    .reduce((obj, [key, exercise]) => {
      obj[key] = exercise;
      return obj;
    }, {});
};

export const getExercisesByEquipment = (equipment) => {
  return Object.entries(exerciseDatabase)
    .filter(([key, exercise]) => exercise.equipment === equipment)
    .reduce((obj, [key, exercise]) => {
      obj[key] = exercise;
      return obj;
    }, {});
};

export const searchExercises = (query) => {
  const lowercaseQuery = query.toLowerCase();
  return Object.entries(exerciseDatabase)
    .filter(([key, exercise]) => 
      exercise.name.toLowerCase().includes(lowercaseQuery) ||
      exercise.category.toLowerCase().includes(lowercaseQuery) ||
      exercise.muscle.some(m => m.toLowerCase().includes(lowercaseQuery))
    )
    .reduce((obj, [key, exercise]) => {
      obj[key] = exercise;
      return obj;
    }, {});
};

export const getRandomExercises = (count = 5, category = null) => {
  let exercises = Object.entries(exerciseDatabase);
  
  if (category) {
    exercises = exercises.filter(([key, exercise]) => exercise.category === category);
  }
  
  // Shuffle array
  const shuffled = exercises.sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, count).reduce((obj, [key, exercise]) => {
    obj[key] = exercise;
    return obj;
  }, {});
};

export default exerciseDatabase;

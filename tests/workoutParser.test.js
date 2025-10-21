const WorkoutParser = require("@/services/workoutParser");
const { Workout } = require("@/models");

describe("WorkoutParser", () => {
  describe("isWorkoutMessage", () => {
    test("should identify workout messages", () => {
      expect(
        WorkoutParser.isWorkoutMessage("I did 3x10 squats 80kg today")
      ).toBe(true);
      expect(WorkoutParser.isWorkoutMessage("Completed legs workout")).toBe(
        true
      );
      expect(WorkoutParser.isWorkoutMessage("Ran 5km this morning")).toBe(true);
      expect(
        WorkoutParser.isWorkoutMessage("finished bench press session")
      ).toBe(true);
    });

    test("should not identify non-workout messages", () => {
      expect(WorkoutParser.isWorkoutMessage("How are you today?")).toBe(false);
      expect(WorkoutParser.isWorkoutMessage("What should I eat?")).toBe(false);
      expect(WorkoutParser.isWorkoutMessage("Tell me about nutrition")).toBe(
        false
      );
    });
  });

  describe("parseWorkout", () => {
    test("should parse basic workout with sets and reps", () => {
      const result = WorkoutParser.parseWorkout("I did 3x10 squats 80kg today");

      expect(result).toBeTruthy();
      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0].name).toBe("squats");
      expect(result.exercises[0].sets).toBe(3);
      expect(result.exercises[0].reps).toBe(10);
      expect(result.exercises[0].weightKg).toBe(80);
    });

    test("should parse multiple exercises", () => {
      const result = WorkoutParser.parseWorkout(
        "Did legs today - 3x8 squats 100kg, 3x12 lunges"
      );

      expect(result).toBeTruthy();
      expect(result.exercises.length).toBeGreaterThan(0);
      expect(result.name).toBe("legs workout");
    });

    test("should parse cardio workouts", () => {
      const result = WorkoutParser.parseWorkout("Ran 5km today in 25 minutes");

      expect(result).toBeTruthy();
      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0].name).toContain("running");
    });

    test("should handle workout with duration", () => {
      const result = WorkoutParser.parseWorkout(
        "20 minutes cardio on treadmill"
      );

      expect(result).toBeTruthy();
      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0].durationS).toBe(20 * 60);
    });

    test("should return null for non-workout messages", () => {
      const result = WorkoutParser.parseWorkout("How was your day?");
      expect(result).toBeNull();
    });

    test("should handle date variations", () => {
      const resultToday = WorkoutParser.parseWorkout("Did squats today");
      const resultYesterday = WorkoutParser.parseWorkout(
        "Did squats yesterday"
      );

      expect(resultToday.date).toBeTruthy();
      expect(resultYesterday.date).toBeTruthy();
      expect(resultYesterday.date.getTime()).toBeLessThan(
        resultToday.date.getTime()
      );
    });
  });

  describe("saveWorkout", () => {
    test("should save workout to database", async () => {
      const workoutData = {
        date: new Date(),
        name: "Test Workout",
        exercises: [
          {
            name: "squats",
            sets: 3,
            reps: 10,
            weightKg: 80,
          },
        ],
      };

      const savedWorkout = await WorkoutParser.saveWorkout(workoutData);

      expect(savedWorkout._id).toBeTruthy();
      expect(savedWorkout.exercises).toHaveLength(1);
      expect(savedWorkout.exercises[0].workoutId).toBeTruthy();

      // Verify it's actually in the database
      const foundWorkout = await Workout.findById(savedWorkout._id);
      expect(foundWorkout).toBeTruthy();
      expect(foundWorkout.name).toBe("Test Workout");
    });
  });

  describe("deduplicateExercises", () => {
    test("should merge duplicate exercises", () => {
      const exercises = [
        { name: "squats", sets: 3, reps: 10, weightKg: 80 },
        { name: "squats", sets: 2, reps: 8, weightKg: 85 },
        { name: "bench press", sets: 3, reps: 8, weightKg: 70 },
      ];

      const result = WorkoutParser.deduplicateExercises(exercises);

      expect(result).toHaveLength(2);

      const squats = result.find((ex) => ex.name === "squats");
      expect(squats.sets).toBe(3); // max of 3 and 2
      expect(squats.reps).toBe(10); // max of 10 and 8
      expect(squats.weightKg).toBe(85); // max of 80 and 85
    });
  });

  describe("cleanExerciseName", () => {
    test("should clean and normalize exercise names", () => {
      expect(WorkoutParser.cleanExerciseName("  SQUATS  ")).toBe("squats");
      expect(WorkoutParser.cleanExerciseName("Bench-Press!!")).toBe(
        "bench press"
      );
      expect(WorkoutParser.cleanExerciseName("pull  ups")).toBe("pull ups");
    });
  });
});

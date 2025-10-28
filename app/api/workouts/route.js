import { NextResponse } from "next/server";
import connectDB from "@/lib/database";
import { Workout, User, AppConfig, Streak } from "@/models";
import { evaluateAndUpdateStreak } from "@/services/streakService";

export async function POST(request) {
  try {
    await connectDB();

    const { name, exercises, duration, date } = await request.json();

    if (!name || !exercises || !Array.isArray(exercises)) {
      return NextResponse.json(
        { error: "Name and exercises are required" },
        { status: 400 }
      );
    }

    // Create new workout
    const workout = new Workout({
      date: date ? new Date(date) : new Date(),
      name,
      exercises: exercises.map((exercise) => ({
        workoutId: null, // Will be set after workout is saved
        name: exercise.name,
        sets: exercise.sets || 1,
        reps: exercise.reps || 1,
        weightKg: exercise.weightKg,
        durationS: duration || 0,
        notes: exercise.notes,
      })),
    });

    await workout.save();

    // Update exercise workoutIds
    workout.exercises.forEach((exercise) => {
      exercise.workoutId = workout._id;
    });
    await workout.save();

    // Update streak using centralized service
    await updateStreakAfterWorkout(workout.date);

    return NextResponse.json({
      success: true,
      workout: {
        id: workout._id,
        name: workout.name,
        date: workout.date,
        exercises: workout.exercises.length,
      },
    });
  } catch (error) {
    console.error("Error saving workout:", error);
    return NextResponse.json(
      { error: "Failed to save workout" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 10;
    const offset = parseInt(searchParams.get("offset")) || 0;

    const workouts = await Workout.find({})
      .sort({ date: -1 })
      .limit(limit)
      .skip(offset);

    return NextResponse.json({ workouts });
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}

async function updateStreakAfterWorkout(workoutDate) {
  try {
    // Update the streak record with the new workout date
    const streak = await Streak.findById("local");
    if (!streak) {
      // Create new streak record
      const newStreak = new Streak({
        _id: "local",
        currentStreak: 1,
        longestStreak: 1,
        lastWorkoutDate: workoutDate,
        missedWorkouts: 0,
      });
      await newStreak.save();
    } else {
      // Update existing streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const workoutDay = new Date(workoutDate);
      workoutDay.setHours(0, 0, 0, 0);

      const lastWorkoutDate = streak.lastWorkoutDate
        ? new Date(streak.lastWorkoutDate)
        : null;
      lastWorkoutDate?.setHours(0, 0, 0, 0);

      // Calculate days between last workout and this workout
      let daysBetween = 0;
      if (lastWorkoutDate) {
        daysBetween = Math.floor(
          (workoutDay.getTime() - lastWorkoutDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }

      if (daysBetween === 1) {
        // Consecutive day - increment streak
        streak.currentStreak = (streak.currentStreak || 0) + 1;
        streak.longestStreak = Math.max(
          streak.longestStreak || 0,
          streak.currentStreak
        );
      } else if (daysBetween > 1) {
        // Gap in days - reset streak
        streak.currentStreak = 1;
        streak.missedWorkouts =
          (streak.missedWorkouts || 0) + (daysBetween - 1);
      } else if (daysBetween === 0) {
        // Same day - don't change streak
        // Just update the last workout date
      } else {
        // Future date or first workout
        streak.currentStreak = 1;
        streak.longestStreak = Math.max(streak.longestStreak || 0, 1);
      }

      streak.lastWorkoutDate = workoutDate;
      streak.updatedAt = new Date();
      await streak.save();
    }

    // Update AppConfig with current streak data
    const { streak: updatedStreak } = await evaluateAndUpdateStreak();
    await AppConfig.findByIdAndUpdate(
      "singleton",
      {
        $set: {
          "consistency.dailyStreak": updatedStreak.currentStreak,
          "consistency.longestStreak": updatedStreak.longestStreak,
          "consistency.lastWorkoutDate": updatedStreak.lastWorkoutDate,
        },
      },
      { upsert: true }
    );

    console.log(
      `Updated streak: ${updatedStreak.currentStreak} (longest: ${updatedStreak.longestStreak})`
    );
  } catch (error) {
    console.error("Error updating streak after workout:", error);
  }
}

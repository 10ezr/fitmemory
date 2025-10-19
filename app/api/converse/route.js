import { NextResponse } from "next/server";
import connectDatabase from "../../../lib/database";
import { User, Message, Streak } from "../../../models";
import WorkoutParser from "../../../services/workoutParser";
import GeminiService from "../../../services/geminiService";
import MemoryService from "../../../services/memoryService";

// Function to increment streak when workout is completed
async function incrementStreak() {
  try {
    console.log("Starting streak increment...");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = await Streak.findById("local");
    console.log("Current streak from DB:", streak);

    if (!streak) {
      console.log("Creating new streak record");
      streak = new Streak({
        _id: "local",
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        streakHistory: [],
        workoutSchedule: null, // AI-determined schedule
        missedWorkouts: 0,
        flexibleMode: true, // Allow AI to adjust schedule
      });
    }

    // Check if workout was already logged today
    const lastWorkoutDate = streak.lastWorkoutDate
      ? new Date(streak.lastWorkoutDate)
      : null;
    const alreadyWorkedOutToday =
      lastWorkoutDate && lastWorkoutDate.getTime() === today.getTime();

    console.log("Workout check:", {
      lastWorkoutDate,
      today: today.toISOString(),
      alreadyWorkedOutToday,
    });

    if (!alreadyWorkedOutToday) {
      console.log(
        "Incrementing streak from",
        streak.currentStreak,
        "to",
        streak.currentStreak + 1
      );

      // Increment streak
      streak.currentStreak += 1;
      streak.lastWorkoutDate = today;
      streak.missedWorkouts = 0; // Reset missed counter

      // Update longest streak if current streak is higher
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }

      // Add to streak history
      streak.streakHistory.push({
        date: today,
        streak: streak.currentStreak,
      });

      // Keep only last 30 days of history
      if (streak.streakHistory.length > 30) {
        streak.streakHistory = streak.streakHistory.slice(-30);
      }

      streak.updatedAt = new Date();
      await streak.save();
      console.log("Streak saved successfully");

      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        isNewRecord: streak.currentStreak === streak.longestStreak,
        missedWorkouts: streak.missedWorkouts,
      };
    }

    console.log("No streak increment needed - already worked out today");
    return null; // No increment needed
  } catch (error) {
    console.error("Error incrementing streak:", error);
    return null;
  }
}

// Function to check and potentially reset streak based on missed workouts
async function checkStreakStatus() {
  try {
    const streak = await Streak.findById("local");
    if (!streak) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastWorkoutDate = streak.lastWorkoutDate
      ? new Date(streak.lastWorkoutDate)
      : null;

    if (!lastWorkoutDate) return null;

    // Calculate days since last workout
    const daysSinceLastWorkout = Math.floor(
      (today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log("Streak status check:", {
      daysSinceLastWorkout,
      currentStreak: streak.currentStreak,
      missedWorkouts: streak.missedWorkouts,
    });

    // If it's been more than 1 day since last workout, increment missed counter
    if (daysSinceLastWorkout > 1) {
      streak.missedWorkouts =
        streak.missedWorkouts + (daysSinceLastWorkout - 1);

      // Reset streak if missed too many workouts (flexible threshold)
      const maxMissedDays = streak.flexibleMode ? 3 : 2; // AI can adjust this

      if (streak.missedWorkouts >= maxMissedDays) {
        console.log("Resetting streak due to missed workouts");
        streak.currentStreak = 0;
        streak.missedWorkouts = 0;
        streak.lastWorkoutDate = null;

        await streak.save();

        return {
          streakReset: true,
          reason: "missed_workouts",
          daysMissed: streak.missedWorkouts,
        };
      } else {
        await streak.save();
        return {
          streakMaintained: true,
          missedWorkouts: streak.missedWorkouts,
          daysSinceLastWorkout,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error checking streak status:", error);
    return null;
  }
}

export async function POST(request) {
  try {
    const wantPersistence = process.env.PERSIST_MESSAGES !== "false";
    if (wantPersistence) {
      await connectDatabase();
    }

    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Initialize services
    const geminiService = new GeminiService();
    const memoryService = new MemoryService();

    // Check for "remember this" commands
    const rememberPatterns = [
      /remember this:?/i,
      /please remember:?/i,
      /don't forget:?/i,
      /keep in mind:?/i,
      /note that:?/i,
    ];
    
    const isRememberCommand = rememberPatterns.some((pattern) =>
      pattern.test(message)
    );
    let rememberResponse = null;
    
    if (isRememberCommand) {
      rememberResponse = await memoryService.processRememberCommand(message);
    }

    // 1. Persist incoming user message
    if (wantPersistence) {
      const userMessage = new Message({
        role: "user",
        content: message,
      });
      await userMessage.save();
    }

    // 2. Auto-parse and persist workout if detected
    let workout = null;
    if (wantPersistence && WorkoutParser.isWorkoutMessage(message)) {
      const workoutData = WorkoutParser.parseWorkout(message);
      if (workoutData) {
        workout = await WorkoutParser.saveWorkout(workoutData);
      }
    }

    // 3. Gather context for Gemini
    const user = wantPersistence ? await User.findById("local") : null;
    const context = wantPersistence
      ? await memoryService.getConversationContext()
      : { shortTerm: [], recentWorkouts: [], memories: [] };
    const relevantMemories = await memoryService.getLongTermMemories(
      message,
      3,
      0.6
    );

    // Get current streak data for Gemini context
    let streakData = null;
    if (wantPersistence) {
      const streak = await Streak.findById("local");
      if (streak) {
        streakData = {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastWorkoutDate: streak.lastWorkoutDate,
          missedWorkouts: streak.missedWorkouts,
          flexibleMode: streak.flexibleMode,
          workoutSchedule: streak.workoutSchedule,
        };
      }
    }

    // 4. Generate Gemini response
    const geminiContext = {
      user,
      recentWorkouts: context.recentWorkouts,
      memories: relevantMemories,
      lastMessages: context.shortTerm,
      workoutJustLogged: workout,
      streakData: streakData,
    };

    let reply, actions;
    
    // If it's a remember command, use that response, otherwise generate AI response
    if (rememberResponse && rememberResponse.success) {
      reply = rememberResponse.response;
      actions = [
        {
          action: "memory_add",
        type: rememberResponse.memory.type,
          content: rememberResponse.memory.content,
        },
      ];
    } else if (rememberResponse && !rememberResponse.success) {
      reply = rememberResponse.response;
      actions = [];
    } else {
      const response = await geminiService.generateResponse(
        message,
        geminiContext
      );
      reply = response.reply;
      actions = response.actions;
    }

    // 5. Process any actions returned by Gemini
    if (actions && actions.length > 0) {
      await memoryService.processActions(actions);
    }

    // 6. Handle workout completion and streak management
    let streakUpdate = null;
    let streakStatus = null;

    // Check streak status first (for missed workouts)
    if (wantPersistence) {
      streakStatus = await checkStreakStatus();
    }

    // More sophisticated workout completion detection
    const messageLower = message.toLowerCase();
    const workoutKeywords = [
      "workout",
      "exercise",
      "training",
      "session",
      "gym",
    ];
    const completionKeywords = ["done", "completed", "finished", "complete"];

    const hasWorkoutKeyword = workoutKeywords.some((keyword) =>
      messageLower.includes(keyword)
    );
    const hasCompletionKeyword = completionKeywords.some((keyword) =>
      messageLower.includes(keyword)
    );

    // Check for explicit workout completion phrases
    const explicitCompletion =
      messageLower.includes("workout is done") ||
      messageLower.includes("workout done") ||
      messageLower.includes("finished workout") ||
      messageLower.includes("workout complete") ||
      messageLower.includes("exercise done") ||
      messageLower.includes("training done");

    // Or check if message contains both workout and completion keywords
    const implicitCompletion = hasWorkoutKeyword && hasCompletionKeyword;

    const isWorkoutComplete = explicitCompletion || implicitCompletion;

    // Debug logging
    console.log("Workout completion check:", {
      message: messageLower,
      hasWorkoutKeyword,
      hasCompletionKeyword,
      explicitCompletion,
      implicitCompletion,
      isWorkoutComplete,
    });

    if (isWorkoutComplete && wantPersistence) {
      streakUpdate = await incrementStreak();
      console.log("Streak updated:", streakUpdate);
    }

    // 7. Persist assistant message
    const assistantMessage = new Message({
      role: "assistant",
      content: reply,
      meta: {
        actions,
        workoutLogged: !!workout,
        streakIncremented: !!streakUpdate,
      },
    });
    await assistantMessage.save();

    // 8. Return response
    return NextResponse.json({
      reply,
      actions: actions || [],
      workoutLogged: !!workout,
      streakUpdate: streakUpdate,
      streakStatus: streakStatus,
      workout: workout
        ? {
            id: workout._id,
            name: workout.name,
            exercises: workout.exercises.length,
          }
        : null,
    });
  } catch (error) {
    console.error("Conversation error:", error);
    // Fallback offline response so chat works without DB/API
    return NextResponse.json({
      reply:
        "I'm not connected to the database yet, but I can still chat! Tell me about your last workout.",
      actions: [],
      workoutLogged: false,
      workout: null,
    });
  }
}

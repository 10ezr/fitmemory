import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { User, Message, Streak } from "@/models";
import WorkoutParser from "@/services/workoutParser";
import GeminiService from "@/services/geminiService";
import MemoryService from "@/services/memoryService";
import sleepService from "@/services/sleepService";

function getLocalDateTimePayload(ts) {
  const now = ts?.epochMs ? new Date(ts.epochMs) : new Date();
  const tz = ts?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const display = now.toLocaleString("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { iso: now.toISOString(), timezone: tz, display, epochMs: now.getTime() };
}

async function incrementStreak() { /* unchanged */ }
async function checkStreakStatus() { /* unchanged */ }

export async function POST(request) {
  try {
    const wantPersistence = process.env.PERSIST_MESSAGES !== "false";
    if (wantPersistence) {
      await connectDatabase();
    }

    const body = await request.json();
    const { message, timestamp } = body || {};

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const currentTime = getLocalDateTimePayload(timestamp);

    const geminiService = new GeminiService();
    const memoryService = new MemoryService();

    const rememberPatterns = [/remember this:?/i, /please remember:?/i, /don't forget:?/i, /keep in mind:?/i, /note that:?/i];
    const isRememberCommand = rememberPatterns.some((pattern) => pattern.test(message));
    let rememberResponse = null;

    if (isRememberCommand) {
      rememberResponse = await memoryService.processRememberCommand(message);
    }

    if (wantPersistence) {
      const userMessage = new Message({ role: "user", content: message, meta: { timestamp: currentTime } });
      await userMessage.save();
    }

    let sleepSession = null;
    let sleepLogged = false;
    if (wantPersistence && sleepService.isSleepMessage(message)) {
      try {
        const sleepResult = await sleepService.logSleep(message, currentTime);
        sleepSession = sleepResult.session;
        sleepLogged = true;
      } catch (error) {
        console.error('Error processing sleep data:', error);
      }
    }

    let workout = null;
    if (wantPersistence && WorkoutParser.isWorkoutMessage(message)) {
      const workoutData = WorkoutParser.parseWorkout(message);
      if (workoutData) {
        workout = await WorkoutParser.saveWorkout(workoutData);
      }
    }

    const user = wantPersistence ? await User.findById("local") : null;
    const context = wantPersistence ? await memoryService.getConversationContext() : { shortTerm: [], recentWorkouts: [], memories: [] };
    const relevantMemories = await memoryService.getLongTermMemories(message, 3, 0.6);

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

    let sleepReadiness = null;
    if (wantPersistence) {
      try {
        sleepReadiness = await sleepService.calculateHealthReadiness();
      } catch (error) {
        console.error('Error getting sleep readiness:', error);
      }
    }

    const geminiContext = {
      user,
      recentWorkouts: context.recentWorkouts,
      memories: relevantMemories,
      lastMessages: context.shortTerm,
      workoutJustLogged: workout,
      sleepJustLogged: sleepSession,
      sleepReadiness: sleepReadiness,
      streakData: streakData,
      currentDateTime: currentTime,
    };

    let reply, actions;

    if (rememberResponse && rememberResponse.success) {
      reply = rememberResponse.response;
      actions = [{ action: "memory_add", type: rememberResponse.memory.type, content: rememberResponse.memory.content }];
    } else if (rememberResponse && !rememberResponse.success) {
      reply = rememberResponse.response;
      actions = [];
    } else {
      const response = await geminiService.generateResponse(message, geminiContext);
      reply = response.reply;
      actions = response.actions;
    }

    if (actions && actions.length > 0) {
      await memoryService.processActions(actions);
    }

    let streakUpdate = null;
    let streakStatus = null;

    if (wantPersistence) {
      streakStatus = await checkStreakStatus();
    }

    const messageLower = message.toLowerCase();
    const workoutKeywords = ["workout", "exercise", "training", "session", "gym"];
    const completionKeywords = ["done", "completed", "finished", "complete"];

    const hasWorkoutKeyword = workoutKeywords.some((keyword) => messageLower.includes(keyword));
    const hasCompletionKeyword = completionKeywords.some((keyword) => messageLower.includes(keyword));

    const explicitCompletion =
      messageLower.includes("workout is done") ||
      messageLower.includes("workout done") ||
      messageLower.includes("finished workout") ||
      messageLower.includes("workout complete") ||
      messageLower.includes("exercise done") ||
      messageLower.includes("training done");

    const implicitCompletion = hasWorkoutKeyword && hasCompletionKeyword;

    const isWorkoutComplete = explicitCompletion || implicitCompletion;

    if (isWorkoutComplete && wantPersistence) {
      streakUpdate = await incrementStreak();
    }

    if (wantPersistence) {
      const assistantMessage = new Message({
        role: "assistant",
        content: reply,
        meta: { 
          actions, 
          workoutLogged: !!workout, 
          sleepLogged: sleepLogged,
          streakIncremented: !!streakUpdate,
          timestamp: currentTime
        },
      });
      await assistantMessage.save();
    }

    return NextResponse.json({
      reply,
      actions: actions || [],
      workoutLogged: !!workout,
      sleepLogged: sleepLogged,
      streakUpdate: streakUpdate,
      streakStatus: streakStatus,
      workout: workout ? { id: workout._id, name: workout.name, exercises: workout.exercises.length } : null,
      sleepSession: sleepSession ? {
        id: sleepSession._id,
        quality: sleepSession.sleepQuality,
        duration: sleepSession.totalSleepTime,
        summary: sleepService.generateSessionSummary ? await sleepService.generateSessionSummary(sleepSession) : null
      } : null,
      sleepReadiness: sleepReadiness,
      currentDateTime: currentTime,
    });
  } catch (error) {
    console.error("Conversation error:", error);
    return NextResponse.json({
      reply: "I'm not connected to the database yet, but I can still chat! Tell me about your last workout or how you slept.",
      actions: [],
      workoutLogged: false,
      sleepLogged: false,
      workout: null,
      sleepSession: null,
    });
  }
}

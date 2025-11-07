import { NextRequest } from 'next/server';
import connectDatabase from '@/lib/database';
import { User, Message, Streak } from '@/models';
import WorkoutParser from '@/services/workoutParser';
import GeminiService from '@/services/geminiService';
import MemoryService from '@/services/memoryService';
import sleepService from '@/services/sleepService';
import {
  ConverseRequest,
  ConverseResponse,
  GeminiContext,
  StreakUpdate,
  LocalDateTime,
  WorkoutSummary,
  SleepSummary,
  Workout,
  SleepSession
} from '@/types';
import {
  asyncHandler,
  successResponse,
  errorResponse,
  parseRequestBody,
  getLocalDateTimePayload,
  wantsPersistence
} from '@/lib/apiUtils';
import { messageCreateSchema, validateRequest } from '@/lib/validations';

/**
 * Increment workout streak
 */
async function incrementStreak(): Promise<StreakUpdate | null> {
  try {
    const streak = await Streak.findById('local');
    if (!streak) return null;

    const previous = streak.currentStreak;
    streak.currentStreak += 1;

    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    streak.lastWorkoutDate = new Date();
    await streak.save();

    return {
      previous,
      current: streak.currentStreak,
      increased: true,
      message: `Streak increased to ${streak.currentStreak} days! 🔥`
    };
  } catch (error) {
    console.error('Error incrementing streak:', error);
    return null;
  }
}

/**
 * Check current streak status
 */
async function checkStreakStatus() {
  try {
    const streak = await Streak.findById('local');
    if (!streak) return null;

    const now = new Date();
    const lastWorkout = streak.lastWorkoutDate ? new Date(streak.lastWorkoutDate) : null;

    if (!lastWorkout) {
      return {
        current: 0,
        longest: streak.longestStreak,
        status: 'broken' as const,
        daysUntilReset: 0,
        message: 'No workouts logged yet. Start your streak today!'
      };
    }

    const hoursSinceLastWorkout = (now.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60);
    const daysSinceLastWorkout = Math.floor(hoursSinceLastWorkout / 24);

    if (daysSinceLastWorkout === 0) {
      return {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        lastWorkout,
        status: 'active' as const,
        daysUntilReset: 2,
        message: `Great! Your ${streak.currentStreak}-day streak is active! 💪`
      };
    }

    if (daysSinceLastWorkout === 1) {
      return {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        lastWorkout,
        status: 'at-risk' as const,
        daysUntilReset: 1,
        message: `Your ${streak.currentStreak}-day streak is at risk! Workout today to maintain it.`
      };
    }

    // Streak broken
    if (streak.currentStreak > 0) {
      streak.currentStreak = 0;
      streak.missedWorkouts += 1;
      await streak.save();
    }

    return {
      current: 0,
      longest: streak.longestStreak,
      lastWorkout,
      status: 'broken' as const,
      daysUntilReset: 0,
      message: `Streak broken. Your longest was ${streak.longestStreak} days. Start a new one today!`
    };
  } catch (error) {
    console.error('Error checking streak status:', error);
    return null;
  }
}

/**
 * Main conversation endpoint - POST /api/converse
 */
export const POST = asyncHandler(async (request: NextRequest) => {
  // Check if persistence is enabled
  const persist = wantsPersistence();
  
  if (persist) {
    await connectDatabase();
  }

  // Parse and validate request body
  const body = await parseRequestBody<ConverseRequest>(request);
  
  const validation = await validateRequest(messageCreateSchema, body);
  if (!validation.success) {
    return errorResponse('Invalid request data', 400, validation.errors.errors);
  }

  const { message, timestamp } = validation.data;

  // Get current time with timezone support
  const currentTime: LocalDateTime = getLocalDateTimePayload(timestamp);

  // Initialize services
  const geminiService = new GeminiService();
  const memoryService = new MemoryService();

  // Check for remember command
  const rememberPatterns = [
    /remember this:?/i,
    /please remember:?/i,
    /don't forget:?/i,
    /keep in mind:?/i,
    /note that:?/i
  ];
  const isRememberCommand = rememberPatterns.some(pattern => pattern.test(message));
  let rememberResponse: { success: boolean; response: string; memory?: any } | null = null;

  if (isRememberCommand) {
    rememberResponse = await memoryService.processRememberCommand(message);
  }

  // Save user message
  if (persist) {
    const userMessage = new Message({
      role: 'user',
      content: message,
      meta: { timestamp: currentTime }
    });
    await userMessage.save();
  }

  // Process sleep data if detected
  let sleepSession: SleepSession | null = null;
  let sleepLogged = false;
  
  if (persist && sleepService.isSleepMessage(message)) {
    try {
      const sleepResult = await sleepService.logSleep(message, currentTime);
      sleepSession = sleepResult.session;
      sleepLogged = true;
    } catch (error) {
      console.error('Error processing sleep data:', error);
    }
  }

  // Process workout data if detected
  let workout: Workout | null = null;
  
  if (persist && WorkoutParser.isWorkoutMessage(message)) {
    const workoutData = WorkoutParser.parseWorkout(message);
    if (workoutData) {
      workout = await WorkoutParser.saveWorkout(workoutData);
    }
  }

  // Get conversation context
  const user = persist ? await User.findById('local') : null;
  const context = persist
    ? await memoryService.getConversationContext()
    : { shortTerm: [], recentWorkouts: [], memories: [] };
  
  const relevantMemories = await memoryService.getLongTermMemories(message, 3, 0.6);

  // Get streak data
  let streakData = null;
  if (persist) {
    const streak = await Streak.findById('local');
    if (streak) {
      streakData = {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastWorkoutDate: streak.lastWorkoutDate,
        missedWorkouts: streak.missedWorkouts,
        flexibleMode: streak.flexibleMode,
        workoutSchedule: streak.workoutSchedule
      };
    }
  }

  // Get sleep readiness
  let sleepReadiness = null;
  if (persist) {
    try {
      sleepReadiness = await sleepService.calculateHealthReadiness();
    } catch (error) {
      console.error('Error getting sleep readiness:', error);
    }
  }

  // Build context for AI
  const geminiContext: GeminiContext = {
    user,
    recentWorkouts: context.recentWorkouts,
    memories: relevantMemories,
    lastMessages: context.shortTerm,
    workoutJustLogged: workout,
    sleepJustLogged: sleepSession,
    sleepReadiness,
    streakData,
    currentDateTime: currentTime
  };

  // Generate AI response
  let reply: string;
  let actions: any[];

  if (rememberResponse && rememberResponse.success) {
    reply = rememberResponse.response;
    actions = [
      {
        action: 'memory_add',
        type: rememberResponse.memory.type,
        content: rememberResponse.memory.content
      }
    ];
  } else if (rememberResponse && !rememberResponse.success) {
    reply = rememberResponse.response;
    actions = [];
  } else {
    const response = await geminiService.generateResponse(message, geminiContext);
    reply = response.reply;
    actions = response.actions || [];
  }

  // Process AI actions
  if (actions && actions.length > 0) {
    await memoryService.processActions(actions);
  }

  // Check and update streak
  let streakUpdate: StreakUpdate | null = null;
  let streakStatus = null;

  if (persist) {
    streakStatus = await checkStreakStatus();
  }

  // Detect workout completion
  const messageLower = message.toLowerCase();
  const workoutKeywords = ['workout', 'exercise', 'training', 'session', 'gym'];
  const completionKeywords = ['done', 'completed', 'finished', 'complete'];

  const hasWorkoutKeyword = workoutKeywords.some(keyword => messageLower.includes(keyword));
  const hasCompletionKeyword = completionKeywords.some(keyword =>
    messageLower.includes(keyword)
  );

  const explicitCompletion =
    messageLower.includes('workout is done') ||
    messageLower.includes('workout done') ||
    messageLower.includes('finished workout') ||
    messageLower.includes('workout complete') ||
    messageLower.includes('exercise done') ||
    messageLower.includes('training done');

  const implicitCompletion = hasWorkoutKeyword && hasCompletionKeyword;
  const isWorkoutComplete = explicitCompletion || implicitCompletion;

  if (isWorkoutComplete && persist) {
    streakUpdate = await incrementStreak();
  }

  // Save assistant message
  if (persist) {
    const assistantMessage = new Message({
      role: 'assistant',
      content: reply,
      meta: {
        actions,
        workoutLogged: !!workout,
        sleepLogged,
        streakIncremented: !!streakUpdate,
        timestamp: currentTime
      }
    });
    await assistantMessage.save();
  }

  // Build workout summary if workout was logged
  const workoutSummary: WorkoutSummary | null = workout
    ? {
        id: workout._id.toString(),
        name: workout.name,
        exercises: workout.exercises.length,
        duration: workout.duration,
        type: workout.type
      }
    : null;

  // Build sleep summary if sleep was logged
  const sleepSummary: SleepSummary | null = sleepSession
    ? {
        id: sleepSession._id.toString(),
        quality: sleepSession.sleepQuality,
        duration: sleepSession.totalSleepTime,
        summary: sleepService.generateSessionSummary
          ? await sleepService.generateSessionSummary(sleepSession)
          : undefined
      }
    : null;

  // Return successful response
  const responseData: ConverseResponse = {
    reply,
    actions,
    workoutLogged: !!workout,
    sleepLogged,
    streakUpdate,
    streakStatus,
    workout: workoutSummary,
    sleepSession: sleepSummary,
    sleepReadiness,
    currentDateTime: currentTime
  };

  return successResponse(responseData);
});

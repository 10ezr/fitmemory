import { NextResponse } from "next/server";
import connectDatabase from "@/lib/database";
import { 
  registerActivity, 
  registerWorkout, 
  registerRecoveryDay, 
  registerRestDay,
  ACTIVITY_TYPES,
  getStreakStatus 
} from "@/services/streakService";

/**
 * Register any type of activity to maintain streak
 * POST /api/register-activity
 * Body: { type: 'workout' | 'recovery' | 'rest', data?: any }
 */
export async function POST(request) {
  try {
    await connectDatabase();
    
    const body = await request.json();
    const { type, data = {} } = body;
    
    if (!type || !Object.values(ACTIVITY_TYPES).includes(type)) {
      return NextResponse.json(
        { 
          ok: false, 
          error: `Invalid activity type. Must be one of: ${Object.values(ACTIVITY_TYPES).join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    let result;
    
    switch (type) {
      case ACTIVITY_TYPES.WORKOUT:
        result = await registerWorkout(data);
        break;
      case ACTIVITY_TYPES.RECOVERY:
        result = await registerRecoveryDay(data.notes || '');
        break;
      case ACTIVITY_TYPES.REST:
        result = await registerRestDay(data.notes || '');
        break;
      default:
        result = await registerActivity(type, data);
    }
    
    // Get updated streak status
    const streakStatus = await getStreakStatus();
    
    return NextResponse.json({
      ok: true,
      activityRegistered: true,
      activityType: type,
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      streakStatus: {
        needsActivity: streakStatus.needsActivity,
        nextResetAt: streakStatus.nextResetAt,
        warningAt: streakStatus.warningAt,
        todayActivity: streakStatus.todayActivity
      }
    });
    
  } catch (error) {
    console.error('register-activity POST error:', error);
    return NextResponse.json(
      { ok: false, error: error.message }, 
      { status: 500 }
    );
  }
}

/**
 * Get available activity types
 * GET /api/register-activity
 */
export async function GET() {
  try {
    await connectDatabase();
    
    const streakStatus = await getStreakStatus();
    
    return NextResponse.json({
      availableActivityTypes: Object.values(ACTIVITY_TYPES),
      activityTypes: {
        [ACTIVITY_TYPES.WORKOUT]: {
          label: 'Workout',
          description: 'Complete a workout session',
          icon: '💪'
        },
        [ACTIVITY_TYPES.RECOVERY]: {
          label: 'Recovery Day',
          description: 'Active recovery, stretching, or light activity',
          icon: '🧘'
        },
        [ACTIVITY_TYPES.REST]: {
          label: 'Rest Day',
          description: 'Planned rest day for muscle recovery',
          icon: '😴'
        }
      },
      streakStatus
    });
    
  } catch (error) {
    console.error('register-activity GET error:', error);
    return NextResponse.json(
      { 
        availableActivityTypes: Object.values(ACTIVITY_TYPES),
        activityTypes: {},
        streakStatus: null
      },
      { status: 500 }
    );
  }
}
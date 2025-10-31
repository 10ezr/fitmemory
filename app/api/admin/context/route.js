import { NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import { User, Streak } from '@/models';
import MemoryService from '@/services/memoryService';

function getLocalDateTimePayload() {
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const display = now.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return { iso: now.toISOString(), timezone: tz, display, epochMs: now.getTime() };
}

export async function GET() {
  await connectDatabase();
  const ms = new MemoryService();

  const [context, memoriesRaw, streak] = await Promise.all([
    ms.getConversationContext(),
    ms.getAllMemories?.() || ms.getLongTermMemories('', 50, 0),
    Streak.findById('local'),
  ]);

  const memories = (memoriesRaw || []).map(m => ({
    _id: m._id?.toString?.() || m.id,
    type: m.type,
    content: m.content,
  }));

  return NextResponse.json({
    currentDateTime: getLocalDateTimePayload(),
    lastMessages: context.shortTerm || [],
    recentWorkouts: context.recentWorkouts || [],
    memories,
    streakData: streak ? {
      currentStreak: streak.currentStreak || 0,
      longestStreak: streak.longestStreak || 0,
      lastWorkoutDate: streak.lastWorkoutDate ? new Date(streak.lastWorkoutDate).toISOString() : '',
      missedWorkouts: streak.missedWorkouts || 0,
    } : null,
  });
}

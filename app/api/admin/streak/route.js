import { NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import { Streak } from '@/models';

export async function PUT(request) {
  await connectDatabase();
  const body = await request.json();
  let streak = await Streak.findById('local');
  if (!streak) {
    streak = new Streak({ _id: 'local' });
  }
  if (typeof body.currentStreak === 'number') streak.currentStreak = body.currentStreak;
  if (typeof body.longestStreak === 'number') streak.longestStreak = body.longestStreak;
  if (typeof body.missedWorkouts === 'number') streak.missedWorkouts = body.missedWorkouts;
  if (typeof body.lastWorkoutDate === 'string' && body.lastWorkoutDate) {
    const d = new Date(body.lastWorkoutDate);
    if (!isNaN(d.getTime())) streak.lastWorkoutDate = d;
  }
  await streak.save();
  return NextResponse.json({ ok: true });
}

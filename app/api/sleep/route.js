import { NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import sleepService from '@/services/sleepService';

export async function POST(request) {
  try {
    await connectDatabase();
    const body = await request.json();
    
    const { message, date } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'Sleep description is required' }, { status: 400 });
    }
    
    const result = await sleepService.logSleep(message, date ? new Date(date) : new Date());
    
    return NextResponse.json({
      success: true,
      session: result.session,
      summary: result.summary,
      insights: result.insights
    });
  } catch (error) {
    console.error('Sleep logging error:', error);
    return NextResponse.json(
      { error: 'Failed to log sleep data' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDatabase();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days')) || 7;
    
    const [recentSleep, stats, readiness] = await Promise.all([
      sleepService.getRecentSleep(days),
      sleepService.getSleepStats(days),
      sleepService.calculateHealthReadiness()
    ]);
    
    return NextResponse.json({
      recentSleep,
      stats,
      readiness
    });
  } catch (error) {
    console.error('Sleep data retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve sleep data' },
      { status: 500 }
    );
  }
}
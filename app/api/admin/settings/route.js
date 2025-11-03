import { NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import { AppConfig } from '@/models/index.js';

export async function GET() {
  try {
    await connectDatabase();
    
    const config = await AppConfig.findById('singleton') || new AppConfig();
    
    return NextResponse.json({
      notifications: config.notifications ?? true,
      sleepReminders: config.sleepReminders ?? true,
      reminderTime: config.reminderTime || '22:00',
      workoutNotifications: config.workoutNotifications ?? true,
      streakWarnings: config.streakWarnings ?? true,
      targetSleepHours: config.targetSleepHours || 8,
      sleepQualityGoal: config.sleepQualityGoal || 7,
      flexibleMode: config.flexibleMode ?? true,
      weekendFlexibility: config.weekendFlexibility ?? true,
      dataRetention: config.dataRetention || 365,
      autoBackup: config.autoBackup ?? false,
      memoryThreshold: config.memoryThreshold || 0.7
    });
  } catch (error) {
    console.error('Error getting admin settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDatabase();
    
    const settings = await request.json();
    
    const config = await AppConfig.findByIdAndUpdate(
      'singleton',
      { 
        $set: {
          ...settings,
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error saving admin settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
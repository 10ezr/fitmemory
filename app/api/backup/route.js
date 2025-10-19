import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { join } from 'path'
import connectDatabase from '../../../lib/database'
import { User, Workout, Message, Memory, GeminiResponse, AppConfig } from '../../../models'

export async function POST(request) {
  try {
    await connectDatabase()
    
    // Get all data (reuse export logic)
    const [users, workouts, messages, memories, geminiResponses, appConfig] = await Promise.all([
      User.find({}).lean(),
      Workout.find({}).lean(),
      Message.find({}).lean(),
      Memory.find({}).lean(),
      GeminiResponse.find({}).lean(),
      AppConfig.find({}).lean()
    ])

    const backupData = {
      meta: {
        backedUpAt: new Date().toISOString(),
        version: '1.0.0',
        totalRecords: users.length + workouts.length + messages.length + memories.length + geminiResponses.length + appConfig.length
      },
      users,
      workouts,
      messages,
      memories,
      geminiResponses,
      appConfig
    }

    // Create backups directory if it doesn't exist
    const backupDir = join(process.cwd(), 'backups')
    try {
      await fs.access(backupDir)
    } catch {
      await fs.mkdir(backupDir, { recursive: true })
    }

    // Write backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = join(backupDir, `fitmemory-backup-${timestamp}.json`)
    
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2))

    // Update last backup time
    await AppConfig.findByIdAndUpdate(
      'singleton',
      { $set: { lastBackup: new Date() } },
      { upsert: true }
    )

    return NextResponse.json({
      message: 'Backup created successfully',
      backupPath,
      timestamp,
      totalRecords: backupData.meta.totalRecords
    })
    
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { error: 'Failed to create backup' }, 
      { status: 500 }
    )
  }
}

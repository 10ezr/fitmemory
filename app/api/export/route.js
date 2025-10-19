import { NextResponse } from 'next/server'
import connectDatabase from '../../../lib/database'
import { User, Workout, Message, Memory, GeminiResponse, AppConfig } from '../../../models'

export async function GET(request) {
  try {
    await connectDatabase()
    
    const [users, workouts, messages, memories, geminiResponses, appConfig] = await Promise.all([
      User.find({}).lean(),
      Workout.find({}).lean(),
      Message.find({}).lean(),
      Memory.find({}).lean(),
      GeminiResponse.find({}).lean(),
      AppConfig.find({}).lean()
    ])

    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
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

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="fitmemory-export-${Date.now()}.json"`,
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' }, 
      { status: 500 }
    )
  }
}

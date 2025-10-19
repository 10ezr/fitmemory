import { NextResponse } from 'next/server'
import connectDatabase from '../../../lib/database'
import { User, Workout, Message, Memory, GeminiResponse, AppConfig } from '../../../models'

export async function POST(request) {
  try {
    await connectDatabase()
    
    const importData = await request.json()
    
    // Validate import data structure
    if (!importData.meta || !importData.users) {
      return NextResponse.json(
        { error: 'Invalid import data format' }, 
        { status: 400 }
      )
    }

    let imported = 0
    let skipped = 0

    // Import each collection with simple collision policy
    const collections = [
      { name: 'users', model: User, data: importData.users },
      { name: 'workouts', model: Workout, data: importData.workouts },
      { name: 'messages', model: Message, data: importData.messages },
      { name: 'memories', model: Memory, data: importData.memories },
      { name: 'geminiResponses', model: GeminiResponse, data: importData.geminiResponses },
      { name: 'appConfig', model: AppConfig, data: importData.appConfig }
    ]

    for (const collection of collections) {
      if (collection.data && Array.isArray(collection.data)) {
        for (const item of collection.data) {
          try {
            await collection.model.findByIdAndUpdate(
              item._id,
              item,
              { upsert: true, new: true }
            )
            imported++
          } catch (itemError) {
            console.warn(`Skipped ${collection.name} item:`, itemError.message)
            skipped++
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      imported,
      skipped,
      total: imported + skipped
    })
    
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json(
      { error: 'Failed to import data' }, 
      { status: 500 }
    )
  }
}

const express = require('express');
const { User, Workout, Exercise, Message, Memory, GeminiResponse, AppConfig } = require('../models');
const WorkoutParser = require('../services/workoutParser');
const GeminiService = require('../services/geminiService');
const MemoryService = require('../services/memoryService');
const AnalyticsService = require('../services/analyticsService');

const router = express.Router();
const geminiService = new GeminiService();
const memoryService = new MemoryService();
const analyticsService = new AnalyticsService();

// POST /api/converse - Main conversation endpoint
router.post('/converse', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Persist incoming user message
    const userMessage = new Message({
      role: 'user',
      content: message
    });
    await userMessage.save();

    // 2. Auto-parse and persist workout if detected
    let workout = null;
    if (WorkoutParser.isWorkoutMessage(message)) {
      const workoutData = WorkoutParser.parseWorkout(message);
      if (workoutData) {
        workout = await WorkoutParser.saveWorkout(workoutData);
      }
    }

    // 3. Gather context for Gemini
    const user = await User.findById('local');
    const context = await memoryService.getConversationContext();
    const relevantMemories = await memoryService.getLongTermMemories(message, 3, 0.6);

    // 4. Generate Gemini response
    const geminiContext = {
      user,
      recentWorkouts: context.recentWorkouts,
      memories: relevantMemories,
      lastMessages: context.shortTerm,
      workoutJustLogged: workout
    };

    const { reply, actions } = await geminiService.generateResponse(message, geminiContext);

    // 5. Process any actions returned by Gemini
    if (actions && actions.length > 0) {
      await memoryService.processActions(actions);
    }

    // 6. Persist assistant message
    const assistantMessage = new Message({
      role: 'assistant',
      content: reply,
      meta: { actions, workoutLogged: !!workout }
    });
    await assistantMessage.save();

    // 7. Return response
    res.json({
      reply,
      actions: actions || [],
      workoutLogged: !!workout,
      workout: workout ? {
        id: workout._id,
        name: workout.name,
        exercises: workout.exercises.length
      } : null
    });

  } catch (error) {
    console.error('Conversation error:', error);
    res.status(500).json({ error: 'Failed to process conversation' });
  }
});

// GET /api/workouts - Get all workouts
router.get('/workouts', async (req, res) => {
  try {
    const { limit = 20, skip = 0, sort = '-date' } = req.query;
    
    const workouts = await Workout.find({})
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    res.json({
      workouts,
      total: await Workout.countDocuments()
    });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// POST /api/workouts - Create new workout
router.post('/workouts', async (req, res) => {
  try {
    const workoutData = req.body;
    
    // Validate required fields
    if (!workoutData.date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const workout = await WorkoutParser.saveWorkout(workoutData);
    res.status(201).json(workout);
    
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// GET /api/workouts/:id - Get specific workout
router.get('/workouts/:id', async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json(workout);
  } catch (error) {
    console.error('Error fetching workout:', error);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

// PUT /api/workouts/:id - Update workout
router.put('/workouts/:id', async (req, res) => {
  try {
    const workout = await Workout.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    res.json(workout);
  } catch (error) {
    console.error('Error updating workout:', error);
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// DELETE /api/workouts/:id - Delete workout
router.delete('/workouts/:id', async (req, res) => {
  try {
    const workout = await Workout.findByIdAndDelete(req.params.id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// GET /api/stats - Get consistency statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await analyticsService.calculateConsistencyMetrics();
    res.json(stats);
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

// GET /api/patternSummary - Get human-readable pattern summary
router.get('/patternSummary', async (req, res) => {
  try {
    const summary = await analyticsService.generatePatternSummary();
    const patterns = await analyticsService.detectWorkoutPatterns();
    
    res.json({
      summary,
      patterns
    });
  } catch (error) {
    console.error('Error generating pattern summary:', error);
    res.status(500).json({ error: 'Failed to generate pattern summary' });
  }
});

// GET /api/messages - Get conversation history
router.get('/messages', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    const messages = await Message.find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    res.json({
      messages: messages.reverse(), // Return in chronological order
      total: await Message.countDocuments()
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET/POST /api/memory - Memory management endpoints
router.get('/memory', async (req, res) => {
  try {
    const { type, limit = 20 } = req.query;
    
    let memories;
    if (type) {
      memories = await memoryService.getMemoriesByType(type, parseInt(limit));
    } else {
      memories = await Memory.find({})
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
    }
    
    const stats = await memoryService.getMemoryStats();
    
    res.json({
      memories,
      stats,
      total: await Memory.countDocuments()
    });
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

router.post('/memory', async (req, res) => {
  try {
    const { type, content, meta = {} } = req.body;
    
    if (!type || !content) {
      return res.status(400).json({ error: 'Type and content are required' });
    }
    
    const memory = await memoryService.addMemory(type, content, meta);
    res.status(201).json(memory);
    
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

// POST /api/memory/confirm - Confirm auto-generated memory
router.post('/memory/confirm', async (req, res) => {
  try {
    const { content, confidence = 0.8 } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    await memoryService.confirmMemory(content, confidence);
    res.json({ message: 'Memory confirmed successfully' });
    
  } catch (error) {
    console.error('Error confirming memory:', error);
    res.status(500).json({ error: 'Failed to confirm memory' });
  }
});

// DELETE /api/memory/:id - Delete specific memory
router.delete('/memory/:id', async (req, res) => {
  try {
    await memoryService.removeMemory(req.params.id);
    res.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// GET /api/user - Get user profile
router.get('/user', async (req, res) => {
  try {
    const user = await User.findById('local');
    res.json(user || { _id: 'local' });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/user - Update user profile
router.put('/user', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      'local',
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// GET /api/export - Export all data
router.get('/export', async (req, res) => {
  try {
    const [users, workouts, messages, memories, geminiResponses, appConfig] = await Promise.all([
      User.find({}),
      Workout.find({}),
      Message.find({}),
      Memory.find({}),
      GeminiResponse.find({}),
      AppConfig.find({})
    ]);

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
    };

    res.setHeader('Content-Disposition', `attachment; filename="fitmemory-export-${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
    
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST /api/import - Import data
router.post('/import', async (req, res) => {
  try {
    const importData = req.body;
    
    // Validate import data structure
    if (!importData.meta || !importData.users) {
      return res.status(400).json({ error: 'Invalid import data format' });
    }

    let imported = 0;
    let skipped = 0;

    // Import each collection with simple collision policy
    const collections = [
      { name: 'users', model: User, data: importData.users },
      { name: 'workouts', model: Workout, data: importData.workouts },
      { name: 'messages', model: Message, data: importData.messages },
      { name: 'memories', model: Memory, data: importData.memories },
      { name: 'geminiResponses', model: GeminiResponse, data: importData.geminiResponses },
      { name: 'appConfig', model: AppConfig, data: importData.appConfig }
    ];

    for (const collection of collections) {
      if (collection.data && Array.isArray(collection.data)) {
        for (const item of collection.data) {
          try {
            await collection.model.findByIdAndUpdate(
              item._id,
              item,
              { upsert: true, new: true }
            );
            imported++;
          } catch (itemError) {
            console.warn(`Skipped ${collection.name} item:`, itemError.message);
            skipped++;
          }
        }
      }
    }

    res.json({
      message: 'Import completed',
      imported,
      skipped,
      total: imported + skipped
    });
    
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// POST /api/clear-memory - Clear long-term memories (admin)
router.post('/clear-memory', async (req, res) => {
  try {
    const deletedCount = await memoryService.clearLongTermMemory();
    res.json({
      message: 'Long-term memory cleared',
      deletedCount
    });
  } catch (error) {
    console.error('Error clearing memory:', error);
    res.status(500).json({ error: 'Failed to clear memory' });
  }
});

// POST /api/backup - Create backup (could be moved to a script)
router.post('/backup', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Get all data (reuse export logic)
    const [users, workouts, messages, memories, geminiResponses, appConfig] = await Promise.all([
      User.find({}),
      Workout.find({}),
      Message.find({}),
      Memory.find({}),
      GeminiResponse.find({}),
      AppConfig.find({})
    ]);

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
    };

    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, '../backups');
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    // Write backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `fitmemory-backup-${timestamp}.json`);
    
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    // Update last backup time
    await AppConfig.findByIdAndUpdate(
      'singleton',
      { $set: { lastBackup: new Date() } },
      { upsert: true }
    );

    res.json({
      message: 'Backup created successfully',
      backupPath,
      timestamp,
      totalRecords: backupData.meta.totalRecords
    });
    
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

module.exports = router;

import { Message, Memory, Workout } from '../models/index.js';
import GeminiService from './geminiService.js';

class MemoryService {
  constructor() {
    this.geminiService = new GeminiService();
  }

  // Three-layer memory system
  async getConversationContext() {
    const [shortTerm, recentWorkouts, longTermMemories] = await Promise.all([
      this.getShortTermBuffer(),
      this.getRecentWorkouts(),
      this.getLongTermMemories()
    ]);

    return {
      shortTerm,
      recentWorkouts,
      longTermMemories
    };
  }

  // Layer 1: Short-term buffer (last 10 messages)
  async getShortTermBuffer() {
    try {
      const messages = await Message.find({})
        .sort({ createdAt: -1 })
        .limit(10);
      
      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error fetching short-term buffer:', error);
      return [];
    }
  }

  // Layer 2: Recent workouts (last 5 workouts)
  async getRecentWorkouts() {
    try {
      const workouts = await Workout.find({})
        .sort({ date: -1 })
        .limit(5);
      
      return workouts;
    } catch (error) {
      console.error('Error fetching recent workouts:', error);
      return [];
    }
  }

  // Layer 3: Long-term semantic memories with similarity search
  async getLongTermMemories(query = null, limit = 5, threshold = 0.6) {
    try {
      if (!query) {
        // Return most recent memories if no query
        return await Memory.find({})
          .sort({ createdAt: -1 })
          .limit(limit);
      }

      // Generate embedding for query
      const queryEmbedding = await this.geminiService.generateEmbedding(query);
      
      if (!queryEmbedding) {
        // Fallback to keyword-based search
        return await this.keywordSearchMemories(query, limit);
      }

      // Get all memories with embeddings
      const memories = await Memory.find({ embedding: { $exists: true, $ne: null } });
      
      // Calculate similarities and filter
      const similarMemories = memories
        .map(memory => ({
          ...memory.toObject(),
          similarity: GeminiService.cosineSimilarity(queryEmbedding, memory.embedding)
        }))
        .filter(memory => memory.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return similarMemories;
    } catch (error) {
      console.error('Error fetching long-term memories:', error);
      return [];
    }
  }

  async keywordSearchMemories(query, limit = 5) {
    const keywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    if (keywords.length === 0) {
      return await Memory.find({}).sort({ createdAt: -1 }).limit(limit);
    }

    const regexPattern = keywords.map(keyword => `(?=.*${keyword})`).join('');
    
    return await Memory.find({
      content: { $regex: regexPattern, $options: 'i' }
    })
    .sort({ createdAt: -1 })
    .limit(limit);
  }

  // Add new memory with embedding
  async addMemory(type, content, meta = {}) {
    try {
      // Generate embedding for the memory content
      const embedding = await this.geminiService.generateEmbedding(content);
      
      const memory = new Memory({
        type,
        content,
        meta,
        embedding
      });
      
      await memory.save();
      
      // Clean up old memories if we have too many
      await this.cleanupOldMemories();
      
      return memory;
    } catch (error) {
      console.error('Error adding memory:', error);
      throw error;
    }
  }

  // Update existing memory
  async updateMemory(memoryId, updates) {
    try {
      // If content is being updated, regenerate embedding
      if (updates.content) {
        updates.embedding = await this.geminiService.generateEmbedding(updates.content);
      }
      
      const memory = await Memory.findByIdAndUpdate(
        memoryId, 
        updates, 
        { new: true }
      );
      
      return memory;
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  }

  // Remove memory
  async removeMemory(memoryId) {
    try {
      await Memory.findByIdAndDelete(memoryId);
    } catch (error) {
      console.error('Error removing memory:', error);
      throw error;
    }
  }

  // Process 'remember this' commands directly from user input
  async processRememberCommand(userMessage, context = {}) {
    try {
      // Extract what the user wants to remember
      const rememberPatterns = [
        /remember this:?\s*(.+)/i,
        /please remember:?\s*(.+)/i,
        /don't forget:?\s*(.+)/i,
        /keep in mind:?\s*(.+)/i,
        /note that:?\s*(.+)/i
      ];
      
      let contentToRemember = null;
      for (const pattern of rememberPatterns) {
        const match = userMessage.match(pattern);
        if (match) {
          contentToRemember = match[1].trim();
          break;
        }
      }
      
      if (!contentToRemember) {
        // Try to extract the main content as something to remember
        contentToRemember = userMessage.replace(/remember this:?/i, '').trim();
      }
      
      if (contentToRemember && contentToRemember.length > 5) {
        // Determine memory type based on content
        const memoryType = this.determineMemoryType(contentToRemember);
        
        // Store the memory
        const memory = await this.addMemory(
          memoryType,
          contentToRemember,
          { 
            confidence: 0.9,
            userRequested: true,
            timestamp: new Date(),
            context: context.lastWorkout || null
          }
        );
        
        return {
          success: true,
          memory,
          response: `Got it! I've stored that as a ${memoryType}. I'll remember: "${contentToRemember}"`
        };
      }
      
      return {
        success: false,
        response: "I didn't catch what you wanted me to remember. Could you be more specific?"
      };
      
    } catch (error) {
      console.error('Error processing remember command:', error);
      return {
        success: false,
        response: "I had trouble storing that memory. Please try again."
      };
    }
  }
  
  // Determine memory type based on content
  determineMemoryType(content) {
    const lowerContent = content.toLowerCase();
    
    // Check for specific patterns
    if (lowerContent.includes('goal') || lowerContent.includes('want to') || lowerContent.includes('target')) {
      return 'goal';
    }
    if (lowerContent.includes('prefer') || lowerContent.includes('like') || lowerContent.includes('enjoy') || lowerContent.includes('hate')) {
      return 'preference';
    }
    if (lowerContent.includes('injury') || lowerContent.includes('hurt') || lowerContent.includes('pain') || lowerContent.includes('avoid')) {
      return 'injury';
    }
    if (lowerContent.includes('can\'t') || lowerContent.includes('cannot') || lowerContent.includes('unable') || lowerContent.includes('limited')) {
      return 'constraint';
    }
    if (lowerContent.includes('pattern') || lowerContent.includes('usually') || lowerContent.includes('always') || lowerContent.includes('tends to')) {
      return 'pattern';
    }
    if (lowerContent.includes('learned') || lowerContent.includes('noticed') || lowerContent.includes('realized') || lowerContent.includes('discovery')) {
      return 'insight';
    }
    if (lowerContent.includes('achieved') || lowerContent.includes('accomplished') || lowerContent.includes('pr') || lowerContent.includes('record')) {
      return 'achievement';
    }
    
    // Default to insight for general information
    return 'insight';
  }
  
  // Enhanced search for user memories
  async searchUserMemories(query, options = {}) {
    const {
      types = null,
      limit = 10,
      threshold = 0.5,
      includeContext = true
    } = options;
    
    try {
      let searchFilter = {};
      
      if (types && Array.isArray(types)) {
        searchFilter.type = { $in: types };
      }
      
      // If we have a query, use semantic search
      if (query && query.trim()) {
        const memories = await this.getLongTermMemories(query, limit * 2, threshold);
        return memories.filter(memory => 
          !types || types.includes(memory.type)
        ).slice(0, limit);
      }
      
      // Otherwise return recent memories of specified types
      return await Memory.find(searchFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate(includeContext ? 'context' : null);
        
    } catch (error) {
      console.error('Error searching user memories:', error);
      return [];
    }
  }

  // Process actions from Gemini responses
  async processActions(actions) {
    for (const action of actions) {
      try {
        switch (action.action) {
          case 'memory_add':
            await this.addMemory(
              action.type || 'insight',
              action.content,
              { confidence: action.confidence || 0.8 }
            );
            break;

          case 'memory_confirm':
            await this.confirmMemory(action.content, action.confidence || 0.8);
            break;

          case 'memory_update':
            if (action.id) {
              await this.updateMemory(action.id, { content: action.content });
            }
            break;

          case 'memory_remove':
            if (action.id) {
              await this.removeMemory(action.id);
            }
            break;
            
          case 'workout_plan':
            // Handle workout plan creation
            await this.storeWorkoutPlan(action);
            break;
            
          case 'progress_update':
            // Handle progress tracking
            await this.trackProgress(action);
            break;
            
          case 'streak_celebrate':
            // Handle streak celebrations
            await this.celebrateStreak(action);
            break;
        }
      } catch (error) {
        console.error(`Error processing action ${action.action}:`, error);
      }
    }
  }
  
  // Store workout plan in memory
  async storeWorkoutPlan(action) {
    try {
      const planContent = `Workout Plan: ${action.exercises.map(e => 
        `${e.name} ${e.sets}x${e.reps}${e.notes ? ` (${e.notes})` : ''}`
      ).join(', ')} - Duration: ${action.duration || 'Not specified'}min`;
      
      await this.addMemory(
        'pattern',
        planContent,
        { 
          confidence: 0.8,
          type: 'workout_plan',
          exercises: action.exercises,
          duration: action.duration
        }
      );
    } catch (error) {
      console.error('Error storing workout plan:', error);
    }
  }
  
  // Track progress updates
  async trackProgress(action) {
    try {
      const progressContent = `Progress Update - ${action.metric}: ${action.value}`;
      
      await this.addMemory(
        'insight',
        progressContent,
        {
          confidence: 0.9,
          metric: action.metric,
          value: action.value,
          timestamp: new Date()
        }
      );
    } catch (error) {
      console.error('Error tracking progress:', error);
    }
  }
  
  // Celebrate streak milestones
  async celebrateStreak(action) {
    try {
      const celebrationContent = `Achievement: ${action.milestone}`;
      
      await this.addMemory(
        'achievement',
        celebrationContent,
        {
          confidence: 1.0,
          milestone: action.milestone,
          celebratedAt: new Date()
        }
      );
    } catch (error) {
      console.error('Error celebrating streak:', error);
    }
  }

  // Confirm or create memory based on detected patterns
  async confirmMemory(content, confidence = 0.8) {
    try {
      // Check if similar memory already exists
      const existingMemories = await this.getLongTermMemories(content, 3, 0.8);
      
      if (existingMemories.length > 0) {
        // Update existing memory with higher confidence
        const existing = existingMemories[0];
        await this.updateMemory(existing._id, {
          meta: { ...existing.meta, confidence: Math.max(existing.meta?.confidence || 0, confidence) }
        });
      } else {
        // Create new memory
        await this.addMemory('pattern', content, { confidence, confirmed: true });
      }
    } catch (error) {
      console.error('Error confirming memory:', error);
      throw error;
    }
  }

  // Clean up old memories to prevent unlimited growth
  async cleanupOldMemories(maxMemories = 100) {
    try {
      const memoryCount = await Memory.countDocuments();
      
      if (memoryCount > maxMemories) {
        // Keep most recent memories and those with high confidence
        const oldMemories = await Memory.find({
          $and: [
            { 'meta.confidence': { $lt: 0.7 } },
            { createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 days old
          ]
        })
        .sort({ createdAt: 1 })
        .limit(memoryCount - maxMemories);
        
        for (const memory of oldMemories) {
          await Memory.findByIdAndDelete(memory._id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up memories:', error);
    }
  }

  // Get memories by type
  async getMemoriesByType(type, limit = 10) {
    try {
      return await Memory.find({ type })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching memories by type:', error);
      return [];
    }
  }

  // Get all memory types and counts
  async getMemoryStats() {
    try {
      const stats = await Memory.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            latestCreated: { $max: '$createdAt' }
          }
        }
      ]);
      
      return stats;
    } catch (error) {
      console.error('Error fetching memory stats:', error);
      return [];
    }
  }

  // Clear all long-term memories (admin function)
  async clearLongTermMemory() {
    try {
      const result = await Memory.deleteMany({});
      return result.deletedCount;
    } catch (error) {
      console.error('Error clearing long-term memory:', error);
      throw error;
    }
  }

  // Rebuild embeddings for existing memories
  async rebuildEmbeddings() {
    try {
      const memories = await Memory.find({ embedding: { $exists: false } });
      
      for (const memory of memories) {
        const embedding = await this.geminiService.generateEmbedding(memory.content);
        if (embedding) {
          memory.embedding = embedding;
          await memory.save();
        }
      }
      
      return memories.length;
    } catch (error) {
      console.error('Error rebuilding embeddings:', error);
      throw error;
    }
  }
}

export default MemoryService;

import { Memory, Message, Workout } from '@/models';
import { Memory as MemoryType, AiAction, ConversationContext, MemoryType as MemoryEnum } from '@/types';
import GeminiService from './geminiService';

/**
 * MemoryService - Manages long-term and short-term memory
 * Handles semantic search, memory CRUD, and context building
 */
export default class MemoryService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * Get conversation context (short-term + recent workouts + memories)
   */
  async getConversationContext(): Promise<ConversationContext> {
    const shortTerm = await Message.find({ userId: 'local' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentWorkouts = await Workout.find({ userId: 'local' })
      .sort({ date: -1 })
      .limit(5)
      .lean();

    const memories = await Memory.find({ userId: 'local' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      shortTerm: shortTerm.reverse() as any[],
      recentWorkouts: recentWorkouts as any[],
      memories: memories as any[]
    };
  }

  /**
   * Get relevant long-term memories using semantic search
   */
  async getLongTermMemories(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<MemoryType[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.geminiService.generateEmbedding(query);

      // Get all memories with embeddings
      const memories = await Memory.find({ 
        userId: 'local',
        embedding: { $exists: true, $ne: null }
      }).lean();

      // Calculate cosine similarity and filter by threshold
      const scoredMemories = memories
        .map(memory => ({
          memory,
          score: this.cosineSimilarity(queryEmbedding, memory.embedding as number[])
        }))
        .filter(item => item.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.memory as MemoryType);

      return scoredMemories;
    } catch (error) {
      console.error('Error getting long-term memories:', error);
      return [];
    }
  }

  /**
   * Process remember command from user
   */
  async processRememberCommand(message: string): Promise<{
    success: boolean;
    response: string;
    memory?: any;
  }> {
    try {
      // Extract content after "remember" keyword
      const content = message
        .replace(/remember this:?|please remember:?|don't forget:?|keep in mind:?|note that:?/i, '')
        .trim();

      if (!content) {
        return {
          success: false,
          response: "I didn't catch what you want me to remember. Could you try again?"
        };
      }

      // Determine memory type based on content
      const type = this.inferMemoryType(content);

      // Create memory
      const memory = await this.addMemory(type, content);

      return {
        success: true,
        response: `Got it! I'll remember: "${content}" 🧠`,
        memory
      };
    } catch (error) {
      console.error('Error processing remember command:', error);
      return {
        success: false,
        response: "Sorry, I had trouble saving that memory. Please try again."
      };
    }
  }

  /**
   * Add a new memory
   */
  async addMemory(
    type: string,
    content: string,
    meta?: Record<string, any>
  ): Promise<MemoryType> {
    // Generate embedding for semantic search
    const embedding = await this.geminiService.generateEmbedding(content);

    const memory = new Memory({
      userId: 'local',
      type,
      content,
      embedding,
      meta: {
        ...meta,
        confidence: meta?.confidence || 0.8
      }
    });

    await memory.save();
    return memory.toObject() as MemoryType;
  }

  /**
   * Update existing memory
   */
  async updateMemory(
    memoryId: string,
    updates: Partial<MemoryType>
  ): Promise<MemoryType | null> {
    const memory = await Memory.findByIdAndUpdate(
      memoryId,
      { $set: updates },
      { new: true }
    ).lean();

    return memory as MemoryType | null;
  }

  /**
   * Delete memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    const result = await Memory.findByIdAndDelete(memoryId);
    return !!result;
  }

  /**
   * Process AI actions
   */
  async processActions(actions: AiAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.action) {
          case 'memory_add':
            if (action.content) {
              await this.addMemory(
                action.type || 'context',
                action.content,
                action.metadata
              );
            }
            break;

          case 'memory_update':
            if (action.metadata?.memoryId) {
              await this.updateMemory(
                action.metadata.memoryId,
                { content: action.content }
              );
            }
            break;

          case 'memory_delete':
            if (action.metadata?.memoryId) {
              await this.deleteMemory(action.metadata.memoryId);
            }
            break;

          default:
            console.log(`Unknown action type: ${action.action}`);
        }
      } catch (error) {
        console.error(`Error processing action ${action.action}:`, error);
      }
    }
  }

  /**
   * Infer memory type from content
   */
  private inferMemoryType(content: string): string {
    const contentLower = content.toLowerCase();

    if (contentLower.includes('prefer') || contentLower.includes('like') || contentLower.includes('favorite')) {
      return MemoryEnum.PREFERENCE;
    }
    if (contentLower.includes('goal') || contentLower.includes('target') || contentLower.includes('aim')) {
      return MemoryEnum.GOAL;
    }
    if (contentLower.includes('always') || contentLower.includes('usually') || contentLower.includes('typically')) {
      return MemoryEnum.PATTERN;
    }
    if (contentLower.includes('achieved') || contentLower.includes('accomplished') || contentLower.includes('milestone')) {
      return MemoryEnum.ACHIEVEMENT;
    }
    if (contentLower.includes('i am') || contentLower.includes("i'm") || contentLower.includes('my')) {
      return MemoryEnum.PERSONAL;
    }

    return MemoryEnum.CONTEXT;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

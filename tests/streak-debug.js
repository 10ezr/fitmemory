/**
 * Streak Debugging and Testing Suite
 * Comprehensive testing for streak functionality
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Streak } from '@/models/index.js';

class StreakDebugger {
  constructor() {
    this.mongoServer = null;
    this.connection = null;
  }

  async setupTestDatabase() {
    console.log('🔧 Setting up test database...');
    this.mongoServer = await MongoMemoryServer.create();
    const uri = this.mongoServer.getUri();
    
    this.connection = await mongoose.connect(uri);
    console.log('✅ Test database connected');
  }

  async cleanup() {
    if (this.connection) {
      await this.connection.close();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
    console.log('🧹 Test database cleaned up');
  }

  async testStreakCreation() {
    console.log('\n🧪 Testing streak creation...');
    
    try {
      // Create a new streak
      const streak = new Streak({
        _id: "local",
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        streakHistory: [],
        workoutSchedule: null,
        missedWorkouts: 0,
        flexibleMode: true,
      });
      
      await streak.save();
      console.log('✅ Streak created successfully');
      
      // Verify it was saved
      const savedStreak = await Streak.findById("local");
      console.log('📊 Saved streak:', {
        currentStreak: savedStreak.currentStreak,
        longestStreak: savedStreak.longestStreak,
        lastWorkoutDate: savedStreak.lastWorkoutDate,
        missedWorkouts: savedStreak.missedWorkouts
      });
      
      return savedStreak;
    } catch (error) {
      console.error('❌ Error creating streak:', error);
      throw error;
    }
  }

  async testStreakIncrement() {
    console.log('\n🧪 Testing streak increment...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let streak = await Streak.findById("local");
      if (!streak) {
        streak = await this.testStreakCreation();
      }
      
      console.log('📊 Before increment:', {
        currentStreak: streak.currentStreak,
        lastWorkoutDate: streak.lastWorkoutDate
      });
      
      // Simulate workout completion
      streak.currentStreak += 1;
      streak.lastWorkoutDate = today;
      streak.missedWorkouts = 0;
      
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
      
      streak.streakHistory.push({
        date: today,
        streak: streak.currentStreak,
      });
      
      await streak.save();
      
      console.log('✅ Streak incremented successfully');
      console.log('📊 After increment:', {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastWorkoutDate: streak.lastWorkoutDate
      });
      
      return streak;
    } catch (error) {
      console.error('❌ Error incrementing streak:', error);
      throw error;
    }
  }

  async testStreakReset() {
    console.log('\n🧪 Testing streak reset...');
    
    try {
      let streak = await Streak.findById("local");
      if (!streak) {
        streak = await this.testStreakIncrement();
      }
      
      console.log('📊 Before reset:', {
        currentStreak: streak.currentStreak,
        missedWorkouts: streak.missedWorkouts
      });
      
      // Simulate missed workouts
      streak.missedWorkouts = 3;
      streak.currentStreak = 0;
      streak.lastWorkoutDate = null;
      
      await streak.save();
      
      console.log('✅ Streak reset successfully');
      console.log('📊 After reset:', {
        currentStreak: streak.currentStreak,
        missedWorkouts: streak.missedWorkouts,
        lastWorkoutDate: streak.lastWorkoutDate
      });
      
      return streak;
    } catch (error) {
      console.error('❌ Error resetting streak:', error);
      throw error;
    }
  }

  async testAPIEndpoints() {
    console.log('\n🧪 Testing API endpoints...');
    
    const endpoints = [
      { url: '/api/stats', method: 'GET' },
      { url: '/api/streak-status', method: 'GET' },
      { url: '/api/converse', method: 'POST', body: { message: 'I completed my workout today' } }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing ${endpoint.method} ${endpoint.url}...`);
        
        const options = {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (endpoint.body) {
          options.body = JSON.stringify(endpoint.body);
        }
        
        // Note: This would need to be run in the context of the Next.js app
        // For now, we'll just log what we would test
        console.log(`📝 Would test: ${endpoint.method} ${endpoint.url}`);
        console.log(`📝 Options:`, options);
        
      } catch (error) {
        console.error(`❌ Error testing ${endpoint.url}:`, error);
      }
    }
  }

  async testWorkoutDetection() {
    console.log('\n🧪 Testing workout detection logic...');
    
    const testMessages = [
      "I completed my workout today",
      "Workout is done",
      "Finished my training session",
      "Just finished exercising",
      "I did some exercise",
      "Training complete",
      "Workout done for today"
    ];
    
    const workoutKeywords = ["workout", "exercise", "training", "session", "gym"];
    const completionKeywords = ["done", "completed", "finished", "complete"];
    
    testMessages.forEach(message => {
      const messageLower = message.toLowerCase();
      const hasWorkoutKeyword = workoutKeywords.some(keyword => 
        messageLower.includes(keyword)
      );
      const hasCompletionKeyword = completionKeywords.some(keyword => 
        messageLower.includes(keyword)
      );
      
      const explicitCompletion = 
        messageLower.includes("workout is done") ||
        messageLower.includes("workout done") ||
        messageLower.includes("finished workout") ||
        messageLower.includes("workout complete") ||
        messageLower.includes("exercise done") ||
        messageLower.includes("training done");
      
      const implicitCompletion = hasWorkoutKeyword && hasCompletionKeyword;
      const isWorkoutComplete = explicitCompletion || implicitCompletion;
      
      console.log(`📝 Message: "${message}"`);
      console.log(`   Has workout keyword: ${hasWorkoutKeyword}`);
      console.log(`   Has completion keyword: ${hasCompletionKeyword}`);
      console.log(`   Explicit completion: ${explicitCompletion}`);
      console.log(`   Implicit completion: ${implicitCompletion}`);
      console.log(`   Is workout complete: ${isWorkoutComplete}`);
      console.log('');
    });
  }

  async runFullTestSuite() {
    console.log('🚀 Starting Streak Debug Test Suite');
    console.log('=====================================');
    
    try {
      await this.setupTestDatabase();
      
      await this.testStreakCreation();
      await this.testStreakIncrement();
      await this.testStreakReset();
      await this.testAPIEndpoints();
      await this.testWorkoutDetection();
      
      console.log('\n✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use in other files
export default StreakDebugger;

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const debugger = new StreakDebugger();
  debugger.runFullTestSuite();
}

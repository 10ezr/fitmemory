const mongoose = require('mongoose');
const { User, AppConfig } = require('../models');

class DatabaseService {
  static async connect() {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitmemory';
      await mongoose.connect(uri);
      console.log('Connected to MongoDB');
      
      // Initialize singleton documents
      await this.initializeSingletons();
      
      return mongoose.connection;
    } catch (error) {
      console.error('Database connection error:', error);
      process.exit(1);
    }
  }

  static async initializeSingletons() {
    try {
      // Ensure local user exists
      let user = await User.findById('local');
      if (!user) {
        user = new User({ _id: 'local' });
        await user.save();
        console.log('Created local user profile');
      }

      // Ensure app config exists
      let config = await AppConfig.findById('singleton');
      if (!config) {
        config = new AppConfig({ 
          _id: 'singleton',
          version: '1.0.0',
          patterns: {},
          consistency: {
            dailyStreak: 0,
            weeklyCounts: [0, 0, 0, 0],
            rollingAverage: 0,
            trend: 'stable'
          }
        });
        await config.save();
        console.log('Created app config');
      }
    } catch (error) {
      console.error('Error initializing singletons:', error);
      throw error;
    }
  }

  static async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }

  static isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

// Handle connection events
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await DatabaseService.disconnect();
  process.exit(0);
});

module.exports = DatabaseService;

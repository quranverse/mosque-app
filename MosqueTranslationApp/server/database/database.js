// Database connection and setup for Mosque Translation App
const mongoose = require('mongoose');
const config = require('../config/config');

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Avoid multiple connections
      if (this.isConnected) {
        console.log('Database already connected');
        return this.connection;
      }

      console.log('Connecting to MongoDB...');
      
      // Connect to MongoDB
      this.connection = await mongoose.connect(config.database.uri, config.database.options);
      
      this.isConnected = true;
      console.log(`✅ MongoDB connected successfully to: ${config.database.uri}`);
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('✅ MongoDB connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnectionActive() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  async healthCheck() {
    try {
      if (!this.isConnectionActive()) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'connected',
        message: 'Database connection healthy',
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        error: error
      };
    }
  }

  // Initialize database with indexes and default data
  async initialize() {
    try {
      console.log('Initializing database...');
      
      // Create indexes for better performance
      await this.createIndexes();
      
      // Seed default data if in development
      if (config.nodeEnv === 'development' && config.enableMockData) {
        await this.seedMockData();
      }
      
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      const User = require('../models/User');
      const Mosque = require('../models/Mosque');
      
      // User indexes
      await User.createIndexes();
      
      // Mosque indexes
      await Mosque.createIndexes();
      
      console.log('✅ Database indexes created');
    } catch (error) {
      console.error('❌ Failed to create indexes:', error);
      throw error;
    }
  }

  async seedMockData() {
    try {
      const User = require('../models/User');
      const Mosque = require('../models/Mosque');
      
      // Check if data already exists
      const userCount = await User.countDocuments();
      const mosqueCount = await Mosque.countDocuments();
      
      if (userCount > 0 || mosqueCount > 0) {
        console.log('Mock data already exists, skipping seed');
        return;
      }
      
      // Create mock mosque accounts
      const mockMosques = [
        {
          email: 'admin@centralmosque.com',
          password: 'password123',
          userType: 'mosque',
          mosqueName: 'Central Mosque',
          mosqueAddress: '123 Main Street, New York, NY 10001',
          phone: '+1-555-0101',
          location: {
            type: 'Point',
            coordinates: [-74.0060, 40.7128] // [longitude, latitude]
          },
          madhab: 'Hanafi',
          prayerTimeMethod: 'MoonsightingCommittee',
          servicesOffered: ['Live Translation', 'Friday Speeches', 'Educational Programs'],
          languagesSupported: ['Arabic', 'English', 'Urdu'],
          capacity: 500,
          facilities: ['Parking', 'Wheelchair Access', 'Wudu Area']
        },
        {
          email: 'admin@masjidalnoor.com',
          password: 'password123',
          userType: 'mosque',
          mosqueName: 'Masjid Al-Noor',
          mosqueAddress: '456 Oak Avenue, New York, NY 10002',
          phone: '+1-555-0102',
          location: {
            type: 'Point',
            coordinates: [-73.9851, 40.7589]
          },
          madhab: 'Shafi',
          prayerTimeMethod: 'MuslimWorldLeague',
          servicesOffered: ['Live Translation', 'Youth Programs', 'Community Events'],
          languagesSupported: ['Arabic', 'English', 'Turkish'],
          capacity: 300,
          facilities: ['Parking', 'Library', 'Community Hall']
        }
      ];
      
      // Create mosque users
      for (const mosqueData of mockMosques) {
        const user = new User(mosqueData);
        await user.save();
        console.log(`Created mock mosque: ${mosqueData.mosqueName}`);
      }
      
      console.log('✅ Mock data seeded successfully');
    } catch (error) {
      console.error('❌ Failed to seed mock data:', error);
      throw error;
    }
  }
}

// Export singleton instance
const database = new Database();
module.exports = database;

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

  // Initialize database with comprehensive setup
  async initialize() {
    try {
      const databaseInitializer = require('./init-database');
      await databaseInitializer.initialize();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // Get database status
  async getStatus() {
    try {
      const databaseInitializer = require('./init-database');
      return await databaseInitializer.getStatus();
    } catch (error) {
      return {
        isInitialized: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const database = new Database();
module.exports = database;

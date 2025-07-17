#!/usr/bin/env node

// Setup script for Mosque Translation App Backend
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SetupWizard {
  constructor() {
    this.config = {};
  }

  async run() {
    console.log('\n🕌 Welcome to Mosque Translation App Backend Setup!\n');
    console.log('This wizard will help you configure your MongoDB Atlas connection and other settings.\n');

    try {
      // Check if .env already exists
      if (fs.existsSync('.env')) {
        const overwrite = await this.question('⚠️  .env file already exists. Do you want to overwrite it? (y/N): ');
        if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
          console.log('Setup cancelled. Your existing .env file is preserved.');
          process.exit(0);
        }
      }

      // Collect configuration
      await this.collectDatabaseConfig();
      await this.collectJWTConfig();
      await this.collectEmailConfig();
      await this.collectServerConfig();

      // Generate .env file
      await this.generateEnvFile();

      // Test database connection
      await this.testDatabaseConnection();

      console.log('\n🎉 Setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Run: npm run dev (to start development server)');
      console.log('2. Run: node test-auth.js (to test authentication endpoints)');
      console.log('3. Visit: http://localhost:3001/api/status (to check server status)');
      console.log('\nMay Allah bless your project! 🤲\n');

    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async collectDatabaseConfig() {
    console.log('📊 Database Configuration (MongoDB Atlas)');
    console.log('Please provide your MongoDB Atlas connection details:\n');

    this.config.MONGODB_URI = await this.question('MongoDB Atlas Connection String: ');
    
    if (!this.config.MONGODB_URI.includes('mongodb+srv://')) {
      console.log('⚠️  Warning: This doesn\'t look like a MongoDB Atlas connection string.');
      console.log('Expected format: mongodb+srv://username:password@cluster.xxxxx.mongodb.net/database');
      
      const proceed = await this.question('Do you want to continue anyway? (y/N): ');
      if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
        throw new Error('Invalid MongoDB connection string');
      }
    }

    console.log('✅ Database configuration collected\n');
  }

  async collectJWTConfig() {
    console.log('🔐 JWT Configuration');
    console.log('JWT secret is used to sign authentication tokens.\n');

    const useDefault = await this.question('Use auto-generated JWT secret? (Y/n): ');
    
    if (useDefault.toLowerCase() === 'n' || useDefault.toLowerCase() === 'no') {
      this.config.JWT_SECRET = await this.question('Enter JWT secret (min 32 characters): ');
      
      if (this.config.JWT_SECRET.length < 32) {
        console.log('⚠️  Warning: JWT secret should be at least 32 characters for security.');
      }
    } else {
      // Generate a secure random JWT secret
      this.config.JWT_SECRET = require('crypto').randomBytes(64).toString('hex');
      console.log('✅ Auto-generated secure JWT secret');
    }

    this.config.JWT_EXPIRES_IN = await this.question('JWT token expiration (default: 7d): ') || '7d';
    this.config.JWT_REFRESH_EXPIRES_IN = await this.question('JWT refresh token expiration (default: 30d): ') || '30d';

    console.log('✅ JWT configuration collected\n');
  }

  async collectEmailConfig() {
    console.log('📧 Email Configuration (Optional)');
    console.log('Email is used for account verification and password reset.\n');

    const configureEmail = await this.question('Do you want to configure email service? (y/N): ');
    
    if (configureEmail.toLowerCase() === 'y' || configureEmail.toLowerCase() === 'yes') {
      this.config.EMAIL_SERVICE = await this.question('Email service (default: gmail): ') || 'gmail';
      this.config.EMAIL_USER = await this.question('Email address: ');
      this.config.EMAIL_PASSWORD = await this.question('Email password/app password: ');
      this.config.EMAIL_FROM = await this.question('From email address (default: noreply@mosquetranslationapp.com): ') || 'noreply@mosquetranslationapp.com';
      
      console.log('✅ Email configuration collected');
    } else {
      console.log('⏭️  Email configuration skipped (you can configure it later)');
    }

    console.log();
  }

  async collectServerConfig() {
    console.log('⚙️ Server Configuration');
    
    this.config.PORT = await this.question('Server port (default: 3001): ') || '3001';
    this.config.NODE_ENV = await this.question('Environment (development/production, default: development): ') || 'development';
    this.config.CORS_ORIGIN = await this.question('CORS origin (default: *): ') || '*';
    this.config.FRONTEND_URL = await this.question('Frontend URL (default: http://localhost:3000): ') || 'http://localhost:3000';

    console.log('✅ Server configuration collected\n');
  }

  async generateEnvFile() {
    console.log('📝 Generating .env file...');

    const envContent = `# Mosque Translation App - Environment Configuration
# Generated by setup wizard on ${new Date().toISOString()}

# Server Configuration
PORT=${this.config.PORT}
NODE_ENV=${this.config.NODE_ENV}

# MongoDB Atlas Configuration
MONGODB_URI=${this.config.MONGODB_URI}

# JWT Configuration
JWT_SECRET=${this.config.JWT_SECRET}
JWT_EXPIRES_IN=${this.config.JWT_EXPIRES_IN}
JWT_REFRESH_EXPIRES_IN=${this.config.JWT_REFRESH_EXPIRES_IN}

# Email Configuration${this.config.EMAIL_USER ? '' : ' (Disabled)'}
${this.config.EMAIL_SERVICE ? `EMAIL_SERVICE=${this.config.EMAIL_SERVICE}` : '# EMAIL_SERVICE=gmail'}
${this.config.EMAIL_USER ? `EMAIL_USER=${this.config.EMAIL_USER}` : '# EMAIL_USER=your-email@gmail.com'}
${this.config.EMAIL_PASSWORD ? `EMAIL_PASSWORD=${this.config.EMAIL_PASSWORD}` : '# EMAIL_PASSWORD=your-app-password'}
${this.config.EMAIL_FROM ? `EMAIL_FROM=${this.config.EMAIL_FROM}` : '# EMAIL_FROM=noreply@mosquetranslationapp.com'}

# File Upload Configuration
UPLOAD_DIR=./uploads

# Security Configuration
CORS_ORIGIN=${this.config.CORS_ORIGIN}

# External APIs (Optional)
# GEOCODING_API_KEY=your-geocoding-api-key
# PUSH_NOTIFICATION_KEY=your-push-notification-key

# Frontend URL
FRONTEND_URL=${this.config.FRONTEND_URL}

# Development Settings
LOG_LEVEL=debug
`;

    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file created successfully');
  }

  async testDatabaseConnection() {
    console.log('🧪 Testing database connection...');

    try {
      // Load the configuration
      require('dotenv').config();
      
      const mongoose = require('mongoose');
      
      // Test connection
      await mongoose.connect(this.config.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000 // 10 second timeout
      });

      console.log('✅ Database connection successful!');
      console.log(`📍 Connected to: ${mongoose.connection.name}`);
      
      // Close connection
      await mongoose.connection.close();
      
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      console.log('\nPlease check your MongoDB Atlas connection string and try again.');
      console.log('Common issues:');
      console.log('- Incorrect username/password');
      console.log('- Database user not created in MongoDB Atlas');
      console.log('- IP address not whitelisted in MongoDB Atlas');
      console.log('- Network connectivity issues');
      
      const continueAnyway = await this.question('\nDo you want to continue anyway? (y/N): ');
      if (continueAnyway.toLowerCase() !== 'y' && continueAnyway.toLowerCase() !== 'yes') {
        throw new Error('Database connection test failed');
      }
    }
  }

  question(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// Run setup wizard if this file is executed directly
if (require.main === module) {
  const wizard = new SetupWizard();
  wizard.run().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = SetupWizard;

// Database initialization script for Mosque Translation App
const mongoose = require('mongoose');
const config = require('../config/config');
const User = require('../models/User');
const Session = require('../models/Session');
const Translation = require('../models/Translation');

// Audio-related models for new functionality
const AudioSession = require('../models/AudioSession');
const VoiceTranscription = require('../models/VoiceTranscription');
const TranslationResult = require('../models/TranslationResult');
const AudioRecording = require('../models/AudioRecording');
const SessionParticipant = require('../models/SessionParticipant');
const TranslationCache = require('../models/TranslationCache');

class DatabaseInitializer {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🗄️ Initializing Mosque Translation App Database...');
      
      // Connect to database
      await this.connectDatabase();
      
      // Create indexes
      await this.createIndexes();

      // Create audio-related collections and indexes
      await this.createAudioCollections();

      // Seed initial data if in development
      if (config.nodeEnv === 'development') {
        await this.seedDevelopmentData();
      }
      
      // Verify database setup
      await this.verifySetup();
      
      this.isInitialized = true;
      console.log('✅ Database initialization completed successfully!');
      
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async connectDatabase() {
    try {
      console.log('📡 Connecting to MongoDB Atlas...');
      
      await mongoose.connect(config.database.uri, config.database.options);
      
      console.log('✅ Connected to MongoDB Atlas successfully');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}`);
      
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB Atlas:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      console.log('📊 Creating database indexes...');

      // Create User indexes with error handling for existing indexes
      try {
        await User.createIndexes();
        console.log('  ✅ User indexes created');
      } catch (error) {
        if (error.code === 86) { // IndexKeySpecsConflict
          console.log('  ⚠️ User indexes already exist, skipping...');
        } else {
          throw error;
        }
      }

      // Create Session indexes
      try {
        await Session.createIndexes();
        console.log('  ✅ Session indexes created');
      } catch (error) {
        if (error.code === 86) { // IndexKeySpecsConflict
          console.log('  ⚠️ Session indexes already exist, skipping...');
        } else {
          throw error;
        }
      }

      // Create Translation indexes
      try {
        await Translation.createIndexes();
        console.log('  ✅ Translation indexes created');
      } catch (error) {
        if (error.code === 86) { // IndexKeySpecsConflict
          console.log('  ⚠️ Translation indexes already exist, skipping...');
        } else {
          throw error;
        }
      }

      console.log('✅ All database indexes processed successfully');

    } catch (error) {
      console.error('❌ Failed to create indexes:', error);
      throw error;
    }
  }

  async createAudioCollections() {
    try {
      console.log('🎵 Creating audio-related collections and indexes...');

      // Create AudioSession indexes
      try {
        await AudioSession.createIndexes();
        console.log('  ✅ AudioSession indexes created');
      } catch (error) {
        if (error.code === 86) {
          console.log('  ⚠️ AudioSession indexes already exist, skipping...');
        } else {
          throw error;
        }
      }

      // Create VoiceTranscription indexes
      try {
        await VoiceTranscription.createIndexes();
        console.log('  ✅ VoiceTranscription indexes created');
      } catch (error) {
        if (error.code === 86) {
          console.log('  ⚠️ VoiceTranscription indexes already exist, skipping...');
        } else {
          throw error;
        }
      }

      // Create TranslationResult indexes
      try {
        await TranslationResult.createIndexes();
        console.log('  ✅ TranslationResult indexes created');
      } catch (error) {
        if (error.code === 86) {
          console.log('  ⚠️ TranslationResult indexes already exist, skipping...');
        } else {
          throw error;
        }
      }

      // Create AudioRecording indexes
      try {
        await AudioRecording.createIndexes();
        console.log('  ✅ AudioRecording indexes created');
      } catch (error) {
        if (error.code === 86) {
          console.log('  ⚠️ AudioRecording indexes already exist, skipping...');
        } else {
          throw error;
        }
      }

      // Create SessionParticipant indexes
      try {
        await SessionParticipant.createIndexes();
        console.log('  ✅ SessionParticipant indexes created');
      } catch (error) {
        if (error.code === 86) {
          console.log('  ⚠️ SessionParticipant indexes already exist, skipping...');
        } else {
          throw error;
        }
      }

      // Create TranslationCache indexes
      try {
        await TranslationCache.createIndexes();
        console.log('  ✅ TranslationCache indexes created');
      } catch (error) {
        if (error.code === 86) {
          console.log('  ⚠️ TranslationCache indexes already exist, skipping...');
        } else {
          throw error;
        }
      }

      console.log('✅ All audio-related collections processed successfully');

    } catch (error) {
      console.error('❌ Failed to create audio collections:', error);
      throw error;
    }
  }

  async seedDevelopmentData() {
    try {
      console.log('🌱 Seeding development data...');
      
      // Check if data already exists
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        console.log('📊 Development data already exists, skipping seed');
        return;
      }
      
      // Create sample mosque accounts
      const mosqueAccounts = await this.createSampleMosques();
      console.log(`  ✅ Created ${mosqueAccounts.length} sample mosque accounts`);
      
      // Create sample individual users
      const individualUsers = await this.createSampleIndividualUsers();
      console.log(`  ✅ Created ${individualUsers.length} sample individual users`);
      
      // Create sample sessions and translations
      const sessions = await this.createSampleSessions(mosqueAccounts);
      console.log(`  ✅ Created ${sessions.length} sample translation sessions`);
      
      console.log('✅ Development data seeded successfully');
      
    } catch (error) {
      console.error('❌ Failed to seed development data:', error);
      throw error;
    }
  }

  async createSampleMosques() {
    const mosqueData = [
      {
        email: 'admin@centralmosque.com',
        password: 'password123',
        userType: 'mosque',
        mosqueName: 'Central Mosque',
        mosqueAddress: '123 Main Street, New York, NY 10001',
        phone: '+1-555-0101',
        website: 'https://centralmosque.com',
        location: {
          type: 'Point',
          coordinates: [-74.0060, 40.7128] // [longitude, latitude] - NYC
        },
        servicesOffered: ['Live Translation', 'Friday Speeches', 'Educational Programs'],
        languagesSupported: ['Arabic', 'English', 'Urdu'],
        capacity: 500,
        facilities: ['Parking', 'Wheelchair Access', 'Wudu Area', 'Library'],
        isEmailVerified: true,
        photos: {
          exterior: '/uploads/central-mosque-exterior.jpg',
          interior: '/uploads/central-mosque-interior.jpg'
        }
      },
      {
        email: 'admin@masjidalnoor.com',
        password: 'password123',
        userType: 'mosque',
        mosqueName: 'Masjid Al-Noor',
        mosqueAddress: '456 Oak Avenue, Brooklyn, NY 11201',
        phone: '+1-555-0102',
        website: 'https://masjidalnoor.org',
        location: {
          type: 'Point',
          coordinates: [-73.9851, 40.7589] // Brooklyn
        },
        servicesOffered: ['Live Translation', 'Youth Programs', 'Community Events'],
        languagesSupported: ['Arabic', 'English', 'Turkish'],
        capacity: 300,
        facilities: ['Parking', 'Community Hall', 'Children Area'],
        isEmailVerified: true,
        photos: {
          exterior: '/uploads/masjid-alnoor-exterior.jpg',
          interior: '/uploads/masjid-alnoor-interior.jpg'
        }
      },
      {
        email: 'admin@islamiccenter.com',
        password: 'password123',
        userType: 'mosque',
        mosqueName: 'Islamic Center of Queens',
        mosqueAddress: '789 Queens Boulevard, Queens, NY 11373',
        phone: '+1-555-0103',
        location: {
          type: 'Point',
          coordinates: [-73.8740, 40.7282] // Queens
        },
        servicesOffered: ['Live Translation', 'Friday Speeches', 'Women\'s Programs'],
        languagesSupported: ['Arabic', 'English', 'Bengali', 'Urdu'],
        capacity: 800,
        facilities: ['Parking', 'Wheelchair Access', 'Cafeteria', 'Bookstore'],
        isEmailVerified: true
      }
    ];

    const createdMosques = [];
    for (const mosque of mosqueData) {
      const user = new User(mosque);
      await user.save();
      createdMosques.push(user);
    }

    return createdMosques;
  }

  async createSampleIndividualUsers() {
    const individualData = [
      {
        email: 'individual.device.001@example.com',
        password: 'random-password-001',
        userType: 'individual',
        isEmailVerified: true,
        appSettings: {
          interfaceLanguage: 'English',
          translationLanguage: 'English',
          fontSize: 'medium'
        }
      },
      {
        email: 'individual.device.002@example.com',
        password: 'random-password-002',
        userType: 'individual',
        isEmailVerified: true,
        appSettings: {
          interfaceLanguage: 'Arabic',
          translationLanguage: 'Arabic',
          fontSize: 'large',
          rtlSupport: true
        }
      }
    ];

    const createdUsers = [];
    for (const userData of individualData) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }

    return createdUsers;
  }

  async createSampleSessions(mosqueAccounts) {
    const sessions = [];
    
    for (const mosque of mosqueAccounts) {
      // Create a sample session for each mosque
      const session = new Session({
        sessionId: `session_${mosque._id}_${Date.now()}`,
        mosqueId: mosque._id,
        mosqueName: mosque.mosqueName,
        title: 'Friday Prayer Translation',
        description: 'Live translation of Friday prayer and sermon',
        targetLanguages: ['English', 'Urdu'],
        sessionType: 'friday_prayer',
        status: 'ended', // Historical session
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        endedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        participants: [
          {
            userId: mosque._id,
            deviceId: `mosque_${mosque._id}`,
            userType: 'mosque',
            joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            leftAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            isActive: false
          }
        ],
        stats: {
          totalParticipants: 25,
          maxConcurrentParticipants: 20,
          totalTranslations: 15
        }
      });
      
      await session.save();
      sessions.push(session);
      
      // Create sample translations for this session
      await this.createSampleTranslations(session, mosque);
    }
    
    return sessions;
  }

  async createSampleTranslations(session, mosque) {
    const sampleTranslations = [
      {
        originalText: 'بسم الله الرحمن الرحيم',
        translations: [
          { language: 'English', text: 'In the name of Allah, the Most Gracious, the Most Merciful' },
          { language: 'Urdu', text: 'اللہ کے نام سے جو بہت مہربان، نہایت رحم والا ہے' }
        ],
        context: 'quran',
        islamicContent: { isQuranic: true, surahNumber: 1, ayahNumber: 1 }
      },
      {
        originalText: 'الحمد لله رب العالمين',
        translations: [
          { language: 'English', text: 'All praise is due to Allah, Lord of all the worlds' },
          { language: 'Urdu', text: 'تمام تعریفیں اللہ کے لیے ہیں جو تمام جہانوں کا رب ہے' }
        ],
        context: 'quran',
        islamicContent: { isQuranic: true, surahNumber: 1, ayahNumber: 2 }
      },
      {
        originalText: 'أشهد أن لا إله إلا الله وأشهد أن محمداً رسول الله',
        translations: [
          { language: 'English', text: 'I bear witness that there is no god but Allah, and I bear witness that Muhammad is the messenger of Allah' },
          { language: 'Urdu', text: 'میں گواہی دیتا ہوں کہ اللہ کے سوا کوئی معبود نہیں اور محمد اللہ کے رسول ہیں' }
        ],
        context: 'prayer'
      }
    ];

    for (let i = 0; i < sampleTranslations.length; i++) {
      const translationData = sampleTranslations[i];
      
      const translation = new Translation({
        translationId: `trans_${session._id}_${i + 1}`,
        sessionId: session._id,
        mosqueId: mosque._id,
        originalText: translationData.originalText,
        originalLanguage: 'Arabic',
        translations: translationData.translations,
        context: translationData.context,
        sequenceNumber: i + 1,
        timestamp: new Date(session.startedAt.getTime() + (i * 5 * 60 * 1000)), // 5 minutes apart
        islamicContent: translationData.islamicContent || {},
        interactions: {
          views: Math.floor(Math.random() * 50) + 10,
          likes: Math.floor(Math.random() * 20) + 5
        }
      });
      
      await translation.save();
    }
  }

  async verifySetup() {
    try {
      console.log('🔍 Verifying database setup...');
      
      // Check collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`  📊 Collections created: ${collections.map(c => c.name).join(', ')}`);
      
      // Check document counts
      const userCount = await User.countDocuments();
      const sessionCount = await Session.countDocuments();
      const translationCount = await Translation.countDocuments();
      
      console.log(`  👥 Users: ${userCount}`);
      console.log(`  📡 Sessions: ${sessionCount}`);
      console.log(`  📝 Translations: ${translationCount}`);
      
      // Test a simple query
      const mosques = await User.find({ userType: 'mosque' }).limit(1);
      if (mosques.length > 0) {
        console.log(`  🕌 Sample mosque: ${mosques[0].mosqueName}`);
      }
      
      console.log('✅ Database setup verification completed');
      
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      const status = {
        isInitialized: this.isInitialized,
        connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        database: mongoose.connection.name,
        collections: {},
        indexes: {}
      };

      if (mongoose.connection.readyState === 1) {
        // Get collection stats
        status.collections.users = await User.countDocuments();
        status.collections.sessions = await Session.countDocuments();
        status.collections.translations = await Translation.countDocuments();

        // Get index information
        status.indexes.users = await User.collection.getIndexes();
        status.indexes.sessions = await Session.collection.getIndexes();
        status.indexes.translations = await Translation.collection.getIndexes();
      }

      return status;
    } catch (error) {
      return {
        isInitialized: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const databaseInitializer = new DatabaseInitializer();
module.exports = databaseInitializer;

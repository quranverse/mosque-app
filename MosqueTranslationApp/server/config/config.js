// Configuration settings for the Mosque Translation App backend
require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mosque-translation-app',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // Email Configuration
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@mosquetranslationapp.com',
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxPhotosPerMosque: 7, // 2 required + 5 optional
  },
  
  // Security Configuration
  security: {
    bcryptRounds: 12,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // limit each IP to 100 requests per windowMs
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  
  // Islamic Features Configuration
  islamic: {
    defaultCalculationMethod: 'MoonsightingCommittee',
    supportedMadhabs: ['Hanafi', 'Shafi'],
    supportedLanguages: [
      // Major Islamic Languages
      'Arabic', 'English', 'Urdu', 'Turkish', 'Persian', 'Malay', 'Indonesian',
      // European Languages
      'German', 'French', 'Spanish', 'Italian', 'Dutch', 'Portuguese', 'Russian',
      // Asian Languages
      'Chinese', 'Japanese', 'Korean', 'Hindi', 'Bengali', 'Tamil', 'Thai',
      // African Languages
      'Swahili', 'Hausa', 'Amharic',
      // Other Languages
      'Albanian', 'Bosnian', 'Kurdish', 'Pashto', 'Somali', 'Uzbek'
    ],
    languageGroups: {
      'European': ['German', 'French', 'Spanish', 'Italian', 'Dutch', 'Portuguese', 'Russian', 'Albanian', 'Bosnian'],
      'Asian': ['Chinese', 'Japanese', 'Korean', 'Hindi', 'Bengali', 'Tamil', 'Thai', 'Malay', 'Indonesian'],
      'Islamic': ['Arabic', 'Urdu', 'Turkish', 'Persian', 'Kurdish', 'Pashto'],
      'African': ['Swahili', 'Hausa', 'Amharic', 'Somali'],
      'Popular': ['English', 'German', 'French', 'Spanish', 'Turkish', 'Urdu']
    },
    languageDetails: {
      'Arabic': { code: 'ar', rtl: true, script: 'Arabic', family: 'Semitic' },
      'English': { code: 'en', rtl: false, script: 'Latin', family: 'Germanic' },
      'German': { code: 'de', rtl: false, script: 'Latin', family: 'Germanic' },
      'French': { code: 'fr', rtl: false, script: 'Latin', family: 'Romance' },
      'Spanish': { code: 'es', rtl: false, script: 'Latin', family: 'Romance' },
      'Turkish': { code: 'tr', rtl: false, script: 'Latin', family: 'Turkic' },
      'Urdu': { code: 'ur', rtl: true, script: 'Arabic', family: 'Indo-European' },
      'Persian': { code: 'fa', rtl: true, script: 'Arabic', family: 'Indo-European' },
      'Italian': { code: 'it', rtl: false, script: 'Latin', family: 'Romance' },
      'Dutch': { code: 'nl', rtl: false, script: 'Latin', family: 'Germanic' },
      'Portuguese': { code: 'pt', rtl: false, script: 'Latin', family: 'Romance' },
      'Russian': { code: 'ru', rtl: false, script: 'Cyrillic', family: 'Slavic' },
      'Chinese': { code: 'zh', rtl: false, script: 'Chinese', family: 'Sino-Tibetan' },
      'Japanese': { code: 'ja', rtl: false, script: 'Japanese', family: 'Japonic' },
      'Korean': { code: 'ko', rtl: false, script: 'Korean', family: 'Koreanic' },
      'Hindi': { code: 'hi', rtl: false, script: 'Devanagari', family: 'Indo-European' },
      'Bengali': { code: 'bn', rtl: false, script: 'Bengali', family: 'Indo-European' },
      'Malay': { code: 'ms', rtl: false, script: 'Latin', family: 'Austronesian' },
      'Indonesian': { code: 'id', rtl: false, script: 'Latin', family: 'Austronesian' },
      'Swahili': { code: 'sw', rtl: false, script: 'Latin', family: 'Niger-Congo' },
      'Kurdish': { code: 'ku', rtl: true, script: 'Arabic', family: 'Indo-European' },
      'Albanian': { code: 'sq', rtl: false, script: 'Latin', family: 'Indo-European' },
      'Bosnian': { code: 'bs', rtl: false, script: 'Latin', family: 'Slavic' }
    },
    prayerMethods: [
      'MuslimWorldLeague',
      'Egyptian',
      'Karachi',
      'UmmAlQura',
      'Dubai',
      'MoonsightingCommittee',
      'NorthAmerica',
      'Kuwait',
      'Qatar',
      'Singapore'
    ]
  },
  
  // Notification Configuration
  notifications: {
    pushNotificationKey: process.env.PUSH_NOTIFICATION_KEY || '',
    emailTemplatesDir: './templates/email',
  },
  
  // Location Configuration
  location: {
    defaultSearchRadius: 10, // kilometers
    maxSearchRadius: 50, // kilometers
    geocodingApiKey: process.env.GEOCODING_API_KEY || '',
  },
  
  // Development Configuration
  development: {
    enableMockData: true,
    logLevel: 'debug',
    enableCors: true,
  },
  
  // Production Configuration
  production: {
    enableMockData: false,
    logLevel: 'error',
    enableCors: false,
  }
};

// Environment-specific overrides
if (config.nodeEnv === 'production') {
  Object.assign(config, config.production);
} else {
  Object.assign(config, config.development);
}

module.exports = config;

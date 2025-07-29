// Configuration settings for the Mosque Translation App backend
require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mosque-translation-app',
    options: {
      // Removed deprecated options: useNewUrlParser and useUnifiedTopology
      // These are no longer needed in MongoDB driver v4.0.0+
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
  
   // Enhanced Security Configuration with Tunnel Support
  security: {
    bcryptRounds: 12,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // limit each IP to 100 requests per windowMs
    
    // Enhanced CORS configuration for tunnel support
    corsOrigin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps)
      if (!origin) return callback(null, true);
      
      // Development origins
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:19006',  // Expo web
        'http://localhost:8081',   // Alternative Expo port
        'exp://localhost:19000',   // Expo development
        'exp://localhost:19001',   // Alternative Expo port
      ];
      
      // Production origins (add your production domains here)
      const productionOrigins = [
        'https://yourdomain.com',
        'https://www.yourdomain.com'
      ];
      
      // Tunnel patterns for development
      const tunnelPatterns = [
        /^https:\/\/.*\.exp\.direct$/,        // Expo tunnel
        /^https:\/\/.*\.ngrok\.io$/,          // ngrok tunnel
        /^https:\/\/.*\.tunnelmole\.com$/,    // tunnelmole
        /^https:\/\/.*\.loca\.lt$/,           // localtunnel
        /^https:\/\/.*\.ngrok-free\.app$/,    // ngrok free tier
        /^exp:\/\/.*\.exp\.direct$/,          // Expo tunnel with exp protocol
      ];
      
      // Check development origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check production origins
      if (process.env.NODE_ENV === 'production' && productionOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check tunnel patterns (development only)
      if (process.env.NODE_ENV !== 'production') {
        for (const pattern of tunnelPatterns) {
          if (pattern.test(origin)) {
            console.log(`🚇 Tunnel connection accepted from: ${origin}`);
            return callback(null, true);
          }
        }
        
        // For development, be more permissive with local IPs
        if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.)/)) {
          console.log(`🏠 Local network connection accepted from: ${origin}`);
          return callback(null, true);
        }
        
        // Allow all origins in development mode
        console.log(`🔓 Development mode - allowing origin: ${origin}`);
        return callback(null, true);
      }
      
      // Reject in production if not explicitly allowed
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    
    // CORS headers configuration
    corsHeaders: {
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
      ],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      maxAge: 86400 // 24 hours
    }
  },
  
  // Islamic Features Configuration
  islamic: {
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
  },

  // Voice Recognition APIs
  google: {
    speechApiKey: process.env.GOOGLE_SPEECH_API_KEY,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GOOGLE_PROJECT_ID
  },

  azure: {
    speechKey: process.env.AZURE_SPEECH_KEY,
    speechRegion: process.env.AZURE_SPEECH_REGION || 'eastus'
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  },

  assemblyai: {
    apiKey: process.env.ASSEMBLYAI_API_KEY
  },

  munsit: {
    apiKey: process.env.MUNSIT_API_KEY,
    socketUrl: process.env.MUNSIT_SOCKET_URL || 'https://api.cntxt.tools',
    model: process.env.MUNSIT_MODEL || 'munsit-1'
  },

  // Voice Recognition Settings
  voiceRecognition: {
    defaultProvider: process.env.VOICE_PROVIDER || 'munsit',
    fallbackProviders: ['google', 'azure', 'whisper'],
    chunkSize: 1024, // Audio chunk size in bytes
    sampleRate: 16000, // Sample rate for audio processing
    enableRealTime: true,
    confidenceThreshold: 0.7, // Minimum confidence for final transcriptions
    languages: {
      'ar-SA': 'Arabic (Saudi Arabia)',
      'ar-EG': 'Arabic (Egypt)',
      'ar-JO': 'Arabic (Jordan)',
      'ar-AE': 'Arabic (UAE)',
      'ar-MA': 'Arabic (Morocco)'
    },
    munsitSettings: {
      chunkInterval: 1000, // Send audio chunks every 1 second
      reconnectAttempts: 3,
      connectionTimeout: 10000,
      enableWordTimestamps: true
    }
  }
};

// Environment-specific overrides
if (config.nodeEnv === 'production') {
  Object.assign(config, config.production);
} else {
  Object.assign(config, config.development);
}

module.exports = config;

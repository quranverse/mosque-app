// Enhanced server for Mosque Translation App with authentication
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import configuration and database
const config = require('./config/config');
const database = require('./database/database');

// Import routes
const authRoutes = require('./routes/auth');
const translationRoutes = require('./routes/translation');

// Import services
const MultiLanguageTranslationService = require('./services/MultiLanguageTranslationService');

// Import middleware
const { optionalAuth } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: config.security.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

// CORS configuration
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/translation', translationRoutes);

// In-memory storage for development (will be replaced with database)
const activeSessions = new Map();
const connectedClients = new Map();

// Enhanced mosque data with authentication support
const mockMosques = [
  {
    id: 'mosque1',
    name: 'Central Mosque',
    location: { lat: 40.7128, lng: -74.0060 },
    address: '123 Main Street, New York, NY',
    isActive: false,
    followers: 150,
    hasAccount: true,
    accountId: null // Will be populated from database
  },
  {
    id: 'mosque2',
    name: 'Masjid Al-Noor',
    location: { lat: 40.7589, lng: -73.9851 },
    address: '456 Oak Avenue, New York, NY',
    isActive: false,
    followers: 203,
    hasAccount: true,
    accountId: null
  },
];

const mosques = new Map();
mockMosques.forEach(mosque => {
  mosques.set(mosque.id, mosque);
});

// Socket.IO connection handling with authentication
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  connectedClients.set(socket.id, {
    id: socket.id,
    connectedAt: new Date(),
    currentSession: null,
    isAuthenticated: false,
    userId: null,
    userType: null
  });

  // Handle authentication for socket connections
  socket.on('authenticate', async (data, callback) => {
    try {
      const { token } = data;
      
      if (token) {
        // Verify JWT token (simplified for socket)
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, config.jwt.secret);
        const User = require('./models/User');
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
          const client = connectedClients.get(socket.id);
          client.isAuthenticated = true;
          client.userId = user._id;
          client.userType = user.userType;
          client.user = user;
          
          callback({ success: true, userType: user.userType });
          console.log(`Client ${socket.id} authenticated as ${user.userType}`);
          return;
        }
      }
      
      callback({ success: false, error: 'Authentication failed' });
    } catch (error) {
      console.error('Socket authentication error:', error);
      callback({ success: false, error: 'Authentication failed' });
    }
  });

  // Handle joining a translation session (enhanced with auth)
  socket.on('join_session', (data, callback) => {
    const { mosqueId, sessionId, deviceId, userType } = data;
    
    try {
      const session = activeSessions.get(sessionId);
      if (!session) {
        callback({ success: false, error: 'Session not found' });
        return;
      }

      // Join the socket room
      socket.join(sessionId);
      
      // Update client info
      const client = connectedClients.get(socket.id);
      client.currentSession = sessionId;
      client.deviceId = deviceId;
      
      // Update session participants
      session.participants.set(socket.id, {
        deviceId,
        userType: client.userType || userType,
        isAuthenticated: client.isAuthenticated,
        userId: client.userId,
        joinedAt: new Date(),
      });

      // Notify other participants
      socket.to(sessionId).emit('participant_joined', {
        deviceId,
        userType: client.userType || userType,
        participantCount: session.participants.size,
        isAuthenticated: client.isAuthenticated
      });

      callback({ 
        success: true, 
        sessionId,
        participantCount: session.participants.size,
        translations: Array.from(session.translations.values()),
      });

      console.log(`Client ${socket.id} joined session ${sessionId}`);
    } catch (error) {
      console.error('Error joining session:', error);
      callback({ success: false, error: 'Failed to join session' });
    }
  });

  // Handle starting a new translation session (requires mosque auth)
  socket.on('start_session', async (data, callback) => {
    const { mosqueId, deviceId, languages, userType } = data;
    
    try {
      const client = connectedClients.get(socket.id);
      
      // Check if user is authenticated and is a mosque admin
      if (!client.isAuthenticated || client.userType !== 'mosque') {
        callback({ success: false, error: 'Mosque authentication required' });
        return;
      }

      const mosque = mosques.get(mosqueId);
      if (!mosque) {
        callback({ success: false, error: 'Mosque not found' });
        return;
      }

      const sessionId = `session_${mosqueId}_${Date.now()}`;
      const session = {
        id: sessionId,
        mosqueId,
        mosqueUserId: client.userId,
        startedAt: new Date(),
        languages,
        isActive: true,
        participants: new Map(),
        translations: new Map(),
        broadcaster: deviceId,
      };

      activeSessions.set(sessionId, session);
      mosque.isActive = true;
      mosque.currentSession = sessionId;

      // Join the broadcaster to the session
      socket.join(sessionId);
      session.participants.set(socket.id, {
        deviceId,
        userType: 'broadcaster',
        isAuthenticated: true,
        userId: client.userId,
        joinedAt: new Date(),
      });

      client.currentSession = sessionId;
      client.deviceId = deviceId;

      // Notify all clients about new session
      io.emit('session_started', {
        sessionId,
        mosqueId,
        mosqueName: mosque.name,
        languages,
        startedAt: session.startedAt,
      });

      // Update mosque analytics
      if (client.user) {
        client.user.analytics.totalTranslationSessions += 1;
        await client.user.save();
      }

      callback({ success: true, sessionId });
      console.log(`Session ${sessionId} started for mosque ${mosqueId} by user ${client.userId}`);
    } catch (error) {
      console.error('Error starting session:', error);
      callback({ success: false, error: 'Failed to start session' });
    }
  });

  // Handle ending a session (requires mosque auth)
  socket.on('end_session', async (data) => {
    const { sessionId } = data;

    try {
      const client = connectedClients.get(socket.id);
      const session = activeSessions.get(sessionId);

      if (session && client.isAuthenticated && client.userType === 'mosque') {
        const mosque = mosques.get(session.mosqueId);
        if (mosque) {
          mosque.isActive = false;
          mosque.currentSession = null;
        }

        // Notify all participants
        io.to(sessionId).emit('session_ended', {
          sessionId,
          endedAt: new Date(),
          translationCount: session.translations.size,
        });

        // Remove all participants from the room
        session.participants.forEach((participant, socketId) => {
          const participantSocket = io.sockets.sockets.get(socketId);
          if (participantSocket) {
            participantSocket.leave(sessionId);
          }
        });

        activeSessions.delete(sessionId);
        console.log(`Session ${sessionId} ended by user ${client.userId}`);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  });

  // Handle leaving a session
  socket.on('leave_session', (data) => {
    const { sessionId, deviceId } = data;

    try {
      const session = activeSessions.get(sessionId);
      if (session) {
        session.participants.delete(socket.id);
        socket.leave(sessionId);

        // Notify other participants
        socket.to(sessionId).emit('participant_left', {
          deviceId,
          participantCount: session.participants.size,
        });
      }

      // Update client info
      const client = connectedClients.get(socket.id);
      if (client) {
        client.currentSession = null;
      }

      console.log(`Client ${socket.id} left session ${sessionId}`);
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  });

  // Handle sending original translation (requires mosque auth)
  socket.on('send_original_translation', async (data, callback) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.currentSession || !client.isAuthenticated || client.userType !== 'mosque') {
        callback && callback({ success: false, error: 'Mosque authentication required' });
        return;
      }

      const session = activeSessions.get(client.currentSession);
      if (!session || session.broadcaster !== client.deviceId) {
        callback && callback({ success: false, error: 'Not authorized to broadcast' });
        return;
      }

      const { originalText, context = 'general', metadata = {} } = data;

      // Process through multi-language service
      const translation = await MultiLanguageTranslationService.processOriginalTranslation(
        client.currentSession,
        originalText,
        context,
        metadata
      );

      // Store in session for backward compatibility
      session.translations.set(translation.translationId, {
        id: translation.translationId,
        arabicText: originalText,
        timestamp: translation.timestamp.toISOString(),
        sessionId: client.currentSession,
        sequenceNumber: translation.sequenceNumber,
        context,
        availableLanguages: session.targetLanguages || ['English']
      });

      // Broadcast to all participants
      io.to(client.currentSession).emit('original_translation', {
        translationId: translation.translationId,
        originalText,
        context,
        sequenceNumber: translation.sequenceNumber,
        timestamp: translation.timestamp,
        targetLanguages: session.targetLanguages || ['English']
      });

      callback && callback({
        success: true,
        translationId: translation.translationId,
        sequenceNumber: translation.sequenceNumber
      });

      console.log(`Original translation sent in session ${client.currentSession} by user ${client.userId}`);
    } catch (error) {
      console.error('Error sending original translation:', error);
      callback && callback({ success: false, error: 'Failed to send translation' });
    }
  });

  // Handle language-specific translation (for translators)
  socket.on('send_language_translation', async (data, callback) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.currentSession || !client.isAuthenticated) {
        callback && callback({ success: false, error: 'Authentication required' });
        return;
      }

      const { translationId, language, text, confidence } = data;

      // Add translation through multi-language service
      const updatedTranslation = await MultiLanguageTranslationService.addLanguageTranslation(
        translationId,
        language,
        text,
        client.userId,
        confidence
      );

      // Broadcast language-specific translation to all participants
      io.to(client.currentSession).emit('language_translation_update', {
        translationId,
        language,
        text,
        confidence,
        translatorId: client.userId,
        timestamp: new Date()
      });

      callback && callback({ success: true });

      console.log(`${language} translation added for ${translationId} by user ${client.userId}`);
    } catch (error) {
      console.error('Error sending language translation:', error);
      callback && callback({ success: false, error: 'Failed to send translation' });
    }
  });

  // Handle translator registration for specific language
  socket.on('register_translator', async (data, callback) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.currentSession || !client.isAuthenticated) {
        callback && callback({ success: false, error: 'Authentication required' });
        return;
      }

      const { language } = data;

      // Validate language support
      if (!MultiLanguageTranslationService.isLanguageSupported(language)) {
        callback && callback({ success: false, error: 'Language not supported' });
        return;
      }

      // Register translator
      const translatorInfo = MultiLanguageTranslationService.registerTranslator(
        socket.id,
        client.currentSession,
        language,
        client.userId,
        client.userType
      );

      // Notify session about new translator
      socket.to(client.currentSession).emit('translator_joined', {
        language,
        translatorId: client.userId,
        userType: client.userType
      });

      callback && callback({ success: true, translatorInfo });

      console.log(`Translator registered for ${language} in session ${client.currentSession}`);
    } catch (error) {
      console.error('Error registering translator:', error);
      callback && callback({ success: false, error: 'Failed to register translator' });
    }
  });

  // Handle user language preference updates
  socket.on('update_language_preferences', async (data, callback) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.isAuthenticated) {
        callback && callback({ success: false, error: 'Authentication required' });
        return;
      }

      const preferences = data;

      // Update preferences in service
      const updatedPrefs = MultiLanguageTranslationService.setUserLanguagePreferences(
        client.userId,
        preferences
      );

      // Update in database
      await User.findByIdAndUpdate(client.userId, {
        'translationPreferences': updatedPrefs
      });

      callback && callback({ success: true, preferences: updatedPrefs });

      console.log(`Language preferences updated for user ${client.userId}`);
    } catch (error) {
      console.error('Error updating language preferences:', error);
      callback && callback({ success: false, error: 'Failed to update preferences' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    try {
      const client = connectedClients.get(socket.id);
      if (client && client.currentSession) {
        const session = activeSessions.get(client.currentSession);
        if (session) {
          session.participants.delete(socket.id);

          // Unregister translator if applicable
          MultiLanguageTranslationService.unregisterTranslator(socket.id);

          // If broadcaster disconnects, end the session
          if (client.deviceId === session.broadcaster) {
            io.to(client.currentSession).emit('session_ended', {
              sessionId: client.currentSession,
              endedAt: new Date(),
              reason: 'Broadcaster disconnected',
            });
            activeSessions.delete(client.currentSession);
          } else {
            // Notify other participants
            socket.to(client.currentSession).emit('participant_left', {
              deviceId: client.deviceId,
              participantCount: session.participants.size,
            });
          }
        }
      }

      connectedClients.delete(socket.id);
      console.log(`Client disconnected: ${socket.id}`);
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// REST API endpoints (enhanced with authentication)
app.get('/api/mosques', optionalAuth, async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    // If user is authenticated, get mosques from database
    if (req.user) {
      const User = require('./models/User');
      const nearbyMosques = await User.findNearbyMosques(
        parseFloat(lng),
        parseFloat(lat),
        parseFloat(radius) * 1000 // Convert km to meters
      );

      const mosquesWithDistance = nearbyMosques.map(mosque => ({
        id: mosque._id,
        name: mosque.mosqueName,
        address: mosque.mosqueAddress,
        location: {
          lat: mosque.location.coordinates[1],
          lng: mosque.location.coordinates[0]
        },
        phone: mosque.phone,
        website: mosque.website,
        madhab: mosque.madhab,
        servicesOffered: mosque.servicesOffered,
        languagesSupported: mosque.languagesSupported,
        capacity: mosque.capacity,
        facilities: mosque.facilities,
        photos: mosque.photos,
        followers: mosque.analytics.totalFollowers,
        hasLiveTranslation: false, // Will be updated based on active sessions
        distance: calculateDistance(lat, lng, mosque.location.coordinates[1], mosque.location.coordinates[0]),
        hasAccount: true,
        isFollowed: req.user.userType === 'individual' &&
                   req.user.followedMosques.some(f => f.mosqueId.toString() === mosque._id.toString())
      }));

      return res.json(mosquesWithDistance);
    }

    // Return mock data for unauthenticated users
    const mosquesArray = Array.from(mosques.values()).map(mosque => ({
      ...mosque,
      distance: Math.random() * 5, // Mock distance
      hasLiveTranslation: mosque.isActive,
      isFollowed: false
    }));

    res.json(mosquesArray);
  } catch (error) {
    console.error('Error fetching mosques:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mosques'
    });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

// Get active translation sessions
app.get('/api/sessions/active', (req, res) => {
  const activeSessonsArray = Array.from(activeSessions.values()).map(session => {
    const mosque = mosques.get(session.mosqueId);
    return {
      id: session.id,
      mosqueId: session.mosqueId,
      mosqueName: mosque ? mosque.name : 'Unknown Mosque',
      languages: session.languages,
      participantCount: session.participants.size,
      startedAt: session.startedAt,
      isActive: session.isActive,
      hasAuth: !!session.mosqueUserId
    };
  });

  res.json(activeSessonsArray);
});

// Server status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const dbStatus = await database.getStatus();

    res.json({
      status: 'running',
      timestamp: new Date().toISOString(),
      connectedClients: connectedClients.size,
      activeSessions: activeSessions.size,
      registeredMosques: mosques.size,
      uptime: process.uptime(),
      database: {
        ...dbHealth,
        ...dbStatus
      },
      version: '2.0.0',
      features: {
        authentication: true,
        photoUpload: true,
        emailService: !!config.email.user,
        realTimeTranslation: true,
        databaseInitialized: dbStatus.isInitialized
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server status check failed',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🚀 Starting Mosque Translation App Server...');

    // Connect to database
    await database.connect();
    await database.initialize();

    // Start server
    const PORT = config.port;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
      console.log(`🌐 REST API endpoint: http://localhost:${PORT}/api`);
      console.log(`🔐 Authentication enabled: ${true}`);
      console.log(`📧 Email service: ${config.email.user ? 'Enabled' : 'Disabled'}`);
      console.log(`🗄️ Database: ${database.isConnectionActive() ? 'Connected' : 'Disconnected'}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown function
async function gracefulShutdown(signal) {
  console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Close database connection
    await database.disconnect();

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Simulate some translation activity for demo (only in development)
if (config.nodeEnv === 'development') {
  setInterval(() => {
    if (activeSessions.size > 0) {
      const sessions = Array.from(activeSessions.values());
      const randomSession = sessions[Math.floor(Math.random() * sessions.length)];

      const mockTranslations = [
        { arabic: 'بسم الله الرحمن الرحيم', english: 'In the name of Allah, the Most Gracious, the Most Merciful' },
        { arabic: 'الحمد لله رب العالمين', english: 'All praise is due to Allah, Lord of all the worlds' },
        { arabic: 'الرحمن الرحيم', english: 'The Most Gracious, the Most Merciful' },
        { arabic: 'مالك يوم الدين', english: 'Master of the Day of Judgment' },
      ];

      const randomTranslation = mockTranslations[Math.floor(Math.random() * mockTranslations.length)];
      const translation = {
        id: Date.now().toString(),
        arabicText: randomTranslation.arabic,
        englishText: randomTranslation.english,
        timestamp: new Date().toISOString(),
        sessionId: randomSession.id,
      };

      randomSession.translations.set(translation.id, translation);
      io.to(randomSession.id).emit('translation_update', translation);
    }
  }, 15000); // Send a translation every 15 seconds for demo
}

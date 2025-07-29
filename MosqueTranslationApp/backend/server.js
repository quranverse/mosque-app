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
const VoiceRecognitionService = require('./services/VoiceRecognitionService');

// Import middleware
const { optionalAuth } = require('./middleware/auth');

// Import models
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: config.security.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  transports: ['websocket', 'polling']
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

// Static file serving for audio recordings
app.use('/api/audio/recordings', express.static(path.join(__dirname, 'audio-recordings')));

// API Routes
const userRoutes = require('./routes/user');
const sessionRoutes = require('./routes/sessions');
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/translation', translationRoutes);

// In-memory storage for development (will be replaced with database)
const activeSessions = new Map();
const connectedClients = new Map();
const mosques = new Map(); // Track mosque status and live broadcasts

// Remove mock data - using real database now

// Function to send broadcast notifications to users following a mosque
async function sendBroadcastNotifications(mosqueId, mosqueName, language) {
  try {
    // Get all users who follow this mosque
    const User = require('./models/User');
    const mongoose = require('mongoose');

    // Convert mosqueId to ObjectId if it's a string
    const mosqueObjectId = typeof mosqueId === 'string' ? new mongoose.Types.ObjectId(mosqueId) : mosqueId;

    const followedMosqueUsers = await User.find({
      'followedMosques.mosqueId': mosqueObjectId,
      'notificationPreferences.liveTranslationAlerts': true
    });

    console.log(`📢 Sending broadcast notifications to ${followedMosqueUsers.length} registered users for mosque ${mosqueName}`);

    // Send notifications to registered users who follow this mosque
    for (const user of followedMosqueUsers) {
      const userSockets = Array.from(connectedClients.entries())
        .filter(([socketId, client]) => client.userId && client.userId.toString() === user._id.toString())
        .map(([socketId]) => socketId);

      userSockets.forEach(socketId => {
        io.to(socketId).emit('mosque_broadcast_notification', {
          type: 'live_broadcast_started',
          mosqueId,
          mosqueName,
          language,
          message: `${mosqueName} has started live translation in ${language}`,
          timestamp: new Date()
        });
      });
    }

    // Also send notifications to ALL connected clients (including anonymous users)
    // This ensures anonymous users who follow mosques locally also get notifications
    const allConnectedClients = Array.from(connectedClients.entries())
      .filter(([socketId, client]) => client.userType !== 'mosque') // Don't notify the broadcasting mosque
      .map(([socketId]) => socketId);

    console.log(`📢 Sending broadcast notifications to ${allConnectedClients.length} total connected clients (including anonymous)`);

    allConnectedClients.forEach(socketId => {
      io.to(socketId).emit('mosque_broadcast_notification', {
        type: 'live_broadcast_started',
        mosqueId,
        mosqueName,
        language,
        message: `🔴 Live Broadcast Started - ${mosqueName} is now broadcasting live with real-time translation`,
        timestamp: new Date()
      });
    });

    return true;
  } catch (error) {
    console.error('Error sending broadcast notifications:', error);
    return false;
  }
}

// Socket.IO connection handling with authentication
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
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
      console.log('🔐 Socket authentication attempt for:', socket.id);
      const { token } = data;

      if (token) {
        console.log('🔑 Token provided, verifying...');
        // Verify JWT token (simplified for socket)
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, config.jwt.secret);
        const User = require('./models/User');
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
          console.log('✅ User authenticated:', user.email, 'Type:', user.userType);
          console.log('🔍 User details:', {
            id: user._id,
            email: user.email,
            userType: user.userType,
            mosqueName: user.mosqueName,
            isActive: user.isActive
          });

          const client = connectedClients.get(socket.id);
          client.isAuthenticated = true;
          client.userId = user._id;
          client.userType = user.userType;
          client.user = user;

          // Initialize mosque entry if this is a mosque user
          if (user.userType === 'mosque') {
            if (!mosques.has(user._id.toString())) {
              mosques.set(user._id.toString(), {
                id: user._id.toString(),
                name: user.mosqueName,
                isLive: false,
                isActive: true,
                currentBroadcast: null,
                currentSession: null
              });
              console.log('🕌 Initialized mosque entry:', user.mosqueName);
            }

            // Check if this mosque has any disconnected live sessions and restore them
            for (const [sessionId, session] of activeSessions.entries()) {
              if (session.mosqueId === user._id.toString() && session.broadcasterDisconnected) {
                console.log(`🔄 Mosque broadcaster reconnected, restoring session ${sessionId}`);
                session.broadcasterDisconnected = false;
                session.disconnectedAt = null;
                client.currentSession = sessionId;
                break;
              }
            }
          }

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

  // Handle voice recognition start
  socket.on('start_voice_recognition', async (data, callback) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.isAuthenticated || client.userType !== 'mosque') {
        callback && callback({ success: false, error: 'Mosque authentication required' });
        return;
      }

      const { sessionId, provider, language, enableRecording, sessionType, recordingTitle } = data;

      // Start voice recognition service with recording
      const result = await VoiceRecognitionService.startVoiceRecognition(sessionId, client.userId, {
        provider,
        language,
        enableRecording: enableRecording !== false, // Default to true
        sessionType: sessionType || 'general',
        recordingTitle: recordingTitle || `Session ${sessionId}`,
        recordingDescription: `Voice recording for session ${sessionId}`,
        onTranscription: async (transcription) => {
          // Save transcription to database
          const savedTranscription = await VoiceRecognitionService.saveTranscription(sessionId, transcription);

          // Send transcription to client
          socket.emit('voice_transcription', {
            ...transcription,
            transcriptionId: savedTranscription?.transcriptionId
          });

          // If final transcription, process for translation
          if (transcription.isFinal && savedTranscription) {
            MultiLanguageTranslationService.processOriginalTranslation(
              sessionId,
              transcription.text,
              'speech',
              {
                provider: transcription.provider,
                confidence: transcription.confidence,
                voiceRecognition: true,
                transcriptionId: savedTranscription.transcriptionId
              }
            );
          }
        },
        onError: (error) => {
          socket.emit('voice_recognition_error', { message: error.message });
        }
      });

      callback && callback(result);

      console.log(`Voice recognition started for session ${sessionId}`);
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  // Handle audio chunk processing and storage
  socket.on('audio_chunk', async (data) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.isAuthenticated || client.userType !== 'mosque') {
        return;
      }

      const { sessionId, audioData, format, mosque_id, isRealAudio } = data;

      if (isRealAudio && audioData) {
        console.log(`📤 Received real audio chunk: ${audioData.length} bytes for session: ${sessionId}`);

        try {
          // Store audio chunk in backend storage
          await VoiceRecognitionService.writeAudioChunk(sessionId, audioData, {
            format,
            mosque_id,
            timestamp: Date.now()
          });
          console.log(`✅ Audio chunk stored successfully`);

          // Process audio chunk through voice recognition service
          await VoiceRecognitionService.processAudioChunk(sessionId, audioData, format);
          console.log(`✅ Audio chunk processed for voice recognition`);

        } catch (chunkError) {
          console.error('❌ Error processing audio chunk:', chunkError);
        }
      } else {
        console.log(`⚠️ Received audio chunk without real audio data - isRealAudio: ${isRealAudio}, audioData length: ${audioData?.length || 0}`);
      }

    } catch (error) {
      console.error('Error processing audio chunk:', error);
      socket.emit('voice_recognition_error', { message: 'Audio processing failed' });
    }
  });

  // Handle audio status updates (separate from audio data)
  socket.on('audio_status', async (data) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.isAuthenticated || client.userType !== 'mosque') {
        return;
      }

      const { sessionId, isRecording, duration } = data;
      console.log(`📊 Audio status - Session: ${sessionId}, Recording: ${isRecording}, Duration: ${duration}ms`);

      // Update session status in database if needed
      // This can be used for monitoring and analytics

    } catch (error) {
      console.error('Error handling audio status:', error);
    }
  });

  // Handle voice recognition stop
  socket.on('stop_voice_recognition', async (data) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.isAuthenticated) {
        return;
      }

      const { sessionId } = data;

      // Stop voice recognition service
      await VoiceRecognitionService.stopVoiceRecognition(sessionId);

      console.log(`Voice recognition stopped for session ${sessionId}`);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  });

  // Handle broadcast start (sets session to live status)
  socket.on('start_broadcast', async (data, callback) => {
    try {
      const client = connectedClients.get(socket.id);

      console.log('🔍 start_broadcast - Client info:', {
        socketId: socket.id,
        hasClient: !!client,
        isAuthenticated: client?.isAuthenticated,
        userType: client?.userType,
        userId: client?.userId,
        mosqueName: client?.user?.mosqueName
      });

      if (!client || !client.isAuthenticated || client.userType !== 'mosque') {
        console.log('❌ start_broadcast authentication failed:', {
          hasClient: !!client,
          isAuthenticated: client?.isAuthenticated,
          userType: client?.userType,
          expectedUserType: 'mosque'
        });
        callback && callback({ success: false, error: 'Mosque authentication required' });
        return;
      }

      const { sessionId, mosqueId, mosqueName, language, enableVoiceRecognition, enableRecording } = data;

      // Update session status to live
      let session = activeSessions.get(sessionId);
      console.log('🔍 Looking for session:', sessionId, 'Found:', !!session);

      if (!session) {
        // Create new session if it doesn't exist
        session = {
          id: sessionId,
          sessionId,
          mosqueId,
          mosqueName,
          languages: [language],
          participants: new Set(),
          startedAt: new Date(),
          isActive: true,
          isLive: false,
          status: 'active',
          mosqueUserId: client.userId,
          broadcaster: client.deviceId || socket.id
        };
        activeSessions.set(sessionId, session);
        console.log('📝 Created new session in activeSessions:', sessionId);
        console.log('📝 activeSessions Map now has', activeSessions.size, 'sessions');
      } else {
        console.log('📝 Using existing session:', sessionId);
      }

      // Update session to live status
      session.isLive = true;
      session.status = 'live';
      session.broadcastStartedAt = new Date();

      // Update broadcast details
      session.broadcastDetails = {
        isVoiceRecognitionActive: enableVoiceRecognition || false,
        isRecordingActive: enableRecording || false,
        currentProvider: 'munsit',
        lastTranscriptionAt: null,
        totalTranscriptions: 0
      };

      // Update mosque status
      const mosque = mosques.get(mosqueId);
      if (mosque) {
        mosque.isLive = true;
        mosque.currentBroadcast = sessionId;
      }

      // Save session to database
      const Session = require('./models/Session');
      await Session.findOneAndUpdate(
        { sessionId },
        {
          status: 'live',
          isLive: true,
          'broadcastDetails.isVoiceRecognitionActive': enableVoiceRecognition || false,
          'broadcastDetails.isRecordingActive': enableRecording || false,
          'broadcastDetails.currentProvider': 'munsit'
        },
        { upsert: true, new: true }
      );

      // Notify all clients about live broadcast
      const broadcastData = {
        sessionId,
        mosqueId,
        mosqueName,
        language,
        startedAt: new Date(),
        isLive: true,
        enableVoiceRecognition,
        enableRecording
      };

      console.log('📡 Broadcasting start event to all connected clients:', broadcastData);
      io.emit('broadcast_started', broadcastData);

      // Send notifications to users following this mosque
      await sendBroadcastNotifications(mosqueId, mosqueName, language);

      callback && callback({ success: true, sessionId, isLive: true });
      console.log(`🔴 Live broadcast started for session ${sessionId} by mosque ${mosqueName}`);

    } catch (error) {
      console.error('Error starting broadcast:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  // Handle broadcast stop (removes live status)
  socket.on('stop_broadcast', async (data, callback) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.isAuthenticated || client.userType !== 'mosque') {
        callback && callback({ success: false, error: 'Mosque authentication required' });
        return;
      }

      const { sessionId, mosqueId, duration, listeners } = data;

      // Update session status
      const session = activeSessions.get(sessionId);
      if (session) {
        session.isLive = false;
        session.status = 'ended';
        session.endedAt = new Date();
        session.duration = duration;
        session.totalListeners = listeners;
      }

      // Update mosque status
      const mosque = mosques.get(mosqueId);
      if (mosque) {
        mosque.isLive = false;
        mosque.currentBroadcast = null;
      }

      // Update session in database
      const Session = require('./models/Session');
      await Session.findOneAndUpdate(
        { sessionId },
        {
          status: 'ended',
          isLive: false,
          endedAt: new Date(),
          duration: duration,
          'stats.totalParticipants': listeners
        }
      );

      // Notify all clients about broadcast end
      io.emit('broadcast_ended', {
        sessionId,
        mosqueId,
        endedAt: new Date(),
        duration,
        listeners
      });

      callback && callback({ success: true });
      console.log(`⏹️ Live broadcast stopped for session ${sessionId}`);

    } catch (error) {
      console.error('Error stopping broadcast:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  // Handle completed audio recording with full audio data
  socket.on('audio_recording_complete', async (data) => {
    try {
      console.log('🎵 Received completed audio recording with data');
      const client = connectedClients.get(socket.id);
      if (!client || !client.isAuthenticated || client.userType !== 'mosque') {
        console.log('❌ Client not authenticated or not mosque type');
        return;
      }

      console.log('🎵 Received completed audio recording with data');

      const { sessionId, audioData, provider, mosque_id, format, fileName, duration } = data;

      if (audioData && audioData.length > 0) {
        console.log(`📁 Saving complete audio file: ${audioData.length} bytes for session: ${sessionId}`);
        console.log('🔍 Audio data type:', typeof audioData, 'Is array:', Array.isArray(audioData));

        try {
          // Get the authenticated user's information
          const client = connectedClients.get(socket.id);
          const User = require('./models/User');
          const user = await User.findById(client.userId);

          if (!user) {
            console.error('❌ User not found for audio recording');
            return;
          }

          console.log('🔍 User data for mosque name:', {
            name: user.name,
            mosqueName: user.mosqueName,
            organizationName: user.organizationName,
            email: user.email
          });

          // Extract mosque name from user data
          const mosqueName = user.mosqueName || user.organizationName || user.name || `Mosque_${user.email}` || 'Unknown Mosque';
          console.log('📝 Using mosque name:', mosqueName);

          // Save the complete audio file to backend storage
          const recording = await VoiceRecognitionService.saveCompleteAudioFile(sessionId, {
            audioBuffer: audioData,
            mosqueId: user._id,           // Use the actual user's ObjectId
            mosqueName: mosqueName,
            provider,
            format: format || 'm4a',
            fileName: fileName || `recording_${sessionId}_${Date.now()}.m4a`,
            duration: duration || 0,
            audioSessionId: null,         // We'll create this if needed
            deviceInfo: {
              platform: 'react-native',
              socketId: socket.id
            }
          });

          // Notify the client that recording was saved
          socket.emit('audio_recording_saved', {
            recordingId: recording.recordingId,
            fileName: recording.fileName,
            filePath: recording.filePath,
            status: 'saved',
            size: audioData.length
          });

          console.log('✅ Complete audio file saved to backend:', recording.recordingId);
          console.log(`📁 File location: ${recording.filePath}`);
          console.log(`📊 File size: ${audioData.length} bytes`);

        } catch (saveError) {
          console.error('❌ Error saving complete audio file:', saveError);
          socket.emit('audio_recording_error', {
            message: 'Failed to save audio file',
            error: saveError.message
          });
        }

      } else {
        console.log('⚠️ No audio data received in completion event');
        console.log(`📊 audioData: ${audioData ? 'exists' : 'null'}, length: ${audioData?.length || 0}`);
      }

    } catch (error) {
      console.error('❌ Error handling audio recording completion:', error);
      socket.emit('voice_recognition_error', {
        message: 'Failed to save audio recording',
        error: error.message
      });
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

          // If broadcaster disconnects, give them time to reconnect (for mosque broadcasts)
          if (client.deviceId === session.broadcaster) {
            if (client.userType === 'mosque' && session.isLive) {
              // For live mosque broadcasts, don't immediately end session
              // Mark as temporarily disconnected and give 30 seconds to reconnect
              session.broadcasterDisconnected = true;
              session.disconnectedAt = new Date();

              console.log(`⚠️ Mosque broadcaster temporarily disconnected for session ${client.currentSession}, waiting for reconnection...`);

              // Set a timeout to end the session if broadcaster doesn't reconnect
              setTimeout(() => {
                const currentSession = activeSessions.get(client.currentSession);
                if (currentSession && currentSession.broadcasterDisconnected) {
                  console.log(`❌ Mosque broadcaster did not reconnect, ending session ${client.currentSession}`);
                  io.to(client.currentSession).emit('session_ended', {
                    sessionId: client.currentSession,
                    endedAt: new Date(),
                    reason: 'Broadcaster disconnected',
                  });
                  activeSessions.delete(client.currentSession);
                }
              }, 30000); // 30 seconds grace period
            } else {
              // For non-mosque sessions, end immediately
              io.to(client.currentSession).emit('session_ended', {
                sessionId: client.currentSession,
                endedAt: new Date(),
                reason: 'Broadcaster disconnected',
              });
              activeSessions.delete(client.currentSession);
            }
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

    // Query actual mosques from database
    const mosques = await User.find({
      userType: 'mosque',
      isActive: true
    }).select('-password -emailVerificationToken -__v');

    // Format mosque data for API response
    const mosquesArray = mosques.map(mosque => {
      // Calculate distance if coordinates provided
      let distance = 0;
      let mosqueCoords = null;

      if (mosque.location && mosque.location.coordinates) {
        // Handle both [lng, lat] and [lat, lng] formats
        const coords = mosque.location.coordinates;
        if (coords.length >= 2 && coords[0] !== 0 && coords[1] !== 0) {
          // Assume [lng, lat] format (GeoJSON standard)
          mosqueCoords = { lng: coords[0], lat: coords[1] };
        }
      }

      if (lat && lng && mosqueCoords) {
        distance = calculateDistance(lat, lng, mosqueCoords.lat, mosqueCoords.lng);
      }

      return {
        id: mosque._id.toString(),
        name: mosque.mosqueName,
        address: mosque.mosqueAddress,
        location: mosqueCoords || { lat: 0, lng: 0 },
        phone: mosque.phone,
        website: mosque.website,
        imam: mosque.imam || 'Not specified',
        madhab: mosque.madhab || 'Sunni',
        servicesOffered: mosque.servicesOffered || [],
        languagesSupported: mosque.languagesSupported || ['Arabic'],
        capacity: mosque.capacity,
        facilities: mosque.facilities || [],
        photos: mosque.photos || {},
        followers: mosque.analytics?.totalFollowers || 0,
        hasLiveTranslation: mosque.servicesOffered?.includes('Live Translation') || false,
        distance: distance,
        distanceFormatted: distance ? `${distance.toFixed(1)} km` : 'Unknown distance',
        hasAccount: true,
        isFollowed: req.user?.userType === 'individual' && req.user?.followedMosques?.some(f => f.mosqueId.toString() === mosque._id.toString())
      };
    });

    // Filter by distance if coordinates provided
    let filteredMosques = mosquesArray;
    if (lat && lng) {
      filteredMosques = mosquesArray
        .filter(mosque => mosque.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);
    }

    res.json(filteredMosques);
  } catch (error) {
    console.error('Error fetching mosques from database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mosques'
    });
  }
});

// Search mosques endpoint
app.get('/api/mosques/search', optionalAuth, async (req, res) => {
  try {
    const { q, lat, lng, radius = 50 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Query actual mosques from database
    const searchTerm = q.toLowerCase();
    const mosques = await User.find({
      userType: 'mosque',
      isActive: true,
      $or: [
        { mosqueName: { $regex: searchTerm, $options: 'i' } },
        { mosqueAddress: { $regex: searchTerm, $options: 'i' } },
        { imam: { $regex: searchTerm, $options: 'i' } },
        { languagesSupported: { $in: [new RegExp(searchTerm, 'i')] } },
        { servicesOffered: { $in: [new RegExp(searchTerm, 'i')] } }
      ]
    }).select('-password -emailVerificationToken -__v');

    // Format mosque data for API response
    let searchResults = mosques.map(mosque => {
      // Calculate distance if coordinates provided
      let distance = 0;
      let mosqueCoords = null;

      if (mosque.location && mosque.location.coordinates) {
        // Handle both [lng, lat] and [lat, lng] formats
        const coords = mosque.location.coordinates;
        if (coords.length >= 2 && coords[0] !== 0 && coords[1] !== 0) {
          // Assume [lng, lat] format (GeoJSON standard)
          mosqueCoords = { lng: coords[0], lat: coords[1] };
        }
      }

      if (lat && lng && mosqueCoords) {
        distance = calculateDistance(lat, lng, mosqueCoords.lat, mosqueCoords.lng);
      }

      return {
        id: mosque._id.toString(),
        name: mosque.mosqueName,
        address: mosque.mosqueAddress,
        location: mosqueCoords || { lat: 0, lng: 0 },
        phone: mosque.phone,
        website: mosque.website,
        imam: mosque.imam || 'Not specified',
        madhab: mosque.madhab || 'Sunni',
        servicesOffered: mosque.servicesOffered || [],
        languagesSupported: mosque.languagesSupported || ['Arabic'],
        capacity: mosque.capacity,
        facilities: mosque.facilities || [],
        photos: mosque.photos || {},
        followers: mosque.analytics?.totalFollowers || 0,
        hasLiveTranslation: mosque.servicesOffered?.includes('Live Translation') || false,
        distance: distance,
        distanceFormatted: distance ? `${distance.toFixed(1)} km` : 'Unknown distance',
        hasAccount: true,
        isFollowed: req.user?.userType === 'individual' && req.user?.followedMosques?.some(f => f.mosqueId.toString() === mosque._id.toString())
      };
    });

    // Filter by distance if coordinates provided
    if (lat && lng) {
      searchResults = searchResults
        .filter(mosque => mosque.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);
    }

    res.json(searchResults);
  } catch (error) {
    console.error('Error searching mosques:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search mosques'
    });
  }
});

// Get mosque by ID endpoint
app.get('/api/mosques/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Query mosque from database
    const mosque = await User.findOne({
      _id: id,
      userType: 'mosque',
      isActive: true
    }).select('-password -emailVerificationToken -__v');

    if (!mosque) {
      return res.status(404).json({
        success: false,
        message: 'Mosque not found'
      });
    }

    // Format mosque data for API response
    let mosqueCoords = null;
    if (mosque.location && mosque.location.coordinates) {
      const coords = mosque.location.coordinates;
      if (coords.length >= 2 && coords[0] !== 0 && coords[1] !== 0) {
        mosqueCoords = { lng: coords[0], lat: coords[1] };
      }
    }

    const formattedMosque = {
      id: mosque._id.toString(),
      name: mosque.mosqueName,
      address: mosque.mosqueAddress,
      location: mosqueCoords || { lat: 0, lng: 0 },
      phone: mosque.phone,
      website: mosque.website,
      imam: mosque.imam || 'Not specified',
      madhab: mosque.madhab || 'Sunni',
      servicesOffered: mosque.servicesOffered || [],
      languagesSupported: mosque.languagesSupported || ['Arabic'],
      capacity: mosque.capacity,
      facilities: mosque.facilities || [],
      photos: mosque.photos || {},
      followers: mosque.analytics?.totalFollowers || 0,
      hasLiveTranslation: mosque.servicesOffered?.includes('Live Translation') || false,
      distance: 0,
      distanceFormatted: 'Unknown distance',
      hasAccount: true,
      isFollowed: req.user?.userType === 'individual' && req.user?.followedMosques?.some(f => f.mosqueId.toString() === mosque._id.toString())
    };

    res.json(formattedMosque);
  } catch (error) {
    console.error('Error fetching mosque by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mosque'
    });
  }
});

// Get data for multiple mosques by IDs (for followed mosques)
app.post('/api/mosques/by-ids', async (req, res) => {
  try {
    const { mosqueIds } = req.body;

    if (!Array.isArray(mosqueIds) || mosqueIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'mosqueIds array is required'
      });
    }

    // Limit to prevent abuse
    if (mosqueIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 mosque IDs allowed'
      });
    }

    // Query mosques from database
    const mosques = await User.find({
      _id: { $in: mosqueIds },
      userType: 'mosque',
      isActive: true
    }).select('-password -emailVerificationToken -__v');

    // Format mosque data for API response
    const mosquesArray = mosques.map(mosque => {
      return {
        id: mosque._id.toString(),
        name: mosque.mosqueName,
        address: mosque.mosqueAddress,
        phone: mosque.phone,
        website: mosque.website,
        imam: mosque.imam,
        madhab: mosque.madhab,
        servicesOffered: mosque.servicesOffered || [],
        languagesSupported: mosque.languagesSupported || ['Arabic'],
        capacity: mosque.capacity,
        facilities: mosque.facilities || [],
        followers: mosque.analytics?.totalFollowers || 0,
        hasLiveTranslation: mosque.servicesOffered?.includes('Live Translation') || false,
        distance: 0, // Will be calculated on frontend if needed
        distanceFormatted: 'Unknown distance',
        hasAccount: true,
        isFollowed: true, // All requested mosques are followed
        location: mosque.location
      };
    });

    res.json({
      success: true,
      mosques: mosquesArray,
      total: mosquesArray.length
    });

  } catch (error) {
    console.error('Error fetching mosques by IDs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mosque data'
    });
  }
});

// Helper function to calculate distance between two points

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
  console.log('📊 /api/sessions/active called');
  console.log('📊 activeSessions Map size:', activeSessions.size);
  console.log('📊 activeSessions keys:', Array.from(activeSessions.keys()));

  const activeSessonsArray = Array.from(activeSessions.values()).map(session => {
    const mosque = mosques.get(session.mosqueId);
    console.log('📊 Processing session:', {
      id: session.id,
      mosqueId: session.mosqueId,
      isLive: session.isLive,
      status: session.status,
      mosqueName: mosque ? mosque.name : 'Unknown Mosque'
    });

    return {
      id: session.id,
      mosqueId: session.mosqueId,
      mosqueName: mosque ? mosque.name : 'Unknown Mosque',
      languages: session.languages,
      participantCount: session.participants.size,
      startedAt: session.startedAt,
      isActive: session.isActive,
      isLive: session.isLive,
      status: session.status,
      hasAuth: !!session.mosqueUserId
    };
  });

  console.log('📊 Returning active sessions:', activeSessonsArray.length);
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

    // Run automatic database migrations
    console.log('🔄 Running automatic database migrations...');
    try {
      const migrationService = require('./services/MigrationService');
      await migrationService.autoRunMigrations();
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Database migrations failed:', error);
      // Continue startup even if migrations fail
    }

    // Start server
    const PORT = config.port;
    const HOST = '0.0.0.0'; // Listen on all network interfaces
    server.listen(PORT, HOST, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
      console.log(`🌐 REST API endpoint: http://localhost:${PORT}/api`);
      console.log(`🌐 Network accessible: http://0.0.0.0:${PORT}/api`);
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
      const sessions = Array.from(activeSessions.values()).filter(session => session.isLive);
      if (sessions.length > 0) {
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

        // Initialize translations Map if it doesn't exist
        if (!randomSession.translations) {
          randomSession.translations = new Map();
        }

        randomSession.translations.set(translation.id, translation);
        io.to(randomSession.id).emit('translation_update', translation);
        console.log('📝 Demo translation sent for session:', randomSession.id);
      }
    }
  }, 15000); // Send a translation every 15 seconds for demo
}

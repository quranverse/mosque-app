// Mock Translation Server for Development
// This simulates the backend server for live translation

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage for development
const activeSessions = new Map();
const mosques = new Map();
const connectedClients = new Map();

// Mock mosque data
const mockMosques = [
  {
    id: 'mosque1',
    name: 'Central Mosque',
    location: { lat: 40.7128, lng: -74.0060 },
    address: '123 Main Street, New York, NY',
    isActive: false,
    followers: 150,
  },
  {
    id: 'mosque2',
    name: 'Masjid Al-Noor',
    location: { lat: 40.7589, lng: -73.9851 },
    address: '456 Oak Avenue, New York, NY',
    isActive: false,
    followers: 203,
  },
];

// Initialize mock mosques
mockMosques.forEach(mosque => {
  mosques.set(mosque.id, mosque);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  connectedClients.set(socket.id, {
    id: socket.id,
    connectedAt: new Date(),
    currentSession: null,
  });

  // Handle joining a translation session
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
      client.userType = userType;
      
      // Update session participants
      session.participants.set(socket.id, {
        deviceId,
        userType,
        joinedAt: new Date(),
      });

      // Notify other participants
      socket.to(sessionId).emit('participant_joined', {
        deviceId,
        userType,
        participantCount: session.participants.size,
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

  // Handle starting a new translation session
  socket.on('start_session', (data, callback) => {
    const { mosqueId, deviceId, languages, userType } = data;
    
    try {
      const mosque = mosques.get(mosqueId);
      if (!mosque) {
        callback({ success: false, error: 'Mosque not found' });
        return;
      }

      const sessionId = `session_${mosqueId}_${Date.now()}`;
      const session = {
        id: sessionId,
        mosqueId,
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
        joinedAt: new Date(),
      });

      // Update client info
      const client = connectedClients.get(socket.id);
      client.currentSession = sessionId;
      client.deviceId = deviceId;
      client.userType = userType;

      // Notify all clients about new session
      io.emit('session_started', {
        sessionId,
        mosqueId,
        mosqueName: mosque.name,
        languages,
        startedAt: session.startedAt,
      });

      callback({ success: true, sessionId });
      console.log(`Session ${sessionId} started for mosque ${mosqueId}`);
    } catch (error) {
      console.error('Error starting session:', error);
      callback({ success: false, error: 'Failed to start session' });
    }
  });

  // Handle ending a session
  socket.on('end_session', (data) => {
    const { sessionId } = data;
    
    try {
      const session = activeSessions.get(sessionId);
      if (session) {
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
        console.log(`Session ${sessionId} ended`);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  });

  // Handle sending translation
  socket.on('send_translation', (translation) => {
    try {
      const client = connectedClients.get(socket.id);
      if (!client || !client.currentSession) {
        return;
      }

      const session = activeSessions.get(client.currentSession);
      if (!session || session.broadcaster !== client.deviceId) {
        return;
      }

      // Store translation
      session.translations.set(translation.id, translation);

      // Broadcast to all participants
      io.to(client.currentSession).emit('translation_update', translation);

      console.log(`Translation sent in session ${client.currentSession}`);
    } catch (error) {
      console.error('Error sending translation:', error);
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

// REST API endpoints
app.get('/api/mosques', (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  
  // Return all mosques for now (in real app, filter by location)
  const mosquesArray = Array.from(mosques.values()).map(mosque => ({
    ...mosque,
    distance: Math.random() * 5, // Mock distance
    hasLiveTranslation: mosque.isActive,
  }));
  
  res.json(mosquesArray);
});

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
    };
  });
  
  res.json(activeSessonsArray);
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    connectedClients: connectedClients.size,
    activeSessions: activeSessions.size,
    registeredMosques: mosques.size,
    uptime: process.uptime(),
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Mock Translation Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`REST API endpoint: http://localhost:${PORT}/api`);
});

// Simulate some translation activity for demo
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
}, 10000); // Send a translation every 10 seconds for demo

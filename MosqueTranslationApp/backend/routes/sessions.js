// Session routes for Mosque Translation App
const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// In-memory storage for active sessions (in production, use Redis or database)
const activeSessions = new Map();

// GET /api/sessions/active - Get active translation sessions
router.get('/active', optionalAuth, async (req, res) => {
  try {
    // Convert Map to Array for JSON response
    const sessions = Array.from(activeSessions.values()).map(session => ({
      sessionId: session.sessionId,
      mosqueName: session.mosqueName,
      mosqueId: session.mosqueId,
      language: session.language,
      isLive: session.isActive,
      participantCount: session.participants ? session.participants.size : 0,
      startedAt: session.startedAt,
      broadcaster: session.broadcaster,
      status: session.status || 'active'
    }));

    // If user is authenticated, mark sessions from followed mosques
    if (req.user && req.user.followedMosques) {
      const followedMosqueIds = req.user.followedMosques.map(fm => fm.mosqueId.toString());
      sessions.forEach(session => {
        session.isFromFollowedMosque = followedMosqueIds.includes(session.mosqueId);
      });
    }

    res.json({
      success: true,
      sessions: sessions,
      totalActive: sessions.length
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active sessions'
    });
  }
});

// POST /api/sessions - Create a new translation session (mosque only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Only mosque accounts can create sessions
    if (req.user.userType !== 'mosque') {
      return res.status(403).json({
        success: false,
        message: 'Only mosque accounts can create translation sessions'
      });
    }

    const { language = 'Arabic', title, description } = req.body;
    
    // Check if mosque already has an active session
    const existingSession = Array.from(activeSessions.values()).find(
      session => session.mosqueId === req.user._id.toString() && session.isActive
    );

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'Mosque already has an active session',
        existingSession: {
          sessionId: existingSession.sessionId,
          startedAt: existingSession.startedAt
        }
      });
    }

    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSession = {
      sessionId,
      mosqueId: req.user._id.toString(),
      mosqueName: req.user.mosqueName,
      language,
      title: title || `Live Translation - ${req.user.mosqueName}`,
      description: description || 'Live translation session',
      isActive: true,
      startedAt: new Date(),
      participants: new Set(),
      broadcaster: null,
      status: 'waiting_for_broadcaster'
    };

    activeSessions.set(sessionId, newSession);

    res.status(201).json({
      success: true,
      message: 'Translation session created successfully',
      session: {
        sessionId: newSession.sessionId,
        mosqueName: newSession.mosqueName,
        language: newSession.language,
        title: newSession.title,
        startedAt: newSession.startedAt,
        status: newSession.status
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create translation session'
    });
  }
});

// GET /api/sessions/:id - Get session details
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const session = activeSessions.get(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sessionData = {
      sessionId: session.sessionId,
      mosqueName: session.mosqueName,
      mosqueId: session.mosqueId,
      language: session.language,
      title: session.title,
      description: session.description,
      isLive: session.isActive,
      participantCount: session.participants ? session.participants.size : 0,
      startedAt: session.startedAt,
      status: session.status
    };

    // Add user-specific data if authenticated
    if (req.user) {
      sessionData.canBroadcast = req.user._id.toString() === session.mosqueId;
      sessionData.isParticipant = session.participants ? session.participants.has(req.user._id.toString()) : false;
    }

    res.json({
      success: true,
      session: sessionData
    });
  } catch (error) {
    console.error('Get session details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session details'
    });
  }
});

// POST /api/sessions/:id/join - Join a translation session
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const session = activeSessions.get(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (!session.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Session is not active'
      });
    }

    // Add user to participants
    if (!session.participants) {
      session.participants = new Set();
    }
    session.participants.add(req.user._id.toString());

    res.json({
      success: true,
      message: 'Joined session successfully',
      session: {
        sessionId: session.sessionId,
        mosqueName: session.mosqueName,
        participantCount: session.participants.size
      }
    });
  } catch (error) {
    console.error('Join session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join session'
    });
  }
});

// POST /api/sessions/:id/leave - Leave a translation session
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const session = activeSessions.get(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Remove user from participants
    if (session.participants) {
      session.participants.delete(req.user._id.toString());
    }

    res.json({
      success: true,
      message: 'Left session successfully',
      session: {
        sessionId: session.sessionId,
        participantCount: session.participants ? session.participants.size : 0
      }
    });
  } catch (error) {
    console.error('Leave session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave session'
    });
  }
});

// DELETE /api/sessions/:id - End a translation session (mosque only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const session = activeSessions.get(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Only the mosque that created the session can end it
    if (req.user._id.toString() !== session.mosqueId) {
      return res.status(403).json({
        success: false,
        message: 'Only the mosque that created this session can end it'
      });
    }

    // Mark session as inactive
    session.isActive = false;
    session.endedAt = new Date();
    session.status = 'ended';

    // Remove from active sessions after a delay (keep for history)
    setTimeout(() => {
      activeSessions.delete(id);
    }, 60000); // Keep for 1 minute for cleanup

    res.json({
      success: true,
      message: 'Session ended successfully',
      session: {
        sessionId: session.sessionId,
        endedAt: session.endedAt
      }
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session'
    });
  }
});

// Export the activeSessions for use in WebSocket handlers
router.activeSessions = activeSessions;

module.exports = router;

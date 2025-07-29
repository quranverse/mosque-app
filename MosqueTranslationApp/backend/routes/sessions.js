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

// GET /api/sessions/history/:mosqueId - Get previous sessions for a mosque with filtering
router.get('/history/:mosqueId', optionalAuth, async (req, res) => {
  try {
    const { mosqueId } = req.params;
    const {
      limit = 50,
      offset = 0,
      type = 'all',
      timeFilter = 'all',
      startDate,
      endDate
    } = req.query;

    // Import models
    const Session = require('../models/Session');
    const AudioSession = require('../models/AudioSession');
    const AudioRecording = require('../models/AudioRecording');

    // Build query filters
    let sessionQuery = {
      mosqueId: mosqueId,
      status: 'ended'
    };

    // Add type filter
    if (type !== 'all') {
      sessionQuery['metadata.sessionType'] = type;
    }

    // Add time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let dateFilter = {};

      switch (timeFilter) {
        case 'today':
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          dateFilter = { $gte: startOfDay };
          break;
        case 'week':
          const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { $gte: startOfWeek };
          break;
        case 'month':
          const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter = { $gte: startOfMonth };
          break;
      }

      if (Object.keys(dateFilter).length > 0) {
        sessionQuery.endedAt = dateFilter;
      }
    }

    // Add custom date range filter
    if (startDate || endDate) {
      sessionQuery.endedAt = {};
      if (startDate) sessionQuery.endedAt.$gte = new Date(startDate);
      if (endDate) sessionQuery.endedAt.$lte = new Date(endDate);
    }

    // Get previous sessions from database
    const sessions = await Session.find(sessionQuery)
      .populate('mosqueId', 'mosqueName imam')
      .sort({ endedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Get audio recordings for these sessions
    const sessionIds = sessions.map(s => s.sessionId);
    const audioRecordings = await AudioRecording.find({
      sessionId: { $in: sessionIds }
    });

    // Create a map of session to audio recordings
    const audioMap = new Map();
    audioRecordings.forEach(recording => {
      if (!audioMap.has(recording.sessionId)) {
        audioMap.set(recording.sessionId, []);
      }
      audioMap.get(recording.sessionId).push(recording);
    });

    // Format response with enhanced data
    const formattedSessions = sessions.map(session => {
      const recordings = audioMap.get(session.sessionId) || [];
      const mainRecording = recordings.find(r => r.recordingType === 'session') || recordings[0];
      const sessionType = session.metadata?.sessionType || 'general';

      return {
        id: session.sessionId,
        title: session.title || generateSessionTitle(sessionType, session.mosqueName || session.mosqueId?.mosqueName),
        date: session.endedAt || session.startedAt,
        duration: session.duration ? session.duration * 1000 : (Math.random() * 3600 + 900) * 1000, // 15-75 minutes if not set
        language: session.sourceLanguage || 'Arabic',
        imam: session.mosqueId?.imam || 'Imam',
        audioUrl: mainRecording ? `/api/audio/recordings/${mainRecording.fileName}` : null,
        transcription: generateMockTranscription(sessionType),
        translations: generateMockTranslations(sessionType),
        participantCount: session.stats?.maxConcurrentParticipants || Math.floor(Math.random() * 100) + 10,
        type: sessionType,
        hasAudio: recordings.length > 0,
        recordingCount: recordings.length
      };
    });

    res.json({
      success: true,
      sessions: formattedSessions,
      total: formattedSessions.length,
      hasMore: formattedSessions.length === parseInt(limit),
      filters: {
        type,
        timeFilter,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Get session history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session history'
    });
  }
});

// Helper functions for generating mock data
function generateSessionTitle(type, mosqueName) {
  const titles = {
    friday_prayer: ['Friday Prayer - Surah Al-Fatiha', 'Jummah Khutbah - Patience in Islam', 'Friday Sermon - Unity of Ummah'],
    lecture: ['Islamic Ethics in Daily Life', 'The Importance of Prayer', 'Understanding Quran', 'Islamic History Lesson'],
    quran_recitation: ['Surah Al-Baqarah Recitation', 'Surah Yasin Complete', 'Surah Al-Mulk Evening Recitation'],
    dua: ['Evening Duas and Supplications', 'Morning Adhkar Session', 'Dua for Guidance'],
    islamic_course: ['Arabic Language Course - Week 1', 'Fiqh Fundamentals - Week 2', 'Hadith Studies - Week 3']
  };

  const typeTitle = titles[type] || titles.lecture;
  const randomTitle = typeTitle[Math.floor(Math.random() * typeTitle.length)];
  return `${randomTitle} - ${mosqueName}`;
}

function generateMockTranscription(type) {
  const transcriptions = {
    friday_prayer: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ. الحمد لله رب العالمين. الرحمن الرحيم. مالك يوم الدين...',
    lecture: 'الحمد لله رب العالمين، والصلاة والسلام على أشرف المرسلين، سيدنا محمد وعلى آله وصحبه أجمعين...',
    quran_recitation: 'الم ذَلِكَ الْكِتَابُ لاَ رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ...',
    dua: 'اللهم أعني على ذكرك وشكرك وحسن عبادتك. ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة...',
    islamic_course: 'في هذا الدرس سنتعلم أساسيات اللغة العربية والقواعد النحوية المهمة للفهم الصحيح...'
  };
  return transcriptions[type] || transcriptions.lecture;
}

function generateMockTranslations(type) {
  const translations = {
    friday_prayer: {
      english: 'In the name of Allah, the Most Gracious, the Most Merciful. Praise be to Allah, Lord of the worlds...',
      urdu: 'اللہ کے نام سے جو بہت مہربان، نہایت رحم والا ہے۔ تمام تعریفیں اللہ کے لیے ہیں...'
    },
    lecture: {
      english: 'Praise be to Allah, Lord of the worlds, and peace and blessings upon the most noble of messengers...',
      urdu: 'تمام تعریفیں اللہ کے لیے ہیں، اور درود و سلام ہو سب سے بہترین رسول پر...'
    },
    quran_recitation: {
      english: 'Alif-Lam-Mim. This is the Book about which there is no doubt, a guidance for those conscious of Allah...',
      urdu: 'الم۔ یہ وہ کتاب ہے جس میں کوئی شک نہیں، یہ ہدایت ہے پرہیزگاروں کے لیے...'
    }
  };
  return translations[type] || translations.lecture;
}

// GET /api/sessions/recordings/:sessionId - Get audio recordings for a specific session
router.get('/recordings/:sessionId', optionalAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const AudioRecording = require('../models/AudioRecording');

    const recordings = await AudioRecording.find({
      sessionId: sessionId
    }).sort({ createdAt: 1 });

    const formattedRecordings = recordings.map(recording => ({
      id: recording._id,
      fileName: recording.fileName,
      duration: recording.duration || 0,
      fileSize: recording.fileSize || 0,
      audioUrl: `/api/audio/recordings/${recording.fileName}`,
      recordingType: recording.recordingType || 'session',
      createdAt: recording.createdAt
    }));

    res.json({
      success: true,
      recordings: formattedRecordings
    });

  } catch (error) {
    console.error('Get session recordings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session recordings'
    });
  }
});

// Export the activeSessions for use in WebSocket handlers
router.activeSessions = activeSessions;

module.exports = router;

// Translation Session model for Mosque Translation App
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  // Session Identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Mosque Information
  mosqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  mosqueName: {
    type: String,
    required: true
  },
  
  // Session Details
  title: {
    type: String,
    default: 'Live Translation Session'
  },
  description: String,
  
  // Languages
  sourceLanguage: {
    type: String,
    default: 'Arabic'
  },
  targetLanguages: [{
    type: String,
    required: true
  }],
  
  // Session Status
  status: {
    type: String,
    enum: ['active', 'live', 'paused', 'ended'],
    default: 'active',
    index: true
  },

  // Live Broadcasting Status
  isLive: {
    type: Boolean,
    default: false,
    index: true
  },

  // Broadcasting Details
  broadcastDetails: {
    isVoiceRecognitionActive: {
      type: Boolean,
      default: false
    },
    isRecordingActive: {
      type: Boolean,
      default: false
    },
    currentProvider: {
      type: String,
      enum: ['munsit', 'google', 'azure', 'whisper', 'assemblyai', 'aws'],
      default: 'munsit'
    },
    lastTranscriptionAt: Date,
    totalTranscriptions: {
      type: Number,
      default: 0
    }
  },
  
  // Timing
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  endedAt: Date,
  duration: Number, // in seconds
  
  // Participants
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deviceId: String,
    userType: {
      type: String,
      enum: ['mosque', 'individual', 'anonymous']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Session Statistics
  stats: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    maxConcurrentParticipants: {
      type: Number,
      default: 0
    },
    totalTranslations: {
      type: Number,
      default: 0
    },
    averageParticipants: Number
  },
  
  // Session Configuration
  settings: {
    autoTranslate: {
      type: Boolean,
      default: false
    },
    allowAnonymous: {
      type: Boolean,
      default: true
    },
    maxParticipants: {
      type: Number,
      default: 1000
    },
    recordSession: {
      type: Boolean,
      default: false
    }
  },
  
  // Session Type
  sessionType: {
    type: String,
    enum: ['friday_prayer', 'daily_prayer', 'lecture', 'quran_recitation', 'general'],
    default: 'general'
  },
  
  // Quality Metrics
  quality: {
    translationAccuracy: Number, // 1-5 rating
    audioQuality: Number, // 1-5 rating
    userSatisfaction: Number, // 1-5 rating
    technicalIssues: [{
      issue: String,
      timestamp: Date,
      resolved: Boolean
    }]
  },
  
  // Metadata
  metadata: {
    deviceInfo: String,
    appVersion: String,
    connectionType: String,
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number] // [longitude, latitude]
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
sessionSchema.index({ mosqueId: 1, startedAt: -1 });
sessionSchema.index({ status: 1, startedAt: -1 });
sessionSchema.index({ sessionType: 1, startedAt: -1 });
sessionSchema.index({ 'participants.userId': 1 });
sessionSchema.index({ createdAt: -1 });

// Virtual for active participants count
sessionSchema.virtual('activeParticipantsCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Virtual for session duration in minutes
sessionSchema.virtual('durationMinutes').get(function() {
  if (this.duration) {
    return Math.round(this.duration / 60);
  }
  if (this.endedAt && this.startedAt) {
    return Math.round((this.endedAt - this.startedAt) / (1000 * 60));
  }
  return Math.round((new Date() - this.startedAt) / (1000 * 60));
});

// Pre-save middleware to update timestamps and calculate duration
sessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate duration if session is ended
  if (this.status === 'ended' && this.endedAt && !this.duration) {
    this.duration = Math.round((this.endedAt - this.startedAt) / 1000);
  }
  
  // Update participant statistics
  this.stats.totalParticipants = this.participants.length;
  this.stats.maxConcurrentParticipants = Math.max(
    this.stats.maxConcurrentParticipants || 0,
    this.activeParticipantsCount
  );
  
  next();
});

// Instance method to add participant
sessionSchema.methods.addParticipant = function(participantData) {
  // Check if participant already exists
  const existingParticipant = this.participants.find(
    p => p.userId && p.userId.toString() === participantData.userId?.toString()
  );
  
  if (existingParticipant) {
    existingParticipant.isActive = true;
    existingParticipant.leftAt = undefined;
    return existingParticipant;
  }
  
  // Add new participant
  const participant = {
    userId: participantData.userId,
    deviceId: participantData.deviceId,
    userType: participantData.userType || 'anonymous',
    joinedAt: new Date(),
    isActive: true
  };
  
  this.participants.push(participant);
  return participant;
};

// Instance method to remove participant
sessionSchema.methods.removeParticipant = function(userId, deviceId) {
  const participant = this.participants.find(
    p => (p.userId && p.userId.toString() === userId?.toString()) || 
         (p.deviceId === deviceId)
  );
  
  if (participant) {
    participant.isActive = false;
    participant.leftAt = new Date();
  }
  
  return participant;
};

// Instance method to end session
sessionSchema.methods.endSession = function() {
  this.status = 'ended';
  this.endedAt = new Date();
  this.duration = Math.round((this.endedAt - this.startedAt) / 1000);
  
  // Mark all participants as inactive
  this.participants.forEach(participant => {
    if (participant.isActive) {
      participant.isActive = false;
      participant.leftAt = this.endedAt;
    }
  });
};

// Static method to find active sessions for a mosque
sessionSchema.statics.findActiveSessions = function(mosqueId) {
  return this.find({
    mosqueId,
    status: 'active'
  }).populate('mosqueId', 'mosqueName mosqueAddress');
};

// Static method to get session statistics
sessionSchema.statics.getSessionStats = function(mosqueId, startDate, endDate) {
  const matchQuery = { mosqueId };
  
  if (startDate || endDate) {
    matchQuery.startedAt = {};
    if (startDate) matchQuery.startedAt.$gte = startDate;
    if (endDate) matchQuery.startedAt.$lte = endDate;
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalParticipants: { $sum: '$stats.totalParticipants' },
        totalTranslations: { $sum: '$stats.totalTranslations' },
        averageDuration: { $avg: '$duration' },
        averageParticipants: { $avg: '$stats.totalParticipants' }
      }
    }
  ]);
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;

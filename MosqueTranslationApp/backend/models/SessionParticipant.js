// SessionParticipant Model for Mosque Translation App
const mongoose = require('mongoose');

const sessionParticipantSchema = new mongoose.Schema({
  // Participant Identification
  participantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Session Reference
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  audioSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AudioSession',
    required: true,
    index: true
  },
  
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for anonymous users
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  
  // User Type
  userType: {
    type: String,
    enum: ['mosque_admin', 'individual', 'anonymous', 'translator'],
    default: 'anonymous',
    index: true
  },
  
  // Language Preferences
  preferredLanguage: {
    type: String,
    required: true,
    index: true
  },
  secondaryLanguage: {
    type: String,
    default: null
  },
  
  // Session Participation
  joinedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  leftAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Duration Tracking
  totalDurationSeconds: {
    type: Number,
    default: 0
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  
  // Connection Information
  connectionInfo: {
    ipAddress: String,
    userAgent: String,
    platform: {
      type: String,
      enum: ['web', 'ios', 'android', 'desktop'],
      default: 'web'
    },
    appVersion: String,
    connectionType: {
      type: String,
      enum: ['wifi', 'cellular', 'ethernet', 'unknown'],
      default: 'unknown'
    }
  },
  
  // User Preferences
  preferences: {
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'extra-large'],
      default: 'medium'
    },
    showDualSubtitles: {
      type: Boolean,
      default: false
    },
    rtlSupport: {
      type: Boolean,
      default: false
    },
    autoScroll: {
      type: Boolean,
      default: true
    },
    soundNotifications: {
      type: Boolean,
      default: true
    },
    vibrationNotifications: {
      type: Boolean,
      default: false
    }
  },
  
  // Interaction Statistics
  interactions: {
    translationsViewed: {
      type: Number,
      default: 0
    },
    translationsShared: {
      type: Number,
      default: 0
    },
    feedbackGiven: {
      type: Number,
      default: 0
    },
    questionsAsked: {
      type: Number,
      default: 0
    }
  },
  
  // Quality Metrics
  quality: {
    connectionStability: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    },
    averageLatency: {
      type: Number,
      default: 0 // milliseconds
    },
    disconnectionCount: {
      type: Number,
      default: 0
    },
    lastDisconnectionAt: Date
  },
  
  // Translator Information (if userType is 'translator')
  translatorInfo: {
    isVerified: {
      type: Boolean,
      default: false
    },
    languages: [String],
    specializations: [String],
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    translationsCompleted: {
      type: Number,
      default: 0
    }
  },
  
  // Location Information (optional)
  location: {
    country: String,
    city: String,
    timezone: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Session Events
  events: [{
    type: {
      type: String,
      enum: ['joined', 'left', 'disconnected', 'reconnected', 'language_changed', 'feedback_given'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    data: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  collection: 'sessionparticipants'
});

// Compound indexes for performance
sessionParticipantSchema.index({ sessionId: 1, isActive: 1 });
sessionParticipantSchema.index({ audioSessionId: 1, joinedAt: -1 });
sessionParticipantSchema.index({ userId: 1, joinedAt: -1 });
sessionParticipantSchema.index({ deviceId: 1, sessionId: 1 });
sessionParticipantSchema.index({ preferredLanguage: 1, isActive: 1 });
sessionParticipantSchema.index({ userType: 1, isActive: 1 });

// Virtual for session duration
sessionParticipantSchema.virtual('sessionDurationMinutes').get(function() {
  if (this.leftAt && this.joinedAt) {
    return Math.round((this.leftAt - this.joinedAt) / (1000 * 60));
  } else if (this.joinedAt) {
    return Math.round((new Date() - this.joinedAt) / (1000 * 60));
  }
  return 0;
});

// Methods
sessionParticipantSchema.methods.updateActivity = function() {
  this.lastActivityAt = new Date();
  return this.save();
};

sessionParticipantSchema.methods.leaveSession = function() {
  this.isActive = false;
  this.leftAt = new Date();
  this.totalDurationSeconds = Math.round((this.leftAt - this.joinedAt) / 1000);
  this.addEvent('left');
  return this.save();
};

sessionParticipantSchema.methods.changeLanguage = function(newLanguage) {
  const oldLanguage = this.preferredLanguage;
  this.preferredLanguage = newLanguage;
  this.addEvent('language_changed', { from: oldLanguage, to: newLanguage });
  return this.save();
};

sessionParticipantSchema.methods.updatePreferences = function(preferences) {
  this.preferences = { ...this.preferences, ...preferences };
  return this.save();
};

sessionParticipantSchema.methods.addEvent = function(eventType, eventData = {}) {
  this.events.push({
    type: eventType,
    timestamp: new Date(),
    data: eventData
  });
  return this.save();
};

sessionParticipantSchema.methods.recordDisconnection = function() {
  this.quality.disconnectionCount += 1;
  this.quality.lastDisconnectionAt = new Date();
  this.addEvent('disconnected');
  return this.save();
};

sessionParticipantSchema.methods.recordReconnection = function() {
  this.addEvent('reconnected');
  return this.save();
};

sessionParticipantSchema.methods.incrementInteraction = function(interactionType) {
  if (this.interactions[interactionType] !== undefined) {
    this.interactions[interactionType] += 1;
  }
  return this.save();
};

// Static methods
sessionParticipantSchema.statics.getActiveParticipants = function(sessionId) {
  return this.find({ 
    sessionId: sessionId, 
    isActive: true 
  }).sort({ joinedAt: 1 });
};

sessionParticipantSchema.statics.getParticipantsByLanguage = function(sessionId, language) {
  return this.find({ 
    sessionId: sessionId, 
    preferredLanguage: language,
    isActive: true 
  });
};

sessionParticipantSchema.statics.getSessionStats = function(sessionId) {
  return this.aggregate([
    { $match: { sessionId: sessionId } },
    { $group: { 
      _id: null,
      totalParticipants: { $sum: 1 },
      activeParticipants: { 
        $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
      },
      averageDuration: { $avg: '$totalDurationSeconds' },
      languageDistribution: { $push: '$preferredLanguage' }
    }}
  ]);
};

sessionParticipantSchema.statics.getUserParticipationHistory = function(userId, limit = 10) {
  return this.find({ userId: userId })
    .sort({ joinedAt: -1 })
    .limit(limit)
    .populate('audioSessionId');
};

module.exports = mongoose.model('SessionParticipant', sessionParticipantSchema);

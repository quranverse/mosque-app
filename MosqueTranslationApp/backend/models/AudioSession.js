// AudioSession Model for Mosque Translation App
const mongoose = require('mongoose');

const audioSessionSchema = new mongoose.Schema({
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
  
  // Session Status
  status: {
    type: String,
    enum: ['active', 'paused', 'ended'],
    default: 'active',
    index: true
  },
  
  // Timing
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  endedAt: {
    type: Date,
    default: null
  },
  totalDurationSeconds: {
    type: Number,
    default: 0
  },
  
  // Audio Quality Metrics
  audioQualityScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  
  // Participant Information
  participantCount: {
    type: Number,
    default: 0
  },
  maxConcurrentParticipants: {
    type: Number,
    default: 0
  },
  
  // Audio Configuration
  audioConfig: {
    sampleRate: {
      type: Number,
      default: 48000
    },
    channels: {
      type: Number,
      default: 1
    },
    bitRate: {
      type: Number,
      default: 128000
    },
    format: {
      type: String,
      default: 'webm'
    }
  },
  
  // Recording Information
  isRecording: {
    type: Boolean,
    default: false
  },
  recordingPath: {
    type: String,
    default: null
  },
  
  // Session Statistics
  stats: {
    totalTranscriptions: {
      type: Number,
      default: 0
    },
    totalTranslations: {
      type: Number,
      default: 0
    },
    averageConfidenceScore: {
      type: Number,
      default: 0
    },
    processingErrors: {
      type: Number,
      default: 0
    }
  },
  
  // Metadata
  metadata: {
    sessionType: {
      type: String,
      enum: ['sermon', 'prayer', 'quran', 'lecture', 'talk', 'dua', 'general'],
      default: 'general'
    },
    description: String,
    tags: [String]
  }
}, {
  timestamps: true,
  collection: 'audiosessions'
});

// Indexes for performance
audioSessionSchema.index({ mosqueId: 1, startedAt: -1 });
audioSessionSchema.index({ status: 1, startedAt: -1 });
audioSessionSchema.index({ sessionId: 1, status: 1 });

// Virtual for duration calculation
audioSessionSchema.virtual('durationMinutes').get(function() {
  if (this.endedAt && this.startedAt) {
    return Math.round((this.endedAt - this.startedAt) / (1000 * 60));
  }
  return 0;
});

// Methods
audioSessionSchema.methods.updateParticipantCount = function(count) {
  this.participantCount = count;
  if (count > this.maxConcurrentParticipants) {
    this.maxConcurrentParticipants = count;
  }
  return this.save();
};

audioSessionSchema.methods.endSession = function() {
  this.status = 'ended';
  this.endedAt = new Date();
  this.totalDurationSeconds = Math.round((this.endedAt - this.startedAt) / 1000);
  return this.save();
};

audioSessionSchema.methods.updateAudioQuality = function(qualityScore) {
  this.audioQualityScore = qualityScore;
  return this.save();
};

// Static methods
audioSessionSchema.statics.getActiveSessionsByMosque = function(mosqueId) {
  return this.find({ 
    mosqueId: mosqueId, 
    status: 'active' 
  }).sort({ startedAt: -1 });
};

audioSessionSchema.statics.getSessionStats = function(sessionId) {
  return this.findOne({ sessionId }).select('stats participantCount audioQualityScore');
};

module.exports = mongoose.model('AudioSession', audioSessionSchema);

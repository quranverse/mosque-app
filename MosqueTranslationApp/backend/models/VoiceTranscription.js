// VoiceTranscription Model for Mosque Translation App
const mongoose = require('mongoose');

const voiceTranscriptionSchema = new mongoose.Schema({
  // Transcription Identification
  transcriptionId: {
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
  
  // Transcription Content
  originalText: {
    type: String,
    required: true,
    text: true // Enable text search
  },
  
  // Language Information
  languageDetected: {
    type: String,
    default: 'ar',
    index: true
  },
  
  // Quality Metrics
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
    index: true
  },
  
  // Provider Information
  provider: {
    type: String,
    required: true,
    enum: ['munsit', 'google', 'azure', 'whisper', 'assemblyai', 'aws'],
    index: true
  },
  
  // Processing Status
  isFinal: {
    type: Boolean,
    default: false,
    index: true
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  
  // Sequence Information
  sequenceNumber: {
    type: Number,
    required: true,
    index: true
  },
  
  // Audio Timing
  audioStartTime: {
    type: Number, // Seconds from session start
    default: 0
  },
  audioEndTime: {
    type: Number, // Seconds from session start
    default: 0
  },
  
  // Processing Information
  processingTime: {
    type: Number, // Milliseconds
    default: 0
  },
  
  // Alternative Results (from multiple providers)
  alternatives: [{
    provider: String,
    text: String,
    confidence: Number,
    processingTime: Number
  }],
  
  // Error Information
  errors: [{
    provider: String,
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  metadata: {
    audioQuality: Number,
    backgroundNoise: Number,
    speakerCount: Number,
    dialect: String,
    context: {
      type: String,
      enum: ['prayer', 'sermon', 'quran', 'general'],
      default: 'general'
    }
  }
}, {
  timestamps: true,
  collection: 'voicetranscriptions'
});

// Compound indexes for performance
voiceTranscriptionSchema.index({ sessionId: 1, sequenceNumber: 1 });
voiceTranscriptionSchema.index({ sessionId: 1, isFinal: 1, createdAt: -1 });
voiceTranscriptionSchema.index({ provider: 1, confidenceScore: -1 });
voiceTranscriptionSchema.index({ languageDetected: 1, isFinal: 1 });

// Text index for search
voiceTranscriptionSchema.index({ originalText: 'text' });

// Virtual for duration
voiceTranscriptionSchema.virtual('duration').get(function() {
  return this.audioEndTime - this.audioStartTime;
});

// Methods
voiceTranscriptionSchema.methods.addAlternative = function(provider, text, confidence, processingTime) {
  this.alternatives.push({
    provider,
    text,
    confidence,
    processingTime
  });
  return this.save();
};

voiceTranscriptionSchema.methods.addError = function(provider, error) {
  this.errors.push({
    provider,
    error,
    timestamp: new Date()
  });
  return this.save();
};

voiceTranscriptionSchema.methods.markAsProcessed = function() {
  this.isProcessed = true;
  return this.save();
};

voiceTranscriptionSchema.methods.getBestAlternative = function() {
  if (this.alternatives.length === 0) {
    return {
      provider: this.provider,
      text: this.originalText,
      confidence: this.confidenceScore
    };
  }
  
  return this.alternatives.reduce((best, current) => {
    return current.confidence > best.confidence ? current : best;
  });
};

// Static methods
voiceTranscriptionSchema.statics.getFinalTranscriptions = function(sessionId) {
  return this.find({ 
    sessionId: sessionId, 
    isFinal: true 
  }).sort({ sequenceNumber: 1 });
};

voiceTranscriptionSchema.statics.getTranscriptionsByProvider = function(provider, limit = 100) {
  return this.find({ provider })
    .sort({ createdAt: -1 })
    .limit(limit);
};

voiceTranscriptionSchema.statics.getAverageConfidence = function(sessionId) {
  return this.aggregate([
    { $match: { sessionId: sessionId, isFinal: true } },
    { $group: { 
      _id: null, 
      avgConfidence: { $avg: '$confidenceScore' },
      count: { $sum: 1 }
    }}
  ]);
};

voiceTranscriptionSchema.statics.searchTranscriptions = function(searchText, limit = 50) {
  return this.find(
    { $text: { $search: searchText } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit);
};

module.exports = mongoose.model('VoiceTranscription', voiceTranscriptionSchema);

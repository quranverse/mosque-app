// AudioRecording Model for Mosque Translation App
const mongoose = require('mongoose');

const audioRecordingSchema = new mongoose.Schema({
  // Recording Identification
  recordingId: {
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

  // Mosque Information
  mosqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mosque',
    required: true,
    index: true
  },
  mosqueName: {
    type: String,
    required: true
  },
  
  // File Information
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String // For cloud storage URLs
  },
  
  // File Properties
  fileSizeBytes: {
    type: Number,
    default: 0,
    index: true
  },
  durationSeconds: {
    type: Number,
    default: 0,
    index: true
  },
  format: {
    type: String,
    enum: ['mp3', 'wav', 'webm', 'ogg', 'm4a'],
    default: 'mp3',
    index: true
  },
  
  // Audio Quality
  quality: {
    type: String,
    enum: ['low', 'standard', 'high', 'lossless'],
    default: 'standard',
    index: true
  },
  bitRate: {
    type: Number,
    default: 128000 // 128 kbps
  },
  sampleRate: {
    type: Number,
    default: 48000 // 48 kHz
  },
  channels: {
    type: Number,
    default: 1 // Mono
  },
  
  // Processing Status
  status: {
    type: String,
    enum: ['recording', 'processing', 'completed', 'failed', 'archived'],
    default: 'recording',
    index: true
  },
  
  // Archive Information
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  archivedAt: {
    type: Date,
    default: null
  },
  archiveLocation: {
    type: String // For archived file location
  },
  
  // Access Control
  isPublic: {
    type: Boolean,
    default: false
  },
  accessLevel: {
    type: String,
    enum: ['private', 'mosque_only', 'followers_only', 'public'],
    default: 'mosque_only'
  },
  
  // Download Information
  downloadCount: {
    type: Number,
    default: 0,
    index: true
  },
  lastDownloaded: {
    type: Date,
    default: null
  },
  
  // Segments (for large recordings)
  segments: [{
    segmentNumber: Number,
    startTime: Number, // Seconds
    endTime: Number,   // Seconds
    filePath: String,
    fileSize: Number
  }],
  
  // Transcription Reference
  hasTranscription: {
    type: Boolean,
    default: false
  },
  transcriptionCount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  metadata: {
    title: String,
    description: String,
    tags: [String],
    sessionType: {
      type: String,
      enum: ['friday_prayer', 'daily_prayer', 'lecture', 'quran_recitation', 'general'],
      default: 'general'
    },
    language: {
      type: String,
      default: 'ar'
    },
    speaker: String,
    location: String
  },
  
  // Processing Information
  processing: {
    startedAt: Date,
    completedAt: Date,
    processingTimeMs: Number,
    errors: [String]
  },
  
  // Storage Information
  storage: {
    provider: {
      type: String,
      enum: ['local', 'aws_s3', 'google_cloud', 'azure_blob'],
      default: 'local'
    },
    bucket: String,
    region: String,
    storageClass: String
  },
  
  // Retention Policy
  retention: {
    expiresAt: Date,
    retentionDays: {
      type: Number,
      default: 30 // 30 days default retention
    },
    isProtected: {
      type: Boolean,
      default: false // Protected recordings won't be auto-deleted
    }
  }
}, {
  timestamps: true,
  collection: 'audiorecordings'
});

// Compound indexes for performance
audioRecordingSchema.index({ sessionId: 1, createdAt: -1 });
audioRecordingSchema.index({ audioSessionId: 1, status: 1 });
audioRecordingSchema.index({ isArchived: 1, createdAt: -1 });
audioRecordingSchema.index({ status: 1, createdAt: -1 });
audioRecordingSchema.index({ 'retention.expiresAt': 1 }); // For cleanup jobs

// Virtual for file size in MB
audioRecordingSchema.virtual('fileSizeMB').get(function() {
  return (this.fileSizeBytes / (1024 * 1024)).toFixed(2);
});

// Virtual for duration in minutes
audioRecordingSchema.virtual('durationMinutes').get(function() {
  return Math.round(this.durationSeconds / 60);
});

// Methods
audioRecordingSchema.methods.updateFileInfo = function(fileSizeBytes, durationSeconds) {
  this.fileSizeBytes = fileSizeBytes;
  this.durationSeconds = durationSeconds;
  this.status = 'completed';
  this.processing.completedAt = new Date();
  return this.save();
};

audioRecordingSchema.methods.addSegment = function(segmentNumber, startTime, endTime, filePath, fileSize) {
  this.segments.push({
    segmentNumber,
    startTime,
    endTime,
    filePath,
    fileSize
  });
  return this.save();
};

audioRecordingSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

audioRecordingSchema.methods.archive = function(archiveLocation) {
  this.isArchived = true;
  this.archivedAt = new Date();
  this.archiveLocation = archiveLocation;
  this.status = 'archived';
  return this.save();
};

audioRecordingSchema.methods.setRetention = function(retentionDays, isProtected = false) {
  this.retention.retentionDays = retentionDays;
  this.retention.isProtected = isProtected;
  this.retention.expiresAt = new Date(Date.now() + (retentionDays * 24 * 60 * 60 * 1000));
  return this.save();
};

// Static methods
audioRecordingSchema.statics.getBySession = function(sessionId) {
  return this.find({ sessionId }).sort({ createdAt: -1 });
};

audioRecordingSchema.statics.getExpiredRecordings = function() {
  return this.find({
    'retention.expiresAt': { $lt: new Date() },
    'retention.isProtected': false,
    isArchived: false
  });
};

audioRecordingSchema.statics.getRecordingsByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

audioRecordingSchema.statics.getTotalStorageUsed = function() {
  return this.aggregate([
    { $group: { 
      _id: null, 
      totalSize: { $sum: '$fileSizeBytes' },
      count: { $sum: 1 }
    }}
  ]);
};

audioRecordingSchema.statics.getStorageByFormat = function() {
  return this.aggregate([
    { $group: { 
      _id: '$format', 
      totalSize: { $sum: '$fileSizeBytes' },
      count: { $sum: 1 },
      avgSize: { $avg: '$fileSizeBytes' }
    }}
  ]);
};

module.exports = mongoose.model('AudioRecording', audioRecordingSchema);

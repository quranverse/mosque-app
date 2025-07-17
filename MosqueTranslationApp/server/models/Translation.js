// Translation model for Mosque Translation App
const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  // Translation Identification
  translationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Session Reference
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true
  },
  
  // Mosque Reference
  mosqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Original Text
  originalText: {
    type: String,
    required: true,
    maxlength: 5000
  },
  originalLanguage: {
    type: String,
    default: 'Arabic',
    required: true
  },
  
  // Translations
  translations: [{
    language: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 5000
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    translationMethod: {
      type: String,
      enum: ['manual', 'automatic', 'hybrid', 'community'],
      default: 'manual'
    },
    translatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    translatedAt: {
      type: Date,
      default: Date.now
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    quality: {
      accuracy: Number, // 1-5 rating
      fluency: Number,  // 1-5 rating
      clarity: Number   // 1-5 rating
    }
  }],
  
  // Context Information
  context: {
    type: String,
    enum: ['prayer', 'sermon', 'quran', 'hadith', 'dua', 'announcement', 'general'],
    default: 'general'
  },
  
  // Timing
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  sequenceNumber: {
    type: Number,
    required: true
  },
  
  // Quality and Feedback
  quality: {
    accuracy: {
      type: Number,
      min: 1,
      max: 5
    },
    clarity: {
      type: Number,
      min: 1,
      max: 5
    },
    relevance: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // User Interactions
  interactions: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    bookmarks: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      bookmarkedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Corrections and Improvements
  corrections: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    language: String,
    originalText: String,
    correctedText: String,
    reason: String,
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  
  // Metadata
  metadata: {
    audioAvailable: {
      type: Boolean,
      default: false
    },
    audioUrl: String,
    audioDuration: Number, // in seconds
    speakerInfo: {
      name: String,
      role: String // imam, speaker, etc.
    },
    tags: [String],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate'
    }
  },
  
  // Islamic Content Classification
  islamicContent: {
    isQuranic: {
      type: Boolean,
      default: false
    },
    surahNumber: Number,
    ayahNumber: Number,
    isHadith: {
      type: Boolean,
      default: false
    },
    hadithSource: String,
    isDua: {
      type: Boolean,
      default: false
    },
    duaCategory: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
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
translationSchema.index({ sessionId: 1, sequenceNumber: 1 });
translationSchema.index({ mosqueId: 1, timestamp: -1 });
translationSchema.index({ context: 1, timestamp: -1 });
translationSchema.index({ 'islamicContent.isQuranic': 1 });
translationSchema.index({ 'islamicContent.isHadith': 1 });
translationSchema.index({ 'islamicContent.isDua': 1 });
translationSchema.index({ status: 1, timestamp: -1 });

// Text indexes for search functionality
translationSchema.index({
  originalText: 'text',
  'translations.text': 'text',
  'metadata.tags': 'text'
});

// Virtual for primary translation (usually English)
translationSchema.virtual('primaryTranslation').get(function() {
  return this.translations.find(t => t.language === 'English') || this.translations[0];
});

// Virtual for average quality rating
translationSchema.virtual('averageQuality').get(function() {
  if (!this.quality.accuracy && !this.quality.clarity && !this.quality.relevance) {
    return null;
  }
  
  const ratings = [this.quality.accuracy, this.quality.clarity, this.quality.relevance]
    .filter(rating => rating != null);
  
  return ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
});

// Pre-save middleware
translationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to add translation
translationSchema.methods.addTranslation = function(language, text, method = 'manual', confidence = null) {
  // Check if translation for this language already exists
  const existingTranslation = this.translations.find(t => t.language === language);
  
  if (existingTranslation) {
    existingTranslation.text = text;
    existingTranslation.translationMethod = method;
    if (confidence !== null) {
      existingTranslation.confidence = confidence;
    }
    return existingTranslation;
  }
  
  // Add new translation
  const translation = {
    language,
    text,
    translationMethod: method,
    confidence
  };
  
  this.translations.push(translation);
  return translation;
};

// Instance method to bookmark translation
translationSchema.methods.addBookmark = function(userId) {
  // Check if already bookmarked
  const existingBookmark = this.interactions.bookmarks.find(
    b => b.userId.toString() === userId.toString()
  );
  
  if (!existingBookmark) {
    this.interactions.bookmarks.push({
      userId,
      bookmarkedAt: new Date()
    });
  }
  
  return this;
};

// Instance method to remove bookmark
translationSchema.methods.removeBookmark = function(userId) {
  this.interactions.bookmarks = this.interactions.bookmarks.filter(
    b => b.userId.toString() !== userId.toString()
  );
  
  return this;
};

// Instance method to add correction
translationSchema.methods.addCorrection = function(userId, language, correctedText, reason) {
  const originalTranslation = this.translations.find(t => t.language === language);
  
  if (!originalTranslation) {
    throw new Error(`Translation for language ${language} not found`);
  }
  
  const correction = {
    userId,
    language,
    originalText: originalTranslation.text,
    correctedText,
    reason,
    submittedAt: new Date(),
    status: 'pending'
  };
  
  this.corrections.push(correction);
  return correction;
};

// Static method to find translations by session
translationSchema.statics.findBySession = function(sessionId, limit = 100) {
  return this.find({ sessionId, status: 'active' })
    .sort({ sequenceNumber: 1 })
    .limit(limit)
    .populate('mosqueId', 'mosqueName');
};

// Static method to search translations
translationSchema.statics.searchTranslations = function(query, options = {}) {
  const searchQuery = {
    $text: { $search: query },
    status: 'active'
  };
  
  if (options.mosqueId) {
    searchQuery.mosqueId = options.mosqueId;
  }
  
  if (options.context) {
    searchQuery.context = options.context;
  }
  
  if (options.isQuranic !== undefined) {
    searchQuery['islamicContent.isQuranic'] = options.isQuranic;
  }
  
  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, timestamp: -1 })
    .limit(options.limit || 50)
    .populate('mosqueId', 'mosqueName');
};

// Static method to get popular translations
translationSchema.statics.getPopularTranslations = function(mosqueId, limit = 10) {
  const matchQuery = { status: 'active' };
  if (mosqueId) {
    matchQuery.mosqueId = mosqueId;
  }
  
  return this.find(matchQuery)
    .sort({
      'interactions.views': -1,
      'interactions.likes': -1,
      'interactions.bookmarks': -1
    })
    .limit(limit)
    .populate('mosqueId', 'mosqueName');
};

const Translation = mongoose.model('Translation', translationSchema);

module.exports = Translation;

// TranslationResult Model for Mosque Translation App
const mongoose = require('mongoose');

const translationResultSchema = new mongoose.Schema({
  // Translation Identification
  translationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Source Reference
  transcriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VoiceTranscription',
    required: true,
    index: true
  },
  
  // Language Information
  sourceLanguage: {
    type: String,
    default: 'ar',
    index: true
  },
  targetLanguage: {
    type: String,
    required: true,
    index: true
  },
  
  // Translation Content
  sourceText: {
    type: String,
    required: true
  },
  translatedText: {
    type: String,
    required: true,
    text: true // Enable text search
  },
  
  // Provider Information
  translationProvider: {
    type: String,
    required: true,
    enum: ['google', 'azure', 'openai', 'microsoft', 'aws'],
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
  
  // Context Information
  contextType: {
    type: String,
    enum: ['religious', 'prayer', 'sermon', 'quran', 'general'],
    default: 'religious',
    index: true
  },
  
  // Processing Information
  processingTimeMs: {
    type: Number,
    default: 0
  },
  isCached: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Alternative Translations
  alternatives: [{
    provider: String,
    text: String,
    confidence: Number,
    processingTime: Number,
    cost: Number
  }],
  
  // Quality Assessment
  qualityMetrics: {
    fluency: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    religiousAccuracy: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    culturalSensitivity: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    }
  },
  
  // User Feedback
  userFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String,
    isHelpful: Boolean,
    reportedIssues: [String]
  },
  
  // Religious Content Handling
  religiousTerms: [{
    original: String,
    translated: String,
    preserved: Boolean,
    explanation: String
  }],
  
  // Cost Information
  cost: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    provider: String
  },
  
  // Error Information
  errors: [{
    provider: String,
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Usage Statistics
  usage: {
    viewCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    lastAccessed: Date
  }
}, {
  timestamps: true,
  collection: 'translationresults'
});

// Compound indexes for performance
translationResultSchema.index({ transcriptionId: 1, targetLanguage: 1 });
translationResultSchema.index({ targetLanguage: 1, createdAt: -1 });
translationResultSchema.index({ translationProvider: 1, confidenceScore: -1 });
translationResultSchema.index({ contextType: 1, targetLanguage: 1 });
translationResultSchema.index({ isCached: 1, targetLanguage: 1 });

// Text index for search
translationResultSchema.index({ translatedText: 'text' });

// Methods
translationResultSchema.methods.addAlternative = function(provider, text, confidence, processingTime, cost) {
  this.alternatives.push({
    provider,
    text,
    confidence,
    processingTime,
    cost
  });
  return this.save();
};

translationResultSchema.methods.updateQualityMetrics = function(metrics) {
  this.qualityMetrics = { ...this.qualityMetrics, ...metrics };
  return this.save();
};

translationResultSchema.methods.addUserFeedback = function(rating, comments, isHelpful, reportedIssues) {
  this.userFeedback = {
    rating,
    comments,
    isHelpful,
    reportedIssues: reportedIssues || []
  };
  return this.save();
};

translationResultSchema.methods.incrementViewCount = function() {
  this.usage.viewCount += 1;
  this.usage.lastAccessed = new Date();
  return this.save();
};

translationResultSchema.methods.addReligiousTerm = function(original, translated, preserved, explanation) {
  this.religiousTerms.push({
    original,
    translated,
    preserved,
    explanation
  });
  return this.save();
};

// Static methods
translationResultSchema.statics.getByLanguage = function(targetLanguage, limit = 100) {
  return this.find({ targetLanguage })
    .sort({ createdAt: -1 })
    .limit(limit);
};

translationResultSchema.statics.getHighQualityTranslations = function(minConfidence = 0.8) {
  return this.find({ confidenceScore: { $gte: minConfidence } })
    .sort({ confidenceScore: -1 });
};

translationResultSchema.statics.getTranslationsByProvider = function(provider, limit = 100) {
  return this.find({ translationProvider: provider })
    .sort({ createdAt: -1 })
    .limit(limit);
};

translationResultSchema.statics.getAverageQuality = function(targetLanguage) {
  return this.aggregate([
    { $match: { targetLanguage: targetLanguage } },
    { $group: { 
      _id: null, 
      avgConfidence: { $avg: '$confidenceScore' },
      avgFluency: { $avg: '$qualityMetrics.fluency' },
      avgAccuracy: { $avg: '$qualityMetrics.accuracy' },
      count: { $sum: 1 }
    }}
  ]);
};

translationResultSchema.statics.searchTranslations = function(searchText, targetLanguage, limit = 50) {
  const query = { $text: { $search: searchText } };
  if (targetLanguage) {
    query.targetLanguage = targetLanguage;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit);
};

module.exports = mongoose.model('TranslationResult', translationResultSchema);

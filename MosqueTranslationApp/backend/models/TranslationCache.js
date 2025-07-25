// TranslationCache Model for Mosque Translation App
const mongoose = require('mongoose');
const crypto = require('crypto');

const translationCacheSchema = new mongoose.Schema({
  // Cache Identification
  cacheId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Source Text Information
  sourceTextHash: {
    type: String,
    required: true,
    index: true
  },
  sourceText: {
    type: String,
    required: true
  },
  sourceLanguage: {
    type: String,
    required: true,
    default: 'ar',
    index: true
  },
  
  // Target Language
  targetLanguage: {
    type: String,
    required: true,
    index: true
  },
  
  // Translation Content
  translatedText: {
    type: String,
    required: true,
    text: true // Enable text search
  },
  
  // Provider Information
  provider: {
    type: String,
    required: true,
    enum: ['google', 'azure', 'openai', 'microsoft', 'aws'],
    index: true
  },
  
  // Context Information
  contextType: {
    type: String,
    enum: ['religious', 'prayer', 'sermon', 'quran', 'general'],
    default: 'religious',
    index: true
  },
  
  // Quality Metrics
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  qualityRating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },
  
  // Usage Statistics
  usageCount: {
    type: Number,
    default: 1,
    index: true
  },
  lastUsedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Cache Metadata
  metadata: {
    textLength: {
      type: Number,
      default: 0
    },
    wordCount: {
      type: Number,
      default: 0
    },
    isReligiousContent: {
      type: Boolean,
      default: false
    },
    containsQuranVerse: {
      type: Boolean,
      default: false
    },
    containsHadith: {
      type: Boolean,
      default: false
    },
    religiousTermsCount: {
      type: Number,
      default: 0
    }
  },
  
  // Religious Terms Mapping
  religiousTerms: [{
    original: String,
    translated: String,
    category: {
      type: String,
      enum: ['name_of_allah', 'prophet', 'islamic_concept', 'prayer_term', 'quran_term', 'general']
    },
    isPreserved: Boolean
  }],
  
  // Alternative Translations
  alternatives: [{
    provider: String,
    text: String,
    confidence: Number,
    isPreferred: Boolean
  }],
  
  // Performance Metrics
  performance: {
    originalProcessingTime: {
      type: Number,
      default: 0 // milliseconds
    },
    averageRetrievalTime: {
      type: Number,
      default: 0 // milliseconds
    },
    cacheHitCount: {
      type: Number,
      default: 0
    }
  },
  
  // Expiration and Cleanup
  expiresAt: {
    type: Date,
    index: true
  },
  isProtected: {
    type: Boolean,
    default: false // Protected entries won't be auto-deleted
  },
  
  // User Feedback
  feedback: {
    positiveVotes: {
      type: Number,
      default: 0
    },
    negativeVotes: {
      type: Number,
      default: 0
    },
    reportedIssues: [String],
    improvements: [String]
  },
  
  // Cost Information
  cost: {
    originalCost: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    totalSavings: {
      type: Number,
      default: 0 // Calculated based on usage
    }
  }
}, {
  timestamps: true,
  collection: 'translationcache'
});

// Compound indexes for efficient lookups
translationCacheSchema.index({ 
  sourceTextHash: 1, 
  sourceLanguage: 1, 
  targetLanguage: 1, 
  contextType: 1 
}, { unique: true });

translationCacheSchema.index({ targetLanguage: 1, usageCount: -1 });
translationCacheSchema.index({ contextType: 1, lastUsedAt: -1 });
translationCacheSchema.index({ expiresAt: 1 }); // For cleanup jobs
translationCacheSchema.index({ provider: 1, qualityRating: -1 });

// Text index for search
translationCacheSchema.index({ 
  sourceText: 'text', 
  translatedText: 'text' 
});

// Static methods for cache operations
translationCacheSchema.statics.generateHash = function(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
};

translationCacheSchema.statics.findCachedTranslation = function(sourceText, sourceLanguage, targetLanguage, contextType = 'religious') {
  const hash = this.generateHash(sourceText);
  return this.findOne({
    sourceTextHash: hash,
    sourceLanguage: sourceLanguage,
    targetLanguage: targetLanguage,
    contextType: contextType
  });
};

translationCacheSchema.statics.createCacheEntry = function(sourceText, sourceLanguage, targetLanguage, translatedText, provider, contextType = 'religious', options = {}) {
  const hash = this.generateHash(sourceText);
  const cacheId = `cache_${hash.substring(0, 16)}_${Date.now()}`;
  
  const cacheEntry = new this({
    cacheId,
    sourceTextHash: hash,
    sourceText,
    sourceLanguage,
    targetLanguage,
    translatedText,
    provider,
    contextType,
    confidenceScore: options.confidence || 0,
    qualityRating: options.quality || 5,
    metadata: {
      textLength: sourceText.length,
      wordCount: sourceText.split(/\s+/).length,
      isReligiousContent: options.isReligious || false,
      containsQuranVerse: options.containsQuran || false,
      containsHadith: options.containsHadith || false
    },
    cost: {
      originalCost: options.cost || 0,
      currency: options.currency || 'USD'
    },
    expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
  });
  
  return cacheEntry.save();
};

// Instance methods
translationCacheSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  this.performance.cacheHitCount += 1;
  
  // Calculate savings
  this.cost.totalSavings = (this.usageCount - 1) * this.cost.originalCost;
  
  return this.save();
};

translationCacheSchema.methods.addAlternative = function(provider, text, confidence, isPreferred = false) {
  this.alternatives.push({
    provider,
    text,
    confidence,
    isPreferred
  });
  return this.save();
};

translationCacheSchema.methods.addReligiousTerm = function(original, translated, category, isPreserved = true) {
  this.religiousTerms.push({
    original,
    translated,
    category,
    isPreserved
  });
  this.metadata.religiousTermsCount = this.religiousTerms.length;
  return this.save();
};

translationCacheSchema.methods.addFeedback = function(isPositive, issues = [], improvements = []) {
  if (isPositive) {
    this.feedback.positiveVotes += 1;
  } else {
    this.feedback.negativeVotes += 1;
  }
  
  if (issues.length > 0) {
    this.feedback.reportedIssues.push(...issues);
  }
  
  if (improvements.length > 0) {
    this.feedback.improvements.push(...improvements);
  }
  
  return this.save();
};

translationCacheSchema.methods.updatePerformance = function(retrievalTime) {
  const currentAvg = this.performance.averageRetrievalTime;
  const count = this.performance.cacheHitCount;
  
  this.performance.averageRetrievalTime = ((currentAvg * count) + retrievalTime) / (count + 1);
  
  return this.save();
};

// Static utility methods
translationCacheSchema.statics.getPopularTranslations = function(targetLanguage, limit = 100) {
  return this.find({ targetLanguage })
    .sort({ usageCount: -1 })
    .limit(limit);
};

translationCacheSchema.statics.getReligiousTranslations = function(targetLanguage, limit = 100) {
  return this.find({ 
    targetLanguage,
    'metadata.isReligiousContent': true 
  })
  .sort({ usageCount: -1 })
  .limit(limit);
};

translationCacheSchema.statics.getExpiredEntries = function() {
  return this.find({
    expiresAt: { $lt: new Date() },
    isProtected: false
  });
};

translationCacheSchema.statics.getCacheStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        totalUsage: { $sum: '$usageCount' },
        totalSavings: { $sum: '$cost.totalSavings' },
        averageUsage: { $avg: '$usageCount' },
        languageDistribution: { $push: '$targetLanguage' }
      }
    }
  ]);
};

translationCacheSchema.statics.searchCache = function(searchText, targetLanguage, limit = 50) {
  const query = { $text: { $search: searchText } };
  if (targetLanguage) {
    query.targetLanguage = targetLanguage;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, usageCount: -1 })
    .limit(limit);
};

module.exports = mongoose.model('TranslationCache', translationCacheSchema);

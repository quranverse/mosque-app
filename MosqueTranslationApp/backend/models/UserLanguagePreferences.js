// User Language Preferences Model
const mongoose = require('mongoose');

const userLanguagePreferencesSchema = new mongoose.Schema({
  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Primary language (main subtitle)
  primaryLanguage: {
    type: String,
    required: true,
    default: 'de', // German as default
    enum: ['de', 'en', 'fr', 'es', 'it', 'pt', 'ru', 'tr', 'ar']
  },
  
  // Secondary language (second subtitle, optional)
  secondaryLanguage: {
    type: String,
    default: null,
    enum: ['de', 'en', 'fr', 'es', 'it', 'pt', 'ru', 'tr', 'ar', null]
  },
  
  // Display preferences
  displaySettings: {
    // Show dual subtitles (primary + secondary)
    showDualSubtitles: {
      type: Boolean,
      default: false
    },
    
    // Subtitle font size
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    },
    
    // Subtitle position
    position: {
      type: String,
      enum: ['top', 'bottom', 'center'],
      default: 'bottom'
    },
    
    // Background opacity for better readability
    backgroundOpacity: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7
    },
    
    // Text color preference
    textColor: {
      type: String,
      enum: ['white', 'black', 'yellow', 'blue'],
      default: 'white'
    }
  },
  
  // Language learning preferences
  learningSettings: {
    // Show original Arabic text
    showOriginalText: {
      type: Boolean,
      default: false
    },
    
    // Show pronunciation guide
    showPronunciation: {
      type: Boolean,
      default: false
    },
    
    // Highlight religious terms
    highlightReligiousTerms: {
      type: Boolean,
      default: true
    }
  },
  
  // Notification preferences
  notificationSettings: {
    // Notify when translation quality is low
    lowQualityWarning: {
      type: Boolean,
      default: true
    },
    
    // Notify when switching translation providers
    providerSwitchNotification: {
      type: Boolean,
      default: false
    }
  },
  
  // Usage statistics
  statistics: {
    // Most used language combination
    mostUsedCombination: {
      primary: String,
      secondary: String
    },
    
    // Total translation requests
    totalTranslations: {
      type: Number,
      default: 0
    },
    
    // Last used languages
    lastUsedPrimary: String,
    lastUsedSecondary: String,
    
    // Usage frequency per language
    languageUsage: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Last activity
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userLanguagePreferencesSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods for common operations
userLanguagePreferencesSchema.statics = {
  
  // Get user preferences with defaults
  async getUserPreferences(userId) {
    try {
      let preferences = await this.findOne({ userId });
      
      if (!preferences) {
        // Create default preferences for new user
        preferences = new this({
          userId,
          primaryLanguage: 'de', // German default
          secondaryLanguage: null,
          displaySettings: {
            showDualSubtitles: false,
            fontSize: 'medium',
            position: 'bottom',
            backgroundOpacity: 0.7,
            textColor: 'white'
          }
        });
        
        await preferences.save();
      }
      
      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  },
  
  // Update user preferences
  async updateUserPreferences(userId, updates) {
    try {
      const preferences = await this.findOneAndUpdate(
        { userId },
        { 
          ...updates,
          updatedAt: new Date(),
          lastActivity: new Date()
        },
        { 
          new: true, 
          upsert: true,
          runValidators: true
        }
      );
      
      return preferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  },
  
  // Get language statistics
  async getLanguageStatistics() {
    try {
      const stats = await this.aggregate([
        {
          $group: {
            _id: '$primaryLanguage',
            count: { $sum: 1 },
            users: { $push: '$userId' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      return stats;
    } catch (error) {
      console.error('Error getting language statistics:', error);
      throw error;
    }
  },
  
  // Update usage statistics
  async updateUsageStats(userId, primaryLang, secondaryLang = null) {
    try {
      const update = {
        $inc: { 'statistics.totalTranslations': 1 },
        $set: {
          'statistics.lastUsedPrimary': primaryLang,
          'statistics.lastUsedSecondary': secondaryLang,
          lastActivity: new Date()
        }
      };
      
      // Update language usage count
      const langKey = `statistics.languageUsage.${primaryLang}`;
      update.$inc[langKey] = 1;
      
      if (secondaryLang) {
        const secondaryKey = `statistics.languageUsage.${secondaryLang}`;
        update.$inc[secondaryKey] = 1;
      }
      
      await this.findOneAndUpdate({ userId }, update);
    } catch (error) {
      console.error('Error updating usage statistics:', error);
    }
  }
};

// Instance methods
userLanguagePreferencesSchema.methods = {
  
  // Get formatted language names
  getLanguageNames() {
    const languageNames = {
      'de': 'Deutsch',
      'en': 'English', 
      'fr': 'Français',
      'es': 'Español',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'tr': 'Türkçe',
      'ar': 'العربية'
    };
    
    return {
      primary: languageNames[this.primaryLanguage] || this.primaryLanguage,
      secondary: this.secondaryLanguage ? languageNames[this.secondaryLanguage] : null
    };
  },
  
  // Check if dual subtitles should be shown
  shouldShowDualSubtitles() {
    return this.displaySettings.showDualSubtitles && this.secondaryLanguage;
  },
  
  // Get active languages for translation
  getActiveLanguages() {
    const languages = [this.primaryLanguage];
    
    if (this.shouldShowDualSubtitles()) {
      languages.push(this.secondaryLanguage);
    }
    
    return languages;
  },
  
  // Update activity timestamp
  updateActivity() {
    this.lastActivity = new Date();
    return this.save();
  }
};

// Create indexes for better performance
userLanguagePreferencesSchema.index({ userId: 1 }, { unique: true });
userLanguagePreferencesSchema.index({ primaryLanguage: 1 });
userLanguagePreferencesSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('UserLanguagePreferences', userLanguagePreferencesSchema);

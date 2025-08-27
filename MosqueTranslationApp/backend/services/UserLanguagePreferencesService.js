// User Language Preferences Service
const UserLanguagePreferences = require('../models/UserLanguagePreferences');
const config = require('../config/config');

class UserLanguagePreferencesService {
  constructor() {
    this.supportedLanguages = config.translation.supportedLanguages;
    this.defaultLanguage = config.translation.defaultUserLanguage;
    
    // Language code to name mapping
    this.languageNames = {
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
  }

  // Get user preferences with German as default
  async getUserPreferences(userId) {
    try {
      let preferences = await UserLanguagePreferences.findOne({ userId });
      
      if (!preferences) {
        // Create default preferences for German-speaking users
        preferences = new UserLanguagePreferences({
          userId,
          primaryLanguage: 'de', // German as default
          secondaryLanguage: null,
          displaySettings: {
            showDualSubtitles: false,
            fontSize: 'medium',
            position: 'bottom',
            backgroundOpacity: 0.7,
            textColor: 'white'
          },
          learningSettings: {
            showOriginalText: false,
            showPronunciation: false,
            highlightReligiousTerms: true
          }
        });
        
        await preferences.save();
        console.log(`✅ Created default German preferences for user ${userId}`);
      }
      
      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw error;
    }
  }

  // Update user language preferences
  async updateUserPreferences(userId, updates) {
    try {
      // Validate language codes
      if (updates.primaryLanguage && !this.supportedLanguages.includes(updates.primaryLanguage)) {
        throw new Error(`Unsupported primary language: ${updates.primaryLanguage}`);
      }
      
      if (updates.secondaryLanguage && updates.secondaryLanguage !== null && !this.supportedLanguages.includes(updates.secondaryLanguage)) {
        throw new Error(`Unsupported secondary language: ${updates.secondaryLanguage}`);
      }

      // Prevent same language for primary and secondary
      if (updates.primaryLanguage && updates.secondaryLanguage && updates.primaryLanguage === updates.secondaryLanguage) {
        throw new Error('Primary and secondary languages cannot be the same');
      }

      const preferences = await UserLanguagePreferences.findOneAndUpdate(
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
      
      console.log(`✅ Updated preferences for user ${userId}:`, {
        primary: preferences.primaryLanguage,
        secondary: preferences.secondaryLanguage,
        dualSubtitles: preferences.displaySettings.showDualSubtitles
      });
      
      return preferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Get languages for translation based on user preferences
  async getTranslationLanguages(userId) {
    try {
      const preferences = await this.getUserPreferences(userId);
      const languages = [preferences.primaryLanguage];
      
      // Add secondary language if dual subtitles are enabled
      if (preferences.displaySettings.showDualSubtitles && preferences.secondaryLanguage) {
        languages.push(preferences.secondaryLanguage);
      }
      
      return {
        languages,
        primary: preferences.primaryLanguage,
        secondary: preferences.secondaryLanguage,
        showDual: preferences.displaySettings.showDualSubtitles
      };
    } catch (error) {
      console.error('Error getting translation languages:', error);
      throw error;
    }
  }

  // Enable dual subtitles (German + English by default)
  async enableDualSubtitles(userId, secondaryLanguage = 'en') {
    try {
      const updates = {
        secondaryLanguage,
        'displaySettings.showDualSubtitles': true
      };
      
      const preferences = await this.updateUserPreferences(userId, updates);
      
      console.log(`✅ Enabled dual subtitles for user ${userId}: ${preferences.primaryLanguage} + ${secondaryLanguage}`);
      return preferences;
    } catch (error) {
      console.error('Error enabling dual subtitles:', error);
      throw error;
    }
  }

  // Disable dual subtitles
  async disableDualSubtitles(userId) {
    try {
      const updates = {
        'displaySettings.showDualSubtitles': false
      };
      
      const preferences = await this.updateUserPreferences(userId, updates);
      
      console.log(`✅ Disabled dual subtitles for user ${userId}`);
      return preferences;
    } catch (error) {
      console.error('Error disabling dual subtitles:', error);
      throw error;
    }
  }

  // Update usage statistics
  async updateUsageStats(userId, primaryLang, secondaryLang = null) {
    try {
      await UserLanguagePreferences.updateUsageStats(userId, primaryLang, secondaryLang);
    } catch (error) {
      console.error('Error updating usage statistics:', error);
    }
  }

  // Get supported languages with names
  getSupportedLanguages() {
    return this.supportedLanguages.map(code => ({
      code,
      name: this.languageNames[code] || code,
      isDefault: code === this.defaultLanguage
    }));
  }

  // Get language statistics for admin
  async getLanguageStatistics() {
    try {
      const stats = await UserLanguagePreferences.aggregate([
        {
          $group: {
            _id: '$primaryLanguage',
            count: { $sum: 1 },
            avgTranslations: { $avg: '$statistics.totalTranslations' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      // Add language names
      const formattedStats = stats.map(stat => ({
        language: stat._id,
        languageName: this.languageNames[stat._id] || stat._id,
        userCount: stat.count,
        avgTranslations: Math.round(stat.avgTranslations || 0)
      }));
      
      return formattedStats;
    } catch (error) {
      console.error('Error getting language statistics:', error);
      throw error;
    }
  }

  // Get dual subtitle usage statistics
  async getDualSubtitleStats() {
    try {
      const stats = await UserLanguagePreferences.aggregate([
        {
          $match: {
            'displaySettings.showDualSubtitles': true,
            secondaryLanguage: { $ne: null }
          }
        },
        {
          $group: {
            _id: {
              primary: '$primaryLanguage',
              secondary: '$secondaryLanguage'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      // Format results
      const formattedStats = stats.map(stat => ({
        combination: `${this.languageNames[stat._id.primary]} + ${this.languageNames[stat._id.secondary]}`,
        primary: stat._id.primary,
        secondary: stat._id.secondary,
        userCount: stat.count
      }));
      
      return formattedStats;
    } catch (error) {
      console.error('Error getting dual subtitle statistics:', error);
      throw error;
    }
  }

  // Validate language preferences
  validatePreferences(preferences) {
    const errors = [];
    
    if (preferences.primaryLanguage && !this.supportedLanguages.includes(preferences.primaryLanguage)) {
      errors.push(`Unsupported primary language: ${preferences.primaryLanguage}`);
    }
    
    if (preferences.secondaryLanguage && preferences.secondaryLanguage !== null && !this.supportedLanguages.includes(preferences.secondaryLanguage)) {
      errors.push(`Unsupported secondary language: ${preferences.secondaryLanguage}`);
    }
    
    if (preferences.primaryLanguage && preferences.secondaryLanguage && preferences.primaryLanguage === preferences.secondaryLanguage) {
      errors.push('Primary and secondary languages cannot be the same');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get popular language combinations
  async getPopularCombinations(limit = 5) {
    try {
      const combinations = await this.getDualSubtitleStats();
      return combinations.slice(0, limit);
    } catch (error) {
      console.error('Error getting popular combinations:', error);
      return [];
    }
  }

  // Recommend secondary language based on primary
  getRecommendedSecondary(primaryLanguage) {
    const recommendations = {
      'de': 'en', // German speakers often want English
      'en': 'de', // English speakers in Germany want German
      'fr': 'en', // French speakers often want English
      'es': 'en', // Spanish speakers often want English
      'it': 'en', // Italian speakers often want English
      'pt': 'en', // Portuguese speakers often want English
      'ru': 'de', // Russian speakers in Germany want German
      'tr': 'de', // Turkish speakers in Germany want German
      'ar': 'de'  // Arabic speakers in Germany want German
    };
    
    return recommendations[primaryLanguage] || 'en';
  }
}

module.exports = new UserLanguagePreferencesService();

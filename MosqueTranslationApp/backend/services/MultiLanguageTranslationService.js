// Multi-Language Translation Service for Mosque Translation App
const Translation = require('../models/Translation');
const Session = require('../models/Session');
const User = require('../models/User');
const config = require('../config/config');

class MultiLanguageTranslationService {
  constructor() {
    this.activeTranslators = new Map(); // socketId -> translator info
    this.languageQueues = new Map(); // sessionId -> language -> translations
    this.userPreferences = new Map(); // userId -> language preferences
  }

  // Register a translator for a specific language
  registerTranslator(socketId, sessionId, language, userId, userType) {
    const translatorInfo = {
      socketId,
      sessionId,
      language,
      userId,
      userType,
      isActive: true,
      translationsCount: 0,
      registeredAt: new Date(),
      lastActivity: new Date()
    };

    this.activeTranslators.set(socketId, translatorInfo);
    
    // Initialize language queue if not exists
    if (!this.languageQueues.has(sessionId)) {
      this.languageQueues.set(sessionId, new Map());
    }
    
    const sessionQueues = this.languageQueues.get(sessionId);
    if (!sessionQueues.has(language)) {
      sessionQueues.set(language, []);
    }

    console.log(`Translator registered: ${language} for session ${sessionId}`);
    return translatorInfo;
  }

  // Unregister translator
  unregisterTranslator(socketId) {
    const translator = this.activeTranslators.get(socketId);
    if (translator) {
      translator.isActive = false;
      this.activeTranslators.delete(socketId);
      console.log(`Translator unregistered: ${translator.language} for session ${translator.sessionId}`);
    }
  }

  // Process incoming translation from mosque/imam
  async processOriginalTranslation(sessionId, originalText, context = 'general', metadata = {}) {
    try {
      // Create base translation record
      const translationId = `trans_${sessionId}_${Date.now()}`;
      const session = await Session.findById(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Get next sequence number
      const lastTranslation = await Translation.findOne({ sessionId })
        .sort({ sequenceNumber: -1 })
        .limit(1);
      
      const sequenceNumber = lastTranslation ? lastTranslation.sequenceNumber + 1 : 1;

      // Create translation document
      const translation = new Translation({
        translationId,
        sessionId,
        mosqueId: session.mosqueId,
        originalText,
        originalLanguage: 'Arabic',
        translations: [], // Will be populated as translations come in
        context,
        sequenceNumber,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          requiresTranslation: true,
          targetLanguages: session.targetLanguages || []
        }
      });

      await translation.save();

      // Notify all active translators for this session
      this.notifyTranslators(sessionId, {
        type: 'new_translation_request',
        translationId,
        originalText,
        context,
        sequenceNumber,
        targetLanguages: session.targetLanguages || []
      });

      return translation;
    } catch (error) {
      console.error('Error processing original translation:', error);
      throw error;
    }
  }

  // Add translation in specific language
  async addLanguageTranslation(translationId, language, translatedText, translatorId, confidence = null) {
    try {
      const translation = await Translation.findOne({ translationId });
      if (!translation) {
        throw new Error('Translation not found');
      }

      // Add or update translation for this language
      const existingTranslation = translation.translations.find(t => t.language === language);
      
      if (existingTranslation) {
        existingTranslation.text = translatedText;
        existingTranslation.confidence = confidence;
        existingTranslation.translatedAt = new Date();
        existingTranslation.translatorId = translatorId;
      } else {
        translation.translations.push({
          language,
          text: translatedText,
          confidence,
          translationMethod: 'manual',
          translatedAt: new Date(),
          translatorId
        });
      }

      await translation.save();

      // Update translator stats
      const translator = Array.from(this.activeTranslators.values())
        .find(t => t.userId?.toString() === translatorId?.toString());
      
      if (translator) {
        translator.translationsCount++;
        translator.lastActivity = new Date();
      }

      // Notify all session participants about new translation
      this.notifySessionParticipants(translation.sessionId, {
        type: 'translation_update',
        translationId,
        language,
        text: translatedText,
        sequenceNumber: translation.sequenceNumber,
        timestamp: new Date()
      });

      return translation;
    } catch (error) {
      console.error('Error adding language translation:', error);
      throw error;
    }
  }

  // Get user's preferred languages for translation display
  getUserLanguagePreferences(userId) {
    return this.userPreferences.get(userId) || {
      primaryLanguage: 'English',
      secondaryLanguage: null,
      showDualSubtitles: false,
      fontSize: 'medium',
      rtlSupport: false
    };
  }

  // Update user's language preferences
  setUserLanguagePreferences(userId, preferences) {
    const currentPrefs = this.getUserLanguagePreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences };
    this.userPreferences.set(userId, updatedPrefs);
    return updatedPrefs;
  }

  // Get translations formatted for specific user preferences
  async getFormattedTranslationsForUser(sessionId, userId, limit = 50) {
    try {
      const userPrefs = this.getUserLanguagePreferences(userId);
      const translations = await Translation.find({ 
        sessionId, 
        status: 'active' 
      })
      .sort({ sequenceNumber: -1 })
      .limit(limit);

      return translations.map(translation => {
        const formattedTranslation = {
          id: translation.translationId,
          originalText: translation.originalText,
          sequenceNumber: translation.sequenceNumber,
          timestamp: translation.timestamp,
          context: translation.context,
          translations: {}
        };

        // Add primary language translation
        const primaryTranslation = translation.translations.find(
          t => t.language === userPrefs.primaryLanguage
        );
        if (primaryTranslation) {
          formattedTranslation.translations.primary = {
            language: userPrefs.primaryLanguage,
            text: primaryTranslation.text,
            confidence: primaryTranslation.confidence
          };
        }

        // Add secondary language translation if dual subtitles enabled
        if (userPrefs.showDualSubtitles && userPrefs.secondaryLanguage) {
          const secondaryTranslation = translation.translations.find(
            t => t.language === userPrefs.secondaryLanguage
          );
          if (secondaryTranslation) {
            formattedTranslation.translations.secondary = {
              language: userPrefs.secondaryLanguage,
              text: secondaryTranslation.text,
              confidence: secondaryTranslation.confidence
            };
          }
        }

        // Add all available translations for language switching
        formattedTranslation.availableLanguages = translation.translations.map(t => ({
          language: t.language,
          available: true,
          confidence: t.confidence
        }));

        return formattedTranslation;
      });
    } catch (error) {
      console.error('Error getting formatted translations:', error);
      throw error;
    }
  }

  // Get available translators for a session
  getSessionTranslators(sessionId) {
    const translators = Array.from(this.activeTranslators.values())
      .filter(t => t.sessionId === sessionId && t.isActive);

    const translatorsByLanguage = {};
    translators.forEach(translator => {
      if (!translatorsByLanguage[translator.language]) {
        translatorsByLanguage[translator.language] = [];
      }
      translatorsByLanguage[translator.language].push({
        userId: translator.userId,
        userType: translator.userType,
        translationsCount: translator.translationsCount,
        registeredAt: translator.registeredAt,
        lastActivity: translator.lastActivity
      });
    });

    return {
      totalTranslators: translators.length,
      languagesCovered: Object.keys(translatorsByLanguage),
      translatorsByLanguage
    };
  }

  // Get translation statistics for a session
  async getSessionTranslationStats(sessionId) {
    try {
      const translations = await Translation.find({ sessionId });
      
      const stats = {
        totalTranslations: translations.length,
        languageStats: {},
        averageTranslationTime: 0,
        completionRate: 0
      };

      // Calculate language statistics
      translations.forEach(translation => {
        translation.translations.forEach(trans => {
          if (!stats.languageStats[trans.language]) {
            stats.languageStats[trans.language] = {
              count: 0,
              averageConfidence: 0,
              totalConfidence: 0
            };
          }
          
          const langStats = stats.languageStats[trans.language];
          langStats.count++;
          if (trans.confidence) {
            langStats.totalConfidence += trans.confidence;
            langStats.averageConfidence = langStats.totalConfidence / langStats.count;
          }
        });
      });

      return stats;
    } catch (error) {
      console.error('Error getting translation stats:', error);
      throw error;
    }
  }

  // Notify translators about new translation requests
  notifyTranslators(sessionId, message) {
    const translators = Array.from(this.activeTranslators.values())
      .filter(t => t.sessionId === sessionId && t.isActive);

    // This would be implemented with Socket.IO in the main server
    console.log(`Notifying ${translators.length} translators for session ${sessionId}`);
    return translators;
  }

  // Notify session participants about translation updates
  notifySessionParticipants(sessionId, message) {
    // This would be implemented with Socket.IO in the main server
    console.log(`Notifying session participants for session ${sessionId}:`, message.type);
  }

  // Get supported languages with details
  getSupportedLanguages() {
    return {
      languages: config.islamic.supportedLanguages,
      languageGroups: config.islamic.languageGroups,
      languageDetails: config.islamic.languageDetails
    };
  }

  // Validate language support
  isLanguageSupported(language) {
    return config.islamic.supportedLanguages.includes(language);
  }

  // Get language details
  getLanguageDetails(language) {
    return config.islamic.languageDetails[language] || null;
  }

  // Clean up inactive translators
  cleanupInactiveTranslators() {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [socketId, translator] of this.activeTranslators.entries()) {
      if (now - translator.lastActivity > inactiveThreshold) {
        this.unregisterTranslator(socketId);
      }
    }
  }
}

// Export singleton instance
const multiLanguageTranslationService = new MultiLanguageTranslationService();

// Clean up inactive translators every 2 minutes
setInterval(() => {
  multiLanguageTranslationService.cleanupInactiveTranslators();
}, 2 * 60 * 1000);

module.exports = multiLanguageTranslationService;

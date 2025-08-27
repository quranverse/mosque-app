// Multi-Language Translation Service for Mosque Translation App
const Translation = require('../models/Translation');
const Session = require('../models/Session');
const User = require('../models/User');
const config = require('../config/config');

// Import new audio-related models
const VoiceTranscription = require('../models/VoiceTranscription');
const TranslationResult = require('../models/TranslationResult');
const TranslationCache = require('../models/TranslationCache');

// Import dynamic translation system
const TranslationManager = require('./translation/TranslationManager');
const UserLanguagePreferencesService = require('./UserLanguagePreferencesService');

class MultiLanguageTranslationService {
  constructor() {
    this.activeTranslators = new Map(); // socketId -> translator info
    this.languageQueues = new Map(); // sessionId -> language -> translations
    this.userPreferences = new Map(); // userId -> language preferences

    // Initialize dynamic translation manager
    this.translationManager = new TranslationManager(config);
    this.initializeTranslationManager();
  }

  // Initialize the translation manager with all available providers
  async initializeTranslationManager() {
    try {
      await this.translationManager.initialize();
      console.log('✅ MultiLanguageTranslationService: Translation providers ready');
    } catch (error) {
      console.error('❌ Failed to initialize translation providers:', error);
    }
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

  // Process incoming translation from mosque/imam with user preferences
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

      // Get all session participants and their language preferences
      const participantLanguages = await this.getSessionParticipantLanguages(sessionId);

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
          targetLanguages: participantLanguages,
          userPreferenceBased: true
        }
      });

      await translation.save();

      // Automatically translate to all required languages based on user preferences
      await this.translateToUserPreferredLanguages(translationId, originalText, participantLanguages, context);

      // Notify all active translators for this session
      this.notifyTranslators(sessionId, {
        type: 'new_translation_request',
        translationId,
        originalText,
        context,
        sequenceNumber,
        targetLanguages: participantLanguages
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

  // Enhanced translation with caching and religious context
  async translateWithCache(sourceText, targetLanguage, contextType = 'religious', provider = 'google') {
    try {
      // Check cache first
      const cachedTranslation = await TranslationCache.findCachedTranslation(
        sourceText,
        'ar',
        targetLanguage,
        contextType
      );

      if (cachedTranslation) {
        await cachedTranslation.incrementUsage();
        console.log(`📋 Using cached translation for: ${sourceText.substring(0, 50)}...`);
        return {
          text: cachedTranslation.translatedText,
          confidence: cachedTranslation.confidenceScore,
          provider: cachedTranslation.provider,
          isCached: true,
          cacheId: cachedTranslation.cacheId
        };
      }

      // No cache hit, translate with provider
      const translation = await this.translateWithProvider(sourceText, targetLanguage, provider, contextType);

      // Cache the result
      if (translation && translation.text) {
        await TranslationCache.createCacheEntry(
          sourceText,
          'ar',
          targetLanguage,
          translation.text,
          provider,
          contextType,
          {
            confidence: translation.confidence,
            quality: translation.quality || 5,
            cost: translation.cost || 0,
            isReligious: contextType === 'religious'
          }
        );
        console.log(`💾 Cached new translation for: ${sourceText.substring(0, 50)}...`);
      }

      return translation;

    } catch (error) {
      console.error('Error in translateWithCache:', error);
      throw error;
    }
  }

  // Translate with specific provider using dynamic translation manager
  async translateWithProvider(sourceText, targetLanguage, provider, contextType) {
    try {
      console.log(`🔄 Translating with ${provider}: ${sourceText.substring(0, 50)}...`);

      // Use the dynamic translation manager
      const result = await this.translationManager.translate(
        sourceText,
        this.getLanguageCode(targetLanguage), // Convert language name to code
        'ar', // Source language (Arabic)
        {
          provider: provider,
          context: contextType || 'religious' // Default to religious context for mosque
        }
      );

      if (result.success) {
        return {
          text: result.text,
          confidence: result.confidence,
          provider: result.provider,
          processingTime: result.processingTime,
          cost: result.cost || 0.001
        };
      } else {
        throw new Error(result.error?.message || 'Translation failed');
      }

    } catch (error) {
      console.error(`❌ Translation failed with ${provider}:`, error);

      // Return error in expected format
      return {
        text: `[Translation Error: ${error.message}]`,
        confidence: 0,
        provider: provider,
        processingTime: 0,
        cost: 0,
        error: error.message
      };
    }
  }

  // Convert language name to ISO code
  getLanguageCode(languageName) {
    const languageMap = {
      'English': 'en',
      'French': 'fr',
      'Spanish': 'es',
      'German': 'de',
      'Italian': 'it',
      'Portuguese': 'pt',
      'Russian': 'ru',
      'Japanese': 'ja',
      'Korean': 'ko',
      'Chinese': 'zh',
      'Hindi': 'hi',
      'Urdu': 'ur',
      'Turkish': 'tr'
    };

    return languageMap[languageName] || languageName.toLowerCase();
  }

  // Save translation result to database
  async saveTranslationResult(transcriptionId, targetLanguage, translationData) {
    try {
      const translationId = `result_${transcriptionId}_${targetLanguage}_${Date.now()}`;

      const translationResult = new TranslationResult({
        translationId,
        transcriptionId,
        targetLanguage,
        sourceText: translationData.sourceText,
        translatedText: translationData.text,
        translationProvider: translationData.provider,
        confidenceScore: translationData.confidence || 0,
        contextType: translationData.contextType || 'religious',
        processingTimeMs: translationData.processingTime || 0,
        isCached: translationData.isCached || false,
        cost: {
          amount: translationData.cost || 0,
          currency: 'USD',
          provider: translationData.provider
        }
      });

      await translationResult.save();
      console.log(`💾 Translation result saved: ${translationId}`);
      return translationResult;

    } catch (error) {
      console.error('Error saving translation result:', error);
      return null;
    }
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

  // Get translation provider statistics
  getTranslationProviderStats() {
    if (!this.translationManager) {
      return { error: 'Translation manager not initialized' };
    }

    return this.translationManager.getStats();
  }

  // Test all translation providers
  async testTranslationProviders() {
    if (!this.translationManager) {
      return { error: 'Translation manager not initialized' };
    }

    return await this.translationManager.testAllProviders();
  }

  // Get available translation providers
  getAvailableProviders() {
    if (!this.translationManager) {
      return [];
    }

    return this.translationManager.getAvailableProviders();
  }

  // Set default translation provider
  setDefaultTranslationProvider(providerName) {
    if (!this.translationManager) {
      return false;
    }

    return this.translationManager.setDefaultProvider(providerName);
  }

  // Get language preferences for all session participants
  async getSessionParticipantLanguages(sessionId) {
    try {
      // Get all users in the session (this would need to be implemented based on your session management)
      // For now, return default German + English combination
      const defaultLanguages = ['de', 'en']; // German as primary, English as common secondary

      // TODO: Implement actual session participant lookup
      // const participants = await this.getSessionParticipants(sessionId);
      // const languages = new Set();
      //
      // for (const participant of participants) {
      //   const userLangs = await UserLanguagePreferencesService.getTranslationLanguages(participant.userId);
      //   userLangs.languages.forEach(lang => languages.add(lang));
      // }

      return defaultLanguages;
    } catch (error) {
      console.error('Error getting session participant languages:', error);
      return ['de', 'en']; // Fallback to German + English
    }
  }

  // Automatically translate to user preferred languages
  async translateToUserPreferredLanguages(translationId, originalText, targetLanguages, context) {
    try {
      console.log(`🌍 Auto-translating to user preferred languages: ${targetLanguages.join(', ')}`);

      const translationPromises = targetLanguages.map(async (language) => {
        try {
          const result = await this.translateWithCache(
            originalText,
            this.getLanguageName(language), // Convert code to name
            context,
            'google' // Use default provider
          );

          if (result && result.text) {
            // Save translation result
            await this.saveTranslationToDatabase(translationId, language, result);

            // Notify session participants
            this.notifySessionParticipants(translationId.split('_')[1], {
              type: 'translation_update',
              translationId,
              language,
              languageCode: language,
              text: result.text,
              confidence: result.confidence,
              provider: result.provider
            });

            console.log(`✅ Auto-translated to ${language}: ${result.text.substring(0, 50)}...`);
          }
        } catch (error) {
          console.error(`❌ Auto-translation failed for ${language}:`, error);
        }
      });

      await Promise.all(translationPromises);
    } catch (error) {
      console.error('Error in auto-translation:', error);
    }
  }

  // Convert language code to language name
  getLanguageName(code) {
    const codeToName = {
      'de': 'German',
      'en': 'English',
      'fr': 'French',
      'es': 'Spanish',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'tr': 'Turkish',
      'ar': 'Arabic'
    };

    return codeToName[code] || code;
  }

  // Save translation to database
  async saveTranslationToDatabase(translationId, languageCode, translationResult) {
    try {
      const translation = await Translation.findOne({ translationId });
      if (!translation) {
        console.error('Translation document not found:', translationId);
        return;
      }

      // Add or update translation for this language
      const existingIndex = translation.translations.findIndex(t => t.language === languageCode);

      const translationData = {
        language: languageCode,
        text: translationResult.text,
        confidence: translationResult.confidence,
        provider: translationResult.provider,
        timestamp: new Date(),
        isAutoGenerated: true
      };

      if (existingIndex >= 0) {
        translation.translations[existingIndex] = translationData;
      } else {
        translation.translations.push(translationData);
      }

      await translation.save();
      console.log(`💾 Saved ${languageCode} translation to database`);
    } catch (error) {
      console.error('Error saving translation to database:', error);
    }
  }

  // Notify session participants about translation updates
  notifySessionParticipants(sessionId, data) {
    try {
      // This would integrate with your WebSocket system
      // For now, just log the notification
      console.log(`📢 Notifying session ${sessionId} participants:`, {
        type: data.type,
        language: data.language,
        textPreview: data.text?.substring(0, 30) + '...'
      });

      // TODO: Implement actual WebSocket notification
      // io.to(sessionId).emit('translation_update', data);
    } catch (error) {
      console.error('Error notifying session participants:', error);
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

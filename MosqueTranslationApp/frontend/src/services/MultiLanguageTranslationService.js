// Multi-Language Translation Service for Frontend
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

class MultiLanguageTranslationService {
  constructor() {
    this.supportedLanguages = [];
    this.languageGroups = {};
    this.languageDetails = {};
    this.userPreferences = null;
    this.socket = null;
  }

  // Initialize the service
  async initialize() {
    try {
      await this.loadSupportedLanguages();
      await this.loadUserPreferences();
      return true;
    } catch (error) {
      console.error('Failed to initialize MultiLanguageTranslationService:', error);
      return false;
    }
  }

  // Load supported languages from backend
  async loadSupportedLanguages() {
    try {
      // Use ApiService for better error handling
      const { default: ApiService } = await import('./ApiService');
      const response = await ApiService.get('/translation/languages');

      if (response && response.success && response.data) {
        this.supportedLanguages = response.data.languages;
        this.languageGroups = response.data.languageGroups;
        this.languageDetails = response.data.languageDetails;

        // Cache for offline use
        await AsyncStorage.setItem('supportedLanguages', JSON.stringify(response.data));
        return;
      }
    } catch (error) {
      console.error('Failed to load supported languages:', error);
    }

    // Try to load from cache first
    try {
      const cached = await AsyncStorage.getItem('supportedLanguages');
      if (cached) {
        const data = JSON.parse(cached);
        this.supportedLanguages = data.languages;
        this.languageGroups = data.languageGroups;
        this.languageDetails = data.languageDetails;
        return;
      }
    } catch (cacheError) {
      console.error('Failed to load from cache:', cacheError);
    }

    // Fallback to hardcoded languages if both API and cache fail
    this.supportedLanguages = [
      'Arabic', 'English', 'Urdu', 'Turkish', 'Persian', 'Malay', 'Indonesian',
      'German', 'French', 'Spanish', 'Italian', 'Dutch', 'Portuguese', 'Russian',
      'Chinese', 'Japanese', 'Korean', 'Hindi', 'Bengali', 'Tamil', 'Thai',
      'Swahili', 'Hausa', 'Amharic', 'Albanian', 'Bosnian', 'Kurdish', 'Pashto', 'Somali', 'Uzbek'
    ];

    this.languageGroups = {
      'European': ['German', 'French', 'Spanish', 'Italian', 'Dutch', 'Portuguese', 'Russian', 'Albanian', 'Bosnian'],
      'Asian': ['Chinese', 'Japanese', 'Korean', 'Hindi', 'Bengali', 'Tamil', 'Thai', 'Malay', 'Indonesian'],
      'Islamic': ['Arabic', 'Urdu', 'Turkish', 'Persian', 'Kurdish', 'Pashto'],
      'African': ['Swahili', 'Hausa', 'Amharic', 'Somali'],
      'Popular': ['English', 'German', 'French', 'Spanish', 'Turkish', 'Urdu']
    };

    this.languageDetails = {
      'Arabic': { code: 'ar', rtl: true, script: 'Arabic', family: 'Semitic' },
      'English': { code: 'en', rtl: false, script: 'Latin', family: 'Germanic' },
      'German': { code: 'de', rtl: false, script: 'Latin', family: 'Germanic' },
      'French': { code: 'fr', rtl: false, script: 'Latin', family: 'Romance' },
      'Spanish': { code: 'es', rtl: false, script: 'Latin', family: 'Romance' },
      'Turkish': { code: 'tr', rtl: false, script: 'Latin', family: 'Turkic' },
      'Urdu': { code: 'ur', rtl: true, script: 'Arabic', family: 'Indo-European' }
    };
  }

  // Load user translation preferences
  async loadUserPreferences() {
    try {
      // Try to load from backend if authenticated
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const response = await fetch(`${API_BASE_URL}/translation/preferences`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.userPreferences = data.data;
          await AsyncStorage.setItem('translationPreferences', JSON.stringify(data.data));
          return;
        }
      }
      
      // Load from local storage
      const cached = await AsyncStorage.getItem('translationPreferences');
      if (cached) {
        this.userPreferences = JSON.parse(cached);
      } else {
        // Set default preferences
        this.userPreferences = this.getDefaultPreferences();
        await this.saveUserPreferences(this.userPreferences);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      this.userPreferences = this.getDefaultPreferences();
    }
  }

  // Get default translation preferences
  getDefaultPreferences() {
    return {
      primaryLanguage: 'English',
      secondaryLanguage: null,
      showDualSubtitles: false,
      preferredLanguages: [
        { language: 'English', priority: 1 }
      ],
      autoLanguageDetection: true,
      translationSpeed: 'normal',
      showOriginalText: true,
      translationDisplay: 'bottom',
      fontSettings: {
        primaryFontSize: 'medium',
        secondaryFontSize: 'small',
        fontWeight: 'normal',
        lineHeight: 'normal'
      },
      colorSettings: {
        primaryTextColor: '#000000',
        secondaryTextColor: '#666666',
        backgroundColor: '#FFFFFF',
        highlightColor: '#2E7D32'
      }
    };
  }

  // Save user preferences
  async saveUserPreferences(preferences) {
    try {
      this.userPreferences = { ...this.userPreferences, ...preferences };
      
      // Save to local storage
      await AsyncStorage.setItem('translationPreferences', JSON.stringify(this.userPreferences));
      
      // Save to backend if authenticated
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        await fetch(`${API_BASE_URL}/translation/preferences`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(preferences)
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      return false;
    }
  }

  // Get user preferences
  getUserPreferences() {
    return this.userPreferences || this.getDefaultPreferences();
  }

  // Get supported languages
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  // Get language groups
  getLanguageGroups() {
    return this.languageGroups;
  }

  // Get language details
  getLanguageDetails(language) {
    return this.languageDetails[language] || null;
  }

  // Check if language is RTL
  isRTLLanguage(language) {
    const details = this.getLanguageDetails(language);
    return details ? details.rtl : false;
  }

  // Get popular languages
  getPopularLanguages() {
    return this.languageGroups.Popular || ['English', 'German', 'French', 'Spanish', 'Turkish', 'Urdu'];
  }

  // Format translation for display based on user preferences
  formatTranslationForDisplay(translation) {
    const prefs = this.getUserPreferences();
    const formatted = {
      id: translation.id,
      originalText: translation.originalText,
      sequenceNumber: translation.sequenceNumber,
      timestamp: translation.timestamp,
      context: translation.context,
      translations: {},
      availableLanguages: translation.availableLanguages || []
    };

    // Add primary translation
    if (translation.translations && translation.translations[prefs.primaryLanguage]) {
      formatted.translations.primary = {
        language: prefs.primaryLanguage,
        text: translation.translations[prefs.primaryLanguage].text,
        confidence: translation.translations[prefs.primaryLanguage].confidence,
        isRTL: this.isRTLLanguage(prefs.primaryLanguage)
      };
    }

    // Add secondary translation if dual subtitles enabled
    if (prefs.showDualSubtitles && prefs.secondaryLanguage && 
        translation.translations && translation.translations[prefs.secondaryLanguage]) {
      formatted.translations.secondary = {
        language: prefs.secondaryLanguage,
        text: translation.translations[prefs.secondaryLanguage].text,
        confidence: translation.translations[prefs.secondaryLanguage].confidence,
        isRTL: this.isRTLLanguage(prefs.secondaryLanguage)
      };
    }

    // Add all available translations for language switching
    if (translation.translations) {
      formatted.allTranslations = Object.keys(translation.translations).map(lang => ({
        language: lang,
        text: translation.translations[lang].text,
        confidence: translation.translations[lang].confidence,
        isRTL: this.isRTLLanguage(lang)
      }));
    }

    return formatted;
  }

  // Get font size value
  getFontSizeValue(size) {
    const sizes = {
      'small': 14,
      'medium': 16,
      'large': 18,
      'extra-large': 20
    };
    return sizes[size] || sizes.medium;
  }

  // Get line height value
  getLineHeightValue(height) {
    const heights = {
      'compact': 1.2,
      'normal': 1.4,
      'relaxed': 1.6
    };
    return heights[height] || heights.normal;
  }

  // Get translation display styles based on preferences
  getTranslationStyles() {
    const prefs = this.getUserPreferences();
    
    return {
      container: {
        backgroundColor: prefs.colorSettings.backgroundColor,
        padding: 10,
        borderRadius: 8,
        marginVertical: 5
      },
      originalText: {
        fontSize: this.getFontSizeValue('medium'),
        color: '#2E7D32',
        fontWeight: 'bold',
        textAlign: 'right',
        marginBottom: 8,
        lineHeight: this.getLineHeightValue(prefs.fontSettings.lineHeight)
      },
      primaryTranslation: {
        fontSize: this.getFontSizeValue(prefs.fontSettings.primaryFontSize),
        color: prefs.colorSettings.primaryTextColor,
        fontWeight: prefs.fontSettings.fontWeight,
        marginBottom: prefs.showDualSubtitles ? 5 : 0,
        lineHeight: this.getLineHeightValue(prefs.fontSettings.lineHeight)
      },
      secondaryTranslation: {
        fontSize: this.getFontSizeValue(prefs.fontSettings.secondaryFontSize),
        color: prefs.colorSettings.secondaryTextColor,
        fontWeight: 'normal',
        fontStyle: 'italic',
        lineHeight: this.getLineHeightValue(prefs.fontSettings.lineHeight)
      },
      confidenceIndicator: {
        fontSize: 12,
        color: '#888',
        marginTop: 2
      },
      languageLabel: {
        fontSize: 10,
        color: prefs.colorSettings.highlightColor,
        fontWeight: 'bold',
        marginBottom: 2
      }
    };
  }

  // Set socket instance for real-time updates
  setSocket(socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  // Setup socket listeners for translation updates
  setupSocketListeners() {
    if (!this.socket) return;

    // Listen for original translations
    this.socket.on('original_translation', (data) => {
      console.log('New original translation:', data);
      // Emit event for components to listen
      this.emitTranslationEvent('original_translation', data);
    });

    // Listen for language translation updates
    this.socket.on('language_translation_update', (data) => {
      console.log('Language translation update:', data);
      this.emitTranslationEvent('language_translation_update', data);
    });

    // Listen for translator joined
    this.socket.on('translator_joined', (data) => {
      console.log('Translator joined:', data);
      this.emitTranslationEvent('translator_joined', data);
    });
  }

  // Emit translation events (using a simple event system)
  emitTranslationEvent(eventType, data) {
    // This would be replaced with a proper event emitter in a real app
    if (this.eventListeners && this.eventListeners[eventType]) {
      this.eventListeners[eventType].forEach(callback => callback(data));
    }
  }

  // Add event listener
  addEventListener(eventType, callback) {
    if (!this.eventListeners) {
      this.eventListeners = {};
    }
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    this.eventListeners[eventType].push(callback);
  }

  // Remove event listener
  removeEventListener(eventType, callback) {
    if (this.eventListeners && this.eventListeners[eventType]) {
      this.eventListeners[eventType] = this.eventListeners[eventType].filter(cb => cb !== callback);
    }
  }

  // Register as translator for a language
  async registerAsTranslator(language) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('register_translator', { language }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Send language translation
  async sendLanguageTranslation(translationId, language, text, confidence = null) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('send_language_translation', {
        translationId,
        language,
        text,
        confidence
      }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Update language preferences via socket
  async updateLanguagePreferencesRealtime(preferences) {
    if (!this.socket) {
      return this.saveUserPreferences(preferences);
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('update_language_preferences', preferences, (response) => {
        if (response.success) {
          this.userPreferences = { ...this.userPreferences, ...preferences };
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }
}

// Export singleton instance
const multiLanguageTranslationService = new MultiLanguageTranslationService();
export default multiLanguageTranslationService;

// Multi-Language Translation View Component
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import multiLanguageTranslationService from '../../services/MultiLanguageTranslationService';
import LanguageSelector from './LanguageSelector';
import TranslationItem from './TranslationItem';
import TranslatorInterface from './TranslatorInterface';

const { width, height } = Dimensions.get('window');

const MultiLanguageTranslationView = ({ 
  sessionId, 
  socket, 
  userType = 'individual',
  isVisible = true 
}) => {
  const [translations, setTranslations] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [activeTranslators, setActiveTranslators] = useState({});
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showTranslatorInterface, setShowTranslatorInterface] = useState(false);
  const [isTranslator, setIsTranslator] = useState(false);
  const [translatorLanguage, setTranslatorLanguage] = useState(null);
  const [loading, setLoading] = useState(true);

  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    initializeComponent();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      multiLanguageTranslationService.setSocket(socket);
      setupSocketListeners();
    }
  }, [socket]);

  useEffect(() => {
    if (isVisible) {
      showComponent();
    } else {
      hideComponent();
    }
  }, [isVisible]);

  const initializeComponent = async () => {
    try {
      setLoading(true);
      
      // Initialize translation service
      await multiLanguageTranslationService.initialize();
      
      // Load user preferences
      const prefs = multiLanguageTranslationService.getUserPreferences();
      setUserPreferences(prefs);
      
      // Load available languages
      const languages = multiLanguageTranslationService.getSupportedLanguages();
      setAvailableLanguages(languages);
      
      // Load existing translations for session
      if (sessionId) {
        await loadSessionTranslations();
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize translation component:', error);
      setLoading(false);
    }
  };

  const loadSessionTranslations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/translation/session/${sessionId}?limit=50`);
      const data = await response.json();
      
      if (data.success) {
        const formattedTranslations = data.data.translations.map(translation =>
          multiLanguageTranslationService.formatTranslationForDisplay(translation)
        );
        setTranslations(formattedTranslations);
      }
    } catch (error) {
      console.error('Failed to load session translations:', error);
    }
  };

  const setupSocketListeners = () => {
    // Listen for original translations
    multiLanguageTranslationService.addEventListener('original_translation', handleOriginalTranslation);
    
    // Listen for language translation updates
    multiLanguageTranslationService.addEventListener('language_translation_update', handleLanguageTranslationUpdate);
    
    // Listen for translator updates
    multiLanguageTranslationService.addEventListener('translator_joined', handleTranslatorJoined);
  };

  const handleOriginalTranslation = (data) => {
    const newTranslation = {
      id: data.translationId,
      originalText: data.originalText,
      sequenceNumber: data.sequenceNumber,
      timestamp: data.timestamp,
      context: data.context,
      translations: {},
      availableLanguages: data.targetLanguages || []
    };

    const formatted = multiLanguageTranslationService.formatTranslationForDisplay(newTranslation);
    
    setTranslations(prev => [formatted, ...prev]);
    
    // Auto-scroll to new translation
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const handleLanguageTranslationUpdate = (data) => {
    setTranslations(prev => {
      const updated = [...prev];
      const translationIndex = updated.findIndex(t => t.id === data.translationId);
      
      if (translationIndex !== -1) {
        const translation = updated[translationIndex];
        
        // Add the new language translation
        if (!translation.translations) {
          translation.translations = {};
        }
        
        translation.translations[data.language] = {
          text: data.text,
          confidence: data.confidence
        };
        
        // Reformat for display with updated preferences
        updated[translationIndex] = multiLanguageTranslationService.formatTranslationForDisplay(translation);
      }
      
      return updated;
    });
  };

  const handleTranslatorJoined = (data) => {
    setActiveTranslators(prev => ({
      ...prev,
      [data.language]: [...(prev[data.language] || []), {
        translatorId: data.translatorId,
        userType: data.userType
      }]
    }));
  };

  const showComponent = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const hideComponent = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handleLanguagePreferenceChange = async (preferences) => {
    try {
      await multiLanguageTranslationService.saveUserPreferences(preferences);
      setUserPreferences(multiLanguageTranslationService.getUserPreferences());
      
      // Reformat existing translations with new preferences
      const reformattedTranslations = translations.map(translation =>
        multiLanguageTranslationService.formatTranslationForDisplay(translation)
      );
      setTranslations(reformattedTranslations);
      
      // Update preferences in real-time via socket
      if (socket) {
        await multiLanguageTranslationService.updateLanguagePreferencesRealtime(preferences);
      }
    } catch (error) {
      console.error('Failed to update language preferences:', error);
    }
  };

  const handleBecomeTranslator = async (language) => {
    try {
      await multiLanguageTranslationService.registerAsTranslator(language);
      setIsTranslator(true);
      setTranslatorLanguage(language);
      setShowTranslatorInterface(true);
    } catch (error) {
      console.error('Failed to register as translator:', error);
      alert('Failed to register as translator. Please try again.');
    }
  };

  const handleSendTranslation = async (translationId, text, confidence) => {
    try {
      await multiLanguageTranslationService.sendLanguageTranslation(
        translationId,
        translatorLanguage,
        text,
        confidence
      );
    } catch (error) {
      console.error('Failed to send translation:', error);
      alert('Failed to send translation. Please try again.');
    }
  };

  const cleanup = () => {
    multiLanguageTranslationService.removeEventListener('original_translation', handleOriginalTranslation);
    multiLanguageTranslationService.removeEventListener('language_translation_update', handleLanguageTranslationUpdate);
    multiLanguageTranslationService.removeEventListener('translator_joined', handleTranslatorJoined);
  };

  const styles = multiLanguageTranslationService.getTranslationStyles();

  if (loading) {
    return (
      <View style={[defaultStyles.container, defaultStyles.centered]}>
        <Text style={defaultStyles.loadingText}>Loading translations...</Text>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        defaultStyles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {/* Header with controls */}
      <View style={defaultStyles.header}>
        <Text style={defaultStyles.headerTitle}>Live Translation</Text>
        
        <View style={defaultStyles.headerControls}>
          {/* Language selector button */}
          <TouchableOpacity
            style={defaultStyles.controlButton}
            onPress={() => setShowLanguageSelector(true)}
          >
            <Icon name="language" size={24} color="#2E7D32" />
            <Text style={defaultStyles.controlButtonText}>
              {userPreferences?.primaryLanguage || 'English'}
            </Text>
          </TouchableOpacity>

          {/* Translator button */}
          {userType === 'individual' && !isTranslator && (
            <TouchableOpacity
              style={defaultStyles.controlButton}
              onPress={() => setShowTranslatorInterface(true)}
            >
              <Icon name="translate" size={24} color="#2E7D32" />
              <Text style={defaultStyles.controlButtonText}>Translate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active translators indicator */}
      {Object.keys(activeTranslators).length > 0 && (
        <View style={defaultStyles.translatorsIndicator}>
          <Icon name="people" size={16} color="#666" />
          <Text style={defaultStyles.translatorsText}>
            Active translators: {Object.keys(activeTranslators).join(', ')}
          </Text>
        </View>
      )}

      {/* Translations list */}
      <ScrollView
        ref={scrollViewRef}
        style={defaultStyles.translationsList}
        showsVerticalScrollIndicator={false}
      >
        {translations.map((translation, index) => (
          <TranslationItem
            key={translation.id}
            translation={translation}
            styles={styles}
            userPreferences={userPreferences}
            onLanguageSwitch={handleLanguagePreferenceChange}
          />
        ))}
        
        {translations.length === 0 && (
          <View style={defaultStyles.emptyState}>
            <Icon name="translate" size={48} color="#ccc" />
            <Text style={defaultStyles.emptyStateText}>
              Waiting for translations...
            </Text>
            <Text style={defaultStyles.emptyStateSubtext}>
              The imam will start speaking soon
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
        availableLanguages={availableLanguages}
        languageGroups={multiLanguageTranslationService.getLanguageGroups()}
        currentPreferences={userPreferences}
        onPreferencesChange={handleLanguagePreferenceChange}
      />

      {/* Translator Interface Modal */}
      <TranslatorInterface
        visible={showTranslatorInterface}
        onClose={() => setShowTranslatorInterface(false)}
        availableLanguages={availableLanguages}
        onBecomeTranslator={handleBecomeTranslator}
        onSendTranslation={handleSendTranslation}
        isTranslator={isTranslator}
        translatorLanguage={translatorLanguage}
        pendingTranslations={translations.filter(t => 
          !t.translations.primary || 
          (userPreferences?.showDualSubtitles && !t.translations.secondary)
        )}
      />
    </Animated.View>
  );
};

const defaultStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  headerControls: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    gap: 4,
  },
  controlButtonText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  translatorsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e8f5e8',
    gap: 8,
  },
  translatorsText: {
    fontSize: 12,
    color: '#666',
  },
  translationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
});

export default MultiLanguageTranslationView;

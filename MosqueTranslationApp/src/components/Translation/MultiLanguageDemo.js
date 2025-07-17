// Multi-Language Translation Demo Component
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import multiLanguageTranslationService from '../../services/MultiLanguageTranslationService';
import LanguageSelector from './LanguageSelector';

const MultiLanguageDemo = () => {
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [demoTranslations, setDemoTranslations] = useState([]);

  useEffect(() => {
    initializeDemo();
  }, []);

  const initializeDemo = async () => {
    try {
      await multiLanguageTranslationService.initialize();
      
      const languages = multiLanguageTranslationService.getSupportedLanguages();
      setSupportedLanguages(languages);
      
      const prefs = multiLanguageTranslationService.getUserPreferences();
      setUserPreferences(prefs);
      
      // Create demo translations
      createDemoTranslations();
    } catch (error) {
      console.error('Failed to initialize demo:', error);
    }
  };

  const createDemoTranslations = () => {
    const demoData = [
      {
        id: 'demo1',
        originalText: 'بسم الله الرحمن الرحيم',
        translations: {
          'English': { text: 'In the name of Allah, the Most Gracious, the Most Merciful', confidence: 0.95 },
          'German': { text: 'Im Namen Allahs, des Allerbarmers, des Barmherzigen', confidence: 0.92 },
          'French': { text: 'Au nom d\'Allah, le Tout Miséricordieux, le Très Miséricordieux', confidence: 0.90 },
          'Spanish': { text: 'En el nombre de Alá, el Clemente, el Misericordioso', confidence: 0.88 },
          'Turkish': { text: 'Rahman ve Rahim olan Allah\'ın adıyla', confidence: 0.93 }
        },
        context: 'quran',
        sequenceNumber: 1,
        timestamp: new Date()
      },
      {
        id: 'demo2',
        originalText: 'الحمد لله رب العالمين',
        translations: {
          'English': { text: 'All praise is due to Allah, Lord of all the worlds', confidence: 0.96 },
          'German': { text: 'Alles Lob gebührt Allah, dem Herrn der Welten', confidence: 0.94 },
          'French': { text: 'Louange à Allah, Seigneur de l\'univers', confidence: 0.91 },
          'Spanish': { text: 'Las alabanzas pertenecen a Alá, Señor de los mundos', confidence: 0.89 },
          'Turkish': { text: 'Hamd, âlemlerin Rabbi Allah\'a mahsustur', confidence: 0.95 }
        },
        context: 'quran',
        sequenceNumber: 2,
        timestamp: new Date()
      },
      {
        id: 'demo3',
        originalText: 'أشهد أن لا إله إلا الله وأشهد أن محمداً رسول الله',
        translations: {
          'English': { text: 'I bear witness that there is no god but Allah, and I bear witness that Muhammad is the messenger of Allah', confidence: 0.97 },
          'German': { text: 'Ich bezeuge, dass es keinen Gott gibt außer Allah, und ich bezeuge, dass Muhammad der Gesandte Allahs ist', confidence: 0.93 },
          'French': { text: 'J\'atteste qu\'il n\'y a de divinité qu\'Allah et j\'atteste que Muhammad est le messager d\'Allah', confidence: 0.92 },
          'Spanish': { text: 'Atestiguo que no hay más dios que Alá y atestiguo que Muhammad es el mensajero de Alá', confidence: 0.90 },
          'Turkish': { text: 'Allah\'tan başka ilah olmadığına ve Muhammed\'in Allah\'ın elçisi olduğuna şahitlik ederim', confidence: 0.96 }
        },
        context: 'prayer',
        sequenceNumber: 3,
        timestamp: new Date()
      }
    ];

    const formattedTranslations = demoData.map(translation =>
      multiLanguageTranslationService.formatTranslationForDisplay(translation)
    );
    
    setDemoTranslations(formattedTranslations);
  };

  const handleLanguagePreferenceChange = async (preferences) => {
    try {
      await multiLanguageTranslationService.saveUserPreferences(preferences);
      setUserPreferences(multiLanguageTranslationService.getUserPreferences());
      
      // Reformat demo translations with new preferences
      createDemoTranslations();
      
      Alert.alert('Success', 'Language preferences updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update preferences');
    }
  };

  const getLanguageFlag = (language) => {
    const flags = {
      'English': '🇺🇸', 'German': '🇩🇪', 'French': '🇫🇷', 'Spanish': '🇪🇸',
      'Turkish': '🇹🇷', 'Arabic': '🇸🇦', 'Urdu': '🇵🇰'
    };
    return flags[language] || '🌐';
  };

  const styles = multiLanguageTranslationService.getTranslationStyles();

  return (
    <View style={demoStyles.container}>
      {/* Header */}
      <View style={demoStyles.header}>
        <Text style={demoStyles.headerTitle}>Multi-Language Translation Demo</Text>
        <TouchableOpacity
          style={demoStyles.settingsButton}
          onPress={() => setShowLanguageSelector(true)}
        >
          <Icon name="settings" size={24} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      {/* Current Settings */}
      <View style={demoStyles.settingsCard}>
        <Text style={demoStyles.settingsTitle}>Current Settings</Text>
        
        <View style={demoStyles.settingRow}>
          <Text style={demoStyles.settingLabel}>Primary Language:</Text>
          <View style={demoStyles.languageChip}>
            <Text style={demoStyles.languageFlag}>
              {getLanguageFlag(userPreferences?.primaryLanguage)}
            </Text>
            <Text style={demoStyles.languageText}>
              {userPreferences?.primaryLanguage || 'English'}
            </Text>
          </View>
        </View>

        {userPreferences?.showDualSubtitles && userPreferences?.secondaryLanguage && (
          <View style={demoStyles.settingRow}>
            <Text style={demoStyles.settingLabel}>Secondary Language:</Text>
            <View style={demoStyles.languageChip}>
              <Text style={demoStyles.languageFlag}>
                {getLanguageFlag(userPreferences.secondaryLanguage)}
              </Text>
              <Text style={demoStyles.languageText}>
                {userPreferences.secondaryLanguage}
              </Text>
            </View>
          </View>
        )}

        <View style={demoStyles.settingRow}>
          <Text style={demoStyles.settingLabel}>Dual Subtitles:</Text>
          <Text style={[
            demoStyles.settingValue,
            { color: userPreferences?.showDualSubtitles ? '#4CAF50' : '#999' }
          ]}>
            {userPreferences?.showDualSubtitles ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>

      {/* Demo Translations */}
      <ScrollView style={demoStyles.translationsList}>
        <Text style={demoStyles.listTitle}>Demo Translations</Text>
        
        {demoTranslations.map((translation, index) => (
          <View key={translation.id} style={styles.container}>
            {/* Original Arabic text */}
            <View style={demoStyles.originalContainer}>
              <Text style={styles.originalText}>
                {translation.originalText}
              </Text>
            </View>

            {/* Primary translation */}
            {translation.translations.primary && (
              <View style={demoStyles.translationContainer}>
                <Text style={styles.languageLabel}>
                  {translation.translations.primary.language}
                </Text>
                <Text style={styles.primaryTranslation}>
                  {translation.translations.primary.text}
                </Text>
              </View>
            )}

            {/* Secondary translation (dual subtitles) */}
            {userPreferences?.showDualSubtitles && translation.translations.secondary && (
              <View style={demoStyles.translationContainer}>
                <Text style={styles.languageLabel}>
                  {translation.translations.secondary.language}
                </Text>
                <Text style={styles.secondaryTranslation}>
                  {translation.translations.secondary.text}
                </Text>
              </View>
            )}

            {/* Available languages indicator */}
            <View style={demoStyles.availableLanguages}>
              <Text style={demoStyles.availableTitle}>Available in:</Text>
              <View style={demoStyles.languageFlags}>
                {Object.keys(translation.translations).map(lang => (
                  <Text key={lang} style={demoStyles.flagEmoji}>
                    {getLanguageFlag(lang)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
        availableLanguages={supportedLanguages}
        languageGroups={multiLanguageTranslationService.getLanguageGroups()}
        currentPreferences={userPreferences}
        onPreferencesChange={handleLanguagePreferenceChange}
      />
    </View>
  );
};

const demoStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  settingsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#666',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  languageFlag: {
    fontSize: 14,
  },
  languageText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  translationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  originalContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderRightWidth: 3,
    borderRightColor: '#2E7D32',
  },
  translationContainer: {
    marginBottom: 8,
  },
  availableLanguages: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  availableTitle: {
    fontSize: 12,
    color: '#666',
  },
  languageFlags: {
    flexDirection: 'row',
    gap: 4,
  },
  flagEmoji: {
    fontSize: 16,
  },
});

export default MultiLanguageDemo;

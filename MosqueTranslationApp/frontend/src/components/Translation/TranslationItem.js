// Translation Item Component - Displays individual translations with dual subtitle support
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const TranslationItem = ({ 
  translation, 
  styles, 
  userPreferences, 
  onLanguageSwitch 
}) => {
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Animate in when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleLanguageSwitch = (language) => {
    if (language === userPreferences.primaryLanguage) return;
    
    const newPreferences = {
      ...userPreferences,
      primaryLanguage: language
    };
    
    onLanguageSwitch(newPreferences);
    setShowAllLanguages(false);
  };

  const handleSecondaryLanguageSwitch = (language) => {
    const newPreferences = {
      ...userPreferences,
      secondaryLanguage: language,
      showDualSubtitles: true
    };
    
    onLanguageSwitch(newPreferences);
    setShowAllLanguages(false);
  };

  const toggleDualSubtitles = () => {
    const newPreferences = {
      ...userPreferences,
      showDualSubtitles: !userPreferences.showDualSubtitles
    };
    
    onLanguageSwitch(newPreferences);
  };

  const getConfidenceColor = (confidence) => {
    if (!confidence) return '#999';
    if (confidence >= 0.9) return '#4CAF50';
    if (confidence >= 0.7) return '#FF9800';
    return '#F44336';
  };

  const getConfidenceText = (confidence) => {
    if (!confidence) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getContextIcon = (context) => {
    const icons = {
      'quran': 'book',
      'hadith': 'format-quote',
      'dua': 'favorite',
      'prayer': 'accessibility',
      'sermon': 'record-voice-over',
      'announcement': 'campaign',
      'general': 'chat'
    };
    return icons[context] || 'chat';
  };

  const getContextColor = (context) => {
    const colors = {
      'quran': '#2E7D32',
      'hadith': '#1976D2',
      'dua': '#7B1FA2',
      'prayer': '#F57C00',
      'sermon': '#5D4037',
      'announcement': '#D32F2F',
      'general': '#616161'
    };
    return colors[context] || '#616161';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      {/* Header with context and timestamp */}
      <View style={itemStyles.header}>
        <View style={itemStyles.contextContainer}>
          <Icon 
            name={getContextIcon(translation.context)} 
            size={16} 
            color={getContextColor(translation.context)} 
          />
          <Text style={[itemStyles.contextText, { color: getContextColor(translation.context) }]}>
            {translation.context.charAt(0).toUpperCase() + translation.context.slice(1)}
          </Text>
        </View>
        
        <View style={itemStyles.timestampContainer}>
          <Text style={itemStyles.timestamp}>
            {formatTimestamp(translation.timestamp)}
          </Text>
          <Text style={itemStyles.sequenceNumber}>
            #{translation.sequenceNumber}
          </Text>
        </View>
      </View>

      {/* Original Arabic text */}
      {userPreferences.showOriginalText && (
        <View style={itemStyles.originalContainer}>
          <Text style={[styles.originalText, itemStyles.arabicText]}>
            {translation.originalText}
          </Text>
        </View>
      )}

      {/* Primary translation */}
      {translation.translations.primary && (
        <View style={itemStyles.translationContainer}>
          <View style={itemStyles.translationHeader}>
            <Text style={styles.languageLabel}>
              {translation.translations.primary.language}
            </Text>
            {translation.translations.primary.confidence && (
              <View style={itemStyles.confidenceContainer}>
                <View 
                  style={[
                    itemStyles.confidenceDot, 
                    { backgroundColor: getConfidenceColor(translation.translations.primary.confidence) }
                  ]} 
                />
                <Text style={styles.confidenceIndicator}>
                  {getConfidenceText(translation.translations.primary.confidence)}
                </Text>
              </View>
            )}
          </View>
          
          <Text 
            style={[
              styles.primaryTranslation,
              translation.translations.primary.isRTL && itemStyles.rtlText
            ]}
          >
            {translation.translations.primary.text}
          </Text>
        </View>
      )}

      {/* Secondary translation (dual subtitles) */}
      {userPreferences.showDualSubtitles && translation.translations.secondary && (
        <View style={itemStyles.translationContainer}>
          <View style={itemStyles.translationHeader}>
            <Text style={styles.languageLabel}>
              {translation.translations.secondary.language}
            </Text>
            {translation.translations.secondary.confidence && (
              <View style={itemStyles.confidenceContainer}>
                <View 
                  style={[
                    itemStyles.confidenceDot, 
                    { backgroundColor: getConfidenceColor(translation.translations.secondary.confidence) }
                  ]} 
                />
                <Text style={styles.confidenceIndicator}>
                  {getConfidenceText(translation.translations.secondary.confidence)}
                </Text>
              </View>
            )}
          </View>
          
          <Text 
            style={[
              styles.secondaryTranslation,
              translation.translations.secondary.isRTL && itemStyles.rtlText
            ]}
          >
            {translation.translations.secondary.text}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={itemStyles.actionContainer}>
        {/* Available languages button */}
        {translation.availableLanguages && translation.availableLanguages.length > 1 && (
          <TouchableOpacity
            style={itemStyles.actionButton}
            onPress={() => setShowAllLanguages(!showAllLanguages)}
          >
            <Icon name="language" size={16} color="#2E7D32" />
            <Text style={itemStyles.actionButtonText}>
              {translation.availableLanguages.length} languages
            </Text>
          </TouchableOpacity>
        )}

        {/* Dual subtitles toggle */}
        <TouchableOpacity
          style={[
            itemStyles.actionButton,
            userPreferences.showDualSubtitles && itemStyles.actionButtonActive
          ]}
          onPress={toggleDualSubtitles}
        >
          <Icon 
            name={userPreferences.showDualSubtitles ? "subtitles" : "subtitles-off"} 
            size={16} 
            color={userPreferences.showDualSubtitles ? "#fff" : "#2E7D32"} 
          />
          <Text style={[
            itemStyles.actionButtonText,
            userPreferences.showDualSubtitles && itemStyles.actionButtonTextActive
          ]}>
            Dual
          </Text>
        </TouchableOpacity>

        {/* Bookmark button */}
        <TouchableOpacity style={itemStyles.actionButton}>
          <Icon name="bookmark-border" size={16} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      {/* All available languages (expandable) */}
      {showAllLanguages && translation.allTranslations && (
        <View style={itemStyles.allLanguagesContainer}>
          <Text style={itemStyles.allLanguagesTitle}>Available translations:</Text>
          
          {translation.allTranslations.map((trans, index) => (
            <TouchableOpacity
              key={index}
              style={[
                itemStyles.languageOption,
                trans.language === userPreferences.primaryLanguage && itemStyles.languageOptionActive
              ]}
              onPress={() => handleLanguageSwitch(trans.language)}
            >
              <View style={itemStyles.languageOptionHeader}>
                <Text style={[
                  itemStyles.languageOptionText,
                  trans.language === userPreferences.primaryLanguage && itemStyles.languageOptionTextActive
                ]}>
                  {trans.language}
                </Text>
                
                {trans.confidence && (
                  <View style={itemStyles.confidenceContainer}>
                    <View 
                      style={[
                        itemStyles.confidenceDot, 
                        { backgroundColor: getConfidenceColor(trans.confidence) }
                      ]} 
                    />
                    <Text style={itemStyles.confidenceText}>
                      {getConfidenceText(trans.confidence)}
                    </Text>
                  </View>
                )}
              </View>
              
              <Text 
                style={[
                  itemStyles.languageOptionPreview,
                  trans.isRTL && itemStyles.rtlText
                ]}
                numberOfLines={2}
              >
                {trans.text}
              </Text>
              
              {/* Set as secondary language button */}
              {trans.language !== userPreferences.primaryLanguage && (
                <TouchableOpacity
                  style={itemStyles.secondaryButton}
                  onPress={() => handleSecondaryLanguageSwitch(trans.language)}
                >
                  <Text style={itemStyles.secondaryButtonText}>
                    Set as secondary
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const itemStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestampContainer: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
  },
  sequenceNumber: {
    fontSize: 10,
    color: '#ccc',
  },
  originalContainer: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
  },
  arabicText: {
    fontFamily: 'System', // You might want to use a specific Arabic font
  },
  translationContainer: {
    marginBottom: 8,
  },
  translationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 10,
    color: '#666',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    gap: 4,
  },
  actionButtonActive: {
    backgroundColor: '#2E7D32',
  },
  actionButtonText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '500',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  allLanguagesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  allLanguagesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  languageOption: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  languageOptionActive: {
    backgroundColor: '#e8f5e8',
    borderColor: '#2E7D32',
  },
  languageOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  languageOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  languageOptionTextActive: {
    color: '#2E7D32',
  },
  languageOptionPreview: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#2E7D32',
    borderRadius: 10,
  },
  secondaryButtonText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
});

export default TranslationItem;

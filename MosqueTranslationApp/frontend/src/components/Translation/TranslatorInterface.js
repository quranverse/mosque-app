// Translator Interface Component - For community translation
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const TranslatorInterface = ({
  visible,
  onClose,
  availableLanguages,
  onBecomeTranslator,
  onSendTranslation,
  isTranslator,
  translatorLanguage,
  pendingTranslations
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [activeTranslationId, setActiveTranslationId] = useState(null);
  const [translationHistory, setTranslationHistory] = useState([]);
  const [confidence, setConfidence] = useState(0.8);
  const [showLanguageSelection, setShowLanguageSelection] = useState(!isTranslator);

  const textInputRef = useRef(null);

  useEffect(() => {
    if (isTranslator && translatorLanguage) {
      setSelectedLanguage(translatorLanguage);
      setShowLanguageSelection(false);
    }
  }, [isTranslator, translatorLanguage]);

  const handleLanguageSelect = async (language) => {
    try {
      setSelectedLanguage(language);
      await onBecomeTranslator(language);
      setShowLanguageSelection(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to register as translator. Please try again.');
    }
  };

  const handleTranslationSubmit = async () => {
    if (!currentTranslation.trim() || !activeTranslationId) {
      Alert.alert('Error', 'Please enter a translation');
      return;
    }

    try {
      await onSendTranslation(activeTranslationId, currentTranslation.trim(), confidence);
      
      // Add to history
      setTranslationHistory(prev => [{
        id: activeTranslationId,
        text: currentTranslation.trim(),
        confidence,
        timestamp: new Date(),
        language: selectedLanguage
      }, ...prev]);

      // Clear current translation
      setCurrentTranslation('');
      setActiveTranslationId(null);
      
      Alert.alert('Success', 'Translation sent successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send translation. Please try again.');
    }
  };

  const handleStartTranslation = (translation) => {
    setActiveTranslationId(translation.id);
    setCurrentTranslation('');
    textInputRef.current?.focus();
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 0.9) return '#4CAF50';
    if (conf >= 0.7) return '#FF9800';
    return '#F44336';
  };

  const getConfidenceLabel = (conf) => {
    if (conf >= 0.9) return 'High';
    if (conf >= 0.7) return 'Medium';
    return 'Low';
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (showLanguageSelection) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <LinearGradient
            colors={['#2E7D32', '#4CAF50']}
            style={styles.header}
          >
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Become a Translator</Text>
            
            <View style={styles.headerSpacer} />
          </LinearGradient>

          <ScrollView style={styles.content}>
            <View style={styles.welcomeContainer}>
              <Icon name="translate" size={64} color="#2E7D32" />
              <Text style={styles.welcomeTitle}>Help Your Community</Text>
              <Text style={styles.welcomeText}>
                Join our community of translators and help make Islamic content accessible to everyone in their native language.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Your Language</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the language you want to translate to:
              </Text>

              <View style={styles.languageGrid}>
                {availableLanguages.map(language => (
                  <TouchableOpacity
                    key={language}
                    style={styles.languageOption}
                    onPress={() => handleLanguageSelect(language)}
                  >
                    <Text style={styles.languageFlag}>
                      {getLanguageFlag(language)}
                    </Text>
                    <Text style={styles.languageText}>{language}</Text>
                    <Icon name="arrow-forward" size={20} color="#2E7D32" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>Why Translate?</Text>
              
              <View style={styles.benefit}>
                <Icon name="favorite" size={24} color="#E91E63" />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Earn Rewards</Text>
                  <Text style={styles.benefitDescription}>
                    Help spread Islamic knowledge and earn spiritual rewards
                  </Text>
                </View>
              </View>

              <View style={styles.benefit}>
                <Icon name="people" size={24} color="#2196F3" />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Build Community</Text>
                  <Text style={styles.benefitDescription}>
                    Connect with Muslims worldwide and strengthen the Ummah
                  </Text>
                </View>
              </View>

              <View style={styles.benefit}>
                <Icon name="school" size={24} color="#FF9800" />
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Learn & Grow</Text>
                  <Text style={styles.benefitDescription}>
                    Improve your language skills while learning Islamic content
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['#2E7D32', '#4CAF50']}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Translator</Text>
            <Text style={styles.headerSubtitle}>
              {selectedLanguage} • {translationHistory.length} translations
            </Text>
          </View>
          
          <TouchableOpacity style={styles.historyButton}>
            <Icon name="history" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.translatorContent}>
          {/* Active Translation Area */}
          {activeTranslationId ? (
            <View style={styles.activeTranslationContainer}>
              <View style={styles.originalTextContainer}>
                <Text style={styles.originalLabel}>Original (Arabic):</Text>
                <Text style={styles.originalText}>
                  {pendingTranslations.find(t => t.id === activeTranslationId)?.originalText}
                </Text>
              </View>

              <View style={styles.translationInputContainer}>
                <Text style={styles.translationLabel}>
                  Your {selectedLanguage} Translation:
                </Text>
                
                <TextInput
                  ref={textInputRef}
                  style={styles.translationInput}
                  multiline
                  placeholder={`Enter ${selectedLanguage} translation...`}
                  value={currentTranslation}
                  onChangeText={setCurrentTranslation}
                  textAlignVertical="top"
                />

                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceLabel}>Confidence:</Text>
                  <View style={styles.confidenceSlider}>
                    {[0.5, 0.7, 0.8, 0.9, 1.0].map(value => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.confidenceOption,
                          confidence === value && styles.confidenceOptionActive,
                          { backgroundColor: getConfidenceColor(value) }
                        ]}
                        onPress={() => setConfidence(value)}
                      >
                        <Text style={styles.confidenceOptionText}>
                          {Math.round(value * 100)}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.translationActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setActiveTranslationId(null);
                      setCurrentTranslation('');
                    }}
                  >
                    <Icon name="close" size={20} color="#666" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      !currentTranslation.trim() && styles.submitButtonDisabled
                    ]}
                    onPress={handleTranslationSubmit}
                    disabled={!currentTranslation.trim()}
                  >
                    <Icon name="send" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Send Translation</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* Pending Translations List */
            <ScrollView style={styles.pendingContainer}>
              <Text style={styles.pendingTitle}>
                Pending Translations ({pendingTranslations.length})
              </Text>
              
              {pendingTranslations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="done-all" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>All caught up!</Text>
                  <Text style={styles.emptyStateSubtext}>
                    New translations will appear here
                  </Text>
                </View>
              ) : (
                pendingTranslations.map(translation => (
                  <View key={translation.id} style={styles.pendingItem}>
                    <View style={styles.pendingHeader}>
                      <Text style={styles.pendingSequence}>#{translation.sequenceNumber}</Text>
                      <Text style={styles.pendingTime}>
                        {formatTimestamp(new Date(translation.timestamp))}
                      </Text>
                    </View>
                    
                    <Text style={styles.pendingOriginal}>
                      {translation.originalText}
                    </Text>
                    
                    <TouchableOpacity
                      style={styles.translateButton}
                      onPress={() => handleStartTranslation(translation)}
                    >
                      <Icon name="translate" size={20} color="#fff" />
                      <Text style={styles.translateButtonText}>
                        Translate to {selectedLanguage}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* Translation History (collapsed) */}
          {translationHistory.length > 0 && !activeTranslationId && (
            <View style={styles.historyPreview}>
              <Text style={styles.historyPreviewTitle}>
                Recent Translations ({translationHistory.length})
              </Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {translationHistory.slice(0, 5).map((item, index) => (
                  <View key={index} style={styles.historyPreviewItem}>
                    <Text style={styles.historyPreviewText} numberOfLines={2}>
                      {item.text}
                    </Text>
                    <View style={styles.historyPreviewMeta}>
                      <View 
                        style={[
                          styles.historyConfidenceDot,
                          { backgroundColor: getConfidenceColor(item.confidence) }
                        ]} 
                      />
                      <Text style={styles.historyPreviewTime}>
                        {formatTimestamp(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getLanguageFlag = (language) => {
  const flags = {
    'English': '🇺🇸', 'German': '🇩🇪', 'French': '🇫🇷', 'Spanish': '🇪🇸',
    'Turkish': '🇹🇷', 'Arabic': '🇸🇦', 'Urdu': '🇵🇰', 'Chinese': '🇨🇳',
    'Japanese': '🇯🇵', 'Korean': '🇰🇷', 'Italian': '🇮🇹', 'Dutch': '🇳🇱',
    'Portuguese': '🇵🇹', 'Russian': '🇷🇺'
  };
  return flags[language] || '🌐';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  headerSpacer: {
    width: 40,
  },
  historyButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  languageGrid: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  languageFlag: {
    fontSize: 24,
  },
  languageText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  benefitsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  translatorContent: {
    flex: 1,
  },
  activeTranslationContainer: {
    flex: 1,
    padding: 16,
  },
  originalTextContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  originalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  originalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    lineHeight: 24,
  },
  translationInputContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flex: 1,
  },
  translationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  translationInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#f8f9fa',
  },
  confidenceContainer: {
    marginTop: 16,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  confidenceSlider: {
    flexDirection: 'row',
    gap: 8,
  },
  confidenceOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  confidenceOptionActive: {
    transform: [{ scale: 1.1 }],
  },
  confidenceOptionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  translationActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  pendingContainer: {
    flex: 1,
    padding: 16,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
  pendingItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingSequence: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  pendingTime: {
    fontSize: 12,
    color: '#999',
  },
  pendingOriginal: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    lineHeight: 24,
    marginBottom: 12,
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    gap: 8,
  },
  translateButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  historyPreview: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  historyPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  historyPreviewItem: {
    width: 120,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginRight: 8,
  },
  historyPreviewText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  historyPreviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyConfidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  historyPreviewTime: {
    fontSize: 10,
    color: '#666',
  },
});

export default TranslatorInterface;

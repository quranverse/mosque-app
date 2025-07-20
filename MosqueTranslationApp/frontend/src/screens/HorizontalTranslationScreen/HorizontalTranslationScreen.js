import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
// Note: Orientation locking removed for compatibility
import Icon from 'react-native-vector-icons/MaterialIcons';
import io from 'socket.io-client';
import { API_BASE_URL } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const HorizontalTranslationScreen = ({ navigation, route }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [translations, setTranslations] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [availableLanguages, setAvailableLanguages] = useState(['English', 'French', 'Urdu', 'Arabic']);
  const [fontSize, setFontSize] = useState(18);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [broadcast, setBroadcast] = useState(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsTimeoutRef = useRef(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // Note: Orientation locking disabled for compatibility
    // Users can manually rotate their device to landscape
    
    // Hide status bar for immersive experience
    StatusBar.setHidden(true);

    // Get broadcast data from route params
    if (route.params?.broadcast) {
      setBroadcast(route.params.broadcast);
      setSelectedLanguage(route.params.broadcast.language || 'English');
    }

    initializeConnection();

    // Auto-hide controls after 3 seconds
    resetControlsTimeout();

    return () => {
      // Note: Orientation restore disabled for compatibility
      // Users can manually rotate back to portrait
      StatusBar.setHidden(false);
      cleanup();
    };
  }, []);

  const initializeConnection = async () => {
    try {
      const newSocket = io(API_BASE_URL.replace('/api', ''), {
        transports: ['websocket'],
        timeout: 10000,
      });

      newSocket.on('connect', () => {
        console.log('Horizontal viewer connected');
        setIsConnected(true);
        
        // Join the broadcast session
        if (route.params?.broadcast?.sessionId) {
          joinSession(newSocket, route.params.broadcast);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Horizontal viewer disconnected');
        setIsConnected(false);
      });

      newSocket.on('translation_update', (data) => {
        console.log('Translation received:', data);
        addTranslation(data);
      });

      newSocket.on('session_ended', () => {
        Alert.alert(
          'Session Ended',
          'The live translation session has ended.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to initialize connection:', error);
      Alert.alert('Connection Error', 'Failed to connect to translation service.');
    }
  };

  const joinSession = async (socketInstance, broadcastData) => {
    try {
      const deviceId = await AsyncStorage.getItem('deviceId') || `device_${Date.now()}`;
      
      socketInstance.emit('join_session', {
        sessionId: broadcastData.sessionId,
        mosqueId: broadcastData.mosqueId,
        deviceId,
        userType: 'individual',
        preferredLanguage: selectedLanguage,
      }, (response) => {
        if (response.success) {
          console.log('Successfully joined horizontal translation session');
          // Load recent translations
          loadRecentTranslations(socketInstance, broadcastData.sessionId);
        } else {
          Alert.alert('Error', response.error || 'Failed to join session');
        }
      });
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const loadRecentTranslations = (socketInstance, sessionId) => {
    socketInstance.emit('get_recent_translations', {
      sessionId,
      language: selectedLanguage,
      limit: 10,
    }, (response) => {
      if (response.success && response.translations) {
        setTranslations(response.translations.reverse());
      }
    });
  };

  const addTranslation = (translationData) => {
    const newTranslation = {
      id: translationData.id || Date.now(),
      originalText: translationData.originalText,
      translatedText: translationData.translations?.[selectedLanguage] || translationData.translatedText,
      timestamp: new Date(translationData.timestamp),
      language: selectedLanguage,
    };

    setTranslations(prev => {
      const updated = [...prev, newTranslation];
      // Keep only last 50 translations for performance
      return updated.slice(-50);
    });

    // Auto-scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const cleanup = () => {
    if (socket) {
      socket.disconnect();
    }
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      hideControls();
    }, 3000);
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    resetControlsTimeout();
  };

  const hideControls = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowControls(false);
    });
  };

  const handleScreenTap = () => {
    if (showControls) {
      hideControls();
    } else {
      showControlsTemporarily();
    }
  };

  const changeLanguage = (language) => {
    setSelectedLanguage(language);
    if (socket && broadcast?.sessionId) {
      loadRecentTranslations(socket, broadcast.sessionId);
    }
    resetControlsTimeout();
  };

  const adjustFontSize = (delta) => {
    setFontSize(prev => Math.max(12, Math.min(32, prev + delta)));
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    resetControlsTimeout();
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={styles.container}>
      {/* Main translation area */}
      <TouchableOpacity 
        style={styles.translationArea} 
        onPress={handleScreenTap}
        activeOpacity={1}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.translationsContainer}
          contentContainerStyle={styles.translationsContent}
          showsVerticalScrollIndicator={false}
        >
          {translations.map((translation, index) => (
            <View key={translation.id} style={styles.translationItem}>
              <Text style={[styles.translationText, { fontSize }]}>
                {translation.translatedText}
              </Text>
              <Text style={styles.translationTime}>
                {formatTime(translation.timestamp)}
              </Text>
            </View>
          ))}
          
          {translations.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="translate" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Waiting for translations...</Text>
              <Text style={styles.emptySubtext}>
                {broadcast?.mosqueName} • {selectedLanguage}
              </Text>
            </View>
          )}
        </ScrollView>
      </TouchableOpacity>

      {/* Controls overlay */}
      {showControls && (
        <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]}>
          {/* Top controls */}
          <View style={styles.topControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle}>{broadcast?.mosqueName}</Text>
              <Text style={styles.sessionSubtitle}>
                {isConnected ? 'Connected' : 'Connecting...'} • {selectedLanguage}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleFullscreen}
            >
              <Icon name={isFullscreen ? "fullscreen-exit" : "fullscreen"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            {/* Language selector */}
            <ScrollView 
              horizontal 
              style={styles.languageSelector}
              showsHorizontalScrollIndicator={false}
            >
              {availableLanguages.map((language) => (
                <TouchableOpacity
                  key={language}
                  style={[
                    styles.languageButton,
                    selectedLanguage === language && styles.selectedLanguageButton
                  ]}
                  onPress={() => changeLanguage(language)}
                >
                  <Text style={[
                    styles.languageButtonText,
                    selectedLanguage === language && styles.selectedLanguageButtonText
                  ]}>
                    {language}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Font size controls */}
            <View style={styles.fontControls}>
              <TouchableOpacity 
                style={styles.fontButton}
                onPress={() => adjustFontSize(-2)}
              >
                <Icon name="text-decrease" size={20} color="#fff" />
              </TouchableOpacity>
              
              <Text style={styles.fontSizeText}>{fontSize}px</Text>
              
              <TouchableOpacity 
                style={styles.fontButton}
                onPress={() => adjustFontSize(2)}
              >
                <Icon name="text-increase" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Connection status indicator */}
      <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]}>
        <View style={styles.statusDot} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  translationArea: {
    flex: 1,
  },
  translationsContainer: {
    flex: 1,
    padding: 20,
  },
  translationsContent: {
    paddingBottom: 100,
  },
  translationItem: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  translationText: {
    color: '#fff',
    lineHeight: 28,
    textAlign: 'center',
  },
  translationTime: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#ccc',
    fontSize: 18,
    marginTop: 15,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  sessionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sessionSubtitle: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  languageSelector: {
    flex: 1,
    marginRight: 20,
  },
  languageButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedLanguageButton: {
    backgroundColor: '#2E7D32',
  },
  languageButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedLanguageButtonText: {
    fontWeight: 'bold',
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fontButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeText: {
    color: '#fff',
    fontSize: 12,
    marginHorizontal: 10,
    minWidth: 40,
    textAlign: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    margin: 2,
  },
});

export default HorizontalTranslationScreen;

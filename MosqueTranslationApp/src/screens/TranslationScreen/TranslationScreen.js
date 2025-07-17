import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import io from 'socket.io-client';
import { API_BASE_URL } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MultiLanguageTranslationView from '../../components/Translation/MultiLanguageTranslationView';
import multiLanguageTranslationService from '../../services/MultiLanguageTranslationService';

const { width, height } = Dimensions.get('window');

const TranslationScreen = ({ navigation, route }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedMosque, setSelectedMosque] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [availableMosques, setAvailableMosques] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [socket, setSocket] = useState(null);
  const [userType, setUserType] = useState('individual');
  const [loading, setLoading] = useState(true);
  const [showTranslationView, setShowTranslationView] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    initializeScreen();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (route.params?.sessionId) {
      // Direct connection to a specific session
      connectToSession(route.params.sessionId, route.params.mosque);
    }
  }, [route.params]);

  const initializeScreen = async () => {
    try {
      setLoading(true);

      // Initialize multi-language translation service
      await multiLanguageTranslationService.initialize();

      // Get user type from storage
      const storedUserType = await AsyncStorage.getItem('userType');
      if (storedUserType) {
        setUserType(storedUserType);
      }

      // Load available mosques and sessions
      await Promise.all([
        loadAvailableMosques(),
        loadActiveSessions()
      ]);

      // Initialize socket connection
      initializeSocket();

      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize translation screen:', error);
      setLoading(false);
    }
  };

  const loadAvailableMosques = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/mosques?lat=40.7128&lng=-74.0060`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setAvailableMosques(data.map(mosque => ({
          id: mosque.id,
          name: mosque.name,
          address: mosque.address,
          distance: mosque.distance,
          hasLiveTranslation: mosque.hasLiveTranslation,
          languagesSupported: mosque.languagesSupported || ['English'],
          followers: mosque.followers || 0,
          hasAccount: mosque.hasAccount
        })));
      }
    } catch (error) {
      console.error('Failed to load mosques:', error);
      // Fallback to mock data
      setAvailableMosques([
        {
          id: 'mosque1',
          name: 'Central Mosque',
          address: '123 Main Street, New York, NY',
          distance: 0.5,
          hasLiveTranslation: true,
          languagesSupported: ['English', 'German', 'French', 'Spanish'],
          followers: 150,
          hasAccount: true
        },
        {
          id: 'mosque2',
          name: 'Masjid Al-Noor',
          address: '456 Oak Avenue, Brooklyn, NY',
          distance: 1.2,
          hasLiveTranslation: false,
          languagesSupported: ['English', 'Turkish', 'Arabic'],
          followers: 203,
          hasAccount: true
        }
      ]);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/active`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setActiveSessions(data);
      }
    } catch (error) {
      console.error('Failed to load active sessions:', error);
      setActiveSessions([]);
    }
  };

  const initializeSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const newSocket = io(API_BASE_URL.replace('/api', ''), {
        transports: ['websocket'],
        timeout: 10000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');

        // Authenticate if token available
        if (token) {
          newSocket.emit('authenticate', { token }, (response) => {
            if (response.success) {
              console.log('Socket authenticated');
            }
          });
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      newSocket.on('session_started', (data) => {
        console.log('New session started:', data);
        loadActiveSessions(); // Refresh active sessions
      });

      newSocket.on('session_ended', (data) => {
        console.log('Session ended:', data);
        if (selectedSession?.sessionId === data.sessionId) {
          handleDisconnect();
        }
        loadActiveSessions(); // Refresh active sessions
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  };

  const connectToSession = async (sessionId, mosque) => {
    if (!socket) {
      Alert.alert('Error', 'Connection not available. Please try again.');
      return;
    }

    try {
      const deviceId = await AsyncStorage.getItem('deviceId') || `device_${Date.now()}`;

      socket.emit('join_session', {
        mosqueId: mosque.id,
        sessionId,
        deviceId,
        userType
      }, (response) => {
        if (response.success) {
          setSelectedMosque(mosque);
          setSelectedSession({ sessionId, ...response });
          setIsConnected(true);
          setShowTranslationView(true);

          // Animate in translation view
          showTranslationViewAnimated();

          Alert.alert(
            'Connected',
            `Connected to ${mosque.name} for live translation.`
          );
        } else {
          Alert.alert('Connection Failed', response.error || 'Failed to join session');
        }
      });
    } catch (error) {
      console.error('Failed to connect to session:', error);
      Alert.alert('Error', 'Failed to connect to translation session');
    }
  };

  const handleDisconnect = () => {
    if (socket && selectedSession) {
      socket.emit('leave_session', {
        sessionId: selectedSession.sessionId,
        deviceId: selectedSession.deviceId
      });
    }

    setIsConnected(false);
    setSelectedMosque(null);
    setSelectedSession(null);
    setShowTranslationView(false);

    // Animate out translation view
    hideTranslationViewAnimated();
  };

  const showTranslationViewAnimated = () => {
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

  const hideTranslationViewAnimated = () => {
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

  const cleanup = () => {
    if (socket) {
      socket.disconnect();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
        <Icon name="translate" size={64} color="#2E7D32" />
        <Text style={styles.loadingText}>Loading translation services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {isConnected ? `${selectedMosque?.name}` : 'Live Translation'}
        </Text>

        {isConnected && (
          <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
            <Icon name="close" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {!isConnected ? (
        /* Mosque and Session Selection */
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔴 Live Translation Sessions</Text>
              <Text style={styles.sectionSubtitle}>Join ongoing translation sessions</Text>

              {activeSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => {
                    const mosque = availableMosques.find(m => m.id === session.mosqueId);
                    if (mosque) {
                      connectToSession(session.id, mosque);
                    }
                  }}
                >
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionMosque}>{session.mosqueName}</Text>
                      <Text style={styles.sessionType}>{session.sessionType || 'Live Translation'}</Text>
                    </View>

                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  </View>

                  <View style={styles.sessionDetails}>
                    <View style={styles.sessionStat}>
                      <Icon name="people" size={16} color="#666" />
                      <Text style={styles.sessionStatText}>
                        {session.participantCount || 0} participants
                      </Text>
                    </View>

                    <View style={styles.sessionStat}>
                      <Icon name="language" size={16} color="#666" />
                      <Text style={styles.sessionStatText}>
                        {session.languages?.length || 0} languages
                      </Text>
                    </View>
                  </View>

                  {session.languages && (
                    <View style={styles.languageChips}>
                      {session.languages.slice(0, 4).map((lang, index) => (
                        <View key={index} style={styles.languageChip}>
                          <Text style={styles.languageChipText}>{lang}</Text>
                        </View>
                      ))}
                      {session.languages.length > 4 && (
                        <View style={styles.languageChip}>
                          <Text style={styles.languageChipText}>
                            +{session.languages.length - 4}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Available Mosques */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕌 Nearby Mosques</Text>
            <Text style={styles.sectionSubtitle}>
              Mosques with translation services in your area
            </Text>

            {availableMosques.map((mosque) => (
              <TouchableOpacity
                key={mosque.id}
                style={[
                  styles.mosqueCard,
                  mosque.hasLiveTranslation && styles.mosqueCardLive,
                ]}
                onPress={() => {
                  if (mosque.hasLiveTranslation) {
                    // Find active session for this mosque
                    const session = activeSessions.find(s => s.mosqueId === mosque.id);
                    if (session) {
                      connectToSession(session.id, mosque);
                    } else {
                      Alert.alert('No Active Session', 'This mosque is not currently broadcasting live translation.');
                    }
                  } else {
                    Alert.alert('Not Available', 'This mosque is not currently offering live translation.');
                  }
                }}
                disabled={!mosque.hasLiveTranslation}
              >
                <View style={styles.mosqueHeader}>
                  <View style={styles.mosqueInfo}>
                    <Text style={styles.mosqueName}>{mosque.name}</Text>
                    <Text style={styles.mosqueAddress}>{mosque.address}</Text>
                    <Text style={styles.mosqueDistance}>
                      📍 {mosque.distance?.toFixed(1) || '0.0'} km away
                    </Text>
                  </View>

                  <View style={styles.mosqueStatus}>
                    {mosque.hasLiveTranslation ? (
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    ) : (
                      <Text style={styles.offlineText}>Offline</Text>
                    )}
                  </View>
                </View>

                <View style={styles.mosqueDetails}>
                  <View style={styles.mosqueStat}>
                    <Icon name="people" size={16} color="#666" />
                    <Text style={styles.mosqueStatText}>
                      {mosque.followers || 0} followers
                    </Text>
                  </View>

                  <View style={styles.mosqueStat}>
                    <Icon name="language" size={16} color="#666" />
                    <Text style={styles.mosqueStatText}>
                      {mosque.languagesSupported?.length || 0} languages
                    </Text>
                  </View>
                </View>

                {mosque.languagesSupported && (
                  <View style={styles.languageChips}>
                    {mosque.languagesSupported.slice(0, 4).map((lang, index) => (
                      <View key={index} style={styles.languageChip}>
                        <Text style={styles.languageChipText}>{lang}</Text>
                      </View>
                    ))}
                    {mosque.languagesSupported.length > 4 && (
                      <View style={styles.languageChip}>
                        <Text style={styles.languageChipText}>
                          +{mosque.languagesSupported.length - 4}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        /* Multi-Language Translation View */
        <MultiLanguageTranslationView
          sessionId={selectedSession?.sessionId}
          socket={socket}
          userType={userType}
          isVisible={showTranslationView}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 0,
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
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    marginTop: 5,
    textAlign: 'center',
  },
  mosquesSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  // Session Cards
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionMosque: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 14,
    color: '#666',
  },
  sessionDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  sessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionStatText: {
    fontSize: 12,
    color: '#666',
  },

  // Mosque Cards
  mosqueCard: {
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
  mosqueCardLive: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  mosqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mosqueInfo: {
    flex: 1,
  },
  mosqueAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mosqueDistance: {
    fontSize: 12,
    color: '#999',
  },
  mosqueStatus: {
    alignItems: 'flex-end',
  },
  mosqueDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  mosqueStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mosqueStatText: {
    fontSize: 12,
    color: '#666',
  },
  mosqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  mosqueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 5,
  },
  liveText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  offlineText: {
    fontSize: 12,
    color: '#999',
  },

  // Language Chips
  languageChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  languageChip: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  languageChipText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '500',
  },
  mosqueLanguage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  mosqueListeners: {
    fontSize: 12,
    color: '#999',
  },
  instructions: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  translationSection: {
    flex: 1,
  },
  connectionStatus: {
    backgroundColor: '#2E7D32',
    padding: 15,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  disconnectText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
  },
  connectedMosque: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  currentTranslation: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  currentText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 24,
  },
  historySection: {
    flex: 1,
    margin: 15,
    marginTop: 0,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  historyScroll: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  historyText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
});

export default TranslationScreen;

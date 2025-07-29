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
import VoiceRecognitionComponent from '../../components/Audio/VoiceRecognitionComponent';
import LiveBroadcastList from '../../components/Translation/LiveBroadcastList';

// import AuthenticationPrompt from '../../components/Common/AuthenticationPrompt';
import multiLanguageTranslationService from '../../services/MultiLanguageTranslationService';
import AuthService from '../../services/AuthService/AuthService';
import ApiService from '../../services/ApiService/ApiService';

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
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'

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

      // Test connectivity first
      await testConnectivity();

      // Get user type from AuthService first (this should always work)
      const currentUser = AuthService.getCurrentUser();
      const currentUserType = currentUser?.type || 'individual';
      setUserType(currentUserType);



      // Initialize multi-language translation service (with fallback)
      try {
        await multiLanguageTranslationService.initialize();
      } catch (serviceError) {
        console.error('Translation service initialization failed:', serviceError);
        // Continue anyway - the service has fallback data
      }

      // Load available mosques and sessions (with individual error handling)
      const loadPromises = [
        loadAvailableMosques().catch(error => {
          console.error('Failed to load mosques:', error);
          // Already handled in the function with fallback data
        }),
        loadActiveSessions().catch(error => {
          console.error('Failed to load sessions:', error);
          // Already handled in the function with empty array
        })
      ];

      await Promise.allSettled(loadPromises);

      // Initialize socket connection (non-blocking)
      initializeSocket();

      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize translation screen:', error);
      setLoading(false);
      // Don't show error to user - the screen should still be usable with fallback data
    }
  };

  const loadAvailableMosques = async () => {
    try {
      // Use ApiService instead of direct fetch
      const response = await ApiService.get('/mosques?lat=40.7128&lng=-74.0060');

      if (response && Array.isArray(response)) {
        setAvailableMosques(response.map(mosque => ({
          id: mosque._id || mosque.id,
          name: mosque.mosqueName || mosque.name,
          address: mosque.mosqueAddress || mosque.address,
          distance: mosque.distance || 0,
          hasLiveTranslation: true, // Assume all registered mosques can broadcast
          languagesSupported: mosque.languagesSupported || ['English', 'Arabic'],
          followers: mosque.analytics?.totalFollowers || 0,
          hasAccount: true
        })));
      } else {
        // If no mosques returned, use fallback
        throw new Error('No mosques data received');
      }
    } catch (error) {
      console.error('Failed to load mosques:', error);
      // Set empty array - no fallback mock data
      setAvailableMosques([]);
    }
  };

  const loadActiveSessions = async () => {
    try {
      // Use ApiService instead of direct fetch
      const response = await ApiService.get('/sessions/active');

      if (response && response.success && Array.isArray(response.sessions)) {
        setActiveSessions(response.sessions);
      } else {
        // No active sessions
        setActiveSessions([]);
      }
    } catch (error) {
      console.error('Failed to load active sessions:', error);
      // Set empty array as fallback - no mock sessions to avoid confusion
      setActiveSessions([]);
    }
  };

  const initializeSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const socketUrl = API_BASE_URL.replace('/api', '');

      console.log('Attempting to connect to socket:', socketUrl);

      const newSocket = io(socketUrl, {
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected successfully');

        // Authenticate if token available
        if (token) {
          newSocket.emit('authenticate', { token }, (response) => {
            if (response && response.success) {
              console.log('Socket authenticated');
            }
          });
        }
      });

      newSocket.on('connect_error', (error) => {
        console.log('Socket connection error:', error.message);
        // Don't show error to user, just log it
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
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
      // Don't block the UI if socket fails
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

  const testConnectivity = async () => {
    try {
      setNetworkStatus('checking');
      console.log('Testing connectivity to:', API_BASE_URL);
      const response = await ApiService.get('/status');
      console.log('Connectivity test successful:', response);
      setNetworkStatus('connected');
      return true;
    } catch (error) {
      console.error('Connectivity test failed:', error);
      setNetworkStatus('disconnected');
      return false;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Test connectivity first
      const isConnected = await testConnectivity();
      console.log('Network connectivity:', isConnected ? 'Available' : 'Failed');

      await Promise.allSettled([
        loadAvailableMosques(),
        loadActiveSessions()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoinBroadcast = (broadcast) => {
    // Create a mosque object from broadcast data
    const mosque = {
      id: broadcast.mosqueId,
      name: broadcast.mosqueName,
      address: broadcast.address,
      hasLiveTranslation: broadcast.isLive,
    };

    if (broadcast.isLive && broadcast.sessionId) {
      connectToSession(broadcast.sessionId, mosque);
    } else {
      Alert.alert('Error', 'This broadcast is not currently available.');
    }
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

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isConnected ? `${selectedMosque?.name}` : 'Live Translation'}
          </Text>

          {/* Network Status Indicator */}
          <TouchableOpacity
            style={styles.networkStatus}
            onPress={testConnectivity}
          >
            <View style={[
              styles.networkDot,
              { backgroundColor: networkStatus === 'connected' ? '#4CAF50' :
                                 networkStatus === 'checking' ? '#FF9800' : '#F44336' }
            ]} />
            <Text style={styles.networkText}>
              {networkStatus === 'connected' ? 'Online' :
               networkStatus === 'checking' ? 'Connecting...' : 'Offline (Tap to retry)'}
            </Text>
          </TouchableOpacity>
        </View>

        {isConnected && (
          <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
            <Icon name="close" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {!isConnected ? (
        /* Show different content based on user type and authentication */
        userType === AuthService.USER_TYPES.INDIVIDUAL || userType === AuthService.USER_TYPES.ANONYMOUS ? (
          /* Individual/Anonymous User: Enhanced Live Broadcast List */
          <LiveBroadcastList
            onJoinBroadcast={handleJoinBroadcast}
            userLocation={userLocation}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            navigation={navigation}
          />
        ) : (
          /* Mosque User: Original mosque and session selection */
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

            {availableMosques.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="location-off" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>No mosques found</Text>
                <Text style={styles.emptySubtitle}>
                  {networkStatus === 'connected'
                    ? 'No mosques with translation services found in your area. Try refreshing or check your location settings.'
                    : 'Unable to load mosque data. Please check your internet connection and try again.'
                  }
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRefresh}
                >
                  <Icon name="refresh" size={20} color="#2E7D32" />
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              availableMosques.map((mosque) => (
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
              ))
            )}
          </View>
        </ScrollView>
        )
      ) : (
        /* Multi-Language Translation View with Voice Recognition */
        <View style={{ flex: 1 }}>
          {/* Voice Recognition Component (Imam/Mosque Admin Only) */}
          {userType === AuthService.USER_TYPES.MOSQUE_ADMIN && (
            <VoiceRecognitionComponent
              socketRef={{ current: socket }}
              currentSessionId={selectedSession?.sessionId}
              currentProvider="munsit"
              onTranscription={(transcription) => {
                console.log('Voice transcription:', transcription);
              }}
              onError={(error) => {
                console.error('Voice recognition error:', error);
                Alert.alert('Voice Recognition Error', error.message);
              }}
              isImam={true}
            />
          )}

          {/* Multi-Language Translation View */}
          <MultiLanguageTranslationView
            sessionId={selectedSession?.sessionId}
            socket={socket}
            userType={userType}
            isVisible={showTranslationView}
          />
        </View>
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
    paddingTop: 12,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  networkText: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 3,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 5,
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  retryText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
});

export default TranslationScreen;

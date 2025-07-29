import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// Temporarily disable audio module to fix native module error
// import { AudioModule } from 'expo-audio';
import AuthService from '../services/AuthService/AuthService';
import SocketService from '../services/SocketService/SocketService';
import VoiceRecognitionComponent from '../components/Audio/VoiceRecognitionComponent';

const { width } = Dimensions.get('window');

const BroadcastingScreen = ({ navigation }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [connectedListeners, setConnectedListeners] = useState(0);
  const [broadcastDuration, setBroadcastDuration] = useState(0);
  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [broadcastHistory, setBroadcastHistory] = useState([]);

  // New state for voice recognition and audio
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptionPreview, setTranscriptionPreview] = useState('');
  const [partialTranscription, setPartialTranscription] = useState('');
  const [isVoiceRecognitionActive, setIsVoiceRecognitionActive] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [audioPermission, setAudioPermission] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState('munsit');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationInterval = useRef(null);
  const voiceRecognitionRef = useRef(null);

  useEffect(() => {
    initializeScreen();
    return () => {
      cleanup();
    };
  }, []);

  const initializeScreen = async () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    // Request audio permissions
    await requestAudioPermissions();

    // Load broadcast history
    loadBroadcastHistory();

    // Initialize socket connection
    initializeSocket();
  };

  const requestAudioPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Audio Recording Permission',
            message: 'This app needs access to your microphone to broadcast audio.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setAudioPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        // iOS permissions - will be handled by VoiceRecognitionComponent
        // For now, assume permission is granted
        setAudioPermission(true);
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      setAudioPermission(false);
    }
  };

  const initializeSocket = () => {
    try {
      // Use the global SocketService instead of creating a new connection
      const globalSocket = SocketService.getSocket();

      if (globalSocket && globalSocket.connected) {
        console.log('✅ Using existing global socket connection for broadcasting');
        setSocket(globalSocket);

        // Set up broadcast-specific event listeners
        setupBroadcastEventListeners(globalSocket);
      } else {
        console.log('🔌 Global socket not available, initializing...');
        SocketService.initialize().then(() => {
          const newSocket = SocketService.getSocket();
          if (newSocket) {
            console.log('✅ Global socket initialized for broadcasting');
            setSocket(newSocket);
            setupBroadcastEventListeners(newSocket);
          }
        });
      }
    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  };

  const setupBroadcastEventListeners = (socketConnection) => {
    if (!socketConnection) return;

    console.log('🔧 Setting up broadcast event listeners...');

    // Remove existing listeners to avoid duplicates
    socketConnection.off('listener_joined');
    socketConnection.off('listener_left');
    socketConnection.off('voice_transcription');
    socketConnection.off('voice_recognition_error');

    // Set up broadcast-specific listeners
    socketConnection.on('listener_joined', (data) => {
      console.log('👥 Listener joined:', data);
      setConnectedListeners(prev => prev + 1);
    });

    socketConnection.on('listener_left', (data) => {
      console.log('👥 Listener left:', data);
      setConnectedListeners(prev => Math.max(0, prev - 1));
    });

    // Voice recognition events
    socketConnection.on('voice_transcription', (transcription) => {
      console.log('📝 Received transcription:', transcription);

      if (transcription.isFinal) {
        // Final transcription - add to main display
        setTranscriptionPreview(prev => {
          const newText = prev ? `${prev}\n${transcription.text}` : transcription.text;
          return newText;
        });
        setPartialTranscription(''); // Clear partial text
      } else {
        // Partial transcription - show in real-time
        setPartialTranscription(transcription.text);
      }
    });

    socketConnection.on('voice_recognition_error', (error) => {
      console.error('Voice recognition error:', error);
      Alert.alert('Voice Recognition Error', error.message);
    });

    console.log('✅ Broadcast event listeners set up successfully');
  };

  const loadBroadcastHistory = () => {
    // Mock broadcast history
    const mockHistory = [
      {
        id: 1,
        title: 'Friday Khutbah',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        duration: '45:30',
        listeners: 67,
        language: 'Arabic',
      },
      {
        id: 2,
        title: 'Evening Prayer',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        duration: '12:15',
        listeners: 23,
        language: 'Arabic',
      },
    ];
    setBroadcastHistory(mockHistory);
  };

  const startBroadcast = async () => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      if (!audioPermission) {
        Alert.alert('Permission Required', 'Microphone permission is required for broadcasting.');
        await requestAudioPermissions();
        return;
      }

      // Generate session ID
      const sessionId = `session_${currentUser.id}_${Date.now()}`;
      setCurrentSessionId(sessionId);

      // Start recording animation
      startPulseAnimation();

      setIsRecording(true);
      setIsBroadcasting(true);
      setBroadcastDuration(0);
      setTranscriptionPreview('');

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setBroadcastDuration(prev => prev + 1);
      }, 1000);

      // Start voice recognition
      if (voiceRecognitionRef.current) {
        try {
          await voiceRecognitionRef.current.startRecording({
            sessionId,
            provider: 'munsit', // Default provider - specialized for Arabic
            language: 'ar-SA',
            enableRecording: true,
            sessionType: 'general',
            recordingTitle: `Broadcast ${new Date().toLocaleString()}`
          });
          setIsVoiceRecognitionActive(true);
        } catch (voiceError) {
          console.warn('Voice recognition failed to start:', voiceError);
          // Continue without voice recognition
        }
      }

      // Refresh socket authentication before starting broadcast
      console.log('🔄 Refreshing socket authentication before broadcast...');
      await SocketService.refreshAuthentication();

      // Emit broadcast start to socket
      if (socket && socket.connected) {
        console.log('📡 Emitting start_broadcast event:', {
          sessionId,
          mosqueId: currentUser.id,
          mosqueName: currentUser.mosqueName,
          language: 'Arabic',
          enableVoiceRecognition: true,
          enableRecording: true
        });

        socket.emit('start_broadcast', {
          sessionId,
          mosqueId: currentUser.id,
          mosqueName: currentUser.mosqueName,
          language: 'Arabic',
          enableVoiceRecognition: true,
          enableRecording: true
        }, (response) => {
          console.log('📡 start_broadcast response:', response);
          if (response && !response.success) {
            console.error('❌ Broadcast start failed:', response.error);
            Alert.alert('Broadcast Error', response.error || 'Failed to start broadcast. Please try again.');
          }
        });
      } else {
        console.error('❌ Socket not connected when trying to start broadcast');
        Alert.alert('Connection Error', 'Socket not connected. Please check your connection and try again.');
      }

      Alert.alert('Broadcasting Started', 'Your live broadcast is now active. Voice recognition and recording are enabled.');
    } catch (error) {
      console.error('Error starting broadcast:', error);
      Alert.alert('Error', 'Failed to start broadcast');
    }
  };

  const stopBroadcast = async () => {
    try {
      setIsRecording(false);
      setIsBroadcasting(false);

      // Stop voice recognition
      if (voiceRecognitionRef.current && isVoiceRecognitionActive) {
        try {
          await voiceRecognitionRef.current.stopRecording();
        } catch (voiceError) {
          console.warn('Error stopping voice recognition:', voiceError);
        }
      }
      setIsVoiceRecognitionActive(false);

      // Stop animations and timers
      stopPulseAnimation();
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Emit broadcast stop to socket
      if (socket && socket.connected) {
        console.log('📡 Emitting stop_broadcast event:', {
          sessionId: currentSessionId,
          mosqueId: currentUser.id,
          duration: broadcastDuration,
          listeners: connectedListeners,
        });

        socket.emit('stop_broadcast', {
          sessionId: currentSessionId,
          mosqueId: currentUser.id,
          duration: broadcastDuration,
          listeners: connectedListeners,
        }, (response) => {
          console.log('📡 stop_broadcast response:', response);
        });
      } else {
        console.error('❌ Socket not connected when trying to stop broadcast');
      }

      // Reset state
      setConnectedListeners(0);
      setBroadcastDuration(0);
      setTranscriptionPreview('');
      setCurrentSessionId(null);
      setAudioLevel(0);

      Alert.alert('Broadcasting Stopped', `Broadcast ended after ${formatDuration(broadcastDuration)} with ${connectedListeners} listeners.`);

      // Reload history
      loadBroadcastHistory();
    } catch (error) {
      console.error('Error stopping broadcast:', error);
      Alert.alert('Error', 'Failed to stop broadcast');
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanup = () => {
    if (socket) {
      socket.disconnect();
    }
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    stopPulseAnimation();
  };

  const renderBroadcastHistory = () => (
    <View style={styles.historySection}>
      <Text style={styles.sectionTitle}>Recent Broadcasts</Text>
      {broadcastHistory.map((broadcast) => (
        <View key={broadcast.id} style={styles.historyItem}>
          <View style={styles.historyInfo}>
            <Text style={styles.historyTitle}>{broadcast.title}</Text>
            <Text style={styles.historyDate}>
              {broadcast.date.toLocaleDateString()} • {broadcast.duration}
            </Text>
            <Text style={styles.historyStats}>
              {broadcast.listeners} listeners • {broadcast.language}
            </Text>
          </View>
          <Icon name="play-circle-outline" size={24} color="#2E7D32" />
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Live Broadcasting</Text>
        <Text style={styles.subtitle}>
          {currentUser?.mosqueName || 'Mosque Broadcasting'}
        </Text>
      </View>

      {/* Broadcasting Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isBroadcasting && styles.liveDot]} />
          <Text style={styles.statusText}>
            {isBroadcasting ? 'LIVE' : 'OFFLINE'}
          </Text>
        </View>

        {isBroadcasting && (
          <View style={styles.liveStats}>
            <Text style={styles.duration}>{formatDuration(broadcastDuration)}</Text>
            <Text style={styles.listeners}>{connectedListeners} listeners</Text>

            {/* Audio Level Indicator */}
            <View style={styles.audioLevelContainer}>
              <Text style={styles.audioLevelLabel}>Audio Level</Text>
              <View style={styles.audioLevelBar}>
                <View
                  style={[
                    styles.audioLevelFill,
                    { width: `${Math.min(audioLevel, 100)}%` }
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        <Animated.View style={[styles.microphoneContainer, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[styles.microphoneButton, isBroadcasting && styles.recordingButton]}
            onPress={isBroadcasting ? stopBroadcast : startBroadcast}
          >
            <Icon 
              name={isBroadcasting ? "stop" : "mic"} 
              size={48} 
              color="#fff" 
            />
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.instructionText}>
          {isBroadcasting 
            ? 'Tap to stop broadcasting' 
            : 'Tap to start live broadcast'
          }
        </Text>
      </View>

      {/* Live Transcription Preview */}
      {isBroadcasting && (
        <View style={styles.transcriptionContainer}>
          <View style={styles.transcriptionHeader}>
            <Text style={styles.transcriptionTitle}>Live Transcription ({voiceProvider.toUpperCase()})</Text>

            {/* Voice Level Indicator */}
            <View style={styles.voiceIndicatorContainer}>
              <View style={styles.voiceWaveContainer}>
                {[...Array(5)].map((_, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.voiceWaveBar,
                      {
                        height: audioLevel > (index * 20) ?
                          Math.max(4, audioLevel * 0.8) : 4,
                        backgroundColor: audioLevel > (index * 20) ?
                          '#4CAF50' : '#E0E0E0'
                      }
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.audioLevelText}>
                {Math.round(audioLevel)}%
              </Text>
            </View>
          </View>

          <ScrollView style={styles.transcriptionScroll} showsVerticalScrollIndicator={false}>
            {/* Final Transcriptions */}
            {transcriptionPreview ? (
              <Text style={styles.transcriptionText}>
                {transcriptionPreview}
              </Text>
            ) : null}

            {/* Partial/Real-time Transcription */}
            {partialTranscription ? (
              <Text style={[styles.transcriptionText, styles.partialTranscription]}>
                {partialTranscription}
              </Text>
            ) : null}

            {/* Waiting message */}
            {!transcriptionPreview && !partialTranscription && (
              <Text style={styles.waitingText}>
                🎙️ Waiting for voice input...
                {'\n'}Speak in Arabic to see real-time transcription
              </Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Voice Recognition Component */}
      <VoiceRecognitionComponent
        ref={voiceRecognitionRef}
        socketRef={{ current: socket }}
        currentSessionId={currentSessionId}
        currentProvider={voiceProvider}
        onAudioLevel={setAudioLevel}
        onTranscription={(transcription) => {
          console.log('🎙️ Voice recognition transcription:', transcription);

          if (transcription.isFinal) {
            // Final transcription - add to main display
            setTranscriptionPreview(prev => {
              const newText = prev ? `${prev}\n${transcription.text}` : transcription.text;
              return newText;
            });
            setPartialTranscription(''); // Clear partial text
          } else {
            // Partial transcription - show in real-time
            setPartialTranscription(transcription.text);
          }
        }}
        onError={(error) => {
          console.error('Voice recognition error:', error);
          Alert.alert('Voice Recognition Error', error.message);
        }}
      />

      {/* Broadcasting Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Icon name="language" size={20} color="#666" />
          <Text style={styles.infoText}>Arabic (Primary)</Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="people" size={20} color="#666" />
          <Text style={styles.infoText}>Available to followers</Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="translate" size={20} color="#666" />
          <Text style={styles.infoText}>Real-time translation enabled</Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="mic" size={20} color="#666" />
          <Text style={styles.infoText}>
            Voice recognition: {isVoiceRecognitionActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="fiber-manual-record" size={20} color="#666" />
          <Text style={styles.infoText}>
            Audio recording: {isBroadcasting ? 'Recording' : 'Stopped'}
          </Text>
        </View>
      </View>

      {/* Broadcast History */}
      {renderBroadcastHistory()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    marginTop: 5,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 3,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ccc',
    marginRight: 8,
  },
  liveDot: {
    backgroundColor: '#FF4444',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  liveStats: {
    alignItems: 'center',
    marginBottom: 20,
  },
  duration: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  listeners: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  audioLevelContainer: {
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
  },
  audioLevelLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  audioLevelBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  audioLevelFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  microphoneContainer: {
    marginVertical: 20,
  },
  microphoneButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  recordingButton: {
    backgroundColor: '#FF4444',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  infoContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  transcriptionContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    maxHeight: 200,
  },
  transcriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  transcriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  voiceIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceWaveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 30,
    marginRight: 10,
  },
  voiceWaveBar: {
    width: 4,
    marginHorizontal: 1,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
  },
  audioLevelText: {
    fontSize: 12,
    color: '#666',
    minWidth: 35,
  },
  transcriptionScroll: {
    maxHeight: 120,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'right', // RTL for Arabic
    marginBottom: 5,
  },
  partialTranscription: {
    color: '#666',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  waitingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  historySection: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyStats: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 2,
  },
});

export default BroadcastingScreen;

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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import AuthService from '../services/AuthService/AuthService';

const { width } = Dimensions.get('window');

const BroadcastingScreen = ({ navigation }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [connectedListeners, setConnectedListeners] = useState(0);
  const [broadcastDuration, setBroadcastDuration] = useState(0);
  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationInterval = useRef(null);

  useEffect(() => {
    initializeScreen();
    return () => {
      cleanup();
    };
  }, []);

  const initializeScreen = async () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
    
    // Load broadcast history
    loadBroadcastHistory();
    
    // Initialize socket connection
    initializeSocket();
  };

  const initializeSocket = () => {
    try {
      const socketConnection = io(API_BASE_URL.replace('/api', ''), {
        transports: ['websocket'],
      });

      socketConnection.on('connect', () => {
        console.log('Broadcasting socket connected');
      });

      socketConnection.on('listener_joined', (data) => {
        setConnectedListeners(prev => prev + 1);
      });

      socketConnection.on('listener_left', (data) => {
        setConnectedListeners(prev => Math.max(0, prev - 1));
      });

      socketConnection.on('disconnect', () => {
        console.log('Broadcasting socket disconnected');
      });

      setSocket(socketConnection);
    } catch (error) {
      console.error('Socket connection error:', error);
    }
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

      // Start recording animation
      startPulseAnimation();
      
      setIsRecording(true);
      setIsBroadcasting(true);
      setBroadcastDuration(0);
      
      // Start duration timer
      durationInterval.current = setInterval(() => {
        setBroadcastDuration(prev => prev + 1);
      }, 1000);

      // Emit broadcast start to socket
      if (socket) {
        socket.emit('start_broadcast', {
          mosqueId: currentUser.id,
          mosqueName: currentUser.mosqueName,
          language: 'Arabic', // Default language
        });
      }

      Alert.alert('Broadcasting Started', 'Your live broadcast is now active. Followers can join to receive translations.');
    } catch (error) {
      console.error('Error starting broadcast:', error);
      Alert.alert('Error', 'Failed to start broadcast');
    }
  };

  const stopBroadcast = async () => {
    try {
      setIsRecording(false);
      setIsBroadcasting(false);
      
      // Stop animations and timers
      stopPulseAnimation();
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Emit broadcast stop to socket
      if (socket) {
        socket.emit('stop_broadcast', {
          mosqueId: currentUser.id,
          duration: broadcastDuration,
          listeners: connectedListeners,
        });
      }

      // Reset state
      setConnectedListeners(0);
      setBroadcastDuration(0);

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

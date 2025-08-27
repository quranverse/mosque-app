// Real-Time Audio Streaming Component
// Uses react-native-live-audio-stream for true real-time audio capture
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
  PermissionsAndroid
} from 'react-native';
// Temporarily disable native modules for Expo Go testing
// import LiveAudioStream from 'react-native-live-audio-stream';
// import { Buffer } from 'buffer';
// import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Mock implementations for Expo Go
const LiveAudioStream = {
  init: () => console.log('🎙️ LiveAudioStream.init (mocked)'),
  start: () => console.log('🎙️ LiveAudioStream.start (mocked)'),
  stop: () => console.log('🎙️ LiveAudioStream.stop (mocked)'),
  on: () => console.log('🎙️ LiveAudioStream.on (mocked)'),
  removeAllListeners: () => console.log('🎙️ LiveAudioStream.removeAllListeners (mocked)')
};

const Buffer = {
  from: (data, encoding) => ({
    toString: () => data,
    length: data.length
  })
};

const PERMISSIONS = {
  IOS: { MICROPHONE: 'ios.permission.microphone' },
  ANDROID: { RECORD_AUDIO: 'android.permission.RECORD_AUDIO' }
};

const RESULTS = {
  GRANTED: 'granted',
  DENIED: 'denied'
};

const check = async () => RESULTS.GRANTED;
const request = async () => RESULTS.GRANTED;

const RealTimeAudioStreamer = forwardRef(({
  onTranscription,
  onAudioLevel,
  onError,
  provider = 'munsit',
  language = 'ar-SA',
  isEnabled = true,
  socketRef,
  currentSessionId,
  onStreamingStatusChange
}, ref) => {

  // State management
  const [isStreaming, setIsStreaming] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [chunkCount, setChunkCount] = useState(0);
  const [streamingDuration, setStreamingDuration] = useState(0);

  // Refs
  const streamingStartTime = useRef(null);
  const durationInterval = useRef(null);
  const audioLevelInterval = useRef(null);
  const chunkSequence = useRef(0);

  // Animation for voice waves
  const waveAnimations = useRef([...Array(5)].map(() => new Animated.Value(0.1)));

  // Audio streaming configuration optimized for voice recognition
  const audioConfig = {
    sampleRate: 16000,        // Optimized for speech (saves bandwidth)
    channels: 1,              // Mono for voice
    bitsPerSample: 16,        // Good quality
    audioSource: Platform.OS === 'android' ? 6 : undefined, // VOICE_RECOGNITION on Android
    bufferSize: 4096          // ~100-200ms chunks for low latency
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startStreaming: startRealTimeStreaming,
    stopStreaming: stopRealTimeStreaming,
    isStreaming,
    getTranscriptionText: () => transcriptionText,
    getAudioLevel: () => audioLevel,
    getChunkCount: () => chunkCount,
    getDuration: () => streamingDuration
  }));

  // Initialize audio streaming on component mount
  useEffect(() => {
    initializeAudioStreaming();
    return () => {
      cleanup();
    };
  }, []);

  // Initialize the audio streaming system
  const initializeAudioStreaming = async () => {
    try {
      console.log('🎙️ Initializing real-time audio streaming...');
      
      // Request microphone permissions
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        console.error('❌ Microphone permission denied');
        onError?.('Microphone permission required for real-time translation');
        return;
      }

      // Initialize LiveAudioStream with optimized config
      LiveAudioStream.init(audioConfig);
      console.log('✅ LiveAudioStream initialized with config:', audioConfig);

      setHasPermission(true);

    } catch (error) {
      console.error('❌ Failed to initialize audio streaming:', error);
      onError?.(error.message);
    }
  };

  // Request microphone permissions (mocked for Expo Go)
  const requestMicrophonePermission = async () => {
    try {
      console.log('🎙️ Requesting microphone permission (mocked for Expo Go)');

      if (Platform.OS === 'android') {
        // Use React Native's built-in PermissionsAndroid for Expo Go compatibility
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for real-time translation.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // For iOS in Expo Go, assume permission is granted
        console.log('🎙️ iOS permission assumed granted in Expo Go');
        return true;
      }
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      // Return true for testing purposes in Expo Go
      return true;
    }
  };

  // Start real-time audio streaming
  const startRealTimeStreaming = async () => {
    try {
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      if (!socketRef?.current?.connected) {
        throw new Error('Socket connection not available');
      }

      console.log('🎙️ Starting real-time audio streaming...');
      console.log('📡 Session ID:', currentSessionId);
      console.log('🔧 Provider:', provider);

      // Reset counters
      chunkSequence.current = 0;
      setChunkCount(0);
      setStreamingDuration(0);
      setTranscriptionText('');

      // Set up audio data listener
      LiveAudioStream.on('data', handleAudioChunk);

      // Start streaming
      LiveAudioStream.start();
      
      // Update state
      setIsStreaming(true);
      streamingStartTime.current = Date.now();
      
      // Start duration tracking
      startDurationTracking();
      
      // Start audio level animation
      startAudioLevelAnimation();

      // Notify parent component
      onStreamingStatusChange?.(true);

      console.log('✅ Real-time audio streaming started successfully');

    } catch (error) {
      console.error('❌ Failed to start real-time streaming:', error);
      Alert.alert(
        'Streaming Error',
        error.message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => startRealTimeStreaming() }
        ]
      );
      onError?.(error.message);
    }
  };

  // Handle incoming audio chunks from LiveAudioStream (mocked for Expo Go)
  const handleAudioChunk = (base64AudioData) => {
    try {
      console.log('🎙️ Processing audio chunk (mocked for Expo Go)');
      // Mock audio buffer for testing
      const audioBuffer = Buffer.from(base64AudioData || 'mock-audio-data', 'base64');
      
      // Update chunk count
      chunkSequence.current += 1;
      setChunkCount(chunkSequence.current);

      // Calculate simulated audio level for visualization
      const simulatedLevel = Math.random() * 0.6 + 0.2; // 20-80%
      setAudioLevel(simulatedLevel);
      onAudioLevel?.(simulatedLevel);

      // Log chunk info
      console.log(`📤 Audio chunk ${chunkSequence.current}: ${audioBuffer.length} bytes`);

      // Send to backend via socket
      if (socketRef?.current?.connected && currentSessionId) {
        const chunkData = {
          sessionId: currentSessionId,
          audioData: base64AudioData, // Send as base64 for safe transmission
          sequence: chunkSequence.current,
          timestamp: Date.now(),
          sampleRate: audioConfig.sampleRate,
          channels: audioConfig.channels,
          format: 'pcm',
          provider: provider,
          language: language
        };

        socketRef.current.emit('realtime_audio_chunk', chunkData);
      }

    } catch (error) {
      console.error('❌ Error handling audio chunk:', error);
      onError?.(error.message);
    }
  };

  // Stop real-time audio streaming
  const stopRealTimeStreaming = () => {
    try {
      console.log('🛑 Stopping real-time audio streaming...');

      // Stop LiveAudioStream
      LiveAudioStream.stop();

      // Remove event listener
      LiveAudioStream.removeAllListeners('data');

      // Update state
      setIsStreaming(false);
      
      // Stop tracking
      stopDurationTracking();
      stopAudioLevelAnimation();

      // Notify parent component
      onStreamingStatusChange?.(false);

      console.log('✅ Real-time audio streaming stopped');
      console.log(`📊 Total chunks sent: ${chunkSequence.current}`);
      console.log(`⏱️ Total duration: ${streamingDuration}s`);

    } catch (error) {
      console.error('❌ Error stopping streaming:', error);
      onError?.(error.message);
    }
  };

  // Start duration tracking
  const startDurationTracking = () => {
    durationInterval.current = setInterval(() => {
      if (streamingStartTime.current) {
        const duration = Math.floor((Date.now() - streamingStartTime.current) / 1000);
        setStreamingDuration(duration);
      }
    }, 1000);
  };

  // Stop duration tracking
  const stopDurationTracking = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  // Start audio level animation
  const startAudioLevelAnimation = () => {
    const animateWaves = () => {
      const animations = waveAnimations.current.map((anim, index) => {
        return Animated.timing(anim, {
          toValue: Math.random() * 0.8 + 0.2,
          duration: 150 + Math.random() * 100,
          useNativeDriver: false,
        });
      });

      Animated.parallel(animations).start(() => {
        if (isStreaming) {
          setTimeout(animateWaves, 100);
        }
      });
    };

    animateWaves();
  };

  // Stop audio level animation
  const stopAudioLevelAnimation = () => {
    waveAnimations.current.forEach(anim => {
      anim.setValue(0.1);
    });
  };

  // Cleanup function
  const cleanup = () => {
    if (isStreaming) {
      stopRealTimeStreaming();
    }
    stopDurationTracking();
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Streaming Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: isStreaming ? '#4CAF50' : '#757575' }]} />
        <Text style={styles.statusText}>
          {isStreaming ? 'Live Streaming' : 'Ready to Stream'}
        </Text>
        {isStreaming && (
          <Text style={styles.durationText}>
            {formatDuration(streamingDuration)}
          </Text>
        )}
      </View>

      {/* Voice Wave Visualization */}
      <View style={styles.waveContainer}>
        {waveAnimations.current.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveBar,
              {
                height: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 50],
                }),
                backgroundColor: isStreaming ? '#4CAF50' : '#757575',
              },
            ]}
          />
        ))}
      </View>

      {/* Audio Level Display */}
      {isStreaming && (
        <Text style={styles.audioLevelText}>
          Audio Level: {Math.round(audioLevel * 100)}%
        </Text>
      )}

      {/* Chunk Counter */}
      {isStreaming && (
        <Text style={styles.chunkCountText}>
          Chunks Sent: {chunkCount}
        </Text>
      )}

      {/* Transcription Display */}
      {transcriptionText && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>Live Transcription:</Text>
          <Text style={styles.transcriptionText}>{transcriptionText}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    margin: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  waveContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 60,
    marginBottom: 16,
  },
  waveBar: {
    width: 8,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  audioLevelText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  chunkCountText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  transcriptionContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});

export default RealTimeAudioStreamer;

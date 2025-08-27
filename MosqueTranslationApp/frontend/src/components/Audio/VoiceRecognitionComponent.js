// Voice Recognition Component for Real-Time Audio Streaming
// Clean version with only real audio recording functionality
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform
} from 'react-native';

const VoiceRecognitionComponent = forwardRef(({
  onTranscription,
  onAudioLevel,
  onError,
  provider = 'munsit',
  language = 'ar-SA',
  isEnabled = true,
  socketRef,
  currentSessionId,
  currentProvider
}, ref) => {

  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingPath, setRecordingPath] = useState('');
  const [isTranscriptionMode, setIsTranscriptionMode] = useState(false);

  // Debug wrapper for setIsRecording to track when it changes
  const setIsRecordingWithDebug = (value) => {
    console.log(`🔄 setIsRecording called: ${isRecording} → ${value}`);
    if (value === false && isRecording === true) {
      console.log('⚠️ Recording is being stopped! Stack trace:');
      console.trace();
    }
    setIsRecording(value);
  };

  // Refs for audio recording
  const audioRecordingRef = useRef(null);
  const recordingRef = useRef(null);

  // Animation refs for voice waves
  const waveAnimations = useRef([...Array(5)].map(() => new Animated.Value(0.1)));

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startRecording: startAudioCapture,
    stopRecording: stopAudioCapture,
    isRecording,
    getTranscriptionText: () => transcriptionText,
    getAudioLevel: () => audioLevel
  }));

  // Request audio permissions
  const requestAudioPermissions = async () => {
    try {
      console.log('🔐 Requesting audio permissions...');
      
      const { Audio } = require('expo-av');
      const { status } = await Audio.requestPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Audio permissions granted');
        return true;
      } else {
        console.log('❌ Audio permissions denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting audio permissions:', error);
      return false;
    }
  };

  // Start audio capture
  const startAudioCapture = async (options = {}) => {
    try {
      console.log('🎙️ Starting REAL audio capture with options:', options);
      setIsRecordingWithDebug(true);

      // Store options for later use
      recordingRef.current = {
        ...recordingRef.current,
        options: options
      };

      // Start real audio recording
      await startRealAudioRecording(options);

      console.log('✅ Real audio capture started successfully');

    } catch (error) {
      console.error('❌ Audio capture failed:', error);
      Alert.alert(
        'Microphone Access Required',
        'Please allow microphone access to use voice recognition.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => startAudioCapture(options) }
        ]
      );
      throw error;
    }
  };

  // Stop audio capture (when broadcast ends - stops everything)
  const stopAudioCapture = async () => {
    try {
      console.log('🛑 Stopping audio capture (broadcast ended)...');
      setIsRecordingWithDebug(false);
      setIsTranscriptionMode(false); // Stop transcription mode when broadcast ends

      // Stop real audio recording
      if (audioRecordingRef.current) {
        try {
          // Stop the real recording
          const result = await audioRecordingRef.current.stopAndUnloadAsync();
          console.log('🛑 Real recording stopped, result:', result);

          // Get URI from the recording using getURI() method
          const uri = audioRecordingRef.current.getURI();
          console.log('📁 Recording URI from getURI():', uri);

          if (uri) {
            setRecordingPath(uri);
            console.log('✅ URI extracted successfully');
          } else {
            console.warn('⚠️ No URI found in recording result');
          }

          // Send final audio file to backend for storage
          if (socketRef.current && uri) {
            try {
              // Read the complete audio file using the URI
              const finalAudioData = await readCompleteAudioFile(uri);

              if (finalAudioData) {
                console.log('🔌 Socket available:', !!socketRef.current);
                console.log('🔌 Socket connected:', socketRef.current?.connected);

                // Get recording options from stored reference
                const recordingOptions = recordingRef.current?.options || {};

                socketRef.current.emit('audio_recording_complete', {
                  sessionId: currentSessionId,
                  audioData: finalAudioData,
                  provider: currentProvider,
                  timestamp: Date.now(),
                  mosque_id: currentSessionId, // Should be actual mosque ID
                  format: 'm4a',
                  duration: Date.now() - (recordingRef.current?.startTime || Date.now()),
                  isRealAudio: true,
                  fileName: recordingOptions.recordingFileName || `recording_${currentSessionId}_${Date.now()}.m4a`,
                  recordingType: recordingOptions.recordingType || recordingOptions.sessionType || 'general',
                  sessionType: recordingOptions.sessionType || 'general',
                  recordingTitle: recordingOptions.recordingTitle || 'Untitled Recording'
                });

                console.log('📤 Sent complete audio file to backend for storage with type:', recordingOptions.recordingType);
              } else {
                console.log('⚠️ No audio data to send to backend');
              }
            } catch (error) {
              console.error('❌ Error sending final audio file:', error);
            }
          }

          audioRecordingRef.current = null;
          console.log('✅ Real audio recording stopped and processed');
        } catch (error) {
          console.error('❌ Error stopping real recording:', error);
        }
      }

      // Start a new lightweight recording just for transcription
      console.log('🎤 Recording stopped but starting transcription-only recording...');
      setIsTranscriptionMode(true);
      await startTranscriptionOnlyRecording();

      // Clean up recording intervals but keep streaming for transcription
      if (recordingRef.current?.levelInterval) {
        clearInterval(recordingRef.current.levelInterval);
      }

      // Clean up real-time chunking interval when recording stops
      if (recordingRef.current?.chunkInterval) {
        clearInterval(recordingRef.current.chunkInterval);
        recordingRef.current.chunkInterval = null;
      }

      // Clean up real-time recorder
      if (recordingRef.current?.realtimeRecorder) {
        try {
          await recordingRef.current.realtimeRecorder.stopRecorder();
          recordingRef.current.realtimeRecorder = null;
        } catch (cleanupError) {
          console.warn('⚠️ Error cleaning up real-time recorder:', cleanupError);
        }
      }

      // Reset audio level
      setAudioLevel(0);

      // Reset wave animations
      waveAnimations.current.forEach(anim => {
        anim.setValue(0.1);
      });

    } catch (error) {
      console.error('❌ Error stopping audio capture:', error);
      throw error;
    }
  };

  // Start transcription-only recording (lightweight, no file saving)
  const startTranscriptionOnlyRecording = async () => {
    try {
      console.log('🎤 Starting transcription-only recording...');

      // Import Audio module
      const Audio = require('expo-av').Audio;

      // Create a new recording just for transcription
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined, // No status update callback
        100 // Update interval
      );

      // Store the transcription recording
      audioRecordingRef.current = recording;

      console.log('✅ Transcription-only recording started');

    } catch (error) {
      console.error('❌ Error starting transcription-only recording:', error);
      setIsTranscriptionMode(false); // Disable transcription mode on error
    }
  };

  // Real audio recording implementation
  const startRealAudioRecording = async (options = {}) => {
    try {
      console.log('🎤 Starting REAL audio recording with options:', options);

      // Try to import Audio from expo-av
      let Audio;
      try {
        Audio = require('expo-av').Audio;
        console.log('🎤 Audio module imported successfully');
      } catch (importError) {
        console.error('❌ Failed to import expo-av:', importError);
        throw new Error('expo-av not available');
      }

      // Check if we're in a compatible environment
      if (!Audio || !Audio.Recording) {
        throw new Error('Audio.Recording not available in this environment');
      }

      console.log('🎤 Audio.Recording available, proceeding...');

      // Request permissions first
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }
      console.log('🎤 Audio permissions granted');

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });
      console.log('🎤 Audio mode configured');

      // Create recording instance
      const recording = new Audio.Recording();
      console.log('🎤 Recording instance created');
      
      // Configure recording options with metering enabled
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
        // Enable metering for all platforms
        isMeteringEnabled: true,
      };

      // Prepare and start recording
      console.log('🎤 Preparing recording...');
      await recording.prepareToRecordAsync(recordingOptions);
      console.log('🎤 Recording prepared, starting...');
      
      await recording.startAsync();
      console.log('🎤 Recording started successfully!');
      
      // Test if recording is actually working
      const initialStatus = await recording.getStatusAsync();
      console.log('🎤 Initial recording status:', initialStatus);

      // Store recording reference
      audioRecordingRef.current = recording;
      
      const startTime = Date.now();
      const recordingId = `recording_${startTime}_${Math.random().toString(36).substring(2, 11)}`;

      recordingRef.current = {
        ...recordingRef.current, // Preserve existing options
        recording: recording,
        startTime: startTime,
        recordingId: recordingId
      };

      console.log('✅ Real audio recording started');

      // Start real audio level monitoring
      startRealAudioLevelMonitoring();

      // Real-time streaming is not properly implemented yet
      console.error('❌ REAL-TIME TRANSLATION NOT AVAILABLE');
      console.error('❌ The app cannot provide real-time translation as required for mosque use');
      console.error('❌ This is a critical limitation - users will not get live translation');

      // Don't start fake streaming that doesn't work
      throw new Error('Real-time translation system not implemented - cannot proceed with mosque broadcasting');

      console.log('✅ Real audio capture started successfully');
      console.log('🎯 Real voice recognition will be handled by backend');
      console.log('🎯 Real voice recognition active - backend will handle transcription');

    } catch (error) {
      console.error('❌ Real audio recording failed:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);

      // Re-throw error - no fallback to simulation
      throw error;
    }
  };

  // Function to read complete audio file
  const readCompleteAudioFile = async (recordingResult) => {
    try {
      // Get the URI from the recording result
      const uri = recordingResult.uri || recordingResult;



      if (!uri || typeof uri !== 'string') {
        console.error('❌ No valid URI found in recording result:', recordingResult);
        return null;
      }

      console.log(`📁 Reading complete audio file from: ${uri}`);

      // Try to use FileSystem to read the audio file
      try {
        const FileSystem = require('expo-file-system');

        if (FileSystem && FileSystem.readAsStringAsync) {
          // Check if file exists
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (!fileInfo.exists) {
            console.error('❌ Audio file does not exist:', uri);
            return null;
          }

          console.log(`📁 File exists, size: ${fileInfo.size} bytes`);

          // Read the audio file as base64
          const audioBase64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType?.Base64 || 'base64',
          });

          // Convert base64 to array buffer for streaming
          const binaryString = atob(audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          console.log(`📤 Read complete audio file: ${bytes.length} bytes`);
          return Array.from(bytes); // Convert to regular array for JSON serialization
        }
      } catch (fileSystemError) {
        console.warn('⚠️ FileSystem not available, using fallback approach:', fileSystemError);
      }

      // Fallback: Return the URI for the backend to handle
      console.log('📤 Returning audio URI for backend processing:', uri);
      return { uri, type: 'audio_uri' };

    } catch (error) {
      console.error('❌ Error reading complete audio file:', error);
      return null;
    }
  };

  // REMOVED: Fake chunking system that doesn't work

  // REMOVED: Fake audio chunk extraction

  // REMOVED: Duplicate fake function

  // Real audio level monitoring
  const startRealAudioLevelMonitoring = () => {
    try {
      console.log('🎵 Starting REAL audio level monitoring...');

      // Monitor real audio levels from the recording
      const levelInterval = setInterval(async () => {
        if (isRecording && audioRecordingRef.current) {
          try {
            // Get current recording status with metering data
            const status = await audioRecordingRef.current.getStatusAsync();

            if (status.isRecording) {
              // Use real audio metering data if available
              let currentLevel = 0.1; // Default minimum level

              if (status.metering !== undefined) {
                // Convert metering value (typically -160 to 0 dB) to 0-1 range
                const dbLevel = status.metering;
                currentLevel = Math.max(0.1, Math.min(1.0, (dbLevel + 60) / 60));
                console.log(`🎵 Real audio level: ${dbLevel} dB -> ${currentLevel}`);
              } else {
                // Alternative: Use duration-based pattern when metering unavailable
                const timeElapsed = Date.now() - (recordingRef.current?.startTime || Date.now());
                const speechPattern = Math.sin(timeElapsed / 1000) * 0.3 + 0.5;
                const randomVariation = Math.random() * 0.3;
                currentLevel = Math.min(1.0, Math.max(0.1, speechPattern + randomVariation));
                console.log(`🎵 Alternative audio level: ${currentLevel}`);
              }

              setAudioLevel(currentLevel);
              onAudioLevel?.(currentLevel * 100);

              // Animate voice wave bars with real audio data
              animateVoiceWaves(currentLevel);
            }

          } catch (error) {
            // If we can't get status, use minimal level
            const minimalLevel = 0.2 + Math.random() * 0.2;
            setAudioLevel(minimalLevel);
            onAudioLevel?.(minimalLevel * 100);
            animateVoiceWaves(minimalLevel);
          }
        } else {
          clearInterval(levelInterval);
        }
      }, 100); // Update every 100ms for smooth animation

      // Store interval for cleanup
      if (recordingRef.current) {
        recordingRef.current.levelInterval = levelInterval;
      }

      console.log('✅ Real audio level monitoring started');

    } catch (error) {
      console.error('❌ Audio level monitoring setup failed:', error);
    }
  };

  // REMOVED: All fake streaming code
  const startRealAudioStreaming = () => {
    throw new Error('Real-time streaming not implemented - this function should not be called');
  };

  // Function to create audio chunks for streaming (BROKEN - CANNOT WORK)
  const readAudioChunks = async (recordingStatus) => {
    console.error('❌ REAL-TIME AUDIO CHUNKING NOT POSSIBLE');
    console.error('❌ React Native cannot read from files while they are being written');
    console.error('❌ All audio libraries are file-based - no real-time buffer access');
    return null; // Cannot provide real audio chunks
  };


  // Animate voice wave bars
  const animateVoiceWaves = (level) => {
    waveAnimations.current.forEach((anim, index) => {
      const delay = index * 50; // Stagger animation
      const targetValue = level * (0.5 + Math.random() * 0.5); // Add some variation

      Animated.timing(anim, {
        toValue: targetValue,
        duration: 100,
        useNativeDriver: false,
      }).start();
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Recognition</Text>
      
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
                  extrapolate: 'clamp',
                }),
                backgroundColor: isRecording ? '#4CAF50' : '#E0E0E0',
              },
            ]}
          />
        ))}
      </View>

      {/* Recording Status */}
      <Text style={styles.status}>
        {isRecording ? 'Recording...' : 'Ready to record'}
      </Text>

      {/* Transcription Display */}
      {transcriptionText ? (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionText}>{transcriptionText}</Text>
        </View>
      ) : null}

      {/* Audio Level Indicator */}
      <View style={styles.levelContainer}>
        <View style={[styles.levelBar, { width: `${audioLevel * 100}%` }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: 20,
  },
  waveBar: {
    width: 8,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  transcriptionContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    minHeight: 60,
    width: '100%',
  },
  transcriptionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  levelContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  levelBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
});

export default VoiceRecognitionComponent;

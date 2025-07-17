// Voice Recognition Component for Real-Time Audio Streaming
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Audio } from 'expo-av';

const VoiceRecognitionComponent = ({
  sessionId,
  socket,
  onTranscription,
  onError,
  isImam = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProvider, setCurrentProvider] = useState('google');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  const recordingRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    requestAudioPermissions();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      setupSocketListeners();
    }
  }, [socket]);

  const requestAudioPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Audio Recording Permission',
            message: 'This app needs access to your microphone for voice recognition',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        // iOS permission handling
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setHasPermission(false);
    }
  };

  const setupSocketListeners = () => {
    // Listen for transcription results
    socket.on('voice_transcription', (data) => {
      setTranscriptionText(data.text);
      setIsProcessing(false);
      
      if (data.isFinal) {
        onTranscription?.(data);
        
        // If this is the imam, send the transcription for translation
        if (isImam && data.isFinal) {
          socket.emit('send_original_translation', {
            originalText: data.text,
            context: 'speech',
            metadata: {
              provider: data.provider,
              confidence: data.confidence,
              timestamp: data.timestamp
            }
          });
        }
      }
    });

    // Listen for voice recognition errors
    socket.on('voice_recognition_error', (error) => {
      console.error('Voice recognition error:', error);
      setIsProcessing(false);
      onError?.(error);
      Alert.alert('Voice Recognition Error', error.message);
    });

    // Listen for provider status updates
    socket.on('voice_provider_changed', (data) => {
      setCurrentProvider(data.provider);
      Alert.alert('Provider Changed', `Switched to ${data.provider} for better performance`);
    });
  };

  const startRecording = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant microphone permission to use voice recognition');
      return;
    }

    try {
      setIsRecording(true);
      setIsProcessing(true);

      // Start voice recognition on server
      socket.emit('start_voice_recognition', {
        sessionId,
        provider: currentProvider,
        language: 'ar-SA' // Arabic (Saudi Arabia)
      }, (response) => {
        if (!response.success) {
          throw new Error(response.error);
        }
        console.log(`Voice recognition started with ${response.provider}`);
      });

      // Start audio recording
      await startAudioCapture();

    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      setIsProcessing(false);
      Alert.alert('Recording Error', error.message);
    }
  };

  const startAudioCapture = async () => {
    try {
      // Configure audio recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });

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
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;

      // Start streaming audio chunks
      startAudioStreaming();

    } catch (error) {
      console.error('Audio capture failed:', error);
      throw error;
    }
  };

  const startAudioStreaming = () => {
    // For web platform, use MediaRecorder for real-time streaming
    if (Platform.OS === 'web') {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          mediaStreamRef.current = stream;
          
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket) {
              // Convert blob to array buffer and send
              event.data.arrayBuffer().then(buffer => {
                socket.emit('audio_chunk', {
                  sessionId,
                  audioData: buffer,
                  format: 'webm'
                });
              });
            }
          };

          mediaRecorder.start(100); // Send chunks every 100ms
          audioStreamRef.current = mediaRecorder;

          // Setup audio level monitoring
          setupAudioLevelMonitoring(stream);
        })
        .catch(error => {
          console.error('Media stream error:', error);
        });
    } else {
      // For mobile platforms, use periodic audio data extraction
      const interval = setInterval(async () => {
        if (recordingRef.current && isRecording) {
          try {
            // Get current recording status and send audio data
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording) {
              // Note: Real-time audio streaming on mobile requires native modules
              // This is a simplified version - production would need react-native-audio-streaming
              console.log('Recording active, duration:', status.durationMillis);
            }
          } catch (error) {
            console.error('Audio streaming error:', error);
          }
        } else {
          clearInterval(interval);
        }
      }, 100);
    }
  };

  const setupAudioLevelMonitoring = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          setAudioLevel(average / 255); // Normalize to 0-1
          
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Audio level monitoring setup failed:', error);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      
      // Stop server-side voice recognition
      socket.emit('stop_voice_recognition', { sessionId });

      // Stop audio recording
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      // Stop audio streaming
      if (audioStreamRef.current) {
        audioStreamRef.current.stop();
        audioStreamRef.current = null;
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      setAudioLevel(0);
      setIsProcessing(false);

    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const switchProvider = (provider) => {
    if (isRecording) {
      Alert.alert(
        'Switch Provider',
        'Stop recording to switch voice recognition provider?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Switch', 
            onPress: async () => {
              await stopRecording();
              setCurrentProvider(provider);
            }
          }
        ]
      );
    } else {
      setCurrentProvider(provider);
    }
  };

  const cleanup = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  const getProviderIcon = (provider) => {
    const icons = {
      google: 'g-translate',
      azure: 'cloud',
      whisper: 'mic',
      assemblyai: 'speed'
    };
    return icons[provider] || 'mic';
  };

  const getProviderColor = (provider) => {
    const colors = {
      google: '#4285F4',
      azure: '#0078D4',
      whisper: '#10B981',
      assemblyai: '#F59E0B'
    };
    return colors[provider] || '#666';
  };

  if (!isImam) {
    return null; // Only show for imam/mosque admin
  }

  return (
    <View style={styles.container}>
      {/* Voice Recognition Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Icon name="record-voice-over" size={20} color="#2E7D32" />
          <Text style={styles.statusTitle}>Voice Recognition</Text>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isRecording ? '#4CAF50' : '#999' }
          ]} />
        </View>
        
        <Text style={styles.providerText}>
          Provider: {currentProvider.toUpperCase()}
        </Text>
      </View>

      {/* Audio Level Indicator */}
      {isRecording && (
        <View style={styles.audioLevelContainer}>
          <View style={styles.audioLevelBar}>
            <View 
              style={[
                styles.audioLevelFill,
                { width: `${audioLevel * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.audioLevelText}>
            {Math.round(audioLevel * 100)}%
          </Text>
        </View>
      )}

      {/* Current Transcription */}
      {transcriptionText && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>Live Transcription:</Text>
          <Text style={styles.transcriptionText}>{transcriptionText}</Text>
          {isProcessing && (
            <Text style={styles.processingText}>Processing...</Text>
          )}
        </View>
      )}

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={!hasPermission}
        >
          <Icon 
            name={isRecording ? 'stop' : 'mic'} 
            size={32} 
            color="#fff" 
          />
        </TouchableOpacity>
        
        <Text style={styles.recordButtonText}>
          {isRecording ? 'Stop Recording' : 'Start Voice Recognition'}
        </Text>
      </View>

      {/* Provider Selection */}
      <View style={styles.providerContainer}>
        <Text style={styles.providerTitle}>Recognition Provider:</Text>
        <View style={styles.providerButtons}>
          {['google', 'azure', 'whisper'].map(provider => (
            <TouchableOpacity
              key={provider}
              style={[
                styles.providerButton,
                currentProvider === provider && styles.providerButtonActive,
                { borderColor: getProviderColor(provider) }
              ]}
              onPress={() => switchProvider(provider)}
            >
              <Icon 
                name={getProviderIcon(provider)} 
                size={16} 
                color={currentProvider === provider ? '#fff' : getProviderColor(provider)} 
              />
              <Text style={[
                styles.providerButtonText,
                currentProvider === provider && styles.providerButtonTextActive
              ]}>
                {provider}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  providerText: {
    fontSize: 12,
    color: '#666',
  },
  audioLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  audioLevelBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioLevelFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  audioLevelText: {
    fontSize: 12,
    color: '#666',
    minWidth: 35,
  },
  transcriptionContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderRightWidth: 3,
    borderRightColor: '#2E7D32',
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    lineHeight: 24,
  },
  processingText: {
    fontSize: 12,
    color: '#FF9800',
    fontStyle: 'italic',
    marginTop: 4,
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordButtonActive: {
    backgroundColor: '#F44336',
  },
  recordButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  providerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  providerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  providerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  providerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 16,
    gap: 4,
  },
  providerButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  providerButtonText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  providerButtonTextActive: {
    color: '#fff',
  },
});

export default VoiceRecognitionComponent;

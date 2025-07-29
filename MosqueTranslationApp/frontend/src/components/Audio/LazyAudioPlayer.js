// Lazy Audio Player Component - Only loads audio when user explicitly requests it
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Audio } from 'expo-av';

const LazyAudioPlayer = ({
  audioUrl,
  title,
  duration,
  onLoadStart,
  onLoadEnd,
  onError,
  style,
  showWaveform = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [sound, setSound] = useState(null);

  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup audio when component unmounts
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadAudio = async () => {
    if (isLoaded || isLoading) return;

    try {
      setIsLoading(true);
      onLoadStart?.();

      console.log('Loading audio from:', audioUrl);

      // Create and load the audio
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        {
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = audioSound;
      setSound(audioSound);
      setIsLoaded(true);

      // Get audio duration
      const status = await audioSound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setAudioDuration(status.durationMillis);
      }

      console.log('Audio loaded successfully');
      onLoadEnd?.();

    } catch (error) {
      console.error('Error loading audio:', error);
      Alert.alert('Audio Error', 'Failed to load audio file');
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying || false);
      
      if (status.durationMillis) {
        setAudioDuration(status.durationMillis);
      }

      // Auto-stop when finished
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const togglePlayback = async () => {
    if (!isLoaded) {
      await loadAudio();
      return;
    }

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      Alert.alert('Playback Error', 'Failed to control audio playback');
    }
  };

  const seekTo = async (positionMillis) => {
    if (!isLoaded || !soundRef.current) return;

    try {
      await soundRef.current.setPositionAsync(positionMillis);
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (audioDuration === 0) return 0;
    return (position / audioDuration) * 100;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Audio Info */}
      <View style={styles.audioInfo}>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'Audio Recording'}
        </Text>
        <Text style={styles.duration}>
          {formatTime(position)} / {formatTime(audioDuration)}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.playButton,
            isLoading && styles.playButtonDisabled
          ]}
          onPress={togglePlayback}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={24}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        {!isLoaded && !isLoading && (
          <TouchableOpacity
            style={styles.loadButton}
            onPress={loadAudio}
          >
            <Icon name="download" size={16} color="#2E7D32" />
            <Text style={styles.loadButtonText}>Load Audio</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar */}
      {isLoaded && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${getProgressPercentage()}%` }
              ]}
            />
          </View>
        </View>
      )}

      {/* Loading State */}
      {!isLoaded && !isLoading && (
        <View style={styles.unloadedState}>
          <Icon name="music-note" size={20} color="#999" />
          <Text style={styles.unloadedText}>Tap to load audio</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  audioInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  duration: {
    fontSize: 12,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  loadButtonText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E7D32',
  },
  unloadedState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  unloadedText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default LazyAudioPlayer;

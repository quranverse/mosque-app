import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// Note: Install @react-native-community/slider or use a compatible slider component
// For now, we'll create a simple slider placeholder
const Slider = ({ style, minimumValue, maximumValue, value, onValueChange, minimumTrackTintColor, maximumTrackTintColor }) => {
  return (
    <View style={[{ height: 40, backgroundColor: '#333', borderRadius: 2 }, style]}>
      <View style={{
        height: 4,
        backgroundColor: minimumTrackTintColor,
        width: `${(value / maximumValue) * 100}%`,
        borderRadius: 2,
        marginTop: 18,
      }} />
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const SpotifyLikePlayer = ({ 
  broadcast, 
  onClose, 
  isVisible = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(broadcast?.duration || 0);
  const [showTranscription, setShowTranscription] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('arabic');
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement actual audio playback
  };

  const handleSeek = (value) => {
    setCurrentTime(value);
    // TODO: Implement actual audio seeking
  };

  const getTranscriptionText = () => {
    if (selectedLanguage === 'arabic') {
      return broadcast?.transcription || 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ. الحمد لله رب العالمين...';
    }
    return broadcast?.translations?.[selectedLanguage] || 'In the name of Allah, the Most Gracious, the Most Merciful. Praise be to Allah, Lord of the worlds...';
  };

  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        }
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="keyboard-arrow-down" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <Text style={styles.headerSubtitle}>{broadcast?.mosqueName}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Audio Info */}
        <View style={styles.audioInfo}>
          <View style={styles.audioArtwork}>
            <Icon name="mosque" size={80} color="#4CAF50" />
          </View>
          <Text style={styles.audioTitle}>{broadcast?.title}</Text>
          <Text style={styles.audioSubtitle}>
            {broadcast?.imam} • {formatTime(duration)}
          </Text>
          <View style={styles.audioMeta}>
            <View style={styles.metaItem}>
              <Icon name="calendar-today" size={16} color="#999" />
              <Text style={styles.metaText}>
                {broadcast?.date ? new Date(broadcast.date).toLocaleDateString() : 'Today'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="people" size={16} color="#999" />
              <Text style={styles.metaText}>{broadcast?.participantCount || 0} listeners</Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={duration}
            value={currentTime}
            onValueChange={handleSeek}
            minimumTrackTintColor="#4CAF50"
            maximumTrackTintColor="#333"
            thumbStyle={styles.progressThumb}
          />
          <View style={styles.timeLabels}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton}>
            <Icon name="shuffle" size={24} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Icon name="skip-previous" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
            <Icon 
              name={isPlaying ? "pause" : "play-arrow"} 
              size={40} 
              color="#000" 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Icon name="skip-next" size={32} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton}>
            <Icon name="repeat" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Language Selector */}
        <View style={styles.languageSelector}>
          <Text style={styles.sectionTitle}>Transcription Language</Text>
          <View style={styles.languageButtons}>
            {['arabic', 'english', 'urdu'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.languageButton,
                  selectedLanguage === lang && styles.languageButtonActive
                ]}
                onPress={() => setSelectedLanguage(lang)}
              >
                <Text style={[
                  styles.languageButtonText,
                  selectedLanguage === lang && styles.languageButtonTextActive
                ]}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transcription */}
        <View style={styles.transcriptionContainer}>
          <View style={styles.transcriptionHeader}>
            <Text style={styles.sectionTitle}>Live Transcription</Text>
            <TouchableOpacity 
              onPress={() => setShowTranscription(!showTranscription)}
              style={styles.toggleButton}
            >
              <Icon 
                name={showTranscription ? "visibility-off" : "visibility"} 
                size={20} 
                color="#999" 
              />
            </TouchableOpacity>
          </View>
          
          {showTranscription && (
            <ScrollView style={styles.transcriptionScroll} nestedScrollEnabled>
              <Text style={[
                styles.transcriptionText,
                selectedLanguage === 'arabic' && styles.arabicText
              ]}>
                {getTranscriptionText()}
              </Text>
            </ScrollView>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="bookmark-border" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="share" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="download" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Download</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  audioInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  audioArtwork: {
    width: 280,
    height: 280,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  audioTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  audioSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
  },
  audioMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressSlider: {
    width: '100%',
    height: 40,
  },
  progressThumb: {
    backgroundColor: '#4CAF50',
    width: 12,
    height: 12,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -10,
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 20,
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    backgroundColor: '#4CAF50',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageSelector: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
  },
  languageButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  languageButtonText: {
    fontSize: 14,
    color: '#999',
  },
  languageButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  transcriptionContainer: {
    marginBottom: 30,
  },
  transcriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  toggleButton: {
    padding: 8,
  },
  transcriptionScroll: {
    maxHeight: 200,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  arabicText: {
    textAlign: 'right',
    fontFamily: 'System', // Use system Arabic font
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#fff',
  },
});

export default SpotifyLikePlayer;

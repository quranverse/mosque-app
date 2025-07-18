import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const MosqueControlScreen = ({ navigation }) => {
  const [isTranslationActive, setIsTranslationActive] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState(['English']);
  const [connectedListeners, setConnectedListeners] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [mosqueInfo, setMosqueInfo] = useState({
    name: 'My Mosque',
    address: '123 Main Street',
    phone: '+1234567890',
  });

  // Animation refs
  const micPulseAnim = useRef(new Animated.Value(1)).current;
  const audioLevelAnim = useRef(new Animated.Value(0)).current;

  const availableLanguages = [
    'English', 'Arabic', 'Urdu', 'Turkish', 'French',
    'Spanish', 'German', 'Indonesian', 'Malay', 'Bengali'
  ];

  // Effects for animations and timers
  useEffect(() => {
    let interval;
    if (isTranslationActive && isRecording) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTranslationActive, isRecording]);

  useEffect(() => {
    if (isRecording) {
      // Animate microphone pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(micPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Simulate audio level changes
      const audioInterval = setInterval(() => {
        const newLevel = Math.random() * 100;
        setAudioLevel(newLevel);
        Animated.timing(audioLevelAnim, {
          toValue: newLevel,
          duration: 100,
          useNativeDriver: false,
        }).start();
      }, 150);

      return () => clearInterval(audioInterval);
    } else {
      micPulseAnim.setValue(1);
      audioLevelAnim.setValue(0);
    }
  }, [isRecording]);

  const toggleTranslation = () => {
    if (!isTranslationActive) {
      Alert.alert(
        'Start Live Translation',
        'This will start broadcasting live translation to connected users.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Start', 
            onPress: () => {
              setIsTranslationActive(true);
              // Simulate connected listeners
              setTimeout(() => setConnectedListeners(12), 1000);
              setTimeout(() => setConnectedListeners(25), 3000);
              setTimeout(() => setConnectedListeners(38), 5000);
            }
          },
        ]
      );
    } else {
      Alert.alert(
        'Stop Live Translation',
        'This will stop the live translation broadcast.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Stop', 
            onPress: () => {
              setIsTranslationActive(false);
              setConnectedListeners(0);
            }
          },
        ]
      );
    }
  };

  const toggleLanguage = (language) => {
    if (selectedLanguages.includes(language)) {
      setSelectedLanguages(prev => prev.filter(lang => lang !== language));
    } else {
      setSelectedLanguages(prev => [...prev, language]);
    }
  };

  const startRecording = () => {
    if (!isTranslationActive) {
      Alert.alert(
        'Translation Not Active',
        'Please start the translation broadcast first.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Start Recording',
      'This will start recording your voice for live translation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            setIsRecording(true);
            setSessionDuration(0);
          }
        },
      ]
    );
  };

  const stopRecording = () => {
    Alert.alert(
      'Stop Recording',
      'This will stop the voice recording.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          onPress: () => {
            setIsRecording(false);
          }
        },
      ]
    );
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMicrophoneInterface = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Microphone Broadcasting</Text>

      <View style={styles.micCard}>
        {/* Microphone Button */}
        <View style={styles.micContainer}>
          <Animated.View style={[
            styles.micButtonContainer,
            { transform: [{ scale: micPulseAnim }] }
          ]}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonActive
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={!isTranslationActive}
            >
              <Icon
                name={isRecording ? "stop" : "mic"}
                size={40}
                color={!isTranslationActive ? "#ccc" : isRecording ? "#fff" : "#2E7D32"}
              />
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.micLabel}>
            {!isTranslationActive
              ? 'Start broadcast first'
              : isRecording
                ? 'Recording...'
                : 'Tap to start recording'
            }
          </Text>
        </View>

        {/* Audio Level Indicator */}
        {isRecording && (
          <View style={styles.audioLevelContainer}>
            <Text style={styles.audioLevelLabel}>Audio Level</Text>
            <View style={styles.audioLevelBar}>
              <Animated.View
                style={[
                  styles.audioLevelFill,
                  {
                    width: audioLevelAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    })
                  }
                ]}
              />
            </View>
          </View>
        )}

        {/* Session Info */}
        {isRecording && (
          <View style={styles.sessionInfo}>
            <View style={styles.sessionItem}>
              <Icon name="timer" size={16} color="#4CAF50" />
              <Text style={styles.sessionText}>Duration: {formatDuration(sessionDuration)}</Text>
            </View>
            <View style={styles.sessionItem}>
              <Icon name="people" size={16} color="#4CAF50" />
              <Text style={styles.sessionText}>{connectedListeners} listening</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderTranslationControl = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Live Translation Control</Text>

      <View style={styles.controlCard}>
        <View style={styles.controlHeader}>
          <View>
            <Text style={styles.controlTitle}>Translation Broadcast</Text>
            <Text style={styles.controlSubtitle}>
              {isTranslationActive ? 'Broadcasting live' : 'Not broadcasting'}
            </Text>
          </View>
          <Switch
            value={isTranslationActive}
            onValueChange={toggleTranslation}
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            thumbColor={isTranslationActive ? '#2E7D32' : '#f4f3f4'}
          />
        </View>

        {isTranslationActive && (
          <View style={styles.liveStats}>
            <View style={styles.statItem}>
              <Icon name="people" size={20} color="#4CAF50" />
              <Text style={styles.statText}>{connectedListeners} listeners</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderLanguageSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Translation Languages</Text>
      <Text style={styles.sectionSubtitle}>
        Select languages for live translation
      </Text>
      
      <View style={styles.languageGrid}>
        {availableLanguages.map((language) => (
          <TouchableOpacity
            key={language}
            style={[
              styles.languageChip,
              selectedLanguages.includes(language) && styles.selectedLanguageChip
            ]}
            onPress={() => toggleLanguage(language)}
          >
            <Text style={[
              styles.languageText,
              selectedLanguages.includes(language) && styles.selectedLanguageText
            ]}>
              {language}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMosqueInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mosque Information</Text>
      
      <View style={styles.infoCard}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Mosque Name</Text>
          <TextInput
            style={styles.infoInput}
            value={mosqueInfo.name}
            onChangeText={(text) => setMosqueInfo(prev => ({ ...prev, name: text }))}
            placeholder="Enter mosque name"
          />
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Address</Text>
          <TextInput
            style={styles.infoInput}
            value={mosqueInfo.address}
            onChangeText={(text) => setMosqueInfo(prev => ({ ...prev, address: text }))}
            placeholder="Enter address"
            multiline
          />
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Phone</Text>
          <TextInput
            style={styles.infoInput}
            value={mosqueInfo.phone}
            onChangeText={(text) => setMosqueInfo(prev => ({ ...prev, phone: text }))}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="schedule" size={30} color="#2E7D32" />
          <Text style={styles.actionText}>Prayer Schedule</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="announcement" size={30} color="#2E7D32" />
          <Text style={styles.actionText}>Announcements</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="library-books" size={30} color="#2E7D32" />
          <Text style={styles.actionText}>Speech Archive</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Icon name="settings" size={30} color="#2E7D32" />
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mosque Control Panel</Text>
        <Text style={styles.subtitle}>
          Manage your mosque's live translation and information
        </Text>
      </View>

      {renderTranslationControl()}
      {renderMicrophoneInterface()}
      {renderLanguageSelection()}
      {renderMosqueInfo()}
      {renderQuickActions()}
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This control panel is for mosque administrators only.
        </Text>
      </View>
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
    alignItems: 'center',
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
    textAlign: 'center',
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  controlCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  controlSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  liveStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 5,
    fontWeight: '500',
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
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  selectedLanguageChip: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  languageText: {
    fontSize: 14,
    color: '#666',
  },
  selectedLanguageText: {
    color: '#fff',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  infoInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionText: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  // Microphone interface styles
  micCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  micContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  micButtonContainer: {
    marginBottom: 10,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    borderWidth: 3,
    borderColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  micButtonActive: {
    backgroundColor: '#F44336',
    borderColor: '#D32F2F',
  },
  micLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  audioLevelContainer: {
    width: '100%',
    marginBottom: 20,
  },
  audioLevelLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  audioLevelBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  audioLevelFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 5,
    fontWeight: '500',
  },
});

export default MosqueControlScreen;

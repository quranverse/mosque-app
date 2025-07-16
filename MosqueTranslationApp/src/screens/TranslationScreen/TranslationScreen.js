import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const TranslationScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedMosque, setSelectedMosque] = useState(null);
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [translationHistory, setTranslationHistory] = useState([]);
  const [availableMosques, setAvailableMosques] = useState([]);

  useEffect(() => {
    loadAvailableMosques();
  }, []);

  const loadAvailableMosques = () => {
    // Mock data for mosques with live translation
    const mosques = [
      {
        id: 1,
        name: 'Central Mosque',
        isLive: true,
        language: 'English',
        listeners: 45,
      },
      {
        id: 2,
        name: 'Masjid Al-Noor',
        isLive: true,
        language: 'English',
        listeners: 23,
      },
      {
        id: 3,
        name: 'Community Islamic Center',
        isLive: false,
        language: 'English',
        listeners: 0,
      },
    ];
    setAvailableMosques(mosques);
  };

  const connectToMosque = (mosque) => {
    setSelectedMosque(mosque);
    setIsConnected(true);
    
    // Simulate receiving translations
    simulateTranslation();
    
    Alert.alert(
      'Connected',
      `Connected to ${mosque.name} for live translation.`
    );
  };

  const disconnect = () => {
    setIsConnected(false);
    setSelectedMosque(null);
    setCurrentTranslation('');
  };

  const simulateTranslation = () => {
    // Mock translation data
    const mockTranslations = [
      'In the name of Allah, the Most Gracious, the Most Merciful.',
      'All praise is due to Allah, Lord of all the worlds.',
      'The Most Gracious, the Most Merciful.',
      'Master of the Day of Judgment.',
      'You alone we worship, and You alone we ask for help.',
      'Guide us to the straight path.',
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < mockTranslations.length && isConnected) {
        const translation = mockTranslations[index];
        setCurrentTranslation(translation);
        setTranslationHistory(prev => [...prev, {
          id: Date.now(),
          text: translation,
          timestamp: new Date().toLocaleTimeString(),
        }]);
        index++;
      } else {
        clearInterval(interval);
        setCurrentTranslation('Translation completed.');
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  const renderMosqueList = () => (
    <View style={styles.mosquesSection}>
      <Text style={styles.sectionTitle}>Available Live Translations</Text>
      {availableMosques.map((mosque) => (
        <TouchableOpacity
          key={mosque.id}
          style={styles.mosqueCard}
          onPress={() => mosque.isLive && connectToMosque(mosque)}
          disabled={!mosque.isLive}
        >
          <View style={styles.mosqueInfo}>
            <View style={styles.mosqueHeader}>
              <Text style={styles.mosqueName}>{mosque.name}</Text>
              {mosque.isLive ? (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              ) : (
                <Text style={styles.offlineText}>Offline</Text>
              )}
            </View>
            <Text style={styles.mosqueLanguage}>Language: {mosque.language}</Text>
            <Text style={styles.mosqueListeners}>
              {mosque.listeners} listeners
            </Text>
          </View>
          <Icon
            name={mosque.isLive ? 'play-arrow' : 'stop'}
            size={24}
            color={mosque.isLive ? '#4CAF50' : '#999'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTranslationView = () => (
    <View style={styles.translationSection}>
      {/* Connection Status */}
      <View style={styles.connectionStatus}>
        <View style={styles.statusHeader}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <TouchableOpacity onPress={disconnect} style={styles.disconnectButton}>
            <Icon name="close" size={20} color="#fff" />
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.connectedMosque}>{selectedMosque?.name}</Text>
      </View>

      {/* Current Translation */}
      <View style={styles.currentTranslation}>
        <Text style={styles.currentLabel}>Current Translation:</Text>
        <Text style={styles.currentText}>{currentTranslation}</Text>
      </View>

      {/* Translation History */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Translation History</Text>
        <ScrollView style={styles.historyScroll}>
          {translationHistory.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.historyText}>{item.text}</Text>
              <Text style={styles.historyTime}>{item.timestamp}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Live Translation</Text>
            <Text style={styles.subtitle}>
              Connect to nearby mosques for real-time translation
            </Text>
          </View>

          {renderMosqueList()}

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How it works:</Text>
            <Text style={styles.instructionText}>
              • Select a mosque with live translation
            </Text>
            <Text style={styles.instructionText}>
              • Connect to receive real-time translations
            </Text>
            <Text style={styles.instructionText}>
              • Follow along with the sermon or prayer
            </Text>
          </View>
        </ScrollView>
      ) : (
        renderTranslationView()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  mosquesSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  mosqueCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mosqueInfo: {
    flex: 1,
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

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Card from '../Common/Card';

const TranslationDisplay = ({ 
  currentTranslation = '', 
  translationHistory = [],
  isConnected = false,
  mosqueName = '',
  onDisconnect = null,
  showArabic = true,
  fontSize = 16,
  onFontSizeChange = null,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (currentTranslation && autoScroll) {
      // Animate new translation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentTranslation]);

  const renderConnectionStatus = () => (
    <View style={styles.connectionStatus}>
      <View style={styles.statusHeader}>
        <View style={styles.liveIndicator}>
          <View style={[styles.liveDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.liveText}>
            {isConnected ? 'LIVE' : 'DISCONNECTED'}
          </Text>
        </View>
        {onDisconnect && (
          <TouchableOpacity onPress={onDisconnect} style={styles.disconnectButton}>
            <Icon name="close" size={16} color="#fff" />
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>
      {mosqueName && (
        <Text style={styles.mosqueName}>{mosqueName}</Text>
      )}
    </View>
  );

  const renderFontControls = () => (
    <View style={styles.fontControls}>
      <TouchableOpacity 
        style={styles.fontButton}
        onPress={() => onFontSizeChange && onFontSizeChange(Math.max(12, fontSize - 2))}
      >
        <Icon name="text-decrease" size={20} color="#666" />
      </TouchableOpacity>
      <Text style={styles.fontSizeText}>{fontSize}px</Text>
      <TouchableOpacity 
        style={styles.fontButton}
        onPress={() => onFontSizeChange && onFontSizeChange(Math.min(24, fontSize + 2))}
      >
        <Icon name="text-increase" size={20} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.fontButton, { marginLeft: 15 }]}
        onPress={() => setAutoScroll(!autoScroll)}
      >
        <Icon 
          name={autoScroll ? "pause" : "play-arrow"} 
          size={20} 
          color={autoScroll ? "#2E7D32" : "#666"} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderCurrentTranslation = () => {
    if (!currentTranslation) {
      return (
        <Card style={styles.currentTranslationCard}>
          <Text style={styles.waitingText}>
            {isConnected ? 'Waiting for translation...' : 'Not connected'}
          </Text>
        </Card>
      );
    }

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <Card style={styles.currentTranslationCard} elevation={4}>
          <Text style={styles.currentLabel}>Current Translation:</Text>
          {showArabic && currentTranslation.arabicText && (
            <Text style={[styles.arabicText, { fontSize: fontSize + 2 }]}>
              {currentTranslation.arabicText}
            </Text>
          )}
          <Text style={[styles.englishText, { fontSize }]}>
            {currentTranslation.englishText || currentTranslation}
          </Text>
          <Text style={styles.timestamp}>
            {currentTranslation.timestamp ? 
              new Date(currentTranslation.timestamp).toLocaleTimeString() : 
              new Date().toLocaleTimeString()
            }
          </Text>
        </Card>
      </Animated.View>
    );
  };

  const renderTranslationHistory = () => (
    <View style={styles.historySection}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Translation History</Text>
        <Text style={styles.historyCount}>
          {translationHistory.length} translations
        </Text>
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.historyScroll}
        showsVerticalScrollIndicator={false}
      >
        {translationHistory.map((item, index) => (
          <Card key={item.id || index} style={styles.historyItem}>
            {showArabic && item.arabicText && (
              <Text style={[styles.historyArabic, { fontSize: fontSize - 2 }]}>
                {item.arabicText}
              </Text>
            )}
            <Text style={[styles.historyEnglish, { fontSize: fontSize - 2 }]}>
              {item.englishText || item.text}
            </Text>
            <Text style={styles.historyTime}>
              {item.timestamp ? 
                new Date(item.timestamp).toLocaleTimeString() : 
                new Date().toLocaleTimeString()
              }
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderConnectionStatus()}
      {renderFontControls()}
      {renderCurrentTranslation()}
      {renderTranslationHistory()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  connectionStatus: {
    backgroundColor: '#2E7D32',
    padding: 15,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  disconnectText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  mosqueName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  fontButton: {
    padding: 8,
    marginHorizontal: 5,
  },
  fontSizeText: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 10,
  },
  currentTranslationCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#fff',
  },
  currentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '500',
  },
  arabicText: {
    textAlign: 'right',
    lineHeight: 28,
    color: '#333',
    marginBottom: 10,
    fontFamily: 'serif',
  },
  englishText: {
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  waitingText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  historySection: {
    flex: 1,
    margin: 15,
    marginTop: 0,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyCount: {
    fontSize: 12,
    color: '#666',
  },
  historyScroll: {
    flex: 1,
  },
  historyItem: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  historyArabic: {
    textAlign: 'right',
    lineHeight: 22,
    color: '#555',
    marginBottom: 6,
    fontFamily: 'serif',
  },
  historyEnglish: {
    lineHeight: 20,
    color: '#555',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
  },
});

export default TranslationDisplay;

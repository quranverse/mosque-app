import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API_BASE_URL } from '../../config/api';

const LiveBroadcastList = ({
  onJoinBroadcast,
  userLocation,
  refreshing,
  onRefresh,
  navigation
}) => {
  const [liveBroadcasts, setLiveBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveBroadcasts();
  }, []);

  const loadLiveBroadcasts = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would call the API
      // For now, using mock data
      const mockBroadcasts = [
        {
          id: 1,
          mosqueName: 'Central Mosque',
          mosqueId: 'mosque1',
          language: 'English',
          isLive: true,
          listeners: 45,
          startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          distance: 0.5,
          address: '123 Main Street',
          sessionId: 'session_1',
          quality: 'HD',
          imam: 'Sheikh Ahmed',
        },
        {
          id: 2,
          mosqueName: 'Masjid Al-Noor',
          mosqueId: 'mosque2',
          language: 'French',
          isLive: true,
          listeners: 23,
          startedAt: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
          distance: 1.2,
          address: '456 Oak Avenue',
          sessionId: 'session_2',
          quality: 'HD',
          imam: 'Imam Hassan',
        },
        {
          id: 3,
          mosqueName: 'Islamic Center',
          mosqueId: 'mosque3',
          language: 'Urdu',
          isLive: true,
          listeners: 67,
          startedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
          distance: 2.1,
          address: '789 Pine Road',
          sessionId: 'session_3',
          quality: 'HD',
          imam: 'Maulana Tariq',
        },
        {
          id: 4,
          mosqueName: 'Community Mosque',
          mosqueId: 'mosque4',
          language: 'Arabic',
          isLive: false,
          listeners: 0,
          lastBroadcast: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          distance: 3.5,
          address: '321 Elm Street',
          sessionId: null,
          quality: 'HD',
          imam: 'Sheikh Omar',
        },
      ];

      setLiveBroadcasts(mockBroadcasts);
    } catch (error) {
      console.error('Error loading live broadcasts:', error);
      Alert.alert('Error', 'Failed to load live broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startTime) => {
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000 / 60); // minutes
    if (diff < 60) {
      return `${diff}m ago`;
    } else {
      const hours = Math.floor(diff / 60);
      return `${hours}h ${diff % 60}m ago`;
    }
  };

  const formatLastBroadcast = (lastTime) => {
    const now = new Date();
    const diff = Math.floor((now - lastTime) / 1000 / 60 / 60); // hours
    if (diff < 24) {
      return `${diff}h ago`;
    } else {
      const days = Math.floor(diff / 24);
      return `${days}d ago`;
    }
  };

  const handleJoinBroadcast = (broadcast) => {
    if (broadcast.isLive) {
      if (navigation) {
        navigation.navigate('HorizontalTranslation', { broadcast });
      } else {
        Alert.alert(
          'Join Live Translation',
          `Join ${broadcast.mosqueName} live translation in ${broadcast.language}?\n\nImam: ${broadcast.imam}\nListeners: ${broadcast.listeners}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Join',
              onPress: () => onJoinBroadcast(broadcast)
            },
          ]
        );
      }
    } else {
      Alert.alert(
        'Not Live',
        `${broadcast.mosqueName} is not currently broadcasting.\n\nLast broadcast: ${formatLastBroadcast(broadcast.lastBroadcast)}`,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'View Archive',
            onPress: () => {
              // Navigate to speech archive for this mosque
              Alert.alert('Archive', 'Speech archive feature coming soon!');
            }
          },
        ]
      );
    }
  };

  const renderBroadcastCard = (broadcast) => (
    <TouchableOpacity
      key={broadcast.id}
      style={[
        styles.broadcastCard,
        broadcast.isLive && styles.liveBroadcastCard
      ]}
      onPress={() => handleJoinBroadcast(broadcast)}
    >
      {/* Header */}
      <View style={styles.broadcastHeader}>
        <View style={styles.broadcastInfo}>
          <Text style={styles.mosqueName}>{broadcast.mosqueName}</Text>
          <Text style={styles.imamName}>Imam: {broadcast.imam}</Text>
          <Text style={styles.broadcastAddress}>{broadcast.address}</Text>
        </View>
        
        <View style={styles.statusContainer}>
          {broadcast.isLive ? (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : (
            <Text style={styles.offlineText}>Offline</Text>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={styles.broadcastDetails}>
        <View style={styles.detailItem}>
          <Icon name="language" size={16} color="#666" />
          <Text style={styles.detailText}>{broadcast.language}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Icon name="location-on" size={16} color="#666" />
          <Text style={styles.detailText}>{broadcast.distance} km</Text>
        </View>
        
        {broadcast.isLive ? (
          <>
            <View style={styles.detailItem}>
              <Icon name="people" size={16} color="#4CAF50" />
              <Text style={[styles.detailText, { color: '#4CAF50' }]}>
                {broadcast.listeners} listening
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Icon name="timer" size={16} color="#4CAF50" />
              <Text style={[styles.detailText, { color: '#4CAF50' }]}>
                {formatDuration(broadcast.startedAt)}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.detailItem}>
            <Icon name="history" size={16} color="#999" />
            <Text style={[styles.detailText, { color: '#999' }]}>
              Last: {formatLastBroadcast(broadcast.lastBroadcast)}
            </Text>
          </View>
        )}
      </View>

      {/* Quality indicator */}
      <View style={styles.qualityBadge}>
        <Text style={styles.qualityText}>{broadcast.quality}</Text>
      </View>
    </TouchableOpacity>
  );

  const liveBroadcastsCount = liveBroadcasts.filter(b => b.isLive).length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Live Broadcasts</Text>
        <Text style={styles.subtitle}>
          {liveBroadcastsCount} live translation{liveBroadcastsCount !== 1 ? 's' : ''} available
        </Text>
      </View>

      {/* Live Broadcasts */}
      {liveBroadcasts.filter(b => b.isLive).map(renderBroadcastCard)}

      {/* Offline Mosques */}
      {liveBroadcasts.filter(b => !b.isLive).length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Active</Text>
          </View>
          {liveBroadcasts.filter(b => !b.isLive).map(renderBroadcastCard)}
        </>
      )}

      {/* Empty state */}
      {liveBroadcasts.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Icon name="radio" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No broadcasts available</Text>
          <Text style={styles.emptySubtitle}>
            Check back later for live translations from nearby mosques
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2E7D32',
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
  broadcastCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  liveBroadcastCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  broadcastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  broadcastInfo: {
    flex: 1,
  },
  mosqueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  imamName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  broadcastAddress: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  broadcastDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  qualityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  qualityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 20,
  },
});

export default LiveBroadcastList;

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
import { useFocusEffect } from '@react-navigation/native';
import ApiService from '../../services/ApiService/ApiService';
import { API_ENDPOINTS } from '../../config/api';
import AuthService from '../../services/AuthService/AuthService';
import SocketService from '../../services/SocketService/SocketService';


const LiveBroadcastList = ({
  onJoinBroadcast,
  userLocation,
  refreshing,
  onRefresh,
  navigation
}) => {
  const [liveBroadcasts, setLiveBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followedMosques, setFollowedMosques] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    console.log('🔍 LiveBroadcastList useEffect - Setting up socket listeners');
    console.log('🔍 Socket connected:', SocketService.isSocketConnected());

    loadLiveBroadcasts();

    // Listen for auth state changes (including followed mosques updates)
    const unsubscribeAuth = AuthService.addAuthListener((user) => {
      console.log('AuthService listener triggered in LiveBroadcastList');
      // Reload broadcasts when followed mosques change
      loadLiveBroadcasts();
    });

    // Listen for real-time broadcast updates
    const unsubscribeBroadcastStarted = SocketService.addEventListener('broadcast_started', (data) => {
      console.log('🔴 Broadcast started event received on individual phone:', data);
      console.log('🔴 Will refresh broadcasts in 1 second...');
      // Add a small delay to ensure session is fully created in backend
      setTimeout(() => {
        console.log('🔴 Now refreshing broadcasts after delay...');
        loadLiveBroadcasts();
      }, 1000);
    });

    const unsubscribeBroadcastEnded = SocketService.addEventListener('broadcast_ended', (data) => {
      console.log('⏹️ Broadcast ended, refreshing list:', data);
      loadLiveBroadcasts();
    });

    const unsubscribeMosqueNotification = SocketService.addEventListener('mosque_broadcast_notification', (data) => {
      console.log('📢 Individual phone received mosque broadcast notification:', data);
      console.log(`📱 Individual phone notification: ${data.message}`);
      console.log('📢 Refreshing broadcasts after notification...');
      loadLiveBroadcasts();
    });

    const unsubscribeSessionStarted = SocketService.addEventListener('session_started', (data) => {
      console.log('🎬 Session started, refreshing list:', data);
      loadLiveBroadcasts();
    });

    const unsubscribeSessionEnded = SocketService.addEventListener('session_ended', (data) => {
      console.log('🎬 Session ended, refreshing list:', data);
      loadLiveBroadcasts();
    });

    return () => {
      unsubscribeAuth();
      unsubscribeBroadcastStarted();
      unsubscribeBroadcastEnded();
      unsubscribeMosqueNotification();
      unsubscribeSessionStarted();
      unsubscribeSessionEnded();
    };
  }, []);

  // Refresh data when screen comes into focus (e.g., returning from mosque management)
  useFocusEffect(
    React.useCallback(() => {
      console.log('LiveBroadcastList screen focused, refreshing data');
      loadLiveBroadcasts();
    }, [])
  );

  const loadLiveBroadcasts = async () => {
    try {
      setLoading(true);

      // First, load followed mosques to get the IDs
      const followedMosquesData = await AuthService.getFollowedMosques();
      console.log('Followed mosques from AuthService:', followedMosquesData?.length || 0);
      setFollowedMosques(followedMosquesData || []);

      // Load data in parallel using the followed mosques data
      const [sessionsResult, followedMosquesDataResult] = await Promise.allSettled([
        loadActiveSessions(),
        loadFollowedMosquesData(followedMosquesData || [])
      ]);

      // Process results
      const activeSessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : [];
      const followedMosquesFullData = followedMosquesDataResult.status === 'fulfilled' ? followedMosquesDataResult.value : [];

      console.log('Active sessions:', activeSessions?.length || 0);
      console.log('Followed mosques full data:', followedMosquesFullData?.length || 0);

      if (sessionsResult.status === 'fulfilled') {
        setActiveSessions(activeSessions);
      } else {
        console.error('Failed to load active sessions:', sessionsResult.reason);
      }

      // Create broadcasts from followed mosques data
      const broadcasts = createBroadcastsFromFollowedMosques(activeSessions, followedMosquesFullData);
      console.log('Created broadcasts:', broadcasts?.length || 0);
      setLiveBroadcasts(broadcasts);

    } catch (error) {
      console.error('Error loading live broadcasts:', error);
      Alert.alert('Error', 'Failed to load live broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await ApiService.get(API_ENDPOINTS.SESSIONS.ACTIVE);
      return response?.sessions || [];
    } catch (error) {
      console.error('Error loading active sessions:', error);
      return [];
    }
  };

  const loadFollowedMosquesData = async (followedMosquesArray = []) => {
    try {
      // Get followed mosque IDs from the provided array
      const followedMosqueIds = followedMosquesArray.map(m => m.id);

      if (followedMosqueIds.length === 0) {
        console.log('No followed mosques found');
        return [];
      }

      console.log('Loading data for followed mosque IDs:', followedMosqueIds);

      // Fetch data for followed mosques
      const response = await ApiService.post('/mosques/by-ids', {
        mosqueIds: followedMosqueIds
      });

      if (response?.success) {
        console.log('Successfully loaded mosque data:', response.mosques?.length || 0, 'mosques');
        return response.mosques || [];
      } else {
        console.error('Failed to load followed mosques data:', response?.message);
        return [];
      }
    } catch (error) {
      console.error('Error loading followed mosques data:', error);
      return [];
    }
  };

  const createBroadcastsFromFollowedMosques = (activeSessions, followedMosquesData) => {
    const broadcasts = [];
    const sessionsMap = new Map();

    // Create a map of active sessions by mosque ID
    activeSessions.forEach(session => {
      if (!sessionsMap.has(session.mosqueId)) {
        sessionsMap.set(session.mosqueId, []);
      }
      sessionsMap.get(session.mosqueId).push(session);
    });

    // Create broadcast cards for all followed mosques
    followedMosquesData.forEach(mosque => {
      const mosqueSessions = sessionsMap.get(mosque.id) || [];
      const liveSession = mosqueSessions.find(s => s.isLive || s.status === 'active');

      if (liveSession) {
        // Mosque has live session
        broadcasts.push({
          id: liveSession.sessionId,
          mosqueName: mosque.name,
          mosqueId: mosque.id,
          language: liveSession.language || mosque.languagesSupported?.[0] || 'Arabic',
          isLive: true,
          listeners: liveSession.participantCount || 0,
          startedAt: new Date(liveSession.startedAt),
          distance: mosque.distance || 0,
          address: mosque.address || 'Address not available',
          sessionId: liveSession.sessionId,
          quality: 'HD',
          imam: mosque.imam || 'Imam',
          isFromFollowedMosque: true,
        });
      } else {
        // Mosque is offline - still show card for archive access
        broadcasts.push({
          id: `mosque_${mosque.id}`,
          mosqueName: mosque.name,
          mosqueId: mosque.id,
          language: mosque.languagesSupported?.[0] || 'Arabic',
          isLive: false,
          listeners: 0,
          lastBroadcast: new Date(Date.now() - 2 * 60 * 60 * 1000), // Default to 2 hours ago
          distance: mosque.distance || 0,
          address: mosque.address || 'Address not available',
          sessionId: null,
          quality: 'HD',
          imam: mosque.imam || 'Imam',
          isFromFollowedMosque: true,
        });
      }
    });

    // Sort: live broadcasts first, then alphabetically by mosque name
    return broadcasts.sort((a, b) => {
      if (a.isLive !== b.isLive) {
        return b.isLive - a.isLive;
      }
      return a.mosqueName.localeCompare(b.mosqueName);
    });
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
    if (broadcast.isLive && broadcast.sessionId) {
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
              onPress: () => onJoinBroadcast({
                ...broadcast,
                // Ensure we have the mosque object structure expected by parent
                mosque: {
                  id: broadcast.mosqueId,
                  name: broadcast.mosqueName,
                  address: broadcast.address,
                  hasLiveTranslation: broadcast.isLive,
                }
              })
            },
          ]
        );
      }
    } else {
      Alert.alert(
        'Not Live',
        `${broadcast.mosqueName} is not currently broadcasting.${broadcast.lastBroadcast ? `\n\nLast broadcast: ${formatLastBroadcast(broadcast.lastBroadcast)}` : ''}`,
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  };

  const handleViewArchive = (broadcast) => {
    if (navigation) {
      navigation.navigate('Archive', {
        mosque: {
          id: broadcast.mosqueId,
          name: broadcast.mosqueName,
        }
      });
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



      {/* Action buttons: Archive and Quality */}
      <View style={styles.topRightContainer}>
        <TouchableOpacity
          style={styles.archiveButton}
          onPress={(e) => {
            e.stopPropagation(); // Prevent triggering the card press
            handleViewArchive(broadcast);
          }}
        >
          <Icon name="history" size={16} color="#666" />
        </TouchableOpacity>

        <View style={styles.qualityBadge}>
          <Text style={styles.qualityText}>{broadcast.quality}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const liveBroadcastsCount = liveBroadcasts.filter(b => b.isLive).length;
  const totalFollowedMosques = followedMosques.length;



  const handleRefresh = async () => {
    // Call parent refresh handler if provided
    if (onRefresh) {
      onRefresh();
    }
    // Also reload our own data
    await loadLiveBroadcasts();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Followed Mosques</Text>
        <Text style={styles.subtitle}>
          {totalFollowedMosques > 0
            ? `${totalFollowedMosques} followed mosque${totalFollowedMosques !== 1 ? 's' : ''} • ${liveBroadcastsCount} live now`
            : 'Follow mosques to see their live broadcasts here'
          }
        </Text>
      </View>

      {/* Authentication Note for Anonymous Users - shown once above all cards */}
      {AuthService.isAnonymous() && totalFollowedMosques > 0 && (
        <View style={styles.authNote}>
          <Icon name="info" size={16} color="#FF8F00" />
          <Text style={styles.authNoteText}>
            Sign in for full translation features and notifications.{' '}
            <Text
              style={styles.signupLink}
              onPress={() => navigation?.navigate('MosqueRegistration')}
            >
              Sign up here
            </Text>
          </Text>
        </View>
      )}

      {/* Show content only if user has followed mosques */}
      {totalFollowedMosques > 0 ? (
        <>
          {/* Live Broadcasts Section */}
          {liveBroadcasts.filter(b => b.isLive).length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔴 Live Now</Text>
              </View>
              {liveBroadcasts.filter(b => b.isLive).map(renderBroadcastCard)}
            </>
          )}

          {/* Offline Mosques Section */}
          {liveBroadcasts.filter(b => !b.isLive).length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📚 Your Followed Mosques</Text>
                <Text style={styles.sectionSubtitle}>Tap history icon to view archives</Text>
              </View>
              {liveBroadcasts.filter(b => !b.isLive).map(renderBroadcastCard)}
            </>
          )}

          {/* Empty state for followed mosques with no data */}
          {liveBroadcasts.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Icon name="wifi-off" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Unable to load mosque data</Text>
              <Text style={styles.emptySubtitle}>
                Check your internet connection and try refreshing. If you haven't followed any mosques yet, go to the mosque management screen to follow mosques.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation?.navigate('MosqueManagement')}
              >
                <Icon name="add" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Manage Mosques</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        /* Empty state when no mosques are followed */
        <View style={styles.emptyState}>
          <Icon name="favorite-border" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Mosques Followed</Text>
          <Text style={styles.emptySubtitle}>
            Follow mosques to see their live broadcasts and translations here.
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('MosqueManagement')}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Follow Mosques</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 6,
    backgroundColor: '#2E7D32',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#E8F5E8',
    marginTop: 2,
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
    marginBottom: 2,
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
  topRightContainer: {
    position: 'absolute',
    top: 45,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  archiveButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  qualityBadge: {
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
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
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
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  authNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8F00',
  },
  authNoteText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
    lineHeight: 20,
  },
  signupLink: {
    color: '#1976D2',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LiveBroadcastList;

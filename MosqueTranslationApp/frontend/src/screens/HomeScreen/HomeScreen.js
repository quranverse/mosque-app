import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import services
import PrayerTimeService from '../../services/PrayerTimeService/PrayerTimeService';
import LocationService from '../../services/LocationService/LocationService';
import AuthService from '../../services/AuthService/AuthService';

const HomeScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [nearbyMosques, setNearbyMosques] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [liveBroadcasts, setLiveBroadcasts] = useState([]);
  const [isTranslationActive, setIsTranslationActive] = useState(false);
  const [connectedListeners, setConnectedListeners] = useState(0);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);

      // Get current user and user type
      const user = AuthService.getCurrentUser();
      setCurrentUser(user);
      setUserType(user?.type || 'individual');

      await requestLocationPermission();
      await getCurrentLocation();

      // Load different data based on user type
      if (user?.type === AuthService.USER_TYPES.INDIVIDUAL) {
        await loadLiveBroadcasts();
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Error', 'Failed to initialize app. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Location permission is required to find nearby mosques and calculate prayer times.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: requestLocationPermission },
        ]
      );
      return false;
    }
    return true;
  };

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await LocationService.getCurrentLocation();
      setLocation(currentLocation);
      
      // Get prayer times for current location
      const times = await PrayerTimeService.getPrayerTimes(
        currentLocation.latitude,
        currentLocation.longitude
      );
      setPrayerTimes(times);
      
      // Find nearby mosques (mock data for now)
      const mosques = await findNearbyMosques(currentLocation);
      setNearbyMosques(mosques);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location.');
    }
  };

  const loadLiveBroadcasts = async () => {
    try {
      // Mock data for live broadcasts - in real implementation, this would call an API
      const broadcasts = [
        {
          id: 1,
          mosqueName: 'Central Mosque',
          language: 'English',
          isLive: true,
          listeners: 45,
          startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        },
        {
          id: 2,
          mosqueName: 'Masjid Al-Noor',
          language: 'French',
          isLive: true,
          listeners: 23,
          startedAt: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
        },
        {
          id: 3,
          mosqueName: 'Islamic Center',
          language: 'Urdu',
          isLive: false,
          listeners: 0,
          lastBroadcast: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
      ];
      setLiveBroadcasts(broadcasts);
    } catch (error) {
      console.error('Error loading live broadcasts:', error);
    }
  };

  const findNearbyMosques = async (currentLocation) => {
    try {
      // Import MosqueService dynamically to avoid circular dependencies
      const { default: MosqueService } = await import('../../services/MosqueService');

      const result = await MosqueService.getNearbyMosques(
        currentLocation.latitude,
        currentLocation.longitude,
        5 // 5km radius for home screen
      );

      if (result.success || result.mosques.length > 0) {
        return result.mosques.map(mosque => ({
          id: mosque.id,
          name: mosque.name,
          distance: mosque.distanceFormatted || `${mosque.distance?.toFixed(1)} km`,
          address: mosque.address,
          hasLiveTranslation: mosque.hasLiveTranslation,
          followers: mosque.followers,
        }));
      }
    } catch (error) {
      console.error('Error fetching nearby mosques:', error);
    }

    // Return empty array if API fails
    return [];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getCurrentLocation();
    setRefreshing(false);
  };

  const followMosque = (mosqueId) => {
    Alert.alert(
      'Follow Mosque',
      'You will receive notifications for prayer times and live translations from this mosque.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Follow', onPress: () => console.log(`Following mosque ${mosqueId}`) },
      ]
    );
  };

  const toggleTranslationBroadcast = () => {
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

  const joinLiveBroadcast = (broadcast) => {
    if (broadcast.isLive) {
      Alert.alert(
        'Join Live Translation',
        `Join ${broadcast.mosqueName} live translation in ${broadcast.language}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join',
            onPress: () => {
              // Navigate to horizontal translation viewer
              navigation.navigate('Translation', {
                broadcast,
                mode: 'horizontal'
              });
            }
          },
        ]
      );
    } else {
      Alert.alert(
        'Not Live',
        'This mosque is not currently broadcasting. Would you like to view previous speeches?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Speeches',
            onPress: () => navigation.navigate('Speeches', { mosqueId: broadcast.id })
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const renderMosqueHomeContent = () => (
    <>
      {/* Next Prayer Section */}
      {prayerTimes && (
        <View style={styles.prayerSection}>
          <Text style={styles.sectionTitle}>Next Prayer</Text>
          <View style={styles.nextPrayerCard}>
            <Text style={styles.prayerName}>{prayerTimes.next.name}</Text>
            <Text style={styles.prayerTime}>{prayerTimes.next.time}</Text>
            <Text style={styles.timeRemaining}>
              {prayerTimes.next.timeRemaining}
            </Text>
          </View>
        </View>
      )}

      {/* Broadcasting Control Section */}
      <View style={styles.broadcastSection}>
        <Text style={styles.sectionTitle}>Live Translation Broadcast</Text>
        <View style={styles.broadcastCard}>
          <View style={styles.broadcastHeader}>
            <View>
              <Text style={styles.broadcastTitle}>Translation Broadcast</Text>
              <Text style={styles.broadcastSubtitle}>
                {isTranslationActive ? 'Broadcasting live' : 'Not broadcasting'}
              </Text>
              {isTranslationActive && (
                <Text style={styles.listenersCount}>
                  {connectedListeners} listeners connected
                </Text>
              )}
            </View>
            <Switch
              value={isTranslationActive}
              onValueChange={toggleTranslationBroadcast}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor={isTranslationActive ? '#2E7D32' : '#f4f3f4'}
            />
          </View>

          {isTranslationActive && (
            <TouchableOpacity
              style={styles.micButton}
              onPress={() => navigation.navigate('Translation', { mode: 'broadcast' })}
            >
              <Icon name="mic" size={24} color="#fff" />
              <Text style={styles.micButtonText}>Start Speaking</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );

  const renderIndividualHomeContent = () => (
    <>
      {/* Next Prayer Section */}
      {prayerTimes && (
        <View style={styles.prayerSection}>
          <Text style={styles.sectionTitle}>Next Prayer</Text>
          <View style={styles.nextPrayerCard}>
            <Text style={styles.prayerName}>{prayerTimes.next.name}</Text>
            <Text style={styles.prayerTime}>{prayerTimes.next.time}</Text>
            <Text style={styles.timeRemaining}>
              {prayerTimes.next.timeRemaining}
            </Text>
          </View>
        </View>
      )}

      {/* Live Broadcasts Section */}
      <View style={styles.broadcastsSection}>
        <Text style={styles.sectionTitle}>Live Broadcasts</Text>
        {liveBroadcasts.map((broadcast) => (
          <TouchableOpacity
            key={broadcast.id}
            style={[
              styles.broadcastCard,
              broadcast.isLive && styles.liveBroadcastCard
            ]}
            onPress={() => joinLiveBroadcast(broadcast)}
          >
            <View style={styles.broadcastInfo}>
              <Text style={styles.mosqueName}>{broadcast.mosqueName}</Text>
              <Text style={styles.broadcastLanguage}>Language: {broadcast.language}</Text>
              <View style={styles.broadcastStatus}>
                {broadcast.isLive ? (
                  <>
                    <Icon name="live-tv" size={16} color="#4CAF50" />
                    <Text style={styles.liveText}>LIVE - {broadcast.listeners} listening</Text>
                  </>
                ) : (
                  <Text style={styles.offlineText}>Offline</Text>
                )}
              </View>
            </View>
            <Icon
              name={broadcast.isLive ? "play-arrow" : "history"}
              size={24}
              color={broadcast.isLive ? "#4CAF50" : "#666"}
            />
          </TouchableOpacity>
        ))}

        {liveBroadcasts.length === 0 && (
          <View style={styles.emptyBroadcasts}>
            <Icon name="radio" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No live broadcasts available</Text>
            <Text style={styles.emptySubtext}>Check back later for live translations</Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Assalamu Alaikum</Text>
        <Text style={styles.subtitle}>
          {userType === AuthService.USER_TYPES.MOSQUE
            ? `${currentUser?.mosqueName || 'Mosque Admin'}`
            : location ? `${location.city || 'Your Location'}` : 'Welcome to Mosque Translation App'
          }
        </Text>
      </View>

      {/* Render content based on user type */}
      {userType === AuthService.USER_TYPES.MOSQUE
        ? renderMosqueHomeContent()
        : renderIndividualHomeContent()
      }

      {/* Nearby Mosques Section - Only for Individual Users */}
      {userType === AuthService.USER_TYPES.INDIVIDUAL && (
        <View style={styles.mosquesSection}>
          <Text style={styles.sectionTitle}>Nearby Mosques</Text>
          {nearbyMosques.map((mosque) => (
            <View key={mosque.id} style={styles.mosqueCard}>
              <View style={styles.mosqueInfo}>
                <Text style={styles.mosqueName}>{mosque.name}</Text>
                <Text style={styles.mosqueAddress}>{mosque.address}</Text>
                <View style={styles.mosqueDetails}>
                  <Text style={styles.distance}>{mosque.distance}</Text>
                  {mosque.hasLiveTranslation && (
                    <View style={styles.liveIndicator}>
                      <Icon name="live-tv" size={16} color="#4CAF50" />
                      <Text style={styles.liveText}>Live Translation</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.followButton}
                onPress={() => followMosque(mosque.id)}
              >
                <Icon name="add" size={20} color="#fff" />
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Qibla')}
          >
            <Icon name="explore" size={30} color="#2E7D32" />
            <Text style={styles.actionText}>Find Qibla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Prayer Times')}
          >
            <Icon name="schedule" size={30} color="#2E7D32" />
            <Text style={styles.actionText}>Prayer Times</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Translation')}
          >
            <Icon name="translate" size={30} color="#2E7D32" />
            <Text style={styles.actionText}>
              {userType === AuthService.USER_TYPES.MOSQUE ? 'Broadcast' : 'Live Translation'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  welcomeSection: {
    backgroundColor: '#2E7D32',
    padding: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
  },
  prayerSection: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  nextPrayerCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  prayerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  prayerTime: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  timeRemaining: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  mosquesSection: {
    margin: 15,
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
  mosqueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  mosqueAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  mosqueDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  distance: {
    fontSize: 12,
    color: '#999',
    marginRight: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 3,
  },
  followButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 3,
  },
  quickActions: {
    margin: 15,
    marginBottom: 30,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 15,
  },
  actionText: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 5,
    textAlign: 'center',
  },
  // New styles for broadcasting features
  broadcastSection: {
    margin: 15,
  },
  broadcastCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
    alignItems: 'center',
    marginBottom: 10,
  },
  broadcastTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  broadcastSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  listenersCount: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  micButton: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 10,
  },
  micButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  broadcastsSection: {
    margin: 15,
  },
  broadcastInfo: {
    flex: 1,
  },
  broadcastLanguage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  broadcastStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  offlineText: {
    fontSize: 12,
    color: '#999',
  },
  emptyBroadcasts: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default HomeScreen;

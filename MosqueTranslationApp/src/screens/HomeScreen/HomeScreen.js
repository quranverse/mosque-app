import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import services
import PrayerTimeService from '../../services/PrayerTimeService/PrayerTimeService';
import LocationService from '../../services/LocationService/LocationService';

const HomeScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [nearbyMosques, setNearbyMosques] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      await requestLocationPermission();
      await getCurrentLocation();
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

  const findNearbyMosques = async (currentLocation) => {
    // Mock data - in real implementation, this would call a mosque discovery API
    return [
      {
        id: 1,
        name: 'Central Mosque',
        distance: '0.5 km',
        address: '123 Main Street',
        hasLiveTranslation: true,
        followers: 150,
      },
      {
        id: 2,
        name: 'Community Islamic Center',
        distance: '1.2 km',
        address: '456 Oak Avenue',
        hasLiveTranslation: false,
        followers: 89,
      },
      {
        id: 3,
        name: 'Masjid Al-Noor',
        distance: '2.1 km',
        address: '789 Pine Road',
        hasLiveTranslation: true,
        followers: 203,
      },
    ];
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
          {location ? `${location.city || 'Your Location'}` : 'Welcome to Mosque Translation App'}
        </Text>
      </View>

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

      {/* Nearby Mosques Section */}
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
            <Text style={styles.actionText}>Live Translation</Text>
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
});

export default HomeScreen;

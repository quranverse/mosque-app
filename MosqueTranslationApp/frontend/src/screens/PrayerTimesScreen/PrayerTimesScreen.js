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
import Icon from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';

// Import services
import PrayerTimeService from '../../services/PrayerTimeService/PrayerTimeService';
import LocationService from '../../services/LocationService/LocationService';

const PrayerTimesScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [todayTimes, setTodayTimes] = useState(null);
  const [weeklyTimes, setWeeklyTimes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('today'); // 'today' or 'weekly'

  useEffect(() => {
    initializePrayerTimes();
  }, []);

  const initializePrayerTimes = async () => {
    try {
      setLoading(true);
      const currentLocation = await LocationService.getCurrentLocation();
      setLocation(currentLocation);
      
      await loadPrayerTimes(currentLocation);
    } catch (error) {
      console.error('Error initializing prayer times:', error);
      Alert.alert('Error', 'Failed to load prayer times. Please check your location settings.');
    } finally {
      setLoading(false);
    }
  };

  const loadPrayerTimes = async (currentLocation) => {
    try {
      // Get today's prayer times
      const today = await PrayerTimeService.getPrayerTimes(
        currentLocation.latitude,
        currentLocation.longitude
      );
      setTodayTimes(today);

      // Get weekly prayer times
      const weekly = await PrayerTimeService.getPrayerTimesForWeek(
        currentLocation.latitude,
        currentLocation.longitude
      );
      setWeeklyTimes(weekly);
    } catch (error) {
      console.error('Error loading prayer times:', error);
      throw error;
    }
  };

  const onRefresh = async () => {
    if (!location) return;
    
    setRefreshing(true);
    try {
      await loadPrayerTimes(location);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh prayer times.');
    } finally {
      setRefreshing(false);
    }
  };

  const getPrayerIcon = (prayerName) => {
    switch (prayerName.toLowerCase()) {
      case 'fajr':
        return 'wb-sunny';
      case 'sunrise':
        return 'wb-sunny';
      case 'dhuhr':
        return 'wb-sunny';
      case 'asr':
        return 'wb-cloudy';
      case 'maghrib':
        return 'brightness-3';
      case 'isha':
        return 'brightness-2';
      default:
        return 'schedule';
    }
  };

  const isCurrentPrayer = (prayerName) => {
    if (!todayTimes) return false;
    return todayTimes.next.name.toLowerCase() === prayerName.toLowerCase();
  };

  const renderTodayView = () => {
    if (!todayTimes) return null;

    const prayers = [
      { name: 'Fajr', time: todayTimes.times.fajr },
      { name: 'Sunrise', time: todayTimes.times.sunrise },
      { name: 'Dhuhr', time: todayTimes.times.dhuhr },
      { name: 'Asr', time: todayTimes.times.asr },
      { name: 'Maghrib', time: todayTimes.times.maghrib },
      { name: 'Isha', time: todayTimes.times.isha },
    ];

    return (
      <View style={styles.todayContainer}>
        {/* Date Header */}
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{todayTimes.date}</Text>
          <Text style={styles.locationText}>
            {location?.city || 'Current Location'}
          </Text>
        </View>

        {/* Next Prayer Highlight */}
        <View style={styles.nextPrayerCard}>
          <Text style={styles.nextPrayerLabel}>Next Prayer</Text>
          <Text style={styles.nextPrayerName}>{todayTimes.next.name}</Text>
          <Text style={styles.nextPrayerTime}>{todayTimes.next.time}</Text>
          <Text style={styles.timeRemaining}>{todayTimes.next.timeRemaining}</Text>
        </View>

        {/* All Prayer Times */}
        <View style={styles.prayersList}>
          {prayers.map((prayer, index) => (
            <View
              key={prayer.name}
              style={[
                styles.prayerRow,
                isCurrentPrayer(prayer.name) && styles.currentPrayerRow,
              ]}
            >
              <View style={styles.prayerInfo}>
                <Icon
                  name={getPrayerIcon(prayer.name)}
                  size={24}
                  color={isCurrentPrayer(prayer.name) ? '#2E7D32' : '#666'}
                />
                <Text
                  style={[
                    styles.prayerName,
                    isCurrentPrayer(prayer.name) && styles.currentPrayerText,
                  ]}
                >
                  {prayer.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.prayerTime,
                  isCurrentPrayer(prayer.name) && styles.currentPrayerText,
                ]}
              >
                {prayer.time}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderWeeklyView = () => {
    return (
      <View style={styles.weeklyContainer}>
        {weeklyTimes.map((day, index) => (
          <View key={index} style={[styles.dayCard, day.isToday && styles.todayCard]}>
            <Text style={[styles.dayDate, day.isToday && styles.todayText]}>
              {day.date}
            </Text>
            <View style={styles.dayPrayers}>
              <View style={styles.prayerTimeRow}>
                <Text style={styles.prayerLabel}>Fajr</Text>
                <Text style={styles.prayerTimeSmall}>{day.times.fajr}</Text>
              </View>
              <View style={styles.prayerTimeRow}>
                <Text style={styles.prayerLabel}>Dhuhr</Text>
                <Text style={styles.prayerTimeSmall}>{day.times.dhuhr}</Text>
              </View>
              <View style={styles.prayerTimeRow}>
                <Text style={styles.prayerLabel}>Asr</Text>
                <Text style={styles.prayerTimeSmall}>{day.times.asr}</Text>
              </View>
              <View style={styles.prayerTimeRow}>
                <Text style={styles.prayerLabel}>Maghrib</Text>
                <Text style={styles.prayerTimeSmall}>{day.times.maghrib}</Text>
              </View>
              <View style={styles.prayerTimeRow}>
                <Text style={styles.prayerLabel}>Isha</Text>
                <Text style={styles.prayerTimeSmall}>{day.times.isha}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading prayer times...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Mosque Management Icon */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.mosqueManagementButton}
          onPress={() => navigation.navigate('MosqueManagement')}
        >
          <Icon name="favorite" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prayer Times</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'today' && styles.activeToggle]}
          onPress={() => setViewMode('today')}
        >
          <Text style={[styles.toggleText, viewMode === 'today' && styles.activeToggleText]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'weekly' && styles.activeToggle]}
          onPress={() => setViewMode('weekly')}
        >
          <Text style={[styles.toggleText, viewMode === 'weekly' && styles.activeToggleText]}>
            Weekly
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {viewMode === 'today' ? renderTodayView() : renderWeeklyView()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
  },
  mosqueManagementButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40, // Same width as the button to center the title
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 25,
    padding: 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 22,
  },
  activeToggle: {
    backgroundColor: '#2E7D32',
  },
  toggleText: {
    fontSize: 16,
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  todayContainer: {
    padding: 15,
  },
  dateHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  nextPrayerCard: {
    backgroundColor: '#2E7D32',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nextPrayerLabel: {
    fontSize: 14,
    color: '#E8F5E8',
    marginBottom: 5,
  },
  nextPrayerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  nextPrayerTime: {
    fontSize: 20,
    color: '#fff',
    marginTop: 5,
  },
  timeRemaining: {
    fontSize: 14,
    color: '#E8F5E8',
    marginTop: 5,
  },
  prayersList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentPrayerRow: {
    backgroundColor: '#E8F5E8',
  },
  prayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  prayerTime: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  currentPrayerText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  weeklyContainer: {
    padding: 15,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  todayCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  dayDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  todayText: {
    color: '#2E7D32',
  },
  dayPrayers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  prayerTimeRow: {
    alignItems: 'center',
  },
  prayerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  prayerTimeSmall: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default PrayerTimesScreen;

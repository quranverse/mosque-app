import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IslamicButton from '../../components/Common/IslamicButton';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';
import AuthService from '../../services/AuthService/AuthService';
import LocationService from '../../services/LocationService/LocationService';

const IndividualOnboardingScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [nearbyMosques, setNearbyMosques] = useState([]);
  const [location, setLocation] = useState(null);
  const [followedMosques, setFollowedMosques] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    initializeOnboarding();
    
    // Animate entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const initializeOnboarding = async () => {
    setLoading(true);
    try {
      // Continue as individual user
      const result = await AuthService.continueAsIndividual();
      if (result.success) {
        await getCurrentLocation();
      } else {
        Alert.alert('Error', result.error || 'Failed to initialize user account');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const currentLocation = await LocationService.getCurrentLocation();
      setLocation(currentLocation);
      await findNearbyMosques(currentLocation);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Access',
        'We need location access to find nearby mosques. You can grant permission later in settings.',
        [
          { text: 'Skip for now', onPress: () => setLocationLoading(false) },
          { text: 'Try again', onPress: getCurrentLocation },
        ]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const findNearbyMosques = async (userLocation) => {
    try {
      // Mock nearby mosques data - in real app, this would be an API call
      const mockMosques = [
        {
          id: 'mosque_1',
          name: 'Central Islamic Center',
          address: '123 Main Street, Downtown',
          distance: '0.5 km',
          hasLiveTranslation: true,
          hasWomenSpace: true,
          hasParking: true,
          followers: 245,
          nextPrayer: 'Maghrib',
          nextPrayerTime: '6:30 PM',
          photos: {
            exterior: 'https://example.com/mosque1.jpg',
          },
        },
        {
          id: 'mosque_2',
          name: 'Masjid Al-Noor',
          address: '456 Oak Avenue, Westside',
          distance: '1.2 km',
          hasLiveTranslation: false,
          hasWomenSpace: true,
          hasParking: false,
          followers: 189,
          nextPrayer: 'Maghrib',
          nextPrayerTime: '6:30 PM',
          photos: {
            exterior: 'https://example.com/mosque2.jpg',
          },
        },
        {
          id: 'mosque_3',
          name: 'Islamic Community Mosque',
          address: '789 Pine Road, Eastside',
          distance: '2.1 km',
          hasLiveTranslation: true,
          hasWomenSpace: true,
          hasParking: true,
          followers: 312,
          nextPrayer: 'Maghrib',
          nextPrayerTime: '6:30 PM',
          photos: {
            exterior: 'https://example.com/mosque3.jpg',
          },
        },
      ];

      setNearbyMosques(mockMosques);
    } catch (error) {
      console.error('Error finding mosques:', error);
    }
  };

  const handleFollowMosque = async (mosque) => {
    try {
      const newFollowedMosques = new Set(followedMosques);
      
      if (followedMosques.has(mosque.id)) {
        newFollowedMosques.delete(mosque.id);
      } else {
        newFollowedMosques.add(mosque.id);
      }
      
      setFollowedMosques(newFollowedMosques);
      
      // In a real app, this would update the user's followed mosques
      // await AuthService.updateFollowedMosques(Array.from(newFollowedMosques));
      
    } catch (error) {
      console.error('Error following mosque:', error);
      Alert.alert('Error', 'Failed to update mosque following');
    }
  };

  const handleContinue = async () => {
    if (followedMosques.size === 0) {
      Alert.alert(
        'No Mosques Selected',
        'Would you like to follow at least one mosque to get personalized prayer times and updates?',
        [
          { text: 'Skip for now', onPress: () => navigation.replace('Main') },
          { text: 'Select mosques', style: 'cancel' },
        ]
      );
      return;
    }

    navigation.replace('Main');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (location) {
      await findNearbyMosques(location);
    } else {
      await getCurrentLocation();
    }
    setRefreshing(false);
  };

  const renderMosqueCard = (mosque) => {
    const isFollowed = followedMosques.has(mosque.id);

    return (
      <View key={mosque.id} style={styles.mosqueCard}>
        <View style={styles.mosqueHeader}>
          <View style={styles.mosqueInfo}>
            <Text style={styles.mosqueName}>{mosque.name}</Text>
            <Text style={styles.mosqueAddress}>{mosque.address}</Text>
            <Text style={styles.mosqueDistance}>{mosque.distance} away</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowed && styles.followButtonActive
            ]}
            onPress={() => handleFollowMosque(mosque)}
          >
            <Icon 
              name={isFollowed ? 'favorite' : 'favorite-border'} 
              size={20} 
              color={isFollowed ? Colors.text.inverse : Colors.primary.main}
            />
            <Text style={[
              styles.followButtonText,
              isFollowed && styles.followButtonTextActive
            ]}>
              {isFollowed ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mosqueFeatures}>
          {mosque.hasLiveTranslation && (
            <View style={styles.featureTag}>
              <Icon name="live-tv" size={14} color={Colors.status.success} />
              <Text style={styles.featureText}>Live Translation</Text>
            </View>
          )}
          {mosque.hasWomenSpace && (
            <View style={styles.featureTag}>
              <Icon name="female" size={14} color={Colors.primary.main} />
              <Text style={styles.featureText}>Women's Space</Text>
            </View>
          )}
          {mosque.hasParking && (
            <View style={styles.featureTag}>
              <Icon name="local-parking" size={14} color={Colors.secondary.main} />
              <Text style={styles.featureText}>Parking</Text>
            </View>
          )}
        </View>

        <View style={styles.mosqueStats}>
          <View style={styles.statItem}>
            <Icon name="people" size={16} color={Colors.text.secondary} />
            <Text style={styles.statText}>{mosque.followers} followers</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="schedule" size={16} color={Colors.text.secondary} />
            <Text style={styles.statText}>
              {mosque.nextPrayer} at {mosque.nextPrayerTime}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Setting up your account...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover Nearby Mosques</Text>
          <Text style={styles.headerSubtitle}>
            Follow mosques to receive prayer times, live translations, and community updates
          </Text>
        </View>

        {/* Location Status */}
        {locationLoading ? (
          <View style={styles.locationStatus}>
            <LoadingSpinner size="small" />
            <Text style={styles.locationText}>Finding nearby mosques...</Text>
          </View>
        ) : location ? (
          <View style={styles.locationStatus}>
            <Icon name="location-on" size={20} color={Colors.status.success} />
            <Text style={styles.locationText}>
              Found {nearbyMosques.length} mosques near {location.city}
            </Text>
          </View>
        ) : (
          <View style={styles.locationStatus}>
            <Icon name="location-off" size={20} color={Colors.status.warning} />
            <Text style={styles.locationText}>Location access needed</Text>
            <IslamicButton
              title="Enable Location"
              onPress={getCurrentLocation}
              variant="outline"
              size="sm"
              icon="my-location"
              style={styles.locationButton}
            />
          </View>
        )}

        {/* Mosques List */}
        <ScrollView
          style={styles.mosquesContainer}
          contentContainerStyle={styles.mosquesContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {nearbyMosques.length > 0 ? (
            nearbyMosques.map(renderMosqueCard)
          ) : (
            <View style={styles.emptyState}>
              <Icon name="mosque" size={60} color={Colors.text.hint} />
              <Text style={styles.emptyTitle}>No mosques found</Text>
              <Text style={styles.emptyDescription}>
                {location 
                  ? 'No mosques found in your area. Try refreshing or check back later.'
                  : 'Enable location access to discover nearby mosques.'
                }
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.continueContainer}>
          <Text style={styles.selectionText}>
            {followedMosques.size} mosque{followedMosques.size !== 1 ? 's' : ''} selected
          </Text>
          <IslamicButton
            title="Continue to App"
            onPress={handleContinue}
            variant="primary"
            size="lg"
            icon="arrow-forward"
            iconPosition="right"
            gradient
            style={styles.continueButton}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.background,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    marginTop: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.text.inverse,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.relaxed,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.neutral.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  locationText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  locationButton: {
    marginLeft: Spacing.md,
  },
  mosquesContainer: {
    flex: 1,
  },
  mosquesContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  mosqueCard: {
    backgroundColor: Colors.neutral.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    minHeight: 180, // Ensure minimum height
  },
  mosqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  mosqueInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  mosqueName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  mosqueAddress: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeights.normal,
    flexWrap: 'wrap',
  },
  mosqueDistance: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary.main,
    fontWeight: Typography.weights.medium,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary.main,
    backgroundColor: Colors.neutral.surface,
  },
  followButtonActive: {
    backgroundColor: Colors.primary.main,
  },
  followButtonText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary.main,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  followButtonTextActive: {
    color: Colors.text.inverse,
  },
  mosqueFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  featureText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
  },
  mosqueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.text.hint,
    textAlign: 'center',
    lineHeight: Typography.lineHeights.relaxed,
    paddingHorizontal: Spacing.xl,
  },
  continueContainer: {
    backgroundColor: Colors.neutral.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  selectionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  continueButton: {
    width: '100%',
  },
});

export default IndividualOnboardingScreen;

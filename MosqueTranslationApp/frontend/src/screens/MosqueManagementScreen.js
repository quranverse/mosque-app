import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MosqueService from '../services/MosqueService/MosqueService';
import LocationService from '../services/LocationService/LocationService';
import AuthService from '../services/AuthService/AuthService';
import EmptyState from '../components/Common/EmptyState';
import ErrorHandler from '../utils/ErrorHandler';

const MosqueManagementScreen = ({ navigation }) => {
  const [followedMosques, setFollowedMosques] = useState([]);
  const [availableMosques, setAvailableMosques] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('followed'); // 'followed' or 'discover'
  const [isMosqueAdmin, setIsMosqueAdmin] = useState(false);

  useEffect(() => {
    // Check if user is mosque admin
    setIsMosqueAdmin(AuthService.isMosqueAdmin());

    // Only load mosques if user is not a mosque admin
    if (!AuthService.isMosqueAdmin()) {
      loadMosques();
    }
  }, []);

  const loadMosques = async () => {
    try {
      // Load followed mosques from API
      const followedResult = await MosqueService.getFollowedMosques();
      if (followedResult.success) {
        setFollowedMosques(followedResult.mosques.map(MosqueService.formatMosqueData));
      }

      // Get user's current location
      const location = await LocationService.getCurrentLocation();
      if (location.success) {
        console.log('Loading nearby mosques for location:', location.latitude, location.longitude);

        // Load nearby mosques from API
        const nearbyResult = await MosqueService.getNearbyMosques(
          location.latitude,
          location.longitude,
          10 // 10km radius
        );

        console.log('Nearby mosques result:', nearbyResult);

        if (nearbyResult.success && nearbyResult.mosques && nearbyResult.mosques.length > 0) {
          setAvailableMosques(nearbyResult.mosques.map(MosqueService.formatMosqueData));
        } else {
          // Try to load all mosques if nearby search fails
          console.log('No nearby mosques found, loading all mosques...');
          const allMosquesResult = await MosqueService.getNearbyMosques(
            location.latitude,
            location.longitude,
            100 // Larger radius
          );

          if (allMosquesResult.success && allMosquesResult.mosques) {
            setAvailableMosques(allMosquesResult.mosques.map(MosqueService.formatMosqueData));
          } else {
            setAvailableMosques([]);
          }
        }
      } else {
        console.log('Location not available, loading default mosques...');
        // No location available, try to load mosques without location
        const defaultResult = await MosqueService.getNearbyMosques(40.7128, -74.0060, 100);
        if (defaultResult.success && defaultResult.mosques) {
          setAvailableMosques(defaultResult.mosques.map(MosqueService.formatMosqueData));
        } else {
          setAvailableMosques([]);
        }
      }
    } catch (error) {
      console.error('Error loading mosques:', error);
      ErrorHandler.logError(error, 'loadMosques');
      ErrorHandler.showErrorAlert(error, 'Error', 'loading mosques');

      // Show empty state on error
      setAvailableMosques([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMosques();
    setRefreshing(false);
  };

  const toggleFollowMosque = async (mosque) => {
    try {
      const isCurrentlyFollowed = followedMosques.some(m => m.id === mosque.id);

      if (isCurrentlyFollowed) {
        // Unfollow mosque via API
        const result = await MosqueService.unfollowMosque(mosque.id);
        if (result.success) {
          const updatedFollowed = followedMosques.filter(m => m.id !== mosque.id);
          setFollowedMosques(updatedFollowed);
          Alert.alert('Unfollowed', `You unfollowed ${mosque.name}`);
        } else {
          Alert.alert('Error', result.error || 'Failed to unfollow mosque');
          return;
        }
      } else {
        // Follow mosque via API
        const result = await MosqueService.followMosque(mosque.id);
        if (result.success) {
          const mosqueToFollow = { ...mosque, isFollowed: true };
          const updatedFollowed = [...followedMosques, mosqueToFollow];
          setFollowedMosques(updatedFollowed);
          Alert.alert('Following', `You are now following ${mosque.name}`);
        } else {
          Alert.alert('Error', result.error || 'Failed to follow mosque');
          return;
        }
      }

      // Update available mosques list to reflect the change
      setAvailableMosques(prev =>
        prev.map(m =>
          m.id === mosque.id ? { ...m, isFollowed: !isCurrentlyFollowed } : m
        )
      );

    } catch (error) {
      console.error('Error updating mosque follow status:', error);
      Alert.alert('Error', 'Failed to update mosque follow status');
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (query.trim().length > 2) {
      try {
        console.log('Searching for:', query);
        const location = await LocationService.getCurrentLocation();

        let searchResult;
        if (location.success) {
          searchResult = await MosqueService.searchMosques(
            query,
            location.latitude,
            location.longitude,
            50 // 50km radius for search
          );
        } else {
          // Search without location
          searchResult = await MosqueService.searchMosques(
            query,
            40.7128, // Default NYC coordinates
            -74.0060,
            100 // Larger radius when no location
          );
        }

        console.log('Search result:', searchResult);

        if (searchResult.success && searchResult.mosques && searchResult.mosques.length > 0) {
          setAvailableMosques(searchResult.mosques.map(MosqueService.formatMosqueData));
        } else {
          // No results found
          setAvailableMosques([]);
        }
      } catch (error) {
        console.error('Error searching mosques:', error);
        setAvailableMosques([]);
      }
    } else if (query.trim().length === 0) {
      // Reload nearby mosques when search is cleared
      loadMosques();
    }
  };

  const filteredMosques = availableMosques.filter(mosque =>
    (mosque.name && mosque.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (mosque.imam && mosque.imam.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (mosque.address && mosque.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderMosqueCard = (mosque) => {
    const isFollowed = followedMosques.some(m => m.id === mosque.id);

    return (
      <View key={mosque.id} style={styles.mosqueCard}>
        <View style={styles.mosqueHeader}>
          <View style={styles.mosqueInfo}>
            <Text style={styles.mosqueName}>{mosque.name || 'Unknown Mosque'}</Text>
            <Text style={styles.imamName}>Imam: {mosque.imam || 'Not specified'}</Text>
            <Text style={styles.mosqueAddress}>{mosque.address || 'Address not available'}</Text>
          </View>

          {!isMosqueAdmin && (
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowed && styles.unfollowButton
              ]}
              onPress={() => toggleFollowMosque(mosque)}
            >
              <Icon
                name={isFollowed ? "favorite" : "favorite-border"}
                size={20}
                color={isFollowed ? "#fff" : "#2E7D32"}
              />
              <Text style={[
                styles.followButtonText,
                isFollowed && styles.unfollowButtonText
              ]}>
                {isFollowed ? 'Unfollow' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

      <View style={styles.mosqueDetails}>
        <View style={styles.detailItem}>
          <Icon name="location-on" size={16} color="#666" />
          <Text style={styles.detailText}>{mosque.distanceFormatted || (mosque.distance ? `${mosque.distance} km away` : 'Distance unknown')}</Text>
        </View>

        <View style={styles.detailItem}>
          <Icon name="people" size={16} color="#666" />
          <Text style={styles.detailText}>{mosque.followers || 0} followers</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Icon name="language" size={16} color="#666" />
          <Text style={styles.detailText}>{mosque.languagesSupported?.join(', ') || 'Arabic'}</Text>
        </View>
      </View>
    </View>
    );
  };

  // Show different content for mosque admins
  if (isMosqueAdmin) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mosque Management</Text>
        </View>

        {/* Mosque Admin Message */}
        <View style={styles.mosqueAdminContainer}>
          <EmptyState
            icon="mosque"
            title="Mosque Account"
            message="This feature is designed for individual users to follow and discover mosques. As a mosque account, you can manage your mosque's profile and broadcasting settings instead."
            actionText="Go to Broadcasting"
            onActionPress={() => navigation.navigate('MainTabs', { screen: 'MainContent' })}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mosque Management</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followed' && styles.activeTab]}
          onPress={() => setActiveTab('followed')}
        >
          <Text style={[styles.tabText, activeTab === 'followed' && styles.activeTabText]}>
            Following ({followedMosques.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {activeTab === 'discover' && (
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search mosques, imams, or locations..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'followed' ? (
          followedMosques.length > 0 ? (
            followedMosques.map(renderMosqueCard)
          ) : (
            <EmptyState
              icon="favorite-border"
              title="No Mosques Followed"
              message="Discover and follow mosques to see their prayer times and live translations"
              actionText="Discover Mosques"
              onActionPress={() => setActiveTab('discover')}
            />
          )
        ) : (
          filteredMosques.length > 0 ? (
            filteredMosques.map(renderMosqueCard)
          ) : (
            <EmptyState
              icon="mosque"
              title="No Mosques Found"
              message={searchQuery ?
                "No mosques match your search. Try a different search term." :
                "No mosques found in your area. Make sure location services are enabled."
              }
              actionText="Refresh"
              onActionPress={loadMosques}
            />
          )
        )}
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
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2E7D32',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 25,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  mosqueCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  mosqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  mosqueInfo: {
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
  mosqueAddress: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  unfollowButton: {
    backgroundColor: '#F44336',
  },
  followButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  unfollowButtonText: {
    color: '#fff',
  },
  mosqueDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  mosqueAdminContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  discoverButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  discoverButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default MosqueManagementScreen;

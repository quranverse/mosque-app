import * as Location from 'expo-location';

class LocationService {
  static async getCurrentLocation() {
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Get address details
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const addressInfo = address[0] || {};

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
        city: addressInfo.city,
        region: addressInfo.region,
        country: addressInfo.country,
        postalCode: addressInfo.postalCode,
        street: addressInfo.street,
        name: addressInfo.name,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      throw error;
    }
  }

  static async watchLocation(callback, options = {}) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: options.timeInterval || 10000, // 10 seconds
          distanceInterval: options.distanceInterval || 10, // 10 meters
        },
        callback
      );

      return subscription;
    } catch (error) {
      console.error('Error watching location:', error);
      throw error;
    }
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  static deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  static formatDistance(distanceInKm) {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)} m`;
    } else {
      return `${distanceInKm.toFixed(1)} km`;
    }
  }

  static async findNearbyMosques(latitude, longitude, radius = 10) {
    // This is a mock implementation
    // In a real app, this would call a mosque discovery API like Google Places API
    // or a specialized Islamic places API
    
    const mockMosques = [
      {
        id: 1,
        name: 'Central Mosque',
        latitude: latitude + 0.001,
        longitude: longitude + 0.001,
        address: '123 Main Street',
        hasLiveTranslation: true,
        followers: 150,
        phone: '+1234567890',
        website: 'https://centralmosque.org',
      },
      {
        id: 2,
        name: 'Community Islamic Center',
        latitude: latitude + 0.005,
        longitude: longitude - 0.003,
        address: '456 Oak Avenue',
        hasLiveTranslation: false,
        followers: 89,
        phone: '+1234567891',
        website: 'https://communityislamic.org',
      },
      {
        id: 3,
        name: 'Masjid Al-Noor',
        latitude: latitude - 0.008,
        longitude: longitude + 0.004,
        address: '789 Pine Road',
        hasLiveTranslation: true,
        followers: 203,
        phone: '+1234567892',
        website: 'https://masjidalnoor.org',
      },
      {
        id: 4,
        name: 'Islamic Society Mosque',
        latitude: latitude + 0.012,
        longitude: longitude - 0.007,
        address: '321 Cedar Lane',
        hasLiveTranslation: true,
        followers: 175,
        phone: '+1234567893',
        website: 'https://islamicsociety.org',
      },
    ];

    // Calculate distances and filter by radius
    const mosquesWithDistance = mockMosques
      .map(mosque => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          mosque.latitude,
          mosque.longitude
        );
        return {
          ...mosque,
          distance: distance,
          distanceFormatted: this.formatDistance(distance),
        };
      })
      .filter(mosque => mosque.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return mosquesWithDistance;
  }

  static async getLocationFromAddress(address) {
    try {
      const geocoded = await Location.geocodeAsync(address);
      if (geocoded.length > 0) {
        return {
          latitude: geocoded[0].latitude,
          longitude: geocoded[0].longitude,
        };
      }
      throw new Error('Address not found');
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }

  static async getAddressFromLocation(latitude, longitude) {
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (address.length > 0) {
        const addressInfo = address[0];
        return {
          formattedAddress: `${addressInfo.street || ''} ${addressInfo.city || ''} ${addressInfo.region || ''} ${addressInfo.country || ''}`.trim(),
          street: addressInfo.street,
          city: addressInfo.city,
          region: addressInfo.region,
          country: addressInfo.country,
          postalCode: addressInfo.postalCode,
        };
      }
      throw new Error('Address not found');
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw error;
    }
  }
}

export default LocationService;

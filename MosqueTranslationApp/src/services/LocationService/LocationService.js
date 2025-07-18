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
    // Real implementation should use MosqueService API
    // This method is deprecated - use MosqueService.getNearbyMosques() instead
    return [];
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

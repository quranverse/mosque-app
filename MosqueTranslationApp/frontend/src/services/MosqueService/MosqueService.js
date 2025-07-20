// Mosque Service for Mosque Translation App
import ApiService from '../ApiService';
import { API_ENDPOINTS } from '../../config/api';
import LocationService from '../LocationService/LocationService';
import ErrorHandler from '../../utils/ErrorHandler';
import AuthService from '../AuthService/AuthService';

class MosqueService {
  /**
   * Get nearby mosques based on user location
   */
  static async getNearbyMosques(latitude, longitude, radius = 10) {
    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lng: longitude.toString(),
        radius: radius.toString(),
      });

      const response = await ApiService.get(`${API_ENDPOINTS.MOSQUES.LIST}?${params}`);
      
      return {
        success: true,
        mosques: response || [],
      };
    } catch (error) {
      ErrorHandler.logError(error, 'getNearbyMosques', { latitude, longitude, radius });
      const { userMessage } = ErrorHandler.handleMosqueError(error, 'fetching nearby mosques');

      return {
        success: false,
        mosques: [],
        error: userMessage,
      };
    }
  }

  /**
   * Search mosques by name, address, or other criteria
   */
  static async searchMosques(query, latitude, longitude, radius = 50) {
    try {
      const params = new URLSearchParams({
        q: query,
        lat: latitude.toString(),
        lng: longitude.toString(),
        radius: radius.toString(),
      });

      const response = await ApiService.get(`${API_ENDPOINTS.MOSQUES.SEARCH}?${params}`);
      
      return {
        success: true,
        mosques: response || [],
      };
    } catch (error) {
      console.error('Error searching mosques:', error);
      
      return {
        success: false,
        mosques: [],
        error: error.message,
      };
    }
  }

  /**
   * Get details for a specific mosque
   */
  static async getMosqueDetails(mosqueId) {
    try {
      const response = await ApiService.get(API_ENDPOINTS.MOSQUES.DETAILS(mosqueId));
      
      return {
        success: true,
        mosque: response,
      };
    } catch (error) {
      console.error('Error fetching mosque details:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Follow a mosque (works for both anonymous and authenticated users)
   */
  static async followMosque(mosqueId) {
    try {
      // Get mosque data first
      const mosqueData = await this.getMosqueById(mosqueId);
      if (!mosqueData) {
        return { success: false, error: 'Mosque not found' };
      }

      // Use AuthService to handle following (works for both anonymous and authenticated users)
      return await AuthService.followMosque(mosqueData);
    } catch (error) {
      ErrorHandler.logError(error, 'followMosque', { mosqueId });
      const { userMessage } = ErrorHandler.handleMosqueError(error, 'following mosque');
      return { success: false, error: userMessage };
    }
  }

  /**
   * Unfollow a mosque (works for both anonymous and authenticated users)
   */
  static async unfollowMosque(mosqueId) {
    try {
      // Use AuthService to handle unfollowing (works for both anonymous and authenticated users)
      return await AuthService.unfollowMosque(mosqueId);
    } catch (error) {
      ErrorHandler.logError(error, 'unfollowMosque', { mosqueId });
      const { userMessage } = ErrorHandler.handleMosqueError(error, 'unfollowing mosque');
      return { success: false, error: userMessage };
    }
  }

  /**
   * Get user's followed mosques (works for both anonymous and authenticated users)
   */
  static async getFollowedMosques() {
    try {
      // Use AuthService to get followed mosques (works for both anonymous and authenticated users)
      const followedMosques = await AuthService.getFollowedMosques();
      return {
        success: true,
        mosques: followedMosques.map(mosque => this.formatMosqueData(mosque)),
      };
    } catch (error) {
      ErrorHandler.logError(error, 'getFollowedMosques');
      const { userMessage } = ErrorHandler.handleMosqueError(error, 'getting followed mosques');
      return {
        success: false,
        mosques: [],
        error: userMessage,
      };
    }
  }

  /**
   * Get mosque by ID (helper method)
   */
  static async getMosqueById(mosqueId) {
    try {
      // For now, we'll need to search through nearby mosques
      // In a real app, this would be a dedicated API endpoint
      const response = await ApiService.get(`${API_ENDPOINTS.MOSQUES}?lat=40.7128&lng=-74.0060&radius=50`);

      if (response && Array.isArray(response)) {
        const mosque = response.find(m => m.id === mosqueId || m._id === mosqueId);
        return mosque ? this.formatMosqueData(mosque) : null;
      }

      return null;
    } catch (error) {
      ErrorHandler.logError(error, 'getMosqueById', { mosqueId });
      return null;
    }
  }

  /**
   * Format mosque data for consistent display
   */
  static formatMosqueData(mosque) {
    return {
      id: mosque.id || mosque._id,
      name: mosque.name || mosque.mosqueName,
      address: mosque.address || mosque.mosqueAddress,
      location: mosque.location,
      phone: mosque.phone,
      website: mosque.website,
      imam: mosque.imam,
      servicesOffered: mosque.servicesOffered || [],
      languagesSupported: mosque.languagesSupported || ['Arabic'],
      capacity: mosque.capacity,
      facilities: mosque.facilities || [],
      followers: mosque.followers || mosque.analytics?.totalFollowers || 0,
      hasLiveTranslation: mosque.hasLiveTranslation || false,
      distance: mosque.distance,
      distanceFormatted: mosque.distanceFormatted,
      hasAccount: mosque.hasAccount !== false,
      isFollowed: mosque.isFollowed || false,
    };
  }



  /**
   * Format mosque data for consistent display
   */
  static formatMosqueData(mosque) {
    return {
      id: mosque.id || mosque._id,
      name: mosque.name || mosque.mosqueName,
      address: mosque.address || mosque.mosqueAddress,
      location: mosque.location,
      phone: mosque.phone,
      website: mosque.website,
      imam: mosque.imam,
      servicesOffered: mosque.servicesOffered || [],
      languagesSupported: mosque.languagesSupported || ['Arabic'],
      capacity: mosque.capacity,
      facilities: mosque.facilities || [],
      followers: mosque.followers || mosque.analytics?.totalFollowers || 0,
      hasLiveTranslation: mosque.hasLiveTranslation || false,
      hasAccount: mosque.hasAccount || true,
      isFollowed: mosque.isFollowed || false,
      distance: mosque.distance,
      distanceFormatted: mosque.distanceFormatted || 
        (mosque.distance ? LocationService.formatDistance(mosque.distance) : null),
    };
  }
}

export default MosqueService;

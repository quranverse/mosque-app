import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../ApiService';
import { API_ENDPOINTS } from '../../config/api';
import ErrorHandler from '../../utils/ErrorHandler';

class AuthService {
  static currentUser = null;
  static listeners = new Set();

  // Storage keys
  static STORAGE_KEYS = {
    USER_TOKEN: 'user_token',
    USER_DATA: 'user_data',
    USER_TYPE: 'user_type', // 'mosque' or 'individual'
    FIRST_TIME: 'first_time_user',
    LANGUAGE_PREFERENCE: 'language_preference',
    FOLLOWED_MOSQUES: 'followed_mosques_anonymous', // For anonymous users
  };

  // User types
  static USER_TYPES = {
    MOSQUE_ADMIN: 'mosque_admin',
    INDIVIDUAL: 'individual',
    ANONYMOUS: 'anonymous',
  };

  // Languages
  static LANGUAGES = {
    ARABIC: 'ar',
    ENGLISH: 'en',
    FRENCH: 'fr',
    URDU: 'ur',
    TURKISH: 'tr',
  };

  /**
   * Initialize the auth service
   */
  static async initialize() {
    try {
      const token = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_TOKEN);
      const userData = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        const parsedUserData = JSON.parse(userData);

        // Ensure the type property is set correctly for existing users
        if (parsedUserData.userType === 'mosque' && !parsedUserData.type) {
          parsedUserData.type = this.USER_TYPES.MOSQUE_ADMIN;
        } else if (parsedUserData.userType === 'individual' && !parsedUserData.type) {
          parsedUserData.type = this.USER_TYPES.INDIVIDUAL;
        }

        this.currentUser = {
          token,
          ...parsedUserData,
        };
        this.notifyListeners();
      } else {
        // Set up anonymous user if no authenticated user
        await this.setupAnonymousUser();
      }

      return this.currentUser;
    } catch (error) {
      console.error('Error initializing auth service:', error);
      // Fallback to anonymous user on error
      await this.setupAnonymousUser();
      return this.currentUser;
    }
  }

  /**
   * Set up anonymous user for individual users who don't want accounts
   */
  static async setupAnonymousUser() {
    try {
      const anonymousUser = {
        id: `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: this.USER_TYPES.ANONYMOUS,
        name: 'Anonymous User',
        isAnonymous: true,
        preferences: {
          language: 'English',
          notifications: false,
          theme: 'light',
        },
        followedMosques: [], // Initialize empty followed mosques array
        createdAt: new Date().toISOString(),
      };

      // Store anonymous user data locally
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(anonymousUser));
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_TYPE, this.USER_TYPES.ANONYMOUS);

      this.currentUser = anonymousUser;
      this.notifyListeners();

      return anonymousUser;
    } catch (error) {
      console.error('Error setting up anonymous user:', error);
      throw error;
    }
  }

  /**
   * Check if this is a first-time user
   */
  static async isFirstTimeUser() {
    try {
      const firstTime = await AsyncStorage.getItem(this.STORAGE_KEYS.FIRST_TIME);
      return firstTime === null; // null means first time
    } catch (error) {
      console.error('Error checking first time user:', error);
      return true;
    }
  }

  /**
   * Mark user as not first time
   */
  static async markNotFirstTime() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.FIRST_TIME, 'false');
    } catch (error) {
      console.error('Error marking not first time:', error);
    }
  }

  /**
   * Extract value from picker/dropdown objects or return the value as-is
   */
  static extractValue(value) {
    if (value && typeof value === 'object' && value.value !== undefined) {
      return value.value;
    }
    return value;
  }

  /**
   * Extract values from array of picker/dropdown objects or return the array as-is
   */
  static extractArrayValues(array) {
    if (!Array.isArray(array)) {
      return array;
    }
    return array.map(item => this.extractValue(item));
  }

  /**
   * Transform frontend registration data to backend format
   */
  static transformRegistrationData(registrationData) {
    // Build full address from components
    const mosqueAddress = [
      registrationData.address,
      registrationData.city,
      registrationData.zipCode,
      registrationData.country
    ].filter(Boolean).join(', ');

    // Transform facilities object to array
    const facilities = Object.entries(registrationData.facilities || {})
      .filter(([key, value]) => value === true)
      .map(([key]) => {
        // Convert camelCase to readable format
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      });

    // Calculate total capacity
    const capacityMen = parseInt(registrationData.capacityMen) || 0;
    const capacityWomen = parseInt(registrationData.capacityWomen) || 0;
    const capacity = capacityMen + capacityWomen;

    return {
      email: registrationData.email,
      password: registrationData.password,
      mosqueName: registrationData.mosqueName,
      mosqueAddress,
      phone: registrationData.phone || '',
      website: registrationData.website || '',
      latitude: registrationData.latitude || 0,
      longitude: registrationData.longitude || 0,
      servicesOffered: this.extractArrayValues(registrationData.servicesOffered) || ['Live Translation'],
      languagesSupported: this.extractArrayValues(registrationData.languagesSupported) || ['Arabic', 'English'],
      capacity,
      facilities,
      // Additional metadata
      constructionYear: registrationData.constructionYear,
      briefHistory: registrationData.briefHistory,
      otherInfo: registrationData.otherInfo,
    };
  }

  /**
   * Register a mosque account
   */
  static async registerMosque(registrationData) {
    try {
      // Validate required fields
      const requiredFields = ['email', 'password', 'mosqueName', 'address', 'city', 'country'];
      for (const field of requiredFields) {
        if (!registrationData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Validate email format
      if (!this.isValidEmail(registrationData.email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      if (!this.isValidPassword(registrationData.password)) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Transform data to backend format
      const apiData = this.transformRegistrationData(registrationData);

      // Make API call to register mosque
      const response = await ApiService.post(API_ENDPOINTS.AUTH.REGISTER_MOSQUE, apiData);

      if (response.success) {
        // Store user data and tokens
        await this.storeUserData(response.user, response.token);
        if (response.refreshToken) {
          await ApiService.setRefreshToken(response.refreshToken);
        }

        // Set the correct user type based on backend response
        const userType = response.user.userType === 'mosque' ? this.USER_TYPES.MOSQUE_ADMIN : this.USER_TYPES.INDIVIDUAL;
        await AsyncStorage.setItem(this.STORAGE_KEYS.USER_TYPE, userType);

        // Set the type property on the user object for consistency
        this.currentUser = {
          ...response.user,
          type: userType,
          token: response.token
        };
        this.notifyListeners();

        return {
          success: true,
          user: response.user,
          message: response.message || 'Mosque registered successfully',
        };
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      ErrorHandler.logError(error, 'registerMosque', { email: registrationData.email });
      const { userMessage } = ErrorHandler.handleAuthError(error, 'mosque registration');
      return {
        success: false,
        error: userMessage,
      };
    }
  }

  /**
   * Continue as individual user
   */
  static async continueAsIndividual() {
    try {
      // Generate a temporary user ID for individual users
      const deviceId = await this.getDeviceId();
      const individualUser = {
        id: `individual_${deviceId}`,
        type: this.USER_TYPES.INDIVIDUAL,
        deviceId,
        createdAt: new Date().toISOString(),
        followedMosques: [],
        preferences: {
          language: 'en',
          notifications: {
            prayerTimes: true,
            liveTranslation: true,
            mosqueNews: true,
          },
        },
      };

      await this.storeUserData(individualUser, null);
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_TYPE, this.USER_TYPES.INDIVIDUAL);
      
      this.currentUser = individualUser;
      this.notifyListeners();
      
      return {
        success: true,
        user: individualUser,
      };
    } catch (error) {
      console.error('Error continuing as individual:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Login user
   */
  static async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Make API call to login
      const response = await ApiService.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });

      if (response.success) {
        // Store user data and tokens
        await this.storeUserData(response.user, response.token);
        if (response.refreshToken) {
          await ApiService.setRefreshToken(response.refreshToken);
        }

        // Set the correct user type based on backend response
        const userType = response.user.userType === 'mosque' ? this.USER_TYPES.MOSQUE_ADMIN : this.USER_TYPES.INDIVIDUAL;
        await AsyncStorage.setItem(this.STORAGE_KEYS.USER_TYPE, userType);

        // Set the type property on the user object for consistency
        this.currentUser = {
          ...response.user,
          type: userType,
          token: response.token
        };
        this.notifyListeners();

        return {
          success: true,
          user: response.user,
        };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Logout user
   */
  static async logout() {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.USER_TOKEN,
        this.STORAGE_KEYS.USER_DATA,
        this.STORAGE_KEYS.USER_TYPE,
      ]);
      
      this.currentUser = null;
      this.notifyListeners();
      
      return { success: true };
    } catch (error) {
      console.error('Error logging out:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get current user
   */
  static getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated (has a real account)
   */
  static isAuthenticated() {
    return !!this.currentUser && !!this.currentUser.token && !this.currentUser.isAnonymous;
  }

  /**
   * Check if user is anonymous
   */
  static isAnonymous() {
    return !!this.currentUser && this.currentUser.isAnonymous === true;
  }

  /**
   * Check if user has any session (authenticated or anonymous)
   */
  static hasUser() {
    return this.currentUser !== null;
  }

  /**
   * Check if user is mosque admin
   */
  static isMosqueAdmin() {
    return this.currentUser && (
      this.currentUser.type === this.USER_TYPES.MOSQUE_ADMIN ||
      this.currentUser.userType === 'mosque'
    );
  }

  /**
   * Check if user is individual
   */
  static isIndividualUser() {
    return this.currentUser && this.currentUser.type === this.USER_TYPES.INDIVIDUAL;
  }

  /**
   * Get user type
   */
  static async getUserType() {
    try {
      return await AsyncStorage.getItem(this.STORAGE_KEYS.USER_TYPE);
    } catch (error) {
      console.error('Error getting user type:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates) {
    try {
      if (!this.currentUser) {
        throw new Error('No user logged in');
      }

      const updatedUser = {
        ...this.currentUser,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await this.storeUserData(updatedUser, this.currentUser.token);
      this.currentUser = updatedUser;
      this.notifyListeners();

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set language preference
   */
  static async setLanguagePreference(language) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.LANGUAGE_PREFERENCE, language);

      if (this.currentUser) {
        if (this.currentUser.isAnonymous) {
          // For anonymous users, store preferences locally only
          this.currentUser.preferences = {
            ...this.currentUser.preferences,
            language: language
          };
          await AsyncStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
          this.notifyListeners();
        } else {
          // For authenticated users, update profile on server
          await this.updateProfile({
            preferences: {
              ...this.currentUser.preferences,
              language,
            },
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error setting language preference:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update user preferences (works for both anonymous and authenticated users)
   */
  static async updateUserPreferences(preferences) {
    try {
      if (!this.currentUser) return { success: false, error: 'No user session' };

      if (this.currentUser.isAnonymous) {
        // For anonymous users, store preferences locally
        this.currentUser.preferences = {
          ...this.currentUser.preferences,
          ...preferences
        };
        await AsyncStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
        this.notifyListeners();
      } else {
        // For authenticated users, update profile on server
        await this.updateProfile({
          preferences: {
            ...this.currentUser.preferences,
            ...preferences
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user preferences (works for both anonymous and authenticated users)
   */
  static getUserPreferences() {
    if (!this.currentUser) return {};
    return this.currentUser.preferences || {};
  }

  /**
   * Follow a mosque (works for both anonymous and authenticated users)
   */
  static async followMosque(mosqueData) {
    try {
      if (!this.currentUser) return { success: false, error: 'No user session' };

      const followData = {
        id: mosqueData.id,
        name: mosqueData.name,
        address: mosqueData.address,
        location: mosqueData.location,
        followedAt: new Date().toISOString(),
        ...mosqueData
      };

      if (this.currentUser.isAnonymous) {
        // For anonymous users, store followed mosques locally
        const followedMosques = await this.getFollowedMosques();

        // Check if already following
        const isAlreadyFollowing = followedMosques.some(m => m.id === mosqueData.id);
        if (isAlreadyFollowing) {
          return { success: false, error: 'Already following this mosque' };
        }

        followedMosques.push(followData);
        await AsyncStorage.setItem(this.STORAGE_KEYS.FOLLOWED_MOSQUES, JSON.stringify(followedMosques));

        // Update current user data
        this.currentUser.followedMosques = followedMosques;
        await AsyncStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
        this.notifyListeners();

        return { success: true, message: 'Mosque followed successfully' };
      } else {
        // For authenticated users, use server API
        const { default: ApiService } = await import('../ApiService');
        const response = await ApiService.post('/user/followed-mosques', {
          mosqueId: mosqueData.id,
          action: 'follow'
        });

        if (response.success) {
          // Update local user data
          if (!this.currentUser.followedMosques) {
            this.currentUser.followedMosques = [];
          }
          this.currentUser.followedMosques.push(followData);
          await AsyncStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
          this.notifyListeners();
        }

        return response;
      }
    } catch (error) {
      console.error('Error following mosque:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unfollow a mosque (works for both anonymous and authenticated users)
   */
  static async unfollowMosque(mosqueId) {
    try {
      if (!this.currentUser) return { success: false, error: 'No user session' };

      if (this.currentUser.isAnonymous) {
        // For anonymous users, remove from local storage
        const followedMosques = await this.getFollowedMosques();
        const updatedMosques = followedMosques.filter(m => m.id !== mosqueId);

        await AsyncStorage.setItem(this.STORAGE_KEYS.FOLLOWED_MOSQUES, JSON.stringify(updatedMosques));

        // Update current user data
        this.currentUser.followedMosques = updatedMosques;
        await AsyncStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
        this.notifyListeners();

        return { success: true, message: 'Mosque unfollowed successfully' };
      } else {
        // For authenticated users, use server API
        const { default: ApiService } = await import('../ApiService');
        const response = await ApiService.post('/user/followed-mosques', {
          mosqueId: mosqueId,
          action: 'unfollow'
        });

        if (response.success) {
          // Update local user data
          if (this.currentUser.followedMosques) {
            this.currentUser.followedMosques = this.currentUser.followedMosques.filter(m => m.id !== mosqueId);
            await AsyncStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
            this.notifyListeners();
          }
        }

        return response;
      }
    } catch (error) {
      console.error('Error unfollowing mosque:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get followed mosques (works for both anonymous and authenticated users)
   */
  static async getFollowedMosques() {
    try {
      if (!this.currentUser) return [];

      if (this.currentUser.isAnonymous) {
        // For anonymous users, get from local storage
        const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.FOLLOWED_MOSQUES);
        return stored ? JSON.parse(stored) : [];
      } else {
        // For authenticated users, get from server or local cache
        if (this.currentUser.followedMosques) {
          return this.currentUser.followedMosques;
        }

        // Fetch from server if not cached
        const { default: ApiService } = await import('../ApiService');
        const response = await ApiService.get('/user/followed-mosques');

        if (response.success) {
          this.currentUser.followedMosques = response.followedMosques || [];
          await AsyncStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
          return this.currentUser.followedMosques;
        }

        return [];
      }
    } catch (error) {
      console.error('Error getting followed mosques:', error);
      return [];
    }
  }

  /**
   * Check if a mosque is followed (works for both anonymous and authenticated users)
   */
  static async isMosqueFollowed(mosqueId) {
    try {
      const followedMosques = await this.getFollowedMosques();
      return followedMosques.some(m => m.id === mosqueId);
    } catch (error) {
      console.error('Error checking if mosque is followed:', error);
      return false;
    }
  }

  /**
   * Get language preference
   */
  static async getLanguagePreference() {
    try {
      const language = await AsyncStorage.getItem(this.STORAGE_KEYS.LANGUAGE_PREFERENCE);
      return language || this.LANGUAGES.ENGLISH;
    } catch (error) {
      console.error('Error getting language preference:', error);
      return this.LANGUAGES.ENGLISH;
    }
  }

  // Helper methods
  static async getDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `fallback_${Date.now()}`;
    }
  }

  static async storeUserData(user, token) {
    try {
      if (token) {
        await AsyncStorage.setItem(this.STORAGE_KEYS.USER_TOKEN, token);
      }
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user data:', error);
      throw error;
    }
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPassword(password) {
    return password && password.length >= 8;
  }

  // Mock API simulation methods
  static async simulateMosqueRegistration(data) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate successful registration
    return {
      user: {
        id: `mosque_${Date.now()}`,
        type: this.USER_TYPES.MOSQUE_ADMIN,
        email: data.email,
        mosqueName: data.mosqueName,
        address: data.address,
        city: data.city,
        zipCode: data.zipCode,
        country: data.country,
        website: data.website,
        language: data.language || this.LANGUAGES.ENGLISH,
        facilities: data.facilities || {},
        photos: data.photos || {},
        verified: false,
        createdAt: new Date().toISOString(),
        preferences: {
          language: data.language || this.LANGUAGES.ENGLISH,
          notifications: {
            followers: true,
            sessions: true,
            events: true,
          },
        },
      },
      token: `mock_token_${Date.now()}`,
    };
  }



  // Event listeners for auth state changes
  static addAuthListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  static notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }
}

export default AuthService;

import AsyncStorage from '@react-native-async-storage/async-storage';

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
  };

  // User types
  static USER_TYPES = {
    MOSQUE: 'mosque',
    INDIVIDUAL: 'individual',
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
        this.currentUser = {
          token,
          ...JSON.parse(userData),
        };
        this.notifyListeners();
      }
      
      return this.currentUser;
    } catch (error) {
      console.error('Error initializing auth service:', error);
      return null;
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
   * Register a mosque account
   */
  static async registerMosque(registrationData) {
    try {
      // Validate required fields
      const requiredFields = ['email', 'password', 'mosqueName', 'address', 'city', 'zipCode', 'country'];
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

      // In a real app, this would make an API call
      // For now, we'll simulate the registration process
      const mockResponse = await this.simulateMosqueRegistration(registrationData);
      
      // Store user data
      await this.storeUserData(mockResponse.user, mockResponse.token);
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_TYPE, this.USER_TYPES.MOSQUE);
      
      this.currentUser = mockResponse.user;
      this.notifyListeners();
      
      return {
        success: true,
        user: mockResponse.user,
        message: 'Mosque registered successfully',
      };
    } catch (error) {
      console.error('Error registering mosque:', error);
      return {
        success: false,
        error: error.message,
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

      // In a real app, this would make an API call
      const mockResponse = await this.simulateLogin(email, password);
      
      await this.storeUserData(mockResponse.user, mockResponse.token);
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_TYPE, mockResponse.user.type);
      
      this.currentUser = mockResponse.user;
      this.notifyListeners();
      
      return {
        success: true,
        user: mockResponse.user,
      };
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
   * Check if user is authenticated
   */
  static isAuthenticated() {
    return this.currentUser !== null;
  }

  /**
   * Check if user is mosque admin
   */
  static isMosqueAdmin() {
    return this.currentUser && this.currentUser.type === this.USER_TYPES.MOSQUE;
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
        await this.updateProfile({
          preferences: {
            ...this.currentUser.preferences,
            language,
          },
        });
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
        type: this.USER_TYPES.MOSQUE,
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

  static async simulateLogin(email, password) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate login validation
    if (email === 'test@mosque.com' && password === 'password123') {
      return {
        user: {
          id: 'mosque_123',
          type: this.USER_TYPES.MOSQUE,
          email: 'test@mosque.com',
          mosqueName: 'Test Mosque',
          verified: true,
        },
        token: `mock_token_${Date.now()}`,
      };
    } else {
      throw new Error('Invalid email or password');
    }
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

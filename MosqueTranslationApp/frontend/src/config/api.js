// API Configuration for Mosque Translation App Frontend
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Dynamic IP detection and fallback configuration
class ApiConfig {
  static currentIP = null;
  static fallbackIPs = [
    '172.20.10.2', // Metro bundler IP (highest priority)
    '172.20.10.1', // Common router IP in this range
    '172.20.10.3', // Adjacent IPs in case Metro moved
    '10.0.2.2', // Android emulator default
    'localhost',
    '127.0.0.1',
    '192.168.1.1', // Common router IPs
    '192.168.0.1',
    '192.168.1.100', // Common device IPs
    '192.168.0.100',
    '10.0.0.1',
    '10.0.1.1',
  ];
  static isDetecting = false;
  static detectionPromise = null;

  // Detect current network IP by parsing Metro bundler URL or network info
  static async detectCurrentIP() {
    if (this.isDetecting && this.detectionPromise) {
      return this.detectionPromise;
    }

    this.isDetecting = true;
    this.detectionPromise = this._performDetection();

    try {
      const result = await this.detectionPromise;
      return result;
    } finally {
      this.isDetecting = false;
      this.detectionPromise = null;
    }
  }

  static async _performDetection() {
    try {
      // Method 1: Always try to extract IP from Metro bundler (most reliable for development)
      const metroIP = this.extractMetroIP();
      if (metroIP) {
        console.log('🔍 Found Metro bundler IP:', metroIP);
        // For mobile development, always prefer Metro IP (where the dev server is running)
        if (Platform.OS !== 'web') {
          console.log('✅ Using Metro bundler IP for mobile:', metroIP);
          this.currentIP = metroIP;
          return metroIP;
        }
        // For web, test the connection first
        if (await this.testConnection(metroIP)) {
          console.log('✅ Using Metro bundler IP (tested):', metroIP);
          this.currentIP = metroIP;
          return metroIP;
        }
      }

      // Method 2: Try fallback IPs (with connection testing) - prioritize known working IPs
      console.log('🔍 Testing fallback IPs...');
      for (const ip of this.fallbackIPs) {
        console.log(`Testing IP: ${ip}`);
        if (await this.testConnection(ip)) {
          console.log('✅ Using fallback IP:', ip);
          this.currentIP = ip;
          return ip;
        }
      }

      // Method 3: Try to get network info (React Native only) - only as backup
      if (Platform.OS !== 'web') {
        try {
          const networkState = await NetInfo.fetch();
          if (networkState.details && networkState.details.ipAddress) {
            const networkIP = networkState.details.ipAddress;
            console.log('🔍 Found device network IP:', networkIP);
            // Only use device IP if it's different from Metro IP and we haven't found anything else
            if (networkIP !== metroIP && await this.testConnection(networkIP)) {
              console.log('✅ Using device network IP:', networkIP);
              this.currentIP = networkIP;
              return networkIP;
            } else {
              console.log('⚠️ Device network IP not suitable for backend connection');
            }
          }
        } catch (error) {
          console.log('Network info detection failed:', error.message);
        }
      }

      // Method 4: For mobile development, prefer Metro IP even if backend isn't responding
      if (Platform.OS !== 'web' && metroIP) {
        console.log('⚠️ Backend not responding, but using Metro IP for mobile development:', metroIP);
        this.currentIP = metroIP;
        return metroIP;
      }

      // Method 5: Last resort - use localhost
      console.log('⚠️ No working IP found, using localhost as last resort');
      this.currentIP = 'localhost';
      return 'localhost';

    } catch (error) {
      console.error('IP detection failed:', error);
      // For mobile, return Metro IP as fallback
      if (Platform.OS !== 'web') {
        const fallbackIP = '172.20.10.2';
        console.log('Using Metro IP fallback:', fallbackIP);
        this.currentIP = fallbackIP;
        return fallbackIP;
      }
      this.currentIP = 'localhost';
      return 'localhost';
    }
  }

  // Extract IP from Metro bundler global variables
  static extractMetroIP() {
    try {
      // Method 1: For React Native, extract from the current bundle URL (most reliable)
      if (Platform.OS !== 'web') {
        // The bundle URL contains the Metro server IP
        // From logs: "http://172.20.10.2:3000/index.bundle//&platform=ios..."
        try {
          // Try to get the current script/bundle source
          const errorStack = new Error().stack;
          if (errorStack) {
            const ipMatch = errorStack.match(/http:\/\/(\d+\.\d+\.\d+\.\d+):\d+/);
            if (ipMatch) {
              console.log('Found Metro IP from error stack:', ipMatch[1]);
              return ipMatch[1];
            }
          }
        } catch (e) {
          // Ignore error stack extraction failures
        }

        // Try to get from global location if available
        if (typeof global !== 'undefined' && global.location) {
          const hostname = global.location.hostname;
          if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            console.log('Found Metro IP from global.location:', hostname);
            return hostname;
          }
        }
      }

      // Method 2: Try to extract from Metro bundler URL patterns
      if (typeof global !== 'undefined') {
        // Check for Metro bundler URL patterns in various global variables
        const possibleSources = [
          global.__METRO_GLOBAL_PREFIX__,
          global.location?.hostname,
          global.window?.location?.hostname,
          global.__DEV__ && global.location?.href,
        ];

        for (const source of possibleSources) {
          if (source && typeof source === 'string') {
            const ipMatch = source.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch) {
              console.log('Found Metro IP from global variables:', ipMatch[1]);
              return ipMatch[1];
            }
          }
        }
      }

      // Method 3: Try to extract from current script URL (web)
      if (typeof document !== 'undefined' && document.currentScript) {
        const scriptSrc = document.currentScript.src;
        const ipMatch = scriptSrc.match(/http:\/\/(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch) {
          console.log('Found Metro IP from script source:', ipMatch[1]);
          return ipMatch[1];
        }
      }

      // Method 4: Hardcoded fallback for known Metro IP (from logs)
      // This is a temporary fallback based on the current Metro bundler IP
      const knownMetroIP = '172.20.10.2';
      console.log('Using known Metro IP as fallback:', knownMetroIP);
      return knownMetroIP;

    } catch (error) {
      console.log('Metro IP extraction failed:', error.message);
      // Return known Metro IP as last resort
      return '172.20.10.2';
    }
  }

  // Test if a given IP can reach the backend
  static async testConnection(ip, timeout = 3000) {
    try {
      const testUrl = `http://${ip}:8080/api/status`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timeoutId);
      return response.ok || response.status < 500; // Accept any non-server-error response
    } catch (error) {
      return false;
    }
  }

  // Get the best available API base URL
  static async getApiBaseUrl() {
    // For production, use your deployed backend URL
    if (!__DEV__) {
      return 'https://your-production-api.com:8080/api';
    }

    // For web development
    if (Platform.OS === 'web') {
      return 'http://localhost:8080/api';
    }

    // For mobile development - detect the best IP
    let hostIP = this.currentIP;

    if (!hostIP) {
      hostIP = await this.detectCurrentIP();
    }

    // Fallback to Metro IP if detection fails
    if (!hostIP || hostIP === 'localhost' || hostIP === '127.0.0.1') {
      hostIP = '10.0.129.101'; // Use Metro bundler IP
      console.log('🔧 Using Metro IP as fallback:', hostIP);
    }

    console.log('🌐 Final API URL will be:', `http://${hostIP}:8080/api`);
    return `http://${hostIP}:8080/api`;
  }

  // Force refresh the IP detection (useful when network changes)
  static async refreshConnection() {
    console.log('🔄 Refreshing network connection...');
    this.currentIP = null;
    return await this.detectCurrentIP();
  }
}

// Initialize API base URL (will be set dynamically)
let API_BASE_URL_CACHE = null;

// Export dynamic API base URL getter
export const getApiBaseUrl = async () => {
  if (!API_BASE_URL_CACHE) {
    API_BASE_URL_CACHE = await ApiConfig.getApiBaseUrl();
  }
  return API_BASE_URL_CACHE;
};

// Export the API base URL (for immediate use, may need refresh)
export const API_BASE_URL = 'http://10.0.129.101:8080/api'; // Default fallback using Metro IP

// Function to refresh API URL when network changes
export const refreshApiUrl = async () => {
  API_BASE_URL_CACHE = null;
  const newUrl = await ApiConfig.refreshConnection();
  API_BASE_URL_CACHE = `http://${newUrl}:8080/api`;
  return API_BASE_URL_CACHE;
};

// Export the config class for advanced usage
export { ApiConfig };

// Export WebSocket URL (without /api suffix)
export const getWebSocketUrl = async () => {
  const baseUrl = await getApiBaseUrl();
  return baseUrl.replace('/api', '');
};

// Default WebSocket URL
export const WEBSOCKET_URL = 'http://10.0.129.101:8080';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REGISTER_MOSQUE: '/auth/register-mosque',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Mosques
  MOSQUES: {
    LIST: '/mosques',
    DETAILS: (id) => `/mosques/${id}`,
    NEARBY: '/mosques',
    SEARCH: '/mosques/search',
  },
  
  // Translation Sessions
  SESSIONS: {
    ACTIVE: '/sessions/active',
    CREATE: '/sessions',
    JOIN: (id) => `/sessions/${id}/join`,
    LEAVE: (id) => `/sessions/${id}/leave`,
    DETAILS: (id) => `/sessions/${id}`,
  },
  
  // Translations
  TRANSLATIONS: {
    LIST: '/translations',
    CREATE: '/translations',
    UPDATE: (id) => `/translations/${id}`,
    DELETE: (id) => `/translations/${id}`,
  },
  
  // User Profile
  USER: {
    PROFILE: '/user/profile',
    UPDATE: '/user/profile',
    PREFERENCES: '/user/preferences',
    FOLLOWED_MOSQUES: '/user/followed-mosques',
  },
  
  // Prayer Times
  PRAYER_TIMES: {
    GET: '/prayer-times',
    LOCATION: '/prayer-times/location',
  },
  
  // Qibla
  QIBLA: {
    DIRECTION: '/qibla/direction',
  },
  
  // Status
  STATUS: '/status',
};

// Request timeout configuration
export const REQUEST_TIMEOUT = 10000; // 10 seconds

// Default headers for API requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Helper function to build full URL
export const buildUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to get auth headers
export const getAuthHeaders = (token) => {
  return {
    ...DEFAULT_HEADERS,
    'Authorization': `Bearer ${token}`,
  };
};

export default {
  API_BASE_URL,
  WEBSOCKET_URL,
  API_ENDPOINTS,
  REQUEST_TIMEOUT,
  DEFAULT_HEADERS,
  buildUrl,
  getAuthHeaders,
};

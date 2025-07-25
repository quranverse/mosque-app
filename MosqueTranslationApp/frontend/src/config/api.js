// API Configuration for Mosque Translation App Frontend
import { Platform } from 'react-native';

// Determine the base URL based on the platform and environment
const getApiBaseUrl = () => {
  // For development
  if (__DEV__) {
    // Use the same IP as Metro bundler for consistent connectivity
    // This IP should match what you see in Metro bundler logs: "Metro waiting on exp://10.0.129.103:3000"
    const HOST_IP = '10.0.129.103';

    if (Platform.OS === 'ios') {
      // iOS Simulator - use host machine IP
      return `http://${HOST_IP}:8080/api`;
    } else if (Platform.OS === 'android') {
      // Android Emulator - use host machine IP (same as Metro bundler)
      // This should work since Metro bundler is accessible from Android emulator
      return `http://${HOST_IP}:8080/api`;
    } else {
      // Web or other platforms
      return 'http://localhost:8080/api';
    }
  }

  // For production, use your deployed backend URL
  return 'https://your-production-api.com:8080/api';
};

// Export the API base URL
export const API_BASE_URL = getApiBaseUrl();

// Export WebSocket URL (without /api suffix)
export const WEBSOCKET_URL = API_BASE_URL.replace('/api', '');

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
    NEARBY: '/mosques/nearby',
    SEARCH: '/mosques',
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

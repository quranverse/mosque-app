// API Service for Mosque Translation App
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_ENDPOINTS, REQUEST_TIMEOUT, DEFAULT_HEADERS, getAuthHeaders } from '../../config/api';
import ErrorHandler from '../../utils/ErrorHandler';

class ApiService {
  static STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
  };

  /**
   * Make a generic HTTP request
   */
  static async makeRequest(endpoint, options = {}) {
    try {
      // Safely destructure options with defaults
      const method = options.method || 'GET';
      const body = options.body || null;
      const headers = options.headers || {};
      const requiresAuth = options.requiresAuth || false;
      const timeout = options.timeout || REQUEST_TIMEOUT;

      // Build full URL
      const url = `${API_BASE_URL}${endpoint}`;

      // Prepare headers
      let requestHeaders = { ...DEFAULT_HEADERS, ...headers };

      // Add auth headers if required
      if (requiresAuth) {
        const token = await this.getAuthToken();
        if (token) {
          requestHeaders = { ...requestHeaders, ...getAuthHeaders(token) };
        }
      }

      // Prepare request options
      const requestOptions = {
        method,
        headers: requestHeaders,
        timeout,
      };

      // Add body for non-GET requests
      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      console.log(`Making ${method} request to: ${url}`);
      
      // Make the request with timeout
      const response = await Promise.race([
        fetch(url, requestOptions),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        ),
      ]);

      // Handle response
      return await this.handleResponse(response);
    } catch (error) {
      // Safely get method and url for logging
      const safeMethod = options?.method || 'GET';
      const safeUrl = `${API_BASE_URL}${endpoint}`;
      const safeBody = options?.body || null;
      const safeHeaders = options?.headers || {};

      ErrorHandler.logError(error, `API ${safeMethod} ${safeUrl}`, {
        body: safeBody,
        headers: safeHeaders
      });
      throw this.handleError(error);
    }
  }

  /**
   * Handle API response
   */
  static async handleResponse(response) {
    try {
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (error.message) {
        throw error;
      }
      throw new Error('Failed to parse response');
    }
  }

  /**
   * Handle API errors
   */
  static handleError(error) {
    const { userMessage } = ErrorHandler.handleApiError(error, 'API request');
    return new Error(userMessage);
  }

  /**
   * GET request
   */
  static async get(endpoint, options = {}) {
    return this.makeRequest(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  static async post(endpoint, body = null, options = {}) {
    return this.makeRequest(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  static async put(endpoint, body = null, options = {}) {
    return this.makeRequest(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  static async delete(endpoint, options = {}) {
    return this.makeRequest(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  static async patch(endpoint, body = null, options = {}) {
    return this.makeRequest(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * Authentication-specific methods
   */

  /**
   * Get stored auth token
   */
  static async getAuthToken() {
    try {
      return await AsyncStorage.getItem(this.STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Store auth token
   */
  static async setAuthToken(token) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.AUTH_TOKEN, token);
    } catch (error) {
      console.error('Error storing auth token:', error);
    }
  }

  /**
   * Get stored refresh token
   */
  static async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Store refresh token
   */
  static async setRefreshToken(token) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, token);
    } catch (error) {
      console.error('Error storing refresh token:', error);
    }
  }

  /**
   * Clear all auth tokens
   */
  static async clearAuthTokens() {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.AUTH_TOKEN,
        this.STORAGE_KEYS.REFRESH_TOKEN,
      ]);
    } catch (error) {
      console.error('Error clearing auth tokens:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated() {
    const token = await this.getAuthToken();
    return !!token;
  }

  /**
   * Refresh authentication token
   */
  static async refreshAuthToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.post(API_ENDPOINTS.AUTH.REFRESH, {
        refreshToken,
      });

      if (response.success && response.token) {
        await this.setAuthToken(response.token);
        if (response.refreshToken) {
          await this.setRefreshToken(response.refreshToken);
        }
        return response.token;
      }

      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Error refreshing auth token:', error);
      await this.clearAuthTokens();
      throw error;
    }
  }

  /**
   * Make authenticated request with automatic token refresh
   */
  static async makeAuthenticatedRequest(endpoint, options = {}) {
    try {
      return await this.makeRequest(endpoint, { ...options, requiresAuth: true });
    } catch (error) {
      // If unauthorized, try to refresh token and retry once
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        try {
          await this.refreshAuthToken();
          return await this.makeRequest(endpoint, { ...options, requiresAuth: true });
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          await this.clearAuthTokens();
          throw new Error('Authentication failed. Please log in again.');
        }
      }
      throw error;
    }
  }
}

export default ApiService;

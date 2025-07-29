// Enhanced API Configuration for Mosque Translation App Frontend
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Environment configuration helper
const getEnvVar = (key, defaultValue = null) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

// Parse environment variables
const ENV_CONFIG = {
  BACKEND_PORT: getEnvVar('BACKEND_PORT', '8080'),
  BACKEND_HOST: getEnvVar('BACKEND_HOST', 'auto'),
  ENABLE_AUTO_IP_DETECTION: getEnvVar('ENABLE_AUTO_IP_DETECTION', 'true') === 'true',
  FALLBACK_IPS: getEnvVar('FALLBACK_IPS', '10.0.143.126,172.20.10.2,192.168.1.1,192.168.0.1,10.0.2.2,localhost').split(','),
  CONNECTION_TIMEOUT: parseInt(getEnvVar('CONNECTION_TIMEOUT', '5000')),
  EXPO_TUNNEL_URL: getEnvVar('EXPO_TUNNEL_URL', ''),
  NGROK_URL: getEnvVar('NGROK_URL', ''),
  ENABLE_TUNNEL_MODE: getEnvVar('ENABLE_TUNNEL_MODE', 'false') === 'true',
  DEBUG_NETWORK: getEnvVar('DEBUG_NETWORK', 'true') === 'true',
  PRODUCTION_API_URL: getEnvVar('PRODUCTION_API_URL', 'https://your-production-api.com/api'),
  NODE_ENV: getEnvVar('NODE_ENV', 'development')
};

// Enhanced Dynamic IP detection with environment variable support
class ApiConfig {
  static currentIP = null;
  static detectedMetroIP = null;
  static isUsingTunnel = ENV_CONFIG.ENABLE_TUNNEL_MODE;
  static tunnelUrl = ENV_CONFIG.EXPO_TUNNEL_URL || ENV_CONFIG.NGROK_URL || null;

  // Use fallback IPs from environment variables
  static fallbackIPs = ENV_CONFIG.FALLBACK_IPS;

  static isDetecting = false;
  static detectionPromise = null;
  static lastSuccessfulIP = null;
  static networkChangeListener = null;

  // Initialize network change detection
  static initNetworkDetection() {
    if (this.networkChangeListener) return; // Already initialized

    try {
      // Listen for network changes
      this.networkChangeListener = NetInfo.addEventListener(state => {
        if (ENV_CONFIG.DEBUG_NETWORK) {
          console.log('🌐 Network state changed:', state);
        }

        // If network changed and we're not using tunnel mode, refresh IP
        if (state.isConnected && !this.isUsingTunnel && ENV_CONFIG.ENABLE_AUTO_IP_DETECTION) {
          this.handleNetworkChange();
        }
      });
    } catch (error) {
      console.log('Network detection initialization failed:', error.message);
    }
  }

  // Handle network changes
  static async handleNetworkChange() {
    if (ENV_CONFIG.DEBUG_NETWORK) {
      console.log('🔄 Network changed, refreshing IP detection...');
    }

    // Clear current IP to force re-detection
    this.currentIP = null;
    this.detectedMetroIP = null;

    // Wait a bit for network to stabilize
    setTimeout(async () => {
      await this.detectCurrentIP();
    }, 2000);
  }

  // Check if we're using tunnel mode from environment or auto-detection
  static detectTunnelMode() {
    try {
      // First check environment variables
      if (ENV_CONFIG.EXPO_TUNNEL_URL) {
        console.log('🚇 Using Expo tunnel from environment:', ENV_CONFIG.EXPO_TUNNEL_URL);
        this.isUsingTunnel = true;
        this.tunnelUrl = ENV_CONFIG.EXPO_TUNNEL_URL;
        return ENV_CONFIG.EXPO_TUNNEL_URL;
      }

      if (ENV_CONFIG.NGROK_URL) {
        console.log('🚇 Using ngrok tunnel from environment:', ENV_CONFIG.NGROK_URL);
        this.isUsingTunnel = true;
        this.tunnelUrl = ENV_CONFIG.NGROK_URL;
        return ENV_CONFIG.NGROK_URL;
      }

      // Auto-detect tunnel mode if enabled
      if (typeof global !== 'undefined') {
        const possibleSources = [
          global.__EXPO_TUNNEL_URL__,
          global.location?.href,
          global.window?.location?.href,
        ];

        for (const source of possibleSources) {
          if (source && typeof source === 'string') {
            const tunnelMatch = source.match(/https:\/\/([^\/]+\.(exp\.direct|ngrok\.io|tunnelmole\.com))/);
            if (tunnelMatch) {
              console.log('🚇 Auto-detected tunnel mode:', tunnelMatch[1]);
              this.isUsingTunnel = true;
              this.tunnelUrl = tunnelMatch[1];
              return tunnelMatch[1];
            }
          }
        }
      }

    } catch (error) {
      console.log('Tunnel detection failed:', error.message);
    }

    return null;
  }

  // Enhanced Metro IP detection with environment variable support
  static extractMetroIP() {
    try {
      // Check if host is specified in environment
      if (ENV_CONFIG.BACKEND_HOST !== 'auto') {
        console.log('📱 Using backend host from environment:', ENV_CONFIG.BACKEND_HOST);
        this.detectedMetroIP = ENV_CONFIG.BACKEND_HOST;
        return ENV_CONFIG.BACKEND_HOST;
      }

      // First check if we detected Metro IP before
      if (this.detectedMetroIP) {
        return this.detectedMetroIP;
      }

      // Method 1: Extract from React Native bundle URL
      if (Platform.OS !== 'web') {
        try {
          // Try to get the current script/bundle source
          const errorStack = new Error().stack;
          if (errorStack) {
            const ipMatch = errorStack.match(/https?:\/\/(\d+\.\d+\.\d+\.\d+):\d+/);
            if (ipMatch && ipMatch[1]) {
              if (ENV_CONFIG.DEBUG_NETWORK) {
                console.log('📱 Found Metro IP from bundle URL:', ipMatch[1]);
              }
              this.detectedMetroIP = ipMatch[1];
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
            if (ENV_CONFIG.DEBUG_NETWORK) {
              console.log('📱 Found Metro IP from global.location:', hostname);
            }
            this.detectedMetroIP = hostname;
            return hostname;
          }
        }
      }

      // Method 2: Use first fallback IP as default
      const defaultIP = ENV_CONFIG.FALLBACK_IPS[0];
      if (ENV_CONFIG.DEBUG_NETWORK) {
        console.log('📱 Using default IP from fallbacks:', defaultIP);
      }
      this.detectedMetroIP = defaultIP;
      return defaultIP;

    } catch (error) {
      console.log('Metro IP extraction failed:', error.message);
      // Return first fallback IP
      return ENV_CONFIG.FALLBACK_IPS[0];
    }
  }

  // Enhanced connection testing with environment variable support
  static async testConnection(ip, timeout = ENV_CONFIG.CONNECTION_TIMEOUT) {
    const port = ENV_CONFIG.BACKEND_PORT;
    const testEndpoints = [
      { url: `http://${ip}:${port}/api/status`, desc: 'API Status' },
      { url: `http://${ip}:${port}/`, desc: 'Root' },
      { url: `http://${ip}:${port}/actuator/health`, desc: 'Health Check' },
    ];

    for (const endpoint of testEndpoints) {
      try {
        if (ENV_CONFIG.DEBUG_NETWORK) {
          console.log(`🔍 Testing ${endpoint.desc} at ${endpoint.url}`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(endpoint.url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'User-Agent': 'MosqueTranslationApp/1.0'
          }
        });

        clearTimeout(timeoutId);

        if (response.ok || response.status < 500) {
          if (ENV_CONFIG.DEBUG_NETWORK) {
            console.log(`✅ Connection successful to ${endpoint.desc} (${response.status})`);
          }
          return true;
        }
      } catch (error) {
        if (ENV_CONFIG.DEBUG_NETWORK) {
          console.log(`❌ Failed to connect to ${endpoint.desc}: ${error.message}`);
        }

        // For public WiFi, sometimes HEAD requests are blocked, try GET as fallback
        if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
          try {
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), timeout);

            const response2 = await fetch(endpoint.url, {
              method: 'GET',
              signal: controller2.signal,
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'User-Agent': 'MosqueTranslationApp/1.0'
              }
            });

            clearTimeout(timeoutId2);

            if (response2.ok || response2.status < 500) {
              if (ENV_CONFIG.DEBUG_NETWORK) {
                console.log(`✅ Connection successful to ${endpoint.desc} via GET fallback (${response2.status})`);
              }
              return true;
            }
          } catch (fallbackError) {
            if (ENV_CONFIG.DEBUG_NETWORK) {
              console.log(`❌ GET fallback also failed for ${endpoint.desc}: ${fallbackError.message}`);
            }
          }
        }
      }
    }

    return false;
  }

  // Enhanced detection with tunnel support and environment variables
  static async detectCurrentIP() {
    // Initialize network detection if not already done
    this.initNetworkDetection();

    // Skip detection if disabled in environment
    if (!ENV_CONFIG.ENABLE_AUTO_IP_DETECTION) {
      const staticHost = ENV_CONFIG.BACKEND_HOST !== 'auto' ? ENV_CONFIG.BACKEND_HOST : ENV_CONFIG.FALLBACK_IPS[0];
      if (ENV_CONFIG.DEBUG_NETWORK) {
        console.log('🔧 Auto IP detection disabled, using static host:', staticHost);
      }
      this.currentIP = staticHost;
      return staticHost;
    }

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
      // Method 1: Check for tunnel mode first (best for public Wi-Fi)
      const tunnelUrl = this.detectTunnelMode();
      if (tunnelUrl) {
        console.log('🚇 Using tunnel mode - bypassing IP detection');
        this.currentIP = tunnelUrl;
        return tunnelUrl;
      }

      // Method 2: Try last successful IP first (cache hit)
      if (this.lastSuccessfulIP) {
        console.log('🔄 Testing last successful IP:', this.lastSuccessfulIP);
        if (await this.testConnection(this.lastSuccessfulIP)) {
          console.log('✅ Last successful IP still works:', this.lastSuccessfulIP);
          this.currentIP = this.lastSuccessfulIP;
          return this.lastSuccessfulIP;
        }
      }

      // Method 3: Extract and test Metro IP (most reliable for development)
      const metroIP = this.extractMetroIP();
      if (metroIP) {
        console.log('🔍 Testing Metro bundler IP:', metroIP);
        if (await this.testConnection(metroIP)) {
          console.log('✅ Metro IP connection successful:', metroIP);
          this.currentIP = metroIP;
          this.lastSuccessfulIP = metroIP;
          return metroIP;
        } else {
          console.log('⚠️ Metro IP not reachable - likely public Wi-Fi isolation');
        }
      }

      // Method 4: Test all fallback IPs
      console.log('🔍 Testing fallback IPs for backend connection...');
      for (const ip of this.fallbackIPs) {
        if (ip === metroIP) continue; // Already tested
        
        console.log(`🧪 Testing fallback IP: ${ip}`);
        if (await this.testConnection(ip)) {
          console.log('✅ Fallback IP successful:', ip);
          this.currentIP = ip;
          this.lastSuccessfulIP = ip;
          return ip;
        }
      }

      // Method 5: For mobile development on public Wi-Fi, suggest tunnel mode
      if (Platform.OS !== 'web') {
        console.log('⚠️ No backend connection found on public Wi-Fi');
        console.log('💡 Consider using: expo start --tunnel');
        console.log('💡 Or use ngrok: ngrok http 8080');
        
        // Return Metro IP anyway for development
        if (metroIP) {
          console.log('📱 Using Metro IP despite no backend connection:', metroIP);
          this.currentIP = metroIP;
          return metroIP;
        }
      }

      // Method 6: Last resort
      console.log('⚠️ No working connection found, using localhost');
      this.currentIP = 'localhost';
      return 'localhost';

    } catch (error) {
      console.error('IP detection failed:', error);
      // Return Metro IP or localhost as fallback
      const fallbackIP = Platform.OS !== 'web' ? '10.0.143.126' : 'localhost';
      console.log('Using fallback IP:', fallbackIP);
      this.currentIP = fallbackIP;
      return fallbackIP;
    }
  }

  // Get the best available API base URL with environment variable support
  static async getApiBaseUrl() {
    // For production, use environment variable
    if (ENV_CONFIG.NODE_ENV === 'production' || !__DEV__) {
      return ENV_CONFIG.PRODUCTION_API_URL;
    }

    // Check for tunnel mode first
    const tunnelUrl = this.detectTunnelMode();
    if (tunnelUrl) {
      if (tunnelUrl.includes('exp.direct')) {
        console.log('⚠️ Expo tunnel detected - ensure backend is also tunneled');
        return `https://${tunnelUrl}/api`;
      } else if (tunnelUrl.includes('ngrok.io') || tunnelUrl.includes('tunnelmole.com')) {
        return `https://${tunnelUrl}/api`;
      }
    }

    // For web development
    if (Platform.OS === 'web') {
      return `http://localhost:${ENV_CONFIG.BACKEND_PORT}/api`;
    }

    // For mobile development - detect the best IP
    let hostIP = this.currentIP;

    if (!hostIP) {
      hostIP = await this.detectCurrentIP();
    }

    // Handle tunnel URLs
    if (hostIP && (hostIP.includes('.exp.direct') || hostIP.includes('.ngrok.io') || hostIP.includes('.tunnelmole.com'))) {
      return `https://${hostIP}/api`;
    }

    // Handle regular IPs
    if (!hostIP || hostIP === 'localhost' || hostIP === '127.0.0.1') {
      hostIP = ENV_CONFIG.FALLBACK_IPS[0];
      if (ENV_CONFIG.DEBUG_NETWORK) {
        console.log('🔧 Using fallback IP:', hostIP);
      }
    }

    const finalUrl = `http://${hostIP}:${ENV_CONFIG.BACKEND_PORT}/api`;
    if (ENV_CONFIG.DEBUG_NETWORK) {
      console.log('🌐 Final API URL:', finalUrl);
    }
    return finalUrl;
  }

  // Check network connectivity and suggest solutions
  static async diagnoseConnection() {
    console.log('🔍 Diagnosing network connection...');
    
    // Test Metro bundler connection
    const metroIP = this.extractMetroIP();
    const metroConnected = metroIP ? await this.testConnection(metroIP, 3000) : false;
    
    console.log(`📱 Metro bundler (${metroIP}): ${metroConnected ? '✅ Connected' : '❌ Not reachable'}`);
    
    if (!metroConnected && Platform.OS !== 'web') {
      console.log('💡 Troubleshooting suggestions:');
      console.log('   1. Try: expo start --tunnel');
      console.log('   2. Try: ngrok http 8080 (for backend)');
      console.log('   3. Use personal hotspot instead of public Wi-Fi');
      console.log('   4. Check if devices are on same network');
    }
    
    return {
      metroIP,
      metroConnected,
      currentIP: this.currentIP,
      isUsingTunnel: this.isUsingTunnel,
      tunnelUrl: this.tunnelUrl
    };
  }

  // Force refresh with enhanced diagnostics
  static async refreshConnection() {
    if (ENV_CONFIG.DEBUG_NETWORK) {
      console.log('🔄 Refreshing network connection...');
    }
    this.currentIP = null;
    this.lastSuccessfulIP = null;
    this.detectedMetroIP = null;

    // Run diagnostics
    await this.diagnoseConnection();

    return await this.detectCurrentIP();
  }

  // Cleanup network listener
  static cleanup() {
    if (this.networkChangeListener) {
      this.networkChangeListener();
      this.networkChangeListener = null;
    }
  }

  // Get current configuration for debugging
  static getConfig() {
    return {
      ...ENV_CONFIG,
      currentIP: this.currentIP,
      detectedMetroIP: this.detectedMetroIP,
      isUsingTunnel: this.isUsingTunnel,
      tunnelUrl: this.tunnelUrl,
      lastSuccessfulIP: this.lastSuccessfulIP
    };
  }
}

// Enhanced API configuration with better caching and fallbacks
let API_BASE_URL_CACHE = null;
let WEBSOCKET_URL_CACHE = null;

// Export dynamic API base URL getter with tunnel support
export const getApiBaseUrl = async () => {
  if (!API_BASE_URL_CACHE) {
    API_BASE_URL_CACHE = await ApiConfig.getApiBaseUrl();
  }
  return API_BASE_URL_CACHE;
};

// Export WebSocket URL with tunnel support
export const getWebSocketUrl = async () => {
  if (!WEBSOCKET_URL_CACHE) {
    const baseUrl = await getApiBaseUrl();
    // Convert HTTP to WebSocket protocol
    WEBSOCKET_URL_CACHE = baseUrl
      .replace('/api', '')
      .replace('http://', 'ws://')
      .replace('https://', 'wss://');
  }
  return WEBSOCKET_URL_CACHE;
};

// Function to refresh API URL when network changes with diagnostics
export const refreshApiUrl = async () => {
  API_BASE_URL_CACHE = null;
  WEBSOCKET_URL_CACHE = null;
  
  const diagnostics = await ApiConfig.diagnoseConnection();
  console.log('📊 Network diagnostics:', diagnostics);
  
  const newIP = await ApiConfig.refreshConnection();
  API_BASE_URL_CACHE = newIP.includes('http') ? `${newIP}/api` : `http://${newIP}:8080/api`;
  
  return API_BASE_URL_CACHE;
};

// Enhanced tunnel support function
export const setupTunnelMode = (tunnelUrl) => {
  console.log('🚇 Setting up tunnel mode:', tunnelUrl);
  ApiConfig.isUsingTunnel = true;
  ApiConfig.tunnelUrl = tunnelUrl;
  ApiConfig.currentIP = tunnelUrl;
  
  // Clear caches to force refresh
  API_BASE_URL_CACHE = null;
  WEBSOCKET_URL_CACHE = null;
};

// Network troubleshooting helper
export const troubleshootConnection = async () => {
  console.log('🛠️ Running connection troubleshooting...');
  return await ApiConfig.diagnoseConnection();
};

// Public WiFi specific troubleshooting
export const troubleshootPublicWiFi = async () => {
  console.log('🏢 Running public WiFi troubleshooting...');

  const diagnostics = await ApiConfig.diagnoseConnection();

  if (!diagnostics.metroConnected) {
    console.log('📋 Public WiFi Troubleshooting Steps:');
    console.log(`   1. 🚇 Use tunnel mode: expo start --tunnel`);
    console.log(`   2. 🌐 Use ngrok for backend: ngrok http ${ENV_CONFIG.BACKEND_PORT}`);
    console.log('   3. 📱 Try personal hotspot instead');
    console.log('   4. 🔧 Check firewall/antivirus settings');
    console.log('   5. 🌍 Verify both devices on same network');
    console.log('   6. 🔄 Restart Metro bundler: expo start --clear');

    // Test if it's a captive portal issue
    try {
      const response = await fetch('http://detectportal.firefox.com/canonical.html', {
        method: 'GET',
        timeout: ENV_CONFIG.CONNECTION_TIMEOUT
      });

      if (response.status === 200) {
        const text = await response.text();
        if (!text.includes('success')) {
          console.log('   ⚠️ Captive portal detected - complete WiFi login first');
        }
      }
    } catch (error) {
      console.log('   ⚠️ Possible captive portal or restricted network');
    }
  }

  return diagnostics;
};

// Export environment configuration for debugging
export const getEnvironmentConfig = () => ENV_CONFIG;

// Update environment configuration at runtime
export const updateEnvironmentConfig = (updates) => {
  Object.assign(ENV_CONFIG, updates);

  // Clear caches to force refresh
  API_BASE_URL_CACHE = null;
  WEBSOCKET_URL_CACHE = null;

  // Reset API config
  ApiConfig.currentIP = null;
  ApiConfig.detectedMetroIP = null;

  if (ENV_CONFIG.DEBUG_NETWORK) {
    console.log('🔧 Environment configuration updated:', updates);
  }
};

// Default exports using environment variables (will be updated dynamically)
const defaultHost = ENV_CONFIG.BACKEND_HOST !== 'auto' ? ENV_CONFIG.BACKEND_HOST : ENV_CONFIG.FALLBACK_IPS[0];
export const API_BASE_URL = `http://${defaultHost}:${ENV_CONFIG.BACKEND_PORT}/api`;
export const WEBSOCKET_URL = `http://${defaultHost}:${ENV_CONFIG.BACKEND_PORT}`;

// Export the enhanced config class
export { ApiConfig };

// Keep existing endpoint configurations
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
  
  // Status & Health
  STATUS: '/status',
  HEALTH: '/actuator/health', // Spring Boot health check
};

// Enhanced request configuration
export const REQUEST_TIMEOUT = 15000; // Increased for public Wi-Fi
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Cache-Control': 'no-cache', // Prevent caching issues on public Wi-Fi
  'User-Agent': 'MosqueTranslationApp/1.0', // Add user agent for better compatibility
  'X-Requested-With': 'XMLHttpRequest', // Help with CORS on some public WiFi
};

// Helper functions remain the same
export const buildUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

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
  getApiBaseUrl,
  getWebSocketUrl,
  refreshApiUrl,
  setupTunnelMode,
  troubleshootConnection,
  troubleshootPublicWiFi,
  getEnvironmentConfig,
  updateEnvironmentConfig,
  ApiConfig,
  ENV_CONFIG,
};
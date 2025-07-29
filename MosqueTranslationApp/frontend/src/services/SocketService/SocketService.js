// Global Socket Service for handling real-time notifications and updates
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../NotificationService/NotificationService';
import AuthService from '../AuthService/AuthService';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
    this.isInitialized = false;
  }

  // Initialize global socket connection
  async initialize() {
    if (this.isInitialized) {
      return this.socket;
    }

    try {
      // Try to get the current API URL from the config
      let baseUrl = 'http://10.0.129.101:8080/api'; // fallback with Metro IP

      try {
        // Try to get the dynamic API URL
        const { getApiBaseUrl } = await import('../../config/api');
        baseUrl = await getApiBaseUrl();
        console.log('🔍 Got API URL from config:', baseUrl);
      } catch (configError) {
        console.warn('Could not get API URL from config, using fallback:', configError.message);

        // Try to import from ApiService as backup
        try {
          const { API_BASE_URL } = await import('../ApiService/ApiService');
          if (API_BASE_URL) {
            baseUrl = API_BASE_URL;
            console.log('🔍 Got API URL from ApiService:', baseUrl);
          }
        } catch (serviceError) {
          console.warn('Could not import from ApiService either, using fallback URL');
        }
      }

      const socketUrl = baseUrl.replace('/api', '');
      console.log('🌐 Initializing global socket connection:', socketUrl);

      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 60000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        forceNew: false,
      });

      this.setupEventListeners();
      this.isInitialized = true;

      return this.socket;
    } catch (error) {
      console.error('❌ Failed to initialize socket service:', error);
      console.error('Error details:', error.message);

      // Don't throw error to prevent app crash, just log it
      this.isInitialized = false;
      return null;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Global socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.authenticateSocket();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Global socket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Global socket connection error:', error);
      this.reconnectAttempts++;
    });

    // Broadcast notification events
    this.socket.on('mosque_broadcast_notification', (data) => {
      console.log('📢 Received broadcast notification:', data);
      this.handleBroadcastNotification(data);
    });

    this.socket.on('broadcast_started', (data) => {
      console.log('🔴 Broadcast started:', data);
      this.handleBroadcastStarted(data);
    });

    this.socket.on('broadcast_ended', (data) => {
      console.log('⏹️ Broadcast ended:', data);
      this.handleBroadcastEnded(data);
    });

    // Session events
    this.socket.on('session_started', (data) => {
      console.log('🎬 Session started:', data);
      this.emitToListeners('session_started', data);
    });

    this.socket.on('session_ended', (data) => {
      console.log('🎬 Session ended:', data);
      this.emitToListeners('session_ended', data);
    });

    // Voice transcription events
    this.socket.on('voice_transcription', (data) => {
      console.log('📝 Voice transcription received:', data);
      this.emitToListeners('voice_transcription', data);
    });

    // Translation events
    this.socket.on('translation_update', (data) => {
      console.log('🔄 Translation update:', data);
      this.emitToListeners('translation_update', data);
    });
  }

  async authenticateSocket() {
    try {
      // Use the same key as AuthService
      let token = await AsyncStorage.getItem('user_token');
      console.log('🔐 Authenticating socket with token:', token ? 'Token present' : 'No token');

      if (token && this.socket) {
        this.socket.emit('authenticate', { token }, async (response) => {
          console.log('🔐 Socket authentication response:', response);
          if (response && response.success) {
            console.log('✅ Global socket authenticated as:', response.userType);
          } else {
            console.error('❌ Global socket authentication failed:', response);

            // Try to refresh token if authentication failed
            if (response && response.error && response.error.includes('Authentication failed')) {
              console.log('🔄 Attempting to refresh token...');
              try {
                const ApiService = await import('../ApiService/ApiService');
                const newToken = await ApiService.default.refreshAuthToken();

                if (newToken) {
                  console.log('✅ Token refreshed, retrying socket authentication...');
                  // Retry authentication with new token
                  this.socket.emit('authenticate', { token: newToken }, (retryResponse) => {
                    console.log('🔐 Socket authentication retry response:', retryResponse);
                    if (retryResponse && retryResponse.success) {
                      console.log('✅ Global socket authenticated after token refresh as:', retryResponse.userType);
                    } else {
                      console.error('❌ Socket authentication still failed after token refresh:', retryResponse);
                    }
                  });
                }
              } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError);
              }
            }
          }
        });
      } else {
        console.warn('⚠️ No token available for socket authentication');
      }
    } catch (error) {
      console.error('❌ Error authenticating socket:', error);
    }
  }

  async handleBroadcastNotification(data) {
    try {
      // Check if user follows this mosque
      const followedMosques = await AuthService.getFollowedMosques();
      const isFollowing = followedMosques.some(mosque => mosque.id === data.mosqueId);

      if (isFollowing) {
        // Send push notification
        await NotificationService.handleBroadcastNotificationFromSocket(data);
        
        // Emit to any listening components
        this.emitToListeners('broadcast_notification', data);
      }
    } catch (error) {
      console.error('❌ Error handling broadcast notification:', error);
    }
  }

  async handleBroadcastStarted(data) {
    try {
      // Check if user follows this mosque
      const followedMosques = await AuthService.getFollowedMosques();
      const isFollowing = followedMosques.some(mosque => mosque.id === data.mosqueId);

      if (isFollowing) {
        // Send live broadcast notification
        await NotificationService.sendLiveBroadcastNotification(
          data.mosqueName, 
          data.language, 
          data.mosqueId
        );
      }

      // Emit to listening components (like LiveBroadcastList)
      this.emitToListeners('broadcast_started', data);
    } catch (error) {
      console.error('❌ Error handling broadcast started:', error);
    }
  }

  handleBroadcastEnded(data) {
    // Emit to listening components
    this.emitToListeners('broadcast_ended', data);
  }

  // Event listener management
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  removeEventListener(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  emitToListeners(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Socket operations
  emit(event, data, callback) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data, callback);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check connection status
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Manually refresh socket authentication
  async refreshAuthentication() {
    try {
      console.log('🔄 Manually refreshing socket authentication...');
      await this.authenticateSocket();
      return true;
    } catch (error) {
      console.error('❌ Error refreshing socket authentication:', error);
      return false;
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isInitialized = false;
    }
  }

  // Reconnect socket
  async reconnect() {
    this.disconnect();
    await this.initialize();
  }
}

// Export singleton instance
export default new SocketService();

// Network Service for handling network changes and connectivity
import NetInfo from '@react-native-community/netinfo';
import { refreshApiUrl } from '../../config/api';

class NetworkService {
  static listeners = [];
  static isListening = false;
  static currentNetworkState = null;

  /**
   * Start listening for network changes
   */
  static startListening() {
    if (this.isListening) {
      return;
    }

    console.log('🌐 Starting network monitoring...');
    this.isListening = true;

    // Listen for network state changes
    this.unsubscribe = NetInfo.addEventListener(state => {
      this.handleNetworkChange(state);
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      this.currentNetworkState = state;
      console.log('📡 Initial network state:', {
        type: state.type,
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        details: state.details
      });
    });
  }

  /**
   * Stop listening for network changes
   */
  static stopListening() {
    if (!this.isListening) {
      return;
    }

    console.log('🌐 Stopping network monitoring...');
    this.isListening = false;

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Handle network state changes
   */
  static async handleNetworkChange(newState) {
    const previousState = this.currentNetworkState;
    this.currentNetworkState = newState;

    console.log('🔄 Network state changed:', {
      type: newState.type,
      isConnected: newState.isConnected,
      isInternetReachable: newState.isInternetReachable,
      details: newState.details
    });

    // Check if this is a significant network change
    const isSignificantChange = this.isSignificantNetworkChange(previousState, newState);

    if (isSignificantChange) {
      console.log('🔄 Significant network change detected, refreshing API connection...');
      
      try {
        // Wait a moment for the network to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh the API URL
        const newApiUrl = await refreshApiUrl();
        console.log('✅ API connection refreshed:', newApiUrl);

        // Notify listeners
        this.notifyListeners('network_changed', {
          previousState,
          newState,
          newApiUrl
        });

      } catch (error) {
        console.error('❌ Failed to refresh API connection:', error);
        this.notifyListeners('network_error', {
          error,
          previousState,
          newState
        });
      }
    }
  }

  /**
   * Check if a network change is significant enough to refresh connections
   */
  static isSignificantNetworkChange(previousState, newState) {
    if (!previousState) {
      return false; // First time, not a change
    }

    // Connection status changed
    if (previousState.isConnected !== newState.isConnected) {
      return true;
    }

    // Internet reachability changed
    if (previousState.isInternetReachable !== newState.isInternetReachable) {
      return true;
    }

    // Network type changed (WiFi to cellular, etc.)
    if (previousState.type !== newState.type) {
      return true;
    }

    // IP address changed (for WiFi connections)
    if (newState.type === 'wifi' && previousState.type === 'wifi') {
      const prevIP = previousState.details?.ipAddress;
      const newIP = newState.details?.ipAddress;
      
      if (prevIP && newIP && prevIP !== newIP) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add a listener for network events
   */
  static addListener(callback) {
    this.listeners.push(callback);
    
    // Start listening if this is the first listener
    if (this.listeners.length === 1) {
      this.startListening();
    }

    // Return unsubscribe function
    return () => {
      this.removeListener(callback);
    };
  }

  /**
   * Remove a listener
   */
  static removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }

    // Stop listening if no more listeners
    if (this.listeners.length === 0) {
      this.stopListening();
    }
  }

  /**
   * Notify all listeners of an event
   */
  static notifyListeners(eventType, data) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Get current network state
   */
  static getCurrentNetworkState() {
    return this.currentNetworkState;
  }

  /**
   * Check if currently connected to internet
   */
  static isConnected() {
    return this.currentNetworkState?.isConnected && this.currentNetworkState?.isInternetReachable;
  }

  /**
   * Force refresh network state and API connection
   */
  static async forceRefresh() {
    console.log('🔄 Force refreshing network state...');
    
    try {
      const newState = await NetInfo.fetch();
      await this.handleNetworkChange(newState);
      return true;
    } catch (error) {
      console.error('Failed to force refresh network state:', error);
      return false;
    }
  }
}

export default NetworkService;

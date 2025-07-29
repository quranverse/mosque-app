// Example usage of the enhanced API configuration
import { 
  getApiBaseUrl, 
  refreshApiUrl, 
  troubleshootConnection,
  getEnvironmentConfig,
  updateEnvironmentConfig,
  ApiConfig 
} from './api.js';

// Example 1: Basic usage - get API URL
export const exampleBasicUsage = async () => {
  try {
    const apiUrl = await getApiBaseUrl();
    console.log('Current API URL:', apiUrl);
    
    // Make API call
    const response = await fetch(`${apiUrl}/status`);
    const data = await response.json();
    console.log('API Status:', data);
  } catch (error) {
    console.error('API call failed:', error);
  }
};

// Example 2: Handle network changes
export const exampleNetworkChangeHandling = async () => {
  try {
    // Refresh connection when network changes
    const newApiUrl = await refreshApiUrl();
    console.log('Refreshed API URL:', newApiUrl);
  } catch (error) {
    console.error('Network refresh failed:', error);
  }
};

// Example 3: Troubleshoot connection issues
export const exampleTroubleshooting = async () => {
  try {
    const diagnostics = await troubleshootConnection();
    console.log('Network diagnostics:', diagnostics);
    
    if (!diagnostics.metroConnected) {
      console.log('Connection issues detected. Consider using tunnel mode.');
    }
  } catch (error) {
    console.error('Troubleshooting failed:', error);
  }
};

// Example 4: Update configuration at runtime
export const exampleConfigUpdate = () => {
  // Get current config
  const currentConfig = getEnvironmentConfig();
  console.log('Current config:', currentConfig);
  
  // Update configuration
  updateEnvironmentConfig({
    BACKEND_HOST: '192.168.1.100',
    DEBUG_NETWORK: false,
    CONNECTION_TIMEOUT: 10000
  });
  
  console.log('Configuration updated');
};

// Example 5: Manual IP detection
export const exampleManualDetection = async () => {
  try {
    const detectedIP = await ApiConfig.detectCurrentIP();
    console.log('Detected IP:', detectedIP);
    
    // Get full configuration for debugging
    const config = ApiConfig.getConfig();
    console.log('Full API config:', config);
  } catch (error) {
    console.error('IP detection failed:', error);
  }
};

// Example 6: Setup tunnel mode
export const exampleTunnelSetup = () => {
  // For Expo tunnel
  updateEnvironmentConfig({
    EXPO_TUNNEL_URL: 'https://abc123.exp.direct',
    ENABLE_TUNNEL_MODE: true
  });
  
  // Or for ngrok
  updateEnvironmentConfig({
    NGROK_URL: 'https://abc123.ngrok.io',
    ENABLE_TUNNEL_MODE: true
  });
  
  console.log('Tunnel mode configured');
};

// Test script for API configuration
import { 
  getApiBaseUrl, 
  getWebSocketUrl,
  refreshApiUrl,
  troubleshootConnection,
  getEnvironmentConfig,
  ApiConfig 
} from './api.js';

// Test function to verify API configuration
export const testApiConfiguration = async () => {
  console.log('🧪 Testing API Configuration...\n');

  try {
    // Test 1: Environment Configuration
    console.log('1️⃣ Environment Configuration:');
    const envConfig = getEnvironmentConfig();
    console.log('   Backend Port:', envConfig.BACKEND_PORT);
    console.log('   Backend Host:', envConfig.BACKEND_HOST);
    console.log('   Auto Detection:', envConfig.ENABLE_AUTO_IP_DETECTION);
    console.log('   Fallback IPs:', envConfig.FALLBACK_IPS.join(', '));
    console.log('   Debug Mode:', envConfig.DEBUG_NETWORK);
    console.log('');

    // Test 2: IP Detection
    console.log('2️⃣ IP Detection:');
    const detectedIP = await ApiConfig.detectCurrentIP();
    console.log('   Detected IP:', detectedIP);
    console.log('   Current IP:', ApiConfig.currentIP);
    console.log('   Metro IP:', ApiConfig.detectedMetroIP);
    console.log('   Using Tunnel:', ApiConfig.isUsingTunnel);
    console.log('');

    // Test 3: API URLs
    console.log('3️⃣ API URLs:');
    const apiUrl = await getApiBaseUrl();
    const wsUrl = await getWebSocketUrl();
    console.log('   API Base URL:', apiUrl);
    console.log('   WebSocket URL:', wsUrl);
    console.log('');

    // Test 4: Connection Test
    console.log('4️⃣ Connection Test:');
    const isConnected = await ApiConfig.testConnection(detectedIP);
    console.log('   Backend Connected:', isConnected ? '✅ Yes' : '❌ No');
    console.log('');

    // Test 5: Diagnostics
    console.log('5️⃣ Network Diagnostics:');
    const diagnostics = await troubleshootConnection();
    console.log('   Metro Connected:', diagnostics.metroConnected ? '✅ Yes' : '❌ No');
    console.log('   Current IP:', diagnostics.currentIP);
    console.log('   Tunnel Mode:', diagnostics.isUsingTunnel ? '✅ Yes' : '❌ No');
    console.log('');

    // Test 6: Full Configuration
    console.log('6️⃣ Full Configuration:');
    const fullConfig = ApiConfig.getConfig();
    console.log('   Full Config:', JSON.stringify(fullConfig, null, 2));

    console.log('✅ API Configuration test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ API Configuration test failed:', error);
    return false;
  }
};

// Quick connection test
export const quickConnectionTest = async () => {
  try {
    const apiUrl = await getApiBaseUrl();
    console.log('🔍 Testing connection to:', apiUrl);

    const response = await fetch(`${apiUrl}/status`, {
      method: 'HEAD',
      timeout: 5000
    });

    if (response.ok) {
      console.log('✅ Backend is reachable!');
      return true;
    } else {
      console.log('⚠️ Backend responded with status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error.message);
    return false;
  }
};

// Test network change simulation
export const testNetworkChange = async () => {
  console.log('🔄 Simulating network change...');
  
  // Clear current IP to simulate network change
  ApiConfig.currentIP = null;
  ApiConfig.detectedMetroIP = null;
  
  // Trigger re-detection
  const newIP = await ApiConfig.detectCurrentIP();
  console.log('🌐 New IP detected:', newIP);
  
  // Refresh API URL
  const newApiUrl = await refreshApiUrl();
  console.log('🔗 New API URL:', newApiUrl);
  
  return newApiUrl;
};

// Export test runner
export const runAllTests = async () => {
  console.log('🚀 Running all API configuration tests...\n');
  
  const results = {
    configuration: await testApiConfiguration(),
    connection: await quickConnectionTest(),
    networkChange: await testNetworkChange()
  };
  
  console.log('\n📊 Test Results:');
  console.log('   Configuration Test:', results.configuration ? '✅ PASS' : '❌ FAIL');
  console.log('   Connection Test:', results.connection ? '✅ PASS' : '❌ FAIL');
  console.log('   Network Change Test:', results.networkChange ? '✅ PASS' : '❌ FAIL');
  
  return results;
};

// Connection Test Utility
import { API_BASE_URL } from '../config/api';

export const ConnectionTest = {
  async testApiConnection() {
    try {
      console.log('Testing API connection to:', API_BASE_URL);
      
      const response = await fetch(`${API_BASE_URL}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Connection successful:', data);
      
      return {
        success: true,
        data,
        message: 'API connection successful'
      };
    } catch (error) {
      console.error('❌ API Connection failed:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'API connection failed'
      };
    }
  },

  async testWebSocketConnection() {
    try {
      const wsUrl = API_BASE_URL.replace('/api', '').replace('http', 'ws');
      console.log('Testing WebSocket connection to:', wsUrl);
      
      return new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            success: false,
            error: 'Connection timeout',
            message: 'WebSocket connection timed out'
          });
        }, 10000);

        ws.onopen = () => {
          console.log('✅ WebSocket connection successful');
          clearTimeout(timeout);
          ws.close();
          resolve({
            success: true,
            message: 'WebSocket connection successful'
          });
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket connection failed:', error);
          clearTimeout(timeout);
          resolve({
            success: false,
            error: error.message || 'WebSocket connection failed',
            message: 'WebSocket connection failed'
          });
        };
      });
    } catch (error) {
      console.error('❌ WebSocket test error:', error);
      return {
        success: false,
        error: error.message,
        message: 'WebSocket test failed'
      };
    }
  },

  async runFullConnectionTest() {
    console.log('🔍 Running full connection test...');
    
    const results = {
      api: await this.testApiConnection(),
      websocket: await this.testWebSocketConnection(),
    };

    console.log('📊 Connection test results:', results);
    
    return {
      success: results.api.success && results.websocket.success,
      results,
      summary: {
        api: results.api.success ? '✅ Working' : '❌ Failed',
        websocket: results.websocket.success ? '✅ Working' : '❌ Failed',
      }
    };
  }
};

export default ConnectionTest;

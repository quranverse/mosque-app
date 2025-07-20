// Simple test script for authentication endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testAuthEndpoints() {
  console.log('🧪 Testing Authentication Endpoints...\n');
  
  try {
    // Test server status
    console.log('1. Testing server status...');
    const statusResponse = await axios.get(`${BASE_URL}/status`);
    console.log('✅ Server status:', statusResponse.data.status);
    console.log('   Features:', statusResponse.data.features);
    
    // Test mosque registration
    console.log('\n2. Testing mosque registration...');
    const mosqueData = {
      email: 'test@testmosque.com',
      password: 'password123',
      userType: 'mosque',
      mosqueName: 'Test Mosque',
      mosqueAddress: '123 Test Street, Test City',
      latitude: 40.7128,
      longitude: -74.0060,
      madhab: 'Hanafi',
      prayerTimeMethod: 'MoonsightingCommittee',
      servicesOffered: ['Live Translation', 'Friday Speeches'],
      languagesSupported: ['Arabic', 'English'],
      capacity: 200,
      facilities: ['Parking', 'Wheelchair Access']
    };
    
    const registerResponse = await axios.post(`${BASE_URL}/auth/register-mosque`, mosqueData);
    console.log('✅ Mosque registration successful');
    console.log('   User ID:', registerResponse.data.user._id);
    console.log('   Token received:', !!registerResponse.data.token);
    
    const token = registerResponse.data.token;
    
    // Test authentication status
    console.log('\n3. Testing authentication status...');
    const authStatusResponse = await axios.get(`${BASE_URL}/auth/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Authentication status check successful');
    console.log('   Authenticated:', authStatusResponse.data.authenticated);
    console.log('   User type:', authStatusResponse.data.user.userType);
    
    // Test login
    console.log('\n4. Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@testmosque.com',
      password: 'password123'
    });
    console.log('✅ Login successful');
    console.log('   Token received:', !!loginResponse.data.token);
    
    // Test individual user registration
    console.log('\n5. Testing individual user registration...');
    const individualResponse = await axios.post(`${BASE_URL}/auth/register-individual`, {
      deviceId: 'test-device-123',
      preferences: {
        interfaceLanguage: 'English',
        translationLanguage: 'English',
        prayerTimeReminders: true
      }
    });
    console.log('✅ Individual user registration successful');
    console.log('   User type:', individualResponse.data.user.userType);
    
    console.log('\n🎉 All authentication tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAuthEndpoints();
}

module.exports = { testAuthEndpoints };

#!/usr/bin/env node

// Test script to verify iOS connection fix
const http = require('http');

async function testConnection(ip, port = 8080, timeout = 3000) {
  return new Promise((resolve) => {
    const options = {
      hostname: ip,
      port: port,
      path: '/api/status',
      method: 'GET',
      timeout: timeout
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          ip, 
          success: true, 
          status: res.statusCode,
          response: data.substring(0, 100) + '...'
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({ ip, success: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ ip, success: false, error: 'timeout' });
    });
    
    req.end();
  });
}

async function main() {
  console.log('🧪 Testing iOS Connection Fix\n');
  
  const testIPs = [
    '172.20.10.2', // Metro bundler IP (should work)
    '172.20.10.4', // iOS device IP (should NOT work)
    'localhost',   // Local development
    '127.0.0.1',   // Loopback
    '10.0.2.2',    // Android emulator
  ];
  
  console.log('Testing backend server connectivity...\n');
  
  for (const ip of testIPs) {
    console.log(`Testing ${ip}:8080...`);
    const result = await testConnection(ip);
    
    if (result.success) {
      console.log(`✅ ${ip} - HTTP ${result.status} - ${result.response}`);
    } else {
      console.log(`❌ ${ip} - ${result.error}`);
    }
    console.log('');
  }
  
  console.log('📱 For iOS app to work:');
  console.log('1. The Metro bundler should be running on 172.20.10.2:3000');
  console.log('2. The backend server should be accessible on 172.20.10.2:8080');
  console.log('3. The app should automatically detect and use 172.20.10.2');
  console.log('\n🔧 If 172.20.10.2:8080 works, the iOS connection should be fixed!');
}

main().catch(console.error);

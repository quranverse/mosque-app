#!/usr/bin/env node

// Test script for the new network solution
const http = require('http');
const os = require('os');

console.log('🧪 Testing Network Solution\n');

// Get machine IP addresses
function getMachineIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        ips.push(interface.address);
      }
    }
  }
  
  return ips;
}

// Test connectivity to an IP
function testConnection(ip, timeout = 3000) {
  return new Promise((resolve) => {
    const options = {
      hostname: ip,
      port: 8080,
      path: '/api/status',
      method: 'HEAD',
      timeout: timeout
    };
    
    const req = http.request(options, (res) => {
      resolve({ ip, success: true, status: res.statusCode });
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

// Main test function
async function runTests() {
  console.log('1. 🔍 Detecting available IP addresses...');
  const machineIPs = getMachineIPs();
  console.log('   Machine IPs:', machineIPs);
  
  console.log('\n2. 🧪 Testing fallback IPs...');
  const testIPs = [
    ...machineIPs,
    'localhost',
    '127.0.0.1',
    '10.0.2.2', // Android emulator
    '192.168.1.100',
    '192.168.0.100',
    '10.0.0.100'
  ];
  
  console.log('   Testing IPs:', testIPs);
  
  console.log('\n3. 🌐 Testing connectivity...');
  const results = await Promise.all(
    testIPs.map(ip => testConnection(ip))
  );
  
  console.log('\n📊 Results:');
  console.log('=' .repeat(50));
  
  let workingIPs = [];
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const details = result.success 
      ? `HTTP ${result.status}` 
      : result.error;
    
    console.log(`${status} ${result.ip.padEnd(15)} - ${details}`);
    
    if (result.success) {
      workingIPs.push(result.ip);
    }
  }
  
  console.log('=' .repeat(50));
  
  if (workingIPs.length > 0) {
    console.log(`\n🎉 Found ${workingIPs.length} working connection(s):`);
    workingIPs.forEach(ip => {
      console.log(`   ✅ http://${ip}:8080/api`);
    });
    
    console.log('\n💡 The app will automatically use the first working IP.');
    console.log('   When you change networks, it will re-detect automatically.');
    
  } else {
    console.log('\n⚠️  No working connections found.');
    console.log('   Make sure your backend server is running:');
    console.log('   cd backend && npm start');
    console.log('\n   The server should listen on 0.0.0.0:8080 (all interfaces)');
  }
  
  console.log('\n🔄 Network Change Simulation:');
  console.log('   - The app will monitor network changes in real-time');
  console.log('   - When you switch WiFi/cellular, it will auto-detect new IPs');
  console.log('   - Failed requests will automatically retry with fresh IP detection');
  console.log('   - No more manual IP configuration needed!');
}

// Run the tests
runTests().catch(console.error);

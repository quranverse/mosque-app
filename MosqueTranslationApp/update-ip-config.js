#!/usr/bin/env node

/**
 * Auto-update IP Configuration Script
 * 
 * This script automatically detects your machine's IP address and updates
 * the frontend API configuration to use the correct IP for Android emulator connectivity.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the machine's IP address
function getMachineIP() {
  const interfaces = os.networkInterfaces();
  
  // Look for the first non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`Found network interface: ${name} - ${iface.address}`);
        return iface.address;
      }
    }
  }
  
  // Fallback to localhost if no external IP found
  console.warn('No external IP found, using localhost');
  return 'localhost';
}

// Update the API configuration file
function updateApiConfig(newIP) {
  const configPath = path.join(__dirname, 'frontend', 'src', 'config', 'api.js');
  
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }
  
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Find and replace the HOST_IP line
  const hostIPRegex = /const HOST_IP = '[^']+';/;
  const newHostIPLine = `const HOST_IP = '${newIP}';`;
  
  if (hostIPRegex.test(content)) {
    content = content.replace(hostIPRegex, newHostIPLine);
    console.log(`Updated HOST_IP to: ${newIP}`);
  } else {
    console.error('Could not find HOST_IP line in config file');
    process.exit(1);
  }
  
  // Write the updated content back
  fs.writeFileSync(configPath, content, 'utf8');
  console.log('✅ API configuration updated successfully!');
}

// Test connectivity to the backend server
async function testConnectivity(ip) {
  const http = require('http');
  
  return new Promise((resolve) => {
    const options = {
      hostname: ip,
      port: 8080,
      path: '/api/status',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      console.log(`✅ Server is accessible at http://${ip}:8080`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ Server not accessible at http://${ip}:8080 - ${err.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`❌ Connection timeout to http://${ip}:8080`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Main function
async function main() {
  console.log('🔧 IP Configuration Update Tool (Legacy - App now auto-detects IP)\n');
  console.log('ℹ️  Note: The app now automatically detects network changes and updates');
  console.log('   the API connection. This script is mainly for troubleshooting.\n');

  // Get machine IP
  const machineIP = getMachineIP();
  console.log(`Detected machine IP: ${machineIP}\n`);

  // Test connectivity to multiple IPs
  console.log('Testing server connectivity on multiple IPs...');
  const testIPs = [
    machineIP,
    'localhost',
    '127.0.0.1',
    '10.0.2.2', // Android emulator
    '192.168.1.100',
    '192.168.0.100'
  ];

  let workingIP = null;
  for (const ip of testIPs) {
    const isAccessible = await testConnectivity(ip);
    if (isAccessible) {
      workingIP = ip;
      break;
    }
  }

  if (!workingIP) {
    console.log('\n❌ No working IP found. Make sure your backend server is running:');
    console.log('   cd backend && npm start\n');
    console.log('💡 The app will automatically detect the correct IP when the server is available.');
    return;
  }

  console.log(`\n✅ Found working server at: ${workingIP}`);
  console.log('\n📱 The app will automatically use this IP when it detects network changes.');
  console.log('   No manual configuration needed!\n');

  console.log('🔄 If you want to force the app to refresh its connection:');
  console.log('   1. Change networks (WiFi/cellular)');
  console.log('   2. Or restart the app');
  console.log('   3. The app will automatically find the best connection\n');

  console.log('🌐 Current automatic detection will try:');
  console.log(`   Primary: http://${workingIP}:8080/api`);
  console.log('   Fallbacks: localhost, 127.0.0.1, 10.0.2.2, and other common IPs');
}

// Run the script
main().catch(console.error);

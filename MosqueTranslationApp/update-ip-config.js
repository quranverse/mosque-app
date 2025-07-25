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
  console.log('🔧 Auto-updating IP configuration for Android connectivity...\n');
  
  // Get machine IP
  const machineIP = getMachineIP();
  console.log(`Detected machine IP: ${machineIP}\n`);
  
  // Test connectivity
  console.log('Testing server connectivity...');
  const isAccessible = await testConnectivity(machineIP);
  
  if (!isAccessible) {
    console.log('\n⚠️  Server is not accessible on this IP.');
    console.log('Make sure your backend server is running on port 8080');
    console.log('and listening on all interfaces (0.0.0.0:8080).\n');
    
    console.log('To start the server:');
    console.log('cd backend && npm start\n');
    
    // Still update the config even if server is not running
    console.log('Updating configuration anyway...');
  }
  
  // Update the configuration
  updateApiConfig(machineIP);
  
  console.log('\n📱 Next steps:');
  console.log('1. Make sure your backend server is running: cd backend && npm start');
  console.log('2. Restart your React Native app to pick up the new configuration');
  console.log('3. Test the login functionality');
  
  console.log('\n🌐 Your app will now connect to:');
  console.log(`   Android: http://${machineIP}:8080/api`);
  console.log(`   iOS: http://${machineIP}:8080/api`);
  console.log(`   Web: http://localhost:8080/api`);
}

// Run the script
main().catch(console.error);

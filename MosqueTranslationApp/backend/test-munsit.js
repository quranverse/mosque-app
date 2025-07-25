// Test script for Munsit API integration
// This script tests the Munsit provider without requiring full app setup

require('dotenv').config();
const io = require('socket.io-client');

// Test configuration
const MUNSIT_API_KEY = process.env.MUNSIT_API_KEY || 'your_munsit_api_key_here';
const MUNSIT_SOCKET_URL = process.env.MUNSIT_SOCKET_URL || 'https://api.cntxt.tools';

console.log('🔧 Testing Munsit API Integration...');
console.log(`📡 Socket URL: ${MUNSIT_SOCKET_URL}`);
console.log(`🔑 API Key: ${MUNSIT_API_KEY ? '✅ Configured' : '❌ Missing'}`);

if (!MUNSIT_API_KEY || MUNSIT_API_KEY === 'your_munsit_api_key_here') {
  console.error('❌ Please set MUNSIT_API_KEY in your .env file');
  process.exit(1);
}

// Test socket connection
function testMunsitConnection() {
  return new Promise((resolve, reject) => {
    console.log('\n🚀 Connecting to Munsit socket server...');
    
    const socket = io(MUNSIT_SOCKET_URL, {
      transports: ['websocket'],
      query: {
        apiKey: MUNSIT_API_KEY
      },
      timeout: 10000,
      reconnection: false
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ Successfully connected to Munsit server');
      
      // Test authentication by sending a dummy audio chunk
      console.log('🧪 Testing audio chunk emission...');
      
      // Create a dummy WAV audio buffer (minimal WAV header + silence)
      const dummyWavBuffer = new Uint8Array([
        // WAV header (44 bytes)
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // File size - 8
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // Subchunk1Size (16)
        0x01, 0x00,             // AudioFormat (PCM)
        0x01, 0x00,             // NumChannels (1)
        0x44, 0xAC, 0x00, 0x00, // SampleRate (44100)
        0x88, 0x58, 0x01, 0x00, // ByteRate
        0x02, 0x00,             // BlockAlign
        0x10, 0x00,             // BitsPerSample (16)
        0x64, 0x61, 0x74, 0x61, // "data"
        0x00, 0x00, 0x00, 0x00  // Subchunk2Size (0 - no audio data)
      ]);

      socket.emit('audio_chunk', {
        audioBuffer: Array.from(dummyWavBuffer)
      });

      console.log('📤 Sent test audio chunk');
      
      // Wait a bit for any response, then disconnect
      setTimeout(() => {
        socket.emit('end');
        socket.disconnect();
        resolve('Test completed successfully');
      }, 3000);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Connection failed: ${error.message}`));
    });

    socket.on('authentication_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Authentication failed: ${error}`));
    });

    socket.on('transcription', (data) => {
      console.log('📝 Received transcription:', data);
    });

    socket.on('transcription_error', (error) => {
      console.log('⚠️ Transcription error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
    });
  });
}

// Test the VoiceRecognitionService integration
async function testVoiceRecognitionService() {
  console.log('\n🔧 Testing VoiceRecognitionService integration...');
  
  try {
    const VoiceRecognitionService = require('./services/VoiceRecognitionService');
    
    // Check if Munsit provider is available
    const providers = VoiceRecognitionService.getProviderStatus();
    const munsitProvider = providers.find(p => p.name === 'munsit');
    
    if (munsitProvider) {
      console.log('✅ Munsit provider found in VoiceRecognitionService');
      console.log(`   Available: ${munsitProvider.available}`);
      console.log(`   Accuracy: ${munsitProvider.accuracy}/10`);
      console.log(`   Latency: ${munsitProvider.latency}/10`);
      console.log(`   Cost: ${munsitProvider.cost}/10`);
    } else {
      console.log('❌ Munsit provider not found in VoiceRecognitionService');
    }

    // Check default provider
    const defaultProvider = VoiceRecognitionService.defaultProvider;
    console.log(`🎯 Default provider: ${defaultProvider}`);
    
    if (defaultProvider === 'munsit') {
      console.log('✅ Munsit is set as default provider');
    } else {
      console.log('⚠️ Munsit is not the default provider');
    }

  } catch (error) {
    console.error('❌ Error testing VoiceRecognitionService:', error.message);
  }
}

// Run tests
async function runTests() {
  try {
    // Test 1: Socket connection
    await testMunsitConnection();
    console.log('✅ Socket connection test passed');
    
    // Test 2: Service integration
    await testVoiceRecognitionService();
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Set your actual Munsit API key in backend/.env');
    console.log('2. Start the backend server: npm start');
    console.log('3. Test real-time transcription through the frontend');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your MUNSIT_API_KEY in backend/.env');
    console.log('2. Verify internet connection');
    console.log('3. Check Munsit API status at https://api.cntxt.tools');
  }
  
  process.exit(0);
}

// Start tests
runTests();

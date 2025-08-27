// Test STT Flow - Verify Arabic transcription is sent back to mosque phone
require('dotenv').config();
const io = require('socket.io-client');

console.log('🧪 Testing STT Flow...');
console.log('─'.repeat(50));

// Test configuration
const SERVER_URL = 'http://localhost:8080';
const TEST_SESSION_ID = 'test_session_' + Date.now();

// Create mosque client (broadcaster)
const mosqueSocket = io(SERVER_URL, {
  transports: ['websocket']
});

let transcriptionReceived = false;
let testTimeout;

mosqueSocket.on('connect', () => {
  console.log('✅ Mosque socket connected');
  
  // Authenticate as mosque
  mosqueSocket.emit('authenticate', {
    userType: 'mosque',
    email: 'zakariaelouali05@gmail.com',
    password: 'zakaria05'
  }, (response) => {
    if (response.success) {
      console.log('✅ Mosque authenticated');
      startSTTTest();
    } else {
      console.log('❌ Mosque authentication failed:', response.error);
      process.exit(1);
    }
  });
});

mosqueSocket.on('voice_transcription', (transcription) => {
  console.log('');
  console.log('🎉 TRANSCRIPTION RECEIVED BY MOSQUE:');
  console.log('─'.repeat(40));
  console.log(`📝 Text: "${transcription.text}"`);
  console.log(`🌍 Language: ${transcription.language || 'unknown'}`);
  console.log(`🎯 Confidence: ${transcription.confidence || 'unknown'}`);
  console.log(`📡 Provider: ${transcription.provider || 'unknown'}`);
  console.log(`✅ Is Final: ${transcription.isFinal}`);
  console.log(`🔤 Is Original: ${transcription.isOriginal}`);
  console.log('─'.repeat(40));
  
  transcriptionReceived = true;
  
  if (transcription.isFinal) {
    console.log('✅ STT Flow Test PASSED - Arabic transcription received!');
    cleanup();
  }
});

mosqueSocket.on('voice_recognition_error', (error) => {
  console.log('❌ Voice recognition error:', error);
});

function startSTTTest() {
  console.log('🎤 Starting voice recognition test...');
  
  // Start voice recognition
  mosqueSocket.emit('start_voice_recognition', {
    sessionId: TEST_SESSION_ID,
    provider: 'munsit',
    language: 'ar-SA',
    enableRecording: true,
    sessionType: 'test',
    recordingTitle: 'STT Flow Test'
  }, (response) => {
    if (response.success) {
      console.log('✅ Voice recognition started');
      console.log(`📡 Provider: ${response.provider}`);
      
      // Simulate sending audio chunk after a short delay
      setTimeout(() => {
        simulateAudioChunk();
      }, 1000);
      
    } else {
      console.log('❌ Failed to start voice recognition:', response.error);
      process.exit(1);
    }
  });
  
  // Set timeout for test
  testTimeout = setTimeout(() => {
    if (!transcriptionReceived) {
      console.log('⏰ Test timeout - No transcription received');
      console.log('❌ STT Flow Test FAILED');
      cleanup();
    }
  }, 30000); // 30 second timeout
}

function simulateAudioChunk() {
  console.log('📤 Simulating audio chunk...');
  
  // Create dummy audio data (in real app, this comes from microphone)
  const dummyAudioData = Buffer.alloc(1024, 0); // 1KB of silence
  
  mosqueSocket.emit('audio_chunk', {
    sessionId: TEST_SESSION_ID,
    audioData: Array.from(dummyAudioData), // Convert to array for JSON
    timestamp: Date.now(),
    provider: 'munsit',
    format: 'm4a',
    mosque_id: TEST_SESSION_ID,
    duration: 1000,
    isRealAudio: false, // Mark as test data
    sampleRate: 44100,
    channels: 1,
    chunkSequence: 1
  });
  
  console.log('📤 Audio chunk sent to backend');
  
  // Send a few more chunks to simulate continuous audio
  let chunkCount = 2;
  const chunkInterval = setInterval(() => {
    if (chunkCount <= 5) {
      mosqueSocket.emit('audio_chunk', {
        sessionId: TEST_SESSION_ID,
        audioData: Array.from(dummyAudioData),
        timestamp: Date.now(),
        provider: 'munsit',
        format: 'm4a',
        mosque_id: TEST_SESSION_ID,
        duration: 1000,
        isRealAudio: false,
        sampleRate: 44100,
        channels: 1,
        chunkSequence: chunkCount
      });
      
      console.log(`📤 Audio chunk ${chunkCount} sent`);
      chunkCount++;
    } else {
      clearInterval(chunkInterval);
      console.log('📤 Finished sending audio chunks');
    }
  }, 1000);
}

function cleanup() {
  if (testTimeout) {
    clearTimeout(testTimeout);
  }
  
  if (mosqueSocket) {
    mosqueSocket.disconnect();
  }
  
  console.log('');
  console.log('🧹 Test cleanup completed');
  process.exit(transcriptionReceived ? 0 : 1);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  cleanup();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  cleanup();
});

console.log('🚀 STT Flow Test started...');
console.log('📋 This test will:');
console.log('   1. Connect as mosque');
console.log('   2. Start voice recognition');
console.log('   3. Send audio chunks');
console.log('   4. Wait for Arabic transcription');
console.log('   5. Verify transcription is received');
console.log('');

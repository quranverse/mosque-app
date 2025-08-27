#!/usr/bin/env node

/**
 * Real-Time Audio Streaming Test Script
 * Tests the complete real-time audio pipeline from frontend to backend
 */

const io = require('socket.io-client');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVER_URL = 'http://localhost:8080';
const TEST_SESSION_ID = 'test-realtime-audio-' + Date.now();
const CHUNK_SIZE = 4096; // Match frontend buffer size
const SAMPLE_RATE = 16000;
const CHANNELS = 1;

console.log('🎙️ Real-Time Audio Streaming Test');
console.log('================================');
console.log(`📡 Server: ${SERVER_URL}`);
console.log(`🆔 Session ID: ${TEST_SESSION_ID}`);
console.log(`📊 Chunk Size: ${CHUNK_SIZE} bytes`);
console.log(`🎵 Sample Rate: ${SAMPLE_RATE}Hz`);
console.log('');

// Test data
let chunkSequence = 0;
let startTime = Date.now();
let receivedTranscriptions = 0;
let receivedTranslations = 0;

// Socket connection
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  reconnection: true
});

// Socket event handlers
socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log(`🔗 Socket ID: ${socket.id}`);
  
  // Authenticate as mosque user (mock)
  socket.emit('authenticate', {
    token: 'mock-mosque-token',
    userType: 'mosque',
    mosqueName: 'Test Mosque',
    id: 'test-mosque-123'
  });
});

socket.on('authenticated', (data) => {
  console.log('🔐 Authenticated successfully:', data);
  startRealTimeAudioTest();
});

socket.on('voice_transcription', (data) => {
  receivedTranscriptions++;
  console.log(`📝 Transcription #${receivedTranscriptions}:`, {
    sequence: data.sequence,
    text: data.text,
    confidence: data.confidence,
    isFinal: data.isFinal,
    provider: data.provider
  });
});

socket.on('translation_update', (data) => {
  receivedTranslations++;
  console.log(`🌐 Translation #${receivedTranslations}:`, {
    sequence: data.sequence,
    originalText: data.originalText,
    translations: Object.keys(data.translations).length + ' languages'
  });
});

socket.on('voice_recognition_error', (error) => {
  console.error('❌ Voice recognition error:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
  printTestResults();
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

// Generate mock audio data (simulates real microphone input)
function generateMockAudioChunk(sequence) {
  // Create a buffer with simulated PCM audio data
  const buffer = Buffer.alloc(CHUNK_SIZE);
  
  // Fill with simulated audio data (sine wave pattern)
  for (let i = 0; i < CHUNK_SIZE; i += 2) {
    // Generate 16-bit PCM samples
    const sample = Math.sin(2 * Math.PI * 440 * (sequence * CHUNK_SIZE + i) / SAMPLE_RATE) * 32767;
    buffer.writeInt16LE(Math.floor(sample), i);
  }
  
  return buffer;
}

// Start real-time audio streaming test
function startRealTimeAudioTest() {
  console.log('🎤 Starting real-time audio streaming test...');
  console.log('📡 Sending audio chunks every 100ms for 10 seconds');
  console.log('');
  
  const interval = setInterval(() => {
    chunkSequence++;
    
    // Generate mock audio chunk
    const audioBuffer = generateMockAudioChunk(chunkSequence);
    const base64AudioData = audioBuffer.toString('base64');
    
    // Create chunk data (matches frontend format)
    const chunkData = {
      sessionId: TEST_SESSION_ID,
      audioData: base64AudioData,
      sequence: chunkSequence,
      timestamp: Date.now(),
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
      format: 'pcm',
      provider: 'munsit',
      language: 'ar-SA'
    };
    
    // Send to backend
    socket.emit('realtime_audio_chunk', chunkData);
    
    // Log progress
    if (chunkSequence % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`📤 Sent ${chunkSequence} chunks in ${elapsed}s`);
    }
    
    // Stop after 10 seconds (100 chunks)
    if (chunkSequence >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        console.log('🛑 Test completed, disconnecting...');
        socket.disconnect();
      }, 2000); // Wait 2 seconds for final responses
    }
    
  }, 100); // Send chunk every 100ms
}

// Print test results
function printTestResults() {
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgChunksPerSecond = (chunkSequence / totalTime).toFixed(1);
  
  console.log('');
  console.log('📊 Test Results');
  console.log('===============');
  console.log(`⏱️  Total Time: ${totalTime}s`);
  console.log(`📦 Chunks Sent: ${chunkSequence}`);
  console.log(`📈 Avg Rate: ${avgChunksPerSecond} chunks/sec`);
  console.log(`📝 Transcriptions: ${receivedTranscriptions}`);
  console.log(`🌐 Translations: ${receivedTranslations}`);
  console.log('');
  
  // Performance analysis
  const expectedChunks = Math.floor(totalTime * 10); // 10 chunks per second
  const chunkSuccess = ((chunkSequence / expectedChunks) * 100).toFixed(1);
  
  console.log('🎯 Performance Analysis');
  console.log('=======================');
  console.log(`📊 Chunk Success Rate: ${chunkSuccess}%`);
  console.log(`🎙️  Expected Latency: ~${100 + (1000 / 10)}ms per chunk`);
  
  if (receivedTranscriptions > 0) {
    console.log(`✅ Transcription System: Working`);
  } else {
    console.log(`❌ Transcription System: No responses received`);
  }
  
  if (receivedTranslations > 0) {
    console.log(`✅ Translation System: Working`);
  } else {
    console.log(`❌ Translation System: No responses received`);
  }
  
  console.log('');
  
  // Recommendations
  if (chunkSuccess < 95) {
    console.log('⚠️  Warning: Low chunk success rate. Check network connection.');
  }
  
  if (receivedTranscriptions === 0) {
    console.log('⚠️  Warning: No transcriptions received. Check Munsit API configuration.');
  }
  
  if (receivedTranslations === 0) {
    console.log('⚠️  Warning: No translations received. Check translation service.');
  }
  
  if (chunkSuccess >= 95 && receivedTranscriptions > 0 && receivedTranslations > 0) {
    console.log('🎉 All systems working! Real-time audio streaming is ready for production.');
  }
  
  process.exit(0);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  socket.disconnect();
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  socket.disconnect();
});

// Start the test
console.log('🔄 Connecting to server...');

// Demo script for Munsit API with real API key
// This script demonstrates how to use Munsit for real-time Arabic transcription

require('dotenv').config();
const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Configuration
const MUNSIT_API_KEY = process.env.MUNSIT_API_KEY;
const MUNSIT_SOCKET_URL = process.env.MUNSIT_SOCKET_URL || 'https://api.cntxt.tools';

console.log('🎙️ Munsit Real-Time Arabic Transcription Demo');
console.log('='.repeat(50));

if (!MUNSIT_API_KEY || MUNSIT_API_KEY === 'your_munsit_api_key_here') {
  console.log('❌ Please set your real MUNSIT_API_KEY in backend/.env');
  console.log('');
  console.log('Steps to get your API key:');
  console.log('1. Visit https://api.cntxt.tools');
  console.log('2. Create an account or sign in');
  console.log('3. Navigate to API Keys section');
  console.log('4. Generate a new API key');
  console.log('5. Add it to your .env file:');
  console.log('   MUNSIT_API_KEY=your_actual_api_key_here');
  process.exit(1);
}

// Demo with real-time transcription
async function demonstrateMunsitTranscription() {
  return new Promise((resolve, reject) => {
    console.log(`🔗 Connecting to ${MUNSIT_SOCKET_URL}...`);
    
    const socket = io(MUNSIT_SOCKET_URL, {
      transports: ['websocket'],
      query: {
        apiKey: MUNSIT_API_KEY
      },
      timeout: 15000,
      reconnection: false
    });

    let transcriptionCount = 0;
    let isConnected = false;

    const timeout = setTimeout(() => {
      if (!isConnected) {
        socket.disconnect();
        reject(new Error('Connection timeout - check your API key and internet connection'));
      }
    }, 15000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      isConnected = true;
      console.log('✅ Connected to Munsit server successfully!');
      console.log('🎯 Ready for real-time Arabic transcription');
      console.log('');
      
      // Simulate sending audio chunks (you would replace this with real audio data)
      console.log('📡 Simulating audio stream...');
      console.log('   (In real usage, this would be live microphone audio)');
      
      // Create a more realistic WAV header for testing
      const sampleRate = 16000;
      const channels = 1;
      const bitsPerSample = 16;
      const duration = 1; // 1 second of audio
      const numSamples = sampleRate * duration;
      const dataSize = numSamples * channels * (bitsPerSample / 8);
      
      const wavHeader = Buffer.alloc(44);
      wavHeader.write('RIFF', 0);
      wavHeader.writeUInt32LE(36 + dataSize, 4);
      wavHeader.write('WAVE', 8);
      wavHeader.write('fmt ', 12);
      wavHeader.writeUInt32LE(16, 16);
      wavHeader.writeUInt16LE(1, 20); // PCM
      wavHeader.writeUInt16LE(channels, 22);
      wavHeader.writeUInt32LE(sampleRate, 24);
      wavHeader.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
      wavHeader.writeUInt16LE(channels * (bitsPerSample / 8), 32);
      wavHeader.writeUInt16LE(bitsPerSample, 34);
      wavHeader.write('data', 36);
      wavHeader.writeUInt32LE(dataSize, 40);
      
      // Send the WAV header first
      socket.emit('audio_chunk', {
        audioBuffer: Array.from(wavHeader)
      });
      
      console.log('📤 Sent WAV header');
      
      // Send a few chunks of silence (in real usage, this would be actual audio)
      let chunkCount = 0;
      const maxChunks = 5;
      
      const sendChunk = () => {
        if (chunkCount < maxChunks) {
          // Create a chunk of silence (zeros)
          const silenceChunk = Buffer.alloc(1024, 0);
          
          socket.emit('audio_chunk', {
            audioBuffer: Array.from(silenceChunk)
          });
          
          chunkCount++;
          console.log(`📤 Sent audio chunk ${chunkCount}/${maxChunks}`);
          
          setTimeout(sendChunk, 1000); // Send every second
        } else {
          console.log('📡 Finished sending audio chunks');
          console.log('⏳ Waiting for any final transcriptions...');
          
          setTimeout(() => {
            socket.emit('end');
            socket.disconnect();
            
            if (transcriptionCount === 0) {
              console.log('ℹ️  No transcriptions received (expected with silence)');
              console.log('   In real usage with Arabic speech, you would see transcriptions here');
            }
            
            resolve('Demo completed');
          }, 3000);
        }
      };
      
      // Start sending chunks after a short delay
      setTimeout(sendChunk, 1000);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Connection failed: ${error.message}`));
    });

    socket.on('authentication_error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Authentication failed: ${error} - Check your API key`));
    });

    socket.on('transcription', (data) => {
      transcriptionCount++;
      console.log('');
      console.log('🎉 TRANSCRIPTION RECEIVED:');
      console.log('─'.repeat(40));
      
      if (typeof data === 'string') {
        console.log(`📝 Text: "${data}"`);
      } else {
        console.log(`📝 Text: "${data.text || data.transcription || data}"`);
        if (data.confidence) {
          console.log(`🎯 Confidence: ${data.confidence}`);
        }
        if (data.timestamps && data.timestamps.length > 0) {
          console.log(`⏱️  Word timestamps: ${data.timestamps.length} words`);
        }
      }
      console.log('─'.repeat(40));
    });

    socket.on('transcription_error', (error) => {
      console.log(`⚠️  Transcription error: ${error}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Disconnected: ${reason}`);
    });
  });
}

// Show integration example
function showIntegrationExample() {
  console.log('');
  console.log('🔧 INTEGRATION EXAMPLE:');
  console.log('='.repeat(50));
  console.log('');
  console.log('// In your mosque app, use it like this:');
  console.log('');
  console.log('const VoiceRecognitionService = require("./services/VoiceRecognitionService");');
  console.log('');
  console.log('// Start real-time transcription');
  console.log('await VoiceRecognitionService.startVoiceRecognition(sessionId, mosqueId, {');
  console.log('  provider: "munsit",  // Now the default!');
  console.log('  language: "ar-SA",');
  console.log('  onTranscription: (result) => {');
  console.log('    console.log("Arabic:", result.text);');
  console.log('    console.log("Confidence:", result.confidence);');
  console.log('    ');
  console.log('    // Send to translation service');
  console.log('    translateToMultipleLanguages(result.text);');
  console.log('  }');
  console.log('});');
  console.log('');
}

// Main demo function
async function runDemo() {
  try {
    await demonstrateMunsitTranscription();
    console.log('');
    console.log('✅ Demo completed successfully!');
    
    showIntegrationExample();
    
    console.log('📋 NEXT STEPS:');
    console.log('─'.repeat(30));
    console.log('1. ✅ Munsit API is now integrated and set as default');
    console.log('2. 🎙️  Start your backend server: npm start');
    console.log('3. 🎯 Test with real Arabic audio through the frontend');
    console.log('4. 📊 Monitor usage in your Munsit dashboard');
    console.log('');
    console.log('🎉 Your mosque app now has specialized Arabic transcription!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Demo failed:', error.message);
    console.error('');
    console.error('🔧 TROUBLESHOOTING:');
    console.error('─'.repeat(30));
    console.error('1. Verify your MUNSIT_API_KEY is correct');
    console.error('2. Check your internet connection');
    console.error('3. Ensure your API key has sufficient credits');
    console.error('4. Visit https://api.cntxt.tools for support');
  }
  
  process.exit(0);
}

// Run the demo
runDemo();

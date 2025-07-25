// Voice Recognition Service for Mosque Translation App
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');
const audioStorageService = require('./AudioStorageService');
const io = require('socket.io-client');

// Import audio-related models and services
const AudioSession = require('../models/AudioSession');
const VoiceTranscription = require('../models/VoiceTranscription');
const AudioRecordingService = require('./AudioRecordingService');

class VoiceRecognitionService {
  constructor() {
    this.activeStreams = new Map(); // sessionId -> stream info
    this.providers = {
      munsit: new MunsitProvider(),
      google: new GoogleSpeechProvider(),
      azure: new AzureSpeechProvider(),
      aws: new AWSTranscribeProvider(),
      whisper: new WhisperProvider(),
      assemblyai: new AssemblyAIProvider()
    };
    this.defaultProvider = 'munsit'; // Best for Arabic real-time transcription
    this.fallbackProviders = ['google', 'azure', 'whisper']; // Fallback options
  }

  // Start voice recognition for a session
  async startVoiceRecognition(sessionId, mosqueId, options = {}) {
    try {
      // Create or get audio session
      let audioSession = await AudioSession.findOne({ sessionId, status: 'active' });
      if (!audioSession) {
        audioSession = new AudioSession({
          sessionId,
          mosqueId,
          status: 'active',
          audioConfig: {
            sampleRate: options.sampleRate || 48000,
            channels: options.channels || 1,
            bitRate: options.bitRate || 128000,
            format: options.format || 'webm'
          },
          metadata: {
            sessionType: options.sessionType || 'general',
            description: options.description
          }
        });
        await audioSession.save();
      }

      const streamInfo = {
        sessionId,
        mosqueId,
        audioSessionId: audioSession._id,
        provider: options.provider || this.defaultProvider,
        language: options.language || 'ar-SA', // Arabic (Saudi Arabia)
        isActive: true,
        startedAt: new Date(),
        audioBuffer: [],
        transcriptionCallback: options.onTranscription,
        errorCallback: options.onError,
        sequenceNumber: 0
      };

      // Initialize the selected provider
      const provider = this.providers[streamInfo.provider];
      if (!provider) {
        throw new Error(`Provider ${streamInfo.provider} not available`);
      }

      // Start audio recording if enabled
      if (options.enableRecording !== false) {
        try {
          const recordingResult = await AudioRecordingService.startRecording(sessionId, mosqueId, {
            audioSessionId: audioSession._id,
            format: 'mp3',
            quality: options.recordingQuality || 'standard',
            sessionType: options.sessionType,
            title: options.recordingTitle,
            description: options.recordingDescription
          });

          streamInfo.recordingId = recordingResult.recordingId;
          streamInfo.recordingPath = recordingResult.filePath;

          // Update audio session with recording info
          audioSession.isRecording = true;
          audioSession.recordingPath = recordingResult.filePath;
          await audioSession.save();

          console.log(`🎵 Audio recording started: ${recordingResult.recordingId}`);
        } catch (recordingError) {
          console.warn('⚠️ Failed to start audio recording:', recordingError);
          // Continue without recording
        }
      }

      await provider.initialize(streamInfo);
      this.activeStreams.set(sessionId, streamInfo);

      console.log(`🎤 Voice recognition started for session ${sessionId} using ${streamInfo.provider}`);
      return {
        success: true,
        provider: streamInfo.provider,
        audioSessionId: audioSession._id,
        recordingEnabled: !!streamInfo.recordingId
      };

    } catch (error) {
      console.error('Failed to start voice recognition:', error);

      // Try fallback provider
      if (options.provider !== this.fallbackProviders[0]) {
        console.log('Trying fallback provider...');
        return this.startVoiceRecognition(sessionId, mosqueId, {
          ...options,
          provider: this.fallbackProviders[0]
        });
      }

      throw error;
    }
  }

  // Write audio chunk to backend storage
  async writeAudioChunk(sessionId, audioChunk, metadata = {}) {
    try {
      const streamInfo = this.activeStreams.get(sessionId);
      if (!streamInfo) {
        console.warn(`No active stream for session ${sessionId}`);
        return;
      }

      // Write audio chunk to recording if enabled
      if (streamInfo.recordingId) {
        await AudioRecordingService.writeAudioChunk(sessionId, audioChunk, metadata);
      }

      console.log(`📁 Audio chunk written for session ${sessionId}: ${audioChunk.length} bytes`);

    } catch (error) {
      console.error('Error writing audio chunk:', error);
    }
  }

  // Process audio chunk (real-time streaming)
  async processAudioChunk(sessionId, audioChunk, format = 'webm') {
    const streamInfo = this.activeStreams.get(sessionId);
    if (!streamInfo || !streamInfo.isActive) {
      throw new Error('Voice recognition not active for this session');
    }

    try {
      // Process with voice recognition provider
      const provider = this.providers[streamInfo.provider];
      await provider.processAudioChunk(audioChunk, streamInfo);

    } catch (error) {
      console.error('Audio processing error:', error);

      // Try fallback provider on error
      await this.handleProviderError(sessionId, error);
    }
  }

  // Save complete audio file to backend storage
  async saveCompleteAudioFile(sessionId, audioFileData) {
    try {
      const { audioBuffer, mosqueId, provider, format, fileName, duration, deviceInfo } = audioFileData;

      // Save to backend storage using AudioRecordingService
      const recording = await AudioRecordingService.saveCompleteAudioFile(sessionId, {
        audioBuffer,
        mosqueId,
        provider,
        format,
        fileName,
        duration,
        deviceInfo
      });

      console.log(`✅ Complete audio file saved: ${recording.recordingId}`);
      return recording;

    } catch (error) {
      console.error('Error saving complete audio file:', error);
      throw error;
    }
  }

  // Handle completed audio recording
  async handleAudioRecordingComplete(sessionId, recordingData) {
    try {
      console.log('🎵 Processing completed audio recording for session:', sessionId);

      const streamInfo = this.activeStreams.get(sessionId);
      if (!streamInfo) {
        throw new Error('Session not found');
      }

      // Save audio recording to storage
      const recording = await audioStorageService.saveAudioRecording({
        mosqueId: streamInfo.mosqueId,
        mosqueName: streamInfo.mosqueName || 'Unknown Mosque',
        sessionId: sessionId,
        sessionType: streamInfo.sessionType || 'general',
        provider: streamInfo.provider,
        language: streamInfo.language,
        filePath: recordingData.recordingPath,
        fileName: recordingData.fileName,
        metadata: {
          deviceInfo: recordingData.deviceInfo,
          duration: recordingData.duration,
          format: recordingData.format || 'wav'
        }
      });

      console.log('✅ Audio recording saved:', recording.recordingId);
      return recording;

    } catch (error) {
      console.error('❌ Error handling audio recording completion:', error);
      throw error;
    }
  }

  // Handle provider errors with automatic fallback
  async handleProviderError(sessionId, error) {
    const streamInfo = this.activeStreams.get(sessionId);
    if (!streamInfo) return;

    console.log(`Provider ${streamInfo.provider} failed, switching to fallback...`);
    
    // Switch to next fallback provider
    const currentIndex = this.fallbackProviders.indexOf(streamInfo.provider);
    const nextProvider = this.fallbackProviders[currentIndex + 1];
    
    if (nextProvider && this.providers[nextProvider]) {
      streamInfo.provider = nextProvider;
      const provider = this.providers[nextProvider];
      await provider.initialize(streamInfo);
      console.log(`Switched to fallback provider: ${nextProvider}`);
    } else {
      // All providers failed
      streamInfo.errorCallback?.(error);
    }
  }

  // Stop voice recognition
  async stopVoiceRecognition(sessionId) {
    const streamInfo = this.activeStreams.get(sessionId);
    if (!streamInfo) return;

    try {
      streamInfo.isActive = false;
      const provider = this.providers[streamInfo.provider];
      await provider.cleanup(streamInfo);

      // Stop audio recording if active
      if (streamInfo.recordingId) {
        try {
          const recordingResult = await AudioRecordingService.stopRecording(sessionId);
          console.log(`🎵 Audio recording stopped: ${recordingResult?.recordingId}`);
        } catch (recordingError) {
          console.warn('⚠️ Error stopping audio recording:', recordingError);
        }
      }

      // Update audio session status
      if (streamInfo.audioSessionId) {
        try {
          const audioSession = await AudioSession.findById(streamInfo.audioSessionId);
          if (audioSession) {
            await audioSession.endSession();
          }
        } catch (sessionError) {
          console.warn('⚠️ Error updating audio session:', sessionError);
        }
      }

      this.activeStreams.delete(sessionId);
      console.log(`🎤 Voice recognition stopped for session ${sessionId}`);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  }

  // Save transcription to database
  async saveTranscription(sessionId, transcriptionData) {
    try {
      const streamInfo = this.activeStreams.get(sessionId);
      if (!streamInfo) {
        console.warn(`No stream info found for session ${sessionId}`);
        return null;
      }

      streamInfo.sequenceNumber += 1;

      const transcriptionId = `trans_${sessionId}_${streamInfo.sequenceNumber}_${Date.now()}`;

      const voiceTranscription = new VoiceTranscription({
        transcriptionId,
        sessionId,
        audioSessionId: streamInfo.audioSessionId,
        originalText: transcriptionData.text,
        languageDetected: transcriptionData.language || streamInfo.language,
        confidenceScore: transcriptionData.confidence || 0,
        provider: transcriptionData.provider || streamInfo.provider,
        isFinal: transcriptionData.isFinal || false,
        sequenceNumber: streamInfo.sequenceNumber,
        audioStartTime: transcriptionData.audioStartTime || 0,
        audioEndTime: transcriptionData.audioEndTime || 0,
        processingTime: transcriptionData.processingTime || 0,
        metadata: {
          audioQuality: transcriptionData.audioQuality,
          backgroundNoise: transcriptionData.backgroundNoise,
          context: transcriptionData.context || 'general'
        }
      });

      await voiceTranscription.save();

      // Update audio session stats
      if (streamInfo.audioSessionId && transcriptionData.isFinal) {
        await AudioSession.findByIdAndUpdate(streamInfo.audioSessionId, {
          $inc: { 'stats.totalTranscriptions': 1 },
          $set: { 'stats.averageConfidenceScore': transcriptionData.confidence || 0 }
        });
      }

      console.log(`📝 Transcription saved: ${transcriptionId}`);
      return voiceTranscription;

    } catch (error) {
      console.error('Error saving transcription:', error);
      return null;
    }
  }

  // Get available providers and their status
  getProviderStatus() {
    return Object.keys(this.providers).map(name => ({
      name,
      available: this.providers[name].isAvailable(),
      accuracy: this.providers[name].getAccuracyRating(),
      latency: this.providers[name].getLatencyRating(),
      cost: this.providers[name].getCostRating()
    }));
  }
}

// Google Speech-to-Text Provider (Best for Arabic)
class GoogleSpeechProvider {
  constructor() {
    this.speech = null;
    this.recognizeStream = null;
  }

  async initialize(streamInfo) {
    if (!config.google?.speechApiKey) {
      throw new Error('Google Speech API key not configured');
    }

    const speech = require('@google-cloud/speech');
    this.speech = new speech.SpeechClient({
      keyFilename: config.google.keyFilename || undefined,
      projectId: config.google.projectId
    });

    // Configure recognition request
    const request = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: streamInfo.language,
        alternativeLanguageCodes: ['ar-EG', 'ar-JO', 'ar-AE'], // Arabic variants
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        model: 'latest_long', // Best for continuous speech
        useEnhanced: true
      },
      interimResults: true, // Real-time partial results
    };

    // Create streaming recognition
    this.recognizeStream = this.speech
      .streamingRecognize(request)
      .on('data', (data) => {
        if (data.results[0] && data.results[0].alternatives[0]) {
          const transcript = data.results[0].alternatives[0].transcript;
          const confidence = data.results[0].alternatives[0].confidence;
          const isFinal = data.results[0].isFinal;

          streamInfo.transcriptionCallback?.({
            text: transcript,
            confidence,
            isFinal,
            provider: 'google',
            timestamp: new Date()
          });
        }
      })
      .on('error', (error) => {
        console.error('Google Speech error:', error);
        streamInfo.errorCallback?.(error);
      });
  }

  async processAudioChunk(audioChunk, streamInfo) {
    if (this.recognizeStream && !this.recognizeStream.destroyed) {
      this.recognizeStream.write(audioChunk);
    }
  }

  async cleanup(streamInfo) {
    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream = null;
    }
  }

  isAvailable() {
    return !!config.google?.speechApiKey;
  }

  getAccuracyRating() { return 9; } // 9/10 for Arabic
  getLatencyRating() { return 8; } // 8/10 speed
  getCostRating() { return 6; } // 6/10 cost-effective
}

// Azure Speech Services Provider
class AzureSpeechProvider {
  constructor() {
    this.recognizer = null;
  }

  async initialize(streamInfo) {
    if (!config.azure?.speechKey) {
      throw new Error('Azure Speech key not configured');
    }

    const sdk = require('microsoft-cognitiveservices-speech-sdk');
    
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      config.azure.speechKey,
      config.azure.speechRegion || 'eastus'
    );
    
    speechConfig.speechRecognitionLanguage = streamInfo.language;
    speechConfig.enableDictation();

    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    this.recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // Real-time recognition events
    this.recognizer.recognizing = (s, e) => {
      streamInfo.transcriptionCallback?.({
        text: e.result.text,
        confidence: null,
        isFinal: false,
        provider: 'azure',
        timestamp: new Date()
      });
    };

    this.recognizer.recognized = (s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        streamInfo.transcriptionCallback?.({
          text: e.result.text,
          confidence: e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult),
          isFinal: true,
          provider: 'azure',
          timestamp: new Date()
        });
      }
    };

    this.recognizer.startContinuousRecognitionAsync();
  }

  async processAudioChunk(audioChunk, streamInfo) {
    // Azure handles audio input automatically
  }

  async cleanup(streamInfo) {
    if (this.recognizer) {
      this.recognizer.stopContinuousRecognitionAsync();
      this.recognizer = null;
    }
  }

  isAvailable() {
    return !!config.azure?.speechKey;
  }

  getAccuracyRating() { return 8; } // 8/10 for Arabic
  getLatencyRating() { return 7; } // 7/10 speed
  getCostRating() { return 7; } // 7/10 cost-effective
}

// OpenAI Whisper Provider (Local/Self-hosted)
class WhisperProvider {
  constructor() {
    this.whisperProcess = null;
    this.audioBuffer = [];
  }

  async initialize(streamInfo) {
    // Check if Whisper is available locally
    try {
      const { spawn } = require('child_process');
      
      // Use whisper.cpp for real-time processing
      this.whisperProcess = spawn('whisper', [
        '--model', 'base',
        '--language', 'ar',
        '--output-format', 'json',
        '--real-time'
      ]);

      this.whisperProcess.stdout.on('data', (data) => {
        try {
          const result = JSON.parse(data.toString());
          streamInfo.transcriptionCallback?.({
            text: result.text,
            confidence: result.confidence || 0.8,
            isFinal: true,
            provider: 'whisper',
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Whisper parsing error:', error);
        }
      });

    } catch (error) {
      throw new Error('Whisper not available locally');
    }
  }

  async processAudioChunk(audioChunk, streamInfo) {
    if (this.whisperProcess && !this.whisperProcess.killed) {
      this.whisperProcess.stdin.write(audioChunk);
    }
  }

  async cleanup(streamInfo) {
    if (this.whisperProcess) {
      this.whisperProcess.kill();
      this.whisperProcess = null;
    }
  }

  isAvailable() {
    // Check if whisper command is available
    try {
      require('child_process').execSync('which whisper', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getAccuracyRating() { return 7; } // 7/10 for Arabic
  getLatencyRating() { return 9; } // 9/10 speed (local)
  getCostRating() { return 10; } // 10/10 cost-effective (free)
}

// AssemblyAI Provider (Good for real-time)
class AssemblyAIProvider {
  constructor() {
    this.socket = null;
  }

  async initialize(streamInfo) {
    if (!config.assemblyai?.apiKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    const WebSocket = require('ws');
    
    this.socket = new WebSocket('wss://api.assemblyai.com/v2/realtime/ws', {
      headers: {
        authorization: config.assemblyai.apiKey,
      },
    });

    this.socket.on('open', () => {
      console.log('AssemblyAI WebSocket connected');
      
      // Configure real-time transcription
      this.socket.send(JSON.stringify({
        sample_rate: 16000,
        language_code: 'ar'
      }));
    });

    this.socket.on('message', (message) => {
      const data = JSON.parse(message);
      
      if (data.message_type === 'PartialTranscript') {
        streamInfo.transcriptionCallback?.({
          text: data.text,
          confidence: data.confidence,
          isFinal: false,
          provider: 'assemblyai',
          timestamp: new Date()
        });
      } else if (data.message_type === 'FinalTranscript') {
        streamInfo.transcriptionCallback?.({
          text: data.text,
          confidence: data.confidence,
          isFinal: true,
          provider: 'assemblyai',
          timestamp: new Date()
        });
      }
    });
  }

  async processAudioChunk(audioChunk, streamInfo) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(audioChunk);
    }
  }

  async cleanup(streamInfo) {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isAvailable() {
    return !!config.assemblyai?.apiKey;
  }

  getAccuracyRating() { return 6; } // 6/10 for Arabic
  getLatencyRating() { return 9; } // 9/10 speed
  getCostRating() { return 8; } // 8/10 cost-effective
}

// AWS Transcribe Provider
class AWSTranscribeProvider {
  constructor() {
    this.transcribeStream = null;
  }

  async initialize(streamInfo) {
    if (!config.aws?.accessKeyId) {
      throw new Error('AWS credentials not configured');
    }

    const AWS = require('aws-sdk');
    AWS.config.update({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      region: config.aws.region || 'us-east-1'
    });

    const transcribeService = new AWS.TranscribeService();
    
    // AWS Transcribe streaming implementation
    // Note: AWS Transcribe streaming is more complex and requires additional setup
    console.log('AWS Transcribe initialized');
  }

  async processAudioChunk(audioChunk, streamInfo) {
    // AWS Transcribe streaming implementation
  }

  async cleanup(streamInfo) {
    // Cleanup AWS resources
  }

  isAvailable() {
    return !!config.aws?.accessKeyId;
  }

  getAccuracyRating() { return 7; } // 7/10 for Arabic
  getLatencyRating() { return 6; } // 6/10 speed
  getCostRating() { return 5; } // 5/10 cost-effective
}

// Munsit Provider (Best for Arabic real-time transcription)
class MunsitProvider {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.audioBuffer = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  async initialize(streamInfo) {
    if (!config.munsit?.apiKey) {
      throw new Error('Munsit API key not configured');
    }

    try {
      const io = require('socket.io-client');

      // Initialize socket connection with authentication
      this.socket = io('https://api.cntxt.tools', {
        transports: ['websocket'],
        query: {
          apiKey: config.munsit.apiKey
        },
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000
      });

      // Set up event listeners
      this.setupSocketListeners(streamInfo);

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Munsit connection timeout'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('Connected to Munsit socket server');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Munsit connection failed: ${error.message}`));
        });
      });

    } catch (error) {
      console.error('Munsit initialization error:', error);
      throw error;
    }
  }

  setupSocketListeners(streamInfo) {
    // Handle successful transcription
    this.socket.on('transcription', (data) => {
      try {
        // Munsit returns the full transcription text
        const transcriptionText = typeof data === 'string' ? data : data.text || data.transcription;

        if (transcriptionText && transcriptionText.trim()) {
          streamInfo.transcriptionCallback?.({
            text: transcriptionText.trim(),
            confidence: 0.95, // Munsit typically has high confidence for Arabic
            isFinal: true, // Munsit returns complete transcriptions
            provider: 'munsit',
            timestamp: new Date(),
            language: 'ar',
            wordTimestamps: data.timestamps || null
          });
        }
      } catch (error) {
        console.error('Munsit transcription parsing error:', error);
        streamInfo.errorCallback?.(error);
      }
    });

    // Handle transcription errors
    this.socket.on('transcription_error', (error) => {
      console.error('Munsit transcription error:', error);
      streamInfo.errorCallback?.(new Error(`Transcription error: ${error}`));
    });

    // Handle authentication errors
    this.socket.on('authentication_error', (error) => {
      console.error('Munsit authentication error:', error);
      streamInfo.errorCallback?.(new Error(`Authentication failed: ${error}`));
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Munsit socket server:', reason);
      this.isConnected = false;

      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnection(streamInfo);
      }
    });

    // Handle reconnection
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected to Munsit server (attempt ${attemptNumber})`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`Munsit reconnection error (attempt ${this.reconnectAttempts}):`, error);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        streamInfo.errorCallback?.(new Error('Failed to reconnect to Munsit server'));
      }
    });
  }

  async processAudioChunk(audioChunk, streamInfo) {
    if (!this.socket || !this.isConnected) {
      console.warn('Munsit socket not connected, buffering audio chunk');
      this.audioBuffer.push(audioChunk);
      return;
    }

    try {
      // Process buffered chunks first
      if (this.audioBuffer.length > 0) {
        for (const bufferedChunk of this.audioBuffer) {
          await this.sendAudioChunk(bufferedChunk);
        }
        this.audioBuffer = [];
      }

      // Process current chunk
      await this.sendAudioChunk(audioChunk);

    } catch (error) {
      console.error('Munsit audio processing error:', error);
      streamInfo.errorCallback?.(error);
    }
  }

  async sendAudioChunk(audioChunk) {
    if (!audioChunk || !this.socket || !this.isConnected) {
      return;
    }

    try {
      // Convert audio chunk to Uint8Array if needed
      let audioBuffer;
      if (audioChunk instanceof ArrayBuffer) {
        audioBuffer = Array.from(new Uint8Array(audioChunk));
      } else if (audioChunk instanceof Uint8Array) {
        audioBuffer = Array.from(audioChunk);
      } else if (Buffer.isBuffer(audioChunk)) {
        audioBuffer = Array.from(new Uint8Array(audioChunk));
      } else {
        console.warn('Unsupported audio chunk format for Munsit');
        return;
      }

      // Send audio chunk to Munsit
      this.socket.emit('audio_chunk', {
        audioBuffer: audioBuffer
      });

    } catch (error) {
      console.error('Error sending audio chunk to Munsit:', error);
      throw error;
    }
  }

  async cleanup(streamInfo) {
    try {
      // Clear audio buffer
      this.audioBuffer = [];

      // Send end signal and disconnect
      if (this.socket && this.isConnected) {
        this.socket.emit('end');
        this.socket.disconnect();
      }

      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;

      console.log('Munsit provider cleaned up');
    } catch (error) {
      console.error('Munsit cleanup error:', error);
    }
  }

  handleReconnection(streamInfo) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect to Munsit (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        if (this.socket && !this.isConnected) {
          this.socket.connect();
        }
      }, 1000 * this.reconnectAttempts);
    } else {
      streamInfo.errorCallback?.(new Error('Maximum reconnection attempts reached for Munsit'));
    }
  }

  isAvailable() {
    return !!config.munsit?.apiKey;
  }

  getAccuracyRating() {
    return 9; // 9/10 - Specialized for Arabic
  }

  getLatencyRating() {
    return 9; // 9/10 - Real-time WebSocket streaming
  }

  getCostRating() {
    return 7; // 7/10 - Competitive pricing for Arabic transcription
  }

  getLanguageSupport() {
    return ['ar', 'ar-SA', 'ar-EG', 'ar-JO', 'ar-AE', 'ar-MA']; // Arabic variants
  }

  getFeatures() {
    return {
      realTime: true,
      wordTimestamps: true,
      confidence: true,
      punctuation: true,
      arabicSpecialized: true,
      streaming: true
    };
  }
}

// Export singleton instance
const voiceRecognitionService = new VoiceRecognitionService();
module.exports = voiceRecognitionService;

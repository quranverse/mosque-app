// Voice Recognition Service for Mosque Translation App
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');

class VoiceRecognitionService {
  constructor() {
    this.activeStreams = new Map(); // sessionId -> stream info
    this.providers = {
      google: new GoogleSpeechProvider(),
      azure: new AzureSpeechProvider(),
      aws: new AWSTranscribeProvider(),
      whisper: new WhisperProvider(),
      assemblyai: new AssemblyAIProvider()
    };
    this.defaultProvider = 'google'; // Most accurate for Arabic
    this.fallbackProviders = ['azure', 'whisper']; // Fallback options
  }

  // Start voice recognition for a session
  async startVoiceRecognition(sessionId, mosqueId, options = {}) {
    try {
      const streamInfo = {
        sessionId,
        mosqueId,
        provider: options.provider || this.defaultProvider,
        language: options.language || 'ar-SA', // Arabic (Saudi Arabia)
        isActive: true,
        startedAt: new Date(),
        audioBuffer: [],
        transcriptionCallback: options.onTranscription,
        errorCallback: options.onError
      };

      // Initialize the selected provider
      const provider = this.providers[streamInfo.provider];
      if (!provider) {
        throw new Error(`Provider ${streamInfo.provider} not available`);
      }

      await provider.initialize(streamInfo);
      this.activeStreams.set(sessionId, streamInfo);

      console.log(`Voice recognition started for session ${sessionId} using ${streamInfo.provider}`);
      return { success: true, provider: streamInfo.provider };

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

  // Process audio chunk (real-time streaming)
  async processAudioChunk(sessionId, audioChunk, format = 'webm') {
    const streamInfo = this.activeStreams.get(sessionId);
    if (!streamInfo || !streamInfo.isActive) {
      throw new Error('Voice recognition not active for this session');
    }

    try {
      const provider = this.providers[streamInfo.provider];
      await provider.processAudioChunk(audioChunk, streamInfo);
    } catch (error) {
      console.error('Audio processing error:', error);
      
      // Try fallback provider on error
      await this.handleProviderError(sessionId, error);
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
      
      this.activeStreams.delete(sessionId);
      console.log(`Voice recognition stopped for session ${sessionId}`);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
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

// Export singleton instance
const voiceRecognitionService = new VoiceRecognitionService();
module.exports = voiceRecognitionService;

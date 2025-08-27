# 🎙️ Real-Time Audio Streaming Implementation

## Overview

This document describes the implementation of real-time audio streaming for the Mosque Translation App using `react-native-live-audio-stream`. This solution replaces the previous file-based recording approach with true real-time audio chunk streaming for <500ms latency translation.

## 🚀 Key Features

- **True Real-Time Streaming**: Audio chunks streamed every ~100-200ms
- **Low Latency**: <500ms end-to-end latency for mosque translation
- **Optimized for Voice**: 16kHz sample rate, mono channel, optimized for Arabic speech
- **Munsit Integration**: Direct integration with Munsit API for Arabic transcription
- **Multi-Language Translation**: Real-time translation to multiple languages
- **Fallback Support**: Legacy voice recognition as backup

## 🏗️ Architecture

### Frontend (React Native)
```
📱 RealTimeAudioStreamer Component
├── react-native-live-audio-stream (Audio capture)
├── Buffer (Base64 encoding/decoding)
├── react-native-permissions (Permission handling)
└── Socket.IO (Real-time communication)
```

### Backend (Node.js)
```
🖥️ Backend Services
├── Socket.IO Server (Real-time communication)
├── VoiceRecognitionService (Audio processing)
├── MunsitProvider (Arabic transcription)
└── MultiLanguageTranslationService (Translation)
```

## 📦 Dependencies

### Frontend Dependencies
```bash
npm install react-native-live-audio-stream buffer react-native-permissions expo-build-properties
```

### Required Permissions

#### iOS (Info.plist)
```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs access to your microphone for real-time voice translation during mosque broadcasts.</string>
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

#### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

## 🔧 Configuration

### Audio Configuration
```javascript
const audioConfig = {
  sampleRate: 16000,        // Optimized for speech
  channels: 1,              // Mono for voice
  bitsPerSample: 16,        // Good quality
  audioSource: 6,           // VOICE_RECOGNITION on Android
  bufferSize: 4096          // ~100-200ms chunks
};
```

### Socket Events

#### Frontend → Backend
- `realtime_audio_chunk`: Audio chunk data with metadata
- `start_broadcast`: Initialize streaming session
- `stop_broadcast`: End streaming session

#### Backend → Frontend
- `voice_transcription`: Real-time transcription results
- `translation_update`: Multi-language translations
- `voice_recognition_error`: Error notifications

## 🎯 Implementation Details

### 1. Audio Capture (Frontend)

The `RealTimeAudioStreamer` component handles:
- Microphone permission requests
- Audio stream initialization
- Real-time chunk processing
- Socket communication
- Visual feedback (wave animations)

Key methods:
- `startRealTimeStreaming()`: Begin audio capture
- `stopRealTimeStreaming()`: End audio capture
- `handleAudioChunk()`: Process incoming audio data

### 2. Audio Processing (Backend)

The backend processes audio chunks through:
- Socket event handling (`realtime_audio_chunk`)
- Voice recognition service integration
- Munsit API communication
- Multi-language translation
- Real-time broadcasting to clients

### 3. Munsit Integration

Direct integration with Munsit WebSocket API:
- Real-time Arabic transcription
- Optimized for mosque speech patterns
- High accuracy for religious content
- Low latency processing

## 📊 Performance Metrics

### Target Performance
- **Latency**: <500ms end-to-end
- **Chunk Size**: ~100-200ms audio chunks
- **Sample Rate**: 16kHz (optimized for voice)
- **Bandwidth**: ~32kbps per stream
- **Accuracy**: >90% for Arabic religious content

### Monitoring
- Chunk count tracking
- Duration monitoring
- Audio level visualization
- Error rate tracking
- Connection status monitoring

## 🔄 Data Flow

```
1. 🎤 Microphone → LiveAudioStream
2. 📦 Audio Chunk (Base64) → RealTimeAudioStreamer
3. 📡 Socket Emit → Backend Server
4. 🔄 Buffer Decode → VoiceRecognitionService
5. 🤖 Munsit API → Arabic Transcription
6. 🌐 Translation Service → Multiple Languages
7. 📢 Socket Broadcast → All Clients
8. 📱 UI Update → Real-time Display
```

## 🚨 Error Handling

### Common Issues & Solutions

#### 1. Permission Denied
```javascript
// Automatic retry with user-friendly prompts
if (!hasPermission) {
  const granted = await requestMicrophonePermission();
  if (!granted) {
    Alert.alert('Microphone Required', 'Please enable microphone access in settings');
  }
}
```

#### 2. Socket Disconnection
```javascript
// Automatic reconnection with buffering
if (!socket.connected) {
  console.warn('Socket disconnected, buffering audio chunks');
  audioBuffer.push(audioChunk);
}
```

#### 3. Audio Processing Errors
```javascript
// Graceful degradation to backup systems
try {
  await processRealTimeAudio();
} catch (error) {
  console.warn('Real-time processing failed, using backup');
  fallbackToLegacyRecording();
}
```

## 🧪 Testing

### Development Testing
1. **Emulator Testing**: Limited microphone support
2. **Device Testing**: Required for full functionality
3. **Network Testing**: Test with various connection qualities
4. **Latency Testing**: Measure end-to-end delays

### Production Testing
1. **Mosque Environment**: Test in actual mosque conditions
2. **Multiple Devices**: Test concurrent connections
3. **Background Mode**: Test iOS background audio
4. **Battery Impact**: Monitor power consumption

## 🚀 Deployment

### Expo Development Build
```bash
# Create development build (required for native modules)
npx expo prebuild
npx expo run:ios
npx expo run:android
```

### Production Build
```bash
# EAS Build for production
eas build --platform all
```

## 📈 Future Enhancements

### Planned Features
1. **Voice Activity Detection**: Only stream when speaking
2. **Noise Suppression**: Filter background noise
3. **Adaptive Bitrate**: Adjust quality based on connection
4. **Offline Caching**: Cache translations for offline viewing
5. **Multi-Speaker Support**: Identify different speakers

### Performance Optimizations
1. **Chunk Size Optimization**: Dynamic buffer sizing
2. **Compression**: Audio compression for bandwidth savings
3. **Edge Processing**: Local transcription for ultra-low latency
4. **CDN Integration**: Global content delivery

## 🔍 Troubleshooting

### Debug Commands
```bash
# Check audio permissions
adb shell pm list permissions | grep RECORD_AUDIO

# Monitor socket connections
npx expo start --dev-client --clear

# Test Munsit API
node backend/demo-munsit.js
```

### Common Solutions
1. **Clear Metro Cache**: `npx expo start --clear`
2. **Rebuild Native Modules**: `npx expo prebuild --clean`
3. **Check Permissions**: Verify microphone access in device settings
4. **Network Issues**: Test with different network conditions

## 📞 Support

For implementation support:
1. Check [Troubleshooting Guide](../Troubleshooting/)
2. Review [API Documentation](../API/)
3. Test with [Development Scripts](../Development/)

---

**This implementation provides true real-time audio streaming for mosque translation with <500ms latency! 🕌🎙️**

*Last updated: $(date)*

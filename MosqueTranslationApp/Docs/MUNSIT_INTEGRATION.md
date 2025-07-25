# Munsit API Integration Guide

## Overview

Munsit has been successfully integrated as the **default voice recognition provider** for the Mosque Translation App. Munsit specializes in real-time Arabic speech transcription with high accuracy and low latency, making it perfect for mosque broadcasts.

## Features

✅ **Real-time Arabic transcription** via WebSocket streaming  
✅ **High accuracy** (9/10) for Arabic speech recognition  
✅ **Low latency** (9/10) with streaming audio chunks  
✅ **Word-level timestamps** for precise transcription timing  
✅ **Automatic reconnection** with fallback to other providers  
✅ **Cost-effective** (7/10) pricing for Arabic transcription  

## Configuration

### 1. Environment Variables

Add these variables to `backend/.env`:

```env
# Munsit API (Arabic Speech Recognition - Default)
MUNSIT_API_KEY=your_munsit_api_key_here
MUNSIT_SOCKET_URL=https://api.cntxt.tools
MUNSIT_MODEL=munsit-1
VOICE_PROVIDER=munsit
```

### 2. Get Your API Key

1. Visit [Munsit Dashboard](https://api.cntxt.tools)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key to your `.env` file

## Implementation Details

### Provider Class: `MunsitProvider`

Located in `backend/services/VoiceRecognitionService.js`

**Key Features:**
- WebSocket connection to `https://api.cntxt.tools`
- Real-time audio streaming with 1-second chunks
- Automatic reconnection (up to 3 attempts)
- Audio buffer management during disconnections
- Word-level timestamp support

### Audio Format Support

Munsit accepts:
- **Primary**: WAV format (required for first chunk)
- **Secondary**: Raw PCM data
- **Chunk Size**: Recommended 1-second intervals
- **Sample Rate**: 16kHz (configurable)

### Integration Points

1. **VoiceRecognitionService**: Main service class
2. **WebSocket Server**: Real-time communication
3. **Frontend Components**: Audio capture and streaming
4. **Configuration**: Environment-based setup

## Usage

### Backend Usage

```javascript
const VoiceRecognitionService = require('./services/VoiceRecognitionService');

// Start voice recognition with Munsit (default)
const result = await VoiceRecognitionService.startVoiceRecognition(
  sessionId, 
  mosqueId, 
  {
    provider: 'munsit', // Optional - already default
    language: 'ar-SA',
    onTranscription: (transcription) => {
      console.log('Arabic text:', transcription.text);
      console.log('Confidence:', transcription.confidence);
      console.log('Word timestamps:', transcription.wordTimestamps);
    }
  }
);
```

### Frontend Usage

The existing `VoiceRecognitionComponent` automatically uses Munsit:

```javascript
// Start recording with Munsit (automatic)
await voiceRecognitionRef.current.startRecording({
  provider: 'munsit', // Optional - already default
  language: 'ar-SA',
  sessionId: currentSessionId
});
```

## Testing

### 1. Run Test Script

```bash
cd backend
node test-munsit.js
```

### 2. Expected Output

```
🔧 Testing Munsit API Integration...
📡 Socket URL: https://api.cntxt.tools
🔑 API Key: ✅ Configured
🚀 Connecting to Munsit socket server...
✅ Successfully connected to Munsit server
🧪 Testing audio chunk emission...
📤 Sent test audio chunk
🔌 Disconnected: client namespace disconnect
✅ Socket connection test passed
✅ Munsit provider found in VoiceRecognitionService
🎯 Default provider: munsit
✅ Munsit is set as default provider
🎉 All tests completed!
```

## Error Handling

### Common Issues

1. **Authentication Error**
   - Check API key in `.env` file
   - Verify key is valid and active

2. **Connection Timeout**
   - Check internet connection
   - Verify Munsit service status

3. **Audio Format Error**
   - Ensure first chunk is WAV format
   - Check audio encoding settings

### Fallback Providers

If Munsit fails, the system automatically falls back to:
1. Google Speech API
2. Azure Speech Services
3. Whisper (local)

## Performance Metrics

| Metric | Munsit | Google | Azure | Whisper |
|--------|--------|--------|-------|---------|
| **Accuracy (Arabic)** | 9/10 | 8/10 | 7/10 | 7/10 |
| **Latency** | 9/10 | 7/10 | 6/10 | 9/10 |
| **Cost** | 7/10 | 5/10 | 5/10 | 10/10 |
| **Real-time** | ✅ | ✅ | ✅ | ✅ |
| **Arabic Specialized** | ✅ | ❌ | ❌ | ❌ |

## API Limits

- **Duration**: 30 minutes per session
- **Concurrent**: Based on your plan
- **Rate Limits**: Check Munsit documentation

## Troubleshooting

### Debug Mode

Enable debug logging in `backend/.env`:

```env
LOG_LEVEL=debug
```

### Check Provider Status

```javascript
const providers = VoiceRecognitionService.getProviderStatus();
console.log(providers.find(p => p.name === 'munsit'));
```

### Manual Testing

Use the test script to verify connection:

```bash
node test-munsit.js
```

## Next Steps

1. **Set API Key**: Add your real Munsit API key
2. **Test Integration**: Run the test script
3. **Start Server**: Launch the backend server
4. **Test Frontend**: Use the voice recognition component
5. **Monitor Usage**: Check Munsit dashboard for usage stats

## Support

- **Munsit Documentation**: [API Docs](https://api.cntxt.tools/docs)
- **Integration Issues**: Check the test script output
- **Performance**: Monitor the provider status endpoint

# Audio Pipeline Debugging Guide

## 🔍 **Quick Debug Steps**

### **Step 1: Run the Debug Script**
```bash
cd MosqueTranslationApp
node debug_audio_pipeline.js
```

This will test:
- ✅ Server status and TTS availability
- ✅ Environment variables configuration
- ✅ TTS API functionality
- ✅ Arabic TTS support
- ✅ Audio recordings directory and file naming

### **Step 2: Check Backend Logs**
Start your backend with detailed logging:
```bash
cd backend
npm start
```

Look for these log messages:
- `🔊 TTS Convert Request:` - TTS API calls
- `📋 Recording details:` - Audio file naming info
- `✅ Audio recording saved successfully:` - File save confirmation

### **Step 3: Test TTS API Manually**
```bash
# Test basic TTS
curl -X POST http://localhost:3000/api/tts/test

# Test text conversion
curl -X POST http://localhost:3000/api/tts/convert \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "language": "en", "voice": "alloy"}'

# Test Arabic TTS
curl -X POST http://localhost:3000/api/tts/convert \
  -H "Content-Type: application/json" \
  -d '{"text": "السلام عليكم", "language": "ar", "voice": "alloy"}'
```

## 🐛 **Common Issues & Solutions**

### **Issue 1: Audio File Naming Not Working**

**Symptoms:**
- Files still named `recording_session_...` instead of `sermon_20240825_...`
- No recording type in filename

**Debug Steps:**
1. Check frontend console for recording options:
```javascript
console.log('🎙️ Starting recording with options:', options);
```

2. Check backend logs for recording details:
```javascript
console.log('📋 Recording details:', { recordingType, sessionType, fileName });
```

**Solution:**
- Ensure `selectedRecordingType` is properly passed from BroadcastingScreen
- Verify `generateRecordingFileName` function is called
- Check that recording options reach the backend

### **Issue 2: TTS API Not Working**

**Symptoms:**
- TTS conversion fails
- No audio files generated
- API returns errors

**Debug Steps:**
1. Check OpenAI API key:
```bash
# In backend/.env
OPENAI_API_KEY=sk-your-actual-key-here
```

2. Test TTS service availability:
```bash
curl http://localhost:3000/api/tts/test
```

3. Check backend logs for TTS errors:
```
❌ TTS conversion error: [error details]
```

**Common Solutions:**
- **Invalid API Key**: Update `OPENAI_API_KEY` in `.env`
- **Quota Exceeded**: Check OpenAI account billing
- **Network Issues**: Verify internet connection
- **Service Not Initialized**: Restart backend server

### **Issue 3: Audio Streaming Problems**

**Symptoms:**
- No real-time transcription
- Audio chunks not reaching backend
- Speech recognition not working

**Debug Steps:**
1. Check WebSocket connection:
```javascript
console.log('🔌 Socket connected:', socketRef.current?.connected);
```

2. Monitor audio chunk transmission:
```javascript
console.log('📤 Sent audio chunk:', audioData.length, 'bytes');
```

3. Check Munsit API configuration:
```bash
# In backend/.env
MUNSIT_API_KEY=sk-ctxt-9de6618a3e054955a311b2a1fffcbd02
MUNSIT_SOCKET_URL=https://api.cntxt.tools
```

## 🔧 **Configuration Checklist**

### **Backend Environment Variables**
```bash
# Required for TTS
OPENAI_API_KEY=sk-your-openai-key-here

# Required for Speech-to-Text
MUNSIT_API_KEY=sk-ctxt-9de6618a3e054955a311b2a1fffcbd02
MUNSIT_SOCKET_URL=https://api.cntxt.tools

# Optional alternatives
GOOGLE_SPEECH_API_KEY=your-google-key
AZURE_SPEECH_KEY=your-azure-key
```

### **Directory Structure**
```
MosqueTranslationApp/
├── backend/
│   ├── audio-recordings/
│   │   └── mosque_{id}/
│   │       ├── sermon_20240825_143022_abc123.m4a
│   │       └── prayer_20240825_150000_def456.m4a
│   └── services/
│       └── audio-output/
│           ├── tts_en_1234567890_abc123.mp3
│           └── tts_ar_1234567891_def456.mp3
```

## 📱 **Frontend Debugging**

### **Check Recording Type Selection**
1. Open BroadcastingScreen
2. Verify dropdown appears with 7 options
3. Select a recording type
4. Check console for:
```javascript
console.log('Selected recording type:', selectedRecordingType);
```

### **Monitor Audio Streaming**
1. Start broadcast
2. Check console for:
```javascript
console.log('📤 Sent real audio chunk to backend:', audioData.length, 'bytes');
```

### **Verify File Naming**
1. Check recording options passed to VoiceRecognitionComponent:
```javascript
console.log('🎙️ Started recording:', recordingFileName, 'Type:', recordingType);
```

## 🚨 **Error Messages & Solutions**

### **"TTS service not available"**
- Check `OPENAI_API_KEY` in backend/.env
- Verify OpenAI account has TTS access
- Restart backend server

### **"Audio recording permission not granted"**
- Enable microphone permissions in device settings
- For Android: Settings > Apps > [Your App] > Permissions > Microphone

### **"Munsit socket not connected"**
- Check `MUNSIT_API_KEY` configuration
- Verify internet connection
- Check firewall settings

### **"Recording already active for session"**
- Stop current recording before starting new one
- Clear app cache/data if issue persists

## 📊 **Success Indicators**

### **Audio File Naming Working:**
```
✅ Files named: sermon_20240825_143022_abc123.m4a
✅ Backend logs: "📋 Recording details: { recordingType: 'sermon' }"
✅ Directory: audio-recordings/mosque_{id}/
```

### **TTS API Working:**
```
✅ Test endpoint: GET /api/tts/test returns success
✅ Convert endpoint: POST /api/tts/convert creates audio file
✅ Audio files in: backend/services/audio-output/
```

### **Audio Streaming Working:**
```
✅ Frontend logs: "📤 Sent real audio chunk to backend"
✅ Backend logs: "📤 Sent audio chunk to Munsit"
✅ Real-time transcription appears in UI
```

## 🎯 **Next Steps After Debugging**

1. **If TTS is working**: Test with different languages and voices
2. **If file naming is working**: Verify files are properly organized
3. **If streaming is working**: Test real-time transcription accuracy
4. **If all working**: Test complete pipeline end-to-end

## 📞 **Getting Help**

If issues persist:
1. Run the debug script and share results
2. Check backend console logs for errors
3. Verify all environment variables are set
4. Test individual components separately

The debug script will give you a comprehensive overview of what's working and what needs attention! 🔍✨

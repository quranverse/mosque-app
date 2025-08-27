# Audio Pipeline Testing Guide

## ✅ **IMPLEMENTATION COMPLETE**

Your mosque app now has a complete audio pipeline with:
- **Recording Type Selection** before starting broadcasts
- **Improved Audio Streaming** to speech-to-text APIs
- **Text-to-Speech Integration** with OpenAI TTS
- **Enhanced Subtitle Display** with Arabic support

## 🎯 **What's Been Implemented**

### 1. **Recording Type Selection UI**
- ✅ Dropdown component for selecting recording type before broadcast
- ✅ 7 mosque activity types: Sermon, Prayer, Quran, Lecture, Talk, Dua, General
- ✅ Required selection before starting broadcast
- ✅ Visual indicator during live broadcast

### 2. **Smart Audio File Naming**
- ✅ Files named by type and date: `sermon_20240825_143022_abc123.m4a`
- ✅ Format: `{type}_{YYYYMMDD}_{HHMMSS}_{uniqueId}.{format}`
- ✅ Organized in mosque-specific folders: `mosque_{mosqueId}/`

### 3. **Enhanced Audio Streaming**
- ✅ Improved real-time audio chunk processing (500ms intervals)
- ✅ Better error handling and reconnection logic
- ✅ Sequence tracking for audio chunks
- ✅ Metadata support (sample rate, channels, format)

### 4. **Text-to-Speech Integration**
- ✅ OpenAI TTS API integration with multiple voices
- ✅ Support for 11 languages including Arabic
- ✅ Batch processing for multiple translations
- ✅ Audio caching and playback management
- ✅ REST API endpoints: `/api/tts/convert`, `/api/tts/batch`, `/api/tts/languages`

### 5. **Enhanced Subtitle Display**
- ✅ Better Arabic text support with RTL direction
- ✅ Separate styling for final vs partial transcriptions
- ✅ Provider badge and recording type indicator
- ✅ Typing indicator for real-time transcription
- ✅ Word count and duration statistics
- ✅ Auto-scrolling transcript view

## 🧪 **Testing the Complete Pipeline**

### **Step 1: Start the Backend**
```bash
cd MosqueTranslationApp/backend
npm start
```

### **Step 2: Start the Frontend**
```bash
cd MosqueTranslationApp/frontend
npm start
# or
expo start
```

### **Step 3: Test Recording Type Selection**
1. Navigate to Broadcasting Screen
2. Verify recording type dropdown appears
3. Select different types (Sermon, Prayer, etc.)
4. Try to start broadcast without selection (should show alert)
5. Select a type and start broadcast

### **Step 4: Test Audio Recording & Streaming**
1. Start broadcast with selected type
2. Speak in Arabic near microphone
3. Verify audio level indicators work
4. Check real-time transcription appears
5. Verify audio files are saved with correct naming

### **Step 5: Test Text-to-Speech**
1. Use API endpoint to test TTS:
```bash
curl -X POST http://localhost:3000/api/tts/convert \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test", "language": "en", "voice": "alloy"}'
```

2. Check generated audio file in `backend/services/audio-output/`
3. Test Arabic TTS:
```bash
curl -X POST http://localhost:3000/api/tts/convert \
  -H "Content-Type: application/json" \
  -d '{"text": "السلام عليكم ورحمة الله وبركاته", "language": "ar", "voice": "alloy"}'
```

### **Step 6: Verify File Organization**
Check that audio files are properly organized:
```
audio-recordings/
├── mosque_{mosqueId}/
│   ├── sermon_20240825_143022_abc123.m4a
│   ├── prayer_20240825_150000_def456.m4a
│   └── quran_20240825_160000_ghi789.m4a
```

## 🔧 **Configuration Requirements**

### **Environment Variables (.env)**
```bash
# Required for TTS
OPENAI_API_KEY=your_openai_api_key_here

# Required for Speech-to-Text
MUNSIT_API_KEY=sk-ctxt-9de6618a3e054955a311b2a1fffcbd02
MUNSIT_SOCKET_URL=https://api.cntxt.tools

# Optional alternatives
GOOGLE_SPEECH_API_KEY=your_google_speech_api_key
AZURE_SPEECH_KEY=your_azure_speech_key
```

## 📱 **UI Features**

### **Recording Type Selector**
- Appears before broadcast starts
- 7 Islamic activity types with emojis
- Required selection with validation
- Visual confirmation of selected type

### **Enhanced Transcription Display**
- **Provider Badge**: Shows which API is being used (MUNSIT, GOOGLE, etc.)
- **Recording Type Indicator**: Shows current activity type during broadcast
- **Final Transcriptions**: Green-bordered boxes with completed text
- **Partial Transcriptions**: Blue-bordered boxes with typing indicator
- **Arabic Support**: RTL text direction and proper font rendering
- **Statistics**: Word count and broadcast duration
- **Auto-scroll**: Automatically scrolls to latest transcription

### **Audio Controls**
- Visual audio level indicators
- Voice wave animations
- Recording status indicators
- Proper error handling and reconnection

## 🚀 **API Endpoints**

### **Text-to-Speech**
- `POST /api/tts/convert` - Convert single text to speech
- `POST /api/tts/batch` - Convert multiple translations to speech
- `GET /api/tts/languages` - Get supported languages and voices
- `GET /api/audio/tts/{filename}` - Serve TTS audio files

### **Audio Files**
- `GET /api/audio/recordings/{filename}` - Serve recorded audio files

## 🎵 **Audio File Naming Convention**

### **Format**: `{type}_{date}_{time}_{uniqueId}.{format}`

### **Examples**:
- `sermon_20240825_143022_abc123.m4a` - Friday sermon
- `prayer_20240825_120000_def456.m4a` - Prayer session
- `quran_20240825_160000_ghi789.m4a` - Quran recitation
- `lecture_20240825_190000_jkl012.m4a` - Islamic lecture

### **Recording Types**:
- `sermon` - Friday Sermon (Khutbah)
- `prayer` - Prayer Session (Salah)
- `quran` - Quran Recitation (Tilawah)
- `lecture` - Islamic Lecture (Dars)
- `talk` - Islamic Talk (Bayan)
- `dua` - Dua Session
- `general` - General Broadcast

## ✅ **Success Indicators**

1. **Recording Type Selection**: Dropdown appears and requires selection
2. **Audio Streaming**: Real-time chunks sent every 500ms to backend
3. **Speech Recognition**: Arabic text appears in real-time
4. **File Naming**: Audio files saved with proper naming convention
5. **TTS Integration**: Text converted to speech via OpenAI API
6. **Subtitle Display**: Enhanced UI with Arabic support and animations

## 🔍 **Troubleshooting**

### **No Audio Recording**
- Check microphone permissions
- Verify expo-av is properly installed
- Check console for audio initialization errors

### **No Speech Recognition**
- Verify Munsit API key is configured
- Check WebSocket connection to backend
- Ensure audio chunks are being sent

### **TTS Not Working**
- Verify OpenAI API key is set
- Check `/api/tts/languages` endpoint
- Verify audio output directory exists

### **File Naming Issues**
- Check recording type is properly passed to backend
- Verify AudioRecordingService.generateRecordingPath method
- Check file permissions in audio-recordings directory

## 🎉 **Complete Audio Pipeline Flow**

1. **User selects recording type** (Sermon, Prayer, etc.)
2. **Starts broadcast** with proper filename generation
3. **Audio streams** in real-time to speech-to-text API
4. **Arabic transcription** appears with enhanced UI
5. **Translations generated** for multiple languages
6. **Text-to-speech** converts translations to audio
7. **Audio files saved** with organized naming convention

Your mosque translation app now has a complete, production-ready audio pipeline! 🕌✨

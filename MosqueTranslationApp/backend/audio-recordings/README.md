# Audio Recordings Storage

This directory stores all audio recordings from mosque broadcasting sessions.

## Directory Structure

```
audio-recordings/
├── mosque_[mosque_id]/
│   ├── recording_[session_id]_[timestamp].m4a
│   ├── recording_[session_id]_[timestamp].m4a
│   └── ...
├── mosque_[mosque_id]/
│   └── ...
└── README.md
```

## File Naming Convention

- **Format**: `recording_[session_id]_[timestamp].m4a`
- **Example**: `recording_687979e29bd27fe81941daa2_1753400160741.m4a`

## Storage Features

- ✅ Real-time audio streaming from mobile app
- ✅ Automatic file organization by mosque
- ✅ Database metadata storage
- ✅ Audio chunk streaming support
- ✅ Complete file storage on recording completion

## File Formats Supported

- **Primary**: `.m4a` (AAC encoding)
- **Fallback**: `.webm`, `.wav`

## Database Integration

Each audio file is stored with metadata in MongoDB:
- Recording ID
- Session ID
- Mosque ID
- File path and size
- Duration and format
- Provider information
- Device information

## Real-time Processing

Audio files are processed for:
- Voice recognition (Munsit API)
- Real-time translation
- Live transcription display

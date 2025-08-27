# 🚀 Quick Setup Guide - German-First Translation App

## ⚡ **5-Minute Setup**

### **1. Environment Configuration**
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your keys:
```bash
# Speech-to-Text (Required)
MUNSIT_API_KEY=sk-ctxt-9de6618a3e054955a311b2a1fffcbd02

# Translation (Required)
GOOGLE_TRANSLATE_API_KEY=AIzaSyCh_your_key_here

# Language Settings
DEFAULT_USER_LANGUAGE=de
SUPPORTED_LANGUAGES=de,en,fr,es,it,pt,ru,tr,ar
```

### **2. Start Everything**
```bash
# Backend
cd backend && npm install && npm start

# Frontend (new terminal)
cd frontend && npm install && npm start
```

## 🌍 **Language Features**

### **German-First Experience**
- ✅ New users default to German
- ✅ Dual subtitles: German + English
- ✅ Easy language switching
- ✅ Religious context understanding

### **Supported Languages**
```
🇩🇪 German (de) - Default
🇬🇧 English (en) - Common secondary
🇫🇷 French (fr)
🇪🇸 Spanish (es)
🇮🇹 Italian (it)
🇵🇹 Portuguese (pt)
🇷🇺 Russian (ru)
🇹🇷 Turkish (tr)
🇸🇦 Arabic (ar) - Source
```

## 🔧 **Translation Providers**

### **Smart Provider System**
```
Primary: Google Translate ✅
Backup: Azure Translator (optional)
Premium: OpenAI (optional)
```

### **Automatic Fallback**
```
Try Google → Try Azure → Try OpenAI → Show Error
```

## 📱 **API Testing**

### **Test Translation**
```bash
curl -X POST http://localhost:8080/api/translation/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "السلام عليكم ورحمة الله وبركاته",
    "targetLanguage": "de"
  }'
```

### **Test User Preferences**
```bash
curl -X GET http://localhost:8080/api/user/language-preferences \
  -H "x-user-id: test-user"
```

### **Enable Dual Subtitles**
```bash
curl -X POST http://localhost:8080/api/user/dual-subtitles/enable \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"secondaryLanguage": "en"}'
```

## 🎯 **Complete Workflow**

```
🎤 Imam speaks Arabic
    ↓ (Munsit STT)
📝 Arabic text transcription
    ↓ (Google Translate)
🇩🇪 German translation
🇬🇧 English translation (if dual enabled)
    ↓
📱 User sees both languages
```

## 🏗️ **Architecture Benefits**

### **For Users**
- German-first experience
- Dual subtitle support
- Reliable translations
- Easy language switching

### **For Developers**
- Clean provider architecture
- Easy to add new providers
- Automatic fallback system
- User preference management

### **For Mosque**
- Multiple translation providers
- Cost-effective operation
- High-quality religious translations
- Scalable for many users

## 🔍 **Troubleshooting**

### **Translation Not Working**
```bash
# Test providers
curl -X POST http://localhost:8080/api/translation/test

# Check logs
tail -f backend/logs/app.log
```

### **Languages Not Showing**
```bash
# Check supported languages
curl http://localhost:8080/api/languages/supported

# Verify environment
echo $SUPPORTED_LANGUAGES
```

### **User Preferences Not Saving**
```bash
# Check database connection
curl http://localhost:8080/api/status

# Test user preferences
curl -X GET http://localhost:8080/api/user/language-preferences \
  -H "x-user-id: test-user"
```

## ✅ **Success Indicators**

### **Backend Working**
- ✅ Server starts on port 8080
- ✅ Translation providers initialized
- ✅ Database connected
- ✅ API endpoints responding

### **Translation Working**
- ✅ Arabic text → German translation
- ✅ Dual subtitles (German + English)
- ✅ Provider fallback working
- ✅ User preferences saved

### **Frontend Working**
- ✅ App loads in German
- ✅ Language selector available
- ✅ Dual subtitle toggle works
- ✅ Real-time translations display

## 🎉 **You're Ready!**

Your mosque translation app now has:
1. **German-first user experience** 🇩🇪
2. **Dual subtitle support** (German + English)
3. **Multiple translation providers** with fallback
4. **Clean, maintainable architecture**
5. **User preference management**

The system automatically handles user language preferences and provides reliable translations! 🕌✨

## 📚 **Next Steps**

- Read [TRANSLATION_ARCHITECTURE.md](./TRANSLATION_ARCHITECTURE.md) for detailed architecture
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference
- See [VOICE_RECOGNITION_GUIDE.md](./VOICE_RECOGNITION_GUIDE.md) for STT setup

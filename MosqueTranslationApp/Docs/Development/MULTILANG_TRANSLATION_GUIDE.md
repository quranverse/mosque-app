# 🌍 Multi-Language Translation System Guide

## 📋 Overview

The Mosque Translation App now supports comprehensive multi-language translation with simultaneous subtitle display, allowing users to receive Friday speeches and prayers in their preferred languages with advanced customization options.

## 🎯 Key Features

### ✅ **Comprehensive Language Support**
- **26+ Languages**: Arabic, English, German, French, Spanish, Turkish, Urdu, Persian, Chinese, Japanese, and more
- **Language Groups**: European, Asian, Islamic, African, Popular
- **RTL Support**: Arabic, Urdu, Persian, Kurdish scripts
- **Language Details**: Script type, language family, direction support

### ✅ **Dual Subtitle System**
- **Primary Language**: User's main translation language
- **Secondary Language**: Optional second language for dual display
- **Simultaneous Display**: Show German + English, French + Arabic, etc.
- **Real-time Switching**: Change languages during live sessions

### ✅ **Advanced Customization**
- **Font Settings**: Size, weight, line height for each language
- **Color Themes**: Custom colors for primary/secondary text
- **Display Options**: Overlay, sidebar, bottom, popup positioning
- **Speed Control**: Slow, normal, fast translation display

### ✅ **Community Translation**
- **Multiple Translators**: Different people can translate to different languages
- **Quality Control**: Mosque admins can verify translations
- **Confidence Scoring**: Translation quality indicators
- **Real-time Collaboration**: Live translation by community members

## 🌐 Supported Languages

### **Popular Languages**
- English, German, French, Spanish, Turkish, Urdu

### **European Languages**
- German, French, Spanish, Italian, Dutch, Portuguese, Russian, Albanian, Bosnian

### **Asian Languages**
- Chinese, Japanese, Korean, Hindi, Bengali, Tamil, Thai, Malay, Indonesian

### **Islamic Languages**
- Arabic, Urdu, Turkish, Persian, Kurdish, Pashto

### **African Languages**
- Swahili, Hausa, Amharic, Somali

## 🔧 API Endpoints

### **Language Management**
```http
GET /api/translation/languages
```
Get all supported languages with details and groupings.

### **Translation Preferences**
```http
PUT /api/translation/preferences
Content-Type: application/json
Authorization: Bearer <token>

{
  "primaryLanguage": "German",
  "secondaryLanguage": "English",
  "showDualSubtitles": true,
  "translationSpeed": "normal",
  "translationDisplay": "bottom",
  "fontSettings": {
    "primaryFontSize": "large",
    "secondaryFontSize": "medium",
    "fontWeight": "bold"
  },
  "colorSettings": {
    "primaryTextColor": "#000000",
    "secondaryTextColor": "#666666",
    "backgroundColor": "#FFFFFF",
    "highlightColor": "#2E7D32"
  }
}
```

### **Session Translations**
```http
GET /api/translation/session/{sessionId}?limit=50&languages=German,French
Authorization: Bearer <token>
```
Get translations formatted according to user preferences.

### **Add Translation**
```http
POST /api/translation/session/{sessionId}/translate
Content-Type: application/json
Authorization: Bearer <token>

{
  "translationId": "trans_123",
  "language": "German",
  "text": "Im Namen Allahs, des Allerbarmers, des Barmherzigen",
  "confidence": 0.95
}
```

## 📡 WebSocket Events

### **For Mosque Admins (Broadcasters)**

#### Send Original Translation
```javascript
socket.emit('send_original_translation', {
  originalText: 'بسم الله الرحمن الرحيم',
  context: 'quran',
  metadata: { surahNumber: 1, ayahNumber: 1 }
}, (response) => {
  console.log('Translation ID:', response.translationId);
});
```

### **For Translators**

#### Register as Translator
```javascript
socket.emit('register_translator', {
  language: 'German'
}, (response) => {
  if (response.success) {
    console.log('Registered as German translator');
  }
});
```

#### Send Language Translation
```javascript
socket.emit('send_language_translation', {
  translationId: 'trans_123',
  language: 'German',
  text: 'Im Namen Allahs, des Allerbarmers, des Barmherzigen',
  confidence: 0.95
}, (response) => {
  console.log('Translation sent');
});
```

### **For All Users**

#### Update Language Preferences
```javascript
socket.emit('update_language_preferences', {
  primaryLanguage: 'French',
  secondaryLanguage: 'Arabic',
  showDualSubtitles: true
}, (response) => {
  console.log('Preferences updated');
});
```

### **Received Events**

#### Original Translation
```javascript
socket.on('original_translation', (data) => {
  console.log('New text to translate:', data.originalText);
  console.log('Target languages:', data.targetLanguages);
});
```

#### Language Translation Update
```javascript
socket.on('language_translation_update', (data) => {
  console.log(`${data.language} translation:`, data.text);
  // Update UI with new translation
});
```

## 💻 Frontend Integration Examples

### **React Native Component Example**

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import io from 'socket.io-client';

const MultiLanguageTranslation = ({ sessionId, userToken }) => {
  const [translations, setTranslations] = useState([]);
  const [userPrefs, setUserPrefs] = useState({
    primaryLanguage: 'German',
    secondaryLanguage: 'English',
    showDualSubtitles: true
  });

  useEffect(() => {
    const socket = io('http://localhost:3001');
    
    // Authenticate
    socket.emit('authenticate', { token: userToken });
    
    // Listen for translations
    socket.on('language_translation_update', (data) => {
      setTranslations(prev => {
        const updated = [...prev];
        const existing = updated.find(t => t.id === data.translationId);
        
        if (existing) {
          existing.translations[data.language] = {
            text: data.text,
            confidence: data.confidence
          };
        }
        
        return updated;
      });
    });

    return () => socket.disconnect();
  }, []);

  const renderTranslation = (translation) => (
    <View key={translation.id} style={styles.translationContainer}>
      {/* Original Arabic Text */}
      <Text style={styles.arabicText}>{translation.originalText}</Text>
      
      {/* Primary Language */}
      {translation.translations[userPrefs.primaryLanguage] && (
        <Text style={styles.primaryTranslation}>
          {translation.translations[userPrefs.primaryLanguage].text}
        </Text>
      )}
      
      {/* Secondary Language (if dual subtitles enabled) */}
      {userPrefs.showDualSubtitles && 
       translation.translations[userPrefs.secondaryLanguage] && (
        <Text style={styles.secondaryTranslation}>
          {translation.translations[userPrefs.secondaryLanguage].text}
        </Text>
      )}
    </View>
  );

  return (
    <ScrollView>
      {translations.map(renderTranslation)}
    </ScrollView>
  );
};
```

### **Language Selector Component**

```javascript
const LanguageSelector = ({ onLanguageChange, supportedLanguages }) => {
  const [selectedPrimary, setSelectedPrimary] = useState('English');
  const [selectedSecondary, setSelectedSecondary] = useState(null);
  const [showDual, setShowDual] = useState(false);

  const handlePrimaryChange = (language) => {
    setSelectedPrimary(language);
    onLanguageChange({
      primaryLanguage: language,
      secondaryLanguage: selectedSecondary,
      showDualSubtitles: showDual
    });
  };

  return (
    <View>
      <Text>Primary Language:</Text>
      <Picker
        selectedValue={selectedPrimary}
        onValueChange={handlePrimaryChange}
      >
        {supportedLanguages.map(lang => (
          <Picker.Item key={lang} label={lang} value={lang} />
        ))}
      </Picker>
      
      <Switch
        value={showDual}
        onValueChange={setShowDual}
      />
      <Text>Show Dual Subtitles</Text>
      
      {showDual && (
        <Picker
          selectedValue={selectedSecondary}
          onValueChange={setSelectedSecondary}
        >
          {supportedLanguages.map(lang => (
            <Picker.Item key={lang} label={lang} value={lang} />
          ))}
        </Picker>
      )}
    </View>
  );
};
```

## 🧪 Testing

### **Run Multi-Language Tests**
```bash
# Start server
npm run dev

# In another terminal, run multi-language tests
node test-multilang.js
```

### **Test Scenarios Covered**
1. **Language Support**: Verify all 26+ languages are supported
2. **User Preferences**: Test dual subtitle configuration
3. **Real-time Translation**: Test live translation flow
4. **Multiple Translators**: Test community translation
5. **Quality Control**: Test translation verification
6. **WebSocket Events**: Test all socket events

## 🎨 UI/UX Considerations

### **Dual Subtitle Display**
- **Primary Language**: Larger font, prominent color
- **Secondary Language**: Smaller font, secondary color
- **Spacing**: Adequate spacing between languages
- **RTL Support**: Proper text direction for Arabic/Urdu

### **Language Switching**
- **Quick Access**: Easy language switching during live sessions
- **Visual Indicators**: Show available languages
- **Smooth Transitions**: Animated language changes

### **Accessibility**
- **Font Scaling**: Support for different font sizes
- **High Contrast**: Color options for better readability
- **Voice Over**: Screen reader support for translations

## 🚀 Production Deployment

### **Performance Optimization**
- **Caching**: Cache translations for repeated content
- **Compression**: Compress translation data
- **CDN**: Use CDN for static language resources

### **Scalability**
- **Load Balancing**: Distribute translation load
- **Database Indexing**: Optimize translation queries
- **Real-time Scaling**: Handle multiple concurrent sessions

## 📈 Analytics & Monitoring

### **Translation Metrics**
- **Language Usage**: Track most requested languages
- **Translation Quality**: Monitor confidence scores
- **User Engagement**: Track dual subtitle usage
- **Performance**: Monitor translation latency

---

**The multi-language translation system is now ready to serve diverse Muslim communities worldwide with their preferred languages and customization options!**

**May Allah bless this project and make it beneficial for Muslims of all languages! 🤲**

*"And among His signs is the creation of the heavens and the earth, and the diversity of your languages and colors. In this are signs for those who know." - Quran 30:22*

// Multi-Language Translation System Test Script
const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

class MultiLanguageTranslationTester {
  constructor() {
    this.tokens = {};
    this.sockets = {};
    this.sessionId = null;
  }

  async runTests() {
    console.log('🌍 Testing Multi-Language Translation System...\n');

    try {
      // Test 1: Get supported languages
      await this.testSupportedLanguages();

      // Test 2: Create mosque account and individual users
      await this.setupTestAccounts();

      // Test 3: Test translation preferences
      await this.testTranslationPreferences();

      // Test 4: Start translation session
      await this.testTranslationSession();

      // Test 5: Test multi-language translation
      await this.testMultiLanguageTranslation();

      // Test 6: Test dual subtitle preferences
      await this.testDualSubtitles();

      console.log('\n🎉 All multi-language translation tests passed!');

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    } finally {
      // Clean up sockets
      Object.values(this.sockets).forEach(socket => {
        if (socket.connected) socket.disconnect();
      });
    }
  }

  async testSupportedLanguages() {
    console.log('1. Testing supported languages...');
    
    const response = await axios.get(`${BASE_URL}/translation/languages`);
    
    if (!response.data.success) {
      throw new Error('Failed to get supported languages');
    }

    const { languages, languageGroups, languageDetails } = response.data.data;
    
    console.log(`   ✅ ${languages.length} languages supported`);
    console.log(`   ✅ Language groups: ${Object.keys(languageGroups).join(', ')}`);
    console.log(`   ✅ Popular languages: ${languageGroups.Popular.join(', ')}`);
    
    // Verify specific languages
    const testLanguages = ['German', 'French', 'Spanish', 'Turkish', 'Urdu'];
    testLanguages.forEach(lang => {
      if (!languages.includes(lang)) {
        throw new Error(`Language ${lang} not supported`);
      }
      if (!languageDetails[lang]) {
        throw new Error(`Language details missing for ${lang}`);
      }
    });
    
    console.log('   ✅ Key languages verified with details\n');
  }

  async setupTestAccounts() {
    console.log('2. Setting up test accounts...');

    // Create mosque account
    const mosqueData = {
      email: 'multilang@testmosque.com',
      password: 'password123',
      userType: 'mosque',
      mosqueName: 'Multi-Language Test Mosque',
      mosqueAddress: '123 Translation Street, Berlin, Germany',
      latitude: 52.5200,
      longitude: 13.4050,
      madhab: 'Hanafi',
      prayerTimeMethod: 'MoonsightingCommittee',
      servicesOffered: ['Live Translation', 'Friday Speeches'],
      languagesSupported: ['Arabic', 'German', 'English', 'Turkish', 'French'],
      capacity: 300
    };

    const mosqueResponse = await axios.post(`${BASE_URL}/auth/register-mosque`, mosqueData);
    this.tokens.mosque = mosqueResponse.data.token;
    console.log('   ✅ Mosque account created');

    // Create individual users with different language preferences
    const users = [
      { deviceId: 'german_user_001', primaryLang: 'German', secondaryLang: 'English' },
      { deviceId: 'french_user_002', primaryLang: 'French', secondaryLang: 'Arabic' },
      { deviceId: 'spanish_user_003', primaryLang: 'Spanish', secondaryLang: 'English' }
    ];

    for (const userData of users) {
      const response = await axios.post(`${BASE_URL}/auth/register-individual`, {
        deviceId: userData.deviceId,
        preferences: {
          interfaceLanguage: userData.primaryLang,
          translationLanguage: userData.primaryLang
        }
      });
      this.tokens[userData.deviceId] = response.data.token;
      console.log(`   ✅ Individual user created: ${userData.primaryLang}`);
    }

    console.log();
  }

  async testTranslationPreferences() {
    console.log('3. Testing translation preferences...');

    const germanUserToken = this.tokens.german_user_001;

    // Test setting dual subtitle preferences
    const preferences = {
      primaryLanguage: 'German',
      secondaryLanguage: 'English',
      showDualSubtitles: true,
      translationSpeed: 'normal',
      translationDisplay: 'bottom',
      fontSettings: {
        primaryFontSize: 'large',
        secondaryFontSize: 'medium',
        fontWeight: 'bold'
      },
      colorSettings: {
        primaryTextColor: '#000000',
        secondaryTextColor: '#666666',
        backgroundColor: '#FFFFFF',
        highlightColor: '#2E7D32'
      }
    };

    const updateResponse = await axios.put(`${BASE_URL}/translation/preferences`, preferences, {
      headers: { Authorization: `Bearer ${germanUserToken}` }
    });

    if (!updateResponse.data.success) {
      throw new Error('Failed to update translation preferences');
    }

    // Verify preferences were saved
    const getResponse = await axios.get(`${BASE_URL}/translation/preferences`, {
      headers: { Authorization: `Bearer ${germanUserToken}` }
    });

    const savedPrefs = getResponse.data.data;
    if (savedPrefs.primaryLanguage !== 'German' || !savedPrefs.showDualSubtitles) {
      throw new Error('Translation preferences not saved correctly');
    }

    console.log('   ✅ Dual subtitle preferences set');
    console.log('   ✅ Font and color settings configured');
    console.log('   ✅ Preferences saved and retrieved successfully\n');
  }

  async testTranslationSession() {
    console.log('4. Testing translation session setup...');

    // Create WebSocket connections
    this.sockets.mosque = io(SOCKET_URL);
    this.sockets.germanUser = io(SOCKET_URL);
    this.sockets.frenchUser = io(SOCKET_URL);

    // Wait for connections
    await this.waitForConnection(this.sockets.mosque);
    await this.waitForConnection(this.sockets.germanUser);
    await this.waitForConnection(this.sockets.frenchUser);

    // Authenticate sockets
    await this.authenticateSocket(this.sockets.mosque, this.tokens.mosque);
    await this.authenticateSocket(this.sockets.germanUser, this.tokens.german_user_001);
    await this.authenticateSocket(this.sockets.frenchUser, this.tokens.french_user_002);

    // Start translation session
    const sessionData = await this.startSession(this.sockets.mosque, {
      mosqueId: 'test-mosque-id',
      deviceId: 'mosque-device-001',
      languages: ['German', 'English', 'French', 'Spanish', 'Turkish'],
      userType: 'mosque'
    });

    this.sessionId = sessionData.sessionId;
    console.log('   ✅ Translation session started');
    console.log(`   ✅ Session ID: ${this.sessionId}`);
    console.log('   ✅ Target languages: German, English, French, Spanish, Turkish\n');
  }

  async testMultiLanguageTranslation() {
    console.log('5. Testing multi-language translation...');

    // Register translators for different languages
    await this.registerTranslator(this.sockets.germanUser, 'German');
    await this.registerTranslator(this.sockets.frenchUser, 'French');
    console.log('   ✅ Translators registered for German and French');

    // Send original Arabic text
    const originalText = 'بسم الله الرحمن الرحيم. الحمد لله رب العالمين';
    const translationResult = await this.sendOriginalTranslation(this.sockets.mosque, {
      originalText,
      context: 'quran',
      metadata: { surahNumber: 1, ayahNumbers: [1, 2] }
    });

    console.log('   ✅ Original Arabic text sent');

    // Add German translation
    await this.sendLanguageTranslation(this.sockets.germanUser, {
      translationId: translationResult.translationId,
      language: 'German',
      text: 'Im Namen Allahs, des Allerbarmers, des Barmherzigen. Alles Lob gebührt Allah, dem Herrn der Welten',
      confidence: 0.95
    });

    // Add French translation
    await this.sendLanguageTranslation(this.sockets.frenchUser, {
      translationId: translationResult.translationId,
      language: 'French',
      text: 'Au nom d\'Allah, le Tout Miséricordieux, le Très Miséricordieux. Louange à Allah, Seigneur de l\'univers',
      confidence: 0.92
    });

    console.log('   ✅ German translation added');
    console.log('   ✅ French translation added');

    // Test getting translations with user preferences
    const translationsResponse = await axios.get(
      `${BASE_URL}/translation/session/${this.sessionId}?limit=10`,
      { headers: { Authorization: `Bearer ${this.tokens.german_user_001}` } }
    );

    const translations = translationsResponse.data.data.translations;
    if (translations.length === 0) {
      throw new Error('No translations found');
    }

    const translation = translations[0];
    if (!translation.translations.primary || translation.translations.primary.language !== 'German') {
      throw new Error('Primary language translation not found');
    }

    console.log('   ✅ Translations retrieved with user preferences');
    console.log(`   ✅ Primary language: ${translation.translations.primary.language}`);
    console.log();
  }

  async testDualSubtitles() {
    console.log('6. Testing dual subtitle functionality...');

    // Get translations for user with dual subtitles enabled
    const response = await axios.get(
      `${BASE_URL}/translation/session/${this.sessionId}?limit=10`,
      { headers: { Authorization: `Bearer ${this.tokens.german_user_001}` } }
    );

    const translations = response.data.data.translations;
    const translation = translations[0];

    // Check if dual subtitles are provided
    if (!translation.translations.primary) {
      throw new Error('Primary translation missing');
    }

    if (!translation.translations.secondary) {
      throw new Error('Secondary translation missing for dual subtitle user');
    }

    console.log('   ✅ Dual subtitles working correctly');
    console.log(`   ✅ Primary: ${translation.translations.primary.language}`);
    console.log(`   ✅ Secondary: ${translation.translations.secondary.language}`);

    // Test available languages
    if (!translation.availableLanguages || translation.availableLanguages.length < 2) {
      throw new Error('Available languages not provided');
    }

    console.log(`   ✅ Available languages: ${translation.availableLanguages.map(l => l.language).join(', ')}`);
    console.log();
  }

  // Helper methods
  async waitForConnection(socket) {
    return new Promise((resolve) => {
      if (socket.connected) {
        resolve();
      } else {
        socket.on('connect', resolve);
      }
    });
  }

  async authenticateSocket(socket, token) {
    return new Promise((resolve, reject) => {
      socket.emit('authenticate', { token }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Socket authentication failed'));
        }
      });
    });
  }

  async startSession(socket, data) {
    return new Promise((resolve, reject) => {
      socket.emit('start_session', data, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Failed to start session'));
        }
      });
    });
  }

  async registerTranslator(socket, language) {
    return new Promise((resolve, reject) => {
      socket.emit('register_translator', { language }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(`Failed to register translator for ${language}`));
        }
      });
    });
  }

  async sendOriginalTranslation(socket, data) {
    return new Promise((resolve, reject) => {
      socket.emit('send_original_translation', data, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Failed to send original translation'));
        }
      });
    });
  }

  async sendLanguageTranslation(socket, data) {
    return new Promise((resolve, reject) => {
      socket.emit('send_language_translation', data, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error('Failed to send language translation'));
        }
      });
    });
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new MultiLanguageTranslationTester();
  tester.runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = MultiLanguageTranslationTester;

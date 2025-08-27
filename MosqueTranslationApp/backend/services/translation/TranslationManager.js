// Translation Manager - Dynamic provider system that supports multiple translation APIs
const GoogleTranslateProvider = require('./GoogleTranslateProvider');
const AzureTranslateProvider = require('./AzureTranslateProvider');
const OpenAITranslateProvider = require('./OpenAITranslateProvider');

class TranslationManager {
  constructor(config) {
    this.config = config;
    this.providers = new Map();
    this.fallbackOrder = ['google', 'azure', 'openai'];
    this.defaultProvider = 'google';
    this.isInitialized = false;
  }

  // Initialize all available providers
  async initialize() {
    try {
      console.log('🔄 Initializing Translation Manager...');

      // Initialize Google Translate if configured
      if (this.config.google?.translateApiKey) {
        try {
          const googleProvider = new GoogleTranslateProvider(this.config.google);
          await googleProvider.initialize();
          this.providers.set('google', googleProvider);
          console.log('✅ Google Translate provider ready');
        } catch (error) {
          console.warn('⚠️ Google Translate provider failed to initialize:', error.message);
        }
      }

      // Initialize Azure Translator if configured
      if (this.config.azure?.subscriptionKey) {
        try {
          const azureProvider = new AzureTranslateProvider(this.config.azure);
          await azureProvider.initialize();
          this.providers.set('azure', azureProvider);
          console.log('✅ Azure Translator provider ready');
        } catch (error) {
          console.warn('⚠️ Azure Translator provider failed to initialize:', error.message);
        }
      }

      // Initialize OpenAI Translation if configured
      if (this.config.openai?.apiKey) {
        try {
          const openaiProvider = new OpenAITranslateProvider(this.config.openai);
          await openaiProvider.initialize();
          this.providers.set('openai', openaiProvider);
          console.log('✅ OpenAI Translation provider ready');
        } catch (error) {
          console.warn('⚠️ OpenAI Translation provider failed to initialize:', error.message);
        }
      }

      // Set default provider to first available
      if (this.providers.size > 0) {
        for (const providerName of this.fallbackOrder) {
          if (this.providers.has(providerName)) {
            this.defaultProvider = providerName;
            break;
          }
        }
      }

      this.isInitialized = true;
      console.log(`✅ Translation Manager initialized with ${this.providers.size} providers`);
      console.log(`🎯 Default provider: ${this.defaultProvider}`);

      return {
        success: true,
        providersCount: this.providers.size,
        availableProviders: Array.from(this.providers.keys()),
        defaultProvider: this.defaultProvider
      };

    } catch (error) {
      console.error('❌ Translation Manager initialization failed:', error);
      throw error;
    }
  }

  // Translate text using specified provider or fallback chain
  async translate(text, targetLanguage, sourceLanguage = 'ar', options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Translation Manager not initialized');
      }

      const preferredProvider = options.provider || this.defaultProvider;
      const providersToTry = this.getProviderFallbackChain(preferredProvider);

      let lastError = null;

      // Try providers in fallback order
      for (const providerName of providersToTry) {
        const provider = this.providers.get(providerName);
        
        if (!provider || !provider.isAvailable()) {
          console.log(`⚠️ Provider ${providerName} not available, trying next...`);
          continue;
        }

        try {
          console.log(`🔄 Attempting translation with ${providerName}...`);
          const result = await provider.translate(text, targetLanguage, sourceLanguage, options);
          
          if (result.success) {
            console.log(`✅ Translation successful with ${providerName}`);
            return result;
          } else {
            lastError = result.error;
            console.log(`❌ Translation failed with ${providerName}:`, result.error.message);
          }
        } catch (error) {
          lastError = error;
          console.log(`❌ Provider ${providerName} threw error:`, error.message);
        }
      }

      // All providers failed
      throw new Error(`All translation providers failed. Last error: ${lastError?.message || 'Unknown error'}`);

    } catch (error) {
      console.error('❌ Translation Manager translate failed:', error);
      return {
        success: false,
        error: {
          message: error.message,
          type: 'translation_failed',
          timestamp: new Date()
        }
      };
    }
  }

  // Batch translate multiple texts
  async batchTranslate(texts, targetLanguage, sourceLanguage = 'ar', options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Translation Manager not initialized');
      }

      const preferredProvider = options.provider || this.defaultProvider;
      const providersToTry = this.getProviderFallbackChain(preferredProvider);

      let lastError = null;

      // Try providers in fallback order
      for (const providerName of providersToTry) {
        const provider = this.providers.get(providerName);
        
        if (!provider || !provider.isAvailable()) {
          continue;
        }

        try {
          console.log(`🔄 Attempting batch translation with ${providerName}...`);
          const result = await provider.batchTranslate(texts, targetLanguage, sourceLanguage, options);
          
          if (result.success) {
            console.log(`✅ Batch translation successful with ${providerName}`);
            return result;
          } else {
            lastError = result.error;
          }
        } catch (error) {
          lastError = error;
        }
      }

      throw new Error(`All translation providers failed for batch translation. Last error: ${lastError?.message || 'Unknown error'}`);

    } catch (error) {
      console.error('❌ Translation Manager batchTranslate failed:', error);
      return {
        success: false,
        error: {
          message: error.message,
          type: 'batch_translation_failed',
          timestamp: new Date()
        }
      };
    }
  }

  // Detect language of text
  async detectLanguage(text, options = {}) {
    try {
      const preferredProvider = options.provider || this.defaultProvider;
      const provider = this.providers.get(preferredProvider);

      if (provider && provider.isAvailable()) {
        return await provider.detectLanguage(text);
      }

      // Try fallback providers
      for (const [providerName, provider] of this.providers) {
        if (provider.isAvailable()) {
          try {
            return await provider.detectLanguage(text);
          } catch (error) {
            console.log(`Language detection failed with ${providerName}:`, error.message);
          }
        }
      }

      throw new Error('No available providers for language detection');

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get provider fallback chain
  getProviderFallbackChain(preferredProvider) {
    const chain = [preferredProvider];
    
    // Add other providers in fallback order
    for (const provider of this.fallbackOrder) {
      if (provider !== preferredProvider && this.providers.has(provider)) {
        chain.push(provider);
      }
    }

    return chain;
  }

  // Get all available providers
  getAvailableProviders() {
    const providers = [];
    
    for (const [name, provider] of this.providers) {
      providers.push({
        name,
        isAvailable: provider.isAvailable(),
        supportedLanguages: provider.getSupportedLanguages(),
        stats: provider.getStats()
      });
    }

    return providers;
  }

  // Get provider statistics
  getStats() {
    const stats = {
      totalProviders: this.providers.size,
      availableProviders: 0,
      defaultProvider: this.defaultProvider,
      providers: {}
    };

    for (const [name, provider] of this.providers) {
      stats.providers[name] = provider.getStats();
      if (provider.isAvailable()) {
        stats.availableProviders++;
      }
    }

    return stats;
  }

  // Test all providers
  async testAllProviders() {
    const results = {};
    const testText = 'Hello, this is a test.';

    for (const [name, provider] of this.providers) {
      try {
        const startTime = Date.now();
        const result = await provider.translate(testText, 'ar', 'en');
        const endTime = Date.now();

        results[name] = {
          success: result.success,
          responseTime: endTime - startTime,
          error: result.success ? null : result.error
        };
      } catch (error) {
        results[name] = {
          success: false,
          responseTime: null,
          error: error.message
        };
      }
    }

    return results;
  }

  // Set default provider
  setDefaultProvider(providerName) {
    if (this.providers.has(providerName)) {
      this.defaultProvider = providerName;
      console.log(`🎯 Default provider changed to: ${providerName}`);
      return true;
    }
    return false;
  }

  // Check if any provider is available
  hasAvailableProvider() {
    for (const provider of this.providers.values()) {
      if (provider.isAvailable()) {
        return true;
      }
    }
    return false;
  }
}

module.exports = TranslationManager;

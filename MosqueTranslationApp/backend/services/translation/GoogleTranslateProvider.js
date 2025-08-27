// Google Translate Provider - Implements TranslationProviderInterface
const TranslationProviderInterface = require('./TranslationProviderInterface');
const { Translate } = require('@google-cloud/translate').v2;

class GoogleTranslateProvider extends TranslationProviderInterface {
  constructor(config) {
    super('google', config);
    
    this.translate = null;
    this.supportedLanguages = [
      'en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 
      'hi', 'ur', 'tr', 'fa', 'he', 'sw', 'nl', 'sv', 'da', 'no'
    ];
    
    // Google Translate rate limits
    this.rateLimits = {
      requestsPerMinute: 1000,
      charactersPerRequest: 30000, // Google allows up to 30k characters
      charactersPerMonth: 500000
    };
  }

  async initialize() {
    try {
      if (!this.config.translateApiKey) {
        throw new Error('Google Translate API key not configured');
      }

      // Initialize Google Translate client
      this.translate = new Translate({
        key: this.config.translateApiKey,
        projectId: this.config.projectId
      });

      // Test the connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('✅ Google Translate provider initialized successfully');
      
      return { success: true, provider: this.name };

    } catch (error) {
      console.error('❌ Google Translate initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async testConnection() {
    try {
      // Test with a simple translation
      const [translation] = await this.translate.translate('Hello', {
        from: 'en',
        to: 'ar'
      });
      
      if (!translation) {
        throw new Error('Google Translate test failed - no response');
      }
      
      console.log('✅ Google Translate connection test passed');
      return true;
      
    } catch (error) {
      console.error('❌ Google Translate connection test failed:', error);
      throw new Error(`Google Translate connection test failed: ${error.message}`);
    }
  }

  async translate(text, targetLanguage, sourceLanguage = 'ar', options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Google Translate provider not available');
      }

      // Check rate limits
      this.checkRateLimit(text.length);

      const startTime = Date.now();

      // Perform translation
      const [translation, metadata] = await this.translate.translate(text, {
        from: sourceLanguage,
        to: targetLanguage,
        format: options.format || 'text',
        model: options.model || 'base'
      });

      const processingTime = Date.now() - startTime;

      // Update usage
      this.updateUsage(text.length, this.estimateCost(text.length));

      // Format response
      const result = this.formatResponse(
        translation,
        text,
        targetLanguage,
        sourceLanguage,
        {
          confidence: this.estimateConfidence(metadata),
          processingTime,
          cost: this.estimateCost(text.length),
          model: options.model || 'base',
          detectedLanguage: metadata?.detectedSourceLanguage || sourceLanguage
        }
      );

      // Validate result
      this.validateTranslationResult(result, text);

      console.log(`✅ Google Translate: ${sourceLanguage} → ${targetLanguage} (${text.length} chars, ${processingTime}ms)`);
      return result;

    } catch (error) {
      return this.handleError(error, `translate(${sourceLanguage} → ${targetLanguage})`);
    }
  }

  async batchTranslate(texts, targetLanguage, sourceLanguage = 'ar', options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Google Translate provider not available');
      }

      const totalLength = texts.join('').length;
      this.checkRateLimit(totalLength);

      const startTime = Date.now();

      // Perform batch translation
      const [translations, metadata] = await this.translate.translate(texts, {
        from: sourceLanguage,
        to: targetLanguage,
        format: options.format || 'text',
        model: options.model || 'base'
      });

      const processingTime = Date.now() - startTime;

      // Update usage
      this.updateUsage(totalLength, this.estimateCost(totalLength));

      // Format batch results
      const results = translations.map((translation, index) => 
        this.formatResponse(
          translation,
          texts[index],
          targetLanguage,
          sourceLanguage,
          {
            confidence: this.estimateConfidence(metadata),
            processingTime: processingTime / texts.length,
            cost: this.estimateCost(texts[index].length),
            batchIndex: index,
            batchSize: texts.length
          }
        )
      );

      console.log(`✅ Google Translate Batch: ${texts.length} texts, ${totalLength} chars, ${processingTime}ms`);
      return {
        success: true,
        results,
        totalProcessingTime: processingTime,
        totalCost: this.estimateCost(totalLength),
        provider: this.name
      };

    } catch (error) {
      return this.handleError(error, `batchTranslate(${texts.length} texts)`);
    }
  }

  async detectLanguage(text) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Google Translate provider not available');
      }

      const [detection] = await this.translate.detect(text);
      
      return {
        success: true,
        language: detection.language,
        confidence: detection.confidence,
        provider: this.name
      };

    } catch (error) {
      return this.handleError(error, 'detectLanguage');
    }
  }

  // Estimate translation confidence based on metadata
  estimateConfidence(metadata) {
    if (metadata && metadata.confidence) {
      return metadata.confidence;
    }
    
    // Google Translate generally has high confidence
    // Estimate based on text characteristics
    return 0.92; // Default high confidence for Google
  }

  // Estimate cost based on character count
  estimateCost(characterCount) {
    // Google Translate pricing: $20 per 1M characters
    const costPerCharacter = 20 / 1000000;
    return characterCount * costPerCharacter;
  }

  // Get supported languages with names
  async getSupportedLanguagesWithNames() {
    try {
      if (!this.isAvailable()) {
        return this.supportedLanguages.map(code => ({ code, name: code }));
      }

      const [languages] = await this.translate.getLanguages();
      
      return languages.map(lang => ({
        code: lang.code,
        name: lang.name
      }));

    } catch (error) {
      console.error('Error getting supported languages:', error);
      return this.supportedLanguages.map(code => ({ code, name: code }));
    }
  }

  // Override hasValidConfig for Google-specific validation
  hasValidConfig() {
    return !!(this.config && this.config.translateApiKey);
  }
}

module.exports = GoogleTranslateProvider;

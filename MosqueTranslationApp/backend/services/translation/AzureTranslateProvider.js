// Azure Translator Provider - Implements TranslationProviderInterface
const TranslationProviderInterface = require('./TranslationProviderInterface');
const axios = require('axios');

class AzureTranslateProvider extends TranslationProviderInterface {
  constructor(config) {
    super('azure', config);
    
    this.endpoint = 'https://api.cognitive.microsofttranslator.com';
    this.supportedLanguages = [
      'en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 
      'hi', 'ur', 'tr', 'fa', 'he', 'sw', 'nl', 'sv', 'da', 'no'
    ];
    
    // Azure Translator rate limits
    this.rateLimits = {
      requestsPerMinute: 1000,
      charactersPerRequest: 50000, // Azure allows up to 50k characters
      charactersPerMonth: 2000000
    };
  }

  async initialize() {
    try {
      if (!this.config.subscriptionKey) {
        throw new Error('Azure Translator subscription key not configured');
      }

      // Test the connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('✅ Azure Translator provider initialized successfully');
      
      return { success: true, provider: this.name };

    } catch (error) {
      console.error('❌ Azure Translator initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async testConnection() {
    try {
      // Test with a simple translation
      const result = await this.translate('Hello', 'ar', 'en');
      
      if (!result.success) {
        throw new Error('Azure Translator test failed');
      }
      
      console.log('✅ Azure Translator connection test passed');
      return true;
      
    } catch (error) {
      console.error('❌ Azure Translator connection test failed:', error);
      throw new Error(`Azure Translator connection test failed: ${error.message}`);
    }
  }

  async translate(text, targetLanguage, sourceLanguage = 'ar', options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Azure Translator provider not available');
      }

      // Check rate limits
      this.checkRateLimit(text.length);

      const startTime = Date.now();

      // Prepare request
      const response = await axios.post(
        `${this.endpoint}/translate`,
        [{ text }],
        {
          params: {
            'api-version': '3.0',
            from: sourceLanguage,
            to: targetLanguage
          },
          headers: {
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
            'Ocp-Apim-Subscription-Region': this.config.region || 'global',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const processingTime = Date.now() - startTime;

      if (!response.data || !response.data[0] || !response.data[0].translations) {
        throw new Error('Invalid response from Azure Translator');
      }

      const translation = response.data[0].translations[0];
      
      // Update usage
      this.updateUsage(text.length, this.estimateCost(text.length));

      // Format response
      const result = this.formatResponse(
        translation.text,
        text,
        targetLanguage,
        sourceLanguage,
        {
          confidence: this.estimateConfidence(translation),
          processingTime,
          cost: this.estimateCost(text.length),
          detectedLanguage: response.data[0].detectedLanguage?.language || sourceLanguage
        }
      );

      // Validate result
      this.validateTranslationResult(result, text);

      console.log(`✅ Azure Translator: ${sourceLanguage} → ${targetLanguage} (${text.length} chars, ${processingTime}ms)`);
      return result;

    } catch (error) {
      return this.handleError(error, `translate(${sourceLanguage} → ${targetLanguage})`);
    }
  }

  async batchTranslate(texts, targetLanguage, sourceLanguage = 'ar', options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Azure Translator provider not available');
      }

      const totalLength = texts.join('').length;
      this.checkRateLimit(totalLength);

      const startTime = Date.now();

      // Prepare batch request
      const requestBody = texts.map(text => ({ text }));
      
      const response = await axios.post(
        `${this.endpoint}/translate`,
        requestBody,
        {
          params: {
            'api-version': '3.0',
            from: sourceLanguage,
            to: targetLanguage
          },
          headers: {
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
            'Ocp-Apim-Subscription-Region': this.config.region || 'global',
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const processingTime = Date.now() - startTime;

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid batch response from Azure Translator');
      }

      // Update usage
      this.updateUsage(totalLength, this.estimateCost(totalLength));

      // Format batch results
      const results = response.data.map((item, index) => {
        const translation = item.translations[0];
        return this.formatResponse(
          translation.text,
          texts[index],
          targetLanguage,
          sourceLanguage,
          {
            confidence: this.estimateConfidence(translation),
            processingTime: processingTime / texts.length,
            cost: this.estimateCost(texts[index].length),
            batchIndex: index,
            batchSize: texts.length,
            detectedLanguage: item.detectedLanguage?.language || sourceLanguage
          }
        );
      });

      console.log(`✅ Azure Translator Batch: ${texts.length} texts, ${totalLength} chars, ${processingTime}ms`);
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
        throw new Error('Azure Translator provider not available');
      }

      const response = await axios.post(
        `${this.endpoint}/detect`,
        [{ text }],
        {
          params: {
            'api-version': '3.0'
          },
          headers: {
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
            'Ocp-Apim-Subscription-Region': this.config.region || 'global',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data || !response.data[0]) {
        throw new Error('Invalid language detection response');
      }

      const detection = response.data[0];
      
      return {
        success: true,
        language: detection.language,
        confidence: detection.score,
        provider: this.name
      };

    } catch (error) {
      return this.handleError(error, 'detectLanguage');
    }
  }

  // Estimate translation confidence
  estimateConfidence(translation) {
    // Azure doesn't provide confidence scores directly
    // Estimate based on translation characteristics
    return 0.88; // Default good confidence for Azure
  }

  // Estimate cost based on character count
  estimateCost(characterCount) {
    // Azure Translator pricing: $10 per 1M characters
    const costPerCharacter = 10 / 1000000;
    return characterCount * costPerCharacter;
  }

  // Override hasValidConfig for Azure-specific validation
  hasValidConfig() {
    return !!(this.config && this.config.subscriptionKey);
  }
}

module.exports = AzureTranslateProvider;

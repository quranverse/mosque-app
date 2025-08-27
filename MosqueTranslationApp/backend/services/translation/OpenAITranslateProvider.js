// OpenAI Translation Provider - Implements TranslationProviderInterface
const TranslationProviderInterface = require('./TranslationProviderInterface');
const OpenAI = require('openai');

class OpenAITranslateProvider extends TranslationProviderInterface {
  constructor(config) {
    super('openai', config);
    
    this.openai = null;
    this.supportedLanguages = [
      'en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 
      'hi', 'ur', 'tr', 'fa', 'he', 'sw', 'nl', 'sv', 'da', 'no'
    ];
    
    // OpenAI rate limits (conservative estimates)
    this.rateLimits = {
      requestsPerMinute: 500,
      charactersPerRequest: 8000, // Conservative for context window
      charactersPerMonth: 1000000
    };
  }

  async initialize() {
    try {
      if (!this.config.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Initialize OpenAI client
      this.openai = new OpenAI({
        apiKey: this.config.apiKey
      });

      // Test the connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('✅ OpenAI Translation provider initialized successfully');
      
      return { success: true, provider: this.name };

    } catch (error) {
      console.error('❌ OpenAI Translation initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async testConnection() {
    try {
      // Test with a simple translation
      const result = await this.translate('Hello', 'ar', 'en');
      
      if (!result.success) {
        throw new Error('OpenAI Translation test failed');
      }
      
      console.log('✅ OpenAI Translation connection test passed');
      return true;
      
    } catch (error) {
      console.error('❌ OpenAI Translation connection test failed:', error);
      throw new Error(`OpenAI Translation connection test failed: ${error.message}`);
    }
  }

  async translate(text, targetLanguage, sourceLanguage = 'ar', options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('OpenAI Translation provider not available');
      }

      // Check rate limits
      this.checkRateLimit(text.length);

      const startTime = Date.now();

      // Create translation prompt
      const prompt = this.createTranslationPrompt(text, sourceLanguage, targetLanguage, options);

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator specializing in religious and cultural texts. Provide accurate, culturally sensitive translations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Low temperature for consistent translations
        max_tokens: Math.min(2000, text.length * 2), // Reasonable token limit
      });

      const processingTime = Date.now() - startTime;

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Invalid response from OpenAI');
      }

      const translatedText = response.choices[0].message.content.trim();
      
      // Update usage
      this.updateUsage(text.length, this.estimateCost(response.usage));

      // Format response
      const result = this.formatResponse(
        translatedText,
        text,
        targetLanguage,
        sourceLanguage,
        {
          confidence: this.estimateConfidence(response),
          processingTime,
          cost: this.estimateCost(response.usage),
          model: options.model || 'gpt-3.5-turbo',
          tokensUsed: response.usage?.total_tokens || 0
        }
      );

      // Validate result
      this.validateTranslationResult(result, text);

      console.log(`✅ OpenAI Translation: ${sourceLanguage} → ${targetLanguage} (${text.length} chars, ${processingTime}ms)`);
      return result;

    } catch (error) {
      return this.handleError(error, `translate(${sourceLanguage} → ${targetLanguage})`);
    }
  }

  async batchTranslate(texts, targetLanguage, sourceLanguage = 'ar', options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('OpenAI Translation provider not available');
      }

      const totalLength = texts.join('').length;
      this.checkRateLimit(totalLength);

      const startTime = Date.now();

      // Create batch translation prompt
      const prompt = this.createBatchTranslationPrompt(texts, sourceLanguage, targetLanguage, options);

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate each text separately and return them in the same order, separated by "|||".'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: Math.min(4000, totalLength * 2),
      });

      const processingTime = Date.now() - startTime;

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Invalid batch response from OpenAI');
      }

      // Parse batch results
      const translatedTexts = response.choices[0].message.content
        .split('|||')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (translatedTexts.length !== texts.length) {
        console.warn(`OpenAI batch translation count mismatch: expected ${texts.length}, got ${translatedTexts.length}`);
      }

      // Update usage
      this.updateUsage(totalLength, this.estimateCost(response.usage));

      // Format batch results
      const results = texts.map((originalText, index) => 
        this.formatResponse(
          translatedTexts[index] || `[Translation ${index + 1} missing]`,
          originalText,
          targetLanguage,
          sourceLanguage,
          {
            confidence: this.estimateConfidence(response),
            processingTime: processingTime / texts.length,
            cost: this.estimateCost(response.usage) / texts.length,
            batchIndex: index,
            batchSize: texts.length,
            model: options.model || 'gpt-3.5-turbo'
          }
        )
      );

      console.log(`✅ OpenAI Translation Batch: ${texts.length} texts, ${totalLength} chars, ${processingTime}ms`);
      return {
        success: true,
        results,
        totalProcessingTime: processingTime,
        totalCost: this.estimateCost(response.usage),
        provider: this.name
      };

    } catch (error) {
      return this.handleError(error, `batchTranslate(${texts.length} texts)`);
    }
  }

  async detectLanguage(text) {
    try {
      if (!this.isAvailable()) {
        throw new Error('OpenAI Translation provider not available');
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Detect the language of this text and respond with only the ISO 639-1 language code: "${text}"`
          }
        ],
        temperature: 0,
        max_tokens: 10
      });

      const detectedLanguage = response.choices[0].message.content.trim().toLowerCase();
      
      return {
        success: true,
        language: detectedLanguage,
        confidence: 0.85, // OpenAI doesn't provide confidence scores
        provider: this.name
      };

    } catch (error) {
      return this.handleError(error, 'detectLanguage');
    }
  }

  // Create translation prompt
  createTranslationPrompt(text, sourceLanguage, targetLanguage, options = {}) {
    const context = options.context || 'general';
    const isReligious = context === 'religious' || context === 'speech';
    
    let prompt = `Translate the following ${this.getLanguageName(sourceLanguage)} text to ${this.getLanguageName(targetLanguage)}`;
    
    if (isReligious) {
      prompt += '. This is religious content, so please maintain cultural sensitivity and accuracy';
    }
    
    prompt += `:\n\n"${text}"`;
    
    return prompt;
  }

  // Create batch translation prompt
  createBatchTranslationPrompt(texts, sourceLanguage, targetLanguage, options = {}) {
    const context = options.context || 'general';
    const isReligious = context === 'religious' || context === 'speech';
    
    let prompt = `Translate each of the following ${this.getLanguageName(sourceLanguage)} texts to ${this.getLanguageName(targetLanguage)}`;
    
    if (isReligious) {
      prompt += '. These are religious contents, so please maintain cultural sensitivity and accuracy';
    }
    
    prompt += '. Separate each translation with "|||":\n\n';
    
    texts.forEach((text, index) => {
      prompt += `${index + 1}. "${text}"\n`;
    });
    
    return prompt;
  }

  // Get language name from code
  getLanguageName(code) {
    const languages = {
      'ar': 'Arabic', 'en': 'English', 'fr': 'French', 'es': 'Spanish',
      'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian',
      'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese', 'hi': 'Hindi',
      'ur': 'Urdu', 'tr': 'Turkish', 'fa': 'Persian', 'he': 'Hebrew'
    };
    return languages[code] || code;
  }

  // Estimate translation confidence
  estimateConfidence(response) {
    // OpenAI doesn't provide confidence scores
    // Estimate based on response characteristics
    return 0.90; // Generally high confidence for OpenAI
  }

  // Estimate cost based on token usage
  estimateCost(usage) {
    if (!usage) return 0;
    
    // GPT-3.5-turbo pricing: $0.002 per 1K tokens
    const costPer1KTokens = 0.002;
    return (usage.total_tokens / 1000) * costPer1KTokens;
  }

  // Override hasValidConfig for OpenAI-specific validation
  hasValidConfig() {
    return !!(this.config && this.config.apiKey);
  }
}

module.exports = OpenAITranslateProvider;

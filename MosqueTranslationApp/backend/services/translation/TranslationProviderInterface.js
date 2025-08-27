// Translation Provider Interface - Base class for all translation providers
// This ensures all providers implement the same methods

class TranslationProviderInterface {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.isInitialized = false;
    this.supportedLanguages = [];
    this.rateLimits = {
      requestsPerMinute: 1000,
      charactersPerRequest: 5000,
      charactersPerMonth: 500000
    };
    this.usage = {
      requestsThisMinute: 0,
      charactersThisMonth: 0,
      lastReset: new Date()
    };
  }

  // Abstract methods that must be implemented by each provider
  async initialize() {
    throw new Error(`${this.name} provider must implement initialize() method`);
  }

  async translate(text, targetLanguage, sourceLanguage = 'ar', options = {}) {
    throw new Error(`${this.name} provider must implement translate() method`);
  }

  async batchTranslate(texts, targetLanguage, sourceLanguage = 'ar', options = {}) {
    throw new Error(`${this.name} provider must implement batchTranslate() method`);
  }

  async detectLanguage(text) {
    throw new Error(`${this.name} provider must implement detectLanguage() method`);
  }

  // Common methods available to all providers
  isAvailable() {
    return this.isInitialized && this.hasValidConfig();
  }

  hasValidConfig() {
    return !!this.config && Object.keys(this.config).length > 0;
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  // Rate limiting
  checkRateLimit(textLength = 0) {
    const now = new Date();
    const minutesSinceReset = (now - this.usage.lastReset) / (1000 * 60);

    // Reset counters if a minute has passed
    if (minutesSinceReset >= 1) {
      this.usage.requestsThisMinute = 0;
      this.usage.lastReset = now;
    }

    // Check limits
    if (this.usage.requestsThisMinute >= this.rateLimits.requestsPerMinute) {
      throw new Error(`Rate limit exceeded: ${this.rateLimits.requestsPerMinute} requests per minute`);
    }

    if (textLength > this.rateLimits.charactersPerRequest) {
      throw new Error(`Text too long: ${textLength} characters (max: ${this.rateLimits.charactersPerRequest})`);
    }

    if (this.usage.charactersThisMonth + textLength > this.rateLimits.charactersPerMonth) {
      throw new Error(`Monthly character limit exceeded`);
    }

    return true;
  }

  // Update usage counters
  updateUsage(textLength = 0, cost = 0) {
    this.usage.requestsThisMinute++;
    this.usage.charactersThisMonth += textLength;
  }

  // Get provider statistics
  getStats() {
    return {
      name: this.name,
      isAvailable: this.isAvailable(),
      supportedLanguages: this.supportedLanguages.length,
      usage: {
        requestsThisMinute: this.usage.requestsThisMinute,
        charactersThisMonth: this.usage.charactersThisMonth,
        rateLimits: this.rateLimits
      }
    };
  }

  // Validate translation result
  validateTranslationResult(result, originalText) {
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid translation result format');
    }

    const required = ['text', 'confidence', 'provider'];
    for (const field of required) {
      if (!(field in result)) {
        throw new Error(`Translation result missing required field: ${field}`);
      }
    }

    if (!result.text || result.text.trim().length === 0) {
      throw new Error('Translation result is empty');
    }

    if (result.confidence < 0 || result.confidence > 1) {
      throw new Error('Translation confidence must be between 0 and 1');
    }

    return true;
  }

  // Common error handling
  handleError(error, context = '') {
    const errorInfo = {
      provider: this.name,
      context,
      message: error.message,
      timestamp: new Date(),
      type: this.categorizeError(error)
    };

    console.error(`❌ ${this.name} Translation Error:`, errorInfo);
    
    // Return standardized error
    return {
      success: false,
      error: errorInfo,
      provider: this.name
    };
  }

  // Categorize errors for better handling
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('api key') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'authentication';
    }
    if (message.includes('rate limit') || message.includes('quota')) {
      return 'rate_limit';
    }
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('language') || message.includes('not supported')) {
      return 'language_support';
    }
    
    return 'unknown';
  }

  // Format translation response
  formatResponse(translatedText, originalText, targetLanguage, sourceLanguage, metadata = {}) {
    return {
      success: true,
      text: translatedText,
      originalText,
      sourceLanguage,
      targetLanguage,
      provider: this.name,
      confidence: metadata.confidence || 0.85,
      processingTime: metadata.processingTime || 0,
      cost: metadata.cost || 0,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        characterCount: originalText.length,
        wordCount: originalText.split(/\s+/).length
      }
    };
  }
}

module.exports = TranslationProviderInterface;

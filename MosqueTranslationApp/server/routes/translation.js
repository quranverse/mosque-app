// Multi-Language Translation routes for Mosque Translation App
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { 
  authenticateToken, 
  requireMosqueAdmin, 
  optionalAuth,
  createAuthRateLimit 
} = require('../middleware/auth');
const MultiLanguageTranslationService = require('../services/MultiLanguageTranslationService');
const Translation = require('../models/Translation');
const Session = require('../models/Session');
const User = require('../models/User');
const config = require('../config/config');

const router = express.Router();

// Rate limiting for translation endpoints
const translationRateLimit = createAuthRateLimit(1 * 60 * 1000, 100); // 100 requests per minute

// Validation middleware
const validateLanguage = (field) => {
  return body(field)
    .isIn(config.islamic.supportedLanguages)
    .withMessage(`${field} must be a supported language`);
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/translation/languages - Get supported languages
router.get('/languages', (req, res) => {
  try {
    const languageInfo = MultiLanguageTranslationService.getSupportedLanguages();
    
    res.json({
      success: true,
      data: languageInfo
    });
  } catch (error) {
    console.error('Error getting supported languages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported languages'
    });
  }
});

// GET /api/translation/session/:sessionId - Get translations for a session
router.get('/session/:sessionId',
  optionalAuth,
  translationRateLimit,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('languages').optional().isString().withMessage('Languages must be a comma-separated string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { limit = 50, languages } = req.query;
      const userId = req.userId;

      let translations;
      
      if (userId) {
        // Get formatted translations based on user preferences
        translations = await MultiLanguageTranslationService.getFormattedTranslationsForUser(
          sessionId, 
          userId, 
          parseInt(limit)
        );
      } else {
        // Get basic translations for anonymous users
        const rawTranslations = await Translation.find({ 
          sessionId, 
          status: 'active' 
        })
        .sort({ sequenceNumber: -1 })
        .limit(parseInt(limit));

        translations = rawTranslations.map(t => ({
          id: t.translationId,
          originalText: t.originalText,
          sequenceNumber: t.sequenceNumber,
          timestamp: t.timestamp,
          context: t.context,
          translations: t.translations.reduce((acc, trans) => {
            acc[trans.language] = {
              text: trans.text,
              confidence: trans.confidence
            };
            return acc;
          }, {}),
          availableLanguages: t.translations.map(trans => trans.language)
        }));
      }

      res.json({
        success: true,
        data: {
          translations,
          sessionId,
          totalCount: translations.length
        }
      });
    } catch (error) {
      console.error('Error getting session translations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session translations'
      });
    }
  }
);

// POST /api/translation/session/:sessionId/translate - Add translation for specific language
router.post('/session/:sessionId/translate',
  authenticateToken,
  translationRateLimit,
  [
    body('translationId').notEmpty().withMessage('Translation ID is required'),
    validateLanguage('language'),
    body('text').isLength({ min: 1, max: 5000 }).withMessage('Translation text must be between 1 and 5000 characters'),
    body('confidence').optional().isFloat({ min: 0, max: 1 }).withMessage('Confidence must be between 0 and 1')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { translationId, language, text, confidence } = req.body;
      const userId = req.userId;

      // Verify user has permission to translate (mosque admin or registered translator)
      const session = await Session.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Add the translation
      const updatedTranslation = await MultiLanguageTranslationService.addLanguageTranslation(
        translationId,
        language,
        text,
        userId,
        confidence
      );

      res.json({
        success: true,
        message: 'Translation added successfully',
        data: {
          translationId,
          language,
          text,
          confidence,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error adding translation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add translation'
      });
    }
  }
);

// PUT /api/translation/preferences - Update user translation preferences
router.put('/preferences',
  authenticateToken,
  [
    validateLanguage('primaryLanguage').optional(),
    validateLanguage('secondaryLanguage').optional(),
    body('showDualSubtitles').optional().isBoolean(),
    body('translationSpeed').optional().isIn(['slow', 'normal', 'fast']),
    body('translationDisplay').optional().isIn(['overlay', 'sidebar', 'bottom', 'popup']),
    body('fontSettings.primaryFontSize').optional().isIn(['small', 'medium', 'large', 'extra-large']),
    body('fontSettings.secondaryFontSize').optional().isIn(['small', 'medium', 'large', 'extra-large'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.userId;
      const preferences = req.body;

      // Update user preferences in database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update translation preferences
      user.translationPreferences = {
        ...user.translationPreferences,
        ...preferences
      };

      await user.save();

      // Update in-memory preferences for real-time use
      MultiLanguageTranslationService.setUserLanguagePreferences(userId, preferences);

      res.json({
        success: true,
        message: 'Translation preferences updated successfully',
        data: user.translationPreferences
      });
    } catch (error) {
      console.error('Error updating translation preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update translation preferences'
      });
    }
  }
);

// GET /api/translation/preferences - Get user translation preferences
router.get('/preferences',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user.translationPreferences || {}
      });
    } catch (error) {
      console.error('Error getting translation preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get translation preferences'
      });
    }
  }
);

// GET /api/translation/session/:sessionId/translators - Get active translators for session
router.get('/session/:sessionId/translators',
  optionalAuth,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const translators = MultiLanguageTranslationService.getSessionTranslators(sessionId);
      
      res.json({
        success: true,
        data: translators
      });
    } catch (error) {
      console.error('Error getting session translators:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session translators'
      });
    }
  }
);

// GET /api/translation/session/:sessionId/stats - Get translation statistics
router.get('/session/:sessionId/stats',
  optionalAuth,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const stats = await MultiLanguageTranslationService.getSessionTranslationStats(sessionId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting translation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get translation statistics'
      });
    }
  }
);

// POST /api/translation/:translationId/verify - Verify a translation (for quality control)
router.post('/:translationId/verify',
  authenticateToken,
  requireMosqueAdmin,
  [
    body('language').notEmpty().withMessage('Language is required'),
    body('isVerified').isBoolean().withMessage('Verification status is required'),
    body('quality.accuracy').optional().isInt({ min: 1, max: 5 }),
    body('quality.fluency').optional().isInt({ min: 1, max: 5 }),
    body('quality.clarity').optional().isInt({ min: 1, max: 5 })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { translationId } = req.params;
      const { language, isVerified, quality } = req.body;
      const userId = req.userId;

      const translation = await Translation.findOne({ translationId });
      if (!translation) {
        return res.status(404).json({
          success: false,
          message: 'Translation not found'
        });
      }

      // Find the specific language translation
      const langTranslation = translation.translations.find(t => t.language === language);
      if (!langTranslation) {
        return res.status(404).json({
          success: false,
          message: 'Translation for specified language not found'
        });
      }

      // Update verification status
      langTranslation.isVerified = isVerified;
      langTranslation.verifiedBy = userId;
      langTranslation.verifiedAt = new Date();
      
      if (quality) {
        langTranslation.quality = quality;
      }

      await translation.save();

      res.json({
        success: true,
        message: 'Translation verification updated successfully',
        data: {
          translationId,
          language,
          isVerified,
          verifiedAt: langTranslation.verifiedAt
        }
      });
    } catch (error) {
      console.error('Error verifying translation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify translation'
      });
    }
  }
);

module.exports = router;

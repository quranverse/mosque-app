// Authentication routes for Mosque Translation App
const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const { 
  authenticateToken, 
  createAuthRateLimit, 
  validateUserType 
} = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = createAuthRateLimit(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
const generalRateLimit = createAuthRateLimit(15 * 60 * 1000, 20); // 20 requests per 15 minutes

// Validation middleware
const validateMosqueRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('mosqueName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Mosque name must be between 2 and 100 characters'),
  body('mosqueAddress')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Mosque address must be between 5 and 200 characters'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive number')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const validateNewPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Helper function to handle validation errors
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

// POST /api/auth/register-mosque - Register a new mosque account
router.post('/register-mosque', 
  authRateLimit,
  validateUserType,
  validateMosqueRegistration,
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await AuthService.registerMosque(req.body);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Mosque registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/auth/register-individual - Register individual user
router.post('/register-individual',
  generalRateLimit,
  async (req, res) => {
    try {
      const { deviceId, preferences } = req.body;
      
      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: 'Device ID is required'
        });
      }
      
      const result = await AuthService.registerIndividual(deviceId, preferences);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Individual registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/auth/login - User login
router.post('/login',
  authRateLimit,
  validateLogin,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      
      res.json(result);
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/auth/refresh-token - Refresh JWT token
router.post('/refresh-token',
  generalRateLimit,
  async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }
      
      const result = await AuthService.refreshToken(refreshToken);
      
      res.json(result);
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET /api/auth/verify-email - Verify email address
router.get('/verify-email',
  generalRateLimit,
  async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }
      
      const result = await AuthService.verifyEmail(token);
      
      res.json(result);
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/auth/request-password-reset - Request password reset
router.post('/request-password-reset',
  authRateLimit,
  validatePasswordReset,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email } = req.body;
      const result = await AuthService.requestPasswordReset(email);
      
      res.json(result);
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password',
  authRateLimit,
  validateNewPassword,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, password } = req.body;
      const result = await AuthService.resetPassword(token, password);
      
      res.json(result);
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/auth/change-password - Change password (authenticated)
router.post('/change-password',
  authenticateToken,
  validatePasswordChange,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.userId, currentPassword, newPassword);
      
      res.json(result);
    } catch (error) {
      console.error('Password change error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/auth/logout - Logout user (placeholder for token blacklisting)
router.post('/logout',
  authenticateToken,
  async (req, res) => {
    try {
      // In a production app, you would blacklist the token here
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
);

// DELETE /api/auth/deactivate - Deactivate account
router.delete('/deactivate',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await AuthService.deactivateAccount(req.userId);
      
      res.json(result);
    } catch (error) {
      console.error('Account deactivation error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET /api/auth/profile - Get user profile
router.get('/profile',
  authenticateToken,
  async (req, res) => {
    try {
      const result = await AuthService.getUserProfile(req.userId);
      
      res.json(result);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET /api/auth/status - Check authentication status
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      res.json({
        success: true,
        authenticated: true,
        user: {
          id: req.user._id,
          email: req.user.email,
          userType: req.user.userType,
          isEmailVerified: req.user.isEmailVerified,
          mosqueName: req.user.mosqueName
        }
      });
    } catch (error) {
      console.error('Auth status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get authentication status'
      });
    }
  }
);

module.exports = router;

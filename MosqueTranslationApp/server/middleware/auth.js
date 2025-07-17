// Authentication middleware for Mosque Translation App
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    // Add user to request object
    req.user = user;
    req.userId = user._id;
    req.userType = user.userType;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user is a mosque admin
const requireMosqueAdmin = (req, res, next) => {
  if (req.userType !== 'mosque') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Mosque admin privileges required.'
    });
  }
  next();
};

// Middleware to check if user is an individual user
const requireIndividualUser = (req, res, next) => {
  if (req.userType !== 'individual') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Individual user privileges required.'
    });
  }
  next();
};

// Middleware to check if user owns the resource or is admin
const requireOwnershipOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId;
  
  if (req.userId.toString() !== resourceUserId && req.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });
  }
  next();
};

// Middleware to check if email is verified
const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required. Please verify your email address.'
    });
  }
  next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
        req.userType = user.userType;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Generate JWT token
const generateToken = (userId, userType) => {
  return jwt.sign(
    { 
      userId, 
      userType,
      iat: Math.floor(Date.now() / 1000)
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Middleware to update last login time
const updateLastLogin = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.userId, {
        lastLoginAt: new Date(),
        'analytics.lastActiveAt': new Date()
      });
    }
    next();
  } catch (error) {
    // Don't fail the request if updating last login fails
    console.error('Error updating last login:', error);
    next();
  }
};

// Rate limiting for authentication endpoints
const createAuthRateLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many authentication attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Middleware to validate user type in request
const validateUserType = (req, res, next) => {
  const { userType } = req.body;
  
  if (userType && !['mosque', 'individual'].includes(userType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user type. Must be either "mosque" or "individual".'
    });
  }
  
  next();
};

// Middleware to check if mosque profile is complete
const requireCompleteProfile = (req, res, next) => {
  if (req.userType === 'mosque') {
    const user = req.user;
    
    // Check required mosque fields
    if (!user.mosqueName || !user.mosqueAddress || !user.location) {
      return res.status(400).json({
        success: false,
        message: 'Mosque profile is incomplete. Please complete your profile first.'
      });
    }
    
    // Check required photos
    if (!user.photos || !user.photos.exterior || !user.photos.interior) {
      return res.status(400).json({
        success: false,
        message: 'Mosque photos are required. Please upload exterior and interior photos.'
      });
    }
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireMosqueAdmin,
  requireIndividualUser,
  requireOwnershipOrAdmin,
  requireEmailVerification,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  updateLastLogin,
  createAuthRateLimit,
  validateUserType,
  requireCompleteProfile
};

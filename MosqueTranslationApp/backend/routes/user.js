// User routes for Mosque Translation App
const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const config = require('../config/config');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = config.upload.uploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (config.upload.allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: fileFilter
});

// Middleware to handle validation errors
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

// GET /api/user/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// PUT /api/user/profile - Update user profile
router.put('/profile', 
  authenticateToken,
  [
    body('mosqueName').optional().isLength({ min: 2, max: 100 }),
    body('phone').optional().isMobilePhone(),
    body('website').optional().isURL(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const allowedUpdates = [
        'mosqueName', 'mosqueAddress', 'city', 'zipCode', 'country',
        'phone', 'website', 'madhab', 'prayerTimeMethod', 'servicesOffered',
        'languagesSupported', 'capacity', 'capacityWomen', 'capacityMen',
        'facilities', 'constructionYear', 'briefHistory', 'otherInfo', 'photos'
      ];
      
      const updates = {};
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const user = await User.findByIdAndUpdate(
        req.userId, 
        updates, 
        { new: true, runValidators: true }
      ).select('-password -refreshTokens');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }
);

// POST /api/user/upload-photos - Upload mosque photos
router.post('/upload-photos',
  authenticateToken,
  upload.fields([
    { name: 'exterior', maxCount: 1 },
    { name: 'interior', maxCount: 1 },
    { name: 'logo', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.userType !== 'mosque') {
        return res.status(403).json({
          success: false,
          message: 'Only mosque accounts can upload photos'
        });
      }

      const photos = {};

      // Process uploaded files
      if (req.files) {
        if (req.files.exterior && req.files.exterior[0]) {
          photos.exterior = `/uploads/${req.files.exterior[0].filename}`;
        }
        if (req.files.interior && req.files.interior[0]) {
          photos.interior = `/uploads/${req.files.interior[0].filename}`;
        }
        if (req.files.logo && req.files.logo[0]) {
          photos.logo = `/uploads/${req.files.logo[0].filename}`;
        }
      }

      // Update user photos
      const updatedUser = await User.findByIdAndUpdate(
        req.userId,
        {
          $set: {
            'photos.exterior': photos.exterior || user.photos?.exterior,
            'photos.interior': photos.interior || user.photos?.interior,
            'photos.logo': photos.logo || user.photos?.logo
          }
        },
        { new: true, runValidators: true }
      ).select('-password -refreshTokens');

      res.json({
        success: true,
        message: 'Photos uploaded successfully',
        photos: updatedUser.photos
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload photos'
      });
    }
  }
);

// GET /api/user/followed-mosques - Get user's followed mosques
router.get('/followed-mosques', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('followedMosques.mosqueId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get the actual mosque data for followed mosques
    const followedMosques = [];
    for (const followedMosque of user.followedMosques) {
      if (followedMosque.mosqueId) {
        const mosque = await User.findById(followedMosque.mosqueId).select('-password -refreshTokens');
        if (mosque && mosque.userType === 'mosque') {
          followedMosques.push({
            id: mosque._id,
            name: mosque.mosqueName,
            address: mosque.mosqueAddress,
            phone: mosque.phone,
            website: mosque.website,
            imam: mosque.imam,
            madhab: mosque.madhab,
            servicesOffered: mosque.servicesOffered || [],
            languagesSupported: mosque.languagesSupported || ['Arabic'],
            capacity: mosque.capacity,
            facilities: mosque.facilities || [],
            followers: mosque.analytics?.totalFollowers || 0,
            hasLiveTranslation: mosque.hasLiveTranslation || false,
            hasAccount: true,
            isFollowed: true,
            followedAt: followedMosque.followedAt
          });
        }
      }
    }

    res.json({
      success: true,
      followedMosques: followedMosques
    });
  } catch (error) {
    console.error('Get followed mosques error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get followed mosques'
    });
  }
});

// POST /api/user/followed-mosques - Follow/unfollow a mosque
router.post('/followed-mosques', 
  authenticateToken,
  [
    body('mosqueId').isMongoId().withMessage('Valid mosque ID is required'),
    body('action').isIn(['follow', 'unfollow']).withMessage('Action must be follow or unfollow')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { mosqueId, action } = req.body;
      
      // Check if mosque exists
      const mosque = await User.findById(mosqueId);
      if (!mosque || mosque.userType !== 'mosque') {
        return res.status(404).json({
          success: false,
          message: 'Mosque not found'
        });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is a mosque account - mosques shouldn't follow other mosques
      if (user.userType === 'mosque') {
        return res.status(403).json({
          success: false,
          message: 'Mosque accounts cannot follow other mosques. This feature is for individual users only.'
        });
      }

      if (action === 'follow') {
        // Check if already following
        const isAlreadyFollowing = user.followedMosques.some(
          fm => fm.mosqueId.toString() === mosqueId
        );

        if (isAlreadyFollowing) {
          return res.status(400).json({
            success: false,
            message: 'Already following this mosque'
          });
        }

        // Add to followed mosques
        user.followedMosques.push({
          mosqueId: mosqueId,
          followedAt: new Date()
        });

        // Update mosque analytics
        if (!mosque.analytics) {
          mosque.analytics = { totalFollowers: 0 };
        }
        mosque.analytics.totalFollowers = (mosque.analytics.totalFollowers || 0) + 1;
        await mosque.save();

        await user.save();

        res.json({
          success: true,
          message: 'Mosque followed successfully'
        });
      } else {
        // Unfollow
        const followIndex = user.followedMosques.findIndex(
          fm => fm.mosqueId.toString() === mosqueId
        );

        if (followIndex === -1) {
          return res.status(400).json({
            success: false,
            message: 'Not following this mosque'
          });
        }

        // Remove from followed mosques
        user.followedMosques.splice(followIndex, 1);

        // Update mosque analytics
        if (mosque.analytics && mosque.analytics.totalFollowers > 0) {
          mosque.analytics.totalFollowers -= 1;
          await mosque.save();
        }

        await user.save();

        res.json({
          success: true,
          message: 'Mosque unfollowed successfully'
        });
      }
    } catch (error) {
      console.error('Follow/unfollow mosque error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update mosque follow status'
      });
    }
  }
);

// GET /api/user/preferences - Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('preferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      preferences: user.preferences || {}
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user preferences'
    });
  }
});

// PUT /api/user/preferences - Update user preferences
router.put('/preferences', 
  authenticateToken,
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { preferences: req.body },
        { new: true, runValidators: true }
      ).select('preferences');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        preferences: user.preferences
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences'
      });
    }
  }
);

module.exports = router;

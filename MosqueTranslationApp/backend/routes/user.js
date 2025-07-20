// User routes for Mosque Translation App
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

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
        'mosqueName', 'mosqueAddress', 'phone', 'website', 
        'madhab', 'prayerTimeMethod', 'servicesOffered', 
        'languagesSupported', 'capacity', 'facilities',
        'constructionYear', 'briefHistory', 'otherInfo'
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

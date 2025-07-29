// Authentication service for Mosque Translation App
const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const EmailService = require('./EmailService');
const crypto = require('crypto');

class AuthService {
  // Register a new mosque account
  static async registerMosque(userData) {
    try {
      const {
        email,
        password,
        mosqueName,
        address,
        city,
        zipCode,
        country,
        phone,
        website,
        latitude,
        longitude,
        servicesOffered,
        languagesSupported,
        capacity,
        facilities,
        constructionYear,
        capacityWomen,
        capacityMen,
        briefHistory,
        otherInfo,
        photos
      } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Convert facilities object to array if needed
      let facilitiesArray = facilities;
      if (facilities && typeof facilities === 'object' && !Array.isArray(facilities)) {
        facilitiesArray = Object.keys(facilities)
          .filter(key => facilities[key])
          .map(key => {
            const facilityMap = {
              spaceForWomen: 'Space for women',
              ablutionsRoom: 'Ablutions room',
              adultCourses: 'Adult courses',
              childrenCourses: 'Children courses',
              disabledAccessibility: 'Disabled accessibility',
              library: 'Library',
              quranForBlind: 'Quran for blind people',
              salatAlJanaza: 'Salât al-Janaza',
              salatElEid: 'Salat El Eid',
              ramadanIftar: 'Ramadan iftar',
              parking: 'Parking',
              bikeParking: 'Bike parking',
              electricCarCharging: 'Electric car charging'
            };
            return facilityMap[key] || key;
          });
      }

      // Create new mosque user
      const user = new User({
        email: email.toLowerCase(),
        password,
        userType: 'mosque',
        mosqueName,
        mosqueAddress: address,
        city,
        zipCode,
        country,
        phone,
        website,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        servicesOffered: servicesOffered || [],
        languagesSupported: languagesSupported || ['Arabic', 'English'],
        capacity,
        capacityWomen: capacityWomen ? parseInt(capacityWomen) : undefined,
        capacityMen: capacityMen ? parseInt(capacityMen) : undefined,
        constructionYear: constructionYear ? parseInt(constructionYear) : undefined,
        briefHistory,
        otherInfo,
        facilities: facilitiesArray || [],
        photos: photos || {}
      });

      await user.save();

      // Generate email verification token
      const verificationToken = user.createEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(user.email, verificationToken, user.mosqueName);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail registration if email fails
      }

      // Generate JWT token
      const token = generateToken(user._id, user.userType);
      const refreshToken = generateRefreshToken(user._id);

      return {
        success: true,
        message: 'Mosque account created successfully. Please check your email for verification.',
        user: user.toJSON(),
        token,
        refreshToken
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to register mosque account');
    }
  }

  // Register individual user (simplified)
  static async registerIndividual(deviceId, preferences = {}) {
    try {
      // For individual users, we create a minimal account
      const user = new User({
        email: `individual_${deviceId}@temp.local`, // Temporary email
        password: crypto.randomBytes(32).toString('hex'), // Random password
        userType: 'individual',
        isEmailVerified: true, // Skip verification for individual users
        appSettings: {
          interfaceLanguage: preferences.interfaceLanguage || 'English',
          translationLanguage: preferences.translationLanguage || 'English',
          fontSize: preferences.fontSize || 'medium',
          rtlSupport: preferences.rtlSupport || false
        },
        notificationPreferences: {
          prayerTimeReminders: preferences.prayerTimeReminders !== false,
          liveTranslationAlerts: preferences.liveTranslationAlerts !== false,
          mosqueNewsNotifications: preferences.mosqueNewsNotifications !== false,
          eventReminders: preferences.eventReminders !== false,
          fridayPrayerNotifications: preferences.fridayPrayerNotifications !== false
        }
      });

      await user.save();

      const token = generateToken(user._id, user.userType);
      const refreshToken = generateRefreshToken(user._id);

      return {
        success: true,
        message: 'Individual account created successfully',
        user: user.toJSON(),
        token,
        refreshToken
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to create individual account');
    }
  }

  // Login user
  static async login(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ 
        email: email.toLowerCase(),
        userType: 'mosque' // Only mosque accounts can login with email/password
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Check if account is active
      if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Update last login
      user.lastLoginAt = new Date();
      user.analytics.lastActiveAt = new Date();
      await user.save();

      // Generate tokens
      const token = generateToken(user._id, user.userType);
      const refreshToken = generateRefreshToken(user._id);

      return {
        success: true,
        message: 'Login successful',
        user: user.toJSON(),
        token,
        refreshToken
      };
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }

  // Refresh token
  static async refreshToken(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token');
      }

      const newToken = generateToken(user._id, user.userType);
      const newRefreshToken = generateRefreshToken(user._id);

      return {
        success: true,
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Verify email
  static async verifyEmail(token) {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      return {
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error) {
      throw new Error(error.message || 'Email verification failed');
    }
  }

  // Request password reset
  static async requestPasswordReset(email) {
    try {
      const user = await User.findOne({ 
        email: email.toLowerCase(),
        userType: 'mosque'
      });

      if (!user) {
        // Don't reveal if email exists or not
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        };
      }

      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      try {
        await EmailService.sendPasswordResetEmail(user.email, resetToken, user.mosqueName);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        throw new Error('Failed to send password reset email');
      }

      return {
        success: true,
        message: 'Password reset link sent to your email'
      };
    } catch (error) {
      throw new Error(error.message || 'Password reset request failed');
    }
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    try {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired password reset token');
      }

      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      throw new Error(error.message || 'Password reset failed');
    }
  }

  // Change password (for authenticated users)
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      throw new Error(error.message || 'Password change failed');
    }
  }

  // Deactivate account
  static async deactivateAccount(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.isActive = false;
      await user.save();

      return {
        success: true,
        message: 'Account deactivated successfully'
      };
    } catch (error) {
      throw new Error(error.message || 'Account deactivation failed');
    }
  }

  // Get user profile
  static async getUserProfile(userId) {
    try {
      const user = await User.findById(userId)
        .populate('followedMosques.mosqueId', 'mosqueName mosqueAddress location')
        .select('-password');

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user: user.toJSON()
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to get user profile');
    }
  }
}

module.exports = AuthService;

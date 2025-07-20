// User model for Mosque Translation App
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
  // Basic Authentication
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // User Type
  userType: {
    type: String,
    enum: ['mosque', 'individual'],
    required: true
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Password Reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Mosque-specific fields (only for userType: 'mosque')
  mosqueName: {
    type: String,
    required: function() { return this.userType === 'mosque'; }
  },
  mosqueAddress: {
    type: String,
    required: function() { return this.userType === 'mosque'; }
  },
  phone: String,
  website: String,
  
  // Location (GeoJSON format)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: function() { return this.userType === 'mosque'; }
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: function() { return this.userType === 'mosque'; }
    }
  },
  

  
  // Mosque Services (only for mosque accounts)
  servicesOffered: [{
    type: String,
    enum: [
      'Live Translation',
      'Friday Speeches',
      'Educational Programs',
      'Community Events',
      'Youth Programs',
      'Women\'s Programs'
    ]
  }],
  languagesSupported: [{
    type: String,
    enum: config.islamic.supportedLanguages
  }],
  capacity: {
    type: Number,
    min: 1
  },
  facilities: [String],
  
  // Photos (only for mosque accounts)
  photos: {
    exterior: String, // Required for mosques
    interior: String, // Required for mosques
    additional: [String] // Up to 5 additional photos
  },
  
  // Individual User Settings (only for userType: 'individual')
  followedMosques: [{
    mosqueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    followedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Notification Preferences
  notificationPreferences: {
    prayerTimeReminders: {
      type: Boolean,
      default: true
    },
    liveTranslationAlerts: {
      type: Boolean,
      default: true
    },
    mosqueNewsNotifications: {
      type: Boolean,
      default: true
    },
    eventReminders: {
      type: Boolean,
      default: true
    },
    fridayPrayerNotifications: {
      type: Boolean,
      default: true
    }
  },
  
  // App Settings
  appSettings: {
    interfaceLanguage: {
      type: String,
      enum: config.islamic.supportedLanguages,
      default: 'English'
    },
    translationLanguage: {
      type: String,
      enum: config.islamic.supportedLanguages,
      default: 'English'
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'extra-large'],
      default: 'medium'
    },
    rtlSupport: {
      type: Boolean,
      default: false
    }
  },

  // Translation Preferences (Enhanced Multi-Language Support)
  translationPreferences: {
    primaryLanguage: {
      type: String,
      enum: config.islamic.supportedLanguages,
      default: 'English'
    },
    secondaryLanguage: {
      type: String,
      enum: config.islamic.supportedLanguages,
      default: null
    },
    showDualSubtitles: {
      type: Boolean,
      default: false
    },
    preferredLanguages: [{
      language: {
        type: String,
        enum: config.islamic.supportedLanguages
      },
      priority: {
        type: Number,
        min: 1,
        max: 10
      }
    }],
    autoLanguageDetection: {
      type: Boolean,
      default: true
    },
    translationSpeed: {
      type: String,
      enum: ['slow', 'normal', 'fast'],
      default: 'normal'
    },
    showOriginalText: {
      type: Boolean,
      default: true
    },
    translationDisplay: {
      type: String,
      enum: ['overlay', 'sidebar', 'bottom', 'popup'],
      default: 'bottom'
    },
    fontSettings: {
      primaryFontSize: {
        type: String,
        enum: ['small', 'medium', 'large', 'extra-large'],
        default: 'medium'
      },
      secondaryFontSize: {
        type: String,
        enum: ['small', 'medium', 'large', 'extra-large'],
        default: 'small'
      },
      fontWeight: {
        type: String,
        enum: ['normal', 'bold'],
        default: 'normal'
      },
      lineHeight: {
        type: String,
        enum: ['compact', 'normal', 'relaxed'],
        default: 'normal'
      }
    },
    colorSettings: {
      primaryTextColor: {
        type: String,
        default: '#000000'
      },
      secondaryTextColor: {
        type: String,
        default: '#666666'
      },
      backgroundColor: {
        type: String,
        default: '#FFFFFF'
      },
      highlightColor: {
        type: String,
        default: '#2E7D32'
      }
    }
  },
  
  // Analytics (for mosque accounts)
  analytics: {
    totalFollowers: {
      type: Number,
      default: 0
    },
    totalTranslationSessions: {
      type: Number,
      default: 0
    },
    lastActiveAt: Date
  },
  
  // Timestamps
  lastLoginAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
// Note: email index is automatically created by unique: true in schema
userSchema.index({ userType: 1 });
userSchema.index({ location: '2dsphere' }); // For geospatial queries
userSchema.index({ 'followedMosques.mosqueId': 1 });
userSchema.index({ isActive: 1, isEmailVerified: 1 });

// Virtual for mosque followers
userSchema.virtual('followers', {
  ref: 'User',
  localField: '_id',
  foreignField: 'followedMosques.mosqueId'
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, config.security.bcryptRounds);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Instance method to generate email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  
  this.emailVerificationToken = require('crypto')
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Static method to find nearby mosques
userSchema.statics.findNearbyMosques = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    userType: 'mosque',
    isActive: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    }
  });
};

// Transform output to hide sensitive information
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  
  // Remove sensitive fields
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

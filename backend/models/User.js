// File: /backend/models/User.js - Enhanced with comprehensive logging

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// 🎯 ENHANCED: Centralized logging utility for User model
const logUserModel = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '👤',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
    password: '🔐',
    security: '🛡️'
  };
  
  console.log(`${logLevels[level]} [USER-MODEL] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password should be at least 6 characters']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    trim: true
  },
  // 🎯 ENHANCED: Location schema for nearby shop calculations
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && // longitude
                 v[1] >= -90 && v[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'
      }
    },
    address: {
      type: String,
      default: '',
      maxlength: [500, 'Address cannot be more than 500 characters']
    },
    // Additional location metadata
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: 'India'
    },
    pincode: {
      type: String,
      default: ''
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  mobileVerified: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String,
    default: ''
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', ''],
    default: ''
  },
  // Enhanced wishlist with timestamps
  wishlist: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  // User preferences for recommendations
  preferences: {
    categories: [{
      type: String,
      enum: ['Men', 'Women', 'Kids']
    }],
    priceRange: {
      min: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 10000
      }
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  // Account status and metadata
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  // Password reset fields
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  // Email verification fields
  emailVerificationToken: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🎯 ENHANCED: Geospatial indexes for location queries
userSchema.index({ "location": "2dsphere" });
// Note: email and mobileNumber indexes are automatically created by unique: true
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Compound index for location-based queries
userSchema.index({ 
  "location.coordinates": "2dsphere", 
  isActive: 1, 
  isVerified: 1 
});

// 🎯 Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// 🎯 Virtual for location display
userSchema.virtual('locationDisplay').get(function() {
  if (this.location && this.location.address) {
    return this.location.address;
  }
  if (this.location && this.location.coordinates && 
      this.location.coordinates[0] !== 0 && this.location.coordinates[1] !== 0) {
    return `${this.location.coordinates[1]}, ${this.location.coordinates[0]}`;
  }
  return 'Location not set';
});

// 🎯 ENHANCED: Pre-save middleware to hash password with comprehensive logging
userSchema.pre('save', async function(next) {
  // Only hash password if it's been modified
  if (!this.isModified('password')) {
    logUserModel('PASSWORD_NOT_MODIFIED', {
      userId: this._id,
      email: this.email,
      operation: this.isNew ? 'CREATE' : 'UPDATE'
    }, 'info');
    return next();
  }
  
  try {
    logUserModel('PASSWORD_HASHING_START', {
      userId: this._id,
      email: this.email,
      passwordLength: this.password.length,
      isNewUser: this.isNew,
      operation: this.isNew ? 'CREATE' : 'UPDATE'
    }, 'password');

    // Check if password is already hashed (safety check)
    if (this.password.startsWith('$2')) {
      logUserModel('PASSWORD_ALREADY_HASHED', {
        userId: this._id,
        email: this.email,
        passwordFormat: this.password.substring(0, 10) + '...'
      }, 'warning');
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    const originalPassword = this.password;
    this.password = await bcrypt.hash(this.password, salt);
    
    logUserModel('PASSWORD_HASHED_SUCCESS', {
      userId: this._id,
      email: this.email,
      originalLength: originalPassword.length,
      hashedLength: this.password.length,
      saltRounds: 10,
      hashFormat: this.password.substring(0, 10) + '...'
    }, 'success');
    
    next();
  } catch (error) {
    logUserModel('PASSWORD_HASHING_ERROR', {
      userId: this._id,
      email: this.email,
      error: error.message,
      stack: error.stack
    }, 'critical');
    next(error);
  }
});

// 🎯 Pre-save middleware to update location timestamp
userSchema.pre('save', function(next) {
  if (this.isModified('location.coordinates') || this.isModified('location.address')) {
    this.location.lastUpdated = new Date();
  }
  next();
});

// 🎯 ENHANCED: Instance method to check password with comprehensive logging
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    logUserModel('PASSWORD_COMPARISON_START', {
      userId: this._id,
      email: this.email,
      enteredPasswordLength: enteredPassword?.length || 0,
      storedPasswordLength: this.password?.length || 0,
      storedPasswordFormat: this.password ? this.password.substring(0, 10) + '...' : 'null',
      isHashedFormat: this.password ? this.password.startsWith('$2') : false
    }, 'password');

    if (!enteredPassword) {
      logUserModel('PASSWORD_COMPARISON_FAILED', {
        userId: this._id,
        email: this.email,
        reason: 'No password provided'
      }, 'warning');
      return false;
    }

    if (!this.password) {
      logUserModel('PASSWORD_COMPARISON_FAILED', {
        userId: this._id,
        email: this.email,
        reason: 'No stored password found'
      }, 'error');
      return false;
    }

    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    
    logUserModel('PASSWORD_COMPARISON_RESULT', {
      userId: this._id,
      email: this.email,
      isMatch: isMatch,
      enteredPasswordLength: enteredPassword.length,
      storedPasswordLength: this.password.length
    }, isMatch ? 'success' : 'warning');

    return isMatch;
  } catch (error) {
    logUserModel('PASSWORD_COMPARISON_ERROR', {
      userId: this._id,
      email: this.email,
      error: error.message,
      stack: error.stack
    }, 'critical');
    return false;
  }
};

// 🎯 Instance method to check if location is set
userSchema.methods.hasValidLocation = function() {
  return this.location && 
         this.location.coordinates && 
         this.location.coordinates.length === 2 &&
         this.location.coordinates[0] !== 0 && 
         this.location.coordinates[1] !== 0;
};

// 🎯 Instance method to update location
userSchema.methods.updateLocation = function(longitude, latitude, address = '') {
  this.location = {
    type: 'Point',
    coordinates: [longitude, latitude],
    address: address,
    lastUpdated: new Date()
  };
  return this.save();
};

// 🎯 Instance method to add to wishlist
userSchema.methods.addToWishlist = function(productId) {
  // Check if product already in wishlist
  const existingItem = this.wishlist.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (!existingItem) {
    this.wishlist.push({
      product: productId,
      addedAt: new Date()
    });
  }
  
  return this.save();
};

// 🎯 Instance method to remove from wishlist
userSchema.methods.removeFromWishlist = function(productId) {
  this.wishlist = this.wishlist.filter(item => 
    item.product.toString() !== productId.toString()
  );
  return this.save();
};

// 🎯 ENHANCED: Instance method to increment login attempts with comprehensive logging
userSchema.methods.incLoginAttempts = function() {
  const currentAttempts = this.loginAttempts || 0;
  const newAttempts = currentAttempts + 1;
  
  logUserModel('LOGIN_ATTEMPT_INCREMENT', {
    userId: this._id,
    email: this.email,
    currentAttempts: currentAttempts,
    newAttempts: newAttempts,
    isCurrentlyLocked: this.isLocked,
    lockUntil: this.lockUntil
  }, 'security');

  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    logUserModel('LOGIN_LOCK_EXPIRED_RESET', {
      userId: this._id,
      email: this.email,
      expiredLockUntil: this.lockUntil,
      resettingToAttempts: 1
    }, 'security');
    
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (newAttempts >= 5 && !this.isLocked) {
    const lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    updates.$set = { lockUntil: lockUntil };
    
    logUserModel('ACCOUNT_LOCKED', {
      userId: this._id,
      email: this.email,
      failedAttempts: newAttempts,
      lockUntil: new Date(lockUntil).toISOString(),
      lockDuration: '2 hours'
    }, 'critical');
  } else if (newAttempts >= 3) {
    logUserModel('LOGIN_ATTEMPTS_WARNING', {
      userId: this._id,
      email: this.email,
      attempts: newAttempts,
      remainingBeforeLock: 5 - newAttempts
    }, 'warning');
  }
  
  return this.updateOne(updates);
};

// 🎯 ENHANCED: Instance method to reset login attempts with logging
userSchema.methods.resetLoginAttempts = function() {
  logUserModel('LOGIN_ATTEMPTS_RESET', {
    userId: this._id,
    email: this.email,
    previousAttempts: this.loginAttempts || 0,
    wasLocked: this.isLocked,
    lockUntil: this.lockUntil
  }, 'success');

  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// 🎯 Static method to find users within distance
  userSchema.statics.findNearbyUsers = function(longitude, latitude, maxDistanceKm = 50000000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceKm * 1000 // Convert km to meters
      }
    },
    isActive: true,
    isVerified: true
  });
};

// 🎯 Static method to get location statistics
userSchema.statics.getLocationStats = function() {
  return this.aggregate([
    {
      $match: {
        "location.coordinates": { $ne: [0, 0] },
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        usersWithLocation: { $sum: 1 },
        avgLatitude: { $avg: { $arrayElemAt: ["$location.coordinates", 1] } },
        avgLongitude: { $avg: { $arrayElemAt: ["$location.coordinates", 0] } }
      }
    }
  ]);
};

// 🎯 NEW: Password reset token methods with comprehensive logging
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expire time (10 minutes)
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
  
  logUserModel('PASSWORD_RESET_TOKEN_GENERATED', {
    userId: this._id,
    email: this.email,
    tokenLength: resetToken.length,
    hashedTokenLength: this.resetPasswordToken.length,
    expiresAt: new Date(this.resetPasswordExpires).toISOString(),
    expiresInMinutes: 10
  }, 'security');
  
  return resetToken;
};

userSchema.statics.findByResetToken = function(token) {
  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  logUserModel('PASSWORD_RESET_TOKEN_LOOKUP', {
    tokenLength: token.length,
    hashedTokenLength: hashedToken.length,
    searchTime: new Date().toISOString()
  }, 'security');
  
  return this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });
};

// 🎯 NEW: Email verification token methods
userSchema.methods.getEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  logUserModel('EMAIL_VERIFICATION_TOKEN_GENERATED', {
    userId: this._id,
    email: this.email,
    tokenLength: verificationToken.length,
    expiresAt: new Date(this.emailVerificationExpires).toISOString(),
    expiresInHours: 24
  }, 'security');
  
  return verificationToken;
};

userSchema.statics.findByEmailVerificationToken = function(token) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  logUserModel('EMAIL_VERIFICATION_TOKEN_LOOKUP', {
    tokenLength: token.length,
    hashedTokenLength: hashedToken.length,
    searchTime: new Date().toISOString()
  }, 'security');
  
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
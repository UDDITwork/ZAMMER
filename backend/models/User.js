// File: /backend/models/User.js - Enhanced with better location support

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
userSchema.index({ email: 1 });
userSchema.index({ mobileNumber: 1 });
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

// 🎯 Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's been modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
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

// 🎯 Instance method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
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

// 🎯 Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// 🎯 Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
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

const User = mongoose.model('User', userSchema);

module.exports = User;
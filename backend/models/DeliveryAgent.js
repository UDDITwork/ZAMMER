// backend/models/DeliveryAgent.js - Complete Delivery Agent Model
// 🎯 CREATED: Complete delivery agent schema with all required fields
// 🎯 ADDED: Location tracking, order assignment, and status management

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const DeliveryAgentSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number']
  },
  // Additional phone fields for compatibility
  phone: {
    type: String,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number']
  },
  phoneNumber: {
    type: String,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include in queries by default
  },

  // Personal Details
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  address: {
    street: String,
    area: String,
    city: String,
    state: String,
    pincode: {
      type: String,
      match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Vehicle Information
  vehicleType: {
    type: String,
    required: [true, 'Vehicle type is required'],
    enum: ['bike', 'scooter', 'car', 'bicycle'],
    default: 'bike'
  },
  // Enhanced vehicle details structure for compatibility
  vehicleDetails: {
    type: {
      type: String,
      enum: ['Bicycle', 'Motorcycle', 'Scooter', 'Car', 'Van'],
      required: true
    },
    model: String,
    registrationNumber: String
  },
  vehicleNumber: {
    type: String,
    uppercase: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    uppercase: true,
    trim: true
  },
  vehicleInsurance: {
    policyNumber: String,
    expiryDate: Date,
    isValid: {
      type: Boolean,
      default: false
    }
  },

  // Work Information
  area: {
    type: String,
    trim: true,
    maxlength: [100, 'Area cannot exceed 100 characters']
  },
  workingAreas: [{
    type: String,
    trim: true
  }],
  serviceRadius: {
    type: Number,
    default: 10, // kilometers
    min: [1, 'Service radius must be at least 1 km'],
    max: [50, 'Service radius cannot exceed 50 km']
  },

  // Status and Availability
  status: {
    type: String,
    enum: ['available', 'assigned', 'delivering', 'offline'],
    default: 'available'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Online status for compatibility
  isOnline: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: String,
  verificationStatus: {
    documents: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'rejected'],
      default: 'pending'
    },
    identity: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    vehicle: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  },

  // Current Assignment
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  assignedOrders: [{
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['assigned', 'accepted', 'pickedUp', 'delivered', 'cancelled'],
      default: 'assigned'
    }
  }],

  // Location Tracking
  currentLocation: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    accuracy: Number,
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  locationHistory: [{
    latitude: Number,
    longitude: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }],

  // Performance Metrics
  deliveryStats: {
    totalDeliveries: {
      type: Number,
      default: 0
    },
    completedDeliveries: {
      type: Number,
      default: 0
    },
    cancelledDeliveries: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    thisWeek: {
      deliveries: { type: Number, default: 0 },
      earnings: { type: Number, default: 0 }
    },
    thisMonth: {
      deliveries: { type: Number, default: 0 },
      earnings: { type: Number, default: 0 }
    }
  },
  // Additional stats for compatibility
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  stats: {
    assignedOrders: {
      type: Number,
      default: 0
    }
  },

  // Ratings and Reviews
  ratings: [{
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    review: String,
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Earnings and Payments
  earnings: {
    total: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    paid: {
      type: Number,
      default: 0
    },
    perDelivery: {
      type: Number,
      default: 50 // Default earning per delivery
    }
  },
  paymentDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    upiId: String
  },

  // Work Schedule
  workingHours: {
    monday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    thursday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    friday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    saturday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    sunday: { start: String, end: String, isWorking: { type: Boolean, default: false } }
  },

  // Emergency Contact
  emergencyContact: {
    name: String,
    relationship: String,
    mobileNumber: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number']
    }
  },

  // Documents
  documents: {
    profilePhoto: String,
    aadharCard: String,
    panCard: String,
    drivingLicense: String,
    vehicleRC: String,
    vehicleInsurance: String
  },

  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastLogin: Date,
  lastLoginAt: Date,
  lastActiveAt: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedUntil: Date,

  // Notification Preferences
  notifications: {
    sms: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },

  // App-specific
  fcmToken: String, // For push notifications
  appVersion: String,
  deviceInfo: {
    platform: String,
    version: String,
    model: String
  },
  
  // Profile completion percentage
  profileCompletion: {
    type: Number,
    default: 0,
    min: [0, 'Profile completion cannot be negative'],
    max: [100, 'Profile completion cannot exceed 100']
  },

  // Password reset token fields
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
DeliveryAgentSchema.index({ email: 1 });
DeliveryAgentSchema.index({ mobileNumber: 1 });
DeliveryAgentSchema.index({ phone: 1 });
DeliveryAgentSchema.index({ phoneNumber: 1 });
DeliveryAgentSchema.index({ status: 1, isActive: 1 });
DeliveryAgentSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });
DeliveryAgentSchema.index({ area: 1, vehicleType: 1 });
DeliveryAgentSchema.index({ createdAt: -1 });

// Virtual fields
DeliveryAgentSchema.virtual('fullName').get(function() {
  return this.name;
});

DeliveryAgentSchema.virtual('completionRate').get(function() {
  const total = this.deliveryStats.totalDeliveries;
  const completed = this.deliveryStats.completedDeliveries;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
});

// Pre-save middleware to hash password
DeliveryAgentSchema.pre('save', async function(next) {
  // Only hash password if it's been modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update verification status
DeliveryAgentSchema.pre('save', function(next) {
  // Check if agent is fully verified
  const { documents, identity, vehicle } = this.verificationStatus;
  this.isVerified = documents === 'verified' && identity === 'verified' && vehicle === 'verified';
  next();
});

// Instance Methods

// Compare password
DeliveryAgentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
DeliveryAgentSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, type: 'delivery' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// 🎯 NEW: Password reset token methods
DeliveryAgentSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expire time (10 minutes)
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

DeliveryAgentSchema.statics.findByResetToken = function(token) {
  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  }).select('+resetPasswordToken +resetPasswordExpires');
};

// Update location
DeliveryAgentSchema.methods.updateLocation = function(latitude, longitude, accuracy) {
  this.currentLocation = {
    latitude,
    longitude,
    accuracy,
    updatedAt: new Date()
  };

  // Add to location history
  this.locationHistory.push({
    latitude,
    longitude,
    timestamp: new Date(),
    orderId: this.currentOrder
  });

  // Keep only last 100 location entries
  if (this.locationHistory.length > 100) {
    this.locationHistory = this.locationHistory.slice(-100);
  }

  return this.save();
};

// Calculate distance from a point
DeliveryAgentSchema.methods.distanceFrom = function(latitude, longitude) {
  if (!this.currentLocation.latitude || !this.currentLocation.longitude) {
    return null;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = (latitude - this.currentLocation.latitude) * Math.PI / 180;
  const dLon = (longitude - this.currentLocation.longitude) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.currentLocation.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

// 🔧 ENHANCED: Check if agent is available for assignment with capacity management
DeliveryAgentSchema.methods.isAvailableForAssignment = function(maxOrdersPerAgent = 5) {
  // 🔧 CRITICAL FIX: Only count orders that are still 'assigned' (not accepted/pickedUp/delivered)
  const currentOrderCount = this.assignedOrders?.filter(order => order.status === 'assigned').length || 0;
  return this.isActive && 
         this.isVerified && 
         (this.status === 'available' || this.status === 'assigned') && 
         !this.isBlocked &&
         currentOrderCount < maxOrdersPerAgent;
};

// 🔧 NEW: Get capacity information
DeliveryAgentSchema.methods.getCapacityInfo = function(maxOrdersPerAgent = 5) {
  // 🔧 CRITICAL FIX: Only count orders that are still 'assigned' (not accepted/pickedUp/delivered)
  const currentOrderCount = this.assignedOrders?.filter(order => order.status === 'assigned').length || 0;
  const availableCapacity = maxOrdersPerAgent - currentOrderCount;
  const capacityPercentage = (currentOrderCount / maxOrdersPerAgent) * 100;
  
  return {
    current: currentOrderCount,
    max: maxOrdersPerAgent,
    available: availableCapacity,
    percentage: Math.round(capacityPercentage),
    isAtCapacity: currentOrderCount >= maxOrdersPerAgent,
    isAvailable: availableCapacity > 0
  };
};

// 🔧 NEW: Check if agent can handle specific number of orders
DeliveryAgentSchema.methods.canHandleOrders = function(orderCount, maxOrdersPerAgent = 5) {
  // 🔧 CRITICAL FIX: Only count orders that are still 'assigned' (not accepted/pickedUp/delivered)
  const currentOrderCount = this.assignedOrders?.filter(order => order.status === 'assigned').length || 0;
  return (currentOrderCount + orderCount) <= maxOrdersPerAgent;
};

// Update delivery stats
DeliveryAgentSchema.methods.updateDeliveryStats = function(action, earnings = 0) {
  switch (action) {
    case 'completed':
      this.deliveryStats.completedDeliveries += 1;
      this.deliveryStats.totalDeliveries += 1;
      this.deliveryStats.totalEarnings += earnings;
      this.deliveryStats.thisWeek.deliveries += 1;
      this.deliveryStats.thisWeek.earnings += earnings;
      this.deliveryStats.thisMonth.deliveries += 1;
      this.deliveryStats.thisMonth.earnings += earnings;
      this.earnings.total += earnings;
      this.earnings.pending += earnings;
      break;
    case 'cancelled':
      this.deliveryStats.cancelledDeliveries += 1;
      this.deliveryStats.totalDeliveries += 1;
      break;
  }

  return this.save();
};

// Static Methods

// 🔧 ENHANCED: Find available agents near a location with capacity management
DeliveryAgentSchema.statics.findNearbyAvailable = function(latitude, longitude, radiusKm = 10, maxOrdersPerAgent = 5) {
  return this.find({
    isActive: true,
    isVerified: true,
    status: { $in: ['available', 'assigned'] },
    isBlocked: false,
    'currentLocation.latitude': {
      $gte: latitude - (radiusKm / 111), // Approximate conversion
      $lte: latitude + (radiusKm / 111)
    },
    'currentLocation.longitude': {
      $gte: longitude - (radiusKm / (111 * Math.cos(latitude * Math.PI / 180))),
      $lte: longitude + (radiusKm / (111 * Math.cos(latitude * Math.PI / 180)))
    }
  })
  .populate('assignedOrders.order', 'orderNumber status')
  .sort({ 'deliveryStats.averageRating': -1, 'deliveryStats.completedDeliveries': -1 })
  .then(agents => {
    // Filter by capacity
    return agents.filter(agent => {
      const currentOrderCount = agent.assignedOrders?.length || 0;
      return currentOrderCount < maxOrdersPerAgent;
    });
  });
};

// 🔧 ENHANCED: Get agents by vehicle type and area with capacity management
DeliveryAgentSchema.statics.findByVehicleAndArea = function(vehicleType, area, maxOrdersPerAgent = 5) {
  const query = {
    isActive: true,
    isVerified: true,
    status: { $in: ['available', 'assigned'] },
    isBlocked: false
  };

  if (vehicleType && vehicleType !== 'all') {
    query.vehicleType = vehicleType;
  }

  if (area) {
    query.area = new RegExp(area, 'i');
  }

  return this.find(query)
    .populate('assignedOrders.order', 'orderNumber status')
    .sort({ 'deliveryStats.averageRating': -1 })
    .then(agents => {
      // Filter by capacity
      return agents.filter(agent => {
        const currentOrderCount = agent.assignedOrders?.length || 0;
        return currentOrderCount < maxOrdersPerAgent;
      });
    });
};

// Reset weekly/monthly stats (call via cron job)
DeliveryAgentSchema.statics.resetWeeklyStats = function() {
  return this.updateMany({}, {
    $set: {
      'deliveryStats.thisWeek.deliveries': 0,
      'deliveryStats.thisWeek.earnings': 0
    }
  });
};

DeliveryAgentSchema.statics.resetMonthlyStats = function() {
  return this.updateMany({}, {
    $set: {
      'deliveryStats.thisMonth.deliveries': 0,
      'deliveryStats.thisMonth.earnings': 0
    }
  });
};

module.exports = mongoose.model('DeliveryAgent', DeliveryAgentSchema);
// backend/models/DeliveryAgent.js - Complete Delivery Agent Model
// 🎯 CREATED: Complete delivery agent schema with all required fields
// 🎯 ADDED: Location tracking, order assignment, and status management

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
DeliveryAgentSchema.index({ email: 1 });
DeliveryAgentSchema.index({ mobileNumber: 1 });
DeliveryAgentSchema.index({ status: 1, isActive: 1 });
DeliveryAgentSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });
DeliveryAgentSchema.index({ area: 1, vehicleType: 1 });
DeliveryAgentSchema.index({ createdAt: -1 });

// Virtual fields
DeliveryAgentSchema.virtual('fullName').get(function() {
  return this.name;
});

DeliveryAgentSchema.virtual('isOnline').get(function() {
  return this.status !== 'offline' && this.isActive;
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

// Check if agent is available for assignment
DeliveryAgentSchema.methods.isAvailableForAssignment = function() {
  return this.isActive && 
         this.isVerified && 
         this.status === 'available' && 
         !this.currentOrder &&
         !this.isBlocked;
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

// Find available agents near a location
DeliveryAgentSchema.statics.findNearbyAvailable = function(latitude, longitude, radiusKm = 10) {
  return this.find({
    isActive: true,
    isVerified: true,
    status: 'available',
    currentOrder: null,
    isBlocked: false,
    'currentLocation.latitude': {
      $gte: latitude - (radiusKm / 111), // Approximate conversion
      $lte: latitude + (radiusKm / 111)
    },
    'currentLocation.longitude': {
      $gte: longitude - (radiusKm / (111 * Math.cos(latitude * Math.PI / 180))),
      $lte: longitude + (radiusKm / (111 * Math.cos(latitude * Math.PI / 180)))
    }
  }).sort({ 'deliveryStats.averageRating': -1, 'deliveryStats.completedDeliveries': -1 });
};

// Get agents by vehicle type and area
DeliveryAgentSchema.statics.findByVehicleAndArea = function(vehicleType, area) {
  const query = {
    isActive: true,
    isVerified: true,
    status: 'available',
    currentOrder: null
  };

  if (vehicleType && vehicleType !== 'all') {
    query.vehicleType = vehicleType;
  }

  if (area) {
    query.area = new RegExp(area, 'i');
  }

  return this.find(query).sort({ 'deliveryStats.averageRating': -1 });
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
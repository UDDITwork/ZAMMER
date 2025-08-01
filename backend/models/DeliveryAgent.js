const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryAgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
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
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
  },
  // Identity and Verification
  aadharNumber: {
    type: String,
    default: '',
    match: [/^\d{12}$/, 'Aadhar number must be 12 digits']
  },
  panNumber: {
    type: String,
    default: '',
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter valid PAN number']
  },
  licenseNumber: {
    type: String,
    default: '',
    trim: true
  },
  // Profile Information
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true;
        const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return age >= 18 && age <= 65;
      },
      message: 'Age must be between 18 and 65 years'
    }
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { 
      type: String, 
      default: '',
      match: [/^\d{6}$/, 'Pincode must be 6 digits']
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  // Vehicle Information
  vehicleDetails: {
    type: {
      type: String,
      enum: ['Bicycle', 'Motorcycle', 'Scooter', 'Car', 'Van'],
      default: 'Motorcycle'
    },
    model: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    insuranceExpiry: { type: Date, default: null }
  },
  // Current Location and Status
  currentLocation: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Work Status
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
  blockReason: {
    type: String,
    default: ''
  },
  // Current Assignment
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  orderStatus: {
    type: String,
    enum: ['idle', 'assigned', 'pickup_in_progress', 'delivery_in_progress'],
    default: 'idle'
  },
  // Performance Metrics
  stats: {
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
      min: 0,
      max: 5
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    // Performance indicators
    onTimeDeliveryRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    customerRatingCount: {
      type: Number,
      default: 0
    }
  },
  // Financial Information
  bankDetails: {
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolderName: { type: String, default: '' }
  },
  // Work Preferences
  workingHours: {
    startTime: { type: String, default: '09:00' }, // 24-hour format
    endTime: { type: String, default: '21:00' },
    workingDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }]
  },
  preferredAreas: [{
    areaName: String,
    pincode: String,
    coordinates: [Number] // [longitude, latitude]
  }],
  // Emergency Contact
  emergencyContact: {
    name: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    relationship: { type: String, default: '' }
  },
  // System Fields
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: {
    aadharVerified: { type: Boolean, default: false },
    panVerified: { type: Boolean, default: false },
    licenseVerified: { type: Boolean, default: false },
    addressVerified: { type: Boolean, default: false }
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // OTP for delivery confirmation
  currentOTP: {
    code: String,
    expiresAt: Date,
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
deliveryAgentSchema.index({ "currentLocation": "2dsphere" });
deliveryAgentSchema.index({ email: 1 });
deliveryAgentSchema.index({ phoneNumber: 1 });
deliveryAgentSchema.index({ isOnline: 1, isAvailable: 1 });
deliveryAgentSchema.index({ "address.coordinates": "2dsphere" });
deliveryAgentSchema.index({ currentOrder: 1 });
deliveryAgentSchema.index({ orderStatus: 1 });

// Hash password before saving
deliveryAgentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
deliveryAgentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to update location
deliveryAgentSchema.methods.updateLocation = function(coordinates) {
  this.currentLocation = {
    type: 'Point',
    coordinates: coordinates,
    lastUpdated: new Date()
  };
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to calculate completion rate
deliveryAgentSchema.virtual('completionRate').get(function() {
  if (this.stats.totalDeliveries === 0) return 0;
  return Math.round((this.stats.completedDeliveries / this.stats.totalDeliveries) * 100);
});

// Method to check if agent is within working hours
deliveryAgentSchema.methods.isWithinWorkingHours = function() {
  const now = new Date();
  const currentDay = now.toLocaleLowerCase('en-US', { weekday: 'long' });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Check if today is a working day
  if (!this.workingHours.workingDays.includes(currentDay)) {
    return false;
  }
  
  // Check if current time is within working hours
  const startTime = this.workingHours.startTime;
  const endTime = this.workingHours.endTime;
  
  return currentTime >= startTime && currentTime <= endTime;
};

// Method to check if agent can accept new orders
deliveryAgentSchema.methods.canAcceptOrder = function() {
  return this.isOnline && 
         this.isAvailable && 
         !this.isBlocked && 
         this.orderStatus === 'idle' &&
         !this.currentOrder &&
         this.isWithinWorkingHours();
};

// Method to update delivery stats
deliveryAgentSchema.methods.updateDeliveryStats = function(type, rating = null, earnings = 0) {
  this.stats.totalDeliveries += 1;
  
  if (type === 'completed') {
    this.stats.completedDeliveries += 1;
    this.stats.totalEarnings += earnings;
    
    if (rating) {
      const totalRatingPoints = (this.stats.averageRating * this.stats.customerRatingCount) + rating;
      this.stats.customerRatingCount += 1;
      this.stats.averageRating = totalRatingPoints / this.stats.customerRatingCount;
    }
  } else if (type === 'cancelled') {
    this.stats.cancelledDeliveries += 1;
  }
  
  // Calculate on-time delivery rate (would need additional logic based on delivery times)
  this.stats.onTimeDeliveryRate = Math.round((this.stats.completedDeliveries / this.stats.totalDeliveries) * 100);
  
  return this.save();
};

// Static method to find nearby available agents
deliveryAgentSchema.statics.findNearbyAgents = function(coordinates, maxDistance = 10000) {
  return this.find({
    isOnline: true,
    isAvailable: true,
    isBlocked: false,
    orderStatus: 'idle',
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance // in meters
      }
    }
  }).sort({ 'stats.averageRating': -1, 'stats.completionRate': -1 });
};

// Static method to get agent performance analytics
deliveryAgentSchema.statics.getPerformanceAnalytics = async function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalAgents: { $sum: 1 },
        onlineAgents: { $sum: { $cond: ['$isOnline', 1, 0] } },
        availableAgents: { $sum: { $cond: ['$isAvailable', 1, 0] } },
        averageRating: { $avg: '$stats.averageRating' },
        totalDeliveries: { $sum: '$stats.totalDeliveries' },
        totalCompletedDeliveries: { $sum: '$stats.completedDeliveries' },
        totalEarnings: { $sum: '$stats.totalEarnings' }
      }
    }
  ]);
};

const DeliveryAgent = mongoose.model('DeliveryAgent', deliveryAgentSchema);

module.exports = DeliveryAgent; 

//backend/models/OtpVerfication.js
const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
  // OTP Details
  code: {
    type: String,
    required: [true, 'OTP code is required'],
    length: 6,
    match: [/^\d{6}$/, 'OTP must be exactly 6 digits']
  },
  // Associated Entities
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required']
  },
  deliveryAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryAgent',
    required: [true, 'Delivery agent reference is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  // OTP Purpose and Status
  purpose: {
    type: String,
    enum: ['delivery_confirmation', 'pickup_confirmation', 'payment_confirmation'],
    required: [true, 'OTP purpose is required'],
    default: 'delivery_confirmation'
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'expired', 'cancelled'],
    default: 'pending'
  },
  // Timing
  expiresAt: {
    type: Date,
    required: [true, 'OTP expiry time is required'],
    default: function() {
      // Default expiry: 10 minutes from creation
      return new Date(Date.now() + 10 * 60 * 1000);
    }
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  // Delivery Information
  deliveryLocation: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: {
      type: String,
      default: ''
    }
  },
  // Security and Tracking
  attemptCount: {
    type: Number,
    default: 0,
    max: [3, 'Maximum 3 OTP verification attempts allowed']
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  // Additional Data
  notes: {
    type: String,
    default: '',
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  // COD Payment Details (if applicable)
  paymentDetails: {
    amountReceived: {
      type: Number,
      default: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card'],
      default: 'cash'
    },
    transactionId: {
      type: String,
      default: ''
    },
    receivedAt: {
      type: Date,
      default: null
    }
  },
  // Verification Results
  verificationResult: {
    success: {
      type: Boolean,
      default: false
    },
    errorMessage: {
      type: String,
      default: ''
    },
    verifiedBy: {
      type: String,
      enum: ['delivery_agent', 'system', 'admin'],
      default: 'delivery_agent'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
otpVerificationSchema.index({ order: 1 });
otpVerificationSchema.index({ deliveryAgent: 1 });
otpVerificationSchema.index({ user: 1 });
otpVerificationSchema.index({ code: 1 });
otpVerificationSchema.index({ expiresAt: 1 });
otpVerificationSchema.index({ status: 1 });
otpVerificationSchema.index({ purpose: 1 });
otpVerificationSchema.index({ createdAt: -1 });

// Compound index for efficient queries
otpVerificationSchema.index({ order: 1, status: 1 });
otpVerificationSchema.index({ deliveryAgent: 1, status: 1 });

// Virtual to check if OTP is expired
otpVerificationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual to get remaining time in minutes
otpVerificationSchema.virtual('remainingTimeMinutes').get(function() {
  const now = new Date();
  const remaining = Math.max(0, this.expiresAt - now);
  return Math.ceil(remaining / (1000 * 60)); // Convert to minutes
});

// Virtual to check if OTP can be verified
otpVerificationSchema.virtual('canVerify').get(function() {
  return this.status === 'pending' && 
         !this.isExpired && 
         this.attemptCount < 3;
});

// Static method to generate 6-digit OTP
otpVerificationSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to create new OTP for delivery
otpVerificationSchema.statics.createDeliveryOTP = async function(orderData) {
  try {
    // Invalidate any existing pending OTPs for this order
    await this.updateMany(
      { 
        order: orderData.orderId,
        status: 'pending' 
      },
      { 
        status: 'cancelled',
        notes: 'Cancelled due to new OTP generation'
      }
    );

    // Generate new OTP
    const otpCode = this.generateOTP();
    
    // Create new OTP record
    const newOTP = new this({
      code: otpCode,
      order: orderData.orderId,
      deliveryAgent: orderData.deliveryAgentId,
      user: orderData.userId,
      purpose: orderData.purpose || 'delivery_confirmation',
      deliveryLocation: orderData.deliveryLocation || {
        type: 'Point',
        coordinates: [0, 0],
        address: ''
      },
      notes: orderData.notes || 'OTP for delivery confirmation'
    });

    const savedOTP = await newOTP.save();
    
    // Populate references for return
    await savedOTP.populate([
      { path: 'order', select: 'orderNumber totalPrice' },
      { path: 'deliveryAgent', select: 'name phoneNumber' },
      { path: 'user', select: 'name mobileNumber' }
    ]);

    return savedOTP;
  } catch (error) {
    throw new Error(`Failed to create delivery OTP: ${error.message}`);
  }
};

// Instance method to verify OTP
otpVerificationSchema.methods.verifyOTP = async function(enteredCode, verificationData = {}) {
  try {
    // Check if OTP can be verified
    if (!this.canVerify) {
      const reason = this.status !== 'pending' ? 'OTP already processed' :
                    this.isExpired ? 'OTP has expired' :
                    'Maximum verification attempts exceeded';
      
      this.verificationResult = {
        success: false,
        errorMessage: reason,
        verifiedBy: verificationData.verifiedBy || 'delivery_agent'
      };
      
      await this.save();
      return { success: false, message: reason };
    }

    // Increment attempt count
    this.attemptCount += 1;

    // Check if entered code matches
    if (enteredCode !== this.code) {
      this.verificationResult = {
        success: false,
        errorMessage: 'Invalid OTP code',
        verifiedBy: verificationData.verifiedBy || 'delivery_agent'
      };

      // If this was the last attempt, mark as expired
      if (this.attemptCount >= 3) {
        this.status = 'expired';
        this.verificationResult.errorMessage = 'Maximum attempts exceeded';
      }

      await this.save();
      return { 
        success: false, 
        message: this.attemptCount >= 3 ? 
          'Maximum verification attempts exceeded' : 
          `Invalid OTP. ${3 - this.attemptCount} attempts remaining.`
      };
    }

    // OTP is correct - mark as verified
    this.status = 'verified';
    this.verifiedAt = new Date();
    this.verificationResult = {
      success: true,
      errorMessage: '',
      verifiedBy: verificationData.verifiedBy || 'delivery_agent'
    };

    // Update payment details if provided (for COD)
    if (verificationData.paymentDetails) {
      this.paymentDetails = {
        ...this.paymentDetails,
        ...verificationData.paymentDetails,
        receivedAt: new Date()
      };
    }

    // Update delivery location if provided
    if (verificationData.deliveryLocation) {
      this.deliveryLocation = verificationData.deliveryLocation;
    }

    await this.save();
    
    return { 
      success: true, 
      message: 'OTP verified successfully',
      verificationId: this._id,
      verifiedAt: this.verifiedAt
    };

  } catch (error) {
    this.verificationResult = {
      success: false,
      errorMessage: `Verification error: ${error.message}`,
      verifiedBy: verificationData.verifiedBy || 'delivery_agent'
    };
    
    await this.save();
    return { success: false, message: 'OTP verification failed due to system error' };
  }
};

// Static method to clean up expired OTPs
otpVerificationSchema.statics.cleanupExpiredOTPs = async function() {
  try {
    const result = await this.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() }
      },
      {
        status: 'expired',
        'verificationResult.errorMessage': 'OTP expired automatically'
      }
    );

    return {
      success: true,
      expiredCount: result.modifiedCount
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Static method to get OTP statistics
otpVerificationSchema.statics.getOTPStats = async function(timeframe = 'today') {
  try {
    let matchCondition = {};
    
    if (timeframe === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchCondition.createdAt = { $gte: today };
    } else if (timeframe === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchCondition.createdAt = { $gte: weekAgo };
    }

    const stats = await this.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalGenerated: { $sum: 1 },
          totalVerified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
          totalExpired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          totalCancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          averageAttempts: { $avg: '$attemptCount' }
        }
      }
    ]);

    return stats[0] || {
      totalGenerated: 0,
      totalVerified: 0,
      totalExpired: 0,
      totalCancelled: 0,
      averageAttempts: 0
    };
  } catch (error) {
    throw new Error(`Failed to get OTP statistics: ${error.message}`);
  }
};

// Middleware to auto-expire OTPs
otpVerificationSchema.pre('save', function(next) {
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
    this.verificationResult.errorMessage = 'OTP expired automatically';
  }
  next();
});

// Middleware to clean up old expired OTPs (run daily)
otpVerificationSchema.statics.setupCleanupJob = function() {
  // This would typically be called from your server startup
  // to set up a cron job or scheduled task
  setInterval(async () => {
    try {
      await this.cleanupExpiredOTPs();
      console.log('📧 OTP cleanup completed successfully');
    } catch (error) {
      console.error('❌ OTP cleanup failed:', error);
    }
  }, 24 * 60 * 60 * 1000); // Run every 24 hours
};

const OtpVerification = mongoose.model('OtpVerification', otpVerificationSchema);

module.exports = OtpVerification; 

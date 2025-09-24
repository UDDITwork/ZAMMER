// backend/models/Payout.js - Payout Management Model
const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema({
  // Order Reference
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  
  // Seller Reference
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  
  // Beneficiary Reference
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashfreeBeneficiary',
    required: true
  },
  
  // Transfer Details
  transferId: {
    type: String,
    required: true,
    unique: true,
    maxlength: 40
  },
  
  cfTransferId: {
    type: String,
    default: null
  },
  
  // Amount Details
  orderAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  platformCommission: {
    type: Number,
    required: true,
    min: 0
  },
  
  gstAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  totalCommission: {
    type: Number,
    required: true,
    min: 0
  },
  
  payoutAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Transfer Status
  status: {
    type: String,
    enum: [
      'pending', 'initiated', 'processing', 'completed', 
      'failed', 'cancelled', 'reversed', 'approval_pending'
    ],
    default: 'pending'
  },
  
  statusCode: {
    type: String,
    default: null
  },
  
  statusDescription: {
    type: String,
    default: null
  },
  
  // Transfer Mode
  transferMode: {
    type: String,
    enum: ['banktransfer', 'imps', 'neft', 'rtgs', 'upi', 'paytm', 'amazonpay', 'card', 'cardupi'],
    default: 'banktransfer'
  },
  
  // UTR (Unique Transaction Reference)
  transferUtr: {
    type: String,
    default: null
  },
  
  // Fund Source
  fundsourceId: {
    type: String,
    default: 'CASHFREE_1'
  },
  
  // Batch Transfer Reference (for batch payouts)
  batchTransferId: {
    type: String,
    default: null
  },
  
  cfBatchTransferId: {
    type: String,
    default: null
  },
  
  // Processing Details
  processingAttempts: {
    type: Number,
    default: 0,
    max: 5
  },
  
  lastProcessingAttempt: {
    type: Date,
    default: null
  },
  
  nextRetryAt: {
    type: Date,
    default: null
  },
  
  // Error Handling
  errorCode: {
    type: String,
    default: null
  },
  
  errorMessage: {
    type: String,
    default: null
  },
  
  retryable: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  
  processedAt: {
    type: Date,
    default: null
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  failedAt: {
    type: Date,
    default: null
  },
  
  // Cashfree API Response
  cashfreeResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Additional Notes
  notes: {
    type: String,
    default: ''
  },
  
  // Admin Actions
  adminApproval: {
    required: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    }
  },
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for Performance
PayoutSchema.index({ order: 1 });
PayoutSchema.index({ seller: 1 });
PayoutSchema.index({ beneficiary: 1 });
PayoutSchema.index({ transferId: 1 });
PayoutSchema.index({ cfTransferId: 1 });
PayoutSchema.index({ status: 1 });
PayoutSchema.index({ batchTransferId: 1 });
PayoutSchema.index({ initiatedAt: 1 });
PayoutSchema.index({ processedAt: 1 });
PayoutSchema.index({ nextRetryAt: 1 });

// Compound Indexes
PayoutSchema.index({ 
  seller: 1, 
  status: 1 
});

PayoutSchema.index({ 
  status: 1, 
  nextRetryAt: 1 
});

PayoutSchema.index({ 
  batchTransferId: 1, 
  status: 1 
});

// Pre-save middleware
PayoutSchema.pre('save', function(next) {
  // Update status timestamps
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'initiated':
      case 'processing':
        this.processedAt = now;
        break;
      case 'completed':
        this.completedAt = now;
        break;
      case 'failed':
        this.failedAt = now;
        break;
    }
  }
  
  next();
});

// Virtual for formatted payout amount
PayoutSchema.virtual('formattedPayoutAmount').get(function() {
  return `₹${this.payoutAmount.toFixed(2)}`;
});

// Virtual for formatted commission
PayoutSchema.virtual('formattedCommission').get(function() {
  return `₹${this.totalCommission.toFixed(2)}`;
});

// Virtual for payout duration
PayoutSchema.virtual('payoutDuration').get(function() {
  if (this.completedAt && this.initiatedAt) {
    const duration = this.completedAt - this.initiatedAt;
    return Math.round(duration / (1000 * 60 * 60)); // Hours
  }
  return null;
});

// Instance Methods
PayoutSchema.methods.canRetry = function() {
  return (
    this.retryable &&
    this.processingAttempts < 5 &&
    this.status === 'failed' &&
    (!this.nextRetryAt || this.nextRetryAt <= new Date())
  );
};

PayoutSchema.methods.incrementProcessingAttempts = function() {
  this.processingAttempts += 1;
  this.lastProcessingAttempt = new Date();
  
  // Set next retry time (exponential backoff)
  const retryDelayMinutes = Math.pow(2, this.processingAttempts) * 30; // 30, 60, 120, 240, 480 minutes
  this.nextRetryAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
  
  return this.save();
};

PayoutSchema.methods.markAsCompleted = function(utr, cashfreeResponse = null) {
  this.status = 'completed';
  this.transferUtr = utr;
  this.completedAt = new Date();
  if (cashfreeResponse) {
    this.cashfreeResponse = cashfreeResponse;
  }
  return this.save();
};

PayoutSchema.methods.markAsFailed = function(errorCode, errorMessage, cashfreeResponse = null) {
  this.status = 'failed';
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;
  this.failedAt = new Date();
  if (cashfreeResponse) {
    this.cashfreeResponse = cashfreeResponse;
  }
  return this.save();
};

PayoutSchema.methods.requiresApproval = function() {
  return (
    this.adminApproval.required &&
    this.adminApproval.status === 'pending'
  );
};

// Static Methods
PayoutSchema.statics.findBySeller = function(sellerId, status = null) {
  const query = { seller: sellerId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ initiatedAt: -1 });
};

PayoutSchema.statics.findPendingPayouts = function() {
  return this.find({ 
    status: 'pending',
    nextRetryAt: { $lte: new Date() }
  });
};

PayoutSchema.statics.findFailedPayouts = function() {
  return this.find({ 
    status: 'failed',
    retryable: true,
    processingAttempts: { $lt: 5 }
  });
};

PayoutSchema.statics.findBatchPayouts = function(batchTransferId) {
  return this.find({ batchTransferId });
};

PayoutSchema.statics.getPayoutStats = function(sellerId = null) {
  const matchStage = sellerId ? { seller: mongoose.Types.ObjectId(sellerId) } : {};
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$payoutAmount' }
      }
    }
  ]);
};

PayoutSchema.statics.getTotalPayouts = function(sellerId = null) {
  const matchStage = sellerId ? { seller: mongoose.Types.ObjectId(sellerId) } : {};
  
  return this.aggregate([
    { $match: { ...matchStage, status: 'completed' } },
    {
      $group: {
        _id: null,
        totalPayouts: { $sum: '$payoutAmount' },
        totalOrders: { $sum: 1 },
        averagePayout: { $avg: '$payoutAmount' }
      }
    }
  ]);
};

// Ensure virtual fields are included in JSON output
PayoutSchema.set('toJSON', { virtuals: true });
PayoutSchema.set('toObject', { virtuals: true });

const Payout = mongoose.model('Payout', PayoutSchema);

module.exports = Payout;

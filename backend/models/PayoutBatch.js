// backend/models/PayoutBatch.js - Batch Payout Management Model
const mongoose = require('mongoose');

const PayoutBatchSchema = new mongoose.Schema({
  // Batch Identification
  batchTransferId: {
    type: String,
    required: true,
    unique: true,
    maxlength: 60
  },
  
  cfBatchTransferId: {
    type: String,
    default: null
  },
  
  // Batch Status
  status: {
    type: String,
    enum: [
      'pending', 'initiated', 'processing', 'completed', 
      'failed', 'cancelled', 'partially_completed'
    ],
    default: 'pending'
  },
  
  // Batch Details
  totalPayouts: {
    type: Number,
    required: true,
    min: 1
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  successfulPayouts: {
    type: Number,
    default: 0,
    min: 0
  },
  
  failedPayouts: {
    type: Number,
    default: 0,
    min: 0
  },
  
  pendingPayouts: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Amount Tracking
  successfulAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  failedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  pendingAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Processing Details
  processingAttempts: {
    type: Number,
    default: 0,
    max: 3
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
  
  // Date Range for Batch
  batchDate: {
    type: Date,
    required: true
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
PayoutBatchSchema.index({ batchTransferId: 1 });
PayoutBatchSchema.index({ cfBatchTransferId: 1 });
PayoutBatchSchema.index({ status: 1 });
PayoutBatchSchema.index({ batchDate: 1 });
PayoutBatchSchema.index({ initiatedAt: 1 });
PayoutBatchSchema.index({ nextRetryAt: 1 });

// Compound Indexes
PayoutBatchSchema.index({ 
  status: 1, 
  nextRetryAt: 1 
});

PayoutBatchSchema.index({ 
  batchDate: 1, 
  status: 1 
});

// Pre-save middleware
PayoutBatchSchema.pre('save', function(next) {
  // Update status timestamps
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'initiated':
      case 'processing':
        this.processedAt = now;
        break;
      case 'completed':
      case 'partially_completed':
        this.completedAt = now;
        break;
      case 'failed':
        this.failedAt = now;
        break;
    }
  }
  
  next();
});

// Virtual for batch duration
PayoutBatchSchema.virtual('batchDuration').get(function() {
  if (this.completedAt && this.initiatedAt) {
    const duration = this.completedAt - this.initiatedAt;
    return Math.round(duration / (1000 * 60)); // Minutes
  }
  return null;
});

// Virtual for success rate
PayoutBatchSchema.virtual('successRate').get(function() {
  if (this.totalPayouts > 0) {
    return Math.round((this.successfulPayouts / this.totalPayouts) * 100);
  }
  return 0;
});

// Virtual for formatted total amount
PayoutBatchSchema.virtual('formattedTotalAmount').get(function() {
  return `₹${this.totalAmount.toFixed(2)}`;
});

// Virtual for formatted successful amount
PayoutBatchSchema.virtual('formattedSuccessfulAmount').get(function() {
  return `₹${this.successfulAmount.toFixed(2)}`;
});

// Instance Methods
PayoutBatchSchema.methods.canRetry = function() {
  return (
    this.retryable &&
    this.processingAttempts < 3 &&
    this.status === 'failed' &&
    (!this.nextRetryAt || this.nextRetryAt <= new Date())
  );
};

PayoutBatchSchema.methods.incrementProcessingAttempts = function() {
  this.processingAttempts += 1;
  this.lastProcessingAttempt = new Date();
  
  // Set next retry time (exponential backoff)
  const retryDelayMinutes = Math.pow(2, this.processingAttempts) * 60; // 60, 120, 240 minutes
  this.nextRetryAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000);
  
  return this.save();
};

PayoutBatchSchema.methods.updateBatchStats = async function() {
  const Payout = mongoose.model('Payout');
  
  const stats = await Payout.aggregate([
    { $match: { batchTransferId: this.batchTransferId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$payoutAmount' }
      }
    }
  ]);
  
  // Reset counters
  this.successfulPayouts = 0;
  this.failedPayouts = 0;
  this.pendingPayouts = 0;
  this.successfulAmount = 0;
  this.failedAmount = 0;
  this.pendingAmount = 0;
  
  // Update counters based on stats
  stats.forEach(stat => {
    switch (stat._id) {
      case 'completed':
        this.successfulPayouts = stat.count;
        this.successfulAmount = stat.totalAmount;
        break;
      case 'failed':
        this.failedPayouts = stat.count;
        this.failedAmount = stat.totalAmount;
        break;
      case 'pending':
      case 'processing':
      case 'initiated':
        this.pendingPayouts = stat.count;
        this.pendingAmount = stat.totalAmount;
        break;
    }
  });
  
  // Update batch status based on results
  if (this.pendingPayouts === 0) {
    if (this.failedPayouts === 0) {
      this.status = 'completed';
    } else if (this.successfulPayouts === 0) {
      this.status = 'failed';
    } else {
      this.status = 'partially_completed';
    }
  }
  
  return this.save();
};

PayoutBatchSchema.methods.markAsCompleted = function(cashfreeResponse = null) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (cashfreeResponse) {
    this.cashfreeResponse = cashfreeResponse;
  }
  return this.save();
};

PayoutBatchSchema.methods.markAsFailed = function(errorCode, errorMessage, cashfreeResponse = null) {
  this.status = 'failed';
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;
  this.failedAt = new Date();
  if (cashfreeResponse) {
    this.cashfreeResponse = cashfreeResponse;
  }
  return this.save();
};

PayoutBatchSchema.methods.requiresApproval = function() {
  return (
    this.adminApproval.required &&
    this.adminApproval.status === 'pending'
  );
};

// Static Methods
PayoutBatchSchema.statics.findPendingBatches = function() {
  return this.find({ 
    status: 'pending',
    nextRetryAt: { $lte: new Date() }
  });
};

PayoutBatchSchema.statics.findFailedBatches = function() {
  return this.find({ 
    status: 'failed',
    retryable: true,
    processingAttempts: { $lt: 3 }
  });
};

PayoutBatchSchema.statics.getBatchStats = function(startDate, endDate) {
  const matchStage = {
    batchDate: { $gte: startDate, $lte: endDate }
  };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalPayouts: { $sum: '$totalPayouts' },
        totalAmount: { $sum: '$totalAmount' },
        successfulPayouts: { $sum: '$successfulPayouts' },
        successfulAmount: { $sum: '$successfulAmount' }
      }
    }
  ]);
};

PayoutBatchSchema.statics.getDailyStats = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    { $match: { batchDate: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$batchDate' }
        },
        totalBatches: { $sum: 1 },
        totalPayouts: { $sum: '$totalPayouts' },
        totalAmount: { $sum: '$totalAmount' },
        successfulPayouts: { $sum: '$successfulPayouts' },
        successfulAmount: { $sum: '$successfulAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Ensure virtual fields are included in JSON output
PayoutBatchSchema.set('toJSON', { virtuals: true });
PayoutBatchSchema.set('toObject', { virtuals: true });

const PayoutBatch = mongoose.model('PayoutBatch', PayoutBatchSchema);

module.exports = PayoutBatch;

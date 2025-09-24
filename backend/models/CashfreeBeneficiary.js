// backend/models/CashfreeBeneficiary.js - Cashfree Beneficiary Management Model
const mongoose = require('mongoose');

const CashfreeBeneficiarySchema = new mongoose.Schema({
  // Seller Reference
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
    unique: true
  },
  
  // Cashfree Beneficiary Details
  beneficiaryId: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  
  beneficiaryName: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  // Bank Account Details
  bankAccountNumber: {
    type: String,
    required: true,
    maxlength: 25
  },
  
  bankIfsc: {
    type: String,
    required: true,
    length: 11
  },
  
  bankName: {
    type: String,
    required: true
  },
  
  // Contact Details
  beneficiaryEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  
  beneficiaryPhone: {
    type: String,
    required: true
  },
  
  beneficiaryCountryCode: {
    type: String,
    default: '+91'
  },
  
  beneficiaryAddress: {
    type: String,
    required: true
  },
  
  beneficiaryCity: {
    type: String,
    required: true
  },
  
  beneficiaryState: {
    type: String,
    required: true
  },
  
  beneficiaryPostalCode: {
    type: String,
    required: true
  },
  
  // UPI Details (Optional)
  vpa: {
    type: String,
    default: null
  },
  
  // Cashfree Status
  beneficiaryStatus: {
    type: String,
    enum: ['VERIFIED', 'INVALID', 'INITIATED', 'CANCELLED', 'FAILED', 'DELETED'],
    default: 'INITIATED'
  },
  
  // Verification Details
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'rejected'],
    default: 'pending'
  },
  
  verificationAttempts: {
    type: Number,
    default: 0,
    max: 3
  },
  
  lastVerificationAttempt: {
    type: Date,
    default: null
  },
  
  verificationNotes: {
    type: String,
    default: ''
  },
  
  // Cashfree API Response
  cashfreeResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Audit Fields
  addedOn: {
    type: Date,
    default: Date.now
  },
  
  updatedOn: {
    type: Date,
    default: Date.now
  },
  
  // Soft Delete
  isActive: {
    type: Boolean,
    default: true
  },
  
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for Performance
CashfreeBeneficiarySchema.index({ seller: 1 });
CashfreeBeneficiarySchema.index({ beneficiaryId: 1 });
CashfreeBeneficiarySchema.index({ beneficiaryStatus: 1 });
CashfreeBeneficiarySchema.index({ verificationStatus: 1 });
CashfreeBeneficiarySchema.index({ isActive: 1 });

// Compound Indexes
CashfreeBeneficiarySchema.index({ 
  seller: 1, 
  isActive: 1 
});

CashfreeBeneficiarySchema.index({ 
  beneficiaryStatus: 1, 
  verificationStatus: 1 
});

// Pre-save middleware
CashfreeBeneficiarySchema.pre('save', function(next) {
  this.updatedOn = new Date();
  next();
});

// Virtual for formatted phone number
CashfreeBeneficiarySchema.virtual('formattedPhone').get(function() {
  if (this.beneficiaryPhone && this.beneficiaryCountryCode) {
    return `${this.beneficiaryCountryCode}${this.beneficiaryPhone}`;
  }
  return this.beneficiaryPhone;
});

// Virtual for masked account number
CashfreeBeneficiarySchema.virtual('maskedAccountNumber').get(function() {
  if (this.bankAccountNumber && this.bankAccountNumber.length > 4) {
    const masked = '*'.repeat(this.bankAccountNumber.length - 4);
    return masked + this.bankAccountNumber.slice(-4);
  }
  return this.bankAccountNumber;
});

// Instance Methods
CashfreeBeneficiarySchema.methods.isVerified = function() {
  return this.beneficiaryStatus === 'VERIFIED' && this.verificationStatus === 'verified';
};

CashfreeBeneficiarySchema.methods.canCreatePayout = function() {
  return this.isActive && this.isVerified();
};

CashfreeBeneficiarySchema.methods.incrementVerificationAttempts = function() {
  this.verificationAttempts += 1;
  this.lastVerificationAttempt = new Date();
  return this.save();
};

CashfreeBeneficiarySchema.methods.markAsVerified = function(cashfreeResponse = null) {
  this.beneficiaryStatus = 'VERIFIED';
  this.verificationStatus = 'verified';
  this.verificationNotes = 'Successfully verified with Cashfree';
  if (cashfreeResponse) {
    this.cashfreeResponse = cashfreeResponse;
  }
  return this.save();
};

CashfreeBeneficiarySchema.methods.markAsFailed = function(reason, cashfreeResponse = null) {
  this.beneficiaryStatus = 'FAILED';
  this.verificationStatus = 'failed';
  this.verificationNotes = reason;
  if (cashfreeResponse) {
    this.cashfreeResponse = cashfreeResponse;
  }
  return this.save();
};

CashfreeBeneficiarySchema.methods.softDelete = function() {
  this.isActive = false;
  this.deletedAt = new Date();
  this.beneficiaryStatus = 'DELETED';
  return this.save();
};

// Static Methods
CashfreeBeneficiarySchema.statics.findBySeller = function(sellerId) {
  return this.findOne({ 
    seller: sellerId, 
    isActive: true 
  });
};

CashfreeBeneficiarySchema.statics.findVerifiedBeneficiaries = function() {
  return this.find({ 
    beneficiaryStatus: 'VERIFIED',
    verificationStatus: 'verified',
    isActive: true 
  });
};

CashfreeBeneficiarySchema.statics.findPendingVerification = function() {
  return this.find({ 
    verificationStatus: 'pending',
    isActive: true 
  });
};

// Ensure virtual fields are included in JSON output
CashfreeBeneficiarySchema.set('toJSON', { virtuals: true });
CashfreeBeneficiarySchema.set('toObject', { virtuals: true });

const CashfreeBeneficiary = mongoose.model('CashfreeBeneficiary', CashfreeBeneficiarySchema);

module.exports = CashfreeBeneficiary;

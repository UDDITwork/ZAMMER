// backend/models/Order.js - Enhanced version with delivery agent and admin features
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  }
});

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  orderItems: [OrderItemSchema],
  shippingAddress: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Card', 'PayPal', 'Cash on Delivery', 'UPI', 'SMEPay', 'Cashfree']
  },
  paymentResult: {
    id: { type: String },
    status: { type: String },
    update_time: { type: String },
    email_address: { type: String },
    // 🆕 SMEPay specific fields
    smepay_transaction_id: { type: String },
    smepay_order_slug: { type: String },
    smepay_ref_id: { type: String },
    gateway: {
      type: String,
      enum: ['paypal', 'smepay', 'cashfree', 'cod'],
      default: 'cod'
    }
  },

  // 🆕 SMEPay Order Integration
  smepayOrderSlug: {
    type: String,
    default: null
  },

  // 🆕 Cashfree Payment Gateway Integration
  cashfreeOrderId: {
    type: String,
    default: null
  },
  cashfreeMerchantOrderId: {
    type: String,
    default: null
  },
  cashfreePaymentSessionId: {
    type: String,
    default: null
  },
  cashfreePaymentId: {
    type: String,
    default: null
  },

  // Payment Gateway
  paymentGateway: {
    type: String,
    enum: ['paypal', 'smepay', 'cashfree', 'cod', 'card'],
    default: 'cod'
  },

  // Payment Status (separate from order status)
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },

  // Payment Attempts History
  paymentAttempts: [{
    gateway: {
      type: String,
      enum: ['smepay', 'paypal', 'card', 'cashfree'],
      required: true
    },
    orderSlug: {
      type: String,
      default: null
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['initiated', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'initiated'
    },
    refId: {
      type: String,
      default: null
    },
    transactionId: {
      type: String,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
    }
  }],

  // 🆕 CASHFREE PAYOUT INTEGRATION
  payout: {
    // Payout Status
    status: {
      type: String,
      enum: ['not_eligible', 'eligible', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'not_eligible'
    },
    
    // Commission Calculation
    commission: {
      platformCommission: {
        type: Number,
        default: 0
      },
      gstAmount: {
        type: Number,
        default: 0
      },
      totalCommission: {
        type: Number,
        default: 0
      },
      sellerAmount: {
        type: Number,
        default: 0
      }
    },
    
    // Payout Processing
    processed: {
      type: Boolean,
      default: false
    },
    
    processedAt: {
      type: Date,
      default: null
    },
    
    // Payout Reference
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payout',
      default: null
    },
    
    transferId: {
      type: String,
      default: null
    },
    
    cfTransferId: {
      type: String,
      default: null
    },
    
    transferUtr: {
      type: String,
      default: null
    },
    
    // Batch Processing
    batchTransferId: {
      type: String,
      default: null
    },
    
    // Eligibility Check
    eligibilityCheckedAt: {
      type: Date,
      default: null
    },
    
    eligibilityNotes: {
      type: String,
      default: ''
    },
    
    // Error Handling
    payoutError: {
      code: {
        type: String,
        default: null
      },
      message: {
        type: String,
        default: null
      },
      retryable: {
        type: Boolean,
        default: true
      }
    }
  },

  taxPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false
  },
  paidAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    required: true,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Pickup_Ready', 'Out_for_Delivery'],
    default: 'Pending'
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  isRead: {
    type: Boolean,
    default: false // For seller notifications
  },
  notes: {
    type: String,
    default: ''
  },

  // 🆕 ADMIN APPROVAL WORKFLOW
  adminApproval: {
    isRequired: {
      type: Boolean,
      default: true // All orders require admin approval for delivery assignment
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'auto_approved'],
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
      default: ''
    },
    autoApprovalAt: {
      type: Date,
      default: function() {
        // Auto-approve after 1 hour if no manual approval
        return new Date(Date.now() + 60 * 60 * 1000);
      }
    }
  },

  // 🆕 DELIVERY AGENT ASSIGNMENT
  deliveryAgent: {
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAgent',
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    status: {
      type: String,
      enum: ['unassigned', 'assigned', 'accepted', 'rejected', 'pickup_completed', 'location_reached', 'delivery_completed'],
      default: 'unassigned'
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    pickupCompletedAt: {
      type: Date,
      default: null
    },
    locationReachedAt: {
      type: Date,
      default: null
    },
    deliveryCompletedAt: {
      type: Date,
      default: null
    }
  },

  // 🆕 PICKUP TRACKING
  pickup: {
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    sellerLocationReachedAt: {
      type: Date,
      default: null
    },
    verificationMethod: {
      type: String,
      enum: ['order_id', 'qr_code', 'manual'],
      default: 'order_id'
    },
    pickupLocation: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    pickupNotes: {
      type: String,
      default: ''
    }
  },

  // 🆕 DELIVERY TRACKING
  delivery: {
    isAttempted: {
      type: Boolean,
      default: false
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    attempts: [{
      attemptNumber: { type: Number },
      attemptedAt: { type: Date },
      status: { 
        type: String, 
        enum: ['failed', 'successful', 'customer_unavailable', 'wrong_address'] 
      },
      notes: { type: String, default: '' },
      location: {
        type: {
          type: String,
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      }
    }],
    locationReachedAt: {
      type: Date,
      default: null
    },
    locationNotes: {
      type: String,
      default: ''
    },
    completedAt: {
      type: Date,
      default: null
    },
    deliveryLocation: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude] 
        default: [0, 0]
      }
    },
    recipientName: {
      type: String,
      default: ''
    },
    deliveryNotes: {
      type: String,
      default: ''
    }
  },

  // 🆕 OTP VERIFICATION FOR DELIVERY
  otpVerification: {
    isRequired: {
      type: Boolean,
      default: true
    },
    currentOTP: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OtpVerification',
      default: null
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },

  // 🆕 CASH ON DELIVERY HANDLING
  codPayment: {
    isCollected: {
      type: Boolean,
      default: false
    },
    collectedAt: {
      type: Date,
      default: null
    },
    collectedAmount: {
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
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAgent',
      default: null
    }
  },

  // Enhanced cancellation tracking (existing)
  cancellationDetails: {
    cancelledBy: {
      type: String,
      enum: ['buyer', 'seller', 'admin', 'delivery_agent'],
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    cancelledByName: {
      type: String,
      default: ''
    }
  },

  // Enhanced status history tracking (existing)
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: String,
      enum: ['buyer', 'seller', 'admin', 'delivery_agent', 'system'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    },
    // 🆕 Additional tracking
    location: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  }],

  // Invoice tracking (existing)
  invoiceGenerated: {
    type: Boolean,
    default: false
  },
  invoiceUrl: {
    type: String,
    default: null
  },
  invoiceGeneratedAt: {
    type: Date,
    default: null
  },

  // 🆕 DELIVERY FEES AND EARNINGS
  deliveryFees: {
    baseFee: {
      type: Number,
      default: 20 // Base delivery fee
    },
    distanceFee: {
      type: Number,
      default: 0 // Additional fee based on distance
    },
    totalFee: {
      type: Number,
      default: 20
    },
    agentEarning: {
      type: Number,
      default: 15 // Agent gets 75% of delivery fee
    },
    platformCommission: {
      type: Number,
      default: 5 // Platform keeps 25%
    }
  },

  // 🆕 ESTIMATED DELIVERY TIME
  estimatedDelivery: {
    estimatedAt: {
      type: Date,
      default: function() {
        // Default: 2 hours from order placement
        return new Date(Date.now() + 2 * 60 * 60 * 1000);
      }
    },
    actualDeliveryTime: {
      type: Number, // in minutes
      default: null
    },
    isOnTime: {
      type: Boolean,
      default: null
    }
  },

  // 🆕 REAL-TIME TRACKING
  liveTracking: {
    isEnabled: {
      type: Boolean,
      default: true
    },
    lastKnownLocation: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    },
    estimatedArrival: {
      type: Date,
      default: null
    }
  },

  // 🆕 SHIPPING LABEL GENERATION
  shippingLabel: {
    isGenerated: {
      type: Boolean,
      default: false
    },
    generatedAt: {
      type: Date,
      default: null
    },
    trackingNumber: {
      type: String,
      default: null
    },
    carrier: {
      type: String,
      default: 'Shadowfax'
    },
    serviceType: {
      type: String,
      default: 'Pickup'
    },
    destinationCode: {
      type: String,
      default: null
    },
    returnCode: {
      type: String,
      default: null
    },
    labelUrl: {
      type: String,
      default: null
    },
    labelData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },

  // 🆕 ORDER RETURN SYSTEM
  returnDetails: {
    isReturned: {
      type: Boolean,
      default: false
    },
    returnRequestedAt: {
      type: Date,
      default: null
    },
    returnReason: {
      type: String,
      default: ''
    },
    returnStatus: {
      type: String,
      enum: ['eligible', 'requested', 'approved', 'picked_up', 'returned_to_seller', 'completed', 'rejected'],
      default: 'eligible'
    },
    returnWindow: {
      deliveredAt: {
        type: Date,
        default: null
      },
      returnDeadline: {
        type: Date,
        default: null
      },
      isWithinWindow: {
        type: Boolean,
        default: true
      }
    },
    returnAssignment: {
      deliveryAgent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryAgent',
        default: null
      },
      assignedAt: {
        type: Date,
        default: null
      },
      assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
      },
      status: {
        type: String,
        enum: ['unassigned', 'assigned', 'accepted', 'rejected', 'picked_up', 'returned'],
        default: 'unassigned'
      },
      acceptedAt: {
        type: Date,
        default: null
      },
      rejectedAt: {
        type: Date,
        default: null
      },
      rejectionReason: {
        type: String,
        default: ''
      }
    },
    returnPickup: {
      isCompleted: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date,
        default: null
      },
      pickupOTP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OtpVerification',
        default: null
      },
      pickupLocation: {
        type: {
          type: String,
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      },
      pickupNotes: {
        type: String,
        default: ''
      }
    },
    returnDelivery: {
      isCompleted: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date,
        default: null
      },
      sellerOTP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OtpVerification',
        default: null
      },
      sellerLocation: {
        type: {
          type: String,
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      },
      sellerNotes: {
        type: String,
        default: ''
      }
    },
    returnHistory: [{
      status: {
        type: String,
        required: true
      },
      changedBy: {
        type: String,
        enum: ['buyer', 'seller', 'admin', 'delivery_agent', 'system'],
        required: true
      },
      changedAt: {
        type: Date,
        default: Date.now
      },
      notes: {
        type: String,
        default: ''
      },
      location: {
        type: {
          type: String,
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🆕 Enhanced indexes for delivery features
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ seller: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'cancellationDetails.cancelledBy': 1 });
OrderSchema.index({ 'deliveryAgent.agent': 1 }); // 🆕
OrderSchema.index({ 'deliveryAgent.status': 1 }); // 🆕
OrderSchema.index({ 'adminApproval.status': 1 }); // 🆕
OrderSchema.index({ 'adminApproval.autoApprovalAt': 1 }); // 🆕
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ 'delivery.isCompleted': 1 });
OrderSchema.index({ 'pickup.isCompleted': 1 });
// 🆕 Return system indexes
OrderSchema.index({ 'returnDetails.returnStatus': 1 });
OrderSchema.index({ 'returnDetails.returnAssignment.deliveryAgent': 1 });
OrderSchema.index({ 'returnDetails.returnAssignment.status': 1 });
OrderSchema.index({ 'returnDetails.returnWindow.returnDeadline': 1 });
OrderSchema.index({ 'returnDetails.returnRequestedAt': 1 });

// Add status history entry when status changes (existing functionality)
OrderSchema.pre('save', async function(next) {
  // Add status history entry when status changes
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this._statusChangedBy || 'system',
      changedAt: new Date(),
      notes: this._statusChangeNotes || '',
      location: this._statusChangeLocation || {
        type: 'Point',
        coordinates: [0, 0]
      }
    });
  }

  // Add initial status history for new orders
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedBy: 'system',
      changedAt: new Date(),
      notes: 'Order created'
    });
  }

  next();
});

// 🆕 Method to update status with enhanced tracking
OrderSchema.methods.updateStatus = function(newStatus, changedBy, notes = '', location = null) {
  this.status = newStatus;
  this._statusChangedBy = changedBy;
  this._statusChangeNotes = notes;
  this._statusChangeLocation = location;
  
  // Handle cancellation details
  if (newStatus === 'Cancelled') {
    this.cancellationDetails = {
      cancelledBy: changedBy,
      cancelledAt: new Date(),
      cancellationReason: notes,
      cancelledByName: this._cancelledByName || ''
    };
  }
  
  // Handle delivery completion
  if (newStatus === 'Delivered') {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    this.delivery.isCompleted = true;
    this.delivery.completedAt = new Date();
    
    // Calculate actual delivery time
    if (this.createdAt) {
      this.estimatedDelivery.actualDeliveryTime = Math.floor(
        (new Date() - this.createdAt) / (1000 * 60)
      ); // in minutes
      
      // Check if delivery was on time
      this.estimatedDelivery.isOnTime = new Date() <= this.estimatedDelivery.estimatedAt;
    }
  }
  
  return this.save();
};

// 🆕 Method to assign delivery agent
OrderSchema.methods.assignDeliveryAgent = function(agentId, assignedBy) {
  this.deliveryAgent = {
    agent: agentId,
    assignedAt: new Date(),
    assignedBy: assignedBy,
    status: 'assigned'
  };
  
  // Update order status
  this.status = 'Pickup_Ready';
  this._statusChangedBy = 'admin';
  this._statusChangeNotes = `Assigned to delivery agent`;
  
  // ✅ Don't save automatically, let caller control timing
  return this;
};

// 🆕 Method to handle delivery agent response
OrderSchema.methods.handleDeliveryAgentResponse = function(response, reason = '') {
  if (response === 'accepted') {
    this.deliveryAgent.status = 'accepted';
    this.deliveryAgent.acceptedAt = new Date();
  } else if (response === 'rejected') {
    this.deliveryAgent.status = 'rejected';
    this.deliveryAgent.rejectedAt = new Date();
    this.deliveryAgent.rejectionReason = reason;
    
    // Reset assignment for reassignment
    this.deliveryAgent.agent = null;
    this.deliveryAgent.assignedAt = null;
    this.deliveryAgent.status = 'unassigned';
  }
  
  return this.save();
};

// 🆕 Method to complete pickup
OrderSchema.methods.completePickup = function(verificationData = {}) {
  this.pickup = {
    isCompleted: true,
    completedAt: new Date(),
    verificationMethod: verificationData.method || 'order_id',
    pickupLocation: verificationData.location || {
      type: 'Point',
      coordinates: [0, 0]
    },
    pickupNotes: verificationData.notes || ''
  };
  
  this.deliveryAgent.status = 'pickup_completed';
  this.status = 'Out_for_Delivery';
  this._statusChangedBy = 'delivery_agent';
  this._statusChangeNotes = 'Order picked up from seller';
  this._statusChangeLocation = verificationData.location;
  
  return this.save();
};

// 🆕 Method to complete delivery with OTP
OrderSchema.methods.completeDelivery = function(verificationData = {}) {
  // Mark delivery as completed
  this.delivery.isCompleted = true;
  this.delivery.completedAt = new Date();
  this.delivery.deliveryLocation = verificationData.location || {
    type: 'Point',
    coordinates: [0, 0]
  };
  this.delivery.recipientName = verificationData.recipientName || '';
  this.delivery.deliveryNotes = verificationData.notes || '';
  
  // Update delivery agent status
  this.deliveryAgent.status = 'delivery_completed';
  
  // Update order status
  this.status = 'Delivered';
  this.isDelivered = true;
  this.deliveredAt = new Date();
  
  // Mark OTP as verified if applicable
  if (this.otpVerification.isRequired) {
    this.otpVerification.isVerified = true;
    this.otpVerification.verifiedAt = new Date();
  }
  
  // Handle COD payment if applicable
  if (this.paymentMethod === 'Cash on Delivery' && verificationData.codPayment) {
    this.codPayment = {
      isCollected: true,
      collectedAt: new Date(),
      collectedAmount: verificationData.codPayment.amount || this.totalPrice,
      paymentMethod: verificationData.codPayment.method || 'cash',
      transactionId: verificationData.codPayment.transactionId || '',
      collectedBy: verificationData.deliveryAgentId
    };
    
    // Mark as paid if COD was collected
    this.isPaid = true;
    this.paidAt = new Date();
  }
  
  this._statusChangedBy = 'delivery_agent';
  this._statusChangeNotes = 'Order delivered successfully';
  this._statusChangeLocation = verificationData.location;
  
  return this.save();
};

// 🆕 Method to approve order (admin)
OrderSchema.methods.approveForDelivery = function(adminId) {
  this.adminApproval = {
    ...this.adminApproval,
    status: 'approved',
    approvedBy: adminId,
    approvedAt: new Date()
  };
  
  this._statusChangedBy = 'admin';
  this._statusChangeNotes = 'Order approved for delivery assignment';
  
  return this.save();
};

// 🆕 Method to add payment attempt
OrderSchema.methods.addPaymentAttempt = function(attemptData) {
  if (!this.paymentAttempts) {
    this.paymentAttempts = [];
  }
  
  this.paymentAttempts.push({
    gateway: attemptData.gateway,
    orderSlug: attemptData.orderSlug || null,
    amount: attemptData.amount,
    status: 'initiated',
    refId: attemptData.refId || null,
    createdAt: new Date()
  });
  
  return this.save();
};

// 🆕 Method to update payment attempt status
OrderSchema.methods.updatePaymentAttempt = function(orderSlug, status, updateData = {}) {
  const attempt = this.paymentAttempts.find(
    att => att.orderSlug === orderSlug && att.status !== 'completed'
  );
  
  if (attempt) {
    attempt.status = status;
    if (status === 'completed') {
      attempt.completedAt = new Date();
      attempt.transactionId = updateData.transactionId || null;
      
      // Update main order payment fields
      this.isPaid = true;
      this.paidAt = new Date();
      this.paymentStatus = 'completed';
      this.paymentResult = {
        ...this.paymentResult,
        gateway: attempt.gateway,
        smepay_transaction_id: updateData.transactionId,
        smepay_order_slug: orderSlug,
        smepay_ref_id: attempt.refId,
        status: 'completed'
      };
    } else if (status === 'failed') {
      attempt.errorMessage = updateData.errorMessage || null;
      this.paymentStatus = 'failed';
    }
  }
  
  return this.save();
};

// 🆕 Method to check if order has active SMEPay attempt
OrderSchema.methods.hasActiveSMEPayAttempt = function() {
  return this.paymentAttempts.some(
    attempt => attempt.gateway === 'smepay' && 
               ['initiated', 'processing'].includes(attempt.status)
  );
};

// Existing method to get cancellation display text
OrderSchema.methods.getCancellationText = function() {
  if (this.status !== 'Cancelled' || !this.cancellationDetails.cancelledBy) {
    return null;
  }
  
  const cancelledBy = this.cancellationDetails.cancelledBy;
  const cancelledAt = this.cancellationDetails.cancelledAt;
  const displayName = this.cancellationDetails.cancelledByName || cancelledBy;
  
  return {
    text: `Cancelled by ${displayName}`,
    timestamp: cancelledAt,
    reason: this.cancellationDetails.cancellationReason
  };
};

// 🆕 Virtual to check if order can be assigned to delivery agent
OrderSchema.virtual('canAssignDeliveryAgent').get(function() {
  return this.adminApproval.status === 'approved' && 
         this.deliveryAgent.status === 'unassigned' &&
         this.status !== 'Cancelled' &&
         this.status !== 'Delivered';
});

// 🆕 Virtual to get current delivery stage
OrderSchema.virtual('deliveryStage').get(function() {
  if (this.status === 'Delivered') return 'delivered';
  if (this.delivery.isCompleted) return 'delivered';
  if (this.status === 'Out_for_Delivery') return 'out_for_delivery';
  if (this.pickup.isCompleted) return 'picked_up';
  if (this.deliveryAgent.status === 'accepted') return 'agent_assigned';
  if (this.adminApproval.status === 'approved') return 'ready_for_assignment';
  if (this.adminApproval.status === 'pending') return 'awaiting_approval';
  return 'processing';
});

// 🆕 Static method to auto-approve pending orders
OrderSchema.statics.autoApprovePendingOrders = async function() {
  try {
    const result = await this.updateMany(
      {
        'adminApproval.status': 'pending',
        'adminApproval.autoApprovalAt': { $lte: new Date() },
        status: { $ne: 'Cancelled' }
      },
      {
        'adminApproval.status': 'auto_approved',
        'adminApproval.approvedAt': new Date()
      }
    );

    return {
      success: true,
      autoApprovedCount: result.modifiedCount
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// 🆕 Static method to find orders ready for delivery assignment
OrderSchema.statics.findOrdersReadyForAssignment = function() {
  return this.find({
    'adminApproval.status': { $in: ['approved', 'auto_approved'] },
    'deliveryAgent.status': 'unassigned',
    status: { $nin: ['Cancelled', 'Delivered'] }
  }).populate('user seller')
    .sort({ createdAt: 1 }); // FIFO basis
};

// 🆕 Static method to find orders with pending SMEPay payments
OrderSchema.statics.findPendingSMEPayOrders = function() {
  return this.find({
    paymentGateway: 'smepay',
    paymentStatus: { $in: ['pending', 'processing'] },
    status: { $ne: 'Cancelled' }
  }).populate('user seller');
};

// 🆕 Method to generate shipping label
OrderSchema.methods.generateShippingLabel = function() {
  // Generate tracking number
  const trackingNumber = 'SF' + Date.now() + 'FPL';
  
  // Generate destination code based on city
  const cityCode = this.shippingAddress.city.substring(0, 3).toUpperCase();
  const destinationCode = `W24_BOM_${cityCode}`;
  
  // Generate return code
  const returnCode = `${this.shippingAddress.postalCode},${Math.floor(Math.random() * 100000)}`;
  
  // Update shipping label data
  this.shippingLabel = {
    isGenerated: true,
    generatedAt: new Date(),
    trackingNumber,
    carrier: 'Shadowfax',
    serviceType: 'Pickup',
    destinationCode,
    returnCode,
    labelData: {
      orderNumber: this.orderNumber,
      customerName: this.user?.name || 'Unknown',
      customerPhone: this.shippingAddress.phone,
      customerEmail: this.user?.email || 'Unknown',
      customerAddress: this.shippingAddress.address,
      customerCity: this.shippingAddress.city,
      customerPincode: this.shippingAddress.postalCode,
      totalAmount: this.totalPrice,
      paymentMethod: this.paymentMethod,
      orderDate: this.createdAt,
      items: this.orderItems.map(item => ({
        name: item.name,
        sku: `${item.name.substring(0, 6).toUpperCase()}_${item.color.toUpperCase()}_${String(item.size).padStart(4, '0')}`,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.price
      }))
    }
  };
  
  return this.save();
};

// 🆕 RETURN SYSTEM METHODS

// Method to check return eligibility (24-hour window)
OrderSchema.methods.checkReturnEligibility = function() {
  if (!this.isDelivered || !this.deliveredAt) {
    return { 
      eligible: false, 
      reason: 'Order not delivered yet',
      hoursRemaining: 0 
    };
  }
  
  const deliveryTime = new Date(this.deliveredAt);
  const currentTime = new Date();
  const hoursSinceDelivery = (currentTime - deliveryTime) / (1000 * 60 * 60);
  
  if (hoursSinceDelivery > 24) {
    return { 
      eligible: false, 
      reason: 'Return window expired (24 hours)',
      hoursRemaining: 0,
      hoursExpired: hoursSinceDelivery - 24
    };
  }
  
  return { 
    eligible: true, 
    reason: 'Within 24-hour return window',
    hoursRemaining: Math.max(0, 24 - hoursSinceDelivery),
    deadline: new Date(deliveryTime.getTime() + 24 * 60 * 60 * 1000)
  };
};

// Method to request return
OrderSchema.methods.requestReturn = function(reason, userId) {
  const eligibility = this.checkReturnEligibility();
  
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }
  
  // Initialize return details if not exists
  if (!this.returnDetails) {
    this.returnDetails = {};
  }
  
  this.returnDetails.isReturned = true;
  this.returnDetails.returnRequestedAt = new Date();
  this.returnDetails.returnReason = reason;
  this.returnDetails.returnStatus = 'requested';
  this.returnDetails.returnWindow = {
    deliveredAt: this.deliveredAt,
    returnDeadline: eligibility.deadline,
    isWithinWindow: true
  };
  
  // Add to return history
  if (!this.returnDetails.returnHistory) {
    this.returnDetails.returnHistory = [];
  }
  
  this.returnDetails.returnHistory.push({
    status: 'requested',
    changedBy: 'buyer',
    changedAt: new Date(),
    notes: `Return requested: ${reason}`
  });
  
  return this.save();
};

// Method to assign return delivery agent
OrderSchema.methods.assignReturnAgent = function(agentId, adminId) {
  if (this.returnDetails.returnStatus !== 'requested') {
    throw new Error('Return must be in requested status to assign agent');
  }
  
  this.returnDetails.returnAssignment = {
    deliveryAgent: agentId,
    assignedAt: new Date(),
    assignedBy: adminId,
    status: 'assigned'
  };
  
  this.returnDetails.returnStatus = 'approved';
  
  // Add to return history
  this.returnDetails.returnHistory.push({
    status: 'assigned',
    changedBy: 'admin',
    changedAt: new Date(),
    notes: 'Return assigned to delivery agent'
  });
  
  return this.save();
};

// Method to handle return agent response
OrderSchema.methods.handleReturnAgentResponse = function(response, reason = '') {
  if (response === 'accepted') {
    this.returnDetails.returnAssignment.status = 'accepted';
    this.returnDetails.returnAssignment.acceptedAt = new Date();
    
    this.returnDetails.returnHistory.push({
      status: 'accepted',
      changedBy: 'delivery_agent',
      changedAt: new Date(),
      notes: 'Return assignment accepted'
    });
  } else if (response === 'rejected') {
    this.returnDetails.returnAssignment.status = 'rejected';
    this.returnDetails.returnAssignment.rejectedAt = new Date();
    this.returnDetails.returnAssignment.rejectionReason = reason;
    
    // Reset assignment for reassignment
    this.returnDetails.returnAssignment.deliveryAgent = null;
    this.returnDetails.returnAssignment.assignedAt = null;
    this.returnDetails.returnAssignment.status = 'unassigned';
    this.returnDetails.returnStatus = 'requested';
    
    this.returnDetails.returnHistory.push({
      status: 'rejected',
      changedBy: 'delivery_agent',
      changedAt: new Date(),
      notes: `Return assignment rejected: ${reason}`
    });
  }
  
  return this.save();
};

// Method to complete return pickup
OrderSchema.methods.completeReturnPickup = function(verificationData = {}) {
  if (this.returnDetails.returnAssignment.status !== 'accepted') {
    throw new Error('Return must be accepted by delivery agent before pickup');
  }
  
  this.returnDetails.returnPickup = {
    isCompleted: true,
    completedAt: new Date(),
    pickupOTP: verificationData.pickupOTP || null,
    pickupLocation: verificationData.location || {
      type: 'Point',
      coordinates: [0, 0]
    },
    pickupNotes: verificationData.notes || ''
  };
  
  this.returnDetails.returnAssignment.status = 'picked_up';
  this.returnDetails.returnStatus = 'picked_up';
  
  this.returnDetails.returnHistory.push({
    status: 'picked_up',
    changedBy: 'delivery_agent',
    changedAt: new Date(),
    notes: 'Return picked up from buyer',
    location: verificationData.location
  });
  
  return this.save();
};

// Method to complete return delivery to seller
OrderSchema.methods.completeReturnDelivery = function(verificationData = {}) {
  if (this.returnDetails.returnAssignment.status !== 'picked_up') {
    throw new Error('Return must be picked up before delivery to seller');
  }
  
  this.returnDetails.returnDelivery = {
    isCompleted: true,
    completedAt: new Date(),
    sellerOTP: verificationData.sellerOTP || null,
    sellerLocation: verificationData.location || {
      type: 'Point',
      coordinates: [0, 0]
    },
    sellerNotes: verificationData.notes || ''
  };
  
  this.returnDetails.returnAssignment.status = 'returned';
  this.returnDetails.returnStatus = 'returned_to_seller';
  
  this.returnDetails.returnHistory.push({
    status: 'returned_to_seller',
    changedBy: 'delivery_agent',
    changedAt: new Date(),
    notes: 'Return delivered to seller',
    location: verificationData.location
  });
  
  return this.save();
};

// Method to complete return process
OrderSchema.methods.completeReturn = function() {
  this.returnDetails.returnStatus = 'completed';
  
  this.returnDetails.returnHistory.push({
    status: 'completed',
    changedBy: 'system',
    changedAt: new Date(),
    notes: 'Return process completed'
  });
  
  return this.save();
};

// Method to reject return
OrderSchema.methods.rejectReturn = function(reason, rejectedBy) {
  this.returnDetails.returnStatus = 'rejected';
  
  this.returnDetails.returnHistory.push({
    status: 'rejected',
    changedBy: rejectedBy,
    changedAt: new Date(),
    notes: `Return rejected: ${reason}`
  });
  
  return this.save();
};

// 🆕 Virtual to check if order is return eligible
OrderSchema.virtual('isReturnEligible').get(function() {
  return this.checkReturnEligibility().eligible;
});

// 🆕 Virtual to get return window info
OrderSchema.virtual('returnWindowInfo').get(function() {
  return this.checkReturnEligibility();
});

// 🆕 Virtual to check if return is in progress
OrderSchema.virtual('isReturnInProgress').get(function() {
  return this.returnDetails && 
         ['requested', 'approved', 'assigned', 'accepted', 'picked_up', 'returned_to_seller'].includes(this.returnDetails.returnStatus);
});

// 🆕 Static method to find orders eligible for return
OrderSchema.statics.findEligibleForReturn = function() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return this.find({
    isDelivered: true,
    deliveredAt: { $gte: twentyFourHoursAgo },
    status: 'Delivered',
    'returnDetails.returnStatus': { $in: ['eligible', null] }
  }).populate('user seller');
};

// 🆕 Static method to find pending return requests
OrderSchema.statics.findPendingReturns = function() {
  return this.find({
    'returnDetails.returnStatus': 'requested'
  }).populate('user seller');
};

// 🆕 Static method to find return assignments for delivery agent
OrderSchema.statics.findReturnAssignments = function(agentId) {
  return this.find({
    'returnDetails.returnAssignment.deliveryAgent': agentId,
    'returnDetails.returnAssignment.status': { $in: ['assigned', 'accepted'] }
  }).populate('user seller');
};

module.exports = mongoose.model('Order', OrderSchema);
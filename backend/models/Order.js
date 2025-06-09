// backend/models/Order.js - Fixed version without conflicting orderNumber generation
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
    enum: ['Card', 'PayPal', 'Cash on Delivery', 'UPI']
  },
  paymentResult: {
    id: { type: String },
    status: { type: String },
    update_time: { type: String },
    email_address: { type: String }
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
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
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
  // Enhanced cancellation tracking
  cancellationDetails: {
    cancelledBy: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
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
  // Status history tracking
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: String,
      enum: ['buyer', 'seller', 'admin', 'system'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    }
  }],
  // Invoice tracking
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
  }
}, {
  timestamps: true
});

// 🎯 REMOVED: Conflicting pre-save hook for orderNumber generation
// orderNumber will be generated in the controller instead

// 🎯 NEW: Add status history entry when status changes (keeping this functionality)
OrderSchema.pre('save', async function(next) {
  // Add status history entry when status changes
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this._statusChangedBy || 'system',
      changedAt: new Date(),
      notes: this._statusChangeNotes || ''
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

// Method to update status with tracking
OrderSchema.methods.updateStatus = function(newStatus, changedBy, notes = '') {
  this.status = newStatus;
  this._statusChangedBy = changedBy;
  this._statusChangeNotes = notes;
  
  // Handle cancellation details
  if (newStatus === 'Cancelled') {
    this.cancellationDetails = {
      cancelledBy: changedBy,
      cancelledAt: new Date(),
      cancellationReason: notes,
      cancelledByName: this._cancelledByName || ''
    };
  }
  
  return this.save();
};

// Method to get cancellation display text
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

// Index for better query performance
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ seller: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'cancellationDetails.cancelledBy': 1 });

module.exports = mongoose.model('Order', OrderSchema);
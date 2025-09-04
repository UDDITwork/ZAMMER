const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  variant: {
    size: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: true
    }
  },
  changeType: {
    type: String,
    enum: ['ADD', 'REMOVE', 'ORDER_PLACED', 'ORDER_CANCELLED', 'ADJUSTMENT'],
    required: true
  },
  quantityChange: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
inventoryHistorySchema.index({ productId: 1, timestamp: -1 });
inventoryHistorySchema.index({ sellerId: 1, timestamp: -1 });
inventoryHistorySchema.index({ changeType: 1, timestamp: -1 });

module.exports = mongoose.model('InventoryHistory', inventoryHistorySchema);

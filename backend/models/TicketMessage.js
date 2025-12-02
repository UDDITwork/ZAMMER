const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    index: true
  },
  senderType: {
    type: String,
    required: true,
    enum: ['user', 'support', 'admin']
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'Seller', 'DeliveryAgent', 'Admin']
  },
  message: {
    type: String,
    required: true
  },
  attachments: [{
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    }
  }],
  isInternal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
ticketMessageSchema.index({ ticketId: 1, createdAt: 1 });

module.exports = mongoose.model('TicketMessage', ticketMessageSchema);


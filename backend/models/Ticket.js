const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userType: {
    type: String,
    required: true,
    enum: ['buyer', 'seller', 'delivery'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userTypeModel',
    index: true
  },
  userTypeModel: {
    type: String,
    required: true,
    enum: ['User', 'Seller', 'DeliveryAgent']
  },
  category: {
    type: String,
    required: true
  },
  customReason: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in-progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  attachments: [{
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null,
    index: true
  },
  slaDeadline: {
    type: Date,
    required: true,
    index: true
  },
  resolutionNotes: {
    type: String,
    default: ''
  },
  internalNotes: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes
ticketSchema.index({ userId: 1, userType: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ status: 1, createdAt: -1 });

// Virtual for SLA status
ticketSchema.virtual('slaStatus').get(function() {
  if (!this.slaDeadline) return 'unknown';
  const now = new Date();
  const hoursRemaining = (this.slaDeadline - now) / (1000 * 60 * 60);
  
  if (hoursRemaining < 0) return 'overdue';
  if (hoursRemaining <= 4) return 'warning';
  return 'on-time';
});

// Method to check if ticket is overdue
ticketSchema.methods.isOverdue = function() {
  return new Date() > this.slaDeadline && this.status !== 'resolved' && this.status !== 'closed';
};

module.exports = mongoose.model('Ticket', ticketSchema);


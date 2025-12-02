const mongoose = require('mongoose');

const supportCategorySchema = new mongoose.Schema({
  userType: {
    type: String,
    required: true,
    enum: ['buyer', 'seller', 'delivery'],
    index: true
  },
  categoryCode: {
    type: String,
    required: true
  },
  categoryName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  defaultPriority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Compound unique index
supportCategorySchema.index({ userType: 1, categoryCode: 1 }, { unique: true });
supportCategorySchema.index({ userType: 1, isActive: 1 });

module.exports = mongoose.model('SupportCategory', supportCategorySchema);


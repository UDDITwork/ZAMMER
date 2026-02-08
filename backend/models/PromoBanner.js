const mongoose = require('mongoose');

const PromoBannerSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  linkUrl: {
    type: String,
    default: '/user/shop'
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  discountText: {
    type: String,
    default: ''
  },
  ctaText: {
    type: String,
    default: 'SHOP NOW'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  showOnHomePage: {
    type: Boolean,
    default: true
  },
  showOnDashboard: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  targetGender: {
    type: String,
    enum: ['men', 'women', 'kids', 'all'],
    default: 'all'
  }
}, {
  timestamps: true
});

PromoBannerSchema.index({ isActive: 1, showOnHomePage: 1, displayOrder: 1 });
PromoBannerSchema.index({ isActive: 1, showOnDashboard: 1, displayOrder: 1 });

module.exports = mongoose.model('PromoBanner', PromoBannerSchema);

const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    enum: [1, 2, 3, 4]
  },
  categoryLevel1: {
    type: String,
    required: true,
    enum: ['Men Fashion', 'Women Fashion', 'Kids Fashion']
  },
  categoryLevel2: {
    type: String,
    default: null
  },
  categoryLevel3: {
    type: String,
    default: null
  },
  categoryLevel4: {
    type: String,
    default: null
  },
  imageUrl: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

BannerSchema.index({ level: 1, categoryLevel1: 1, categoryLevel2: 1, categoryLevel3: 1, isActive: 1 });

module.exports = mongoose.model('Banner', BannerSchema);

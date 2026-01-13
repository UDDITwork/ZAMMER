/**
 * Catalogue Model for ZAMMER Marketplace
 * Allows sellers to upload multiple products (1-9) as a single catalogue
 * Inspired by Meesho Supplier Panel catalogue upload system
 */

const mongoose = require('mongoose');

const CatalogueProductSchema = new mongoose.Schema({
  // Reference to the created product
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  // Product-specific data within the catalogue
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  zammerPrice: {
    type: Number,
    required: true
  },
  mrp: {
    type: Number,
    required: true
  },
  images: [String],
  variants: [{
    size: String,
    color: String,
    colorCode: String,
    quantity: {
      type: Number,
      default: 1
    }
  }],
  fabricType: {
    type: String,
    default: ''
  },
  // Individual product status within catalogue
  status: {
    type: String,
    enum: ['pending', 'created', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: ''
  }
});

const CatalogueSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  name: {
    type: String,
    default: function() {
      return `Catalogue ${new Date().toLocaleDateString()}`;
    }
  },
  // 4-Level Category (shared across all products in catalogue)
  category: {
    level1: {
      type: String,
      required: true
    },
    level2: {
      type: String,
      required: true
    },
    level3: {
      type: String,
      required: true
    },
    level4: {
      type: String,
      default: ''
    },
    path: {
      type: String,
      default: ''
    }
  },
  // Products within this catalogue (1-9 products)
  products: [CatalogueProductSchema],
  // Catalogue status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'processing', 'completed', 'failed', 'partial'],
    default: 'draft'
  },
  // GST and HSN (optional, shared across catalogue)
  gst: {
    type: String,
    default: ''
  },
  hsnCode: {
    type: String,
    default: ''
  },
  // Processing statistics
  stats: {
    totalProducts: {
      type: Number,
      default: 0
    },
    createdProducts: {
      type: Number,
      default: 0
    },
    failedProducts: {
      type: Number,
      default: 0
    }
  },
  // Timestamps for tracking
  submittedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  // Notes or remarks
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Pre-save middleware to update stats
CatalogueSchema.pre('save', function(next) {
  if (this.products && this.products.length > 0) {
    this.stats.totalProducts = this.products.length;
    this.stats.createdProducts = this.products.filter(p => p.status === 'created').length;
    this.stats.failedProducts = this.products.filter(p => p.status === 'failed').length;
  }
  next();
});

// Virtual for completion percentage
CatalogueSchema.virtual('completionPercentage').get(function() {
  if (this.stats.totalProducts === 0) return 0;
  return Math.round((this.stats.createdProducts / this.stats.totalProducts) * 100);
});

// Virtual for checking if catalogue is complete
CatalogueSchema.virtual('isComplete').get(function() {
  return this.stats.createdProducts === this.stats.totalProducts && this.stats.totalProducts > 0;
});

// Method to submit catalogue for processing
CatalogueSchema.methods.submit = async function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  await this.save();
  return this;
};

// Method to mark as completed
CatalogueSchema.methods.markComplete = async function() {
  if (this.stats.failedProducts > 0) {
    this.status = 'partial';
  } else if (this.stats.createdProducts === this.stats.totalProducts) {
    this.status = 'completed';
  } else {
    this.status = 'failed';
  }
  this.completedAt = new Date();
  await this.save();
  return this;
};

// Indexes for better query performance
CatalogueSchema.index({ seller: 1 });
CatalogueSchema.index({ status: 1 });
CatalogueSchema.index({ createdAt: -1 });
CatalogueSchema.index({ 'category.level1': 1, 'category.level2': 1 });

module.exports = mongoose.model('Catalogue', CatalogueSchema);

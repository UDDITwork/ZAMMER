const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  size: {
    type: String,
    enum: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']
  },
  color: {
    type: String,
    required: true
  },
  colorCode: {
    type: String, // Hex color code
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  images: [String]
});

const ProductSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  // Main Category
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['Men', 'Women', 'Kids']
  },
  // Sub Category
  subCategory: {
    type: String,
    required: [true, 'Please add a sub-category'],
    enum: [
      'T-shirts', 'Shirts', 'Kurties', 'Suits', 'Ethnic Wear', 
      'Jackets', 'Jeans', 'Tops', 'Tees', 'Dresses', 'Nightwear', 
      'Sleepwear', 'Boys Sets', 'Top Wear', 'Lehengass', 'Rayon', 
      'Shrugs'
    ]
  },
  // Special Category
  productCategory: {
    type: String,
    enum: [
      'Traditional Indian', 'Winter Fashion', 'Party Wear', 
      'Sports Destination', 'Office Wear', ''
    ],
    default: ''
  },
  zammerPrice: {
    type: Number,
    required: [true, 'Please add a Zammer price']
  },
  mrp: {
    type: Number,
    required: [true, 'Please add MRP'],
    validate: {
      validator: function(val) {
        return val >= this.zammerPrice;
      },
      message: 'MRP should be greater than or equal to Zammer price'
    }
  },
  // Calculate discount percentage dynamically
  discountPercentage: {
    type: Number,
    default: function() {
      if (this.mrp && this.zammerPrice) {
        return Math.round(((this.mrp - this.zammerPrice) / this.mrp) * 100);
      }
      return 0;
    }
  },
  variants: [VariantSchema],
  images: {
    type: [String],
    required: [true, 'Please add at least one image']
  },
  tags: [String],
  isLimitedEdition: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'outOfStock'],
    default: 'active'
  },
  composition: {
    type: String,
    default: 'Cotton 100%'
  },
  brand: {
    type: String,
    default: ''
  },
  material: {
    type: String,
    default: ''
  },
  shipping: {
    type: String,
    default: 'Standard'
  },
  averageRating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if it's on offer/discount
ProductSchema.virtual('onOffer').get(function() {
  return this.mrp > this.zammerPrice;
});

// Indexing for better query performance
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ category: 1, subCategory: 1 });
ProductSchema.index({ seller: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ isTrending: 1 });
ProductSchema.index({ isLimitedEdition: 1 });

module.exports = mongoose.model('Product', ProductSchema);
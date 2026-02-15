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
    default: 0,
    min: 0
  },
  images: [String]
});

// 🎯 NEW: Inventory History Schema for tracking quantity changes
const InventoryHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['order_placed', 'order_cancelled', 'stock_added', 'stock_adjusted', 'product_created'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    default: 0
  },
  newQuantity: {
    type: Number,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  orderNumber: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
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
      // Men subcategories
      'T-shirts', 'Shirts', 'Suits', 'Ethnic Wear', 'Jackets', 'Tops', 'Tees', 'Sleepwear', 'Top Wear',
      // Women subcategories (22 items)
      'Kurtis', 'Dresses', 'Jeans', 'Sarees', 'Blouses', 'Petticoats', 'Leggings', 'Palazzos',
      'Nightwear', 'Lehengas', 'Ethnic Sets', 'Co-ord Sets', 'Gowns', 'Shrugs', 'Tunics',
      'Skirts', 'Jumpsuits', 'Sharara', 'Dupatta',
      // Kids subcategories
      'Boys Sets'
    ]
  },
  // Special Category
  productCategory: {
    type: String,
    enum: [
      '', 'Traditional Indian', 'Ethnic Wear', 'Western Wear', 'Fusion Wear', 'Party Wear',
      'Casual Wear', 'Daily Wear', 'Office Wear', 'Festive Wear', 'Wedding Wear',
      'Winter Fashion', 'Summer Wear', 'Nightwear & Loungewear', 'Activewear',
      'Travel Wear', 'College Wear', 'Maternity Wear', 'Plus Size Wear',
      'Saree Essentials', 'Kids-Friendly Wear'
    ],
    default: ''
  },
  // 4-Level Category Hierarchy (Meesho-style)
  categoryLevel1: {
    type: String,
    default: ''
  },
  categoryLevel2: {
    type: String,
    default: ''
  },
  categoryLevel3: {
    type: String,
    default: ''
  },
  categoryLevel4: {
    type: String,
    default: ''
  },
  categoryPath: {
    type: String,  // Full path like "Women Fashion > Ethnic Wear > Sarees, Blouses & Petticoats > Sarees"
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
  fabricType: {
    type: String,
    enum: ['', 'Cotton', 'Silk', 'Polyester', 'Linen', 'Wool', 'Rayon',
           'Chiffon', 'Georgette', 'Velvet', 'Denim', 'Satin', 'Crepe',
           'Net', 'Lycra', 'Nylon', 'Jacquard', 'Khadi', 'Organza',
           'Cotton Blend', 'Silk Blend', 'Poly Cotton'],
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
  },
  
  // 🎯 NEW: Enhanced Inventory Management Fields
  inventory: {
    totalQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },
    isLowStock: {
      type: Boolean,
      default: false
    },
    lastStockUpdate: {
      type: Date,
      default: Date.now
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    availableQuantity: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // 🎯 NEW: Inventory History for tracking all quantity changes
  inventoryHistory: [InventoryHistorySchema],
  
  // 🎯 NEW: Stock alerts and notifications
  stockAlerts: {
    lowStockNotified: {
      type: Boolean,
      default: false
    },
    outOfStockNotified: {
      type: Boolean,
      default: false
    },
    lastAlertSent: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🎯 NEW: Virtual for checking if it's on offer/discount
ProductSchema.virtual('onOffer').get(function() {
  return this.mrp > this.zammerPrice;
});

// 🎯 NEW: Virtual for checking if product is available for purchase
ProductSchema.virtual('isAvailable').get(function() {
  return this.status === 'active' && this.inventory.availableQuantity > 0;
});

// 🎯 NEW: Virtual for checking if product is out of stock
ProductSchema.virtual('isOutOfStock').get(function() {
  return this.inventory.availableQuantity <= 0;
});

// 🎯 NEW: Virtual for checking if product is low on stock
ProductSchema.virtual('isLowStock').get(function() {
  return this.inventory.availableQuantity <= this.inventory.lowStockThreshold && this.inventory.availableQuantity > 0;
});

// 🎯 NEW: Pre-save middleware to update inventory totals and status
ProductSchema.pre('save', function(next) {
  // Calculate total quantity from variants
  if (this.variants && this.variants.length > 0) {
    this.inventory.totalQuantity = this.variants.reduce((total, variant) => {
      return total + (variant.quantity || 0);
    }, 0);
  } else {
    this.inventory.totalQuantity = 0;
  }
  
  // Calculate available quantity (total - reserved)
  this.inventory.availableQuantity = Math.max(0, this.inventory.totalQuantity - this.inventory.reservedQuantity);
  
  // Update low stock status
  this.inventory.isLowStock = this.inventory.availableQuantity <= this.inventory.lowStockThreshold && this.inventory.availableQuantity > 0;
  
  // Update product status based on availability
  if (this.inventory.availableQuantity <= 0) {
    this.status = 'outOfStock';
  } else if (this.status === 'outOfStock' && this.inventory.availableQuantity > 0) {
    this.status = 'active';
  }
  
  // Update last stock update timestamp
  this.inventory.lastStockUpdate = new Date();
  
  next();
});

// 🎯 NEW: Method to update inventory when order is placed
ProductSchema.methods.updateInventoryForOrder = async function(orderItems, orderId, orderNumber, userId, action = 'order_placed') {
  const inventoryUpdates = [];
  
  for (const orderItem of orderItems) {
    // Find the matching variant
    const variant = this.variants.find(v => 
      v.size === orderItem.size && 
      v.color === orderItem.color
    );
    
    if (variant) {
      const previousQuantity = variant.quantity;
      let newQuantity = variant.quantity;
      
      if (action === 'order_placed') {
        // Decrease quantity for new order
        newQuantity = Math.max(0, variant.quantity - orderItem.quantity);
        variant.quantity = newQuantity;
      } else if (action === 'order_cancelled') {
        // Increase quantity for cancelled order
        newQuantity = variant.quantity + orderItem.quantity;
        variant.quantity = newQuantity;
      }
      
      // Add to inventory history
      this.inventoryHistory.push({
        action,
        quantity: orderItem.quantity,
        previousQuantity,
        newQuantity,
        orderId,
        orderNumber,
        userId,
        sellerId: this.seller,
        notes: `${action === 'order_placed' ? 'Order placed' : 'Order cancelled'} - ${orderItem.quantity} units`,
        timestamp: new Date()
      });
      
      inventoryUpdates.push({
        variant: `${variant.size}-${variant.color}`,
        previousQuantity,
        newQuantity,
        change: action === 'order_placed' ? -orderItem.quantity : orderItem.quantity
      });
    }
  }
  
  // Save the product to trigger pre-save middleware
  await this.save();
  
  return {
    success: true,
    inventoryUpdates,
    newTotalQuantity: this.inventory.totalQuantity,
    newAvailableQuantity: this.inventory.availableQuantity,
    status: this.status
  };
};

// 🎯 NEW: Method to add stock
ProductSchema.methods.addStock = async function(variantUpdates, notes = 'Stock added by seller') {
  const stockUpdates = [];
  
  for (const update of variantUpdates) {
    const variant = this.variants.find(v => 
      v.size === update.size && 
      v.color === update.color
    );
    
    if (variant) {
      const previousQuantity = variant.quantity;
      const newQuantity = variant.quantity + update.quantity;
      variant.quantity = newQuantity;
      
      // Add to inventory history
      this.inventoryHistory.push({
        action: 'stock_added',
        quantity: update.quantity,
        previousQuantity,
        newQuantity,
        sellerId: this.seller,
        notes: `${notes} - ${update.quantity} units added to ${update.size}-${update.color}`,
        timestamp: new Date()
      });
      
      stockUpdates.push({
        variant: `${update.size}-${update.color}`,
        previousQuantity,
        newQuantity,
        added: update.quantity
      });
    }
  }
  
  await this.save();
  
  return {
    success: true,
    stockUpdates,
    newTotalQuantity: this.inventory.totalQuantity,
    newAvailableQuantity: this.inventory.availableQuantity
  };
};

// 🎯 NEW: Method to check if product has sufficient stock for order
ProductSchema.methods.hasSufficientStock = function(orderItems) {
  for (const orderItem of orderItems) {
    const variant = this.variants.find(v => 
      v.size === orderItem.size && 
      v.color === orderItem.color
    );
    
    if (!variant || variant.quantity < orderItem.quantity) {
      return {
        hasStock: false,
        insufficientVariant: `${orderItem.size}-${orderItem.color}`,
        available: variant ? variant.quantity : 0,
        requested: orderItem.quantity
      };
    }
  }
  
  return { hasStock: true };
};

// 🎯 NEW: Method to get inventory summary
ProductSchema.methods.getInventorySummary = function() {
  const variantSummary = this.variants.map(variant => ({
    size: variant.size,
    color: variant.color,
    quantity: variant.quantity,
    isLowStock: variant.quantity <= this.inventory.lowStockThreshold
  }));
  
  return {
    totalQuantity: this.inventory.totalQuantity,
    availableQuantity: this.inventory.availableQuantity,
    reservedQuantity: this.inventory.reservedQuantity,
    lowStockThreshold: this.inventory.lowStockThreshold,
    isLowStock: this.inventory.isLowStock,
    isOutOfStock: this.inventory.availableQuantity <= 0,
    status: this.status,
    variants: variantSummary,
    lastUpdated: this.inventory.lastStockUpdate
  };
};

// Indexing for better query performance
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ category: 1, subCategory: 1 });
ProductSchema.index({ seller: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ isTrending: 1 });
ProductSchema.index({ isLimitedEdition: 1 });
// 🎯 NEW: Inventory-related indexes
ProductSchema.index({ 'inventory.availableQuantity': 1 });
ProductSchema.index({ 'inventory.isLowStock': 1 });
ProductSchema.index({ 'inventory.lastStockUpdate': -1 });
ProductSchema.index({ brand: 1 });

module.exports = mongoose.model('Product', ProductSchema);
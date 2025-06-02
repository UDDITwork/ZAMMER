const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const Seller = require('../models/Seller');
const asyncHandler = require('express-async-handler');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    console.log('📦 Create Product called');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      name,
      description,
      category,
      subCategory,
      productCategory,
      zammerPrice,
      mrp,
      variants,
      images,
      tags,
      isLimitedEdition,
      isTrending
    } = req.body;

    // Create new product
    const product = await Product.create({
      seller: req.seller._id,
      name,
      description,
      category,
      subCategory,
      productCategory,
      zammerPrice,
      mrp,
      variants,
      images,
      tags,
      isLimitedEdition,
      isTrending
    });

    console.log('✅ Product created successfully:', product._id);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('❌ Create Product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get all products for a seller
// @route   GET /api/products
// @access  Private
exports.getSellerProducts = async (req, res) => {
  try {
    console.log('📋 Get Seller Products called for seller:', req.seller._id);
    
    const products = await Product.find({ seller: req.seller._id });

    console.log(`✅ Found ${products.length} products`);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('❌ Get Seller Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get a single product
// @route   GET /api/products/:id
// @access  Public/Private (optional auth)
exports.getProductById = async (req, res) => {
  try {
    console.log('🔍 Get Product by ID called:', req.params.id);
    
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'seller',
        select: 'firstName shop',
        populate: {
          path: 'shop',
          select: 'name address images mainImage description category phoneNumber openTime closeTime workingDays'
        }
      });

    if (!product) {
      console.log('❌ Product not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // If seller is authenticated and owns the product, return full details
    if (req.seller && product.seller._id.toString() === req.seller._id.toString()) {
      console.log('✅ Product found (seller access):', product._id);
      return res.status(200).json({
        success: true,
        data: product
      });
    }

    // If user/public access, return product details with shop info (for marketplace)
    console.log('✅ Product found (public access):', product._id);
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('❌ Get Product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

/**
 * @desc   Update an existing product (seller only)
 * @route  PUT /api/products/:id
 * @access Private (seller)
 */
exports.updateProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  console.log('📝 Update Product called:', productId);

  // 1️⃣  Fetch current doc
  const existing = await Product.findById(productId);
  if (!existing) {
    return res.status(404).json({ success:false, message:'Product not found' });
  }

  // 2️⃣  Check if the product belongs to the seller
  if (existing.seller.toString() !== req.seller._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
  }

  // 3️⃣  Merge incoming fields with current values to see end-state
  const finalMrp          = ('mrp'          in req.body) ? Number(req.body.mrp)          : existing.mrp;
  const finalZammerPrice  = ('zammerPrice'  in req.body) ? Number(req.body.zammerPrice)  : existing.zammerPrice;

  // 4️⃣  Manual validation of the tricky rule
  if (finalMrp < finalZammerPrice) {
    return res.status(400).json({
      success : false,
      message : 'MRP must be greater than or equal to Zammer Price',
      data    : { mrp: finalMrp, zammerPrice: finalZammerPrice }
    });
  }

  // 5️⃣  Apply updates & save (we skip mongoose runValidators because we just validated)
  Object.assign(existing, req.body);
  const updated = await existing.save({ validateBeforeSave:false });  // safe, we validated

  console.log('✅ Product updated:', updated._id);
  res.status(200).json({ success:true, data:updated });
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    console.log('🗑️ Delete Product called:', req.params.id);
    
    const product = await Product.findById(req.params.id);

    if (!product) {
      console.log('❌ Product not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the product belongs to the seller
    if (product.seller.toString() !== req.seller._id.toString()) {
      console.log('❌ Unauthorized delete attempt:', req.params.id);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    console.log('✅ Product deleted successfully:', req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('❌ Delete Product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get all products (for marketplace)
// @route   GET /api/products/marketplace
// @access  Public
exports.getMarketplaceProducts = async (req, res) => {
  try {
    console.log('🏪 Get Marketplace Products called');
    
    // Basic pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Filter options
    const filter = {};
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.subCategory) {
      filter.subCategory = req.query.subCategory;
    }

    if (req.query.productCategory) {
      filter.productCategory = req.query.productCategory;
    }

    console.log('🔍 Filter:', filter);

    // Build query
    let query = Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // newest first

    // Execute query
    const products = await query;
    const totalProducts = await Product.countDocuments(filter);

    console.log(`✅ Found ${products.length} products (page ${page} of ${Math.ceil(totalProducts / limit)})`);

    res.status(200).json({
      success: true,
      count: products.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      data: products
    });
  } catch (error) {
    console.error('❌ Get Marketplace Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get products from a specific shop
// @route   GET /api/products/shop/:shopId
// @access  Public
exports.getShopProducts = async (req, res) => {
  try {
    const { shopId } = req.params;
    console.log('🏪 Get Shop Products called for shop:', shopId);
    
    // Check if shop exists
    const shopExists = await Seller.findById(shopId);
    if (!shopExists) {
      console.log('❌ Shop not found:', shopId);
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }
    
    // Basic pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Only get active products from this shop
    const filter = { 
      seller: shopId,
      status: 'active'
    };
    
    console.log('🔍 Filter:', filter);
    
    // Build query
    let query = Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // newest first
    
    // Execute query
    const products = await query;
    const totalProducts = await Product.countDocuments(filter);
    
    console.log(`✅ Found ${products.length} products for shop ${shopId} (page ${page} of ${Math.ceil(totalProducts / limit)})`);
    
    res.status(200).json({
      success: true,
      count: products.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      data: products
    });
  } catch (error) {
    console.error('❌ Get Shop Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// 🎯 NEW: Toggle Limited Edition status
// @desc    Toggle Limited Edition status
// @route   PATCH /api/products/:id/toggle-limited-edition
// @access  Private
exports.toggleLimitedEdition = async (req, res) => {
  try {
    console.log('🎯 Toggle Limited Edition called for product:', req.params.id);
    
    const product = await Product.findById(req.params.id);

    if (!product) {
      console.log('❌ Product not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the product belongs to the seller
    if (product.seller.toString() !== req.seller._id.toString()) {
      console.log('❌ Unauthorized toggle attempt:', req.params.id);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Toggle the Limited Edition status
    const previousStatus = product.isLimitedEdition;
    product.isLimitedEdition = !product.isLimitedEdition;
    await product.save();

    console.log(`✅ Limited Edition toggled: ${previousStatus} → ${product.isLimitedEdition}`);

    res.status(200).json({
      success: true,
      message: `Product ${product.isLimitedEdition ? 'marked as' : 'removed from'} Limited Edition`,
      data: {
        isLimitedEdition: product.isLimitedEdition,
        _id: product._id
      }
    });
  } catch (error) {
    console.error('❌ Toggle Limited Edition error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// 🎯 NEW: Toggle Trending status
// @desc    Toggle Trending status
// @route   PATCH /api/products/:id/toggle-trending  
// @access  Private
exports.toggleTrending = async (req, res) => {
  try {
    console.log('🔥 Toggle Trending called for product:', req.params.id);
    
    const product = await Product.findById(req.params.id);

    if (!product) {
      console.log('❌ Product not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the product belongs to the seller
    if (product.seller.toString() !== req.seller._id.toString()) {
      console.log('❌ Unauthorized toggle attempt:', req.params.id);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Toggle the Trending status
    const previousStatus = product.isTrending;
    product.isTrending = !product.isTrending;
    await product.save();

    console.log(`✅ Trending toggled: ${previousStatus} → ${product.isTrending}`);

    res.status(200).json({
      success: true,
      message: `Product ${product.isTrending ? 'marked as' : 'removed from'} Trending`,
      data: {
        isTrending: product.isTrending,
        _id: product._id
      }
    });
  } catch (error) {
    console.error('❌ Toggle Trending error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// 🎯 NEW: Update Product Status
// @desc    Update product status (active/paused/outOfStock)
// @route   PATCH /api/products/:id/status
// @access  Private
exports.updateProductStatus = async (req, res) => {
  try {
    console.log('📊 Update Product Status called for product:', req.params.id);
    
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['active', 'paused', 'outOfStock'];
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, paused, or outOfStock'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      console.log('❌ Product not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the product belongs to the seller
    if (product.seller.toString() !== req.seller._id.toString()) {
      console.log('❌ Unauthorized status update attempt:', req.params.id);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Update the status
    const previousStatus = product.status;
    product.status = status;
    await product.save();

    console.log(`✅ Status updated: ${previousStatus} → ${product.status}`);

    res.status(200).json({
      success: true,
      message: `Product status updated to ${status}`,
      data: {
        status: product.status,
        _id: product._id
      }
    });
  } catch (error) {
    console.error('❌ Update Product Status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// 🎯 NEW: Get Limited Edition Products for Marketplace
// @desc    Get all limited edition products
// @route   GET /api/products/marketplace/limited-edition
// @access  Public
exports.getLimitedEditionProducts = async (req, res) => {
  try {
    console.log('⭐ Get Limited Edition Products called');
    
    // Basic pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Filter for limited edition products
    const filter = {
      isLimitedEdition: true,
      status: 'active'
    };
    
    // Additional filters
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.subCategory) {
      filter.subCategory = req.query.subCategory;
    }

    console.log('🔍 Filter:', filter);

    // Build query with seller information
    let query = Product.find(filter)
      .populate({
        path: 'seller',
        select: 'firstName shop',
        populate: {
          path: 'shop',
          select: 'name address images mainImage description category'
        }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // newest first

    // Execute query
    const products = await query;
    const totalProducts = await Product.countDocuments(filter);

    console.log(`✅ Found ${products.length} limited edition products (page ${page} of ${Math.ceil(totalProducts / limit)})`);

    res.status(200).json({
      success: true,
      count: products.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      data: products
    });
  } catch (error) {
    console.error('❌ Get Limited Edition Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// 🎯 NEW: Get Trending Products for Marketplace
// @desc    Get all trending products
// @route   GET /api/products/marketplace/trending
// @access  Public
exports.getTrendingProducts = async (req, res) => {
  try {
    console.log('🔥 Get Trending Products called');
    
    // Basic pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Filter for trending products
    const filter = {
      isTrending: true,
      status: 'active'
    };
    
    // Additional filters
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.subCategory) {
      filter.subCategory = req.query.subCategory;
    }

    console.log('🔍 Filter:', filter);

    // Build query with seller information
    let query = Product.find(filter)
      .populate({
        path: 'seller',
        select: 'firstName shop',
        populate: {
          path: 'shop',
          select: 'name address images mainImage description category'
        }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // newest first

    // Execute query
    const products = await query;
    const totalProducts = await Product.countDocuments(filter);

    console.log(`✅ Found ${products.length} trending products (page ${page} of ${Math.ceil(totalProducts / limit)})`);

    res.status(200).json({
      success: true,
      count: products.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      data: products
    });
  } catch (error) {
    console.error('❌ Get Trending Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
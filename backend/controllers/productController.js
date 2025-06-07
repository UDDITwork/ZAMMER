const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const Seller = require('../models/Seller');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const mongoose = require('mongoose');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { validateProductData } = require('../utils/validators');
const { handleError } = require('../utils/errorHandler');

// Enhanced terminal logging for production monitoring
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [PRODUCT-BACKEND] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
  
  // Additional structured logging for production monitoring
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      timestamp,
      service: 'productController',
      action,
      status,
      data
    }));
  }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Seller)
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

    // Handle image uploads if files are present
    let uploadedImages = [];
    if (req.files && req.files.length > 0) {
      console.log(`📁 Processing ${req.files.length} product images`);
      
      const uploadPromises = req.files.map(async (file) => {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        return await uploadToCloudinary(dataURI, 'product_images');
      });

      const results = await Promise.all(uploadPromises);
      uploadedImages = results.map(result => result.url);
      console.log('📁 Processed Cloudinary uploads:', uploadedImages);
    }

    // Create product with uploaded images
    const product = new Product({
      ...req.body,
      seller: req.seller._id,
      images: uploadedImages
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });

  } catch (error) {
    console.error('❌ Product creation error:', error);
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
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the seller owns this product
    if (product.seller.toString() !== req.seller._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Handle image updates
    if (req.body.images) {
      // Get the public IDs of images to be deleted
      const oldImages = product.images || [];
      const newImages = req.body.images;
      const imagesToDelete = oldImages.filter(img => !newImages.includes(img));

      // Delete images from Cloudinary
      for (const imageUrl of imagesToDelete) {
        try {
          // Extract public_id from Cloudinary URL
          const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
          await deleteFromCloudinary(publicId);
          console.log(`✅ Deleted image from Cloudinary: ${publicId}`);
        } catch (error) {
          console.error(`❌ Error deleting image from Cloudinary: ${error.message}`);
        }
      }

      product.images = newImages;
    }

    // Update other fields
    if (req.body.name) product.name = req.body.name;
    if (req.body.description) product.description = req.body.description;
    if (req.body.category) product.category = req.body.category;
    if (req.body.subCategory) product.subCategory = req.body.subCategory;
    if (req.body.productCategory) product.productCategory = req.body.productCategory;
    if (req.body.zammerPrice) product.zammerPrice = req.body.zammerPrice;
    if (req.body.mrp) product.mrp = req.body.mrp;
    if (req.body.discountPercentage) product.discountPercentage = req.body.discountPercentage;
    if (req.body.variants) product.variants = req.body.variants;
    if (req.body.stock) product.stock = req.body.stock;
    if (req.body.isActive !== undefined) product.isActive = req.body.isActive;

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });

  } catch (error) {
    console.error('❌ Product update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Seller)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the seller owns this product
    if (product.seller.toString() !== req.seller._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    // Delete images from Cloudinary
    for (const imageUrl of product.images) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
        await deleteFromCloudinary(publicId);
        console.log(`✅ Deleted image from Cloudinary: ${publicId}`);
      } catch (error) {
        console.error(`❌ Error deleting image from Cloudinary: ${error.message}`);
      }
    }

    await product.remove();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('❌ Product deletion error:', error);
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
    terminalLog('MARKETPLACE_PRODUCTS_FETCH_START', 'PROCESSING', {
      queryParams: req.query,
      userAgent: req.get('User-Agent')?.substring(0, 50),
      ip: req.ip
    });

    console.log(`
🛍️ ===============================
   MARKETPLACE PRODUCTS REQUEST
===============================
📂 Category: ${req.query.category || 'All'}
📁 SubCategory: ${req.query.subCategory || 'All'}
🏷️ Product Category: ${req.query.productCategory || 'All'}
🔍 Search: ${req.query.search || 'None'}
📄 Page: ${req.query.page || 1}
🔢 Limit: ${req.query.limit || 10}
💰 Min Price: ${req.query.minPrice || 'None'}
💰 Max Price: ${req.query.maxPrice || 'None'}
📊 Sort By: ${req.query.sortBy || 'createdAt'}
🔄 Sort Order: ${req.query.sortOrder || 'desc'}
🕐 Time: ${new Date().toLocaleString()}
===============================`);
    
    // Basic pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Filter options
    const filter = {};
    
    if (req.query.category) {
      filter.category = req.query.category;
      console.log(`🏷️ Filtering by category: ${req.query.category}`);
    }
    
    if (req.query.subCategory) {
      filter.subCategory = req.query.subCategory;
      console.log(`📁 Filtering by subcategory: ${req.query.subCategory}`);
    }

    if (req.query.productCategory) {
      filter.productCategory = req.query.productCategory;
      console.log(`🎯 Filtering by product category: ${req.query.productCategory}`);
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ];
      console.log(`🔍 Search query applied: "${req.query.search}"`);
    }

    // Price range filtering
    if (req.query.minPrice || req.query.maxPrice) {
      filter.zammerPrice = {};
      if (req.query.minPrice) {
        filter.zammerPrice.$gte = parseInt(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filter.zammerPrice.$lte = parseInt(req.query.maxPrice);
      }
      console.log(`💰 Price range filter: ₹${req.query.minPrice || 0} - ₹${req.query.maxPrice || '∞'}`);
    }

    // 🎯 Only show active products
    filter.status = 'active';

    terminalLog('DATABASE_QUERY_FILTER', 'PROCESSING', {
      filter,
      pagination: { page, limit, skip }
    });

    console.log('🔍 Final MongoDB Filter:', filter);

    // Build sorting options
    let sortOptions = {};
    if (req.query.sortBy && req.query.sortOrder) {
      sortOptions[req.query.sortBy] = req.query.sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1; // Default: newest first
    }

    console.log('📊 Sort options:', sortOptions);

    // Build query with seller population
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
      .sort(sortOptions);

    // Execute query
    const products = await query;
    const totalProducts = await Product.countDocuments(filter);

    terminalLog('DATABASE_QUERY_SUCCESS', 'SUCCESS', {
      productsFound: products.length,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      hasMore: page < Math.ceil(totalProducts / limit)
    });

    console.log(`
✅ ===============================
   PRODUCTS FETCHED SUCCESSFULLY!
===============================
📦 Products Found: ${products.length}
📊 Total in DB: ${totalProducts}
📄 Current Page: ${page}
📋 Total Pages: ${Math.ceil(totalProducts / limit)}
🔍 Filters Applied: ${Object.keys(filter).length}
📊 Sort Applied: ${Object.keys(sortOptions).join(', ')}
⏱️ Query Time: ${new Date().toLocaleString()}
===============================`);

    // 🎯 Log sample products for debugging
    if (products.length > 0) {
      console.log('📦 Sample Products:');
      products.slice(0, 3).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} - ₹${product.zammerPrice} (${product.category}/${product.subCategory})`);
      });
    }

    // 🎯 Enhanced response with metadata
    const response = {
      success: true,
      count: products.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      totalProducts,
      hasNextPage: page < Math.ceil(totalProducts / limit),
      hasPreviousPage: page > 1,
      filters: {
        category: req.query.category || null,
        subCategory: req.query.subCategory || null,
        productCategory: req.query.productCategory || null,
        search: req.query.search || null,
        priceRange: {
          min: req.query.minPrice || null,
          max: req.query.maxPrice || null
        }
      },
      data: products
    };

    terminalLog('API_RESPONSE_SENT', 'SUCCESS', {
      responseSize: JSON.stringify(response).length,
      productsCount: products.length,
      page,
      totalPages: Math.ceil(totalProducts / limit)
    });

    res.status(200).json(response);
  } catch (error) {
    terminalLog('MARKETPLACE_PRODUCTS_ERROR', 'ERROR', {
      error: error.message,
      stack: error.stack,
      queryParams: req.query
    });

    console.log(`
❌ ===============================
   PRODUCTS FETCH FAILED!
===============================
🚨 Error: ${error.message}
📋 Query Params: ${JSON.stringify(req.query)}
⏱️ Time: ${new Date().toLocaleString()}
===============================`);
    
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
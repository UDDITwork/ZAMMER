const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const Seller = require('../models/Seller');

const User = require('../models/User');

const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { validateProductData } = require('../utils/validators');


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
// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Seller)
exports.createProduct = async (req, res) => {
  try {
    console.log('📦 Create Product called');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📁 Request files:', req.files ? req.files.length : 'No files');
    
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
      images, // ✅ Images from frontend (Cloudinary URLs)
      tags,
      isLimitedEdition,
      isTrending
    } = req.body;

    // ✅ FIXED: Only accept Cloudinary URLs from frontend
    let finalImages = [];

    // Only accept Cloudinary URLs from frontend
    if (images && Array.isArray(images) && images.length > 0) {
      finalImages = images.filter(img => 
        typeof img === 'string' && 
        img.includes('cloudinary.com')
      );
      console.log('✅ Filtered Cloudinary images:', finalImages.length);
    }

    if (!finalImages || finalImages.length === 0) {
      console.log('❌ No valid Cloudinary images provided');
      return res.status(400).json({
        success: false,
        message: 'At least one valid Cloudinary image is required'
      });
    }

    console.log('✅ Final Cloudinary images for product:', finalImages);

    // ✅ FIXED: Create product with correct image handling
    const productData = {
      name,
      description,
      category,
      subCategory,
      productCategory,
      zammerPrice: Number(zammerPrice),
      mrp: Number(mrp),
      variants: variants.map(variant => ({
        ...variant,
        quantity: Number(variant.quantity)
      })),
      images: finalImages, // ✅ Use the correctly processed images
      tags: tags || [],
      isLimitedEdition: Boolean(isLimitedEdition),
      isTrending: Boolean(isTrending),
      seller: req.seller._id
    };

    console.log('💾 Creating product with data:', {
      name: productData.name,
      imageCount: productData.images.length,
      variantCount: productData.variants.length,
      seller: productData.seller
    });

    const product = new Product(productData);
    const savedProduct = await product.save();

    console.log('✅ Product created successfully:', {
      id: savedProduct._id,
      name: savedProduct.name,
      images: savedProduct.images
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: savedProduct
    });

  } catch (error) {
    console.error('❌ Product creation error:', error);
    
    // Enhanced error logging
    if (error.name === 'ValidationError') {
      console.error('📋 Validation Error Details:', Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })));
    }
    
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
    console.log('🗑️ Delete Product called for ID:', req.params.id);
    
    const product = await Product.findById(req.params.id);

    if (!product) {
      console.log('❌ Product not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the seller owns this product
    if (product.seller.toString() !== req.seller._id.toString()) {
      console.log('❌ Unauthorized delete attempt by seller:', req.seller._id);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    console.log('🖼️ Deleting product images from Cloudinary...');
    
    // Delete images from Cloudinary
    for (const imageUrl of product.images || []) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
        await deleteFromCloudinary(publicId);
        console.log(`✅ Deleted image from Cloudinary: ${publicId}`);
      } catch (error) {
        console.error(`❌ Error deleting image from Cloudinary: ${error.message}`);
        // Continue even if image deletion fails
      }
    }

    // ✅ FIXED: Use findByIdAndDelete() instead of product.remove()
    await Product.findByIdAndDelete(req.params.id);
    
    console.log('✅ Product deleted successfully:', req.params.id);

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

// @desc    Get all marketplace products with filtering
// @route   GET /api/products/marketplace
// @access  Public
exports.getMarketplaceProducts = async (req, res) => {
  try {
    console.log('🏪 [ProductController] ===== FETCHING MARKETPLACE PRODUCTS =====');
    console.log('🏪 [ProductController] Query params:', req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 🎯 FIXED: Initialize filter with active status
    const filter = { status: 'active' };

    // 🎯 NEW: Add seller filter for shop-specific products
    if (req.query.seller) {
      filter.seller = req.query.seller;
      console.log(`🏪 [ProductController] Filtering by seller: ${req.query.seller}`);
    }

    // 🎯 FIXED: Case-insensitive category filtering
    if (req.query.category) {
      filter.category = new RegExp(`^${req.query.category}$`, 'i');
      console.log(`🏷️ [ProductController] Filtering by category: ${req.query.category}`);
    }

    // 🎯 FIXED: Case-insensitive subcategory filtering
    if (req.query.subCategory) {
      filter.subCategory = new RegExp(`^${req.query.subCategory}$`, 'i');
      console.log(`📁 [ProductController] Filtering by subcategory: ${req.query.subCategory}`);
    }

    // 🎯 FIXED: Case-insensitive product category filtering
    if (req.query.productCategory) {
      filter.productCategory = new RegExp(`^${req.query.productCategory}$`, 'i');
      console.log(`🏷️ [ProductController] Filtering by product category: ${req.query.productCategory}`);
    }

    // 🎯 FIXED: Price range filtering
    if (req.query.minPrice || req.query.maxPrice) {
      filter.zammerPrice = {};
      if (req.query.minPrice) {
        filter.zammerPrice.$gte = parseFloat(req.query.minPrice);
        console.log(`💰 [ProductController] Min price filter: ${req.query.minPrice}`);
      }
      if (req.query.maxPrice) {
        filter.zammerPrice.$lte = parseFloat(req.query.maxPrice);
        console.log(`💰 [ProductController] Max price filter: ${req.query.maxPrice}`);
      }
    }

    // 🎯 FIXED: Search term filtering
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { description: new RegExp(req.query.search, 'i') }
      ];
      console.log(`🔍 [ProductController] Search term: ${req.query.search}`);
    }

    // 🎯 FIXED: Trending products filter
    if (req.query.isTrending === 'true') {
      filter.isTrending = true;
      console.log('🔥 [ProductController] Filtering trending products');
    }

    // 🎯 FIXED: Sort options
    let sort = {};
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price_asc':
          sort = { zammerPrice: 1 };
          console.log('📊 [ProductController] Sorting by price ascending');
          break;
        case 'price_desc':
          sort = { zammerPrice: -1 };
          console.log('📊 [ProductController] Sorting by price descending');
          break;
        case 'newest':
          sort = { createdAt: -1 };
          console.log('📊 [ProductController] Sorting by newest');
          break;
        case 'popular':
          sort = { numReviews: -1 };
          console.log('📊 [ProductController] Sorting by popularity');
          break;
        default:
          sort = { createdAt: -1 };
          console.log('📊 [ProductController] Default sorting by newest');
      }
    } else {
      sort = { createdAt: -1 }; // Default sort
    }

    // 🎯 FIXED: Debug logging before query execution
    console.log('🔍 [ProductController] Final MongoDB Filter Object:', JSON.stringify(filter, null, 2));
    console.log('📊 [ProductController] Query URL params received:', {
      seller: req.query.seller, // 🎯 NEW: Log seller filter
      category: req.query.category,
      subCategory: req.query.subCategory,
      productCategory: req.query.productCategory,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      search: req.query.search,
      isTrending: req.query.isTrending,
      sort: req.query.sort
    });

    // 🎯 FIXED: Execute query with proper error handling
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('seller', 'firstName shop.name shop.category')
        .lean(),
      Product.countDocuments(filter)
    ]);

    console.log(`✅ [ProductController] Found ${products.length} products out of ${total} total`);

    // 🎯 NEW: Special logging for seller-specific queries
    if (req.query.seller) {
      console.log(`🏪 [ProductController] Shop-specific query results for seller ${req.query.seller}:`, {
        productsFound: products.length,
        totalProducts: total,
        shopHasProducts: products.length > 0
      });
    }

    // 🎯 FIXED: Enhanced response with pagination info
    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: products,
      filters: {
        applied: Object.keys(filter).length > 1, // More than just status
        active: {
          seller: req.query.seller, // 🎯 NEW: Include seller in response
          category: req.query.category,
          subCategory: req.query.subCategory,
          productCategory: req.query.productCategory,
          priceRange: req.query.minPrice || req.query.maxPrice ? {
            min: req.query.minPrice,
            max: req.query.maxPrice
          } : null,
          search: req.query.search,
          isTrending: req.query.isTrending === 'true'
        }
      }
    });

  } catch (error) {
    console.error('❌ [ProductController] Error fetching marketplace products:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: 'Error fetching marketplace products',
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
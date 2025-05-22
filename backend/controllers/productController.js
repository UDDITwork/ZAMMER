const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const Seller = require('../models/Seller');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(error);
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
    const products = await Product.find({ seller: req.seller._id });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get a single product
// @route   GET /api/products/:id
// @access  Private
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the product belongs to the seller
    if (product.seller.toString() !== req.seller._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this product'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the product belongs to the seller
    if (product.seller.toString() !== req.seller._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if the product belongs to the seller
    if (product.seller.toString() !== req.seller._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    await product.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(error);
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

    // Build query
    let query = Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // newest first

    // Execute query
    const products = await query;
    const totalProducts = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      data: products
    });
  } catch (error) {
    console.error(error);
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
    
    // Check if shop exists
    const shopExists = await Seller.findById(shopId);
    if (!shopExists) {
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
    
    // Build query
    let query = Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // newest first
    
    // Execute query
    const products = await query;
    const totalProducts = await Product.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: products.length,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      data: products
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
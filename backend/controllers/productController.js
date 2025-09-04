// backend/controllers/productController.js - COMPLETE WORKING CATEGORY FILTERING SOLUTION

const Product = require('../models/Product');
const Seller = require('../models/Seller');
const InventoryHistoryService = require('../services/inventoryHistoryService');
const { validationResult } = require('express-validator');

// Enhanced logging for production monitoring
const logProductQuery = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '📦',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [PRODUCT-CONTROLLER] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

// @desc    Get marketplace products with comprehensive filtering
// @route   GET /api/products/marketplace
// @access  Public
const getMarketplaceProducts = async (req, res) => {
  try {
    // 🎯 EXTRACT ALL QUERY PARAMETERS
    const {
      page = 1,
      limit = 12,
      category,
      subCategory,
      productCategory,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'active',
      seller
    } = req.query;

    logProductQuery('MARKETPLACE_PRODUCTS_REQUEST', {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      subCategory,
      productCategory,
      search,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      status,
      queryParams: Object.keys(req.query),
      fullQuery: req.query
    });

    // 🎯 BUILD COMPREHENSIVE FILTER OBJECT - FIXED VERSION
    const filter = { status: status || 'active' };

    // Category filtering (Men/Women/Kids) - EXACT MATCH + CASE INSENSITIVE
    if (category && category.trim() !== '') {
      const categoryValue = category.trim();
      // Try both exact match and case-insensitive
      filter.category = { $regex: new RegExp(`^${categoryValue}$`, 'i') };
      logProductQuery('FILTER_APPLIED', { type: 'category', value: categoryValue });
    }

    // 🚨 FIXED: Subcategory filtering with URL decoding and case-insensitive
    if (subCategory && subCategory.trim() !== '') {
      const subCategoryRaw = subCategory.trim();
      // Decode URL encoding (e.g., "Top%20Wear" -> "Top Wear")
      const subCategoryDecoded = decodeURIComponent(subCategoryRaw);
      // Apply case-insensitive regex
      filter.subCategory = { $regex: new RegExp(`^${subCategoryDecoded}$`, 'i') };
      logProductQuery('FILTER_APPLIED', { 
        type: 'subCategory', 
        raw: subCategoryRaw,
        decoded: subCategoryDecoded,
        filter: filter.subCategory
      });
    }

    // Product category filtering (Traditional Indian, Party Wear, etc.)
    if (productCategory && productCategory.trim() !== '') {
      const productCategoryValue = productCategory.trim();
      filter.productCategory = { $regex: new RegExp(`^${productCategoryValue}$`, 'i') };
      logProductQuery('FILTER_APPLIED', { type: 'productCategory', value: productCategoryValue });
    }

    // Search filtering (name and description)
    if (search && search.trim() !== '') {
      const searchValue = search.trim();
      filter.$or = [
        { name: { $regex: searchValue, $options: 'i' } },
        { description: { $regex: searchValue, $options: 'i' } },
        { tags: { $in: [new RegExp(searchValue, 'i')] } }
      ];
      logProductQuery('FILTER_APPLIED', { type: 'search', value: searchValue });
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      filter.zammerPrice = {};
      
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        filter.zammerPrice.$gte = parseFloat(minPrice);
      }
      
      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        filter.zammerPrice.$lte = parseFloat(maxPrice);
      }
      
      logProductQuery('FILTER_APPLIED', { 
        type: 'priceRange', 
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null
      });
    }

    // 🎯 SELLER FILTERING - CRITICAL FIX FOR SHOP-SPECIFIC PRODUCTS
    if (seller && seller.trim() !== '') {
      filter.seller = seller.trim();
      logProductQuery('FILTER_APPLIED', { type: 'seller', value: seller.trim() });
    }

    // 🎯 BUILD SORT OBJECT
    const sortOptions = {};
    
    // Handle different sort types
    switch (sortBy) {
      case 'zammerPrice':
      case 'price':
        sortOptions.zammerPrice = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'name':
        sortOptions.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'createdAt':
      case 'newest':
        sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'views':
      case 'popular':
        sortOptions.averageRating = -1; // Most popular first
        sortOptions.numReviews = -1;
        break;
      case 'rating':
        sortOptions.averageRating = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sortOptions.createdAt = -1; // Default: newest first
    }

    logProductQuery('SORT_OPTIONS', { sortBy, sortOrder, sortOptions });

    // 🎯 CALCULATE PAGINATION
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 12;
    const skip = (pageNumber - 1) * pageSize;

    // 🎯 EXECUTE FILTERED QUERY WITH POPULATION
    logProductQuery('EXECUTING_QUERY', {
      filter,
      sortOptions,
      pagination: { page: pageNumber, limit: pageSize, skip }
    });

    console.log(`
🔍 ===============================
   MARKETPLACE PRODUCT FILTERING
===============================
📂 Category: ${category || 'All'}
📁 Subcategory: ${subCategory || 'All'}
🏷️ Product Category: ${productCategory || 'All'}
🔍 Search: ${search || 'None'}
💰 Price Range: ${minPrice || 0} - ${maxPrice || '∞'}
🏪 Seller: ${seller || 'All'}
📄 Page: ${pageNumber} (Size: ${pageSize})
🔢 Sort: ${sortBy} (${sortOrder})
📊 MongoDB Filter: ${JSON.stringify(filter, null, 2)}
===============================`);

    // 🚨 ENHANCED: Execute with detailed debug logging
    const queryStartTime = Date.now();
    
    // First, count total documents for debugging
    const totalProducts = await Product.countDocuments(filter);
    const countTime = Date.now() - queryStartTime;
    
    console.log(`📊 Count Query Result: ${totalProducts} products found in ${countTime}ms`);
    
    // If no products found, debug what's available
    if (totalProducts === 0) {
      console.log('\n🔍 DEBUG: No products found with current filter');
      console.log('🔍 Checking database content...');
      
      // Check total products in database
      const totalInDb = await Product.countDocuments({ status: 'active' });
      console.log(`📊 Total active products in database: ${totalInDb}`);
      
      // Check category matches
      if (category) {
        const categoryCount = await Product.countDocuments({ 
          status: 'active',
          category: { $regex: new RegExp(`^${category}$`, 'i') }
        });
        console.log(`📊 Products matching category "${category}": ${categoryCount}`);
        
        // Show available categories
        const availableCategories = await Product.distinct('category', { status: 'active' });
        console.log(`📊 Available categories: ${JSON.stringify(availableCategories)}`);
        
        // If we have category but no subcategory, show what subcategories exist
        if (categoryCount > 0 && subCategory) {
          const availableSubCategories = await Product.distinct('subCategory', { 
            status: 'active',
            category: { $regex: new RegExp(`^${category}$`, 'i') }
          });
          console.log(`📊 Available subcategories for "${category}": ${JSON.stringify(availableSubCategories)}`);
          
          // Check exact subcategory match
          const subCategoryDecoded = decodeURIComponent(subCategory.trim());
          const exactSubCategoryCount = await Product.countDocuments({
            status: 'active',
            category: { $regex: new RegExp(`^${category}$`, 'i') },
            subCategory: { $regex: new RegExp(`^${subCategoryDecoded}$`, 'i') }
          });
          console.log(`📊 Exact match for "${category}" + "${subCategoryDecoded}": ${exactSubCategoryCount}`);
        }
      }
    }

    // Execute the main products query
    const products = await Product.find(filter)
      .populate({
        path: 'seller',
        select: 'firstName shop.name shop.address shop.phoneNumber'
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .lean(); // Use lean() for better performance

    const totalPages = Math.ceil(totalProducts / pageSize);
    const queryTime = Date.now() - queryStartTime;

    // 🎯 ENHANCED RESPONSE LOGGING
    logProductQuery('QUERY_RESULTS', {
      totalFound: totalProducts,
      pageReturned: products.length,
      currentPage: pageNumber,
      totalPages: totalPages,
      hasResults: products.length > 0,
      filterApplied: Object.keys(filter).length > 1, // More than just status
      firstProductIds: products.slice(0, 3).map(p => p._id),
      queryExecutionTime: `${queryTime}ms`
    }, products.length > 0 ? 'success' : 'warning');

    console.log(`
✅ ===============================
   MARKETPLACE QUERY COMPLETED!
===============================
📦 Products Found: ${totalProducts}
📄 Page: ${pageNumber}/${totalPages}
📊 Returned: ${products.length} products
🎯 Filters Applied: ${Object.keys(filter).length - 1}
⏱️ Query Time: ${queryTime}ms
⏱️ Timestamp: ${new Date().toLocaleString()}
===============================`);

    // Log sample products for debugging
    if (products.length > 0) {
      console.log('📦 Sample Products Found:', products.slice(0, 3).map(p => ({
        id: p._id,
        name: p.name,
        category: p.category,
        subCategory: p.subCategory,
        productCategory: p.productCategory,
        price: p.zammerPrice,
        seller: p.seller?.firstName || 'Unknown'
      })));
    } else {
      console.log('📦 No products returned from query');
    }

    // 🎯 RETURN COMPREHENSIVE RESPONSE
    res.status(200).json({
      success: true,
      count: products.length,
      totalCount: totalProducts,
      currentPage: pageNumber,
      totalPages: totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPrevPage: pageNumber > 1,
      filters: {
        category,
        subCategory,
        productCategory,
        search,
        minPrice,
        maxPrice,
        seller,
        sortBy,
        sortOrder
      },
      data: products,
      message: products.length > 0 
        ? `Found ${totalProducts} products matching your criteria`
        : 'No products found matching your criteria',
      debug: process.env.NODE_ENV === 'development' ? {
        filterUsed: filter,
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString()
      } : undefined
    });

  } catch (error) {
    logProductQuery('MARKETPLACE_PRODUCTS_ERROR', {
      error: error.message,
      stack: error.stack,
      query: req.query
    }, 'error');

    console.error('❌ Error fetching marketplace products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get limited edition products with enhanced filtering
// @route   GET /api/products/marketplace/limited-edition
// @access  Public
const getLimitedEditionProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subCategory,
      productCategory,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    logProductQuery('LIMITED_EDITION_REQUEST', {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      subCategory,
      hasFilters: !!(category || subCategory || productCategory || search)
    });

    // Base filter for limited edition products
    const filter = { 
      isLimitedEdition: true, 
      status: 'active' 
    };

    // Apply additional filters with same logic as marketplace
    if (category && category.trim() !== '') {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    if (subCategory && subCategory.trim() !== '') {
      const subCategoryDecoded = decodeURIComponent(subCategory.trim());
      filter.subCategory = { $regex: new RegExp(`^${subCategoryDecoded}$`, 'i') };
    }

    if (productCategory && productCategory.trim() !== '') {
      filter.productCategory = { $regex: new RegExp(`^${productCategory.trim()}$`, 'i') };
    }

    if (search && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      filter.zammerPrice = {};
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        filter.zammerPrice.$gte = parseFloat(minPrice);
      }
      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        filter.zammerPrice.$lte = parseFloat(maxPrice);
      }
    }

    // Sort options
    const sortOptions = {};
    switch (sortBy) {
      case 'zammerPrice':
        sortOptions.zammerPrice = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'name':
        sortOptions.name = sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 12;
    const skip = (pageNumber - 1) * pageSize;

    const products = await Product.find(filter)
      .populate({
        path: 'seller',
        select: 'firstName shop.name shop.address'
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / pageSize);

    logProductQuery('LIMITED_EDITION_SUCCESS', {
      totalFound: totalProducts,
      pageReturned: products.length,
      currentPage: pageNumber,
      totalPages: totalPages
    }, 'success');

    res.status(200).json({
      success: true,
      count: products.length,
      totalCount: totalProducts,
      currentPage: pageNumber,
      totalPages: totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPrevPage: pageNumber > 1,
      filters: {
        category,
        subCategory,
        productCategory,
        search,
        minPrice,
        maxPrice,
        isLimitedEdition: true
      },
      data: products,
      message: `Found ${totalProducts} limited edition products`
    });

  } catch (error) {
    logProductQuery('LIMITED_EDITION_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error fetching limited edition products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get trending products with enhanced filtering
// @route   GET /api/products/marketplace/trending
// @access  Public
const getTrendingProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subCategory,
      productCategory,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    logProductQuery('TRENDING_REQUEST', {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      subCategory,
      hasFilters: !!(category || subCategory || productCategory || search)
    });

    // Base filter for trending products
    const filter = { 
      isTrending: true, 
      status: 'active' 
    };

    // Apply additional filters with same logic as marketplace
    if (category && category.trim() !== '') {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    if (subCategory && subCategory.trim() !== '') {
      const subCategoryDecoded = decodeURIComponent(subCategory.trim());
      filter.subCategory = { $regex: new RegExp(`^${subCategoryDecoded}$`, 'i') };
    }

    if (productCategory && productCategory.trim() !== '') {
      filter.productCategory = { $regex: new RegExp(`^${productCategory.trim()}$`, 'i') };
    }

    if (search && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      filter.zammerPrice = {};
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        filter.zammerPrice.$gte = parseFloat(minPrice);
      }
      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        filter.zammerPrice.$lte = parseFloat(maxPrice);
      }
    }

    // Sort options
    const sortOptions = {};
    switch (sortBy) {
      case 'zammerPrice':
        sortOptions.zammerPrice = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'name':
        sortOptions.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'popular':
        sortOptions.averageRating = -1;
        sortOptions.numReviews = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 12;
    const skip = (pageNumber - 1) * pageSize;

    const products = await Product.find(filter)
      .populate({
        path: 'seller',
        select: 'firstName shop.name shop.address'
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / pageSize);

    logProductQuery('TRENDING_SUCCESS', {
      totalFound: totalProducts,
      pageReturned: products.length,
      currentPage: pageNumber,
      totalPages: totalPages
    }, 'success');

    res.status(200).json({
      success: true,
      count: products.length,
      totalCount: totalProducts,
      currentPage: pageNumber,
      totalPages: totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPrevPage: pageNumber > 1,
      filters: {
        category,
        subCategory,
        productCategory,
        search,
        minPrice,
        maxPrice,
        isTrending: true
      },
      data: products,
      message: `Found ${totalProducts} trending products`
    });

  } catch (error) {
    logProductQuery('TRENDING_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error fetching trending products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Seller)
const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const sellerId = req.seller._id;
    const productData = {
      ...req.body,
      seller: sellerId
    };

    logProductQuery('CREATE_PRODUCT_START', {
      sellerId: sellerId.toString(),
      productName: productData.name,
      category: productData.category,
      subCategory: productData.subCategory,
      productCategory: productData.productCategory
    });

    const product = await Product.create(productData);

    logProductQuery('CREATE_PRODUCT_SUCCESS', {
      productId: product._id,
      productName: product.name,
      sellerId: sellerId.toString()
    }, 'success');

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (error) {
    logProductQuery('CREATE_PRODUCT_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get seller's products
// @route   GET /api/products
// @access  Private (Seller)
const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { page = 1, limit = 10, status, category, search } = req.query;

    // Build filter for seller's products
    const filter = { seller: sellerId };
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / pageSize);

    logProductQuery('GET_SELLER_PRODUCTS_SUCCESS', {
      sellerId: sellerId.toString(),
      totalFound: totalProducts,
      currentPage: pageNumber
    }, 'success');

    res.status(200).json({
      success: true,
      count: products.length,
      totalCount: totalProducts,
      currentPage: pageNumber,
      totalPages: totalPages,
      data: products
    });
  } catch (error) {
    logProductQuery('GET_SELLER_PRODUCTS_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error fetching seller products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId)
      .populate({
        path: 'seller',
        select: 'firstName shop'
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    logProductQuery('GET_PRODUCT_BY_ID_SUCCESS', {
      productId: productId,
      productName: product.name,
      category: product.category
    }, 'success');

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    logProductQuery('GET_PRODUCT_BY_ID_ERROR', { 
      productId: req.params.id,
      error: error.message 
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Seller)
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.seller._id;

    logProductQuery('UPDATE_PRODUCT_START', {
      productId: productId,
      sellerId: sellerId.toString(),
      updateFields: Object.keys(req.body)
    });

    const product = await Product.findOne({
      _id: productId,
      seller: sellerId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    // Validate the update data before applying
    const updateData = { ...req.body };
    
    // Ensure numeric fields are properly converted
    if (updateData.mrp) updateData.mrp = Number(updateData.mrp);
    if (updateData.zammerPrice) updateData.zammerPrice = Number(updateData.zammerPrice);
    
    // Validate variants if provided
    if (updateData.variants && Array.isArray(updateData.variants)) {
      updateData.variants = updateData.variants.map(variant => ({
        ...variant,
        quantity: Number(variant.quantity) || 0
      }));
    }

    // 🎯 FIX: Use traditional update approach to ensure validation runs on updated document
    Object.assign(product, updateData);
    const updatedProduct = await product.save();

    logProductQuery('UPDATE_PRODUCT_SUCCESS', {
      productId: productId,
      sellerId: sellerId.toString(),
      updatedFields: Object.keys(updateData)
    }, 'success');

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    logProductQuery('UPDATE_PRODUCT_ERROR', { 
      productId: req.params.id,
      error: error.message,
      errorType: error.name
    }, 'error');
    
    // Enhanced error response
    let errorMessage = 'Error updating product';
    let errorDetails = null;
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Validation failed';
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      errorDetails = validationErrors;
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data type provided';
      errorDetails = {
        field: error.path,
        value: error.value,
        expectedType: error.kind
      };
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: errorDetails,
      validationErrors: error.name === 'ValidationError' ? errorDetails : undefined
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Seller)
const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.seller._id;

    const product = await Product.findOne({
      _id: productId,
      seller: sellerId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    await Product.findByIdAndDelete(productId);

    logProductQuery('DELETE_PRODUCT_SUCCESS', {
      productId: productId,
      sellerId: sellerId.toString(),
      productName: product.name
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logProductQuery('DELETE_PRODUCT_ERROR', { 
      productId: req.params.id,
      error: error.message 
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get products for a specific shop
// @route   GET /api/products/shop/:shopId
// @access  Public
const getShopProducts = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 12, category, subCategory, search } = req.query;

    // Find the seller by shop ID
    const seller = await Seller.findById(shopId);
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    // Build filter for shop products
    const filter = { seller: shopId, status: 'active' };
    
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 12;
    const skip = (pageNumber - 1) * pageSize;

    const products = await Product.find(filter)
      .populate({
        path: 'seller',
        select: 'firstName shop'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / pageSize);

    logProductQuery('GET_SHOP_PRODUCTS_SUCCESS', {
      shopId: shopId,
      totalFound: totalProducts,
      currentPage: pageNumber
    }, 'success');

    res.status(200).json({
      success: true,
      count: products.length,
      totalCount: totalProducts,
      currentPage: pageNumber,
      totalPages: totalPages,
      shop: {
        id: seller._id,
        name: seller.shop?.name || seller.firstName,
        address: seller.shop?.address,
        description: seller.shop?.description
      },
      data: products
    });
  } catch (error) {
    logProductQuery('GET_SHOP_PRODUCTS_ERROR', { 
      shopId: req.params.shopId,
      error: error.message 
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error fetching shop products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Toggle limited edition status
// @route   PATCH /api/products/:id/toggle-limited-edition
// @access  Private (Seller)
const toggleLimitedEdition = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.seller._id;

    const product = await Product.findOne({
      _id: productId,
      seller: sellerId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    product.isLimitedEdition = !product.isLimitedEdition;
    await product.save();

    logProductQuery('TOGGLE_LIMITED_EDITION', {
      productId: productId,
      newStatus: product.isLimitedEdition,
      sellerId: sellerId.toString()
    }, 'success');

    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        isLimitedEdition: product.isLimitedEdition
      },
      message: `Product ${product.isLimitedEdition ? 'marked as' : 'removed from'} limited edition`
    });
  } catch (error) {
    logProductQuery('TOGGLE_LIMITED_EDITION_ERROR', { 
      productId: req.params.id,
      error: error.message 
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error updating limited edition status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Toggle trending status
// @route   PATCH /api/products/:id/toggle-trending
// @access  Private (Seller)
const toggleTrending = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.seller._id;

    const product = await Product.findOne({
      _id: productId,
      seller: sellerId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    product.isTrending = !product.isTrending;
    await product.save();

    logProductQuery('TOGGLE_TRENDING', {
      productId: productId,
      newStatus: product.isTrending,
      sellerId: sellerId.toString()
    }, 'success');

    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        isTrending: product.isTrending
      },
      message: `Product ${product.isTrending ? 'marked as' : 'removed from'} trending`
    });
  } catch (error) {
    logProductQuery('TOGGLE_TRENDING_ERROR', { 
      productId: req.params.id,
      error: error.message 
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error updating trending status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update product status
// @route   PATCH /api/products/:id/status
// @access  Private (Seller)
const updateProductStatus = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.seller._id;
    const { status } = req.body;

    const validStatuses = ['active', 'paused', 'outOfStock'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: active, paused, or outOfStock'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      seller: sellerId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    product.status = status;
    await product.save();

    logProductQuery('UPDATE_PRODUCT_STATUS', {
      productId: productId,
      newStatus: status,
      sellerId: sellerId.toString()
    }, 'success');

    res.status(200).json({
      success: true,
      data: {
        productId: product._id,
        status: product.status
      },
      message: `Product status updated to ${status}`
    });
  } catch (error) {
    logProductQuery('UPDATE_PRODUCT_STATUS_ERROR', { 
      productId: req.params.id,
      error: error.message 
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error updating product status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🎯 NEW: Get product inventory summary
// @route   GET /api/products/:id/inventory
// @access  Private (Seller)
const getProductInventory = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.seller._id;

    const product = await Product.findOne({
      _id: productId,
      seller: sellerId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    const inventorySummary = product.getInventorySummary();

    logProductQuery('GET_PRODUCT_INVENTORY', {
      productId: productId,
      sellerId: sellerId.toString()
    }, 'success');

    res.status(200).json({
      success: true,
      data: inventorySummary,
      message: 'Product inventory retrieved successfully'
    });
  } catch (error) {
    logProductQuery('GET_PRODUCT_INVENTORY_ERROR', { 
      productId: req.params.id,
      error: error.message 
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error retrieving product inventory',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🎯 NEW: Add stock to product
// @route   POST /api/products/:id/add-stock
// @access  Private (Seller)
const addProductStock = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.seller._id;
    const { variantUpdates, notes } = req.body;

    logProductQuery('ADD_PRODUCT_STOCK_START', {
      productId: productId,
      sellerId: sellerId.toString(),
      variantUpdatesCount: variantUpdates?.length || 0
    });

    if (!variantUpdates || !Array.isArray(variantUpdates) || variantUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Variant updates are required and must be an array'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      seller: sellerId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    // Validate variant updates
    for (const update of variantUpdates) {
      if (!update.size || !update.color || !update.quantity || update.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid variant update: ${JSON.stringify(update)}. Each variant update must include size, color, and positive quantity`
        });
      }
    }

    // Use inventory history service for better tracking
    const stockResult = await InventoryHistoryService.updateProductStock({
      productId,
      sellerId,
      variantUpdates,
      reason: 'Stock added by seller',
      notes: notes || 'Stock added by seller'
    });

    if (!stockResult.success) {
      return res.status(400).json({
        success: false,
        message: stockResult.message
      });
    }

    logProductQuery('ADD_PRODUCT_STOCK_SUCCESS', {
      productId: productId,
      sellerId: sellerId.toString(),
      updatesCount: variantUpdates.length,
      historyEntriesCount: stockResult.data.historyEntries.length
    }, 'success');

    res.status(200).json({
      success: true,
      data: stockResult.data,
      message: 'Stock added successfully'
    });
  } catch (error) {
    logProductQuery('ADD_PRODUCT_STOCK_ERROR', { 
      productId: req.params.id,
      error: error.message,
      errorType: error.name
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error adding stock to product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🎯 NEW: Get inventory history for product
// @route   GET /api/products/:id/inventory-history
// @access  Private (Seller)
const getProductInventoryHistory = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.seller._id;
    const { page = 1, limit = 20 } = req.query;

    const product = await Product.findOne({
      _id: productId,
      seller: sellerId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    const result = await InventoryHistoryService.getProductInventoryHistory(productId, limit);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

    logProductQuery('GET_PRODUCT_INVENTORY_HISTORY', {
      productId: productId,
      sellerId: sellerId.toString(),
      historyCount: result.data.length
    }, 'success');

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Inventory history fetched successfully'
    });
  } catch (error) {
    logProductQuery('GET_PRODUCT_INVENTORY_HISTORY_ERROR', { 
      productId: req.params.id,
      error: error.message 
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error retrieving product inventory history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🎯 NEW: Get low stock products for seller
// @route   GET /api/products/low-stock
// @access  Private (Seller)
const getLowStockProducts = async (req, res) => {
  try {
    const sellerId = req.seller._id;
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const lowStockProducts = await Product.find({
      seller: sellerId,
      'inventory.isLowStock': true,
      status: { $ne: 'outOfStock' }
    })
    .sort({ 'inventory.availableQuantity': 1 })
    .skip(skip)
    .limit(pageSize);

    const totalLowStock = await Product.countDocuments({
      seller: sellerId,
      'inventory.isLowStock': true,
      status: { $ne: 'outOfStock' }
    });

    const totalPages = Math.ceil(totalLowStock / pageSize);

    logProductQuery('GET_LOW_STOCK_PRODUCTS', {
      sellerId: sellerId.toString(),
      lowStockCount: lowStockProducts.length,
      totalLowStock
    }, 'success');

    res.status(200).json({
      success: true,
      data: {
        products: lowStockProducts,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalLowStock,
          hasNextPage: pageNumber < totalPages,
          hasPrevPage: pageNumber > 1
        }
      },
      message: `Found ${totalLowStock} products with low stock`
    });
  } catch (error) {
    logProductQuery('GET_LOW_STOCK_PRODUCTS_ERROR', { 
      sellerId: req.seller?._id,
      error: error.message 
    }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Error retrieving low stock products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createProduct,
  getSellerProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMarketplaceProducts,
  getShopProducts,
  toggleLimitedEdition,
  toggleTrending,
  updateProductStatus,
  getLimitedEditionProducts,
  getTrendingProducts,
  getProductInventory,
  addProductStock,
  getProductInventoryHistory,
  getLowStockProducts
};
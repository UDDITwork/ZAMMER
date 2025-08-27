/**
 * FILE LOCATION: frontend/src/services/productService.js
 * 
 * PRODUCT SERVICE OVERVIEW:
 * This service handles all product-related API operations including CRUD operations,
 * marketplace product fetching, category filtering, and image management.
 * 
 * KEY FUNCTIONS:
 * - createProduct: Creates new products with validation
 * - getSellerProducts: Fetches products for authenticated sellers
 * - getProductById: Retrieves single product details
 * - updateProduct: Updates existing products with data sanitization
 * - deleteProduct: Removes products from the system
 * - getMarketplaceProducts: Main function for fetching marketplace products with filtering
 * - getProductsByCategory: Filters products by main category (Men, Women, Kids)
 * - getLimitedEditionProducts: Fetches limited edition products
 * - getTrendingProducts: Retrieves trending products
 * - searchProducts: Performs text-based product search
 * - deleteImage: Removes images from Cloudinary storage
 * 
 * 🎯 NEW INVENTORY MANAGEMENT FUNCTIONS:
 * - getProductInventory: Get inventory summary for a product
 * - addProductStock: Add stock to product variants
 * - getProductInventoryHistory: Get inventory change history
 * - getLowStockProducts: Get products with low stock
 * 
 * FILTERING LOGIC:
 * The service supports multiple filtering parameters including:
 * - Category filtering (Men, Women, Kids)
 * - Subcategory filtering (T-shirts, Shirts, Jeans, etc.)
 * - Price range filtering
 * - Product category filtering (Traditional Indian, Winter Fashion, etc.)
 * - Limited edition and trending flags
 * - Search queries
 * 
 * INTEGRATION:
 * - Uses centralized API configuration from api.js
 * - Implements comprehensive error handling and logging
 * - Supports pagination and sorting
 * - Integrates with Cloudinary for image management
 * - Provides fallback responses for network errors
 */

import api from './api';

// Optimized logging - only log errors and important events
const isProduction = process.env.NODE_ENV === 'production';
const debugLog = (message, data = null, type = 'info') => {
  // Only log in development or for errors
  if (!isProduction || type === 'error') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[Service] ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Create a product
export const createProduct = async (productData) => {
  try {
    debugLog('📦 Creating product', { name: productData.name });
    const response = await api.post('/products', productData);
    debugLog('✅ Product created successfully', { id: response.data.data._id }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Create Product Error', {
      message: error.response?.data?.message || error.message,
      data: productData
    }, 'error');
    throw error.response?.data || error;
  }
};

// Get all products for a seller
export const getSellerProducts = async () => {
  try {
    debugLog('🔍 Fetching seller products');
    const response = await api.get('/products');
    debugLog('✅ Seller products fetched successfully', { count: response.data.data.length }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Get Seller Products Error', {
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// Get a single product
export const getProductById = async (id) => {
  try {
    debugLog('🔍 Fetching product', { id });
    const response = await api.get(`/products/${id}`);
    debugLog('✅ Product fetched successfully', { id }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Get Product Error', {
      id,
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// Update a product
export const updateProduct = async (id, productData) => {
  try {
    debugLog('📝 Updating product', {
      id,
      updates: Object.keys(productData),
      values: {
        mrp: productData.mrp,
        zammerPrice: productData.zammerPrice
      }
    });

    // Ensure numeric types before sending
    const sanitizedData = {
      ...productData,
      mrp: Number(productData.mrp),
      zammerPrice: Number(productData.zammerPrice)
    };

    debugLog('🔢 Sanitized data', {
      mrp: sanitizedData.mrp,
      zammerPrice: sanitizedData.zammerPrice
    }, 'info');

    const response = await api.put(`/products/${id}`, sanitizedData);
    debugLog('✅ Product updated successfully', {
      id,
      response: response.data
    }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Update Product Error', {
      id,
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.error?.details,
      validationErrors: error.response?.data?.error?.validationErrors,
      updates: Object.keys(productData),
      values: {
        mrp: productData.mrp,
        zammerPrice: productData.zammerPrice
      }
    }, 'error');

    // Enhanced error object
    const enhancedError = {
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.error?.details,
      validationErrors: error.response?.data?.error?.validationErrors,
      originalError: error
    };

    throw enhancedError;
  }
};

// Delete a product
export const deleteProduct = async (id) => {
  try {
    debugLog('🗑️ Deleting product', { id });
    const response = await api.delete(`/products/${id}`);
    debugLog('✅ Product deleted successfully', { id }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Delete Product Error', {
      id,
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// Get marketplace products
export const getMarketplaceProducts = async (queryParams) => {
  try {
    console.log('🌐 ProductService: Making API call to /products/marketplace');
    console.log('📤 ProductService: Request params:', queryParams);
    
    const response = await api.get('/products/marketplace', { params: queryParams });
    
    console.log('📥 ProductService: Raw response:', {
      status: response.status,
      hasData: !!response.data,
      success: response.data?.success,
      count: response.data?.count,
      totalCount: response.data?.totalCount
    });
    
    if (response.data && response.data.success) {
      console.log('✅ ProductService: Successful response');
      return response.data;
    } else {
      console.error('❌ ProductService: API returned error:', response.data?.message);
      return {
        success: false,
        message: response.data?.message || 'Failed to fetch products',
        data: [],
        count: 0,
        totalCount: 0
      };
    }
  } catch (error) {
    console.error('❌ ProductService: Network/API error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Network error while fetching products',
      data: [],
      count: 0,
      totalCount: 0
    };
  }
};

// Toggle Limited Edition status
export const toggleLimitedEdition = async (id) => {
  try {
    debugLog('🔄 Toggling Limited Edition status', { id });
    const response = await api.patch(`/products/${id}/toggle-limited-edition`);
    debugLog('✅ Limited Edition status toggled successfully', {
      id,
      newStatus: response.data.data.isLimitedEdition
    }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Toggle Limited Edition Error', {
      id,
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// Toggle Trending status
export const toggleTrending = async (id) => {
  try {
    debugLog('🔄 Toggling Trending status', { id });
    const response = await api.patch(`/products/${id}/toggle-trending`);
    debugLog('✅ Trending status toggled successfully', {
      id,
      newStatus: response.data.data.isTrending
    }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Toggle Trending Error', {
      id,
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// Update product status
export const updateProductStatus = async (id, status) => {
  try {
    debugLog('🔄 Updating product status', { id, status });
    const response = await api.patch(`/products/${id}/status`, { status });
    debugLog('✅ Product status updated successfully', {
      id,
      newStatus: response.data.data.status
    }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Update Product Status Error', {
      id,
      status,
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// Get products by category
export const getProductsByCategory = async (category, queryParams = {}) => {
  try {
    debugLog('🔍 Fetching products by category', { category, filters: queryParams });
    const response = await api.get(`/products/marketplace/category/${category}`, { params: queryParams });
    debugLog('✅ Category products fetched successfully', {
      category,
      count: response.data.data.length
    }, response.data.data.length === 0 ? 'warning' : 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Get Category Products Error', {
      category,
      message: error.response?.data?.message || error.message,
      filters: queryParams
    }, 'error');
    throw error.response?.data || error;
  }
};

// Get limited edition products
export const getLimitedEditionProducts = async (queryParams = {}) => {
  try {
    debugLog('🔍 Fetching limited edition products', { filters: queryParams });
    const response = await api.get('/products/marketplace/limited-edition', { params: queryParams });
    debugLog('✅ Limited edition products fetched successfully', { count: response.data.data.length }, response.data.data.length === 0 ? 'warning' : 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Get Limited Edition Products Error', {
      message: error.response?.data?.message || error.message,
      filters: queryParams
    }, 'error');
    throw error.response?.data || error;
  }
};

// Get trending products
export const getTrendingProducts = async (queryParams = {}) => {
  try {
    debugLog('🔍 Fetching trending products', { filters: queryParams });
    const response = await api.get('/products/marketplace/trending', { params: queryParams });
    debugLog('✅ Trending products fetched successfully', { count: response.data.data.length }, response.data.data.length === 0 ? 'warning' : 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Get Trending Products Error', {
      message: error.response?.data?.message || error.message,
      filters: queryParams
    }, 'error');
    throw error.response?.data || error;
  }
};

// Search products
export const searchProducts = async (searchQuery, queryParams = {}) => {
  try {
    debugLog('🔍 Searching products', { query: searchQuery, filters: queryParams });
    const response = await api.get('/products/marketplace/search', {
      params: {
        q: searchQuery,
        ...queryParams
      }
    });
    debugLog('✅ Products search completed successfully', {
      query: searchQuery,
      count: response.data.data.length
    }, response.data.data.length === 0 ? 'warning' : 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Search Products Error', {
      query: searchQuery,
      message: error.response?.data?.message || error.message,
      filters: queryParams
    }, 'error');
    throw error.response?.data || error;
  }
};

// Bulk update products
export const bulkUpdateProducts = async (productIds, updateData) => {
  try {
    debugLog('📝 Bulk updating products', {
      count: productIds.length,
      updates: Object.keys(updateData)
    });
    const response = await api.patch('/products/bulk-update', {
      productIds,
      updateData
    });
    debugLog('✅ Bulk update completed successfully', {
      count: productIds.length,
      updates: Object.keys(updateData)
    }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Bulk Update Products Error', {
      count: productIds.length,
      message: error.response?.data?.message || error.message,
      updates: Object.keys(updateData)
    }, 'error');
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Get product inventory summary
export const getProductInventory = async (productId) => {
  try {
    debugLog('📦 Fetching product inventory', { productId });
    const response = await api.get(`/products/${productId}/inventory`);
    debugLog('✅ Product inventory fetched successfully', { 
      productId,
      totalQuantity: response.data.data.totalQuantity,
      availableQuantity: response.data.data.availableQuantity
    }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Get Product Inventory Error', {
      productId,
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Add stock to product
export const addProductStock = async (productId, variantUpdates, notes = '') => {
  try {
    debugLog('📦 Adding stock to product', { 
      productId, 
      variantCount: variantUpdates.length,
      totalQuantity: variantUpdates.reduce((sum, v) => sum + v.quantity, 0)
    });
    
    const response = await api.post(`/products/${productId}/add-stock`, {
      variantUpdates,
      notes
    });
    
    debugLog('✅ Stock added successfully', {
      productId,
      stockUpdates: response.data.data.stockUpdates,
      newTotalQuantity: response.data.data.newTotalQuantity
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ Add Product Stock Error', {
      productId,
      message: error.response?.data?.message || error.message,
      variantUpdates
    }, 'error');
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Get product inventory history
export const getProductInventoryHistory = async (productId, page = 1, limit = 20) => {
  try {
    debugLog('📦 Fetching product inventory history', { productId, page, limit });
    const response = await api.get(`/products/${productId}/inventory-history`, {
      params: { page, limit }
    });
    
    debugLog('✅ Product inventory history fetched successfully', {
      productId,
      historyCount: response.data.data.history.length,
      totalHistory: response.data.data.pagination.totalHistory
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ Get Product Inventory History Error', {
      productId,
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Get low stock products
export const getLowStockProducts = async (page = 1, limit = 10) => {
  try {
    debugLog('📦 Fetching low stock products', { page, limit });
    const response = await api.get('/products/low-stock', {
      params: { page, limit }
    });
    
    debugLog('✅ Low stock products fetched successfully', {
      lowStockCount: response.data.data.products.length,
      totalLowStock: response.data.data.pagination.totalLowStock
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ Get Low Stock Products Error', {
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Delete image from Cloudinary
export const deleteImage = async (publicId) => {
  try {
    console.log('🗑️ Deleting image:', publicId);
    
    const response = await api.delete(`/upload/${publicId}`);
    
    console.log('✅ Image deletion response:', {
      success: response.data.success,
      message: response.data.message
    });

    return response.data;
  } catch (error) {
    console.error('❌ Image deletion error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Wishlist functions for product pages
export const addToWishlist = async (productId) => {
  try {
    debugLog('❤️ Adding product to wishlist', { productId }, 'info');
    
    const response = await api.post('/users/wishlist', { productId });
    
    debugLog('✅ Product added to wishlist successfully', { productId }, 'success');
    
    return {
      success: true,
      message: response.data.message || 'Added to wishlist successfully'
    };
  } catch (error) {
    debugLog('❌ Add to wishlist error', {
      productId,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to add to wishlist'
    };
  }
};

export const removeFromWishlist = async (productId) => {
  try {
    debugLog('🗑️ Removing product from wishlist', { productId }, 'info');
    
    const response = await api.delete(`/users/wishlist/${productId}`);
    
    debugLog('✅ Product removed from wishlist successfully', { productId }, 'success');
    
    return {
      success: true,
      message: response.data.message || 'Removed from wishlist successfully'
    };
  } catch (error) {
    debugLog('❌ Remove from wishlist error', {
      productId,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to remove from wishlist'
    };
  }
};

export const checkWishlistStatus = async (productId) => {
  try {
    debugLog('🔍 Checking wishlist status', { productId }, 'info');
    
    const response = await api.get(`/users/wishlist/check/${productId}`);
    
    debugLog('✅ Wishlist status checked', {
      productId,
      isInWishlist: response.data.data.isInWishlist
    }, 'success');
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    debugLog('❌ Check wishlist status error', {
      productId,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    // Return graceful fallback for wishlist check
    return {
      success: true,
      data: { isInWishlist: false }
    };
  }
};

// Default export
const productService = {
  createProduct,
  getSellerProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMarketplaceProducts,
  toggleLimitedEdition,
  toggleTrending,
  updateProductStatus,
  getProductsByCategory,
  getLimitedEditionProducts,
  getTrendingProducts,
  searchProducts,
  bulkUpdateProducts,
  deleteImage,
  // 🎯 NEW: Inventory management functions
  getProductInventory,
  addProductStock,
  getProductInventoryHistory,
  getLowStockProducts,
  // 🎯 NEW: Wishlist functions
  addToWishlist,
  removeFromWishlist,
  checkWishlistStatus
};

export default productService;
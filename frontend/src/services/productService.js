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
};

export default productService;
import api from './api';

// Create a product
export const createProduct = async (productData) => {
  try {
    console.log('📦 Creating product:', { name: productData.name });
    const response = await api.post('/products', productData);
    console.log('✅ Product created successfully:', { id: response.data.data._id });
    return response.data;
  } catch (error) {
    console.error('❌ Create Product Error:', {
      message: error.response?.data?.message || error.message,
      data: productData
    });
    throw error.response?.data || error;
  }
};

// Get all products for a seller
export const getSellerProducts = async () => {
  try {
    console.log('🔍 Fetching seller products');
    const response = await api.get('/products');
    console.log('✅ Seller products fetched successfully:', { count: response.data.data.length });
    return response.data;
  } catch (error) {
    console.error('❌ Get Seller Products Error:', {
      message: error.response?.data?.message || error.message
    });
    throw error.response?.data || error;
  }
};

// Get a single product
export const getProductById = async (id) => {
  try {
    console.log('🔍 Fetching product:', { id });
    const response = await api.get(`/products/${id}`);
    console.log('✅ Product fetched successfully:', { id });
    return response.data;
  } catch (error) {
    console.error('❌ Get Product Error:', {
      id,
      message: error.response?.data?.message || error.message
    });
    throw error.response?.data || error;
  }
};

// Update a product
export const updateProduct = async (id, productData) => {
  try {
    console.log('📝 Updating product:', { 
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

    console.log('🔢 Sanitized data:', {
      mrp: sanitizedData.mrp,
      zammerPrice: sanitizedData.zammerPrice
    });

    const response = await api.put(`/products/${id}`, sanitizedData);
    console.log('✅ Product updated successfully:', { 
      id,
      response: response.data
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update Product Error:', {
      id,
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.error?.details,
      validationErrors: error.response?.data?.error?.validationErrors,
      updates: Object.keys(productData),
      values: {
        mrp: productData.mrp,
        zammerPrice: productData.zammerPrice
      }
    });

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
    console.log('🗑️ Deleting product:', { id });
    const response = await api.delete(`/products/${id}`);
    console.log('✅ Product deleted successfully:', { id });
    return response.data;
  } catch (error) {
    console.error('❌ Delete Product Error:', {
      id,
      message: error.response?.data?.message || error.message
    });
    throw error.response?.data || error;
  }
};

// Get marketplace products
export const getMarketplaceProducts = async (queryParams) => {
  try {
    console.log('🔍 Fetching marketplace products:', { filters: queryParams });
    const response = await api.get('/products/marketplace', { params: queryParams });
    console.log('✅ Marketplace products fetched successfully:', { 
      count: response.data.data.length,
      filters: queryParams 
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get Marketplace Products Error:', {
      message: error.response?.data?.message || error.message,
      filters: queryParams
    });
    throw error.response?.data || error;
  }
};

// Toggle Limited Edition status
export const toggleLimitedEdition = async (id) => {
  try {
    console.log('🔄 Toggling Limited Edition status:', { id });
    const response = await api.patch(`/products/${id}/toggle-limited-edition`);
    console.log('✅ Limited Edition status toggled successfully:', { 
      id,
      newStatus: response.data.data.isLimitedEdition 
    });
    return response.data;
  } catch (error) {
    console.error('❌ Toggle Limited Edition Error:', {
      id,
      message: error.response?.data?.message || error.message
    });
    throw error.response?.data || error;
  }
};

// Toggle Trending status
export const toggleTrending = async (id) => {
  try {
    console.log('🔄 Toggling Trending status:', { id });
    const response = await api.patch(`/products/${id}/toggle-trending`);
    console.log('✅ Trending status toggled successfully:', { 
      id,
      newStatus: response.data.data.isTrending 
    });
    return response.data;
  } catch (error) {
    console.error('❌ Toggle Trending Error:', {
      id,
      message: error.response?.data?.message || error.message
    });
    throw error.response?.data || error;
  }
};

// Update product status
export const updateProductStatus = async (id, status) => {
  try {
    console.log('🔄 Updating product status:', { id, status });
    const response = await api.patch(`/products/${id}/status`, { status });
    console.log('✅ Product status updated successfully:', { 
      id,
      newStatus: response.data.data.status 
    });
    return response.data;
  } catch (error) {
    console.error('❌ Update Product Status Error:', {
      id,
      status,
      message: error.response?.data?.message || error.message
    });
    throw error.response?.data || error;
  }
};

// Get products by category
export const getProductsByCategory = async (category, queryParams = {}) => {
  try {
    console.log('🔍 Fetching products by category:', { category, filters: queryParams });
    const response = await api.get(`/products/marketplace/category/${category}`, { params: queryParams });
    console.log('✅ Category products fetched successfully:', { 
      category,
      count: response.data.data.length 
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get Category Products Error:', {
      category,
      message: error.response?.data?.message || error.message,
      filters: queryParams
    });
    throw error.response?.data || error;
  }
};

// Get limited edition products
export const getLimitedEditionProducts = async (queryParams = {}) => {
  try {
    console.log('🔍 Fetching limited edition products:', { filters: queryParams });
    const response = await api.get('/products/marketplace/limited-edition', { params: queryParams });
    console.log('✅ Limited edition products fetched successfully:', { 
      count: response.data.data.length 
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get Limited Edition Products Error:', {
      message: error.response?.data?.message || error.message,
      filters: queryParams
    });
    throw error.response?.data || error;
  }
};

// Get trending products
export const getTrendingProducts = async (queryParams = {}) => {
  try {
    console.log('🔍 Fetching trending products:', { filters: queryParams });
    const response = await api.get('/products/marketplace/trending', { params: queryParams });
    console.log('✅ Trending products fetched successfully:', { 
      count: response.data.data.length 
    });
    return response.data;
  } catch (error) {
    console.error('❌ Get Trending Products Error:', {
      message: error.response?.data?.message || error.message,
      filters: queryParams
    });
    throw error.response?.data || error;
  }
};

// Search products
export const searchProducts = async (searchQuery, queryParams = {}) => {
  try {
    console.log('🔍 Searching products:', { query: searchQuery, filters: queryParams });
    const response = await api.get('/products/marketplace/search', { 
      params: { 
        q: searchQuery,
        ...queryParams 
      } 
    });
    console.log('✅ Products search completed successfully:', { 
      query: searchQuery,
      count: response.data.data.length 
    });
    return response.data;
  } catch (error) {
    console.error('❌ Search Products Error:', {
      query: searchQuery,
      message: error.response?.data?.message || error.message,
      filters: queryParams
    });
    throw error.response?.data || error;
  }
};

// Bulk update products
export const bulkUpdateProducts = async (productIds, updateData) => {
  try {
    console.log('📝 Bulk updating products:', { 
      count: productIds.length,
      updates: Object.keys(updateData)
    });
    const response = await api.patch('/products/bulk-update', {
      productIds,
      updateData
    });
    console.log('✅ Bulk update completed successfully:', { 
      count: productIds.length,
      updates: Object.keys(updateData)
    });
    return response.data;
  } catch (error) {
    console.error('❌ Bulk Update Products Error:', {
      count: productIds.length,
      message: error.response?.data?.message || error.message,
      updates: Object.keys(updateData)
    });
    throw error.response?.data || error;
  }
};
import api from './api';

// Create a product
export const createProduct = async (productData) => {
  try {
    const response = await api.post('/products', productData);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Get all products for a seller
export const getSellerProducts = async () => {
  try {
    const response = await api.get('/products');
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Get a single product
export const getProductById = async (id) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Update a product
export const updateProduct = async (id, productData) => {
  try {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Delete a product
export const deleteProduct = async (id) => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Get marketplace products
export const getMarketplaceProducts = async (queryParams) => {
  try {
    const response = await api.get('/products/marketplace', { params: queryParams });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 🎯 NEW: Toggle Limited Edition status
export const toggleLimitedEdition = async (id) => {
  try {
    const response = await api.patch(`/products/${id}/toggle-limited-edition`);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 🎯 NEW: Toggle Trending status
export const toggleTrending = async (id) => {
  try {
    const response = await api.patch(`/products/${id}/toggle-trending`);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 🎯 NEW: Update product status (active/inactive)
export const updateProductStatus = async (id, status) => {
  try {
    const response = await api.patch(`/products/${id}/status`, { status });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 🎯 NEW: Get products by category for marketplace
export const getProductsByCategory = async (category, queryParams = {}) => {
  try {
    const response = await api.get(`/products/marketplace/category/${category}`, { params: queryParams });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 🎯 NEW: Get trending products
export const getTrendingProducts = async (queryParams = {}) => {
  try {
    const response = await api.get('/products/marketplace/trending', { params: queryParams });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 🎯 NEW: Get limited edition products
export const getLimitedEditionProducts = async (queryParams = {}) => {
  try {
    const response = await api.get('/products/marketplace/limited-edition', { params: queryParams });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 🎯 NEW: Search products
export const searchProducts = async (searchQuery, queryParams = {}) => {
  try {
    const response = await api.get('/products/marketplace/search', { 
      params: { 
        q: searchQuery,
        ...queryParams 
      } 
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// 🎯 NEW: Bulk update products (for batch operations)
export const bulkUpdateProducts = async (productIds, updateData) => {
  try {
    const response = await api.patch('/products/bulk-update', {
      productIds,
      updateData
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};
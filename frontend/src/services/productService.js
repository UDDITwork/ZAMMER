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
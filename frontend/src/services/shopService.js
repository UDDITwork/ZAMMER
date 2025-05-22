import api from './api';

// Get shop details
export const getShop = async (shopId) => {
  try {
    const response = await api.get(`/sellers/shop/${shopId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get shop products
export const getShopProducts = async (shopId) => {
  try {
    const response = await api.get(`/products/shop/${shopId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Rate a shop
export const rateShop = async (shopId, rating, review = '') => {
  try {
    const response = await api.post('/ratings/shop', { 
      sellerId: shopId, 
      rating, 
      review 
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get shop ratings
export const getShopRatings = async (shopId) => {
  try {
    const response = await api.get(`/ratings/shop/${shopId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
}; 
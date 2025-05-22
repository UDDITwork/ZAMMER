import api from './api';

// Get shop ratings
export const getShopRatings = async (sellerId) => {
  try {
    const response = await api.get(`/ratings/shop/${sellerId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Rate a shop
export const rateShop = async (sellerId, rating, review) => {
  try {
    const response = await api.post('/ratings/shop', { sellerId, rating, review });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Update shop rating
export const updateShopRating = async (ratingId, rating, review) => {
  try {
    const response = await api.put(`/ratings/shop/${ratingId}`, { rating, review });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Delete shop rating
export const deleteShopRating = async (ratingId) => {
  try {
    const response = await api.delete(`/ratings/shop/${ratingId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
}; 
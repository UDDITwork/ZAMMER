import api from './api';

// Get wishlist
export const getWishlist = async () => {
  try {
    const response = await api.get('/users/wishlist');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Add to wishlist
export const addToWishlist = async (productId) => {
  try {
    const response = await api.post('/users/wishlist', { productId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Remove from wishlist
export const removeFromWishlist = async (productId) => {
  try {
    const response = await api.delete(`/users/wishlist/${productId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Check if product is in wishlist
export const checkWishlist = async (productId) => {
  try {
    const response = await api.get(`/users/wishlist/check/${productId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
}; 
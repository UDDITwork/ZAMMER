import api from './api';

// Get cart
export const getCart = async () => {
  try {
    const response = await api.get('/cart');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Add to cart
export const addToCart = async (productId, quantity = 1) => {
  try {
    const response = await api.post('/cart', { productId, quantity });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Update cart item
export const updateCartItem = async (productId, quantity) => {
  try {
    const response = await api.put(`/cart/${productId}`, { quantity });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Remove from cart
export const removeFromCart = async (productId) => {
  try {
    const response = await api.delete(`/cart/${productId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Clear cart
export const clearCart = async () => {
  try {
    const response = await api.delete('/cart');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
}; 
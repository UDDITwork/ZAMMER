import api from './api'; // Use the main api instance for consistency

export const cartService = {
  // Get user's cart
  getCart: async () => {
    try {
      const response = await api.get('/cart');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Get cart error:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Please login to view your cart',
          requiresAuth: true
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch cart'
      };
    }
  },

  // Add item to cart
  addToCart: async (productId, quantity = 1, options = {}) => {
    try {
      const { size, color, selectedSize, selectedColor } = options;
      
      const response = await api.post('/cart', {
        productId,
        quantity,
        selectedSize: selectedSize || size,
        selectedColor: selectedColor || color
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Add to cart error:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Please login to add items to cart',
          requiresAuth: true
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add to cart'
      };
    }
  },

  // Update cart item quantity
  updateCartItem: async (productId, quantity) => {
    try {
      const response = await api.put(`/cart/${productId}`, {
        quantity
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Update cart item error:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Please login to update cart items',
          requiresAuth: true
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update cart item'
      };
    }
  },

  // Remove item from cart
  removeFromCart: async (productId) => {
    try {
      const response = await api.delete(`/cart/${productId}`);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Remove from cart error:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Please login to remove cart items',
          requiresAuth: true
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove from cart'
      };
    }
  },

  // Clear entire cart
  clearCart: async () => {
    try {
      const response = await api.delete('/cart');
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Clear cart error:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Please login to clear cart',
          requiresAuth: true
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to clear cart'
      };
    }
  },

  // Get cart item count (utility function)
  getCartItemCount: async () => {
    try {
      const cartResponse = await api.get('/cart');
      const cart = cartResponse.data.data;
      
      if (!cart || !cart.items) {
        return { success: true, count: 0 };
      }
      
      const totalCount = cart.items.reduce((total, item) => total + item.quantity, 0);
      
      return {
        success: true,
        count: totalCount
      };
    } catch (error) {
      console.error('Get cart count error:', error);
      
      // For cart count, return 0 on any error (including auth errors)
      // This is a non-critical operation
      return {
        success: false,
        count: 0,
        message: error.response?.data?.message || 'Failed to get cart count',
        requiresAuth: error.response?.status === 401
      };
    }
  }
};

export default cartService;
import api from './api';

// 🎯 ENHANCED: Better debugging and error handling
const debugLog = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CartService] ${message}`, data);
  }
};

// 🎯 NEW: Check if user is authenticated before making requests
const checkAuthentication = () => {
  const userToken = localStorage.getItem('userToken');
  const userData = localStorage.getItem('userData');
  
  debugLog('Authentication check', {
    hasToken: !!userToken,
    hasUserData: !!userData,
    tokenPreview: userToken ? `${userToken.substring(0, 20)}...` : 'none'
  });
  
  if (!userToken || !userData) {
    return {
      isAuthenticated: false,
      error: 'Please login to access cart functionality'
    };
  }
  
  try {
    const parsedUserData = JSON.parse(userData);
    return {
      isAuthenticated: true,
      user: parsedUserData
    };
  } catch (error) {
    debugLog('Error parsing user data', error);
    // Clean up corrupted data
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    return {
      isAuthenticated: false,
      error: 'Invalid session data. Please login again.'
    };
  }
};

export const cartService = {
  // Get user's cart
  getCart: async () => {
    try {
      debugLog('Getting cart...');
      
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true
        };
      }
      
      const response = await api.get('/cart');
      debugLog('Cart retrieved successfully', {
        itemCount: response.data.data?.items?.length || 0,
        total: response.data.data?.total || 0
      });
      
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Get cart error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 401) {
        debugLog('401 error - clearing auth data');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        return {
          success: false,
          message: 'Session expired. Please login again.',
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
      debugLog('Adding to cart...', {
        productId,
        quantity,
        options
      });
      
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true
        };
      }
      
      const { size, color, selectedSize, selectedColor } = options;
      
      const payload = {
        productId,
        quantity,
        selectedSize: selectedSize || size,
        selectedColor: selectedColor || color
      };
      
      debugLog('Cart payload', payload);
      
      const response = await api.post('/cart', payload);
      
      debugLog('Add to cart successful', {
        message: response.data.message,
        cartItemCount: response.data.data?.items?.length || 0
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Product added to cart'
      };
    } catch (error) {
      console.error('Add to cart error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 401) {
        debugLog('401 error - clearing auth data');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        return {
          success: false,
          message: 'Session expired. Please login again.',
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
      debugLog('Updating cart item...', { productId, quantity });
      
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true
        };
      }
      
      const response = await api.put(`/cart/${productId}`, {
        quantity
      });
      
      debugLog('Cart item updated successfully');
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Update cart item error:', error);
      
      if (error.response?.status === 401) {
        debugLog('401 error - clearing auth data');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        return {
          success: false,
          message: 'Session expired. Please login again.',
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
      debugLog('Removing from cart...', { productId });
      
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true
        };
      }
      
      const response = await api.delete(`/cart/${productId}`);
      
      debugLog('Item removed from cart successfully');
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Remove from cart error:', error);
      
      if (error.response?.status === 401) {
        debugLog('401 error - clearing auth data');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        return {
          success: false,
          message: 'Session expired. Please login again.',
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
      debugLog('Clearing cart...');
      
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true
        };
      }
      
      const response = await api.delete('/cart');
      
      debugLog('Cart cleared successfully');
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Clear cart error:', error);
      
      if (error.response?.status === 401) {
        debugLog('401 error - clearing auth data');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        return {
          success: false,
          message: 'Session expired. Please login again.',
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
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        return { success: false, count: 0, requiresAuth: true };
      }
      
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
      
      return {
        success: false,
        count: 0,
        message: error.response?.data?.message || 'Failed to get cart count',
        requiresAuth: error.response?.status === 401
      };
    }
  },

  // 🎯 NEW: Debug function to check current auth state
  debugAuthState: () => {
    const userToken = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');
    const sellerToken = localStorage.getItem('sellerToken');
    
    debugLog('Current auth state', {
      userToken: userToken ? `${userToken.substring(0, 20)}...` : 'none',
      userData: userData ? 'present' : 'none',
      sellerToken: sellerToken ? `${sellerToken.substring(0, 20)}...` : 'none',
      localStorage: {
        userTokenExists: !!userToken,
        userDataExists: !!userData,
        sellerTokenExists: !!sellerToken
      }
    });
    
    return {
      hasUserToken: !!userToken,
      hasUserData: !!userData,
      hasSellerToken: !!sellerToken
    };
  }
};

export default cartService;
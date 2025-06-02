import api from './api';

// Enhanced debugging with colors
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[CartService] ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Simple JWT structure validation
const isValidJWTStructure = (token) => {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  } catch (error) {
    return false;
  }
};

// Enhanced authentication checking
const checkAuthentication = () => {
  debugLog('🔍 Starting authentication check...', null, 'info');
  
  const userToken = localStorage.getItem('userToken');
  const userData = localStorage.getItem('userData');
  
  debugLog('📋 Auth Storage Status', {
    userToken: userToken ? {
      exists: true,
      length: userToken.length,
      preview: `${userToken.substring(0, 30)}...`,
      isValidStructure: isValidJWTStructure(userToken)
    } : { exists: false },
    userData: userData ? { exists: true, length: userData.length } : { exists: false },
    localStorageKeys: Object.keys(localStorage)
  }, 'info');
  
  // Check if token exists and has valid structure
  if (!userToken || !isValidJWTStructure(userToken)) {
    debugLog('❌ Authentication FAILED - Invalid or missing token', {
      hasToken: !!userToken,
      tokenValid: userToken ? isValidJWTStructure(userToken) : false,
      reason: !userToken ? 'No user token' : 'Invalid token structure'
    }, 'error');
    
    return {
      isAuthenticated: false,
      error: 'Please login to access cart functionality',
      details: {
        missingToken: !userToken,
        invalidToken: userToken && !isValidJWTStructure(userToken)
      }
    };
  }
  
  // Check if user data exists
  if (!userData) {
    debugLog('❌ Authentication FAILED - Missing user data', {
      hasToken: !!userToken,
      hasUserData: !!userData
    }, 'error');
    
    return {
      isAuthenticated: false,
      error: 'Session data missing. Please login again.',
      details: {
        missingUserData: true
      }
    };
  }
  
  try {
    const parsedUserData = JSON.parse(userData);
    debugLog('✅ Authentication SUCCESS', {
      userId: parsedUserData._id,
      userName: parsedUserData.name,
      userEmail: parsedUserData.email,
      tokenLength: userToken.length
    }, 'success');
    
    return {
      isAuthenticated: true,
      user: parsedUserData,
      token: userToken
    };
  } catch (error) {
    debugLog('❌ Authentication FAILED - Corrupted user data', {
      error: error.message,
      userDataPreview: userData?.substring(0, 100) + '...'
    }, 'error');
    
    // Clean up corrupted data
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    
    return {
      isAuthenticated: false,
      error: 'Invalid session data. Please login again.',
      details: {
        reason: 'Corrupted user data',
        action: 'Cleaned up localStorage'
      }
    };
  }
};

// Function to manually verify authentication status
const debugAuthenticationState = () => {
  debugLog('🔧 MANUAL AUTH DEBUG - Full localStorage scan', null, 'info');
  
  const allKeys = Object.keys(localStorage);
  const authRelatedData = {};
  
  allKeys.forEach(key => {
    if (key.includes('token') || key.includes('user') || key.includes('seller')) {
      const value = localStorage.getItem(key);
      authRelatedData[key] = value ? (
        key.includes('Data') ? {
          type: 'JSON Data',
          length: value.length,
          preview: value.substring(0, 50) + '...'
        } : {
          type: 'Token',
          length: value.length,
          preview: `${value.substring(0, 30)}...`,
          isValidStructure: isValidJWTStructure(value)
        }
      ) : { type: 'Empty' };
    }
  });
  
  debugLog('📊 All Auth-Related Data', authRelatedData, 'info');
  
  // Check current auth status
  const authCheck = checkAuthentication();
  debugLog('🎯 Current Auth Status', authCheck, authCheck.isAuthenticated ? 'success' : 'error');
  
  return authCheck;
};

export const cartService = {
  // Debug function (call this from browser console)
  debugAuth: debugAuthenticationState,
  
  // Get user's cart
  getCart: async () => {
    try {
      debugLog('🛒 GET CART - Starting request...', null, 'info');
      
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        debugLog('🚫 GET CART - Auth failed, returning early', authCheck, 'warning');
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true,
          details: authCheck.details
        };
      }
      
      debugLog('🌐 GET CART - Making API request...', {
        endpoint: '/cart',
        user: authCheck.user.name,
        userId: authCheck.user._id
      }, 'info');
      
      const response = await api.get('/cart');
      
      debugLog('✅ GET CART - Success!', {
        itemCount: response.data.data?.items?.length || 0,
        total: response.data.data?.total || 0,
        responseSuccess: response.data.success
      }, 'success');
      
      return {
        success: true,
        data: response.data.data
      };
  } catch (error) {
      debugLog('❌ GET CART - Error occurred', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        code: error.response?.data?.code,
        requiresAuth: error.response?.data?.requiresAuth
      }, 'error');
      
      // Enhanced error handling based on server response
      if (error.response?.status === 401) {
        const isTokenError = error.response?.data?.code && [
          'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
        ].includes(error.response.data.code);
        
        if (isTokenError) {
          debugLog('🔑 GET CART - Token error, clearing auth data', {
            code: error.response.data.code
          }, 'warning');
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
        }
        
        return {
          success: false,
          message: error.response?.data?.message || 'Session expired. Please login again.',
          requiresAuth: true,
          code: error.response?.data?.code
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
      debugLog('➕ ADD TO CART - Starting request...', {
        productId,
        quantity,
        options
      }, 'info');
      
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        debugLog('🚫 ADD TO CART - Auth failed, returning early', authCheck, 'warning');
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true,
          details: authCheck.details
        };
      }
      
      const { size, color, selectedSize, selectedColor } = options;
      
      const payload = {
        productId,
        quantity: parseInt(quantity) || 1,
        selectedSize: selectedSize || size,
        selectedColor: selectedColor || color
      };
      
      debugLog('📦 ADD TO CART - Prepared payload', payload, 'info');
      debugLog('🌐 ADD TO CART - Making API request...', {
        endpoint: '/cart',
        method: 'POST',
        user: authCheck.user.name
      }, 'info');
      
      const response = await api.post('/cart', payload);
      
      debugLog('✅ ADD TO CART - Success!', {
        message: response.data.message,
        cartItemCount: response.data.data?.items?.length || 0,
        responseSuccess: response.data.success
      }, 'success');
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Product added to cart'
      };
    } catch (error) {
      debugLog('❌ ADD TO CART - Error occurred', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        code: error.response?.data?.code,
        requiresAuth: error.response?.data?.requiresAuth
      }, 'error');
      
      // Enhanced error handling
      if (error.response?.status === 401) {
        const isTokenError = error.response?.data?.code && [
          'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
        ].includes(error.response.data.code);
        
        if (isTokenError) {
          debugLog('🔑 ADD TO CART - Token error, clearing auth data', {
            code: error.response.data.code
          }, 'warning');
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
        }
        
        return {
          success: false,
          message: error.response?.data?.message || 'Session expired. Please login again.',
          requiresAuth: true,
          code: error.response?.data?.code
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
      debugLog('📝 UPDATE CART - Starting request...', { productId, quantity }, 'info');
      
      // Check authentication first
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        debugLog('🚫 UPDATE CART - Auth failed', authCheck, 'warning');
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true
        };
      }
      
      const response = await api.put(`/cart/${productId}`, { quantity: parseInt(quantity) });
      
      debugLog('✅ UPDATE CART - Success!', {
        message: response.data.message
      }, 'success');
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      debugLog('❌ UPDATE CART - Error', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        code: error.response?.data?.code
      }, 'error');
      
      if (error.response?.status === 401) {
        const isTokenError = error.response?.data?.code && [
          'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
        ].includes(error.response.data.code);
        
        if (isTokenError) {
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
        }
        
        return {
          success: false,
          message: error.response?.data?.message || 'Session expired. Please login again.',
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
      debugLog('🗑️ REMOVE FROM CART - Starting request...', { productId }, 'info');
      
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true
        };
      }
      
      const response = await api.delete(`/cart/${productId}`);
      
      debugLog('✅ REMOVE FROM CART - Success!', null, 'success');
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      debugLog('❌ REMOVE FROM CART - Error', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        code: error.response?.data?.code
      }, 'error');
      
      if (error.response?.status === 401) {
        const isTokenError = error.response?.data?.code && [
          'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
        ].includes(error.response.data.code);
        
        if (isTokenError) {
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
        }
        
        return {
          success: false,
          message: error.response?.data?.message || 'Session expired. Please login again.',
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
      debugLog('🧹 CLEAR CART - Starting request...', null, 'info');
      
      const authCheck = checkAuthentication();
      if (!authCheck.isAuthenticated) {
        return {
          success: false,
          message: authCheck.error,
          requiresAuth: true
        };
      }
      
    const response = await api.delete('/cart');
      
      debugLog('✅ CLEAR CART - Success!', null, 'success');
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      debugLog('❌ CLEAR CART - Error', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        code: error.response?.data?.code
      }, 'error');
      
      if (error.response?.status === 401) {
        const isTokenError = error.response?.data?.code && [
          'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
        ].includes(error.response.data.code);
        
        if (isTokenError) {
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
        }
        
        return {
          success: false,
          message: error.response?.data?.message || 'Session expired. Please login again.',
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
      debugLog('❌ GET CART COUNT - Error', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        code: error.response?.data?.code
      }, 'error');
      
      return {
        success: false,
        count: 0,
        message: error.response?.data?.message || 'Failed to get cart count',
        requiresAuth: error.response?.status === 401
      };
    }
  }
};

// Make debug function available globally in development
if (process.env.NODE_ENV === 'development') {
  window.debugCartAuth = debugAuthenticationState;
  window.cartService = cartService;
  
  debugLog('🔧 DEBUG MODE - Cart service debugging enabled', {
    availableFunctions: [
      'window.debugCartAuth() - Check authentication status',
      'window.cartService.debugAuth() - Same as above',
      'cartService methods available globally'
    ]
  }, 'info');
}

export default cartService;
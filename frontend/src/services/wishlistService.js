import api from './api';

// Enhanced debugging
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[WishlistService] ${message}`,
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

// Check authentication before wishlist operations
const checkAuthentication = () => {
  const userToken = localStorage.getItem('userToken');
  const userData = localStorage.getItem('userData');
  
  if (!userToken || !isValidJWTStructure(userToken) || !userData) {
    return {
      isAuthenticated: false,
      error: 'Please login to manage your wishlist'
    };
  }
  
  try {
    const parsedUserData = JSON.parse(userData);
    return {
      isAuthenticated: true,
      user: parsedUserData
    };
  } catch (error) {
    // Clean up corrupted data
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    return {
      isAuthenticated: false,
      error: 'Session data corrupted. Please login again.'
    };
  }
};

// Get user's wishlist
export const getWishlist = async () => {
  try {
    debugLog('❤️ Fetching user wishlist', null, 'info');
    
    // Check authentication first
    const authCheck = checkAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('🚫 Wishlist fetch - Auth failed', authCheck, 'warning');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true,
        data: []
      };
    }

    const response = await api.get('/users/wishlist');
    
    debugLog('✅ Wishlist fetched successfully', {
      count: response.data.count,
      success: response.data.success
    }, 'success');

    return {
      success: true,
      data: response.data.data,
      count: response.data.count
    };
  } catch (error) {
    debugLog('❌ Wishlist fetch failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code
    }, 'error');
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('🔑 Token error in wishlist fetch, clearing auth data', {
          code: error.response.data.code
        }, 'warning');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Please login to view your wishlist',
        requiresAuth: true,
        data: []
      };
    }
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch wishlist',
      data: []
    };
  }
};

// Add product to wishlist
export const addToWishlist = async (productId) => {
  try {
    debugLog('➕ Adding product to wishlist', { productId }, 'info');
    
    // Check authentication first
    const authCheck = checkAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('🚫 Add to wishlist - Auth failed', authCheck, 'warning');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true
      };
    }

    const response = await api.post('/users/wishlist', { productId });
    
    debugLog('✅ Product added to wishlist', {
      productId,
      message: response.data.message
    }, 'success');

    return {
      success: true,
      message: response.data.message || 'Added to wishlist'
    };
  } catch (error) {
    debugLog('❌ Add to wishlist failed', {
      productId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code
    }, 'error');
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('🔑 Token error in add to wishlist, clearing auth data', {
          code: error.response.data.code
        }, 'warning');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Please login to add items to wishlist',
        requiresAuth: true
      };
    }
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to add to wishlist'
    };
  }
};

// Remove product from wishlist
export const removeFromWishlist = async (productId) => {
  try {
    debugLog('🗑️ Removing product from wishlist', { productId }, 'info');
    
    // Check authentication first
    const authCheck = checkAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('🚫 Remove from wishlist - Auth failed', authCheck, 'warning');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true
      };
    }

    const response = await api.delete(`/users/wishlist/${productId}`);
    
    debugLog('✅ Product removed from wishlist', {
      productId,
      message: response.data.message
    }, 'success');

    return {
      success: true,
      message: response.data.message || 'Removed from wishlist'
    };
  } catch (error) {
    debugLog('❌ Remove from wishlist failed', {
      productId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code
    }, 'error');
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('🔑 Token error in remove from wishlist, clearing auth data', {
          code: error.response.data.code
        }, 'warning');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Please login to remove items from wishlist',
        requiresAuth: true
      };
    }
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to remove from wishlist'
    };
  }
};

// Check if product is in wishlist
export const checkWishlist = async (productId) => {
  try {
    debugLog('🔍 Checking if product is in wishlist', { productId }, 'info');
    
    // Check authentication first
    const authCheck = checkAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('🚫 Check wishlist - Auth failed', authCheck, 'warning');
      // For wishlist check, return graceful fallback without requiring auth
      return {
        success: true,
        data: { isInWishlist: false },
        requiresAuth: true
      };
    }

    const response = await api.get(`/users/wishlist/check/${productId}`);
    
    debugLog('✅ Wishlist check completed', {
      productId,
      isInWishlist: response.data.data.isInWishlist
    }, 'success');

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    debugLog('❌ Wishlist check failed', {
      productId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code
    }, 'error');
    
    // Handle authentication errors gracefully for wishlist check
    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('🔑 Token error in wishlist check, clearing auth data', {
          code: error.response.data.code
        }, 'warning');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    }
    
    // For wishlist check, always return a graceful fallback
    // Don't treat authentication errors as critical failures
    return {
      success: true,
      data: { isInWishlist: false },
      message: error.response?.data?.message || 'Unable to check wishlist status',
      requiresAuth: error.response?.status === 401
    };
  }
};
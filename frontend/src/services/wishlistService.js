import api from './api'; // Use the main api instance for consistency

// Get user's wishlist
export const getWishlist = async () => {
  try {
    const response = await api.get('/users/wishlist');
    return {
      success: true,
      data: response.data.data,
      count: response.data.count
    };
  } catch (error) {
    console.error('Get wishlist error:', error);
    
    // Don't redirect for wishlist errors - just return failure
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch wishlist',
      requiresAuth: error.response?.status === 401
    };
  }
};

// Add product to wishlist
export const addToWishlist = async (productId) => {
  try {
    const response = await api.post('/users/wishlist', { productId });
    return {
      success: true,
      message: response.data.message || 'Added to wishlist'
    };
  } catch (error) {
    console.error('Add to wishlist error:', error);
    
    // Check if it's an authentication error
    if (error.response?.status === 401) {
      return {
        success: false,
        message: 'Please login to add items to wishlist',
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
    const response = await api.delete(`/users/wishlist/${productId}`);
    return {
      success: true,
      message: response.data.message || 'Removed from wishlist'
    };
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    
    // Check if it's an authentication error
    if (error.response?.status === 401) {
      return {
        success: false,
        message: 'Please login to remove items from wishlist',
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
    const response = await api.get(`/users/wishlist/check/${productId}`);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Check wishlist error:', error);
    
    // For wishlist check, always return a graceful fallback
    // Don't treat authentication errors as critical failures
    return {
      success: false,
      data: { isInWishlist: false },
      message: error.response?.data?.message || 'Failed to check wishlist',
      requiresAuth: error.response?.status === 401
    };
  }
};
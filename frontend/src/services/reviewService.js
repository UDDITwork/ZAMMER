import api from './api';

// 🎯 Enhanced logging
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[ReviewService] ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// 🎯 Create a review (with purchase verification)
export const createReview = async (productId, rating, review) => {
  try {
    debugLog('🆕 Creating review...', { productId, rating });
    
    const response = await api.post('/reviews', {
      product: productId,
      rating,
      review
    });
    
    debugLog('✅ Review created successfully', response.data, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Create review error', error.response?.data, 'error');
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// 🎯 Get all reviews for a product
export const getProductReviews = async (productId, page = 1, limit = 10) => {
  try {
    debugLog('📋 Fetching product reviews...', { productId, page, limit });
    
    const response = await api.get(`/reviews/product/${productId}?page=${page}&limit=${limit}`);
    
    debugLog('✅ Reviews fetched successfully', {
      count: response.data.count,
      totalPages: response.data.totalPages
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ Get product reviews error', error.response?.data, 'error');
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// 🎯 Get user's reviews
export const getUserReviews = async (page = 1, limit = 10) => {
  try {
    debugLog('👤 Fetching user reviews...', { page, limit });
    
    const response = await api.get(`/reviews/user?page=${page}&limit=${limit}`);
    
    debugLog('✅ User reviews fetched successfully', {
      count: response.data.count
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ Get user reviews error', error.response?.data, 'error');
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// 🎯 Update a review
export const updateReview = async (reviewId, rating, review) => {
  try {
    debugLog('✏️ Updating review...', { reviewId, rating });
    
    const response = await api.put(`/reviews/${reviewId}`, {
      rating,
      review
    });
    
    debugLog('✅ Review updated successfully', response.data, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Update review error', error.response?.data, 'error');
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// 🎯 Delete a review
export const deleteReview = async (reviewId) => {
  try {
    debugLog('🗑️ Deleting review...', { reviewId });
    
    const response = await api.delete(`/reviews/${reviewId}`);
    
    debugLog('✅ Review deleted successfully', null, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Delete review error', error.response?.data, 'error');
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// 🎯 Check if user can review a product (purchased or not)
export const checkCanReview = async (productId) => {
  try {
    debugLog('🔍 Checking review eligibility...', { productId });
    
    const response = await api.get(`/reviews/can-review/${productId}`);
    
    debugLog('✅ Review eligibility checked', response.data, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Check review eligibility error', error.response?.data, 'error');
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export default {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  checkCanReview
};
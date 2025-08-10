// File: /frontend/src/services/shopService.js

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
    console.log('🏪 [ShopService] Fetching products for shop:', shopId);
    
    if (!shopId) {
      throw new Error('Shop ID is required');
    }
    
    // 🎯 CRITICAL: Use the correct API endpoint that filters by seller
    const response = await api.get(`/products/shop/${shopId}`);
    
    console.log('🏪 [ShopService] Shop products response:', {
      success: response.data?.success,
      count: response.data?.count,
      total: response.data?.total,
      shopId: shopId
    });
    
    if (response.data) {
      return response.data;
    } else {
      throw new Error('No data received from server');
    }
  } catch (error) {
    console.error('❌ [ShopService] Error fetching shop products:', {
      shopId,
      error: error.message,
      responseData: error.response?.data
    });
    throw error.response?.data || { success: false, message: 'Network error while fetching shop products' };
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
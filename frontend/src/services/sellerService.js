/**
 * FILE LOCATION: frontend/src/services/sellerService.js
 * 
 * SELLER SERVICE OVERVIEW:
 * This service handles all seller-related operations including authentication,
 * profile management, shop management, and image uploads.
 * 
 * KEY FUNCTIONS:
 * - registerSeller: Creates new seller accounts
 * - loginSeller: Authenticates sellers and returns tokens
 * - getSellerProfile: Retrieves seller profile information
 * - updateSellerProfile: Updates seller profile and shop details
 * - uploadShopImages: Uploads shop images to Cloudinary
 * - uploadShopImageToCloudinary: Direct file upload to Cloudinary
 * - requestPasswordReset: Initiates password reset process
 * - checkEmailExists: Validates email availability
 * - resetPasswordDirect: Direct password reset without tokens
 * - verifyResetToken: Validates reset tokens
 * - resetPassword: Completes password reset process
 * - deleteImage: Removes images from Cloudinary storage
 * 
 * SHOP MANAGEMENT:
 * - Supports shop profile creation and updates
 * - Handles shop image uploads and management
 * - Manages shop location and contact information
 * - Supports shop branding and customization
 * 
 * INTEGRATION:
 * - Uses centralized API configuration from api.js
 * - Integrates with Cloudinary for image storage
 * - Implements comprehensive error handling
 * - Supports file upload with progress tracking
 * - Provides fallback responses for network errors
 */

import api from './api';

// Register a seller
export const registerSeller = async (sellerData) => {
  try {
    const response = await api.post('/sellers/register', sellerData);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Login a seller
export const loginSeller = async (credentials) => {
  try {
    const response = await api.post('/sellers/login', credentials);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Get seller profile
export const getSellerProfile = async () => {
  try {
    const response = await api.get('/sellers/profile');
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Update seller profile
export const updateSellerProfile = async (profileData) => {
  try {
    console.log('🔄 Sending profile update request:', {
      hasShopData: !!profileData.shop,
      hasImages: !!profileData.shop?.images,
      imagesCount: profileData.shop?.images?.length || 0,
      hasMainImage: !!profileData.shop?.mainImage
    });

    const response = await api.put('/sellers/profile', profileData);
    
    console.log('✅ Profile update response:', {
      success: response.data.success,
      hasShopData: !!response.data.data?.shop,
      hasImages: !!response.data.data?.shop?.images,
      imagesCount: response.data.data?.shop?.images?.length || 0,
      hasMainImage: !!response.data.data?.shop?.mainImage
    });

    return response.data;
  } catch (error) {
    console.error('❌ Profile update error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Upload shop images
export const uploadShopImages = async (images) => {
  try {
    console.log('📸 Uploading shop images:', {
      imagesCount: images.length,
      firstImagePreview: images[0]?.substring(0, 50) + '...' || 'none'
    });

    const response = await api.post('/sellers/upload-shop-images', { images });
    
    console.log('✅ Shop images upload response:', {
      success: response.data.success,
      imagesCount: response.data.data?.images?.length || 0,
      hasMainImage: !!response.data.data?.mainImage
    });

    return response.data;
  } catch (error) {
    console.error('❌ Shop images upload error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// Request password reset
export const requestPasswordReset = async (data) => {
  try {
    const response = await api.post('/sellers/forgot-password', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Check if email exists
export const checkEmailExists = async (email) => {
  try {
    const response = await api.post('/sellers/check-email', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Direct password reset (no token required)
export const resetPasswordDirect = async (data) => {
  try {
    const response = await api.post('/sellers/reset-password-direct', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Verify reset token
export const verifyResetToken = async (token) => {
  try {
    const response = await api.get(`/api/sellers/reset-password/${token}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Reset password
export const resetPassword = async (data) => {
  try {
    const response = await api.post(`/api/sellers/reset-password`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Delete image from Cloudinary
export const deleteImage = async (publicId) => {
  try {
    console.log('🗑️ Deleting image:', publicId);
    
    const response = await api.delete(`/upload/${publicId}`);
    
    console.log('✅ Image deletion response:', {
      success: response.data.success,
      message: response.data.message
    });

    return response.data;
  } catch (error) {
    console.error('❌ Image deletion error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Real Cloudinary upload for shop images (file upload)
export const uploadShopImageToCloudinary = async (file) => {
  try {
    console.log('📸 Uploading shop image to Cloudinary via backend...');
    
    const formData = new FormData();
    formData.append('images', file);
    
    const response = await api.post('/sellers/upload-shop-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('✅ Shop image Cloudinary upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Shop image Cloudinary upload failed:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Get seller payment tracking data
export const getPaymentTracking = async (filters = {}) => {
  try {
    console.log('💰 Fetching payment tracking data with filters:', filters);
    
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    
    const response = await api.get(`/sellers/payment-tracking?${queryParams.toString()}`);
    
    console.log('✅ Payment tracking data fetched:', {
      ordersCount: response.data.data.orders.length,
      totalEarnings: response.data.data.statistics.totalEarnings,
      totalOrders: response.data.data.statistics.totalOrders
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Payment tracking fetch error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Get seller earnings summary
export const getEarningsSummary = async (period = '30') => {
  try {
    console.log('💰 Fetching earnings summary for period:', period);
    
    const response = await api.get(`/sellers/earnings-summary?period=${period}`);
    
    console.log('✅ Earnings summary fetched:', {
      periodEarnings: response.data.data.periodEarnings.total,
      todayEarnings: response.data.data.todayEarnings.total,
      thisMonthEarnings: response.data.data.thisMonthEarnings.total
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Earnings summary fetch error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};
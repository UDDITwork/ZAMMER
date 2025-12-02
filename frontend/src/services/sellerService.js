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

// 🔧 NEW: Send OTP for seller signup
export const sendSignupOTP = async (firstName, email, mobileNumber) => {
  const logPrefix = '🔵 [SELLER-SIGNUP-OTP-SEND]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Sending seller signup OTP`);
  console.log(`${logPrefix} Input Data:`, {
    firstName: firstName?.substring(0, 10) + '...',
    email,
    mobileNumber: `${mobileNumber?.substring(0, 6)}****${mobileNumber?.slice(-2)}`,
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    const requestPayload = {
      firstName,
      email,
      mobileNumber
    };
    
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: '/sellers/send-signup-otp',
      method: 'POST',
      payload: { ...requestPayload, mobileNumber: `${mobileNumber?.substring(0, 6)}****` }
    });
    
    const response = await api.post('/sellers/send-signup-otp', requestPayload);
    const duration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: OTP sent`, {
      success: response.data?.success,
      message: response.data?.message,
      maskedPhone: response.data?.data?.phoneNumber,
      duration: `${duration}ms`,
      responseStatus: response.status
    });
    console.log(`${logPrefix} ========================================`);
    
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorData = error.response?.data || { message: error.message };
    
    console.error(`${logPrefix} ❌ ERROR: Failed to send OTP`, {
      error: errorData.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      duration: `${duration}ms`,
      fullError: error.response?.data || error.message
    });
    console.error(`${logPrefix} ========================================`);
    
    throw error.response?.data || error;
  }
};

// 🔧 NEW: Verify signup OTP and register seller
export const verifySignupOTPAndRegister = async (firstName, email, password, mobileNumber, otp, shop, bankDetails) => {
  const logPrefix = '🟢 [SELLER-SIGNUP-OTP-VERIFY]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Verifying OTP and registering seller`);
  console.log(`${logPrefix} Input Data:`, {
    firstName: firstName?.substring(0, 10) + '...',
    email,
    mobileNumber: `${mobileNumber?.substring(0, 6)}****${mobileNumber?.slice(-2)}`,
    otp: otp?.substring(0, 2) + '****',
    hasShop: !!shop,
    hasBankDetails: !!bankDetails,
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    const requestPayload = {
      firstName,
      email,
      password: '***HIDDEN***',
      mobileNumber,
      otp,
      shop: shop || {},
      bankDetails: bankDetails || {}
    };
    
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: '/sellers/verify-signup-otp',
      method: 'POST',
      payload: { ...requestPayload, password: '***HIDDEN***', otp: otp?.substring(0, 2) + '****' }
    });
    
    const response = await api.post('/sellers/verify-signup-otp', {
      firstName,
      email,
      password,
      mobileNumber,
      otp,
      shop,
      bankDetails
    });
    const duration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: OTP verified and seller registered`, {
      success: response.data?.success,
      message: response.data?.message,
      sellerId: response.data?.data?._id,
      sellerEmail: response.data?.data?.email,
      hasToken: !!response.data?.data?.token,
      duration: `${duration}ms`,
      responseStatus: response.status
    });
    console.log(`${logPrefix} 📋 Seller Data:`, {
      firstName: response.data?.data?.firstName,
      email: response.data?.data?.email,
      mobileNumber: response.data?.data?.mobileNumber ? `${response.data.data.mobileNumber.substring(0, 6)}****` : 'N/A'
    });
    console.log(`${logPrefix} ========================================`);
    
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorData = error.response?.data || { message: error.message };
    
    console.error(`${logPrefix} ❌ ERROR: Failed to verify OTP/register`, {
      error: errorData.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      duration: `${duration}ms`,
      validationErrors: errorData.errors,
      fullError: error.response?.data || error.message
    });
    console.error(`${logPrefix} ========================================`);
    
    throw error.response?.data || error;
  }
};

// Register a seller (DEPRECATED - Use OTP flow instead)
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

// 🔧 NEW: Request password reset with OTP (uses LOGIN_TEMPLATE_ID)
export const requestPasswordReset = async (email, phoneNumber) => {
  const logPrefix = '🟠 [SELLER-FORGOT-PASSWORD-OTP-SEND]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Requesting seller password reset OTP`);
  console.log(`${logPrefix} Input Data:`, {
    email: email || 'NOT_PROVIDED',
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****${phoneNumber.slice(-2)}` : 'NOT_PROVIDED',
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    const payload = {};
    if (email) payload.email = email;
    if (phoneNumber) payload.phoneNumber = phoneNumber;
    
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: '/sellers/forgot-password',
      method: 'POST',
      payload: { ...payload, phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : undefined }
    });
    
    const response = await api.post('/sellers/forgot-password', payload);
    const duration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: OTP sent`, {
      success: response.data?.success,
      message: response.data?.message,
      maskedPhone: response.data?.data?.phoneNumber,
      duration: `${duration}ms`,
      responseStatus: response.status
    });
    console.log(`${logPrefix} ========================================`);
    
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorData = error.response?.data || { message: error.message };
    
    console.error(`${logPrefix} ❌ ERROR: Failed to send OTP`, {
      error: errorData.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      duration: `${duration}ms`,
      fullError: error.response?.data || error.message
    });
    console.error(`${logPrefix} ========================================`);
    
    throw error.response?.data || error;
  }
};

// 🔧 NEW: Verify OTP for password reset
export const verifyForgotPasswordOTP = async (email, phoneNumber, otp) => {
  const logPrefix = '🟡 [SELLER-FORGOT-PASSWORD-OTP-VERIFY]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Verifying seller password reset OTP`);
  console.log(`${logPrefix} Input Data:`, {
    email: email || 'NOT_PROVIDED',
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****${phoneNumber.slice(-2)}` : 'NOT_PROVIDED',
    otp: otp?.substring(0, 2) + '****',
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    const payload = { otp };
    if (email) payload.email = email;
    if (phoneNumber) payload.phoneNumber = phoneNumber;
    
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: '/sellers/verify-forgot-password-otp',
      method: 'POST',
      payload: { ...payload, otp: otp?.substring(0, 2) + '****' }
    });
    
    const response = await api.post('/sellers/verify-forgot-password-otp', payload);
    const duration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: OTP verified, reset token generated`, {
      success: response.data?.success,
      message: response.data?.message,
      hasResetToken: !!response.data?.data?.resetToken,
      tokenLength: response.data?.data?.resetToken?.length,
      expiresAt: response.data?.data?.expiresAt,
      duration: `${duration}ms`,
      responseStatus: response.status
    });
    console.log(`${logPrefix} ========================================`);
    
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorData = error.response?.data || { message: error.message };
    
    console.error(`${logPrefix} ❌ ERROR: Failed to verify OTP`, {
      error: errorData.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      duration: `${duration}ms`,
      fullError: error.response?.data || error.message
    });
    console.error(`${logPrefix} ========================================`);
    
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

// 🔧 NEW: Reset password using token from OTP verification
export const resetPassword = async (resetToken, newPassword) => {
  const logPrefix = '🔄 [SELLER-RESET-PASSWORD]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Resetting seller password`);
  console.log(`${logPrefix} Input Data:`, {
    tokenLength: resetToken?.length || 0,
    passwordLength: newPassword?.length || 0,
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: `/sellers/reset-password/${resetToken}`,
      method: 'PUT',
      payload: { password: '***HIDDEN***' }
    });
    
    const response = await api.put(`/sellers/reset-password/${resetToken}`, {
      password: newPassword
    });
    const duration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: Password reset completed`, {
      success: response.data?.success,
      message: response.data?.message,
      duration: `${duration}ms`,
      responseStatus: response.status
    });
    console.log(`${logPrefix} ========================================`);
    
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorData = error.response?.data || { message: error.message };
    
    console.error(`${logPrefix} ❌ ERROR: Failed to reset password`, {
      error: errorData.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      duration: `${duration}ms`,
      fullError: error.response?.data || error.message
    });
    console.error(`${logPrefix} ========================================`);
    
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

// 🎯 NEW: Payout Management Functions

// Create beneficiary for seller
export const createBeneficiary = async (bankDetails) => {
  try {
    console.log('🏦 Creating beneficiary with bank details:', {
      hasAccountNumber: !!bankDetails.accountNumber,
      hasIfscCode: !!bankDetails.ifscCode,
      hasAccountHolderName: !!bankDetails.accountHolderName,
      hasBankName: !!bankDetails.bankName
    });
    
    const response = await api.post('/api/payouts/beneficiary', bankDetails);
    
    console.log('✅ Beneficiary created successfully:', {
      beneficiaryId: response.data.data?.beneficiaryId,
      status: response.data.data?.status
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Beneficiary creation error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// Get seller's beneficiary details
export const getBeneficiary = async () => {
  try {
    console.log('🔍 Fetching beneficiary details...');
    
    const response = await api.get('/api/payouts/beneficiary');
    
    console.log('✅ Beneficiary details fetched:', {
      beneficiaryId: response.data.data?.beneficiaryId,
      status: response.data.data?.status,
      hasBankDetails: !!response.data.data?.bankDetails
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Beneficiary fetch error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// Update beneficiary details
export const updateBeneficiary = async (bankDetails) => {
  try {
    console.log('🔄 Updating beneficiary with bank details:', {
      hasAccountNumber: !!bankDetails.accountNumber,
      hasIfscCode: !!bankDetails.ifscCode,
      hasAccountHolderName: !!bankDetails.accountHolderName,
      hasBankName: !!bankDetails.bankName
    });
    
    const response = await api.put('/api/payouts/beneficiary', bankDetails);
    
    console.log('✅ Beneficiary updated successfully:', {
      beneficiaryId: response.data.data?.beneficiaryId,
      status: response.data.data?.status
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Beneficiary update error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// Get seller's payout history
export const getPayoutHistory = async (queryParams = {}) => {
  try {
    console.log('📊 Fetching payout history with params:', queryParams);
    
    const response = await api.get('/api/payouts/history', { params: queryParams });
    
    console.log('✅ Payout history fetched:', {
      payoutsCount: response.data.data?.payouts?.length || 0,
      totalPayouts: response.data.data?.summary?.totalPayouts,
      pagination: response.data.data?.pagination
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Payout history fetch error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// Get seller's payout statistics
export const getPayoutStats = async () => {
  try {
    console.log('📈 Fetching payout statistics...');
    
    const response = await api.get('/api/payouts/stats');
    
    console.log('✅ Payout statistics fetched:', {
      hasSummary: !!response.data.data?.summary,
      hasStatusBreakdown: !!response.data.data?.statusBreakdown,
      hasPendingPayouts: !!response.data.data?.pendingPayouts
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Payout statistics fetch error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

// Default export for backward compatibility
const sellerService = {
  registerSeller,
  loginSeller,
  getSellerProfile,
  updateSellerProfile,
  uploadShopImages,
  uploadShopImageToCloudinary,
  sendSignupOTP,
  verifySignupOTPAndRegister,
  requestPasswordReset,
  verifyForgotPasswordOTP,
  checkEmailExists,
  resetPasswordDirect,
  verifyResetToken,
  resetPassword,
  deleteImage,
  getPaymentTracking,
  getEarningsSummary,
  createBeneficiary,
  getBeneficiary,
  updateBeneficiary,
  getPayoutHistory,
  getPayoutStats
};

export default sellerService;
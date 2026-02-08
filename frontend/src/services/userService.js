/**
 * FILE LOCATION: frontend/src/services/userService.js
 * 
 Integrates with shop discovery and product management systems
 */

// File: /frontend/src/services/userService.js - COMPLETE with getNearbyShops function

import api from './api';

// Enhanced logging for debugging
const logUserService = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '👤',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [USER-SERVICE] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

// Register user
export const registerUser = async (userData) => {
  try {
    logUserService('REGISTER_USER_START', {
      name: userData.name,
      email: userData.email,
      hasLocation: !!userData.location
    });

    const response = await api.post('/users/register', userData);
    
    logUserService('REGISTER_USER_SUCCESS', {
      userId: response.data.data._id,
      email: response.data.data.email
    }, 'success');

    return response.data;
  } catch (error) {
    logUserService('REGISTER_USER_ERROR', {
      error: error.response?.data || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    logUserService('LOGIN_USER_START', { 
      email: credentials.email,
      apiUrl: process.env.REACT_APP_API_URL || 'not set'
    });

    const response = await api.post('/users/login', credentials);
    
    logUserService('LOGIN_USER_SUCCESS', {
      userId: response.data.data._id,
      email: response.data.data.email,
      hasLocation: !!response.data.data.location
    }, 'success');

    return response.data;
  } catch (error) {
    // Enhanced error handling for network/CORS errors
    let errorMessage = 'Login failed. Please try again.';
    let errorData = null;

    if (error.response) {
      // Server responded with error status
      errorData = error.response.data;
      errorMessage = errorData?.message || `Server error: ${error.response.status}`;
      
      logUserService('LOGIN_USER_ERROR', {
        status: error.response.status,
        error: errorData,
        message: errorMessage
      }, 'error');
    } else if (error.request) {
      // Request was made but no response received (network error, CORS, etc.)
      errorMessage = 'Network error: Unable to connect to server. Please check your internet connection and try again.';
      
      logUserService('LOGIN_USER_NETWORK_ERROR', {
        error: error.message,
        code: error.code,
        requestUrl: error.config?.url,
        baseURL: error.config?.baseURL,
        message: 'No response from server - possible CORS or network issue'
      }, 'error');
    } else {
      // Error setting up the request
      errorMessage = error.message || 'An unexpected error occurred during login';
      
      logUserService('LOGIN_USER_SETUP_ERROR', {
        error: error.message,
        stack: error.stack
      }, 'error');
    }

    // Create a proper error object with message
    const loginError = errorData || { 
      success: false, 
      message: errorMessage 
    };
    
    throw loginError;
  }
};

// Get user profile
export const getUserProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  try {
    logUserService('UPDATE_PROFILE_START', {
      hasLocation: !!profileData.location,
      updateFields: Object.keys(profileData)
    });

    const response = await api.put('/users/profile', profileData);
    
    logUserService('UPDATE_PROFILE_SUCCESS', {
      userId: response.data.data._id,
      hasLocation: !!response.data.data.location
    }, 'success');

    return response.data;
  } catch (error) {
    logUserService('UPDATE_PROFILE_ERROR', {
      error: error.response?.data || error.message
    }, 'error');
    throw error.response?.data || error;
  }
};

// 🎯 CRITICAL FIX: Add the missing getNearbyShops function
export const getNearbyShops = async (params = {}) => {
  try {
    // Extract parameters with defaults
    const {
      lat,
      lng,
      maxDistance = 50000000, // 50,000 km in meters (covers entire globe)
      limit = 50
    } = params;

    logUserService('GET_NEARBY_SHOPS_START', {
      lat,
      lng,
      maxDistance: `${maxDistance} meters (${maxDistance/1000} km)`,
      limit,
      hasCoordinates: !!(lat && lng)
    });

    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (lat) queryParams.append('lat', lat);
    if (lng) queryParams.append('lng', lng);
    queryParams.append('maxDistance', maxDistance);
    queryParams.append('limit', limit);

    // Make API call with query parameters
    const response = await api.get(`/users/nearby-shops?${queryParams.toString()}`);
    
    logUserService('GET_NEARBY_SHOPS_SUCCESS', {
      shopsFound: response.data.count || response.data.data?.length || 0,
      hasUserLocation: !!response.data.userLocation,
      searchRadius: response.data.searchRadius,
      processingTime: response.data.processingTime
    }, 'success');

    // Log first few shops for debugging
    if (response.data.data && response.data.data.length > 0) {
      logUserService('NEARBY_SHOPS_SAMPLE', {
        firstShop: {
          name: response.data.data[0].shop?.name,
          distance: response.data.data[0].distanceText,
          coordinates: response.data.data[0].shop?.location?.coordinates
        },
        totalShops: response.data.data.length
      });
    }

    return response.data;
  } catch (error) {
    logUserService('GET_NEARBY_SHOPS_ERROR', {
      error: error.response?.data || error.message,
      status: error.response?.status
    }, 'error');
    throw error.response?.data || error;
  }
};

// 🎯 NEW: Get nearby shops with current location
export const getNearbyShopsWithLocation = async () => {
  try {
    logUserService('GET_NEARBY_SHOPS_WITH_LOCATION_START');

    // Try to get current location
    const getCurrentLocation = () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (error) => {
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
          }
        );
      });
    };

    try {
      const location = await getCurrentLocation();
      
      logUserService('LOCATION_DETECTED', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: `${location.accuracy}m`
      }, 'success');

      // Call getNearbyShops with detected location
      return await getNearbyShops({
        lat: location.latitude,
        lng: location.longitude
      });

    } catch (locationError) {
      logUserService('LOCATION_DETECTION_FAILED', {
        error: locationError.message
      }, 'warning');

      // Fallback: get shops without location
      return await getNearbyShops();
    }

  } catch (error) {
    logUserService('GET_NEARBY_SHOPS_WITH_LOCATION_ERROR', {
      error: error.message
    }, 'error');
    throw error;
  }
};

// Wishlist functions
export const getWishlist = async () => {
  try {
    const response = await api.get('/users/wishlist');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const addToWishlist = async (productId) => {
  try {
    const response = await api.post('/users/wishlist', { productId });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const removeFromWishlist = async (productId) => {
  try {
    const response = await api.delete(`/users/wishlist/${productId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const checkWishlist = async (productId) => {
  try {
    const response = await api.get(`/users/wishlist/check/${productId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Signup OTP functions
export const sendSignupOTP = async (name, email, mobileNumber) => {
  const logPrefix = '🔵 [SIGNUP-OTP-SEND]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Sending signup OTP`);
  console.log(`${logPrefix} Input Data:`, {
    name: name?.substring(0, 10) + '...',
    email,
    mobileNumber: `${mobileNumber?.substring(0, 6)}****${mobileNumber?.slice(-2)}`,
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    const requestPayload = {
      name,
      email,
      mobileNumber
    };
    
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: '/users/send-signup-otp',
      method: 'POST',
      payload: { ...requestPayload, mobileNumber: `${mobileNumber?.substring(0, 6)}****` }
    });
    
    const response = await api.post('/users/send-signup-otp', requestPayload);
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

export const resendSignupOTP = async (mobileNumber) => {
  const logPrefix = '🔄 [SIGNUP-OTP-RESEND]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Resending signup OTP`);
  console.log(`${logPrefix} Input Data:`, {
    mobileNumber: `${mobileNumber?.substring(0, 6)}****${mobileNumber?.slice(-2)}`,
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    const requestPayload = {
      mobileNumber
    };
    
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: '/users/resend-signup-otp',
      method: 'POST',
      payload: { ...requestPayload, mobileNumber: `${mobileNumber?.substring(0, 6)}****` }
    });
    
    const response = await api.post('/users/resend-signup-otp', requestPayload);
    const duration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: OTP resent`, {
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
    
    console.error(`${logPrefix} ❌ ERROR: Failed to resend OTP`, {
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

export const verifySignupOTPAndRegister = async (name, email, password, mobileNumber, otp, location = null, gender = '') => {
  const logPrefix = '🟢 [SIGNUP-OTP-VERIFY]';
  const startTime = Date.now();

  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Verifying OTP and registering user`);
  console.log(`${logPrefix} Input Data:`, {
    name: name?.substring(0, 10) + '...',
    email,
    mobileNumber: `${mobileNumber?.substring(0, 6)}****${mobileNumber?.slice(-2)}`,
    otp: otp?.substring(0, 2) + '****',
    hasLocation: !!location,
    gender: gender || 'Not specified',
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    const requestPayload = {
      name,
      email,
      password: '***HIDDEN***',
      mobileNumber,
      otp
    };
    if (location) requestPayload.location = location;
    
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: '/users/verify-signup-otp',
      method: 'POST',
      payload: { ...requestPayload, password: '***HIDDEN***', otp: otp?.substring(0, 2) + '****' }
    });
    
    const response = await api.post('/users/verify-signup-otp', {
      name,
      email,
      password,
      mobileNumber,
      otp,
      location,
      gender
    });
    const duration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: OTP verified and user registered`, {
      success: response.data?.success,
      message: response.data?.message,
      userId: response.data?.data?._id,
      userEmail: response.data?.data?.email,
      hasToken: !!response.data?.data?.token,
      duration: `${duration}ms`,
      responseStatus: response.status
    });
    console.log(`${logPrefix} 📋 User Data:`, {
      name: response.data?.data?.name,
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

// Password reset functions with OTP
export const requestPasswordReset = async (email, phoneNumber) => {
  const logPrefix = '🟡 [FORGOT-PASSWORD-OTP-SEND]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Requesting password reset OTP`);
  console.log(`${logPrefix} Input Data:`, {
    email: email || 'NOT_PROVIDED',
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****${phoneNumber.slice(-2)}` : 'NOT_PROVIDED',
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    const payload = email ? { email } : { phoneNumber };
    
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: '/users/forgot-password',
      method: 'POST',
      payload: email ? { email } : { phoneNumber: `${phoneNumber?.substring(0, 6)}****` }
    });
    
    const response = await api.post('/users/forgot-password', payload);
    const duration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: Password reset OTP sent`, {
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
    
    console.error(`${logPrefix} ❌ ERROR: Failed to send password reset OTP`, {
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

// Verify OTP for password reset
export const verifyForgotPasswordOTP = async (email, phoneNumber, otp) => {
  const logPrefix = '🟠 [FORGOT-PASSWORD-OTP-VERIFY]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Verifying password reset OTP`);
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
      endpoint: '/users/verify-forgot-password-otp',
      method: 'POST',
      payload: { ...payload, otp: otp?.substring(0, 2) + '****' }
    });
    
    const response = await api.post('/users/verify-forgot-password-otp', payload);
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
    
    console.error(`${logPrefix} ❌ ERROR: Failed to verify password reset OTP`, {
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

export const resetPassword = async (resetToken, newPassword) => {
  const logPrefix = '🔴 [PASSWORD-RESET]';
  const startTime = Date.now();
  
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} START: Resetting password`);
  console.log(`${logPrefix} Input Data:`, {
    resetToken: resetToken ? `${resetToken.substring(0, 10)}...${resetToken.slice(-5)}` : 'MISSING',
    newPasswordLength: newPassword?.length || 0,
    timestamp: new Date().toISOString()
  });
  console.log(`${logPrefix} ========================================`);
  
  try {
    console.log(`${logPrefix} 📤 API Request:`, {
      endpoint: `/users/reset-password/${resetToken ? resetToken.substring(0, 10) + '...' : 'TOKEN'}`,
      method: 'PUT',
      payload: { newPassword: '***HIDDEN***' }
    });
    
    const response = await api.put(`/users/reset-password/${resetToken}`, { newPassword });
    const duration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: Password reset completed`, {
      success: response.data?.success,
      message: response.data?.message,
      userId: response.data?.data?._id,
      userEmail: response.data?.data?.email,
      hasToken: !!response.data?.data?.token,
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

// 🎯 NEW: Location utilities for user service
export const updateUserLocation = async (location) => {
  try {
    logUserService('UPDATE_USER_LOCATION_START', {
      coordinates: location.coordinates,
      address: location.address
    });

    const response = await updateUserProfile({ location });
    
    logUserService('UPDATE_USER_LOCATION_SUCCESS', {
      coordinates: response.data.location?.coordinates
    }, 'success');

    return response;
  } catch (error) {
    logUserService('UPDATE_USER_LOCATION_ERROR', {
      error: error.message
    }, 'error');
    throw error;
  }
};

// Default export
export default {
  registerUser,
  sendSignupOTP,
  verifySignupOTPAndRegister,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getNearbyShops,
  getNearbyShopsWithLocation,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  requestPasswordReset,
  verifyForgotPasswordOTP,
  resetPassword,
  updateUserLocation
};
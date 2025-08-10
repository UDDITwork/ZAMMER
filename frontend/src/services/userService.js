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
    logUserService('LOGIN_USER_START', { email: credentials.email });

    const response = await api.post('/users/login', credentials);
    
    logUserService('LOGIN_USER_SUCCESS', {
      userId: response.data.data._id,
      email: response.data.data.email,
      hasLocation: !!response.data.data.location
    }, 'success');

    return response.data;
  } catch (error) {
    logUserService('LOGIN_USER_ERROR', {
      error: error.response?.data || error.message
    }, 'error');
    throw error.response?.data || error;
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

// Password reset functions
export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post('/users/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const resetPassword = async (resetData) => {
  try {
    const response = await api.post('/users/reset-password', resetData);
    return response.data;
  } catch (error) {
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
  resetPassword,
  updateUserLocation
};
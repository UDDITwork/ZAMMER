// File: /frontend/src/services/userService.js - COMPLETE with getNearbyShops

import api from './api';

// Enhanced logging for development
const logUserService = (action, data, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[USER-SERVICE] ${action}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Get current user location using browser geolocation
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    logUserService('Getting current location...', null, 'info');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        logUserService('Location obtained successfully', location, 'success');
        resolve(location);
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Unknown location error';
            break;
        }
        
        logUserService('Location error', { error: errorMessage, code: error.code }, 'error');
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

// 🎯 NEW: Get nearby shops with multiple location strategies
const getNearbyShops = async (options = {}) => {
  try {
    const {
      lat,
      lng,
      maxDistance = 50000,
      limit = 20,
      forceCurrentLocation = false
    } = options;

    logUserService('getNearbyShops called', {
      providedLat: lat,
      providedLng: lng,
      maxDistance,
      limit,
      forceCurrentLocation
    }, 'info');

    let queryParams = new URLSearchParams();
    
    // Add basic parameters
    queryParams.append('maxDistance', maxDistance);
    queryParams.append('limit', limit);

    // Strategy 1: Use provided coordinates
    if (lat && lng && !forceCurrentLocation) {
      queryParams.append('lat', lat);
      queryParams.append('lng', lng);
      logUserService('Using provided coordinates', { lat, lng }, 'info');
    } 
    // Strategy 2: Try to get current location
    else {
      try {
        logUserService('Attempting to get current location...', null, 'info');
        const currentLocation = await getCurrentLocation();
        queryParams.append('lat', currentLocation.latitude);
        queryParams.append('lng', currentLocation.longitude);
        logUserService('Using current location', currentLocation, 'success');
      } catch (locationError) {
        logUserService('Failed to get current location, proceeding without coordinates', 
          { error: locationError.message }, 'warning');
        // Continue without location - backend will return all shops
      }
    }

    const url = `/users/nearby-shops?${queryParams.toString()}`;
    logUserService('Making API call', { url }, 'info');

    const response = await api.get(url);

    if (response.data.success) {
      logUserService('getNearbyShops success', {
        shopsCount: response.data.count,
        userLocation: response.data.userLocation,
        searchRadius: response.data.searchRadius,
        processingTime: response.data.processingTime
      }, 'success');

      return {
        success: true,
        data: response.data.data,
        count: response.data.count,
        userLocation: response.data.userLocation,
        searchRadius: response.data.searchRadius,
        stats: response.data.stats,
        processingTime: response.data.processingTime
      };
    } else {
      logUserService('API returned error', response.data, 'error');
      return {
        success: false,
        message: response.data.message || 'Failed to fetch nearby shops',
        data: []
      };
    }

  } catch (error) {
    logUserService('getNearbyShops error', {
      error: error.message,
      response: error.response?.data
    }, 'error');

    // Return error response
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to fetch nearby shops',
      data: [],
      error: error.response?.data
    };
  }
};

// User registration
const registerUser = async (userData) => {
  try {
    logUserService('Registering user', { 
      name: userData.name, 
      email: userData.email,
      hasLocation: !!userData.location 
    }, 'info');

    const response = await api.post('/users/register', userData);
    
    if (response.data.success) {
      logUserService('User registered successfully', {
        userId: response.data.data._id,
        email: response.data.data.email
      }, 'success');

      // Store token in localStorage
      if (response.data.data.token) {
        localStorage.setItem('userToken', response.data.data.token);
        
        // Set default auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
      }
    }

    return response.data;
  } catch (error) {
    logUserService('Registration error', {
      error: error.message,
      response: error.response?.data
    }, 'error');

    return {
      success: false,
      message: error.response?.data?.message || 'Registration failed',
      errors: error.response?.data?.errors
    };
  }
};

// User login
const loginUser = async (credentials) => {
  try {
    logUserService('Logging in user', { email: credentials.email }, 'info');

    const response = await api.post('/users/login', credentials);
    
    if (response.data.success) {
      logUserService('User logged in successfully', {
        userId: response.data.data._id,
        email: response.data.data.email,
        hasLocation: !!response.data.data.location
      }, 'success');

      // Store token in localStorage
      if (response.data.data.token) {
        localStorage.setItem('userToken', response.data.data.token);
        
        // Set default auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
      }
    }

    return response.data;
  } catch (error) {
    logUserService('Login error', {
      error: error.message,
      response: error.response?.data
    }, 'error');

    return {
      success: false,
      message: error.response?.data?.message || 'Login failed'
    };
  }
};

// Get user profile
const getUserProfile = async () => {
  try {
    logUserService('Getting user profile', null, 'info');

    const response = await api.get('/users/profile');
    
    if (response.data.success) {
      logUserService('User profile retrieved', {
        userId: response.data.data._id,
        hasLocation: !!response.data.data.location
      }, 'success');
    }

    return response.data;
  } catch (error) {
    logUserService('Get profile error', {
      error: error.message,
      response: error.response?.data
    }, 'error');

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to get profile'
    };
  }
};

// Update user profile
const updateUserProfile = async (userData) => {
  try {
    logUserService('Updating user profile', {
      updates: Object.keys(userData),
      hasLocation: !!userData.location
    }, 'info');

    const response = await api.put('/users/profile', userData);
    
    if (response.data.success) {
      logUserService('User profile updated', {
        userId: response.data.data._id,
        hasLocation: !!response.data.data.location
      }, 'success');
    }

    return response.data;
  } catch (error) {
    logUserService('Update profile error', {
      error: error.message,
      response: error.response?.data
    }, 'error');

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update profile'
    };
  }
};

// Get user wishlist
const getWishlist = async () => {
  try {
    logUserService('Getting user wishlist', null, 'info');

    const response = await api.get('/users/wishlist');
    
    if (response.data.success) {
      logUserService('Wishlist retrieved', {
        itemCount: response.data.data.length
      }, 'success');
    }

    return response.data;
  } catch (error) {
    logUserService('Get wishlist error', {
      error: error.message,
      response: error.response?.data
    }, 'error');

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to get wishlist',
      data: []
    };
  }
};

// Add to wishlist
const addToWishlist = async (productId) => {
  try {
    logUserService('Adding to wishlist', { productId }, 'info');

    const response = await api.post('/users/wishlist', { productId });
    
    if (response.data.success) {
      logUserService('Added to wishlist successfully', { productId }, 'success');
    }

    return response.data;
  } catch (error) {
    logUserService('Add to wishlist error', {
      error: error.message,
      response: error.response?.data
    }, 'error');

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to add to wishlist'
    };
  }
};

// Remove from wishlist
const removeFromWishlist = async (productId) => {
  try {
    logUserService('Removing from wishlist', { productId }, 'info');

    const response = await api.delete(`/users/wishlist/${productId}`);
    
    if (response.data.success) {
      logUserService('Removed from wishlist successfully', { productId }, 'success');
    }

    return response.data;
  } catch (error) {
    logUserService('Remove from wishlist error', {
      error: error.message,
      response: error.response?.data
    }, 'error');

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to remove from wishlist'
    };
  }
};

// Check if product is in wishlist
const checkWishlist = async (productId) => {
  try {
    const response = await api.get(`/users/wishlist/check/${productId}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: 'Failed to check wishlist',
      data: { isInWishlist: false }
    };
  }
};

// Logout user
const logoutUser = () => {
  logUserService('Logging out user', null, 'info');
  
  // Remove token from localStorage
  localStorage.removeItem('userToken');
  
  // Remove auth header
  delete api.defaults.headers.common['Authorization'];
  
  logUserService('User logged out successfully', null, 'success');
};

// 🎯 UTILITY: Get user's saved location
const getUserLocation = async () => {
  try {
    const profile = await getUserProfile();
    if (profile.success && profile.data.location) {
      return {
        success: true,
        location: profile.data.location
      };
    }
    return {
      success: false,
      message: 'No saved location found'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to get user location'
    };
  }
};

// 🎯 UTILITY: Update user location
const updateUserLocation = async (coordinates, address) => {
  try {
    const locationData = {
      location: {
        type: 'Point',
        coordinates: coordinates,
        address: address
      }
    };
    
    return await updateUserProfile(locationData);
  } catch (error) {
    return {
      success: false,
      message: 'Failed to update location'
    };
  }
};

export {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getNearbyShops,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  logoutUser,
  getCurrentLocation,
  getUserLocation,
  updateUserLocation
};

export default {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getNearbyShops,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  logoutUser,
  getCurrentLocation,
  getUserLocation,
  updateUserLocation
};
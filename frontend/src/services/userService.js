import api from './api';
import axios from 'axios';

// Optimized logging - only log errors and important events
const isProduction = process.env.NODE_ENV === 'production';
const debugLog = (message, data = null, type = 'info') => {
  // Only log in development or for errors
  if (!isProduction || type === 'error') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[Service] ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Register a user
export const registerUser = async (userData) => {
  try {
    debugLog('📝 User registration attempt', {
      name: userData.name,
      email: userData.email,
      hasMobileNumber: !!userData.mobileNumber
    }, 'info');

    const response = await api.post('/users/register', userData);
    
    debugLog('✅ User registration successful', {
      success: response.data.success,
      userName: response.data.data?.name,
      hasToken: !!response.data.data?.token
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ User registration failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      errors: error.response?.data?.errors
    }, 'error');

    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Login a user
export const loginUser = async (credentials) => {
  try {
    debugLog('🔐 User login attempt', {
      email: credentials.email,
      passwordLength: credentials.password?.length
    }, 'info');

    const response = await api.post('/users/login', credentials);
    
    debugLog('✅ User login successful', {
      success: response.data.success,
      userName: response.data.data?.name,
      userId: response.data.data?._id,
      hasToken: !!response.data.data?.token,
      tokenLength: response.data.data?.token?.length
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ User login failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      errors: error.response?.data?.errors
    }, 'error');

    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get user profile
export const getUserProfile = async () => {
  try {
    debugLog('👤 Fetching user profile', null, 'info');

    const response = await api.get('/users/profile');
    
    debugLog('✅ User profile fetched', {
      success: response.data.success,
      userName: response.data.data?.name
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ User profile fetch failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');

    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  try {
    debugLog('✏️ Updating user profile', {
      fieldsToUpdate: Object.keys(profileData)
    }, 'info');

    const response = await api.put('/users/profile', profileData);
    
    debugLog('✅ User profile updated', {
      success: response.data.success,
      userName: response.data.data?.name
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ User profile update failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');

    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Update user location
export const updateUserLocation = async (locationData) => {
  try {
    debugLog('📍 Updating user location', {
      hasCoordinates: !!locationData.coordinates,
      hasAddress: !!locationData.address
    }, 'info');

    const response = await api.put('/users/profile', { location: locationData });
    
    debugLog('✅ User location updated', {
      success: response.data.success
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ User location update failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');

    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get nearby shops
export const getNearbyShops = async () => {
  try {
    debugLog('🏪 Fetching nearby shops', null, 'info');

    const response = await api.get('/users/nearby-shops');
    
    debugLog('✅ Nearby shops fetched', {
      success: response.data.success,
      count: response.data.count
    }, response.data.count === 0 ? 'warning' : 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ Nearby shops fetch failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');

    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Request password reset
export const requestPasswordReset = async (email) => {
  try {
    debugLog('🔄 Password reset request', { email }, 'info');

    const response = await api.post('/users/forgot-password', { email });
    
    debugLog('✅ Password reset request sent', {
      success: response.data.success
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ Password reset request failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');

    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Reset password
export const resetPassword = async (email, newPassword) => {
  try {
    debugLog('🔑 Resetting password', { email }, 'info');
    const response = await api.post('/users/reset-password', {
      email,
      newPassword
    });
    debugLog('✅ Password reset successful', { email }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Password reset failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data?.message || 'Failed to reset password';
  }
};

// Verify reset token
export const verifyResetToken = async (token) => {
  try {
    debugLog('🔍 Verifying reset token', {
      hasToken: !!token,
      tokenLength: token?.length
    }, 'info');

    const response = await api.get(`/users/reset-password/${token}`);
    
    debugLog('✅ Reset token verified', {
      success: response.data.success
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ Reset token verification failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');

    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const verifyEmail = async (email) => {
  try {
    debugLog('📧 Verifying email', { email }, 'info');
    const response = await axios.post('/api/users/verify-email', { email });
    debugLog('✅ Email verified successfully', { email }, 'success');
    return response.data;
  } catch (error) {
    debugLog('❌ Email verification failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    throw error.response?.data?.message || 'Failed to verify email';
  }
};
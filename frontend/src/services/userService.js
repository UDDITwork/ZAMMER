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
      `%c[UserService] ${message}`,
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

    const response = await api.put('/users/location', locationData);
    
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
    }, 'success');

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
export const resetPassword = async (data) => {
  try {
    debugLog('🔄 Password reset', {
      hasToken: !!data.token,
      hasPassword: !!data.password
    }, 'info');

    const response = await api.post('/users/reset-password', data);
    
    debugLog('✅ Password reset successful', {
      success: response.data.success
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ Password reset failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');

    throw error.response?.data || { success: false, message: 'Network error' };
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
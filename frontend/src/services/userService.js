import api from './api';

// Register a user
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/users/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Login a user
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/users/login', credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get user profile
export const getUserProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Update user location
export const updateUserLocation = async (locationData) => {
  try {
    const response = await api.put('/users/location', locationData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get nearby shops
export const getNearbyShops = async () => {
  try {
    const response = await api.get('/users/nearby-shops');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Request password reset
export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post('/users/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Reset password
export const resetPassword = async (data) => {
  try {
    const response = await api.post('/users/reset-password', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Verify reset token
export const verifyResetToken = async (token) => {
  try {
    const response = await api.get(`/users/reset-password/${token}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};
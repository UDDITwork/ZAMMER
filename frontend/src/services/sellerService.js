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
    const response = await api.put('/sellers/profile', profileData);
    return response.data;
  } catch (error) {
    throw error.response.data;
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
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
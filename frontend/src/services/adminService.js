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
      `%c[AdminService] ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Admin login
export const loginAdmin = async (credentials) => {
  try {
    debugLog('🔐 Admin login attempt', { email: credentials.email });
    
    const response = await api.post('/admin/login', credentials);
    
    debugLog('✅ Admin login successful', {
      success: response.data.success,
      adminName: response.data.data?.name,
      adminRole: response.data.data?.role,
      hasToken: !!response.data.data?.token
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ Admin login failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      errors: error.response?.data?.errors
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get dashboard statistics
export const getDashboardStats = async () => {
  try {
    debugLog('📊 Fetching dashboard statistics');
    
    const response = await api.get('/admin/dashboard/stats');
    
    debugLog('✅ Dashboard stats fetched successfully', {
      totalSellers: response.data.data?.overview?.totalSellers,
      totalUsers: response.data.data?.overview?.totalUsers,
      totalProducts: response.data.data?.overview?.totalProducts
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ Dashboard stats fetch failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get all sellers
export const getAllSellers = async (queryParams = {}) => {
  try {
    debugLog('👥 Fetching all sellers', { queryParams });
    
    const response = await api.get('/admin/sellers', { params: queryParams });
    
    debugLog('✅ Sellers fetched successfully', {
      count: response.data.data?.length,
      totalSellers: response.data.pagination?.totalSellers,
      currentPage: response.data.pagination?.currentPage
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ Sellers fetch failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get single seller profile
export const getSellerProfile = async (sellerId) => {
  try {
    debugLog('👤 Fetching seller profile', { sellerId });
    
    const response = await api.get(`/admin/sellers/${sellerId}`);
    
    debugLog('✅ Seller profile fetched successfully', {
      sellerId,
      sellerName: response.data.data?.seller?.firstName,
      shopName: response.data.data?.seller?.shop?.name,
      totalProducts: response.data.data?.stats?.totalProducts
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ Seller profile fetch failed', {
      sellerId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get all users
export const getAllUsers = async (queryParams = {}) => {
  try {
    debugLog('👥 Fetching all users', { queryParams });
    
    const response = await api.get('/admin/users', { params: queryParams });
    
    debugLog('✅ Users fetched successfully', {
      count: response.data.data?.length,
      totalUsers: response.data.pagination?.totalUsers,
      currentPage: response.data.pagination?.currentPage
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ Users fetch failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get single user profile
export const getUserProfile = async (userId) => {
  try {
    debugLog('👤 Fetching user profile', { userId });
    
    const response = await api.get(`/admin/users/${userId}`);
    
    debugLog('✅ User profile fetched successfully', {
      userId,
      userName: response.data.data?.user?.name,
      userEmail: response.data.data?.user?.email,
      wishlistItems: response.data.data?.stats?.wishlistItems
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ User profile fetch failed', {
      userId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Default export
const adminService = {
  loginAdmin,
  getDashboardStats,
  getAllSellers,
  getSellerProfile,
  getAllUsers,
  getUserProfile
};

export default adminService; 
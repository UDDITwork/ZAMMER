//frontend/src/services/adminService.js - Enhanced with detailed logging
import api from './api';

// Enhanced debugging with colors and timestamps
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336',
      request: '#9C27B0',
      response: '#00BCD4'
    };
    
    console.log(
      `%c[AdminService] ${timestamp} - ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Admin login with comprehensive logging
export const loginAdmin = async (credentials) => {
  try {
    debugLog('🔐 STARTING ADMIN LOGIN PROCESS', {
      email: credentials.email,
      hasPassword: !!credentials.password,
      passwordLength: credentials.password?.length || 0,
      timestamp: new Date().toISOString()
    }, 'request');

    debugLog('📡 PREPARING API REQUEST', {
      endpoint: '/admin/login',
      method: 'POST',
      baseURL: api.defaults.baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    }, 'info');
    
    const requestData = {
      email: credentials.email,
      password: credentials.password
    };

    debugLog('📤 SENDING REQUEST TO BACKEND', {
      url: `${api.defaults.baseURL}/admin/login`,
      data: {
        email: requestData.email,
        passwordProvided: !!requestData.password
      }
    }, 'request');

    const response = await api.post('/admin/login', requestData);
    
    debugLog('📥 RECEIVED RESPONSE FROM BACKEND', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      dataExists: !!response.data,
      success: response.data?.success,
      hasToken: !!response.data?.data?.token,
      adminName: response.data?.data?.name,
      adminRole: response.data?.data?.role,
      responseKeys: response.data ? Object.keys(response.data) : [],
      dataKeys: response.data?.data ? Object.keys(response.data.data) : []
    }, 'response');

    if (response.data?.success && response.data?.data) {
      debugLog('✅ ADMIN LOGIN API SUCCESS', {
        adminId: response.data.data._id,
        adminName: response.data.data.name,
        adminEmail: response.data.data.email,
        adminRole: response.data.data.role,
        hasToken: !!response.data.data.token,
        tokenLength: response.data.data.token?.length || 0,
        permissions: response.data.data.permissions
      }, 'success');
    } else {
      debugLog('⚠️ UNEXPECTED RESPONSE FORMAT', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        responseStructure: response.data ? Object.keys(response.data) : 'no data'
      }, 'warning');
    }

    return response.data;
    
  } catch (error) {
    debugLog('❌ ADMIN LOGIN API ERROR', {
      errorType: error.constructor.name,
      message: error.message,
      hasResponse: !!error.response,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      responseHeaders: error.response?.headers,
      hasRequest: !!error.request,
      requestConfig: error.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL,
        timeout: error.config.timeout
      } : null,
      networkError: !error.response && !error.request,
      stack: error.stack
    }, 'error');
    
    // Re-throw with preserved error structure
    throw error.response?.data || { 
      success: false, 
      message: error.message || 'Network error',
      originalError: error.constructor.name
    };
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
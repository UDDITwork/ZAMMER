// File: /frontend/src/services/api.js

import axios from 'axios';

// UNIVERSAL API URL - Based purely on environment variables
const getApiUrl = () => {
  // Production environment
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL_PROD || 
           process.env.REACT_APP_API_URL || 
           'http://localhost:5001/api';
  }
  
  // Development environment
  return process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
};

const API_URL = getApiUrl();

console.log('🌐 Universal API URL:', API_URL);

// Create axios instance with dynamic base URL
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true  // ✅ ENSURE THIS IS true
});

// 🔧 UNIVERSAL: Request interceptor with token handling
api.interceptors.request.use(
  (config) => {
    // Clear any invalid/conflicting tokens before each request
    const tokens = getStoredTokens();
    
    // If route is seller-specific (but not admin viewing sellers), ensure only seller token exists
    const isSellerSpecificRoute = (config.url?.startsWith('/seller/') || 
                                   (config.url?.includes('seller') && !config.url?.includes('/admin/')));
    if (isSellerSpecificRoute) {
      if (tokens.userToken || tokens.adminToken || tokens.deliveryAgentToken) {
        console.warn('🧹 Clearing conflicting tokens for seller request');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        localStorage.removeItem('deliveryAgentToken');
        localStorage.removeItem('deliveryAgentData');
      }
    }
    
    // Get tokens from localStorage (after cleanup)
    const userToken = localStorage.getItem('userToken');
    const sellerToken = localStorage.getItem('sellerToken');
    const adminToken = localStorage.getItem('adminToken');
    const deliveryAgentToken = localStorage.getItem('deliveryAgentToken');

    let usedToken = null;
    let tokenSource = null;
    
    // Route-based token selection
    const urlPath = config.url || '';
    const isAdminRoute = urlPath.includes('/admin/');
    const isSellerRoute = urlPath.includes('/seller/');
    const isDeliveryRoute = urlPath.includes('/delivery/');
    const isUserRoute = !isAdminRoute && !isSellerRoute && !isDeliveryRoute;

    // Priority-based token assignment
    if (isAdminRoute && adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      usedToken = adminToken;
      tokenSource = 'adminToken';
    } else if (isSellerRoute && sellerToken) {
      config.headers.Authorization = `Bearer ${sellerToken}`;
      usedToken = sellerToken;
      tokenSource = 'sellerToken';
    } else if (isDeliveryRoute && deliveryAgentToken) {
      config.headers.Authorization = `Bearer ${deliveryAgentToken}`;
      usedToken = deliveryAgentToken;
      tokenSource = 'deliveryAgentToken';
    } else if (isUserRoute && userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
      usedToken = userToken;
      tokenSource = 'userToken';
    } else {
      // Fallback: Use any available token in priority order
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
        usedToken = adminToken;
        tokenSource = 'adminToken (fallback)';
      } else if (sellerToken) {
        config.headers.Authorization = `Bearer ${sellerToken}`;
        usedToken = sellerToken;
        tokenSource = 'sellerToken (fallback)';
      } else if (userToken) {
        config.headers.Authorization = `Bearer ${userToken}`;
        usedToken = userToken;
        tokenSource = 'userToken (fallback)';
      } else if (deliveryAgentToken) {
        config.headers.Authorization = `Bearer ${deliveryAgentToken}`;
        usedToken = deliveryAgentToken;
        tokenSource = 'deliveryAgentToken (fallback)';
      }
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 [API-REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`🔍 [API] Route analysis:`, {
        urlPath,
        isAdminRoute,
        isSellerRoute,
        isDeliveryRoute,
        isUserRoute,
        hasAdminToken: !!adminToken,
        hasSellerToken: !!sellerToken,
        hasUserToken: !!userToken,
        hasDeliveryToken: !!deliveryAgentToken
      });
      if (usedToken) {
        console.log(`🔑 [API] Using ${tokenSource}`);
      } else {
        console.warn('⚠️ [API] No token - unauthenticated request');
        if (isAdminRoute) {
          console.error('❌ [API] Admin route detected but no admin token available!');
        }
      }
    }

    return config;
  },
  (error) => {
    console.error('🚨 [API] Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [API-RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        success: response.data?.success
      });
    }
    return response;
  },
  (error) => {
    console.error('🚨 [API-ERROR]:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message
    });
    
    // Handle 401 errors
    if (error.response?.status === 401) {
      const errorData = error.response.data;
      const isTokenError = errorData?.code && [
        'INVALID_TOKEN',
        'TOKEN_EXPIRED', 
        'MALFORMED_TOKEN',
        'NO_TOKEN',
        'INVALID_ADMIN_TOKEN',
        'NO_ADMIN_TOKEN',
        'ADMIN_NOT_FOUND'
      ].includes(errorData.code);

      if (isTokenError) {
        console.log('🔑 [API] Token error - clearing auth data');
        
        // Clear all auth data
        ['userToken', 'userData', 'sellerToken', 'sellerData', 
         'adminToken', 'adminData', 'deliveryAgentToken', 'deliveryAgentData'].forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Smart redirect based on current route
        const currentPath = window.location.pathname;
        const isCurrentlyOnLoginPage = currentPath.includes('/login');
        
        if (!isCurrentlyOnLoginPage) {
          if (currentPath.includes('/admin/')) {
            window.location.href = '/admin/login';
          } else if (currentPath.includes('/seller/')) {
            window.location.href = '/seller/login';
          } else if (currentPath.includes('/delivery/')) {
            window.location.href = '/delivery/login';
          } else {
            window.location.href = '/user/login';
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Utility functions
export const getStoredTokens = () => {
  return {
    userToken: localStorage.getItem('userToken'),
    sellerToken: localStorage.getItem('sellerToken'),
    adminToken: localStorage.getItem('adminToken'),
    deliveryAgentToken: localStorage.getItem('deliveryAgentToken')
  };
};

export const clearAllTokens = () => {
  ['userToken', 'userData', 'sellerToken', 'sellerData', 
   'adminToken', 'adminData', 'deliveryAgentToken', 'deliveryAgentData'].forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('🧹 [API] All tokens cleared');
};

// Debug functions in development
if (process.env.NODE_ENV === 'development') {
  window.getStoredTokens = getStoredTokens;
  window.clearAllTokens = clearAllTokens;
  window.API_URL = API_URL;
  
  // Debug admin authentication
  window.debugAdminAuth = () => {
    const adminToken = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    
    console.log('🔍 Admin Auth Debug:');
    console.log('  Token:', adminToken ? 'Present' : 'Missing');
    console.log('  Data:', adminData ? 'Present' : 'Missing');
    
    if (adminToken) {
      console.log('  Token length:', adminToken.length);
      console.log('  Token preview:', adminToken.substring(0, 50) + '...');
    }
    
    if (adminData) {
      try {
        const parsed = JSON.parse(adminData);
        console.log('  Admin name:', parsed.name);
        console.log('  Admin email:', parsed.email);
        console.log('  Admin role:', parsed.role);
      } catch (e) {
        console.log('  Admin data parse error:', e.message);
      }
    }
    
    return { adminToken, adminData };
  };
  
  // Test admin API endpoint
  window.testAdminAPI = async () => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      console.error('❌ No admin token found');
      return;
    }
    
    try {
      console.log('🧪 Testing admin API with token...');
      const response = await fetch('/api/admin/sellers?page=1&limit=20', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      return { status: response.status, data };
    } catch (error) {
      console.error('❌ API test failed:', error);
      return { error: error.message };
    }
  };
}

export default api;
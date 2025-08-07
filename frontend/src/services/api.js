// frontend/src/services/api.js - FIXED VERSION
import axios from 'axios';

// Dynamic API URL based on environment
const getApiUrl = () => {
  // Production environment
  if (process.env.NODE_ENV === 'production') {
    // Check if we're on Google App Engine
    if (window.location.hostname.includes('appspot.com')) {
      return process.env.REACT_APP_API_URL_PROD || 'https://onyx-osprey-462815-i9.uc.r.appspot.com/api';
    }
    
    // Use production API URL
    return process.env.REACT_APP_API_URL_PROD || 'https://onyx-osprey-462815-i9.uc.r.appspot.com/api';
  }
  
  // Development environment
  return process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
};

const API_URL = getApiUrl();

console.log('🌐 API URL:', API_URL);

// Create axios instance with dynamic base URL
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔧 ENHANCED: Request interceptor with PROPER admin token handling
api.interceptors.request.use(
  (config) => {
    // 🎯 FIX: Get tokens from localStorage with proper validation
    const userToken = localStorage.getItem('userToken');
    const sellerToken = localStorage.getItem('sellerToken');
    const adminToken = localStorage.getItem('adminToken');
    const deliveryAgentToken = localStorage.getItem('deliveryAgentToken');

    let usedToken = null;
    let tokenSource = null;
    
    // 🔧 ENHANCED: Check URL path to determine which token to prioritize
    const urlPath = config.url || '';
    const isAdminRoute = urlPath.includes('/admin/');
    const isSellerRoute = urlPath.includes('/seller/');
    const isDeliveryRoute = urlPath.includes('/delivery/');
    const isUserRoute = !isAdminRoute && !isSellerRoute && !isDeliveryRoute;

    // 🎯 CRITICAL FIX: Prioritize admin token for admin routes
    if (isAdminRoute && adminToken) {
      // 🎯 ENHANCED: Force fresh token fetch from localStorage
      const freshAdminToken = localStorage.getItem('adminToken');
      if (freshAdminToken) {
        // Double-verify token is fresh
        try {
          const tokenPayload = JSON.parse(atob(freshAdminToken.split('.')[1]));
          const tokenAge = Date.now() - (tokenPayload.iat * 1000);
          console.log('🔍 [API] Admin token age:', tokenAge, 'ms');
        } catch (e) {
          console.log('🔍 [API] Could not decode admin token age');
        }
        
        config.headers.Authorization = `Bearer ${freshAdminToken}`;
        usedToken = freshAdminToken;
        tokenSource = 'adminToken (fresh from storage)';
        console.log('🔐 [API] Using FRESH ADMIN token for admin route');
      } else {
        // Fallback to original token
        config.headers.Authorization = `Bearer ${adminToken}`;
        usedToken = adminToken;
        tokenSource = 'adminToken';
        console.log('🔐 [API] Using ADMIN token for admin route');
      }
    } else if (isSellerRoute && sellerToken) {
      config.headers.Authorization = `Bearer ${sellerToken}`;
      usedToken = sellerToken;
      tokenSource = 'sellerToken';
      console.log('🔐 [API] Using SELLER token for seller route');
    } else if (isDeliveryRoute && deliveryAgentToken) {
      config.headers.Authorization = `Bearer ${deliveryAgentToken}`;
      usedToken = deliveryAgentToken;
      tokenSource = 'deliveryAgentToken';
      console.log('🔐 [API] Using DELIVERY token for delivery route');
    } else if (isUserRoute && userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
      usedToken = userToken;
      tokenSource = 'userToken';
      console.log('🔐 [API] Using USER token for user route');
    } else {
      // 🔧 FALLBACK: Use any available token in priority order
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

    // 🔍 ENHANCED DEBUG: Detailed token logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 [API-REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`🔍 [API-DEBUG] Route Analysis:`, {
        urlPath,
        isAdminRoute,
        isSellerRoute,
        isDeliveryRoute,
        isUserRoute
      });
      console.log(`🔍 [API-DEBUG] Available Tokens:`, {
        hasUserToken: !!userToken,
        hasSellerToken: !!sellerToken,
        hasAdminToken: !!adminToken,
        hasDeliveryToken: !!deliveryAgentToken
      });
      
      if (usedToken) {
        console.log(`🔑 [API] Using ${tokenSource}:`, {
          tokenStart: usedToken.substring(0, 20) + '...',
          tokenEnd: '...' + usedToken.slice(-8),
          tokenLength: usedToken.length,
          isValid: usedToken.split('.').length === 3 // Basic JWT structure check
        });
      } else {
        console.warn('⚠️ [API] No token found - making unauthenticated request');
      }
    }

    return config;
  },
  (error) => {
    console.error('🚨 [API] Request Error:', error);
    return Promise.reject(error);
  }
);

// 🔧 ENHANCED: Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [API-RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        success: response.data?.success
      });
    }
    return response;
  },
  (error) => {
    console.error('🚨 [API-ERROR] Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
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
        console.log('🔑 [API] Token error detected, clearing auth data...');
        
        // 🎯 FIX: Clear ALL auth data on token errors
        ['userToken', 'userData', 'sellerToken', 'sellerData', 'adminToken', 'adminData', 'deliveryAgentToken', 'deliveryAgentData'].forEach(key => {
          localStorage.removeItem(key);
        });
        
        // 🎯 FIX: Smart redirect based on current route
        const currentPath = window.location.pathname;
        const isCurrentlyOnLoginPage = currentPath.includes('/login');
        
        if (!isCurrentlyOnLoginPage) {
          console.log('🔄 [API] Redirecting to appropriate login page...');
          
          if (currentPath.includes('/admin/')) {
            window.location.href = '/admin/login';
          } else if (currentPath.includes('/seller/')) {
            window.location.href = '/seller/login';
          } else {
            window.location.href = '/user/login';
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// 🔧 ENHANCED: Export additional utility functions for debugging
export const getStoredTokens = () => {
  return {
    userToken: localStorage.getItem('userToken'),
    sellerToken: localStorage.getItem('sellerToken'),
    adminToken: localStorage.getItem('adminToken'),
    deliveryAgentToken: localStorage.getItem('deliveryAgentToken')
  };
};

export const clearAllTokens = () => {
  ['userToken', 'userData', 'sellerToken', 'sellerData', 'adminToken', 'adminData', 'deliveryAgentToken', 'deliveryAgentData'].forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('🧹 [API] All tokens cleared');
};

// Make debug functions available in development
if (process.env.NODE_ENV === 'development') {
  window.getStoredTokens = getStoredTokens;
  window.clearAllTokens = clearAllTokens;
}

export default api;
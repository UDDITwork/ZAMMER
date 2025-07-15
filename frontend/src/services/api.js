// frontend/src/services/api.js
import axios from 'axios';

// Dynamic API URL based on environment
const getApiUrl = () => {
  // If running on App Engine (production)
  if (window.location.hostname.includes('appspot.com')) {
    return 'https://onyx-osprey-462815-i9.uc.r.appspot.com/api';
  }

  // Always use local backend in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5001/api';
  }

  // Fallback to environment variable (for custom deployments)
  return process.env.REACT_APP_API_URL || 'https://onyx-osprey-462815-i9.uc.r.appspot.com/api';
};

const API_URL = getApiUrl();

console.log('🌐 API URL:', API_URL);

// Create axios instance with dynamic base URL
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: false, // Changed for production
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // 🎯 FIX: Use correct localStorage keys that match AuthContext
    const userToken = localStorage.getItem('userToken');
    const sellerToken = localStorage.getItem('sellerToken');
    const adminToken = localStorage.getItem('adminToken');

    let usedToken = null;
    let tokenSource = null;
  
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
      usedToken = userToken;
      tokenSource = 'userToken';
    } else if (sellerToken) {
      config.headers.Authorization = `Bearer ${sellerToken}`;
      usedToken = sellerToken;
      tokenSource = 'sellerToken';
    } else if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      usedToken = adminToken;
      tokenSource = 'adminToken';
    }

    // ENHANCED DEBUG: Log token status for every API call
    if (process.env.NODE_ENV === 'development') {
      if (usedToken) {
        console.log(`🔑 [API] Using ${tokenSource}:`, usedToken.substring(0, 20) + '...' + usedToken.slice(-8));
      } else {
        console.warn('⚠️ [API] No token found in localStorage for this request');
      }
      console.log(`🌐 API Call: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('🚨 API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('🚨 API Response Error:', error);
    
    if (error.response?.status === 401) {
      // 🎯 FIX: Clear correct localStorage keys
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerData');
      
      // 🎯 FIX: Only redirect if not already on login page and not a guest request
      const isLoginPage = window.location.pathname.includes('/login');
      const isGuestRequest = !error.config?.headers?.Authorization;
      
      if (!isLoginPage && !isGuestRequest) {
        console.log('🔄 Redirecting to login due to 401 error');
        window.location.href = '/user/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
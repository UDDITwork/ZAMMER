// frontend/src/services/api.js
import axios from 'axios';

// Dynamic API URL based on environment
const getApiUrl = () => {
  // Check if we're in production (deployed to App Engine)
  if (window.location.hostname.includes('appspot.com')) {
    return 'https://onyx-osprey-462815-i9.uc.r.appspot.com/api';
  }
  
  // Use environment variable or fallback to production URL
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
    const token = localStorage.getItem('token') || localStorage.getItem('sellerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API calls in development
    if (process.env.NODE_ENV === 'development') {
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
      // Clear tokens on unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('sellerToken');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/user/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
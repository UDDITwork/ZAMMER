import axios from 'axios';

// Determine the base URL based on environment
const getBaseUrl = () => {
  // In production with the app deployed
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In development, use the proxy
  if (process.env.NODE_ENV === 'development') {
    return '/api';
  }
  
  // Fallback
  return 'http://localhost:5000/api';
};

// Production-ready JWT validation for localStorage tokens only
const isValidStoredJWT = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  try {
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Try to decode the header to verify it's a valid JWT
    let header = parts[0];
    while (header.length % 4) {
      header += '=';
    }
    header = header.replace(/-/g, '+').replace(/_/g, '/');
    
    const decodedHeader = JSON.parse(atob(header));
    
    // Check if it has the typical JWT header structure
    if (!decodedHeader.typ || !decodedHeader.alg) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Safe token cleanup - only remove clearly malformed tokens
const safeTokenCleanup = (tokenKey, dataKey) => {
  try {
    const token = localStorage.getItem(tokenKey);
    if (!token) return false;
    
    // Only remove if clearly malformed
    if (!isValidStoredJWT(token)) {
      console.warn(`🧹 Removing malformed ${tokenKey}`);
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(dataKey);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error checking ${tokenKey}:`, error);
    return false;
  }
};

// Create an instance of axios with production-ready configuration
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 seconds timeout for production
  withCredentials: true
});

// Add a request interceptor to add auth token to every request
api.interceptors.request.use(
  config => {
    // Log the request being made (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
    // Only cleanup tokens that are clearly malformed, don't be aggressive
    try {
      safeTokenCleanup('userToken', 'userData');
      safeTokenCleanup('sellerToken', 'sellerData');
    } catch (error) {
      console.error('Error during token cleanup:', error);
    }
    
    // Get tokens and use them if they exist
    // Don't validate them here - trust localStorage content
    const sellerToken = localStorage.getItem('sellerToken');
    const userToken = localStorage.getItem('userToken');
    
    // Prefer seller token if both exist
    const token = sellerToken || userToken;
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors and connection issues
api.interceptors.response.use(
  response => {
    // Log the response (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status} from ${response.config.url}`);
    }
    return response;
  },
  error => {
    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      return Promise.reject({
        ...error,
        response: {
          data: {
            success: false,
            message: 'Unable to connect to the server. Please check your internet connection.',
            error: error.message
          }
        }
      });
    }
    
    // Handle authentication errors with more precision
    if (error.response && error.response.status === 401) {
      const errorData = error.response.data;
      console.error('API Authentication Error:', errorData);
      
      // Only cleanup tokens if the error is clearly JWT-related
      if (errorData?.message) {
        const message = errorData.message.toLowerCase();
        const isJWTError = message.includes('jwt malformed') || 
                          message.includes('invalid token') ||
                          message.includes('token expired') ||
                          message.includes('invalid signature');
        
        if (isJWTError) {
          console.log('🔑 JWT error detected - cleaning up tokens');
          
          // Remove both tokens as they might both be compromised
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('sellerToken');
          localStorage.removeItem('sellerData');
          
          // Note: Don't auto-redirect here - let components handle it
          console.log('🧹 Tokens cleaned - components will handle navigation');
        }
      }
    }
    
    // Always return the error for components to handle
    return Promise.reject(error);
  }
);

export default api;
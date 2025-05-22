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

// Create an instance of axios with better timeout handling
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000, // 15 seconds timeout
  withCredentials: true
});

// Add a request interceptor to add auth token to every request
api.interceptors.request.use(
  config => {
    // Log the request being made (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
    // Check for seller token first, then user token
    const sellerToken = localStorage.getItem('sellerToken');
    const userToken = localStorage.getItem('userToken');
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
    
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      console.error('API Authentication Error:', error.response.data);
      
      // Check if error is related to JWT
      if (error.response.data.error && (
        error.response.data.error.includes('jwt') ||
        error.response.data.error.includes('token') ||
        error.response.data.error.includes('signature')
      )) {
        console.log('Token validation failed - this might require logout');
        // We're not automatically logging out here since that's handled by the AuthContext
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
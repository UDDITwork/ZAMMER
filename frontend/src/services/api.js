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

// Enhanced debugging with colors
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336',
      request: '#9C27B0',
      response: '#607D8B'
    };
    
    console.log(
      `%c[API] ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Simple JWT structure validation
const isValidJWTStructure = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  try {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  } catch (error) {
    return false;
  }
};

// Create an instance of axios with production-ready configuration
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 seconds timeout
  withCredentials: true
});

// Add a request interceptor to add auth token to every request
api.interceptors.request.use(
  config => {
    // Enhanced request logging
    debugLog(`🚀 REQUEST: ${config.method.toUpperCase()} ${config.url}`, {
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`
    }, 'request');
    
    // Get tokens from localStorage
    const sellerToken = localStorage.getItem('sellerToken');
    const userToken = localStorage.getItem('userToken');
    const adminToken = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('userData');
    
    debugLog('🔑 TOKEN CHECK', {
      hasSellerToken: !!sellerToken,
      hasUserToken: !!userToken,
      hasAdminToken: !!adminToken,
      hasUserData: !!userData,
      sellerTokenValid: sellerToken ? isValidJWTStructure(sellerToken) : false,
      userTokenValid: userToken ? isValidJWTStructure(userToken) : false,
      adminTokenValid: adminToken ? isValidJWTStructure(adminToken) : false
    }, 'info');
    
    // Only cleanup tokens that are clearly malformed (have wrong structure)
    let cleanupNeeded = false;
    
    if (userToken && !isValidJWTStructure(userToken)) {
      debugLog('🧹 Removing malformed user token', { tokenLength: userToken.length }, 'warning');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      cleanupNeeded = true;
    }
    
    if (sellerToken && !isValidJWTStructure(sellerToken)) {
      debugLog('🧹 Removing malformed seller token', { tokenLength: sellerToken.length }, 'warning');
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerData');
      cleanupNeeded = true;
    }
    
    if (adminToken && !isValidJWTStructure(adminToken)) {
      debugLog('🧹 Removing malformed admin token', { tokenLength: adminToken.length }, 'warning');
      localStorage.removeItem('adminToken');
      cleanupNeeded = true;
    }
    
    if (cleanupNeeded) {
      debugLog('🧹 Token cleanup completed', null, 'warning');
      // Re-read tokens after cleanup
      const cleanedAdminToken = localStorage.getItem('adminToken');
      const cleanedSellerToken = localStorage.getItem('sellerToken');
      const cleanedUserToken = localStorage.getItem('userToken');
      
      // Use the cleaned tokens
      const token = cleanedAdminToken || cleanedSellerToken || cleanedUserToken;
      
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        debugLog('✅ CLEANED TOKEN ADDED', {
          tokenType: cleanedAdminToken ? 'admin' : cleanedSellerToken ? 'seller' : 'user',
          tokenPreview: `${token.substring(0, 20)}...`
        }, 'success');
      } else {
        debugLog('❌ NO VALID TOKEN FOUND AFTER CLEANUP', null, 'warning');
      }
    } else {
      // Use existing valid tokens
      const token = adminToken || sellerToken || userToken;
      
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        debugLog('✅ TOKEN ADDED', {
          tokenType: adminToken ? 'admin' : sellerToken ? 'seller' : 'user',
          tokenPreview: `${token.substring(0, 20)}...`
        }, 'success');
      } else {
        debugLog('❌ NO TOKEN FOUND', null, 'warning');
      }
    }
    
    return config;
  },
  error => {
    debugLog('❌ REQUEST ERROR:', error, 'error');
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors and connection issues
api.interceptors.response.use(
  response => {
    // Enhanced response logging
    debugLog(`✅ RESPONSE: ${response.status} from ${response.config.url}`, {
      status: response.status,
      statusText: response.statusText,
      success: response.data?.success
    }, 'response');
    
    return response;
  },
  error => {
    // Enhanced error logging
    debugLog(`❌ RESPONSE ERROR:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code,
      url: error.config?.url,
      method: error.config?.method,
      isNetworkError: !error.response
    }, 'error');
    
    // Handle network errors
    if (!error.response) {
      debugLog('🌐 NETWORK ERROR - No response received', {
        message: error.message,
        code: error.code
      }, 'error');
      
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
    
    // Handle authentication errors with precision
    if (error.response && error.response.status === 401) {
      const errorData = error.response.data;
      debugLog('🚫 401 UNAUTHORIZED ERROR', {
        url: error.config?.url,
        method: error.config?.method,
        errorMessage: errorData?.message,
        errorCode: errorData?.code
      }, 'error');
      
      // Only cleanup tokens if the error explicitly indicates token issues
      if (errorData?.code && (
        errorData.code === 'INVALID_TOKEN' ||
        errorData.code === 'TOKEN_EXPIRED' ||
        errorData.code === 'MALFORMED_TOKEN' ||
        errorData.code === 'NO_TOKEN'
      )) {
        debugLog('🔑 TOKEN ERROR DETECTED - Cleaning up tokens', {
          errorCode: errorData.code,
          errorMessage: errorData.message
        }, 'warning');
        
        // Remove tokens
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('sellerToken');
        localStorage.removeItem('sellerData');
        localStorage.removeItem('adminToken');
        
        debugLog('🧹 ALL TOKENS CLEANED DUE TO AUTH ERROR', {
          code: errorData.code
        }, 'warning');
      }
    }
    
    // 🎯 NEW: Handle forceLogout from backend
    if (error.response?.status === 401 && error.response?.data?.forceLogout) {
      console.log('🔄 Force logout detected - clearing auth data');
      
      // Clear all auth data
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerData');
      localStorage.removeItem('adminToken');
      
      // Redirect to login after short delay
      setTimeout(() => {
        window.location.href = '/user/login';
      }, 1000);
    }
    
    // Always return the error for components to handle
    return Promise.reject(error);
  }
);

// 🎯 NEW: Image loading interceptor for debugging
const testImageLoading = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    console.log('❌ Invalid image URL provided for testing');
    return;
  }
  
  console.log(`🧪 Testing image load: ${imageUrl.substring(0, 50)}...`);
  
  const img = new Image();
  
  img.onload = function() {
    console.log(`✅ Image loaded successfully: ${imageUrl.substring(0, 50)}...`);
    console.log(`   📐 Dimensions: ${this.naturalWidth}x${this.naturalHeight}`);
  };
  
  img.onerror = function() {
    console.log(`❌ Image failed to load: ${imageUrl.substring(0, 50)}...`);
    console.log(`   🔍 Possible issues:`);
    console.log(`   - CORS policy blocking the image`);
    console.log(`   - Invalid Cloudinary URL`);
    console.log(`   - Image doesn't exist on Cloudinary`);
    console.log(`   - Network connectivity issues`);
  };
  
  img.src = imageUrl;
};

// Export for global use in development
if (process.env.NODE_ENV === 'development') {
  window.testImageLoading = testImageLoading;
  console.log('🧪 Image testing function available: window.testImageLoading(url)');
}

export default api;
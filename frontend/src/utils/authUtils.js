// Save this file to: src/utils/authUtils.js

/**
 * Clear all authentication data and redirect to login
 * @param {string} redirectPath - Path to redirect to after clearing auth
 */
export const clearAuth = (redirectPath = '/user/login') => {
    console.log('Clearing authentication data');
    
    // Clear localStorage tokens
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerData');
    
    // Redirect to login page
    window.location.href = redirectPath;
  };
  
  /**
   * Handle authentication errors gracefully
   * @param {Object} error - Axios error response
   * @param {Function} logoutFn - Logout function from AuthContext
   * @returns {boolean} - True if was an auth error and handled
   */
  export const handleAuthError = (error, logoutFn) => {
    if (!error?.response) return false;
    
    const { status, data } = error.response;
    
    if (status === 401) {
      console.log('Authentication error:', data.message || 'Unauthorized');
      
      // Check if it's related to JWT
      if (
        (data.error && (
          data.error.includes('jwt') || 
          data.error.includes('token') || 
          data.error.includes('signature')
        )) ||
        (data.message && data.message.includes('token'))
      ) {
        if (logoutFn) {
          logoutFn();
        } else {
          clearAuth();
        }
        
        return true;
      }
    }
    
    return false;
  };
  
  /**
   * Check if auth token exists
   * @returns {boolean} - True if a token exists
   */
  export const hasAuthToken = () => {
    return !!(localStorage.getItem('userToken') || localStorage.getItem('sellerToken'));
  };
  
  /**
   * Force refresh user authentication by clearing tokens and redirecting to login
   */
  export const forceReauthentication = () => {
    clearAuth();
  };
  
  export default {
    clearAuth,
    handleAuthError,
    hasAuthToken,
    forceReauthentication
  };
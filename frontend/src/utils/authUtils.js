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
  
  // Authentication debugging utilities
  export const debugAuthState = () => {
    const userToken = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');
    const sellerToken = localStorage.getItem('sellerToken');
    const sellerData = localStorage.getItem('sellerData');

    console.log('🔧 AUTH STATE DEBUG:', {
      localStorage: {
        userToken: userToken ? {
          exists: true,
          length: userToken.length,
          preview: `${userToken.substring(0, 30)}...`
        } : { exists: false },
        userData: userData ? {
          exists: true,
          length: userData.length,
          preview: userData.substring(0, 50) + '...'
        } : { exists: false },
        sellerToken: sellerToken ? {
          exists: true,
          length: sellerToken.length,
          preview: `${sellerToken.substring(0, 30)}...`
        } : { exists: false },
        sellerData: sellerData ? {
          exists: true,
          length: sellerData.length,
          preview: sellerData.substring(0, 50) + '...'
        } : { exists: false }
      },
      allKeys: Object.keys(localStorage)
    });

    return {
      userToken: !!userToken,
      userData: !!userData,
      sellerToken: !!sellerToken,
      sellerData: !!sellerData
    };
  };

  // Clear all authentication data
  export const clearAllAuth = () => {
    console.log('🧹 Clearing all authentication data...');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerData');
    console.log('✅ All auth data cleared');
  };

  // Test authentication flow
  export const testAuthFlow = async () => {
    console.log('🧪 Testing authentication flow...');
    
    // Clear existing auth
    clearAllAuth();
    
    // Check initial state
    const initialState = debugAuthState();
    console.log('📊 Initial state:', initialState);
    
    // Simulate login (this would be called by the actual login process)
    const testUserData = {
      _id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      token: 'test-token-123'
    };
    
    localStorage.setItem('userToken', testUserData.token);
    localStorage.setItem('userData', JSON.stringify(testUserData));
    
    // Check post-login state
    const postLoginState = debugAuthState();
    console.log('📊 Post-login state:', postLoginState);
    
    // Simulate logout
    clearAllAuth();
    
    // Check post-logout state
    const postLogoutState = debugAuthState();
    console.log('📊 Post-logout state:', postLogoutState);
    
    console.log('✅ Auth flow test completed');
  };

  // Make functions available globally in development
  if (process.env.NODE_ENV === 'development') {
    window.debugAuthState = debugAuthState;
    window.clearAllAuth = clearAllAuth;
    window.testAuthFlow = testAuthFlow;
    
    console.log('🔧 Auth utilities available globally:');
    console.log('  - window.debugAuthState() - Check current auth state');
    console.log('  - window.clearAllAuth() - Clear all auth data');
    console.log('  - window.testAuthFlow() - Test authentication flow');
  }

  export default {
    clearAuth,
    handleAuthError,
    hasAuthToken,
    forceReauthentication
  };
// Token cleanup utility to handle malformed JWT issues
// Create this file as: src/utils/tokenCleanup.js

export const tokenCleanup = {
    // Check if a token is valid JWT format
    isValidJWT: (token) => {
      if (!token || typeof token !== 'string') return false;
      
      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Each part should be base64 encoded
      try {
        parts.forEach(part => {
          // Add padding if needed
          const padded = part + '='.repeat((4 - part.length % 4) % 4);
          atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
        });
        return true;
      } catch (error) {
        return false;
      }
    },
  
    // Clean up invalid tokens from localStorage
    cleanupInvalidTokens: () => {
      const tokensToCheck = [
        { key: 'userToken', dataKey: 'userData' },
        { key: 'sellerToken', dataKey: 'sellerData' }
      ];
  
      let cleaned = false;
  
      tokensToCheck.forEach(({ key, dataKey }) => {
        const token = localStorage.getItem(key);
        
        if (token && !tokenCleanup.isValidJWT(token)) {
          console.warn(`🧹 Cleaning up malformed ${key}:`, token.substring(0, 20) + '...');
          localStorage.removeItem(key);
          localStorage.removeItem(dataKey);
          cleaned = true;
        }
      });
  
      if (cleaned) {
        console.log('✅ Token cleanup completed');
        // Optionally reload the page to reset auth state
        // window.location.reload();
      }
  
      return cleaned;
    },
  
    // Validate and clean a specific token
    validateToken: (token, tokenType = 'unknown') => {
      if (!token) {
        console.log(`❌ ${tokenType} token is missing`);
        return false;
      }
  
      if (!tokenCleanup.isValidJWT(token)) {
        console.warn(`❌ ${tokenType} token is malformed:`, token.substring(0, 20) + '...');
        return false;
      }
  
      console.log(`✅ ${tokenType} token is valid`);
      return true;
    },
  
    // Get token info for debugging
    getTokenInfo: (token) => {
      if (!token || !tokenCleanup.isValidJWT(token)) {
        return { valid: false, error: 'Invalid or malformed token' };
      }
  
      try {
        const parts = token.split('.');
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        
        return {
          valid: true,
          header,
          payload,
          isExpired: payload.exp ? Date.now() >= payload.exp * 1000 : false,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : null
        };
      } catch (error) {
        return { valid: false, error: error.message };
      }
    },
  
    // Debug current auth state
    debugAuthState: () => {
      console.log('🔍 Debugging authentication state...');
      
      const userToken = localStorage.getItem('userToken');
      const userData = localStorage.getItem('userData');
      const sellerToken = localStorage.getItem('sellerToken');
      const sellerData = localStorage.getItem('sellerData');
  
      console.log('User Token:', userToken ? 
        `${userToken.substring(0, 20)}... (${userToken.length} chars)` : 
        'Not found'
      );
      
      console.log('User Data:', userData ? 
        'Present' : 
        'Not found'
      );
  
      console.log('Seller Token:', sellerToken ? 
        `${sellerToken.substring(0, 20)}... (${sellerToken.length} chars)` : 
        'Not found'
      );
      
      console.log('Seller Data:', sellerData ? 
        'Present' : 
        'Not found'
      );
  
      // Validate tokens
      if (userToken) {
        const userTokenInfo = tokenCleanup.getTokenInfo(userToken);
        console.log('User Token Info:', userTokenInfo);
      }
  
      if (sellerToken) {
        const sellerTokenInfo = tokenCleanup.getTokenInfo(sellerToken);
        console.log('Seller Token Info:', sellerTokenInfo);
      }
    },
  
    // Initialize token cleanup on app start
    initialize: () => {
      console.log('🔧 Initializing token cleanup...');
      
      // Clean up any malformed tokens
      const cleaned = tokenCleanup.cleanupInvalidTokens();
      
      // Debug in development
      if (process.env.NODE_ENV === 'development') {
        tokenCleanup.debugAuthState();
      }
  
      return cleaned;
    }
  };
  
  // Auto-initialize when module is imported in development
  if (process.env.NODE_ENV === 'development') {
    // Run cleanup on module load
    setTimeout(() => {
      tokenCleanup.initialize();
    }, 1000);
  }
  
  export default tokenCleanup;
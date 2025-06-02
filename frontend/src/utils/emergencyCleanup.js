// Emergency Token Cleanup Script
// Add this to your browser console to immediately fix JWT issues
// Or create as src/utils/emergencyCleanup.js

(function() {
    console.log('🧹 Starting Emergency Token Cleanup...');
    
    // Function to check if token is valid JWT format
    function isValidJWT(token) {
      if (!token || typeof token !== 'string') return false;
      
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const base64Pattern = /^[A-Za-z0-9_-]+$/;
      return parts.every(part => base64Pattern.test(part));
    }
    
    // Clean up function
    function cleanupTokens() {
      const tokensToCheck = [
        { tokenKey: 'userToken', dataKey: 'userData' },
        { tokenKey: 'sellerToken', dataKey: 'sellerData' }
      ];
      
      let cleaned = false;
      
      tokensToCheck.forEach(({ tokenKey, dataKey }) => {
        const token = localStorage.getItem(tokenKey);
        
        if (token) {
          console.log(`🔍 Checking ${tokenKey}:`, token.substring(0, 30) + '...');
          
          if (!isValidJWT(token)) {
            console.warn(`❌ ${tokenKey} is malformed, removing...`);
            localStorage.removeItem(tokenKey);
            localStorage.removeItem(dataKey);
            cleaned = true;
          } else {
            console.log(`✅ ${tokenKey} is valid`);
          }
        } else {
          console.log(`ℹ️ ${tokenKey} not found`);
        }
      });
      
      if (cleaned) {
        console.log('🎉 Cleanup completed! Tokens have been cleaned up.');
        console.log('🔄 Please refresh the page to reset authentication state.');
        
        // Ask user if they want to reload
        if (confirm('Malformed tokens have been cleaned up. Reload the page now?')) {
          window.location.reload();
        }
      } else {
        console.log('✅ No cleanup needed. All tokens are valid.');
      }
      
      return cleaned;
    }
    
    // Run cleanup
    return cleanupTokens();
  })();
  
  // Export for use as module
  export const emergencyCleanup = {
    run: () => {
      // Same cleanup function as above but as module export
      const isValidJWT = (token) => {
        if (!token || typeof token !== 'string') return false;
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const base64Pattern = /^[A-Za-z0-9_-]+$/;
        return parts.every(part => base64Pattern.test(part));
      };
      
      const tokensToCheck = [
        { tokenKey: 'userToken', dataKey: 'userData' },
        { tokenKey: 'sellerToken', dataKey: 'sellerData' }
      ];
      
      let cleaned = false;
      
      tokensToCheck.forEach(({ tokenKey, dataKey }) => {
        const token = localStorage.getItem(tokenKey);
        
        if (token && !isValidJWT(token)) {
          console.warn(`🧹 Cleaning up malformed ${tokenKey}`);
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(dataKey);
          cleaned = true;
        }
      });
      
      if (cleaned) {
        console.log('✅ Emergency cleanup completed');
      }
      
      return cleaned;
    }
  };
  
  export default emergencyCleanup;
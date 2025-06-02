import React, { createContext, useState, useEffect } from 'react';
import { getCurrentLocation } from '../utils/locationUtils';

// Robust JWT validation for localStorage tokens only
const isValidStoredJWT = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  try {
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Try to decode each part to verify it's valid base64
    // This is more robust than regex pattern matching
    for (let i = 0; i < 3; i++) {
      let part = parts[i];
      
      // Add padding if needed for base64 decoding
      while (part.length % 4) {
        part += '=';
      }
      
      // Replace URL-safe characters
      part = part.replace(/-/g, '+').replace(/_/g, '/');
      
      // Try to decode - will throw if invalid
      atob(part);
    }
    
    // If we get here, the token format is valid
    return true;
  } catch (error) {
    // Any error means the token is malformed
    return false;
  }
};

// Create context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [sellerAuth, setSellerAuth] = useState({
    isAuthenticated: false,
    seller: null,
    token: null,
  });

  const [userAuth, setUserAuth] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
  });

  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  // Debug logging for development
  const debugLog = (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AuthContext] ${message}`, data);
    }
  };

  // Clean up malformed tokens from localStorage only
  const cleanupMalformedTokens = () => {
    let cleaned = false;
    
    // Check user token from localStorage
    const userToken = localStorage.getItem('userToken');
    if (userToken && !isValidStoredJWT(userToken)) {
      debugLog('Cleaning up malformed user token from localStorage');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      cleaned = true;
    }
    
    // Check seller token from localStorage
    const sellerToken = localStorage.getItem('sellerToken');
    if (sellerToken && !isValidStoredJWT(sellerToken)) {
      debugLog('Cleaning up malformed seller token from localStorage');
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerData');
      cleaned = true;
    }
    
    if (cleaned) {
      debugLog('Token cleanup completed');
    }
    
    return cleaned;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        debugLog('Initializing authentication state...');
        
        // Clean up any malformed tokens first
        cleanupMalformedTokens();
        
        // Check if seller is logged in
        const sellerToken = localStorage.getItem('sellerToken');
        const sellerData = localStorage.getItem('sellerData');

        if (sellerToken && sellerData && isValidStoredJWT(sellerToken)) {
          try {
            const parsedSellerData = JSON.parse(sellerData);
            debugLog('Found valid seller authentication data', {
              hasToken: !!sellerToken,
              sellerName: parsedSellerData?.firstName,
              sellerId: parsedSellerData?._id
            });
            
            setSellerAuth({
              isAuthenticated: true,
              seller: parsedSellerData,
              token: sellerToken,
            });
          } catch (error) {
            console.error('Error parsing seller data:', error);
            // Clean up corrupted data
            localStorage.removeItem('sellerToken');
            localStorage.removeItem('sellerData');
            debugLog('Removed corrupted seller data');
          }
        } else if (sellerToken) {
          // Token exists but is invalid
          debugLog('Found invalid seller token, cleaning up');
          localStorage.removeItem('sellerToken');
          localStorage.removeItem('sellerData');
        }

        // Check if user is logged in
        const userToken = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData');

        if (userToken && userData && isValidStoredJWT(userToken)) {
          try {
            const parsedUserData = JSON.parse(userData);
            debugLog('Found valid user authentication data', {
              hasToken: !!userToken,
              userName: parsedUserData?.name,
              userId: parsedUserData?._id
            });
            
            setUserAuth({
              isAuthenticated: true,
              user: parsedUserData,
              token: userToken,
            });
          } catch (error) {
            console.error('Error parsing user data:', error);
            // Clean up corrupted data
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            debugLog('Removed corrupted user data');
          }
        } else if (userToken) {
          // Token exists but is invalid
          debugLog('Found invalid user token, cleaning up');
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
        }

        debugLog('Authentication initialization completed');
      } catch (error) {
        console.error('Critical error during auth initialization:', error);
        setInitError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login seller - NO TOKEN VALIDATION (trust server)
  const loginSeller = (data) => {
    try {
      debugLog('Logging in seller', {
        sellerName: data?.firstName,
        hasToken: !!data?.token
      });

      if (!data || !data.token) {
        throw new Error('Invalid seller login data - missing token');
      }

      // Store the token directly - trust the server
      localStorage.setItem('sellerToken', data.token);
      localStorage.setItem('sellerData', JSON.stringify(data));
      
      setSellerAuth({
        isAuthenticated: true,
        seller: data,
        token: data.token,
      });

      debugLog('Seller login successful');
    } catch (error) {
      console.error('Seller login error:', error);
      throw error;
    }
  };

  // Logout seller
  const logoutSeller = () => {
    try {
      debugLog('Logging out seller');
      
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerData');
      
      setSellerAuth({
        isAuthenticated: false,
        seller: null,
        token: null,
      });

      debugLog('Seller logout successful');
    } catch (error) {
      console.error('Seller logout error:', error);
    }
  };

  // Login user - NO TOKEN VALIDATION (trust server)
  const loginUser = async (data) => {
    try {
      debugLog('Logging in user', {
        userName: data?.name,
        hasToken: !!data?.token
      });

      if (!data || !data.token) {
        throw new Error('Invalid user login data - missing token');
      }

      // Try to get user's location
      try {
        debugLog('Attempting to get user location...');
        const location = await getCurrentLocation();
        if (location && data) {
          data.location = {
            ...data.location,
            coordinates: location.coordinates
          };
          debugLog('User location obtained', {
            coordinates: location.coordinates,
            address: location.address
          });
        }
      } catch (error) {
        debugLog('Location access denied or error', error.message);
        // Continue without location - not critical for login
      }
      
      // Store the token directly - trust the server
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data));
      
      setUserAuth({
        isAuthenticated: true,
        user: data,
        token: data.token,
      });

      debugLog('User login successful');
    } catch (error) {
      console.error('User login error:', error);
      throw error;
    }
  };

  // Logout user
  const logoutUser = () => {
    try {
      debugLog('Logging out user');
      
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      
      setUserAuth({
        isAuthenticated: false,
        user: null,
        token: null,
      });

      debugLog('User logout successful');
    } catch (error) {
      console.error('User logout error:', error);
    }
  };

  // Handle authentication errors (production-ready)
  const handleAuthError = (error) => {
    try {
      if (!error?.response) {
        debugLog('Non-response error', error);
        return false;
      }
      
      const { status, data } = error.response;
      
      debugLog('Handling auth error', {
        status,
        errorMessage: data?.message,
        errorData: data
      });
      
      // Only handle 401 errors that are clearly JWT-related
      if (status === 401 && data?.message) {
        const message = data.message.toLowerCase();
        const isJWTError = message.includes('jwt') || 
                          message.includes('token') || 
                          message.includes('unauthorized') ||
                          message.includes('invalid signature') ||
                          message.includes('malformed');
        
        if (isJWTError) {
          debugLog('JWT-related authentication error detected');
          
          // Clean up stored tokens
          cleanupMalformedTokens();
          
          // Reset auth state
          setUserAuth({
            isAuthenticated: false,
            user: null,
            token: null,
          });
          setSellerAuth({
            isAuthenticated: false,
            seller: null,
            token: null,
          });
          
          return true;
        }
      }
      
      return false;
    } catch (handleError) {
      console.error('Error in handleAuthError:', handleError);
      return false;
    }
  };

  // Refresh authentication data
  const refreshAuth = () => {
    debugLog('Refreshing authentication state...');
    setLoading(true);
    
    // Clean up tokens and re-initialize
    cleanupMalformedTokens();
    
    // Re-initialize auth state
    setTimeout(() => {
      setLoading(false);
    }, 100);
  };

  // Get current auth state summary
  const getAuthSummary = () => {
    return {
      sellerAuthenticated: sellerAuth.isAuthenticated,
      userAuthenticated: userAuth.isAuthenticated,
      sellerName: sellerAuth.seller?.firstName,
      userName: userAuth.user?.name,
      loading,
      initError
    };
  };

  // Production-ready validation function
  const validateAuthState = () => {
    const issues = [];
    
    if (sellerAuth.isAuthenticated && !sellerAuth.seller) {
      issues.push('Seller authenticated but no seller data');
    }
    
    if (userAuth.isAuthenticated && !userAuth.user) {
      issues.push('User authenticated but no user data');
    }
    
    if (sellerAuth.isAuthenticated && !sellerAuth.token) {
      issues.push('Seller authenticated but no token');
    }
    
    if (userAuth.isAuthenticated && !userAuth.token) {
      issues.push('User authenticated but no token');
    }
    
    // Only check stored tokens, not current session tokens
    const storedUserToken = localStorage.getItem('userToken');
    const storedSellerToken = localStorage.getItem('sellerToken');
    
    if (storedUserToken && !isValidStoredJWT(storedUserToken)) {
      issues.push('User has invalid stored JWT token');
    }
    
    if (storedSellerToken && !isValidStoredJWT(storedSellerToken)) {
      issues.push('Seller has invalid stored JWT token');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  };

  // Context value
  const contextValue = {
    // Auth states
    sellerAuth,
    userAuth,
    loading,
    initError,
    
    // Auth functions
    loginSeller,
    logoutSeller,
    loginUser,
    logoutUser,
    handleAuthError,
    
    // Utility functions
    refreshAuth,
    getAuthSummary,
    validateAuthState,
    cleanupMalformedTokens,
    
    // Debug helpers (only in development)
    ...(process.env.NODE_ENV === 'development' && {
      debugLog,
      _internalState: {
        sellerAuth,
        userAuth,
        loading,
        initError
      }
    })
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
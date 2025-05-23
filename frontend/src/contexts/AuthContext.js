import React, { createContext, useState, useEffect } from 'react';
import { getCurrentLocation } from '../utils/locationUtils';

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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        debugLog('Initializing authentication state...');
        
        // Check if seller is logged in
        const sellerToken = localStorage.getItem('sellerToken');
        const sellerData = localStorage.getItem('sellerData');

        if (sellerToken && sellerData) {
          try {
            const parsedSellerData = JSON.parse(sellerData);
            debugLog('Found seller authentication data', {
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
        }

        // Check if user is logged in
        const userToken = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData');

        if (userToken && userData) {
          try {
            const parsedUserData = JSON.parse(userData);
            debugLog('Found user authentication data', {
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

  // Login seller
  const loginSeller = (data) => {
    try {
      debugLog('Logging in seller', {
        sellerName: data?.firstName,
        hasToken: !!data?.token
      });

      if (!data || !data.token) {
        throw new Error('Invalid seller login data');
      }

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

  // Login user
  const loginUser = async (data) => {
    try {
      debugLog('Logging in user', {
        userName: data?.name,
        hasToken: !!data?.token
      });

      if (!data || !data.token) {
        throw new Error('Invalid user login data');
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

  // Handle authentication errors
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
      
      // Check if it's an authentication error
      if (status === 401) {
        debugLog('Authentication error detected', data);
        
        // If it's due to an invalid token, logout the user
        if (data.error && (
          data.error.includes('jwt') || 
          data.error.includes('token') || 
          data.error.includes('signature')
        )) {
          debugLog('Invalid token detected, logging out all users');
          logoutUser();
          logoutSeller();
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

  // Validation function for auth state
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
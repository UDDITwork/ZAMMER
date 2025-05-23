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

  useEffect(() => {
    // Check if seller is logged in
    const sellerToken = localStorage.getItem('sellerToken');
    const sellerData = localStorage.getItem('sellerData');

    if (sellerToken && sellerData) {
      try {
        setSellerAuth({
          isAuthenticated: true,
          seller: JSON.parse(sellerData),
          token: sellerToken,
        });
      } catch (error) {
        console.error('Error parsing seller data:', error);
        localStorage.removeItem('sellerToken');
        localStorage.removeItem('sellerData');
      }
    }

    // Check if user is logged in
    const userToken = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');

    if (userToken && userData) {
      try {
        setUserAuth({
          isAuthenticated: true,
          user: JSON.parse(userData),
          token: userToken,
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    }

    setLoading(false);
  }, []);

  // Login seller
  const loginSeller = (data) => {
    localStorage.setItem('sellerToken', data.token);
    localStorage.setItem('sellerData', JSON.stringify(data));
    
    setSellerAuth({
      isAuthenticated: true,
      seller: data,
      token: data.token,
    });
  };

  // Logout seller
  const logoutSeller = () => {
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerData');
    
    setSellerAuth({
      isAuthenticated: false,
      seller: null,
      token: null,
    });
  };

  // Login user
  const loginUser = async (data) => {
    // Try to get user's location
    try {
      const location = await getCurrentLocation();
      if (location && data) {
        data.location = {
          ...data.location,
          coordinates: location.coordinates
        };
      }
    } catch (error) {
      console.log('Location access denied or error:', error);
    }
    
    localStorage.setItem('userToken', data.token);
    localStorage.setItem('userData', JSON.stringify(data));
    
    setUserAuth({
      isAuthenticated: true,
      user: data,
      token: data.token,
    });
  };

  // Logout user
  const logoutUser = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    
    setUserAuth({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  };

  // Handle authentication errors
  const handleAuthError = (error) => {
    if (!error?.response) return false;
    
    const { status, data } = error.response;
    
    // Check if it's an authentication error
    if (status === 401) {
      console.log('Authentication error:', data);
      
      // If it's due to an invalid token, logout the user
      if (data.error && (
        data.error.includes('jwt') || 
        data.error.includes('token') || 
        data.error.includes('signature')
      )) {
        console.log('Invalid token detected, logging out');
        logoutUser();
        logoutSeller();
        return true;
      }
    }
    
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        sellerAuth,
        userAuth,
        loading,
        loginSeller,
        logoutSeller,
        loginUser,
        logoutUser,
        handleAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
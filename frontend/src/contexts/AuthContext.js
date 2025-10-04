// frontend/src/contexts/AuthContext.js - ENHANCED with Comprehensive Logging

import React, { createContext, useState, useEffect } from 'react';
import { getCurrentLocation } from '../utils/locationUtils';

// 🎯 ENHANCED DEBUGGING with detailed colors and timestamps
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336',
      storage: '#9C27B0',
      delivery: '#FF5722',
      admin: '#673AB7',
      critical: '#E91E63'
    };
    
    console.log(
      `%c[AuthContext] ${timestamp} - ${message}`,
      `color: ${colors[type]}; font-weight: bold; background: rgba(0,0,0,0.1); padding: 2px 6px;`,
      data
    );

    // 🎯 CRITICAL ACTIONS - Also show alerts in development
    if (type === 'critical') {
      console.warn(`🚨 CRITICAL AUTH ACTION: ${message}`, data);
    }
  }
};

// Simple JWT validation - only check basic structure
const isValidJWTStructure = (token) => {
  if (!token || typeof token !== 'string') {
    debugLog('JWT validation failed: Invalid token type', { 
      token: token ? 'present' : 'missing',
      type: typeof token 
    }, 'warning');
    return false;
  }
  
  try {
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      debugLog('JWT validation failed: Invalid parts count', { 
        partsCount: parts.length,
        tokenPreview: token.substring(0, 30) + '...'
      }, 'warning');
      return false;
    }
    
    // Each part should be base64-like (basic check)
    for (let part of parts) {
      if (!part || part.length === 0) {
        debugLog('JWT validation failed: Empty part found', null, 'warning');
        return false;
      }
    }
    
    debugLog('JWT validation successful', { 
      tokenLength: token.length,
      partsCount: parts.length 
    }, 'success');
    return true;
  } catch (error) {
    debugLog('JWT validation error', { error: error.message }, 'error');
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

  const [adminAuth, setAdminAuth] = useState({
    isAuthenticated: false,
    admin: null,
    token: null,
  });

  const [deliveryAgentAuth, setDeliveryAgentAuth] = useState({
    isAuthenticated: false,
    deliveryAgent: null,
    token: null,
  });

  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  // 🎯 ENHANCED: Safe localStorage operations with detailed logging
  const safeSetItem = (key, value) => {
    try {
      localStorage.setItem(key, value);
      debugLog(`STORAGE SET: ${key}`, { 
        success: true, 
        valueLength: value?.length,
        timestamp: new Date().toISOString()
      }, 'storage');
      return true;
    } catch (error) {
      debugLog(`STORAGE SET ERROR: ${key}`, { 
        error: error.message,
        valueLength: value?.length 
      }, 'error');
      return false;
    }
  };

  const safeGetItem = (key) => {
    try {
      const value = localStorage.getItem(key);
      debugLog(`STORAGE GET: ${key}`, { 
        hasValue: !!value,
        valueLength: value?.length || 0,
        preview: value ? value.substring(0, 30) + '...' : 'null'
      }, 'storage');
      return value;
    } catch (error) {
      debugLog(`STORAGE GET ERROR: ${key}`, { error: error.message }, 'error');
      return null;
    }
  };

  const safeRemoveItem = (key) => {
    try {
      localStorage.removeItem(key);
      debugLog(`STORAGE REMOVE: ${key}`, { success: true }, 'storage');
      return true;
    } catch (error) {
      debugLog(`STORAGE REMOVE ERROR: ${key}`, { error: error.message }, 'error');
      return false;
    }
  };

  // 🎯 CRITICAL: Initialize auth state with enhanced logging
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        debugLog('AUTH INITIALIZATION STARTED', {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }, 'critical');
        
        // 🎯 ENHANCED: Batch localStorage operations with detailed checks
        const storageData = {
          sellerToken: safeGetItem('sellerToken'),
          sellerData: safeGetItem('sellerData'),
          userToken: safeGetItem('userToken'),
          userData: safeGetItem('userData'),
          adminToken: safeGetItem('adminToken'),
          adminData: safeGetItem('adminData'),
          deliveryToken: safeGetItem('deliveryAgentToken'),
          deliveryData: safeGetItem('deliveryAgentData')
        };

        debugLog('STORAGE SCAN COMPLETE', {
          foundTokens: Object.keys(storageData).filter(key => key.includes('Token') && storageData[key]),
          foundData: Object.keys(storageData).filter(key => key.includes('Data') && storageData[key]),
          allKeys: Object.keys(storageData),
          storageDetails: Object.keys(storageData).reduce((acc, key) => {
            acc[key] = !!storageData[key];
            return acc;
          }, {})
        }, 'info');

        // 🎯 ENHANCED: Check seller auth with detailed validation
        if (storageData.sellerToken && storageData.sellerData && isValidJWTStructure(storageData.sellerToken)) {
          try {
            const parsedSellerData = JSON.parse(storageData.sellerData);
            debugLog('SELLER AUTH FOUND', {
              sellerName: parsedSellerData?.firstName,
              sellerId: parsedSellerData?._id,
              tokenLength: storageData.sellerToken.length
            }, 'success');
            
            setSellerAuth({
              isAuthenticated: true,
              seller: parsedSellerData,
              token: storageData.sellerToken,
            });
          } catch (error) {
            debugLog('SELLER DATA CORRUPTION', { error: error.message }, 'error');
            safeRemoveItem('sellerToken');
            safeRemoveItem('sellerData');
          }
        }

        // 🎯 ENHANCED: Check user auth with comprehensive validation
        debugLog('USER AUTH VALIDATION', {
          hasUserToken: !!storageData.userToken,
          hasUserData: !!storageData.userData,
          tokenValid: storageData.userToken ? isValidJWTStructure(storageData.userToken) : false,
          tokenLength: storageData.userToken?.length || 0
        }, 'info');

        if (storageData.userToken && storageData.userData && isValidJWTStructure(storageData.userToken)) {
          try {
            const parsedUserData = JSON.parse(storageData.userData);
            
            if (parsedUserData && parsedUserData._id && parsedUserData.name) {
              debugLog('USER AUTH RESTORED', {
                userName: parsedUserData?.name,
                userId: parsedUserData?._id,
                userEmail: parsedUserData?.email,
                hasLocation: !!parsedUserData?.location
              }, 'success');
              
              setUserAuth({
                isAuthenticated: true,
                user: parsedUserData,
                token: storageData.userToken,
              });
            } else {
              debugLog('USER DATA INVALID STRUCTURE', { 
                hasId: !!parsedUserData?._id,
                hasName: !!parsedUserData?.name,
                dataKeys: parsedUserData ? Object.keys(parsedUserData) : []
              }, 'error');
              safeRemoveItem('userToken');
              safeRemoveItem('userData');
            }
          } catch (error) {
            debugLog('USER DATA PARSE ERROR', { error: error.message }, 'error');
            safeRemoveItem('userToken');
            safeRemoveItem('userData');
          }
        } else if (storageData.userToken || storageData.userData) {
          debugLog('INCOMPLETE USER AUTH DATA CLEANUP', {
            hasToken: !!storageData.userToken,
            hasData: !!storageData.userData,
            tokenValid: storageData.userToken ? isValidJWTStructure(storageData.userToken) : false
          }, 'warning');
          safeRemoveItem('userToken');
          safeRemoveItem('userData');
        }

        // 🎯 CRITICAL: Admin auth check with detailed logging
        debugLog('ADMIN AUTH VALIDATION', {
          hasAdminToken: !!storageData.adminToken,
          hasAdminData: !!storageData.adminData,
          tokenValid: storageData.adminToken ? isValidJWTStructure(storageData.adminToken) : false,
          tokenLength: storageData.adminToken?.length || 0,
          currentUrl: window.location.pathname
        }, 'admin');

        if (storageData.adminToken && storageData.adminData && isValidJWTStructure(storageData.adminToken)) {
          try {
            const parsedAdminData = JSON.parse(storageData.adminData);
            
            if (parsedAdminData && parsedAdminData._id && parsedAdminData.name) {
              debugLog('ADMIN AUTH RESTORED', {
                adminName: parsedAdminData?.name,
                adminId: parsedAdminData?._id,
                adminEmail: parsedAdminData?.email,
                adminRole: parsedAdminData?.role,
                tokenLength: storageData.adminToken.length,
                hasPermissions: !!parsedAdminData?.permissions
              }, 'admin');
              
              setAdminAuth({
                isAuthenticated: true,
                admin: parsedAdminData,
                token: storageData.adminToken,
              });

              debugLog('ADMIN TOKEN VERIFICATION', {
                tokenInState: true,
                tokenInStorage: !!localStorage.getItem('adminToken'),
                tokensMatch: localStorage.getItem('adminToken') === storageData.adminToken,
                currentPath: window.location.pathname
              }, 'admin');

            } else {
              debugLog('ADMIN DATA INVALID STRUCTURE', { 
                hasId: !!parsedAdminData?._id,
                hasName: !!parsedAdminData?.name,
                dataKeys: parsedAdminData ? Object.keys(parsedAdminData) : []
              }, 'error');
              safeRemoveItem('adminToken');
              safeRemoveItem('adminData');
            }
          } catch (error) {
            debugLog('ADMIN DATA PARSE ERROR', { error: error.message }, 'error');
            safeRemoveItem('adminToken');
            safeRemoveItem('adminData');
          }
        } else if (storageData.adminToken || storageData.adminData) {
          debugLog('INCOMPLETE ADMIN AUTH DATA CLEANUP', {
            hasToken: !!storageData.adminToken,
            hasData: !!storageData.adminData,
            tokenValid: storageData.adminToken ? isValidJWTStructure(storageData.adminToken) : false
          }, 'warning');
          safeRemoveItem('adminToken');
          safeRemoveItem('adminData');
        }

        // 🎯 ENHANCED: Check delivery agent auth
        debugLog('DELIVERY AGENT AUTH VALIDATION', {
          hasDeliveryToken: !!storageData.deliveryToken,
          hasDeliveryData: !!storageData.deliveryData,
          tokenValid: storageData.deliveryToken ? isValidJWTStructure(storageData.deliveryToken) : false
        }, 'delivery');

        if (storageData.deliveryToken && storageData.deliveryData && isValidJWTStructure(storageData.deliveryToken)) {
          try {
            const parsedDeliveryData = JSON.parse(storageData.deliveryData);
            
            if (parsedDeliveryData && parsedDeliveryData._id && parsedDeliveryData.name) {
              debugLog('DELIVERY AGENT AUTH RESTORED', {
                agentName: parsedDeliveryData?.name,
                agentId: parsedDeliveryData?._id,
                agentEmail: parsedDeliveryData?.email,
                vehicleType: parsedDeliveryData?.vehicleType
              }, 'delivery');
              
              setDeliveryAgentAuth({
                isAuthenticated: true,
                deliveryAgent: parsedDeliveryData,
                token: storageData.deliveryToken,
              });
            } else {
              debugLog('DELIVERY AGENT DATA INVALID', { 
                hasId: !!parsedDeliveryData?._id,
                hasName: !!parsedDeliveryData?.name 
              }, 'error');
              safeRemoveItem('deliveryAgentToken');
              safeRemoveItem('deliveryAgentData');
            }
          } catch (error) {
            debugLog('DELIVERY AGENT DATA PARSE ERROR', { error: error.message }, 'error');
            safeRemoveItem('deliveryAgentToken');
            safeRemoveItem('deliveryAgentData');
          }
        } else if (storageData.deliveryToken || storageData.deliveryData) {
          debugLog('INCOMPLETE DELIVERY AGENT AUTH CLEANUP', {
            hasToken: !!storageData.deliveryToken,
            hasData: !!storageData.deliveryData
          }, 'warning');
          safeRemoveItem('deliveryAgentToken');
          safeRemoveItem('deliveryAgentData');
        }

        debugLog('AUTH INITIALIZATION COMPLETED', {
          userAuthenticated: !!(storageData.userToken && storageData.userData),
          sellerAuthenticated: !!(storageData.sellerToken && storageData.sellerData),
          adminAuthenticated: !!(storageData.adminToken && storageData.adminData),
          deliveryAgentAuthenticated: !!(storageData.deliveryToken && storageData.deliveryData),
          totalTime: Date.now() - startTime
        }, 'critical');
        
      } catch (error) {
        debugLog('CRITICAL AUTH INIT ERROR', { 
          error: error.message,
          stack: error.stack 
        }, 'critical');
        setInitError(error.message);
        
        // Clear all auth data on critical error
        ['userToken', 'userData', 'sellerToken', 'sellerData', 'adminToken', 'adminData', 'deliveryAgentToken', 'deliveryAgentData'].forEach(key => {
          safeRemoveItem(key);
        });
      } finally {
        setLoading(false);
      }
    };

    const startTime = Date.now();
    const initTimeout = setTimeout(() => {
      debugLog('AUTH INIT TIMEOUT FORCED', { timeoutDuration: 5000 }, 'critical');
      setLoading(false);
    }, 5000);

    initializeAuth().finally(() => {
      clearTimeout(initTimeout);
    });

    return () => {
      clearTimeout(initTimeout);
    };
  }, []);

  // 🎯 ENHANCED: Monitor auth state changes with detailed logging
  useEffect(() => {
    debugLog('AUTH STATE CHANGE DETECTED', {
      userAuth: {
        isAuthenticated: userAuth.isAuthenticated,
        hasUser: !!userAuth.user,
        hasToken: !!userAuth.token,
        userName: userAuth.user?.name
      },
      sellerAuth: {
        isAuthenticated: sellerAuth.isAuthenticated,
        hasSeller: !!sellerAuth.seller,
        hasToken: !!sellerAuth.token,
        sellerName: sellerAuth.seller?.firstName
      },
      adminAuth: {
        isAuthenticated: adminAuth.isAuthenticated,
        hasAdmin: !!adminAuth.admin,
        hasToken: !!adminAuth.token,
        adminName: adminAuth.admin?.name
      },
      deliveryAgentAuth: {
        isAuthenticated: deliveryAgentAuth.isAuthenticated,
        hasAgent: !!deliveryAgentAuth.deliveryAgent,
        hasToken: !!deliveryAgentAuth.token,
        agentName: deliveryAgentAuth.deliveryAgent?.name
      },
      timestamp: new Date().toISOString()
    }, 'info');
  }, [
    userAuth.isAuthenticated, userAuth.user, userAuth.token, 
    sellerAuth.isAuthenticated, sellerAuth.seller, sellerAuth.token,
    adminAuth.isAuthenticated, adminAuth.admin, adminAuth.token,
    deliveryAgentAuth.isAuthenticated, deliveryAgentAuth.deliveryAgent, deliveryAgentAuth.token
  ]);

  // 🎯 ENHANCED: Login functions with comprehensive logging
  const loginUser = async (data) => {
    try {
      debugLog('USER LOGIN INITIATED', {
        hasData: !!data,
        userName: data?.name,
        userEmail: data?.email,
        hasToken: !!data?.token,
        timestamp: new Date().toISOString()
      }, 'critical');

      if (!data || !data.token) {
        throw new Error('Invalid user login data - missing token');
      }

      if (!isValidJWTStructure(data.token)) {
        throw new Error('Invalid token format received from server');
      }

      // Try to get user's location
      try {
        debugLog('ATTEMPTING LOCATION ACCESS', null, 'info');
        const location = await getCurrentLocation();
        if (location && data) {
          data.location = { ...data.location, coordinates: location.coordinates };
          debugLog('LOCATION OBTAINED', { coordinates: location.coordinates }, 'success');
        }
      } catch (error) {
        debugLog('LOCATION ACCESS DENIED', { error: error.message }, 'warning');
      }
      
      debugLog('STORING USER CREDENTIALS', {
        tokenLength: data.token.length,
        userName: data.name,
        userEmail: data.email
      }, 'storage');
      
      const tokenStored = safeSetItem('userToken', data.token);
      const dataStored = safeSetItem('userData', JSON.stringify(data));
      
      if (!tokenStored || !dataStored) {
        throw new Error('Failed to store authentication data');
      }
      
      setUserAuth({
        isAuthenticated: true,
        user: data,
        token: data.token,
      });

      debugLog('USER LOGIN COMPLETED', {
        userName: data.name,
        userId: data._id,
        isAuthenticated: true
      }, 'critical');

      // 🎯 CRITICAL FIX: Auto-update location in backend if detected during login
      if (data.location && data.location.coordinates) {
        try {
          debugLog('AUTO-UPDATING LOCATION IN BACKEND', { 
            coordinates: data.location.coordinates 
          }, 'info');
          
          // Import api instance for proper error handling
          const { default: api } = await import('../services/api');
          
          const updateResponse = await api.put('/users/profile', { 
            location: data.location 
          });
          
          if (updateResponse.data.success) {
            debugLog('LOCATION AUTO-UPDATED SUCCESSFULLY', { 
              coordinates: data.location.coordinates 
            }, 'success');
          } else {
            debugLog('LOCATION AUTO-UPDATE FAILED', { 
              error: updateResponse.data.message 
            }, 'warning');
          }
        } catch (locationError) {
          debugLog('LOCATION AUTO-UPDATE ERROR', { 
            error: locationError.message 
          }, 'warning');
        }
      }
      
    } catch (error) {
      debugLog('USER LOGIN FAILED', {
        error: error.message,
        providedData: data ? Object.keys(data) : 'none'
      }, 'critical');
      
      safeRemoveItem('userToken');
      safeRemoveItem('userData');
      throw error;
    }
  };

  // 🎯 CRITICAL: Enhanced admin login with detailed token tracking
  const loginAdmin = async (data) => {
    try {
      debugLog('ADMIN LOGIN INITIATED', {
        hasData: !!data,
        adminName: data?.name,
        adminEmail: data?.email,
        hasToken: !!data?.token,
        adminRole: data?.role,
        timestamp: new Date().toISOString(),
        currentUrl: window.location.pathname
      }, 'critical');

      if (!data || !data.token) {
        throw new Error('Invalid admin login data - missing token');
      }

      if (!isValidJWTStructure(data.token)) {
        throw new Error('Invalid token format received from server');
      }

      // 🎯 CRITICAL: Clear any existing admin tokens FIRST
      debugLog('CLEARING OLD ADMIN TOKENS', null, 'admin');
      safeRemoveItem('adminToken');
      safeRemoveItem('adminData');
      
      // Force clear React state immediately
      setAdminAuth({
        isAuthenticated: false,
        admin: null,
        token: null,
      });

      // 🎯 CRITICAL: Wait for state to clear
      await new Promise(resolve => setTimeout(resolve, 50));

      // Store new tokens with verification
      debugLog('STORING NEW ADMIN CREDENTIALS', {
        tokenLength: data.token.length,
        adminName: data.name,
        adminRole: data.role
      }, 'admin');

      const tokenStored = safeSetItem('adminToken', data.token);
      const dataStored = safeSetItem('adminData', JSON.stringify(data));
      
      if (!tokenStored || !dataStored) {
        throw new Error('Failed to store admin authentication data');
      }

      // 🎯 CRITICAL: Update React state immediately
      setAdminAuth({
        isAuthenticated: true,
        admin: data,
        token: data.token,
      });

      // 🎯 CRITICAL: Double-verify storage
      const verifyToken = localStorage.getItem('adminToken');
      const verifyData = localStorage.getItem('adminData');
      
      debugLog('ADMIN LOGIN VERIFICATION', {
        tokenStored: !!verifyToken,
        dataStored: !!verifyData,
        tokensMatch: verifyToken === data.token,
        tokenLength: verifyToken?.length,
        stateUpdated: true
      }, 'admin');

      if (!verifyToken || verifyToken !== data.token) {
        throw new Error('Token verification failed - storage issue');
      }

      debugLog('ADMIN LOGIN COMPLETED SUCCESSFULLY', {
        adminId: data._id,
        adminName: data.name,
        adminEmail: data.email,
        adminRole: data.role,
        tokenInState: !!data.token,
        tokenInStorage: !!localStorage.getItem('adminToken')
      }, 'critical');

      return data;
      
    } catch (error) {
      debugLog('ADMIN LOGIN FAILED', { 
        error: error.message,
        stack: error.stack 
      }, 'critical');
      
      // Clean up on failure
      safeRemoveItem('adminToken');
      safeRemoveItem('adminData');
      setAdminAuth({
        isAuthenticated: false,
        admin: null,
        token: null,
      });
      
      throw error;
    }
  };

  // 🎯 CRITICAL FIX: Login seller with comprehensive token cleanup - ASYNC VERSION
  const loginSeller = async (data) => {
    try {
      debugLog('SELLER LOGIN INITIATED', {
        hasData: !!data,
        sellerName: data?.firstName,
        hasToken: !!data?.token
      }, 'info');

      if (!data || !data.token) {
        throw new Error('Invalid seller login data - missing token');
      }

      if (!isValidJWTStructure(data.token)) {
        throw new Error('Invalid token format received from server');
      }

      // 🎯 CRITICAL: Clear ALL old tokens first
      debugLog('CLEARING ALL OLD TOKENS BEFORE SELLER LOGIN', null, 'critical');
      
      // Clear all existing tokens (not just seller tokens)
      safeRemoveItem('userToken');
      safeRemoveItem('userData');
      safeRemoveItem('sellerToken');
      safeRemoveItem('sellerData');
      safeRemoveItem('adminToken');
      safeRemoveItem('adminData');
      safeRemoveItem('deliveryAgentToken');
      safeRemoveItem('deliveryAgentData');

      // Reset all auth states immediately
      setUserAuth({ isAuthenticated: false, user: null, token: null });
      setAdminAuth({ isAuthenticated: false, admin: null, token: null });
      setDeliveryAgentAuth({ isAuthenticated: false, deliveryAgent: null, token: null });

      // 🎯 CRITICAL: Wait for state to clear
      await new Promise(resolve => setTimeout(resolve, 50));

      // Now store the new seller token
      const tokenStored = safeSetItem('sellerToken', data.token);
      const dataStored = safeSetItem('sellerData', JSON.stringify(data));
      
      if (!tokenStored || !dataStored) {
        throw new Error('Failed to store seller authentication data');
      }
      
      // 🎯 CRITICAL: Update React state immediately
      setSellerAuth({
        isAuthenticated: true,
        seller: data,
        token: data.token,
      });

      // 🎯 CRITICAL: Double-verify storage
      const verifyToken = localStorage.getItem('sellerToken');
      const verifyData = localStorage.getItem('sellerData');
      
      debugLog('SELLER LOGIN VERIFICATION', {
        tokenStored: !!verifyToken,
        dataStored: !!verifyData,
        tokensMatch: verifyToken === data.token,
        tokenLength: verifyToken?.length,
        stateUpdated: true
      }, 'success');

      if (!verifyToken || verifyToken !== data.token) {
        throw new Error('Token verification failed - storage issue');
      }

      debugLog('SELLER LOGIN COMPLETED SUCCESSFULLY', {
        sellerId: data._id,
        sellerName: data.firstName,
        sellerEmail: data.email,
        tokenInState: !!data.token,
        tokenInStorage: !!localStorage.getItem('sellerToken')
      }, 'success');

      return data;

    } catch (error) {
      debugLog('SELLER LOGIN FAILED', { error: error.message }, 'error');
      throw error;
    }
  };

  // 🎯 ENHANCED: Login delivery agent with logging
  const loginDeliveryAgent = (data) => {
    try {
      debugLog('DELIVERY AGENT LOGIN INITIATED', {
        hasData: !!data,
        agentName: data?.name,
        agentEmail: data?.email,
        hasToken: !!data?.token,
        vehicleType: data?.vehicleType
      }, 'delivery');

      if (!data || !data.token) {
        throw new Error('Invalid delivery agent login data - missing token');
      }

      if (!isValidJWTStructure(data.token)) {
        throw new Error('Invalid token format received from server');
      }

      const tokenStored = safeSetItem('deliveryAgentToken', data.token);
      const dataStored = safeSetItem('deliveryAgentData', JSON.stringify(data));
      
      if (!tokenStored || !dataStored) {
        throw new Error('Failed to store delivery agent authentication data');
      }
      
      setDeliveryAgentAuth({
        isAuthenticated: true,
        deliveryAgent: data,
        token: data.token,
      });

      debugLog('DELIVERY AGENT LOGIN COMPLETED', {
        agentId: data._id,
        agentName: data.name,
        agentEmail: data.email
      }, 'delivery');
    } catch (error) {
      debugLog('DELIVERY AGENT LOGIN FAILED', { error: error.message }, 'error');
      throw error;
    }
  };

  // 🎯 ENHANCED: Logout functions with logging
  const logoutUser = () => {
    try {
      debugLog('USER LOGOUT INITIATED', {
        userName: userAuth.user?.name,
        userId: userAuth.user?._id
      }, 'warning');
      
      safeRemoveItem('userToken');
      safeRemoveItem('userData');
      
      setUserAuth({
        isAuthenticated: false,
        user: null,
        token: null,
      });

      debugLog('USER LOGOUT COMPLETED', null, 'success');
    } catch (error) {
      debugLog('USER LOGOUT ERROR', { error: error.message }, 'error');
    }
  };

  const logoutSeller = () => {
    try {
      debugLog('SELLER LOGOUT INITIATED', {
        sellerName: sellerAuth.seller?.firstName,
        sellerId: sellerAuth.seller?._id
      }, 'warning');
      
      safeRemoveItem('sellerToken');
      safeRemoveItem('sellerData');
      
      setSellerAuth({
        isAuthenticated: false,
        seller: null,
        token: null,
      });

      debugLog('SELLER LOGOUT COMPLETED', null, 'success');
    } catch (error) {
      debugLog('SELLER LOGOUT ERROR', { error: error.message }, 'error');
    }
  };

  const logoutAdmin = () => {
    try {
      debugLog('ADMIN LOGOUT INITIATED', {
        adminName: adminAuth.admin?.name,
        adminId: adminAuth.admin?._id,
        currentUrl: window.location.pathname
      }, 'critical');
      
      safeRemoveItem('adminToken');
      safeRemoveItem('adminData');
      
      setAdminAuth({
        isAuthenticated: false,
        admin: null,
        token: null,
      });

      debugLog('ADMIN LOGOUT COMPLETED', null, 'critical');
    } catch (error) {
      debugLog('ADMIN LOGOUT ERROR', { error: error.message }, 'critical');
    }
  };

  const logoutDeliveryAgent = () => {
    try {
      debugLog('DELIVERY AGENT LOGOUT INITIATED', {
        agentName: deliveryAgentAuth.deliveryAgent?.name,
        agentId: deliveryAgentAuth.deliveryAgent?._id
      }, 'delivery');
      
      safeRemoveItem('deliveryAgentToken');
      safeRemoveItem('deliveryAgentData');
      
      setDeliveryAgentAuth({
        isAuthenticated: false,
        deliveryAgent: null,
        token: null,
      });

      debugLog('DELIVERY AGENT LOGOUT COMPLETED', null, 'delivery');
    } catch (error) {
      debugLog('DELIVERY AGENT LOGOUT ERROR', { error: error.message }, 'error');
    }
  };

  // 🎯 ENHANCED: Handle authentication errors
  const handleAuthError = (error) => {
    try {
      if (!error?.response) {
        debugLog('Non-response auth error', error);
        return false;
      }
      
      const { status, data } = error.response;
      
      debugLog('HANDLING AUTH ERROR', {
        status,
        errorMessage: data?.message,
        code: data?.code,
        forceLogout: data?.forceLogout
      }, 'error');
      
      if (status === 401) {
        const isJWTError = data?.code === 'INVALID_TOKEN' || 
                          data?.code === 'TOKEN_EXPIRED' || 
                          data?.code === 'MALFORMED_TOKEN' ||
                          data?.code === 'USER_NOT_FOUND' ||
                          data?.code === 'ADMIN_NOT_FOUND' ||
                          data?.forceLogout === true ||
                          data?.message?.toLowerCase().includes('token');
        
        if (isJWTError) {
          debugLog('JWT/AUTH ERROR DETECTED - CLEANING ALL AUTH', {
            code: data?.code,
            forceLogout: data?.forceLogout
          }, 'critical');
          
          // Clear all auth data
          safeRemoveItem('userToken');
          safeRemoveItem('userData');
          safeRemoveItem('sellerToken');
          safeRemoveItem('sellerData');
          safeRemoveItem('adminToken');
          safeRemoveItem('adminData');
          safeRemoveItem('deliveryAgentToken');
          safeRemoveItem('deliveryAgentData');
          
          setUserAuth({ isAuthenticated: false, user: null, token: null });
          setSellerAuth({ isAuthenticated: false, seller: null, token: null });
          setAdminAuth({ isAuthenticated: false, admin: null, token: null });
          setDeliveryAgentAuth({ isAuthenticated: false, deliveryAgent: null, token: null });
          
          if (data?.forceLogout) {
            debugLog('FORCE LOGOUT - Redirecting', null, 'critical');
            setTimeout(() => {
              window.location.href = '/user/login';
            }, 1000);
          }
          
          return true;
        }
      }
      
      return false;
    } catch (handleError) {
      debugLog('ERROR IN AUTH ERROR HANDLER', { error: handleError.message }, 'error');
      return false;
    }
  };

  // 🎯 ENHANCED: Debug function with comprehensive state
  const debugAuth = () => {
    const currentState = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAuth: {
        isAuthenticated: userAuth.isAuthenticated,
        hasUser: !!userAuth.user,
        hasToken: !!userAuth.token,
        userName: userAuth.user?.name,
        tokenLength: userAuth.token?.length || 0
      },
      sellerAuth: {
        isAuthenticated: sellerAuth.isAuthenticated,
        hasSeller: !!sellerAuth.seller,
        hasToken: !!sellerAuth.token,
        sellerName: sellerAuth.seller?.firstName,
        tokenLength: sellerAuth.token?.length || 0
      },
      adminAuth: {
        isAuthenticated: adminAuth.isAuthenticated,
        hasAdmin: !!adminAuth.admin,
        hasToken: !!adminAuth.token,
        adminName: adminAuth.admin?.name,
        adminRole: adminAuth.admin?.role,
        tokenLength: adminAuth.token?.length || 0
      },
      deliveryAgentAuth: {
        isAuthenticated: deliveryAgentAuth.isAuthenticated,
        hasAgent: !!deliveryAgentAuth.deliveryAgent,
        hasToken: !!deliveryAgentAuth.token,
        agentName: deliveryAgentAuth.deliveryAgent?.name,
        tokenLength: deliveryAgentAuth.token?.length || 0
      },
      localStorage: {
        userToken: safeGetItem('userToken') ? 'present' : 'missing',
        userData: safeGetItem('userData') ? 'present' : 'missing',
        sellerToken: safeGetItem('sellerToken') ? 'present' : 'missing',
        sellerData: safeGetItem('sellerData') ? 'present' : 'missing',
        adminToken: safeGetItem('adminToken') ? 'present' : 'missing',
        adminData: safeGetItem('adminData') ? 'present' : 'missing',
        deliveryAgentToken: safeGetItem('deliveryAgentToken') ? 'present' : 'missing',
        deliveryAgentData: safeGetItem('deliveryAgentData') ? 'present' : 'missing'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isDevelopment: process.env.NODE_ENV === 'development'
      }
    };
    
    debugLog('MANUAL AUTH DEBUG REQUESTED', currentState, 'critical');
    return currentState;
  };

  // Update user data in context and localStorage
  const updateUser = (userData) => {
    try {
      debugLog('UPDATING USER DATA', { 
        userData: userData ? { id: userData._id, name: userData.name, hasLocation: !!userData.location } : null 
      }, 'info');
      
      if (!userData || !userData._id) {
        debugLog('UPDATE USER FAILED - Invalid data', { userData }, 'error');
        return;
      }

      const currentToken = userAuth.token || safeGetItem('userToken');
      const dataToStore = { ...userData, token: userData.token || currentToken };

      const dataStored = safeSetItem('userData', JSON.stringify(dataToStore));
      
      if (dataStored) {
        setUserAuth(prevAuth => ({
          ...prevAuth,
          user: dataToStore,
          isAuthenticated: true,
          token: dataToStore.token || prevAuth.token
        }));
        debugLog('USER DATA UPDATED SUCCESSFULLY', { userId: userData._id, userName: userData.name }, 'success');
      } else {
        debugLog('FAILED TO STORE UPDATED USER DATA', null, 'error');
      }

    } catch (error) {
      debugLog('ERROR UPDATING USER DATA', { error: error.message }, 'error');
    }
  };

  // Update delivery agent data
  const updateDeliveryAgent = (agentData) => {
    try {
      debugLog('UPDATING DELIVERY AGENT DATA', { 
        agentData: agentData ? { id: agentData._id, name: agentData.name } : null 
      }, 'delivery');
      
      if (!agentData || !agentData._id) {
        debugLog('UPDATE DELIVERY AGENT FAILED - Invalid data', { agentData }, 'error');
        return;
      }

      const currentToken = deliveryAgentAuth.token || safeGetItem('deliveryAgentToken');
      const dataToStore = { ...agentData, token: agentData.token || currentToken };

      const dataStored = safeSetItem('deliveryAgentData', JSON.stringify(dataToStore));
      
      if (dataStored) {
        setDeliveryAgentAuth(prevAuth => ({
          ...prevAuth,
          deliveryAgent: dataToStore,
          isAuthenticated: true,
          token: dataToStore.token || prevAuth.token
        }));
        debugLog('DELIVERY AGENT DATA UPDATED SUCCESSFULLY', { agentId: agentData._id, agentName: agentData.name }, 'delivery');
      } else {
        debugLog('FAILED TO STORE UPDATED DELIVERY AGENT DATA', null, 'error');
      }

    } catch (error) {
      debugLog('ERROR UPDATING DELIVERY AGENT DATA', { error: error.message }, 'error');
    }
  };

  // Update admin data
  const updateAdmin = (adminData) => {
    try {
      debugLog('UPDATING ADMIN DATA', { 
        adminData: adminData ? { id: adminData._id, name: adminData.name } : null 
      }, 'admin');
      
      if (!adminData || !adminData._id) {
        debugLog('UPDATE ADMIN FAILED - Invalid data', { adminData }, 'error');
        return;
      }

      const currentToken = adminAuth.token || safeGetItem('adminToken');
      const dataToStore = { ...adminData, token: adminData.token || currentToken };

      const dataStored = safeSetItem('adminData', JSON.stringify(dataToStore));
      
      if (dataStored) {
        setAdminAuth(prevAuth => ({
          ...prevAuth,
          admin: dataToStore,
          isAuthenticated: true,
          token: dataToStore.token || prevAuth.token
        }));
        debugLog('ADMIN DATA UPDATED SUCCESSFULLY', { adminId: adminData._id, adminName: adminData.name }, 'admin');
      } else {
        debugLog('FAILED TO STORE UPDATED ADMIN DATA', null, 'error');
      }

    } catch (error) {
      debugLog('ERROR UPDATING ADMIN DATA', { error: error.message }, 'error');
    }
  };

  // Context value
  const contextValue = {
    // Auth states
    sellerAuth,
    userAuth,
    adminAuth,
    deliveryAgentAuth,
    loading,
    initError,
    
    // Auth functions
    loginSeller,
    logoutSeller,
    loginUser,
    logoutUser,
    loginAdmin,
    logoutAdmin,
    loginDeliveryAgent,
    logoutDeliveryAgent,
    handleAuthError,
    
    // Legacy admin support (backward compatibility)
    admin: adminAuth.admin,
    logout: logoutAdmin, // This maps to admin logout for backward compatibility
    
    // Utility functions
    debugAuth,
    updateUser,
    updateDeliveryAgent,
    updateAdmin,
    
    // Debug helpers (only in development)
    ...(process.env.NODE_ENV === 'development' && {
      debugLog,
      _internalState: {
        sellerAuth,
        userAuth,
        adminAuth,
        deliveryAgentAuth,
        loading,
        initError
      }
    })
  };

  // Make debug functions available globally in development
  if (process.env.NODE_ENV === 'development') {
    window.debugAuth = debugAuth;
    window.clearAllTokens = () => {
      debugLog('CLEARING ALL TOKENS FROM DEBUG', null, 'critical');
      ['userToken', 'userData', 'sellerToken', 'sellerData', 'adminToken', 'adminData', 'deliveryAgentToken', 'deliveryAgentData'].forEach(key => {
        safeRemoveItem(key);
      });
      setUserAuth({ isAuthenticated: false, user: null, token: null });
      setSellerAuth({ isAuthenticated: false, seller: null, token: null });
      setAdminAuth({ isAuthenticated: false, admin: null, token: null });
      setDeliveryAgentAuth({ isAuthenticated: false, deliveryAgent: null, token: null });
    };
    
    debugLog('🔧 AUTH DEBUG MODE ENABLED', {
      availableFunctions: [
        'window.debugAuth() - Check complete auth state',
        'window.clearAllTokens() - Clear all authentication data'
      ]
    }, 'info');
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
//frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { getCurrentLocation } from '../utils/locationUtils';

// Enhanced debugging with colors
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336',
      storage: '#9C27B0',
      delivery: '#FF5722',
      admin: '#673AB7' // New color for admin logs
    };
    
    console.log(
      `%c[AuthContext] ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Simple JWT validation - only check basic structure
const isValidJWTStructure = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  try {
    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Each part should be base64-like (basic check)
    for (let part of parts) {
      if (!part || part.length === 0) return false;
    }
    
    return true;
  } catch (error) {
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

  // 🚚 NEW: Delivery Agent Authentication State
  const [deliveryAgentAuth, setDeliveryAgentAuth] = useState({
    isAuthenticated: false,
    deliveryAgent: null,
    token: null,
  });

  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  // Safe localStorage operations
  const safeSetItem = (key, value) => {
    try {
      localStorage.setItem(key, value);
      debugLog(`💾 STORED: ${key}`, { success: true, length: value?.length }, 'storage');
      return true;
    } catch (error) {
      debugLog(`❌ STORAGE ERROR: ${key}`, { error: error.message }, 'error');
      return false;
    }
  };

  const safeGetItem = (key) => {
    try {
      const value = localStorage.getItem(key);
      debugLog(`📖 RETRIEVED: ${key}`, { 
        hasValue: !!value,
        length: value?.length || 0 
      }, 'storage');
      return value;
    } catch (error) {
      debugLog(`❌ RETRIEVAL ERROR: ${key}`, { error: error.message }, 'error');
      return null;
    }
  };

  const safeRemoveItem = (key) => {
    try {
      localStorage.removeItem(key);
      debugLog(`🗑️ REMOVED: ${key}`, { success: true }, 'storage');
      return true;
    } catch (error) {
      debugLog(`❌ REMOVAL ERROR: ${key}`, { error: error.message }, 'error');
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        debugLog('🚀 INITIALIZING AUTH STATE...', null, 'info');
        
        // 🎯 FIX: Batch localStorage operations including admin and delivery agent
        const [
          sellerToken, sellerData, 
          userToken, userData,
          adminToken, adminData,
          deliveryToken, deliveryData
        ] = [
          safeGetItem('sellerToken'),
          safeGetItem('sellerData'),
          safeGetItem('userToken'),
          safeGetItem('userData'),
          safeGetItem('adminToken'),
          safeGetItem('adminData'),
          safeGetItem('deliveryAgentToken'),
          safeGetItem('deliveryAgentData')
        ];

        debugLog('🔍 STORAGE CHECK', {
          sellerToken: !!sellerToken,
          sellerData: !!sellerData,
          userToken: !!userToken,
          userData: !!userData,
          adminToken: !!adminToken,
          adminData: !!adminData,
          deliveryToken: !!deliveryToken,
          deliveryData: !!deliveryData
        }, 'info');

        // Check seller auth
        if (sellerToken && sellerData && isValidJWTStructure(sellerToken)) {
          try {
            const parsedSellerData = JSON.parse(sellerData);
            debugLog('✅ FOUND VALID SELLER AUTH', {
              sellerName: parsedSellerData?.firstName,
              sellerId: parsedSellerData?._id
            }, 'success');
            
            setSellerAuth({
              isAuthenticated: true,
              seller: parsedSellerData,
              token: sellerToken,
            });
          } catch (error) {
            debugLog('❌ CORRUPTED SELLER DATA', { error: error.message }, 'error');
            safeRemoveItem('sellerToken');
            safeRemoveItem('sellerData');
          }
        }

        // Check user auth
        debugLog('🔍 USER AUTH CHECK', {
          hasUserToken: !!userToken,
          hasUserData: !!userData,
          tokenValid: userToken ? isValidJWTStructure(userToken) : false
        }, 'info');

        if (userToken && userData && isValidJWTStructure(userToken)) {
          try {
            const parsedUserData = JSON.parse(userData);
            
            if (parsedUserData && parsedUserData._id && parsedUserData.name) {
              debugLog('✅ FOUND VALID USER AUTH', {
                userName: parsedUserData?.name,
                userId: parsedUserData?._id,
                userEmail: parsedUserData?.email
              }, 'success');
              
              setUserAuth({
                isAuthenticated: true,
                user: parsedUserData,
                token: userToken,
              });
            } else {
              debugLog('❌ INVALID USER DATA STRUCTURE', { 
                hasId: !!parsedUserData?._id,
                hasName: !!parsedUserData?.name 
              }, 'error');
              safeRemoveItem('userToken');
              safeRemoveItem('userData');
            }
          } catch (error) {
            debugLog('❌ CORRUPTED USER DATA', { error: error.message }, 'error');
            safeRemoveItem('userToken');
            safeRemoveItem('userData');
          }
        } else if (userToken || userData) {
          debugLog('🧹 Cleaning incomplete user auth data', {
            hasToken: !!userToken,
            hasData: !!userData,
            tokenValid: userToken ? isValidJWTStructure(userToken) : false
          }, 'warning');
          safeRemoveItem('userToken');
          safeRemoveItem('userData');
        }

        // 🚚 Check delivery agent auth
        debugLog('🚚 DELIVERY AGENT AUTH CHECK', {
          hasDeliveryToken: !!deliveryToken,
          hasDeliveryData: !!deliveryData,
          tokenValid: deliveryToken ? isValidJWTStructure(deliveryToken) : false
        }, 'delivery');

        if (deliveryToken && deliveryData && isValidJWTStructure(deliveryToken)) {
          try {
            const parsedDeliveryData = JSON.parse(deliveryData);
            
            if (parsedDeliveryData && parsedDeliveryData._id && parsedDeliveryData.name) {
              debugLog('✅ FOUND VALID DELIVERY AGENT AUTH', {
                agentName: parsedDeliveryData?.name,
                agentId: parsedDeliveryData?._id,
                agentEmail: parsedDeliveryData?.email,
                vehicleType: parsedDeliveryData?.vehicleType
              }, 'delivery');
              
              setDeliveryAgentAuth({
                isAuthenticated: true,
                deliveryAgent: parsedDeliveryData,
                token: deliveryToken,
              });
            } else {
              debugLog('❌ INVALID DELIVERY AGENT DATA STRUCTURE', { 
                hasId: !!parsedDeliveryData?._id,
                hasName: !!parsedDeliveryData?.name 
              }, 'error');
              safeRemoveItem('deliveryAgentToken');
              safeRemoveItem('deliveryAgentData');
            }
          } catch (error) {
            debugLog('❌ CORRUPTED DELIVERY AGENT DATA', { error: error.message }, 'error');
            safeRemoveItem('deliveryAgentToken');
            safeRemoveItem('deliveryAgentData');
          }
        } else if (deliveryToken || deliveryData) {
          debugLog('🧹 Cleaning incomplete delivery agent auth data', {
            hasToken: !!deliveryToken,
            hasData: !!deliveryData,
            tokenValid: deliveryToken ? isValidJWTStructure(deliveryToken) : false
          }, 'warning');
          safeRemoveItem('deliveryAgentToken');
          safeRemoveItem('deliveryAgentData');
        }

        // 🔧 NEW: Check admin auth
        debugLog('🔧 ADMIN AUTH CHECK', {
          hasAdminToken: !!adminToken,
          hasAdminData: !!adminData,
          tokenValid: adminToken ? isValidJWTStructure(adminToken) : false
        }, 'admin');

        if (adminToken && adminData && isValidJWTStructure(adminToken)) {
          try {
            const parsedAdminData = JSON.parse(adminData);
            
            if (parsedAdminData && parsedAdminData._id && parsedAdminData.name) {
              debugLog('✅ FOUND VALID ADMIN AUTH', {
                adminName: parsedAdminData?.name,
                adminId: parsedAdminData?._id,
                adminEmail: parsedAdminData?.email,
                adminRole: parsedAdminData?.role
              }, 'admin');
              
              setAdminAuth({
                isAuthenticated: true,
                admin: parsedAdminData,
                token: adminToken,
              });
            } else {
              debugLog('❌ INVALID ADMIN DATA STRUCTURE', { 
                hasId: !!parsedAdminData?._id,
                hasName: !!parsedAdminData?.name 
              }, 'error');
              safeRemoveItem('adminToken');
              safeRemoveItem('adminData');
            }
          } catch (error) {
            debugLog('❌ CORRUPTED ADMIN DATA', { error: error.message }, 'error');
            safeRemoveItem('adminToken');
            safeRemoveItem('adminData');
          }
        } else if (adminToken || adminData) {
          debugLog('🧹 Cleaning incomplete admin auth data', {
            hasToken: !!adminToken,
            hasData: !!adminData,
            tokenValid: adminToken ? isValidJWTStructure(adminToken) : false
          }, 'warning');
          safeRemoveItem('adminToken');
          safeRemoveItem('adminData');
        }

        debugLog('🏁 AUTH INITIALIZATION COMPLETED', {
          userAuthenticated: !!(userToken && userData),
          sellerAuthenticated: !!(sellerToken && sellerData),
          adminAuthenticated: !!(adminToken && adminData),
          deliveryAgentAuthenticated: !!(deliveryToken && deliveryData)
        }, 'success');
        
      } catch (error) {
        debugLog('💥 CRITICAL AUTH INIT ERROR', { error: error.message }, 'error');
        setInitError(error.message);
        
        // Clear all auth data on critical error
        ['userToken', 'userData', 'sellerToken', 'sellerData', 'adminToken', 'adminData', 'deliveryAgentToken', 'deliveryAgentData'].forEach(key => {
          safeRemoveItem(key);
        });
      } finally {
        setLoading(false);
      }
    };

    const initTimeout = setTimeout(() => {
      debugLog('⏰ AUTH INIT TIMEOUT - Force completing', null, 'warning');
      setLoading(false);
    }, 5000);

    initializeAuth().finally(() => {
      clearTimeout(initTimeout);
    });

    return () => {
      clearTimeout(initTimeout);
    };
  }, []);

  // Monitor auth state changes for debugging
  useEffect(() => {
    debugLog('🔄 AUTH STATE CHANGED', {
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
      deliveryAgentAuth: {
        isAuthenticated: deliveryAgentAuth.isAuthenticated,
        hasAgent: !!deliveryAgentAuth.deliveryAgent,
        hasToken: !!deliveryAgentAuth.token,
        agentName: deliveryAgentAuth.deliveryAgent?.name
      },
      adminAuth: {
        isAuthenticated: adminAuth.isAuthenticated,
        hasAdmin: !!adminAuth.admin,
        hasToken: !!adminAuth.token,
        adminName: adminAuth.admin?.name
      }
    }, 'info');
  }, [
    userAuth.isAuthenticated, userAuth.user, userAuth.token, 
    sellerAuth.isAuthenticated, sellerAuth.seller, sellerAuth.token,
    deliveryAgentAuth.isAuthenticated, deliveryAgentAuth.deliveryAgent, deliveryAgentAuth.token,
    adminAuth.isAuthenticated, adminAuth.admin, adminAuth.token
  ]);

  // Enhanced login user function
  const loginUser = async (data) => {
    try {
      debugLog('🔑 USER LOGIN STARTED', {
        hasData: !!data,
        userName: data?.name,
        userEmail: data?.email,
        hasToken: !!data?.token
      }, 'info');

      if (!data) {
        throw new Error('No login data provided');
      }

      if (!data.token) {
        debugLog('❌ LOGIN DATA MISSING TOKEN', {
          providedKeys: Object.keys(data)
        }, 'error');
        throw new Error('Invalid user login data - missing token');
      }

      if (!isValidJWTStructure(data.token)) {
        debugLog('❌ INVALID TOKEN STRUCTURE', {
          tokenLength: data.token.length,
          tokenPreview: data.token.substring(0, 30) + '...'
        }, 'error');
        throw new Error('Invalid token format received from server');
      }

      // Try to get user's location
      try {
        debugLog('📍 ATTEMPTING TO GET USER LOCATION...', null, 'info');
        const location = await getCurrentLocation();
        if (location && data) {
          data.location = {
            ...data.location,
            coordinates: location.coordinates
          };
          debugLog('✅ USER LOCATION OBTAINED', {
            coordinates: location.coordinates
          }, 'success');
        }
      } catch (error) {
        debugLog('⚠️ LOCATION ACCESS DENIED', { error: error.message }, 'warning');
      }
      
      debugLog('💾 STORING USER CREDENTIALS...', {
        tokenLength: data.token.length,
        userName: data.name,
        userEmail: data.email
      }, 'info');
      
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

      debugLog('✅ USER LOGIN COMPLETED SUCCESSFULLY', {
        userName: data.name,
        userId: data._id,
        isAuthenticated: true
      }, 'success');
      
    } catch (error) {
      debugLog('💥 USER LOGIN FAILED', {
        error: error.message,
        providedData: data ? Object.keys(data) : 'none'
      }, 'error');
      
      safeRemoveItem('userToken');
      safeRemoveItem('userData');
      
      throw error;
    }
  };

  // Login seller
  const loginSeller = (data) => {
    try {
      debugLog('🏪 SELLER LOGIN STARTED', {
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

      const tokenStored = safeSetItem('sellerToken', data.token);
      const dataStored = safeSetItem('sellerData', JSON.stringify(data));
      
      if (!tokenStored || !dataStored) {
        throw new Error('Failed to store seller authentication data');
      }
      
      setSellerAuth({
        isAuthenticated: true,
        seller: data,
        token: data.token,
      });

      debugLog('✅ SELLER LOGIN COMPLETED', null, 'success');
    } catch (error) {
      debugLog('❌ SELLER LOGIN FAILED', { error: error.message }, 'error');
      throw error;
    }
  };

  // 🔧 NEW: Login admin function
  // 🔧 FIXED: Login admin function with immediate token sync
  const loginAdmin = async (data) => {
    try {
      debugLog('🔧 ADMIN LOGIN STARTED', {
        hasData: !!data,
        adminName: data?.name,
        adminEmail: data?.email,
        hasToken: !!data?.token,
        adminRole: data?.role
      }, 'admin');

      if (!data || !data.token) {
        throw new Error('Invalid admin login data - missing token');
      }

      if (!isValidJWTStructure(data.token)) {
        throw new Error('Invalid token format received from server');
      }

      // 🎯 CRITICAL FIX: Clear any existing admin tokens FIRST
      debugLog('🧹 CLEARING OLD ADMIN TOKENS...', null, 'admin');
      safeRemoveItem('adminToken');
      safeRemoveItem('adminData');
      
      // Force clear React state immediately
      setAdminAuth({
        isAuthenticated: false,
        admin: null,
        token: null,
      });

      // 🎯 CRITICAL FIX: Wait a moment for state to clear
      await new Promise(resolve => setTimeout(resolve, 50));

      // Store new tokens
      debugLog('💾 STORING NEW ADMIN CREDENTIALS...', {
        tokenLength: data.token.length,
        adminName: data.name,
        adminRole: data.role
      }, 'admin');

      const tokenStored = safeSetItem('adminToken', data.token);
      const dataStored = safeSetItem('adminData', JSON.stringify(data));
      
      if (!tokenStored || !dataStored) {
        throw new Error('Failed to store admin authentication data');
      }

      // 🎯 CRITICAL FIX: Update React state immediately
      setAdminAuth({
        isAuthenticated: true,
        admin: data,
        token: data.token,
      });

      // 🎯 CRITICAL FIX: Force update localStorage one more time to ensure consistency
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminData', JSON.stringify(data));

      debugLog('✅ ADMIN LOGIN COMPLETED', {
        adminId: data._id,
        adminName: data.name,
        adminEmail: data.email,
        adminRole: data.role,
        tokenInState: !!data.token,
        tokenInStorage: !!localStorage.getItem('adminToken')
      }, 'admin');

      // 🎯 CRITICAL FIX: Verify tokens are properly stored
      const verifyToken = localStorage.getItem('adminToken');
      const verifyData = localStorage.getItem('adminData');
      
      debugLog('🔍 ADMIN LOGIN VERIFICATION', {
        tokenStored: !!verifyToken,
        dataStored: !!verifyData,
        tokensMatch: verifyToken === data.token,
        tokenLength: verifyToken?.length
      }, 'admin');

      if (!verifyToken || verifyToken !== data.token) {
        throw new Error('Token verification failed - storage issue');
      }

      return data; // Return the data for any additional processing
      
    } catch (error) {
      debugLog('❌ ADMIN LOGIN FAILED', { error: error.message }, 'error');
      
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

  // 🚚 Login delivery agent
  const loginDeliveryAgent = (data) => {
    try {
      debugLog('🚚 DELIVERY AGENT LOGIN STARTED', {
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

      debugLog('✅ DELIVERY AGENT LOGIN COMPLETED', {
        agentId: data._id,
        agentName: data.name,
        agentEmail: data.email
      }, 'delivery');
    } catch (error) {
      debugLog('❌ DELIVERY AGENT LOGIN FAILED', { error: error.message }, 'error');
      throw error;
    }
  };

  // Logout user
  const logoutUser = () => {
    try {
      debugLog('🚪 USER LOGOUT STARTED', null, 'info');
      
      safeRemoveItem('userToken');
      safeRemoveItem('userData');
      
      setUserAuth({
        isAuthenticated: false,
        user: null,
        token: null,
      });

      debugLog('✅ USER LOGOUT COMPLETED', null, 'success');
    } catch (error) {
      debugLog('❌ USER LOGOUT ERROR', { error: error.message }, 'error');
    }
  };

  // Logout seller
  const logoutSeller = () => {
    try {
      debugLog('🚪 SELLER LOGOUT STARTED', null, 'info');
      
      safeRemoveItem('sellerToken');
      safeRemoveItem('sellerData');
      
      setSellerAuth({
        isAuthenticated: false,
        seller: null,
        token: null,
      });

      debugLog('✅ SELLER LOGOUT COMPLETED', null, 'success');
    } catch (error) {
      debugLog('❌ SELLER LOGOUT ERROR', { error: error.message }, 'error');
    }
  };

  // 🔧 NEW: Logout admin
  const logoutAdmin = () => {
    try {
      debugLog('🔧 ADMIN LOGOUT STARTED', null, 'admin');
      
      safeRemoveItem('adminToken');
      safeRemoveItem('adminData');
      
      setAdminAuth({
        isAuthenticated: false,
        admin: null,
        token: null,
      });

      debugLog('✅ ADMIN LOGOUT COMPLETED', null, 'admin');
    } catch (error) {
      debugLog('❌ ADMIN LOGOUT ERROR', { error: error.message }, 'error');
    }
  };

  // 🚚 Logout delivery agent
  const logoutDeliveryAgent = () => {
    try {
      debugLog('🚚 DELIVERY AGENT LOGOUT STARTED', null, 'delivery');
      
      safeRemoveItem('deliveryAgentToken');
      safeRemoveItem('deliveryAgentData');
      
      setDeliveryAgentAuth({
        isAuthenticated: false,
        deliveryAgent: null,
        token: null,
      });

      debugLog('✅ DELIVERY AGENT LOGOUT COMPLETED', null, 'delivery');
    } catch (error) {
      debugLog('❌ DELIVERY AGENT LOGOUT ERROR', { error: error.message }, 'error');
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
      
      debugLog('🚫 HANDLING AUTH ERROR', {
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
                          data?.forceLogout === true ||
                          data?.message?.toLowerCase().includes('token');
        
        if (isJWTError) {
          debugLog('🔑 JWT/AUTH ERROR DETECTED - CLEANING ALL AUTH', {
            code: data?.code,
            forceLogout: data?.forceLogout
          }, 'warning');
          
          // Clear all auth data
          safeRemoveItem('userToken');
          safeRemoveItem('userData');
          safeRemoveItem('sellerToken');
          safeRemoveItem('sellerData');
          safeRemoveItem('adminToken');
          safeRemoveItem('adminData');
          safeRemoveItem('deliveryAgentToken');
          safeRemoveItem('deliveryAgentData');
          
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
          setAdminAuth({
            isAuthenticated: false,
            admin: null,
            token: null,
          });
          setDeliveryAgentAuth({
            isAuthenticated: false,
            deliveryAgent: null,
            token: null,
          });
          
          if (data?.forceLogout) {
            debugLog('🔄 FORCE LOGOUT - Refreshing page', null, 'warning');
            setTimeout(() => {
              window.location.href = '/user/login';
            }, 1000);
          }
          
          return true;
        }
      }
      
      return false;
    } catch (handleError) {
      debugLog('❌ ERROR IN AUTH ERROR HANDLER', { error: handleError.message }, 'error');
      return false;
    }
  };

  // Debug function
  const debugAuth = () => {
    const currentState = {
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
      deliveryAgentAuth: {
        isAuthenticated: deliveryAgentAuth.isAuthenticated,
        hasAgent: !!deliveryAgentAuth.deliveryAgent,
        hasToken: !!deliveryAgentAuth.token,
        agentName: deliveryAgentAuth.deliveryAgent?.name,
        tokenLength: deliveryAgentAuth.token?.length || 0
      },
      adminAuth: {
        isAuthenticated: adminAuth.isAuthenticated,
        hasAdmin: !!adminAuth.admin,
        hasToken: !!adminAuth.token,
        adminName: adminAuth.admin?.name,
        tokenLength: adminAuth.token?.length || 0
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
      }
    };
    
    debugLog('🔧 MANUAL AUTH DEBUG', currentState, 'info');
    return currentState;
  };

  // Update user data in context and localStorage
  const updateUser = (userData) => {
    try {
      debugLog('🔄 Updating user data in context and storage...', { userData: userData ? { id: userData._id, name: userData.name, hasLocation: !!userData.location } : null }, 'info');
      if (!userData || !userData._id) {
        debugLog('❌ updateUser called with invalid data', { userData }, 'error');
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
        debugLog('✅ User data updated successfully', { userId: userData._id, userName: userData.name }, 'success');
      } else {
        debugLog('❌ Failed to store updated user data', null, 'error');
      }

    } catch (error) {
      debugLog('💥 Error updating user data:', { error: error.message }, 'error');
    }
  };

  // 🚚 Update delivery agent data
  const updateDeliveryAgent = (agentData) => {
    try {
      debugLog('🚚 Updating delivery agent data in context and storage...', { agentData: agentData ? { id: agentData._id, name: agentData.name } : null }, 'delivery');
      if (!agentData || !agentData._id) {
        debugLog('❌ updateDeliveryAgent called with invalid data', { agentData }, 'error');
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
        debugLog('✅ Delivery agent data updated successfully', { agentId: agentData._id, agentName: agentData.name }, 'delivery');
      } else {
        debugLog('❌ Failed to store updated delivery agent data', null, 'error');
      }

    } catch (error) {
      debugLog('💥 Error updating delivery agent data:', { error: error.message }, 'error');
    }
  };

  // 🔧 NEW: Update admin data
  const updateAdmin = (adminData) => {
    try {
      debugLog('🔧 Updating admin data in context and storage...', { adminData: adminData ? { id: adminData._id, name: adminData.name } : null }, 'admin');
      if (!adminData || !adminData._id) {
        debugLog('❌ updateAdmin called with invalid data', { adminData }, 'error');
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
        debugLog('✅ Admin data updated successfully', { adminId: adminData._id, adminName: adminData.name }, 'admin');
      } else {
        debugLog('❌ Failed to store updated admin data', null, 'error');
      }

    } catch (error) {
      debugLog('💥 Error updating admin data:', { error: error.message }, 'error');
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
    loginAdmin, // 🔧 NEW: Admin login function
    logoutAdmin, // 🔧 NEW: Admin logout function
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
    updateAdmin, // 🔧 NEW: Update admin function
    
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
    
    debugLog('🔧 AUTH DEBUG MODE ENABLED', {
      availableFunctions: ['window.debugAuth() - Check complete auth state']
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
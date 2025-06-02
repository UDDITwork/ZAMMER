// Debug utilities for development environment only
// This file helps with troubleshooting authentication and cart issues

// Enhanced debugging with colors
const debugLog = (message, data = null, type = 'info') => {
    if (process.env.NODE_ENV === 'development') {
      const colors = {
        info: '#2196F3',
        success: '#4CAF50', 
        warning: '#FF9800',
        error: '#F44336',
        debug: '#9C27B0'
      };
      
      console.log(
        `%c[DebugUtils] ${message}`,
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
  
  // Comprehensive authentication debug
  export const debugAuthState = () => {
    debugLog('🔧 COMPREHENSIVE AUTH DEBUG STARTED', null, 'debug');
    
    // Check localStorage
    const userToken = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');
    const sellerToken = localStorage.getItem('sellerToken');
    const sellerData = localStorage.getItem('sellerData');
    
    const authDebugData = {
      localStorage: {
        userToken: userToken ? {
          exists: true,
          length: userToken.length,
          preview: `${userToken.substring(0, 30)}...`,
          isValidStructure: isValidJWTStructure(userToken),
          parts: userToken.split('.').length
        } : { exists: false },
        userData: userData ? {
          exists: true,
          length: userData.length,
          preview: userData.substring(0, 100) + '...',
          canParse: (() => {
            try {
              JSON.parse(userData);
              return true;
            } catch {
              return false;
            }
          })()
        } : { exists: false },
        sellerToken: sellerToken ? {
          exists: true,
          length: sellerToken.length,
          preview: `${sellerToken.substring(0, 30)}...`,
          isValidStructure: isValidJWTStructure(sellerToken)
        } : { exists: false },
        sellerData: sellerData ? {
          exists: true,
          length: sellerData.length
        } : { exists: false },
        allKeys: Object.keys(localStorage),
        totalStorageSize: JSON.stringify(localStorage).length
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        reactAppApiUrl: process.env.REACT_APP_API_URL,
        isDevelopment: process.env.NODE_ENV === 'development'
      },
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      }
    };
    
    debugLog('📊 AUTH DEBUG REPORT', authDebugData, 'debug');
    
    // Parse and display user data if available
    if (userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        debugLog('👤 PARSED USER DATA', {
          id: parsedUserData._id,
          name: parsedUserData.name,
          email: parsedUserData.email,
          hasLocation: !!parsedUserData.location,
          tokenInData: !!parsedUserData.token
        }, 'debug');
      } catch (error) {
        debugLog('❌ USER DATA PARSE ERROR', { error: error.message }, 'error');
      }
    }
    
    return authDebugData;
  };
  
  // Debug API configuration
  export const debugAPIConfig = () => {
    debugLog('🔧 API CONFIG DEBUG', null, 'debug');
    
    // Get current API base URL
    const baseURL = process.env.REACT_APP_API_URL || 
                   (process.env.NODE_ENV === 'development' ? '/api' : 'http://localhost:5000/api');
    
    const apiDebugData = {
      baseURL,
      environment: process.env.NODE_ENV,
      envVars: {
        REACT_APP_API_URL: process.env.REACT_APP_API_URL,
        NODE_ENV: process.env.NODE_ENV
      },
      currentDomain: window.location.origin,
      currentPath: window.location.pathname
    };
    
    debugLog('📊 API CONFIG REPORT', apiDebugData, 'debug');
    return apiDebugData;
  };
  
  // Test authentication flow
  export const testAuthFlow = async () => {
    debugLog('🧪 TESTING AUTH FLOW', null, 'debug');
    
    try {
      // Import api dynamically to avoid circular dependencies
      const { default: api } = await import('../services/api');
      
      // Test API connection
      debugLog('🌐 Testing API connection...', null, 'debug');
      
      try {
        const healthResponse = await api.get('/health');
        debugLog('✅ API Health Check Passed', {
          status: healthResponse.status,
          data: healthResponse.data
        }, 'success');
      } catch (healthError) {
        debugLog('❌ API Health Check Failed', {
          message: healthError.message,
          status: healthError.response?.status
        }, 'error');
      }
      
      // Test protected route (cart)
      debugLog('🛒 Testing protected route (cart)...', null, 'debug');
      
      try {
        const cartResponse = await api.get('/cart');
        debugLog('✅ Cart Request Successful', {
          status: cartResponse.status,
          success: cartResponse.data?.success,
          itemCount: cartResponse.data?.data?.items?.length || 0
        }, 'success');
      } catch (cartError) {
        debugLog('❌ Cart Request Failed', {
          message: cartError.message,
          status: cartError.response?.status,
          errorCode: cartError.response?.data?.code,
          requiresAuth: cartError.response?.data?.requiresAuth
        }, 'error');
      }
      
    } catch (importError) {
      debugLog('❌ Failed to import API service', {
        error: importError.message
      }, 'error');
    }
  };
  
  // Clean up authentication data
  export const cleanupAuthData = () => {
    debugLog('🧹 CLEANING UP AUTH DATA', null, 'debug');
    
    const beforeCleanup = {
      userToken: !!localStorage.getItem('userToken'),
      userData: !!localStorage.getItem('userData'),
      sellerToken: !!localStorage.getItem('sellerToken'),
      sellerData: !!localStorage.getItem('sellerData')
    };
    
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerData');
    
    const afterCleanup = {
      userToken: !!localStorage.getItem('userToken'),
      userData: !!localStorage.getItem('userData'),
      sellerToken: !!localStorage.getItem('sellerToken'),
      sellerData: !!localStorage.getItem('sellerData')
    };
    
    debugLog('✅ AUTH DATA CLEANUP COMPLETED', {
      before: beforeCleanup,
      after: afterCleanup
    }, 'success');
    
    return { before: beforeCleanup, after: afterCleanup };
  };
  
  // Set test user data for debugging
  export const setTestUserData = () => {
    debugLog('🧪 SETTING TEST USER DATA', null, 'debug');
    
    const testUserData = {
      _id: 'test-user-id-123',
      name: 'Test User',
      email: 'test@example.com',
      mobileNumber: '9999999999',
      location: {
        coordinates: [77.2090, 28.6139],
        address: 'New Delhi, India'
      },
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci1pZC0xMjMiLCJpYXQiOjE2MzE2MTYwMDAsImV4cCI6MTYzNDIwODAwMH0.test-signature'
    };
    
    localStorage.setItem('userToken', testUserData.token);
    localStorage.setItem('userData', JSON.stringify(testUserData));
    
    debugLog('✅ TEST USER DATA SET', {
      token: testUserData.token.substring(0, 30) + '...',
      user: {
        name: testUserData.name,
        email: testUserData.email
      }
    }, 'success');
    
    return testUserData;
  };
  
  // Full system diagnosis
  export const runFullDiagnosis = async () => {
    debugLog('🔬 RUNNING FULL SYSTEM DIAGNOSIS', null, 'debug');
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      authState: debugAuthState(),
      apiConfig: debugAPIConfig()
    };
    
    // Test auth flow
    await testAuthFlow();
    
    debugLog('📋 FULL DIAGNOSIS COMPLETED', diagnosis, 'debug');
    
    return diagnosis;
  };
  
  // Make debug functions available globally in development
  if (process.env.NODE_ENV === 'development') {
    window.debugUtils = {
      debugAuthState,
      debugAPIConfig,
      testAuthFlow,
      cleanupAuthData,
      setTestUserData,
      runFullDiagnosis
    };
    
    debugLog('🔧 DEBUG UTILS LOADED', {
      availableFunctions: [
        'window.debugUtils.debugAuthState() - Check authentication state',
        'window.debugUtils.debugAPIConfig() - Check API configuration',
        'window.debugUtils.testAuthFlow() - Test authentication flow',
        'window.debugUtils.cleanupAuthData() - Clean up all auth data',
        'window.debugUtils.setTestUserData() - Set test user data',
        'window.debugUtils.runFullDiagnosis() - Run complete system diagnosis'
      ]
    }, 'debug');
  }
  
  export default {
    debugAuthState,
    debugAPIConfig,
    testAuthFlow,
    cleanupAuthData,
    setTestUserData,
    runFullDiagnosis
  };
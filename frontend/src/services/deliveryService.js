// 🚚 DELIVERY SERVICE - COMPREHENSIVE LOGGING
// services/deliveryService.js 
// 🚚 DELIVERY SERVICE LOGGING UTILITIES
const logDeliveryService = (action, data, type = 'info') => {
  const timestamp = new Date().toISOString();
  const logColor = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[36m';
  const resetColor = '\x1b[0m';
  
  console.log(`${logColor}🚚 [DELIVERY-SERVICE] ${timestamp} | ${action} | ${JSON.stringify(data)}${resetColor}`);
};

const logDeliveryServiceError = (action, error, additionalData = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`\x1b[31m🚚 [DELIVERY-SERVICE-ERROR] ${timestamp} | ${action} | Error: ${error.message} | Stack: ${error.stack} | Data: ${JSON.stringify(additionalData)}\x1b[0m`);
};

const logDelivery = (action, data, type = 'info') => {
  const timestamp = new Date().toISOString();
  const logColor = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[36m';
  const resetColor = '\x1b[0m';
  
  console.log(`${logColor}🚚 [DELIVERY-SERVICE] ${timestamp} | ${action} | ${JSON.stringify(data)}${resetColor}`);
};

const handleDeliveryError = (error, operation) => {
  const errorInfo = {
    message: error.message,
    status: error.status || 'unknown',
    operation,
    timestamp: new Date().toISOString(),
    url: error.url || 'unknown',
    method: error.method || 'unknown'
  };

  logDeliveryServiceError(operation, error, errorInfo);

  // Log to browser console for debugging
  console.error(`🚚 Delivery Service Error in ${operation}:`, error);
  
  return {
    success: false,
    message: error.message || 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? error : 'Internal error'
  };
};

// 🚚 API BASE CONFIGURATION
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('deliveryAgentToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const makeApiCall = async (endpoint, options = {}) => {
  const startTime = Date.now();
  const url = `${API_BASE_URL}${endpoint}`;
  
  logDeliveryService('API_CALL_STARTED', { 
    url, 
    method: options.method || 'GET',
    hasAuth: !!localStorage.getItem('deliveryAgentToken')
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });

    const processingTime = Date.now() - startTime;
    const responseData = await response.json();

    if (response.ok) {
      logDeliveryService('API_CALL_SUCCESS', { 
        url, 
        status: response.status,
        processingTime: `${processingTime}ms`,
        dataKeys: Object.keys(responseData)
      }, 'success');
      return responseData;
    } else {
      logDeliveryServiceError('API_CALL_FAILED', new Error(responseData.message || 'API call failed'), {
        url,
        status: response.status,
        processingTime: `${processingTime}ms`,
        responseData
      });
      throw new Error(responseData.message || `HTTP ${response.status}`);
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryServiceError('API_CALL_ERROR', error, {
      url,
      processingTime: `${processingTime}ms`
    });
    throw error;
  }
};

// 🚚 DELIVERY SERVICE CLASS
class DeliveryService {
  constructor() {
    logDeliveryService('SERVICE_INITIALIZED', { 
      apiBaseUrl: API_BASE_URL,
      hasToken: !!localStorage.getItem('deliveryAgentToken')
    });
  }

  // 🚚 REGISTER DELIVERY AGENT
  async registerDeliveryAgent(agentData) {
    const startTime = Date.now();
    
    try {
      logDeliveryService('REGISTRATION_STARTED', { 
        email: agentData.email,
        name: agentData.name,
        hasVehicleDetails: !!agentData.vehicleType
      });

      const response = await makeApiCall('/delivery/register', {
        method: 'POST',
        body: JSON.stringify(agentData)
      });

      if (response.success) {
        // Store authentication data
        localStorage.setItem('deliveryAgentToken', response.data.token);
        localStorage.setItem('deliveryAgentData', JSON.stringify(response.data));

        const processingTime = Date.now() - startTime;
        logDeliveryService('REGISTRATION_SUCCESS', { 
          agentId: response.data._id,
          email: response.data.email,
          processingTime: `${processingTime}ms`,
          tokenStored: !!response.data.token
        }, 'success');

        return response;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logDeliveryServiceError('REGISTRATION_FAILED', error, { 
        agentData: { email: agentData.email, name: agentData.name },
        processingTime: `${processingTime}ms`
      });
      throw error;
    }
  }

  // 🚚 LOGIN DELIVERY AGENT
  async loginDeliveryAgent(credentials) {
    const startTime = Date.now();
    
    try {
      logDeliveryService('LOGIN_STARTED', { 
        email: credentials.email,
        hasPassword: !!credentials.password
      });

      const response = await makeApiCall('/delivery/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      if (response.success) {
        // Store authentication data
        localStorage.setItem('deliveryAgentToken', response.data.token);
        localStorage.setItem('deliveryAgentData', JSON.stringify(response.data));

        const processingTime = Date.now() - startTime;
        logDeliveryService('LOGIN_SUCCESS', { 
          agentId: response.data._id,
          email: response.data.email,
          processingTime: `${processingTime}ms`,
          tokenStored: !!response.data.token
        }, 'success');

        return response;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logDeliveryServiceError('LOGIN_FAILED', error, { 
        credentials: { email: credentials.email },
        processingTime: `${processingTime}ms`
      });
      throw error;
    }
  }

  // 🚚 LOGOUT DELIVERY AGENT
  async logoutDeliveryAgent() {
    try {
      logDeliveryService('LOGOUT_STARTED', { 
        hasToken: !!localStorage.getItem('deliveryAgentToken')
      });

      // Clear stored data
      localStorage.removeItem('deliveryAgentToken');
      localStorage.removeItem('deliveryAgentData');

      logDeliveryService('LOGOUT_SUCCESS', { 
        dataCleared: true
      }, 'success');

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      logDeliveryServiceError('LOGOUT_FAILED', error);
      throw error;
    }
  }

  // 🚚 GET PROFILE
  async getProfile() {
    try {
      logDeliveryService('PROFILE_REQUEST_STARTED');

      const response = await makeApiCall('/delivery/profile');

      if (response.success) {
        logDeliveryService('PROFILE_RETRIEVED', { 
          agentId: response.data._id,
          email: response.data.email
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to get profile');
      }
    } catch (error) {
      logDeliveryServiceError('PROFILE_RETRIEVAL_FAILED', error);
      throw error;
    }
  }

  // 🚚 UPDATE PROFILE
  async updateProfile(profileData) {
    const startTime = Date.now();
    
    try {
      logDeliveryService('PROFILE_UPDATE_STARTED', { 
        updateFields: Object.keys(profileData)
      });

      const response = await makeApiCall('/delivery/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });

      if (response.success) {
        const processingTime = Date.now() - startTime;
        logDeliveryService('PROFILE_UPDATE_SUCCESS', { 
          agentId: response.data._id,
          processingTime: `${processingTime}ms`
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logDeliveryServiceError('PROFILE_UPDATE_FAILED', error, { 
        processingTime: `${processingTime}ms`
      });
      throw error;
    }
  }

  // 🚚 GET AVAILABLE ORDERS
  async getAvailableOrders() {
    try {
      logDeliveryService('AVAILABLE_ORDERS_REQUEST_STARTED');

      const response = await makeApiCall('/delivery/orders/available');

      if (response.success) {
        logDeliveryService('AVAILABLE_ORDERS_RETRIEVED', { 
          orderCount: response.data.length
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to get available orders');
      }
    } catch (error) {
      logDeliveryServiceError('AVAILABLE_ORDERS_FAILED', error);
      throw error;
    }
  }

  // 🚚 GET ASSIGNED ORDERS
  async getAssignedOrders() {
    try {
      logDeliveryService('ASSIGNED_ORDERS_REQUEST_STARTED');

      const response = await makeApiCall('/delivery/orders/assigned');

      if (response.success) {
        logDeliveryService('ASSIGNED_ORDERS_RETRIEVED', { 
          orderCount: response.data.length
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to get assigned orders');
      }
    } catch (error) {
      logDeliveryServiceError('ASSIGNED_ORDERS_FAILED', error);
      throw error;
    }
  }

  // 🚚 ACCEPT ORDER
  async acceptOrder(orderId) {
    const startTime = Date.now();
    
    try {
      logDeliveryService('ORDER_ACCEPT_STARTED', { orderId });

      const response = await makeApiCall(`/delivery/orders/${orderId}/accept`, {
        method: 'POST'
      });

      if (response.success) {
        const processingTime = Date.now() - startTime;
        logDeliveryService('ORDER_ACCEPT_SUCCESS', { 
          orderId,
          processingTime: `${processingTime}ms`
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to accept order');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logDeliveryServiceError('ORDER_ACCEPT_FAILED', error, { 
        orderId,
        processingTime: `${processingTime}ms`
      });
      throw error;
    }
  }

  // 🚚 COMPLETE PICKUP
  async completePickup(orderId, pickupData) {
    const startTime = Date.now();
    
    try {
      logDeliveryService('PICKUP_COMPLETE_STARTED', { 
        orderId,
        hasPickupData: !!pickupData
      });

      const response = await makeApiCall(`/delivery/orders/${orderId}/pickup`, {
        method: 'PUT',
        body: JSON.stringify(pickupData)
      });

      if (response.success) {
        const processingTime = Date.now() - startTime;
        logDeliveryService('PICKUP_COMPLETE_SUCCESS', { 
          orderId,
          processingTime: `${processingTime}ms`
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to complete pickup');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logDeliveryServiceError('PICKUP_COMPLETE_FAILED', error, { 
        orderId,
        processingTime: `${processingTime}ms`
      });
      throw error;
    }
  }

  // 🚚 COMPLETE DELIVERY
  async completeDelivery(orderId, deliveryData) {
    const startTime = Date.now();
    
    try {
      logDeliveryService('DELIVERY_COMPLETE_STARTED', { 
        orderId,
        hasDeliveryData: !!deliveryData
      });

      const response = await makeApiCall(`/delivery/orders/${orderId}/deliver`, {
        method: 'PUT',
        body: JSON.stringify(deliveryData)
      });

      if (response.success) {
        const processingTime = Date.now() - startTime;
        logDeliveryService('DELIVERY_COMPLETE_SUCCESS', { 
          orderId,
          processingTime: `${processingTime}ms`
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to complete delivery');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logDeliveryServiceError('DELIVERY_COMPLETE_FAILED', error, { 
        orderId,
        processingTime: `${processingTime}ms`
      });
      throw error;
    }
  }

  // 🚚 UPDATE LOCATION
  async updateLocation(latitude, longitude) {
    try {
      logDeliveryService('LOCATION_UPDATE_STARTED', { latitude, longitude });

      const response = await makeApiCall('/delivery/location', {
        method: 'PUT',
        body: JSON.stringify({ latitude, longitude })
      });

      if (response.success) {
        logDeliveryService('LOCATION_UPDATE_SUCCESS', { 
          coordinates: [latitude, longitude]
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to update location');
      }
    } catch (error) {
      logDeliveryServiceError('LOCATION_UPDATE_FAILED', error);
      throw error;
    }
  }

  // 🚚 TOGGLE AVAILABILITY
  async toggleAvailability() {
    try {
      logDeliveryService('AVAILABILITY_TOGGLE_STARTED');

      const response = await makeApiCall('/delivery/availability', {
        method: 'PUT'
      });

      if (response.success) {
        logDeliveryService('AVAILABILITY_TOGGLE_SUCCESS', { 
          newStatus: response.data.isAvailable
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to toggle availability');
      }
    } catch (error) {
      logDeliveryServiceError('AVAILABILITY_TOGGLE_FAILED', error);
      throw error;
    }
  }

  // 🚚 GET DELIVERY STATS
  async getDeliveryStats() {
    try {
      logDeliveryService('STATS_REQUEST_STARTED');

      const response = await makeApiCall('/delivery/stats');

      if (response.success) {
        logDeliveryService('STATS_RETRIEVED', { 
          totalDeliveries: response.data.totalDeliveries,
          totalEarnings: response.data.totalEarnings
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to get delivery statistics');
      }
    } catch (error) {
      logDeliveryServiceError('STATS_RETRIEVAL_FAILED', error);
      throw error;
    }
  }

  // 🚚 GET DELIVERY HISTORY
  async getDeliveryHistory(page = 1, limit = 10) {
    try {
      logDeliveryService('HISTORY_REQUEST_STARTED', { page, limit });

      const response = await makeApiCall(`/delivery/history?page=${page}&limit=${limit}`);

      if (response.success) {
        logDeliveryService('HISTORY_RETRIEVED', { 
          orderCount: response.data.orders.length,
          totalOrders: response.data.totalOrders,
          page
        }, 'success');
        return response;
      } else {
        throw new Error(response.message || 'Failed to get delivery history');
      }
    } catch (error) {
      logDeliveryServiceError('HISTORY_RETRIEVAL_FAILED', error);
      throw error;
    }
  }

  // 🚚 LOCATION TRACKING
  startLocationTracking(options = {}) {
    const { interval = 30000, enableHighAccuracy = true } = options;
    
    logDeliveryService('LOCATION_TRACKING_STARTED', { 
      interval,
      enableHighAccuracy
    });

    if (!navigator.geolocation) {
      const error = new Error('Geolocation is not supported by this browser');
      logDeliveryServiceError('LOCATION_TRACKING_NOT_SUPPORTED', error);
      throw error;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        logDeliveryService('LOCATION_TRACKING_SUCCESS', { 
          latitude, 
          longitude,
          accuracy: position.coords.accuracy
        }, 'success');
        
        // Update location on server
        this.updateLocation(latitude, longitude).catch(error => {
          logDeliveryServiceError('LOCATION_UPDATE_FAILED', error);
        });
      },
      (error) => {
        logDeliveryServiceError('LOCATION_TRACKING_ERROR', error, {
          errorCode: error.code,
          errorMessage: this.getLocationErrorMessage(error.code)
        });
      },
      {
        enableHighAccuracy,
        timeout: 10000,
        maximumAge: 60000
      }
    );

    logDeliveryService('LOCATION_TRACKING_WATCH_ID', { watchId });
    return watchId;
  }

  stopLocationTracking(watchId) {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      logDeliveryService('LOCATION_TRACKING_STOPPED', { watchId });
    }
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      logDeliveryService('CURRENT_LOCATION_REQUEST_STARTED');

      if (!navigator.geolocation) {
        const error = new Error('Geolocation is not supported');
        logDeliveryServiceError('CURRENT_LOCATION_NOT_SUPPORTED', error);
        reject(error);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          logDeliveryService('CURRENT_LOCATION_SUCCESS', { 
            latitude, 
            longitude,
            accuracy: position.coords.accuracy
          }, 'success');
          resolve({ latitude, longitude });
        },
        (error) => {
          logDeliveryServiceError('CURRENT_LOCATION_ERROR', error, {
            errorCode: error.code,
            errorMessage: this.getLocationErrorMessage(error.code)
          });
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  getLocationErrorMessage(errorCode) {
    switch (errorCode) {
      case 1:
        return 'Permission denied';
      case 2:
        return 'Position unavailable';
      case 3:
        return 'Timeout';
      default:
        return 'Unknown error';
    }
  }

  // 🚚 AUTHENTICATION HELPERS
  isLoggedIn() {
    const token = localStorage.getItem('deliveryAgentToken');
    const isLoggedIn = !!token;
    
    logDeliveryService('AUTH_CHECK', { 
      isLoggedIn,
      hasToken: !!token
    });
    
    return isLoggedIn;
  }

  getStoredAgentData() {
    try {
      const data = localStorage.getItem('deliveryAgentData');
      if (data) {
        const parsedData = JSON.parse(data);
        logDeliveryService('STORED_DATA_RETRIEVED', { 
          agentId: parsedData._id,
          email: parsedData.email
        });
        return parsedData;
      }
      return null;
    } catch (error) {
      logDeliveryServiceError('STORED_DATA_PARSE_ERROR', error);
      return null;
    }
  }

  // 🚚 UTILITY METHODS
  formatOrderForAgent(order) {
    return {
      id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      deliveryAddress: order.deliveryAddress,
      pickupAddress: order.pickupAddress,
      customer: order.user,
      seller: order.seller,
      items: order.items,
      deliveryFees: order.deliveryFees,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt
    };
  }

  formatStatsForDisplay(stats) {
    return {
      totalDeliveries: stats.totalDeliveries || 0,
      completedDeliveries: stats.completedDeliveries || 0,
      pendingDeliveries: stats.pendingDeliveries || 0,
      totalEarnings: stats.totalEarnings || 0,
      averageRating: stats.averageRating || 0,
      thisWeek: stats.thisWeek || { deliveries: 0, earnings: 0 },
      thisMonth: stats.thisMonth || { deliveries: 0, earnings: 0 }
    };
  }

  validateOrderId(orderIdVerification, actualOrderNumber) {
    const isValid = orderIdVerification === actualOrderNumber;
    
    logDeliveryService('ORDER_ID_VALIDATION', { 
      provided: orderIdVerification,
      actual: actualOrderNumber,
      isValid
    });
    
    return isValid;
  }

  validateOTP(otp) {
    const isValid = otp && otp.length === 6 && /^\d{6}$/.test(otp);
    
    logDeliveryService('OTP_VALIDATION', { 
      hasOTP: !!otp,
      otpLength: otp?.length,
      isValid
    });
    
    return isValid;
  }

  // 🚚 HEALTH CHECK
  async healthCheck() {
    try {
      logDeliveryService('HEALTH_CHECK_STARTED');

      const response = await makeApiCall('/health');

      logDeliveryService('HEALTH_CHECK_SUCCESS', { 
        status: response.status,
        uptime: response.uptime
      }, 'success');

      return response;
    } catch (error) {
      logDeliveryServiceError('HEALTH_CHECK_FAILED', error);
      throw error;
    }
  }

  // 🚚 CLEAR STORED DATA
  clearStoredData() {
    try {
      localStorage.removeItem('deliveryAgentToken');
      localStorage.removeItem('deliveryAgentData');
      
      logDeliveryService('STORED_DATA_CLEARED', { 
        dataCleared: true
      }, 'success');
    } catch (error) {
      logDeliveryServiceError('STORED_DATA_CLEAR_FAILED', error);
    }
  }

  // 🚚 DEBUG METHOD
  debug() {
    const debugInfo = {
      isLoggedIn: this.isLoggedIn(),
      hasToken: !!localStorage.getItem('deliveryAgentToken'),
      hasStoredData: !!localStorage.getItem('deliveryAgentData'),
      apiBaseUrl: API_BASE_URL,
      userAgent: navigator.userAgent,
      geolocationSupported: !!navigator.geolocation
    };

    logDeliveryService('DEBUG_INFO', debugInfo);
    return debugInfo;
  }
}

// 🚚 CREATE AND EXPORT SERVICE INSTANCE
const deliveryService = new DeliveryService();

export default deliveryService;
 // frontend/src/services/deliveryService.js - Delivery Agent Frontend Service

import api from './api';

// Enhanced logging for development
const logDelivery = (action, data, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[DELIVERY-SERVICE] ${action}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Error handler for delivery operations
const handleDeliveryError = (error, operation) => {
  logDelivery(`${operation} Error`, error, 'error');
  
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          success: false,
          message: data.message || 'Invalid request',
          errorCode: 'INVALID_REQUEST',
          errors: data.errors || []
        };
      case 401:
        return {
          success: false,
          message: 'Please login as delivery agent',
          errorCode: 'UNAUTHORIZED',
          requiresAuth: true
        };
      case 403:
        return {
          success: false,
          message: data.message || 'Access forbidden',
          errorCode: 'FORBIDDEN'
        };
      case 404:
        return {
          success: false,
          message: data.message || 'Resource not found',
          errorCode: 'NOT_FOUND'
        };
      case 409:
        return {
          success: false,
          message: data.message || 'Conflict occurred',
          errorCode: 'CONFLICT'
        };
      case 500:
        return {
          success: false,
          message: 'Server error. Please try again.',
          errorCode: 'SERVER_ERROR'
        };
      default:
        return {
          success: false,
          message: data.message || 'Operation failed',
          errorCode: 'API_ERROR'
        };
    }
  } else if (error.request) {
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      errorCode: 'NETWORK_ERROR'
    };
  } else {
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
};

// Delivery Service Class
class DeliveryService {
  constructor() {
    this.locationWatcher = null;
    this.locationUpdateInterval = null;
  }

  // 🎯 AUTHENTICATION METHODS

  // Register delivery agent
  async registerDeliveryAgent(agentData) {
    try {
      logDelivery('Registering Delivery Agent', {
        name: agentData.name,
        email: agentData.email,
        vehicleType: agentData.vehicleType
      }, 'info');

      const response = await api.post('/delivery/register', {
        name: agentData.name,
        email: agentData.email,
        password: agentData.password,
        phone: agentData.phone,
        address: agentData.address,
        vehicleType: agentData.vehicleType,
        vehicleModel: agentData.vehicleModel,
        vehicleRegistration: agentData.vehicleRegistration,
        licenseNumber: agentData.licenseNumber,
        workingAreas: agentData.workingAreas || [],
        emergencyContact: agentData.emergencyContact
      });

      logDelivery('Delivery Agent Registered', {
        agentId: response.data.data._id,
        agentName: response.data.data.name
      }, 'success');

      // Store delivery agent credentials
      localStorage.setItem('deliveryToken', response.data.data.token);
      localStorage.setItem('deliveryData', JSON.stringify(response.data.data));

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Register Delivery Agent');
    }
  }

  // Login delivery agent
  async loginDeliveryAgent(credentials) {
    try {
      logDelivery('Logging in Delivery Agent', {
        email: credentials.email
      }, 'info');

      const response = await api.post('/delivery/login', {
        email: credentials.email,
        password: credentials.password
      });

      logDelivery('Delivery Agent Login Success', {
        agentId: response.data.data._id,
        agentName: response.data.data.name,
        isOnline: response.data.data.isOnline
      }, 'success');

      // Store delivery agent credentials
      localStorage.setItem('deliveryToken', response.data.data.token);
      localStorage.setItem('deliveryData', JSON.stringify(response.data.data));

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Login Delivery Agent');
    }
  }

  // Logout delivery agent
  async logoutDeliveryAgent() {
    try {
      logDelivery('Logging out Delivery Agent', null, 'info');

      await api.post('/delivery/logout');

      // Clear stored credentials
      localStorage.removeItem('deliveryToken');
      localStorage.removeItem('deliveryData');

      // Stop location tracking
      this.stopLocationTracking();

      logDelivery('Delivery Agent Logout Success', null, 'success');

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      // Clear credentials even if API call fails
      localStorage.removeItem('deliveryToken');
      localStorage.removeItem('deliveryData');
      this.stopLocationTracking();

      return handleDeliveryError(error, 'Logout Delivery Agent');
    }
  }

  // 🎯 PROFILE METHODS

  // Get delivery agent profile
  async getProfile() {
    try {
      logDelivery('Fetching Profile', null, 'info');

      const response = await api.get('/delivery/profile');

      logDelivery('Profile Fetched', {
        agentId: response.data.data._id,
        profileCompletion: response.data.data.profileCompletion
      }, 'success');

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Get Profile');
    }
  }

  // Update delivery agent profile
  async updateProfile(profileData) {
    try {
      logDelivery('Updating Profile', {
        updateFields: Object.keys(profileData)
      }, 'info');

      const response = await api.put('/delivery/profile', profileData);

      logDelivery('Profile Updated', {
        agentId: response.data.data._id,
        profileCompletion: response.data.data.profileCompletion
      }, 'success');

      // Update stored data
      const storedData = JSON.parse(localStorage.getItem('deliveryData') || '{}');
      const updatedData = { ...storedData, ...response.data.data };
      localStorage.setItem('deliveryData', JSON.stringify(updatedData));

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Update Profile');
    }
  }

  // 🎯 ORDER MANAGEMENT METHODS

  // Get available orders
  async getAvailableOrders() {
    try {
      logDelivery('Fetching Available Orders', null, 'info');

      const response = await api.get('/delivery/orders/available');

      logDelivery('Available Orders Fetched', {
        orderCount: response.data.count
      }, 'success');

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Get Available Orders');
    }
  }

  // Get assigned orders
  async getAssignedOrders() {
    try {
      logDelivery('Fetching Assigned Orders', null, 'info');

      const response = await api.get('/delivery/orders/assigned');

      logDelivery('Assigned Orders Fetched', {
        orderCount: response.data.count
      }, 'success');

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Get Assigned Orders');
    }
  }

  // Accept order
  async acceptOrder(orderId) {
    try {
      logDelivery('Accepting Order', { orderId }, 'info');

      const response = await api.put(`/delivery/orders/${orderId}/accept`);

      logDelivery('Order Accepted', {
        orderId,
        orderNumber: response.data.data.orderNumber
      }, 'success');

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Accept Order');
    }
  }

  // Complete pickup
  async completePickup(orderId, pickupData) {
    try {
      logDelivery('Completing Pickup', {
        orderId,
        orderIdVerification: pickupData.orderIdVerification
      }, 'info');

      const response = await api.put(`/delivery/orders/${orderId}/pickup`, {
        orderIdVerification: pickupData.orderIdVerification,
        pickupNotes: pickupData.pickupNotes || '',
        location: pickupData.location
      });

      logDelivery('Pickup Completed', {
        orderId,
        orderNumber: response.data.data.orderNumber
      }, 'success');

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Complete Pickup');
    }
  }

  // Complete delivery
  async completeDelivery(orderId, deliveryData) {
    try {
      logDelivery('Completing Delivery', {
        orderId,
        hasOTP: !!deliveryData.otp,
        hasCOD: !!deliveryData.codPayment
      }, 'info');

      const response = await api.put(`/delivery/orders/${orderId}/deliver`, {
        otp: deliveryData.otp,
        deliveryNotes: deliveryData.deliveryNotes || '',
        recipientName: deliveryData.recipientName || '',
        location: deliveryData.location,
        codPayment: deliveryData.codPayment
      });

      logDelivery('Delivery Completed', {
        orderId,
        orderNumber: response.data.data.orderNumber,
        earnings: response.data.data.earnings
      }, 'success');

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Complete Delivery');
    }
  }

  // 🎯 LOCATION & STATUS METHODS

  // Update location
  async updateLocation(latitude, longitude) {
    try {
      const response = await api.put('/delivery/location', {
        latitude,
        longitude
      });

      // Don't log every location update to avoid spam
      if (Math.random() < 0.1) { // Log 10% of updates
        logDelivery('Location Updated', {
          coordinates: [longitude, latitude]
        }, 'info');
      }

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Update Location');
    }
  }

  // Toggle availability
  async toggleAvailability() {
    try {
      logDelivery('Toggling Availability', null, 'info');

      const response = await api.put('/delivery/availability');

      logDelivery('Availability Toggled', {
        isAvailable: response.data.data.isAvailable,
        isOnline: response.data.data.isOnline
      }, 'success');

      // Update stored data
      const storedData = JSON.parse(localStorage.getItem('deliveryData') || '{}');
      const updatedData = { 
        ...storedData,
        isAvailable: response.data.data.isAvailable,
        isOnline: response.data.data.isOnline
      };
      localStorage.setItem('deliveryData', JSON.stringify(updatedData));

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Toggle Availability');
    }
  }

  // 🎯 STATISTICS & HISTORY METHODS

  // Get delivery statistics
  async getDeliveryStats() {
    try {
      logDelivery('Fetching Delivery Stats', null, 'info');

      const response = await api.get('/delivery/stats');

      logDelivery('Delivery Stats Fetched', {
        todayDeliveries: response.data.data.todayDeliveries,
        totalDeliveries: response.data.data.completedDeliveries,
        totalEarnings: response.data.data.totalEarnings
      }, 'success');

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Get Delivery Stats');
    }
  }

  // Get delivery history
  async getDeliveryHistory(page = 1, limit = 10) {
    try {
      logDelivery('Fetching Delivery History', { page, limit }, 'info');

      const response = await api.get(`/delivery/history?page=${page}&limit=${limit}`);

      logDelivery('Delivery History Fetched', {
        count: response.data.count,
        totalPages: response.data.totalPages
      }, 'success');

      return response.data;
    } catch (error) {
      return handleDeliveryError(error, 'Get Delivery History');
    }
  }

  // 🎯 LOCATION TRACKING METHODS

  // Start location tracking
  startLocationTracking(options = {}) {
    try {
      if (!navigator.geolocation) {
        logDelivery('Geolocation not supported', null, 'error');
        return {
          success: false,
          message: 'Geolocation is not supported by this browser'
        };
      }

      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
        updateInterval: 60000 // Update every minute
      };

      const trackingOptions = { ...defaultOptions, ...options };

      logDelivery('Starting Location Tracking', {
        updateInterval: trackingOptions.updateInterval,
        enableHighAccuracy: trackingOptions.enableHighAccuracy
      }, 'info');

      // Start watching position
      this.locationWatcher = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Update location on server
          this.updateLocation(latitude, longitude).catch(error => {
            logDelivery('Location Update Failed', error, 'error');
          });
        },
        (error) => {
          logDelivery('Location Watch Error', {
            code: error.code,
            message: error.message
          }, 'error');
        },
        {
          enableHighAccuracy: trackingOptions.enableHighAccuracy,
          timeout: trackingOptions.timeout,
          maximumAge: trackingOptions.maximumAge
        }
      );

      // Set up interval for regular updates
      this.locationUpdateInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            this.updateLocation(latitude, longitude).catch(error => {
              logDelivery('Scheduled Location Update Failed', error, 'error');
            });
          },
          (error) => {
            logDelivery('Scheduled Location Error', error, 'error');
          }
        );
      }, trackingOptions.updateInterval);

      return {
        success: true,
        message: 'Location tracking started'
      };
    } catch (error) {
      logDelivery('Start Location Tracking Error', error, 'error');
      return {
        success: false,
        message: error.message || 'Failed to start location tracking'
      };
    }
  }

  // Stop location tracking
  stopLocationTracking() {
    try {
      if (this.locationWatcher) {
        navigator.geolocation.clearWatch(this.locationWatcher);
        this.locationWatcher = null;
      }

      if (this.locationUpdateInterval) {
        clearInterval(this.locationUpdateInterval);
        this.locationUpdateInterval = null;
      }

      logDelivery('Location Tracking Stopped', null, 'info');

      return {
        success: true,
        message: 'Location tracking stopped'
      };
    } catch (error) {
      logDelivery('Stop Location Tracking Error', error, 'error');
      return {
        success: false,
        message: error.message || 'Failed to stop location tracking'
      };
    }
  }

  // Get current location once
  async getCurrentLocation() {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported');
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date(position.timestamp)
            };

            logDelivery('Current Location Obtained', {
              coordinates: [location.longitude, location.latitude],
              accuracy: location.accuracy
            }, 'success');

            resolve({
              success: true,
              data: location
            });
          },
          (error) => {
            logDelivery('Get Current Location Error', {
              code: error.code,
              message: error.message
            }, 'error');

            reject({
              success: false,
              message: this.getLocationErrorMessage(error.code),
              errorCode: error.code
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );
      });
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to get current location'
      };
    }
  }

  // Get location error message
  getLocationErrorMessage(errorCode) {
    switch (errorCode) {
      case 1:
        return 'Location access denied. Please enable location permissions.';
      case 2:
        return 'Location unavailable. Please check your GPS settings.';
      case 3:
        return 'Location request timed out. Please try again.';
      default:
        return 'Unknown location error occurred.';
    }
  }

  // 🎯 UTILITY METHODS

  // Check if agent is logged in
  isLoggedIn() {
    const token = localStorage.getItem('deliveryToken');
    const data = localStorage.getItem('deliveryData');
    return !!(token && data);
  }

  // Get stored agent data
  getStoredAgentData() {
    try {
      const data = localStorage.getItem('deliveryData');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logDelivery('Get Stored Agent Data Error', error, 'error');
      return null;
    }
  }

  // Format order for display
  formatOrderForAgent(order) {
    return {
      id: order._id,
      orderNumber: order.orderNumber || 'Hidden until pickup',
      status: order.status,
      totalAmount: order.totalPrice,
      deliveryFee: order.deliveryFees?.agentEarning || 0,
      items: order.orderItems?.map(item => ({
        name: item.name,
        quantity: item.quantity,
        image: item.image
      })) || [],
      customer: {
        name: order.user?.name || 'Customer',
        phone: order.user?.phone || ''
      },
      seller: {
        name: order.seller?.name || order.seller?.firstName || 'Seller',
        shopName: order.seller?.shopName || order.seller?.shop?.name || '',
        address: order.seller?.address || order.seller?.shop?.address || '',
        phone: order.seller?.phone || ''
      },
      deliveryAddress: order.shippingAddress,
      estimatedDelivery: order.estimatedDelivery?.estimatedAt,
      createdAt: order.createdAt,
      deliveryAgent: order.deliveryAgent
    };
  }

  // Format delivery stats for display
  formatStatsForDisplay(stats) {
    return {
      today: {
        deliveries: stats.todayDeliveries || 0,
        earnings: 0 // Calculate from today's deliveries if needed
      },
      total: {
        deliveries: stats.completedDeliveries || 0,
        pickups: stats.completedPickups || 0,
        earnings: stats.totalEarnings || 0,
        assigned: stats.assignedOrders || 0
      },
      performance: {
        rating: stats.averageRating || 0,
        totalRatings: stats.totalRatings || 0,
        profileCompletion: stats.profileCompletion || 0
      },
      current: {
        pending: stats.pendingOrders || 0
      }
    };
  }

  // Validate order ID format
  validateOrderId(orderIdVerification, actualOrderNumber) {
    if (!orderIdVerification || !actualOrderNumber) {
      return {
        isValid: false,
        message: 'Order ID is required'
      };
    }

    if (orderIdVerification.trim() !== actualOrderNumber.trim()) {
      return {
        isValid: false,
        message: 'Order ID does not match. Please check and try again.'
      };
    }

    return {
      isValid: true,
      message: 'Order ID verified successfully'
    };
  }

  // Validate OTP format
  validateOTP(otp) {
    if (!otp) {
      return {
        isValid: false,
        message: 'OTP is required'
      };
    }

    if (!/^\d{4,6}$/.test(otp)) {
      return {
        isValid: false,
        message: 'OTP must be 4-6 digits'
      };
    }

    return {
      isValid: true,
      message: 'OTP format is valid'
    };
  }

  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/delivery/health');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: 'Delivery service unavailable'
      };
    }
  }

  // Clear all stored data (for debugging)
  clearStoredData() {
    localStorage.removeItem('deliveryToken');
    localStorage.removeItem('deliveryData');
    this.stopLocationTracking();
    logDelivery('All Stored Data Cleared', null, 'warning');
  }

  // Debug function (development only)
  debug() {
    if (process.env.NODE_ENV === 'development') {
      const debugInfo = {
        isLoggedIn: this.isLoggedIn(),
        storedData: this.getStoredAgentData(),
        isTrackingLocation: !!(this.locationWatcher || this.locationUpdateInterval),
        localStorage: {
          deliveryToken: localStorage.getItem('deliveryToken') ? 'present' : 'missing',
          deliveryData: localStorage.getItem('deliveryData') ? 'present' : 'missing'
        }
      };

      logDelivery('Debug Info', debugInfo, 'info');
      return debugInfo;
    }
  }
}

// Create singleton instance
const deliveryService = new DeliveryService();

// Make debug available globally in development
if (process.env.NODE_ENV === 'development') {
  window.debugDelivery = () => deliveryService.debug();
}

export default deliveryService;
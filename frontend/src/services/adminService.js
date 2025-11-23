// frontend/src/services/adminService.js - ENHANCED with Comprehensive Logging

import api from './api';

// 🎯 ENHANCED DEBUGGING with detailed colors and timestamps
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336',
      request: '#9C27B0',
      response: '#00BCD4',
      critical: '#E91E63'
    };
    
    console.log(
      `%c[AdminService] ${timestamp} - ${message}`,
      `color: ${colors[type]}; font-weight: bold; background: rgba(0,0,0,0.1); padding: 2px 6px;`,
      data
    );
  }
};

// 🎯 CRITICAL: Admin login with comprehensive logging and debugging
export const loginAdmin = async (credentials) => {
  const startTime = Date.now();
  
  try {
    debugLog('🔐 ADMIN LOGIN PROCESS INITIATED', {
      email: credentials.email,
      hasPassword: !!credentials.password,
      passwordLength: credentials.password?.length || 0,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      currentUrl: window.location.href
    }, 'critical');

    // Validate input
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    debugLog('📡 PREPARING API REQUEST', {
      endpoint: '/admin/login',
      method: 'POST',
      baseURL: api.defaults.baseURL,
      timeout: api.defaults.timeout,
      headers: api.defaults.headers
    }, 'request');
    
    const requestData = {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password
    };

    debugLog('📤 SENDING LOGIN REQUEST', {
      url: `${api.defaults.baseURL}/admin/login`,
      data: {
        email: requestData.email,
        passwordProvided: !!requestData.password,
        passwordLength: requestData.password.length
      }
    }, 'request');

    const response = await api.post('/admin/login', requestData);
    
    debugLog('📥 RAW RESPONSE RECEIVED', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.keys(response.headers || {}),
      dataExists: !!response.data,
      responseKeys: response.data ? Object.keys(response.data) : [],
      responseSize: JSON.stringify(response.data || {}).length,
      requestDuration: Date.now() - startTime
    }, 'response');

    // 🎯 DETAILED RESPONSE ANALYSIS
    if (response.data) {
      debugLog('🔍 ANALYZING RESPONSE STRUCTURE', {
        success: response.data.success,
        hasData: !!response.data.data,
        dataType: typeof response.data.data,
        dataKeys: response.data.data ? Object.keys(response.data.data) : null,
        hasMessage: !!response.data.message,
        message: response.data.message,
        // Check all possible token locations
        tokenLocations: {
          'data.data.token': !!(response.data.data && response.data.data.token),
          'data.token': !!response.data.token,
          'data.accessToken': !!response.data.accessToken,
          'data.data.accessToken': !!(response.data.data && response.data.data.accessToken)
        }
      }, 'response');

      // 🎯 ADMIN DATA STRUCTURE ANALYSIS
      if (response.data.data) {
        const adminData = response.data.data;
        debugLog('🔍 ADMIN DATA DETAILED ANALYSIS', {
          adminId: adminData._id,
          adminName: adminData.name,
          adminEmail: adminData.email,
          adminRole: adminData.role,
          hasToken: !!adminData.token,
          tokenLength: adminData.token?.length || 0,
          tokenPreview: adminData.token ? adminData.token.substring(0, 30) + '...' : 'NO TOKEN',
          permissions: adminData.permissions,
          allAdminKeys: Object.keys(adminData),
          isActive: adminData.isActive,
          lastLogin: adminData.lastLogin
        }, 'response');
      }
    }

    // 🎯 RESPONSE VALIDATION AND TOKEN EXTRACTION
    if (response.data?.success && response.data?.data) {
      const adminData = response.data.data;
      
      // Check for token in multiple locations
      const token = adminData.token || adminData.accessToken || response.data.token || response.data.accessToken;
      
      if (!token) {
        debugLog('❌ TOKEN MISSING FROM RESPONSE', {
          responseStructure: response.data,
          adminData: adminData,
          availableKeys: Object.keys(adminData || {}),
          checkedTokenLocations: {
            'adminData.token': !!adminData.token,
            'adminData.accessToken': !!adminData.accessToken,
            'response.data.token': !!response.data.token,
            'response.data.accessToken': !!response.data.accessToken
          }
        }, 'critical');
        
        throw new Error('Invalid admin login response - missing authentication token');
      }

      // Token structure validation
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        debugLog('❌ INVALID TOKEN STRUCTURE', {
          tokenLength: token.length,
          tokenParts: tokenParts.length,
          tokenPreview: token.substring(0, 50) + '...'
        }, 'critical');
        
        throw new Error('Invalid authentication token format received');
      }

      debugLog('✅ ADMIN LOGIN API SUCCESS', {
        adminId: adminData._id,
        adminName: adminData.name,
        adminEmail: adminData.email,
        adminRole: adminData.role,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenParts: tokenParts.length,
        permissions: adminData.permissions,
        requestDuration: Date.now() - startTime
      }, 'critical');

      // Return the data with guaranteed token
      const finalResponse = {
        ...response.data,
        data: {
          ...adminData,
          token: token // Ensure token is present
        }
      };

      debugLog('📦 RETURNING FINAL RESPONSE', {
        hasSuccess: !!finalResponse.success,
        hasData: !!finalResponse.data,
        hasToken: !!finalResponse.data.token,
        tokenLength: finalResponse.data.token?.length,
        responseComplete: true
      }, 'success');

      return finalResponse;
      
    } else {
      debugLog('⚠️ UNEXPECTED RESPONSE FORMAT', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        responseStructure: response.data ? Object.keys(response.data) : 'no data',
        fullResponse: response.data,
        expectedStructure: 'Expected: { success: true, data: { ...adminData, token: "..." } }'
      }, 'critical');
      
      throw new Error(response.data?.message || 'Login failed - unexpected response format from server');
    }

  } catch (error) {
    debugLog('❌ ADMIN LOGIN ERROR OCCURRED', {
      errorType: error.constructor.name,
      message: error.message,
      hasResponse: !!error.response,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      responseHeaders: error.response?.headers,
      hasRequest: !!error.request,
      requestConfig: error.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL,
        timeout: error.config.timeout
      } : null,
      networkError: !error.response && !error.request,
      requestDuration: Date.now() - startTime,
      stack: error.stack
    }, 'critical');
    
    // Enhanced error handling based on error type
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(data?.message || 'Invalid login credentials provided');
        case 401:
          throw new Error(data?.message || 'Invalid email or password');
        case 403:
          throw new Error(data?.message || 'Admin account access denied');
        case 404:
          throw new Error('Admin login endpoint not found');
        case 429:
          throw new Error('Too many login attempts. Please try again later');
        case 500:
          throw new Error('Server error occurred. Please try again');
        default:
          throw new Error(data?.message || `Login failed with status ${status}`);
      }
    } else if (error.request) {
      throw new Error('Network error - Unable to connect to server. Please check your internet connection');
    } else {
      throw error; // Re-throw validation errors and other client-side errors
    }
  }
};

// 🎯 Enhanced dashboard stats with logging
export const getDashboardStats = async () => {
  try {
    debugLog('📊 FETCHING DASHBOARD STATISTICS', {
      endpoint: '/admin/dashboard/stats',
      timestamp: new Date().toISOString()
    }, 'request');
    
    const response = await api.get('/admin/dashboard/stats');
    
    debugLog('✅ DASHBOARD STATS RECEIVED', {
      status: response.status,
      hasData: !!response.data.data,
      statsKeys: response.data.data ? Object.keys(response.data.data) : [],
      overview: response.data.data?.overview
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ DASHBOARD STATS ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      endpoint: '/admin/dashboard/stats'
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch dashboard statistics' };
  }
};

// 🎯 Enhanced recent orders fetching - UPDATED to use new dashboard endpoint
export const getRecentOrders = async (queryParams = {}) => {
  try {
    debugLog('📋 FETCHING RECENT ORDERS', { 
      queryParams,
      endpoint: '/admin/dashboard'
    }, 'request');
    
    const response = await api.get('/admin/dashboard', { params: queryParams });
    
    debugLog('✅ RECENT ORDERS RECEIVED', {
      ordersCount: response.data.data?.length || 0,
      pagination: response.data.pagination,
      hasOrders: !!(response.data.data && response.data.data.length > 0),
      dashboardMetrics: response.data.dashboardMetrics
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ RECENT ORDERS ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch recent orders' };
  }
};

// 🎯 Enhanced delivery agents fetching
export const getDeliveryAgents = async (queryParams = {}) => {
  try {
    debugLog('🚚 FETCHING DELIVERY AGENTS', { 
      queryParams,
      endpoint: '/admin/delivery-agents'
    }, 'request');
    
    const response = await api.get('/admin/delivery-agents', { params: queryParams });
    
    debugLog('✅ DELIVERY AGENTS RECEIVED', {
      agentsCount: response.data.data?.length || 0,
      pagination: response.data.pagination,
      activeAgents: response.data.data?.filter(agent => agent.isActive).length || 0
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ DELIVERY AGENTS ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch delivery agents' };
  }
};

// 🎯 NEW: Get available delivery agents with capacity information
export const getAvailableDeliveryAgents = async (queryParams = {}) => {
  try {
    debugLog('🚚 FETCHING AVAILABLE DELIVERY AGENTS WITH CAPACITY', { 
      queryParams,
      endpoint: '/admin/delivery-agents/available'
    }, 'request');
    
    const response = await api.get('/admin/delivery-agents/available', { params: queryParams });
    
    debugLog('✅ AVAILABLE DELIVERY AGENTS WITH CAPACITY RECEIVED', {
      agentsCount: response.data.data?.agents?.length || 0,
      capacityInfo: response.data.data?.capacity,
      availableAgents: response.data.data?.agents?.filter(agent => agent.capacity?.isAvailable).length || 0
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ AVAILABLE DELIVERY AGENTS ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch available delivery agents' };
  }
};

// 🎯 Enhanced approve and assign order
export const approveAndAssignOrder = async (orderData) => {
  try {
    debugLog('✅ APPROVING AND ASSIGNING ORDER', {
      orderId: orderData.orderId,
      deliveryAgentId: orderData.deliveryAgentId,
      hasNotes: !!orderData.notes
    }, 'request');
    
    const response = await api.post('/admin/orders/approve-assign', orderData);
    
    debugLog('✅ ORDER APPROVED AND ASSIGNED', {
      orderId: orderData.orderId,
      success: response.data.success,
      orderNumber: response.data.data?.orderNumber
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ ORDER APPROVAL ERROR', {
      orderId: orderData.orderId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to approve and assign order' };
  }
};

// 🎯 NEW: Bulk assign orders to delivery agent
export const bulkAssignOrders = async (bulkAssignmentData) => {
  try {
    debugLog('📦 BULK ASSIGNING ORDERS', {
      orderIds: bulkAssignmentData.orderIds?.length || 0,
      deliveryAgentId: bulkAssignmentData.deliveryAgentId,
      hasNotes: !!bulkAssignmentData.notes,
      endpoint: '/admin/orders/bulk-assign'
    }, 'request');
    
    const response = await api.post('/admin/orders/bulk-assign', bulkAssignmentData);
    
    debugLog('✅ BULK ASSIGNMENT COMPLETED', {
      success: response.data.success,
      assignedCount: response.data.data?.summary?.successfullyAssigned || 0,
      failedCount: response.data.data?.summary?.failed || 0,
      deliveryAgentName: response.data.data?.deliveryAgent?.name
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ BULK ASSIGNMENT ERROR', {
      orderIds: bulkAssignmentData.orderIds?.length || 0,
      deliveryAgentId: bulkAssignmentData.deliveryAgentId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to perform bulk order assignment' };
  }
};

// Get all sellers
export const getAllSellers = async (queryParams = {}) => {
  try {
    debugLog('👥 FETCHING ALL SELLERS', { queryParams }, 'request');
    
    const response = await api.get('/admin/sellers', { params: queryParams });
    
    debugLog('✅ SELLERS RECEIVED', {
      sellersCount: response.data.data?.length || 0,
      pagination: response.data.pagination
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ SELLERS FETCH ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch sellers' };
  }
};

// Get single seller profile
export const getSellerProfile = async (sellerId) => {
  try {
    debugLog('👤 FETCHING SELLER PROFILE', { sellerId }, 'request');
    
    const response = await api.get(`/admin/sellers/${sellerId}`);
    
    debugLog('✅ SELLER PROFILE RECEIVED', {
      sellerId,
      sellerName: response.data.data?.seller?.firstName,
      hasShop: !!response.data.data?.seller?.shop
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ SELLER PROFILE ERROR', {
      sellerId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch seller profile' };
  }
};

// Get all users
export const getAllUsers = async (queryParams = {}) => {
  try {
    debugLog('👥 FETCHING ALL USERS', { queryParams }, 'request');
    
    const response = await api.get('/admin/users', { params: queryParams });
    
    debugLog('✅ USERS RECEIVED', {
      usersCount: response.data.data?.length || 0,
      pagination: response.data.pagination
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ USERS FETCH ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch users' };
  }
};

// Get assigned/accepted orders with tracking
export const getAssignedAcceptedOrders = async (queryParams = {}) => {
  try {
    debugLog('📦 FETCHING ASSIGNED/ACCEPTED ORDERS', { queryParams }, 'request');
    
    const response = await api.get('/admin/orders/assigned-accepted', { params: queryParams });
    
    debugLog('✅ ASSIGNED/ACCEPTED ORDERS RECEIVED', {
      ordersCount: response.data.data?.length || 0,
      pagination: response.data.pagination
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ ASSIGNED/ACCEPTED ORDERS FETCH ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch assigned/accepted orders' };
  }
};

// Get single user profile
export const getUserProfile = async (userId) => {
  try {
    debugLog('👤 FETCHING USER PROFILE', { userId }, 'request');
    
    const response = await api.get(`/admin/users/${userId}`);
    
    debugLog('✅ USER PROFILE RECEIVED', {
      userId,
      userName: response.data.data?.user?.name,
      hasLocation: !!response.data.data?.user?.location
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ USER PROFILE ERROR', {
      userId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch user profile' };
  }
};

// Get delivery agent profile
export const getDeliveryAgentProfile = async (agentId) => {
  try {
    debugLog('🚚 FETCHING DELIVERY AGENT PROFILE', { agentId }, 'request');
    
    const response = await api.get(`/admin/delivery-agents/${agentId}`);
    
    debugLog('✅ DELIVERY AGENT PROFILE RECEIVED', {
      agentId,
      agentName: response.data.data?.agent?.name,
      totalDeliveries: response.data.data?.stats?.totalDeliveries
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ DELIVERY AGENT PROFILE ERROR', {
      agentId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch delivery agent profile' };
  }
};

// Get delivery agent order history
export const getDeliveryAgentHistory = async (agentId, page = 1) => {
  try {
    debugLog('🚚 FETCHING DELIVERY AGENT HISTORY', { agentId, page }, 'request');
    
    const response = await api.get(`/admin/delivery-agents/${agentId}/history?page=${page}`);
    
    debugLog('✅ DELIVERY AGENT HISTORY RECEIVED', {
      agentId,
      page,
      ordersCount: response.data.data?.length || 0
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ DELIVERY AGENT HISTORY ERROR', {
      agentId,
      page,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch delivery agent history' };
  }
};

// Get delivery agent COD collections
export const getDeliveryAgentCODCollections = async (agentId, filters = {}) => {
  try {
    debugLog('💰 FETCHING DELIVERY AGENT COD COLLECTIONS', { agentId, filters }, 'request');
    
    // Build query string from filters
    const queryParams = new URLSearchParams();
    if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
    if (filters.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
    
    const queryString = queryParams.toString();
    const url = `/admin/delivery-agents/${agentId}/cod-collections${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    
    debugLog('✅ DELIVERY AGENT COD COLLECTIONS RECEIVED', {
      agentId,
      totalOrders: response.data.data?.summary?.totalOrders || 0,
      totalCashCOD: response.data.data?.summary?.totalCashCOD || 0,
      totalSMEPayCOD: response.data.data?.summary?.totalSMEPayCOD || 0,
      daysCount: response.data.data?.dailyBreakdown?.length || 0
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ DELIVERY AGENT COD COLLECTIONS ERROR', {
      agentId,
      filters,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch COD collections' };
  }
};

// Update delivery agent status
export const updateDeliveryAgentStatus = async (agentId, statusData) => {
  try {
    debugLog('🚚 UPDATING DELIVERY AGENT STATUS', { 
      agentId, 
      statusData 
    }, 'request');
    
    const response = await api.put(`/admin/delivery-agents/${agentId}/status`, statusData);
    
    debugLog('✅ DELIVERY AGENT STATUS UPDATED', {
      agentId,
      newStatus: statusData.status,
      isActive: statusData.isActive
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ DELIVERY AGENT STATUS UPDATE ERROR', {
      agentId,
      statusData,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to update delivery agent status' };
  }
};

// 🎯 Test admin endpoint
export const testAdminEndpoint = async () => {
  try {
    debugLog('🧪 TESTING ADMIN ENDPOINT', {
      endpoint: '/admin/test',
      timestamp: new Date().toISOString()
    }, 'request');
    
    const response = await api.get('/admin/test');
    
    debugLog('✅ ADMIN ENDPOINT TEST SUCCESS', {
      status: response.status,
      data: response.data,
      working: true
    }, 'success');
    
    return response.data;
  } catch (error) {
    debugLog('❌ ADMIN ENDPOINT TEST FAILED', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      networkError: !error.response
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Admin endpoint test failed' };
  }
};

// 🎯 NEW: Payout Management Functions
export const getPayoutBeneficiaries = async (queryParams = {}) => {
  try {
    debugLog('💰 FETCHING PAYOUT BENEFICIARIES', { queryParams }, 'request');
    
    const response = await api.get('/api/payouts/admin/beneficiaries', { params: queryParams });
    
    debugLog('✅ PAYOUT BENEFICIARIES RECEIVED', {
      beneficiariesCount: response.data.data?.length || 0,
      pagination: response.data.pagination
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ PAYOUT BENEFICIARIES ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch payout beneficiaries' };
  }
};

export const getPayoutHistory = async (queryParams = {}) => {
  try {
    debugLog('💰 FETCHING PAYOUT HISTORY', { queryParams }, 'request');
    
    const response = await api.get('/api/payouts/admin/payouts', { params: queryParams });
    
    debugLog('✅ PAYOUT HISTORY RECEIVED', {
      payoutsCount: response.data.data?.length || 0,
      pagination: response.data.pagination
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ PAYOUT HISTORY ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch payout history' };
  }
};

export const getPayoutAnalytics = async () => {
  try {
    debugLog('📊 FETCHING PAYOUT ANALYTICS', {}, 'request');
    
    const response = await api.get('/api/payouts/admin/analytics');
    
    debugLog('✅ PAYOUT ANALYTICS RECEIVED', {
      hasAnalytics: !!response.data.data,
      analyticsKeys: response.data.data ? Object.keys(response.data.data) : []
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ PAYOUT ANALYTICS ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch payout analytics' };
  }
};

export const processBatchPayouts = async (batchData) => {
  try {
    debugLog('💰 PROCESSING BATCH PAYOUTS', {
      orderIds: batchData.orderIds?.length || 0,
      hasNotes: !!batchData.notes
    }, 'request');
    
    const response = await api.post('/api/payouts/admin/process-batch', batchData);
    
    debugLog('✅ BATCH PAYOUTS PROCESSED', {
      success: response.data.success,
      batchTransferId: response.data.data?.batchTransferId,
      processedCount: response.data.data?.processedCount || 0
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ BATCH PAYOUTS ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      batchData
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to process batch payouts' };
  }
};

export const processSinglePayout = async (orderId) => {
  try {
    debugLog('💰 PROCESSING SINGLE PAYOUT', { orderId }, 'request');
    
    const response = await api.post(`/api/payouts/admin/process-single/${orderId}`);
    
    debugLog('✅ SINGLE PAYOUT PROCESSED', {
      orderId,
      success: response.data.success,
      payoutId: response.data.data?.payoutId
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ SINGLE PAYOUT ERROR', {
      orderId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to process single payout' };
  }
};

export const getBatchPayoutHistory = async (queryParams = {}) => {
  try {
    debugLog('💰 FETCHING BATCH PAYOUT HISTORY', { queryParams }, 'request');
    
    const response = await api.get('/api/payouts/admin/batch-history', { params: queryParams });
    
    debugLog('✅ BATCH PAYOUT HISTORY RECEIVED', {
      batchesCount: response.data.data?.length || 0,
      pagination: response.data.pagination
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ BATCH PAYOUT HISTORY ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      queryParams
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch batch payout history' };
  }
};

export const getPayoutEligibilityStats = async () => {
  try {
    debugLog('📊 FETCHING PAYOUT ELIGIBILITY STATS', {}, 'request');
    
    const response = await api.get('/api/payouts/admin/eligibility-stats');
    
    debugLog('✅ PAYOUT ELIGIBILITY STATS RECEIVED', {
      hasStats: !!response.data.data,
      statsKeys: response.data.data ? Object.keys(response.data.data) : []
    }, 'success');

    return response.data;
  } catch (error) {
    debugLog('❌ PAYOUT ELIGIBILITY STATS ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');
    
    throw error.response?.data || { success: false, message: 'Failed to fetch payout eligibility stats' };
  }
};

// Default export with all methods
const adminService = {
  loginAdmin,
  testAdminEndpoint,
  getDashboardStats,
  getRecentOrders,
  approveAndAssignOrder,
  bulkAssignOrders,
  getAllSellers,
  getSellerProfile,
  getAllUsers,
  getUserProfile,
  getDeliveryAgents,
  getAvailableDeliveryAgents,
  getDeliveryAgentProfile,
  getDeliveryAgentHistory,
  updateDeliveryAgentStatus,
  getAssignedAcceptedOrders,
  // Payout Management
  getPayoutBeneficiaries,
  getPayoutHistory,
  getPayoutAnalytics,
  processBatchPayouts,
  processSinglePayout,
  getBatchPayoutHistory,
  getPayoutEligibilityStats
};

// 🎯 Development debugging
if (process.env.NODE_ENV === 'development') {
  window.adminService = adminService;
  window.testAdminLogin = async (email = 'admin@zammer.com', password = 'admin123') => {
    try {
      debugLog('🧪 TESTING ADMIN LOGIN FROM CONSOLE', { email }, 'critical');
      const result = await loginAdmin({ email, password });
      console.table(result.data);
      return result;
    } catch (error) {
      console.error('❌ Console login test failed:', error);
      return { success: false, error };
    }
  };
  
  debugLog('🔧 ADMIN SERVICE DEBUG MODE ENABLED', {
    availableFunctions: [
      'window.adminService - Access all admin service methods',
      'window.testAdminLogin(email, password) - Test admin login from console'
    ]
  }, 'info');
}

export default adminService;
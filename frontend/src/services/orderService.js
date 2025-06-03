import api from './api';

// Optimized debugging - only log errors and important events
const isProduction = process.env.NODE_ENV === 'production';
const debugLog = (message, data = null, type = 'info') => {
  // Only log in development or for errors
  if (!isProduction || type === 'error') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336',
      flow: '#9C27B0' // Keep flow color for debugLog as well
    };
    
    const timestamp = new Date().toISOString();
    console.log(
      `%c[Service] ${timestamp} - ${message}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// 🎯 NEW: Enhanced terminal logging for production monitoring
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [ORDER-FLOW] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
  
  // Additional structured logging for production monitoring
  if (isProduction) { // Use isProduction here too
    console.log(JSON.stringify({
      timestamp,
      service: 'orderService',
      action,
      status,
      data
    }));
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

// Check authentication before order operations
const checkAuthentication = () => {
  terminalLog('AUTH_CHECK', 'PROCESSING', { action: 'validating_user_session' });
  
  const userToken = localStorage.getItem('userToken');
  const userData = localStorage.getItem('userData');
  
  if (!userToken || !isValidJWTStructure(userToken) || !userData) {
    terminalLog('AUTH_CHECK', 'ERROR', { reason: 'missing_or_invalid_token' });
    return {
      isAuthenticated: false,
      error: 'Please login to place orders'
    };
  }
  
  try {
    const parsedUserData = JSON.parse(userData);
    terminalLog('AUTH_CHECK', 'SUCCESS', { 
      userId: parsedUserData._id, 
      userName: parsedUserData.name 
    });
    return {
      isAuthenticated: true,
      user: parsedUserData
    };
  } catch (error) {
    terminalLog('AUTH_CHECK', 'ERROR', { reason: 'corrupted_user_data' });
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    return {
      isAuthenticated: false,
      error: 'Session data corrupted. Please login again.'
    };
  }
};

// Check seller authentication
const checkSellerAuthentication = () => {
  terminalLog('SELLER_AUTH_CHECK', 'PROCESSING', { action: 'validating_seller_session' });
  
  const sellerToken = localStorage.getItem('sellerToken');
  const sellerData = localStorage.getItem('sellerData');
  
  if (!sellerToken || !isValidJWTStructure(sellerToken) || !sellerData) {
    terminalLog('SELLER_AUTH_CHECK', 'ERROR', { reason: 'missing_or_invalid_seller_token' });
    return {
      isAuthenticated: false,
      error: 'Please login as seller to manage orders'
    };
  }
  
  try {
    const parsedSellerData = JSON.parse(sellerData);
    terminalLog('SELLER_AUTH_CHECK', 'SUCCESS', { 
      sellerId: parsedSellerData._id, 
      sellerName: parsedSellerData.firstName 
    });
    return {
      isAuthenticated: true,
      seller: parsedSellerData
    };
  } catch (error) {
    terminalLog('SELLER_AUTH_CHECK', 'ERROR', { reason: 'corrupted_seller_data' });
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerData');
    return {
      isAuthenticated: false,
      error: 'Session data corrupted. Please login again.'
    };
  }
};

// 🎯 NEW: Payment Processing Function
export const processPayment = async (paymentData) => {
  try {
    terminalLog('PAYMENT_PROCESSING', 'PROCESSING', {
      method: paymentData.method,
      amount: paymentData.amount,
      timestamp: new Date().toISOString()
    });

    debugLog('💳 Processing payment', {
      method: paymentData.method,
      amount: paymentData.amount
    }, 'flow');

    // Simulate payment processing based on method
    switch (paymentData.method) {
      case 'Card':
        return await processCardPayment(paymentData);
      case 'UPI':
        return await processUPIPayment(paymentData);
      case 'Cash on Delivery':
        return await processCODPayment(paymentData);
      default:
        throw new Error('Unsupported payment method');
    }
  } catch (error) {
    terminalLog('PAYMENT_PROCESSING', 'ERROR', {
      method: paymentData.method,
      error: error.message
    });
    // Use debugLog for errors too
    debugLog('❌ Payment processing failed', { method: paymentData.method, error: error.message }, 'error');
    throw error;
  }
};

// Card payment processing
const processCardPayment = async (paymentData) => {
  try {
    terminalLog('CARD_PAYMENT', 'PROCESSING', {
      maskedCardNumber: paymentData.cardDetails?.cardNumber?.slice(-4),
      amount: paymentData.amount
    });

    // Validate card details
    if (!paymentData.cardDetails) {
      debugLog('❌ Card details missing', null, 'error');
      throw new Error('Card details are required');
    }

    const { cardNumber, expiryDate, cvv, cardholderName } = paymentData.cardDetails;
    
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      debugLog('❌ Missing card details fields', { hasCardNumber: !!cardNumber, hasExpiry: !!expiryDate, hasCvv: !!cvv, hasName: !!cardholderName }, 'error');
      throw new Error('All card details are required');
    }

    // Simulate API call to payment gateway
    debugLog('⏳ Simulating card payment API call', null, 'info');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

    // Mock payment gateway response
    const paymentResult = {
      success: true,
      transactionId: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: 'Card',
      amount: paymentData.amount,
      status: 'completed',
      gateway: 'mock_card_gateway',
      timestamp: new Date().toISOString(),
      last4: cardNumber.slice(-4)
    };

    terminalLog('CARD_PAYMENT', 'SUCCESS', paymentResult);
    debugLog('✅ Card payment simulation successful', paymentResult, 'success');
    
    return {
      success: true,
      data: paymentResult,
      message: 'Card payment processed successfully'
    };
  } catch (error) {
    terminalLog('CARD_PAYMENT', 'ERROR', { error: error.message });
    debugLog('❌ Card payment simulation failed', { error: error.message }, 'error');
    return {
      success: false,
      message: error.message
    };
  }
};

// UPI payment processing
const processUPIPayment = async (paymentData) => {
  try {
    terminalLog('UPI_PAYMENT', 'PROCESSING', {
      upiId: paymentData.upiId,
      amount: paymentData.amount
    });

    if (!paymentData.upiId) {
      debugLog('❌ UPI ID missing', null, 'error');
      throw new Error('UPI ID is required');
    }

    // Simulate UPI payment processing
    debugLog('⏳ Simulating UPI payment processing', null, 'info');
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay

    // Mock UPI gateway response
    const paymentResult = {
      success: true,
      transactionId: `upi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: 'UPI',
      amount: paymentData.amount,
      status: 'completed',
      gateway: 'mock_upi_gateway',
      timestamp: new Date().toISOString(),
      upiId: paymentData.upiId
    };

    terminalLog('UPI_PAYMENT', 'SUCCESS', paymentResult);
    debugLog('✅ UPI payment simulation successful', paymentResult, 'success');
    
    return {
      success: true,
      data: paymentResult,
      message: 'UPI payment processed successfully'
    };
  } catch (error) {
    terminalLog('UPI_PAYMENT', 'ERROR', { error: error.message });
    debugLog('❌ UPI payment simulation failed', { error: error.message }, 'error');
    return {
      success: false,
      message: error.message
    };
  }
};

// Cash on Delivery processing
const processCODPayment = async (paymentData) => {
  try {
    terminalLog('COD_PAYMENT', 'PROCESSING', {
      amount: paymentData.amount
    });

    debugLog('📦 Processing Cash on Delivery', null, 'info');

    // COD doesn't need actual payment processing
    const paymentResult = {
      success: true,
      transactionId: `cod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: 'Cash on Delivery',
      amount: paymentData.amount,
      status: 'pending', // Will be completed on delivery
      gateway: 'internal_cod',
      timestamp: new Date().toISOString()
    };

    terminalLog('COD_PAYMENT', 'SUCCESS', paymentResult);
    debugLog('✅ COD payment simulation successful', paymentResult, 'success');
    
    return {
      success: true,
      data: paymentResult,
      message: 'Cash on Delivery order confirmed'
    };
  } catch (error) {
    terminalLog('COD_PAYMENT', 'ERROR', { error: error.message });
    debugLog('❌ COD payment simulation failed', { error: error.message }, 'error');
    return {
      success: false,
      message: error.message
    };
  }
};

// Format order data for API
export const formatOrderForAPI = (cartItems, shippingAddress, paymentMethod) => {
  terminalLog('ORDER_FORMATTING', 'PROCESSING', {
    itemCount: cartItems.length,
    paymentMethod,
    shippingCity: shippingAddress.city
  });

  debugLog('📦 Formatting order data for API', {
    itemCount: cartItems.length,
    paymentMethod,
    hasShippingAddress: !!shippingAddress
  }, 'flow');

  // Format order items
  const orderItems = cartItems.map(item => ({
    product: item.product._id,
    name: item.product.name,
    quantity: item.quantity,
    price: item.price,
    image: item.product.images?.[0] || '',
    size: item.selectedSize || '',
    color: item.selectedColor || ''
  }));

  // Calculate totals
  const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const taxPrice = Math.round(subtotal * 0.18); // 18% GST
  const shippingPrice = subtotal >= 500 ? 0 : 50; // Free shipping above ₹500
  const totalPrice = subtotal + taxPrice + shippingPrice;

  // Get seller ID from first item (assuming all items are from same seller)
  const sellerId = cartItems[0]?.product?.seller?._id || cartItems[0]?.product?.seller;

  const orderData = {
    orderItems,
    shippingAddress: {
      address: shippingAddress.address,
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country || 'India',
      phone: shippingAddress.phone
    },
    paymentMethod,
    taxPrice,
    shippingPrice,
    totalPrice,
    sellerId
  };

  terminalLog('ORDER_FORMATTING', 'SUCCESS', {
    orderItems: orderItems.length,
    subtotal,
    taxPrice,
    shippingPrice,
    totalPrice,
    sellerId
  });

  debugLog('✅ Order data formatted', { totalPrice: totalPrice, itemCount: orderItems.length }, 'success');

  return orderData;
};

// Create a new order with enhanced tracking
export const createOrder = async (orderData) => {
  try {
    terminalLog('ORDER_CREATION', 'PROCESSING', {
      itemCount: orderData.orderItems?.length,
      totalPrice: orderData.totalPrice,
      paymentMethod: orderData.paymentMethod,
      sellerId: orderData.sellerId
    });

    debugLog('📝 Creating new order', {
      itemCount: orderData.orderItems?.length,
      totalPrice: orderData.totalPrice,
      paymentMethod: orderData.paymentMethod
    }, 'flow');

    // Check authentication first
    const authCheck = checkAuthentication();
    if (!authCheck.isAuthenticated) {
      terminalLog('ORDER_CREATION', 'ERROR', { reason: 'authentication_failed' });
      debugLog('❌ Order creation failed: Authentication failed', null, 'error');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true
      };
    }

    terminalLog('API_CALL', 'PROCESSING', { endpoint: '/orders', method: 'POST' });
    debugLog('📞 Calling order creation API', { endpoint: '/orders' }, 'info');
    const response = await api.post('/orders', orderData);
    
    terminalLog('ORDER_CREATION', 'SUCCESS', {
      orderId: response.data.data?._id,
      orderNumber: response.data.data?.orderNumber,
      totalPrice: response.data.data?.totalPrice,
      sellerId: response.data.data?.seller,
      timestamp: new Date().toISOString()
    });

    // 🎯 Enhanced success logging for order tracking
    console.log(`
🎉 ===============================
   ORDER SUCCESSFULLY CREATED!
===============================
📦 Order ID: ${response.data.data?._id}
🔢 Order Number: ${response.data.data?.orderNumber}
💰 Total Price: ₹${response.data.data?.totalPrice}
👤 Customer: ${authCheck.user.name}
🏪 Seller ID: ${response.data.data?.seller}
📅 Created: ${new Date().toLocaleString()}
===============================`);

    debugLog('✅ Order created successfully', { orderId: response.data.data?._id, orderNumber: response.data.data?.orderNumber }, 'success');

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Order created successfully'
    };
  } catch (error) {
    terminalLog('ORDER_CREATION', 'ERROR', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code
    });
    debugLog('❌ Order creation failed', { status: error.response?.status, message: error.response?.data?.message || error.message }, 'error');

    // Handle authentication errors
    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        terminalLog('TOKEN_CLEANUP', 'PROCESSING', { reason: error.response.data.code });
        debugLog('⚠️ Cleaning up invalid user token', { code: error.response.data.code }, 'warning');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Session expired. Please login again.',
        requiresAuth: true
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to create order'
    };
  }
};

// Get order by ID with tracking
export const getOrderById = async (orderId) => {
  try {
    terminalLog('ORDER_FETCH', 'PROCESSING', { orderId });
    debugLog('🔍 Fetching order by ID', { orderId }, 'info');
    
    const response = await api.get(`/orders/${orderId}`);
    
    terminalLog('ORDER_FETCH', 'SUCCESS', {
      orderId,
      orderNumber: response.data.data?.orderNumber,
      status: response.data.data?.status
    });
    debugLog('✅ Order fetched successfully', { orderId: response.data.data?._id, status: response.data.data?.status }, 'success');

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    terminalLog('ORDER_FETCH', 'ERROR', {
      orderId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    debugLog('❌ Failed to fetch order by ID', { orderId, status: error.response?.status, message: error.response?.data?.message || error.message }, 'error');

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch order'
    };
  }
};

// Get user's orders with tracking
export const getUserOrders = async (page = 1, limit = 10) => {
  try {
    terminalLog('USER_ORDERS_FETCH', 'PROCESSING', { page, limit });
    debugLog('🔍 Fetching user orders', { page, limit }, 'info');

    const authCheck = checkAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('❌ Failed to fetch user orders: Authentication failed', null, 'error');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true
      };
    }

    const response = await api.get('/orders/myorders', {
      params: { page, limit }
    });
    
    terminalLog('USER_ORDERS_FETCH', 'SUCCESS', {
      count: response.data.count,
      totalPages: response.data.totalPages,
      currentPage: response.data.currentPage
    });
    debugLog('✅ User orders fetched successfully', { count: response.data.count }, response.data.count === 0 ? 'warning' : 'success');

    return {
      success: true,
      data: response.data.data,
      pagination: {
        count: response.data.count,
        totalPages: response.data.totalPages,
        currentPage: response.data.currentPage
      }
    };
  } catch (error) {
    terminalLog('USER_ORDERS_FETCH', 'ERROR', {
      page,
      limit,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    debugLog('❌ Failed to fetch user orders', { status: error.response?.status, message: error.response?.data?.message || error.message }, 'error');

    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('⚠️ Cleaning up invalid user token', { code: error.response.data.code }, 'warning');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Session expired. Please login again.',
        requiresAuth: true
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch orders'
    };
  }
};

// Get seller orders with enhanced tracking
export const getSellerOrders = async (page = 1, limit = 10, status = null) => {
  try {
    terminalLog('SELLER_ORDERS_FETCH', 'PROCESSING', { page, limit, status });
    debugLog('🔍 Fetching seller orders', { page, limit, status }, 'info');

    const authCheck = checkSellerAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('❌ Failed to fetch seller orders: Authentication failed', null, 'error');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true
      };
    }

    const params = { page, limit };
    if (status) params.status = status;

    const response = await api.get('/orders/seller', { params });
    
    terminalLog('SELLER_ORDERS_FETCH', 'SUCCESS', {
      sellerId: authCheck.seller._id,
      count: response.data.count,
      totalPages: response.data.totalPages,
      currentPage: response.data.currentPage,
      status
    });
    debugLog('✅ Seller orders fetched successfully', { count: response.data.count, status }, response.data.count === 0 ? 'warning' : 'success');

    return {
      success: true,
      data: response.data.data,
      pagination: {
        count: response.data.count,
        totalPages: response.data.totalPages,
        currentPage: response.data.currentPage
      }
    };
  } catch (error) {
    terminalLog('SELLER_ORDERS_FETCH', 'ERROR', {
      page,
      limit,
      status,
      error: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    debugLog('❌ Failed to fetch seller orders', { status: error.response?.status, message: error.response?.data?.message || error.message }, 'error');

    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('⚠️ Cleaning up invalid seller token', { code: error.response.data.code }, 'warning');
        localStorage.removeItem('sellerToken');
        localStorage.removeItem('sellerData');
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Session expired. Please login again.',
        requiresAuth: true
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch seller orders'
    };
  }
};

// Update order status with tracking
export const updateOrderStatus = async (orderId, status) => {
  try {
    terminalLog('ORDER_STATUS_UPDATE', 'PROCESSING', { orderId, status });
    debugLog('🔄 Updating order status', { orderId, status }, 'info');

    const authCheck = checkSellerAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('❌ Failed to update order status: Authentication failed', null, 'error');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true
      };
    }

    const response = await api.put(`/orders/${orderId}/status`, { status });
    
    terminalLog('ORDER_STATUS_UPDATE', 'SUCCESS', {
      orderId,
      newStatus: status,
      sellerId: authCheck.seller._id,
      timestamp: new Date().toISOString()
    });

    // 🎯 Enhanced success logging for status updates
    console.log(`
🔄 ===============================
   ORDER STATUS UPDATED!
===============================
📦 Order ID: ${orderId}
📋 New Status: ${status}
👨‍💼 Updated by: ${authCheck.seller.firstName}
📅 Updated: ${new Date().toLocaleString()}
===============================`);

    debugLog('✅ Order status updated successfully', { orderId, newStatus: status }, 'success');

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Order status updated successfully'
    };
  } catch (error) {
    terminalLog('ORDER_STATUS_UPDATE', 'ERROR', {
      orderId,
      status,
      error: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    debugLog('❌ Failed to update order status', { orderId, status, error: error.response?.status, message: error.response?.data?.message || error.message }, 'error');

    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('⚠️ Cleaning up invalid seller token', { code: error.response.data.code }, 'warning');
        localStorage.removeItem('sellerToken');
        localStorage.removeItem('sellerData');
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Session expired. Please login again.',
        requiresAuth: true
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to update order status'
    };
  }
};

// Get seller order statistics with tracking
export const getSellerOrderStats = async () => {
  try {
    terminalLog('SELLER_STATS_FETCH', 'PROCESSING');
    debugLog('🔍 Fetching seller order statistics', null, 'info');

    const authCheck = checkSellerAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('❌ Failed to fetch seller stats: Authentication failed', null, 'error');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true
      };
    }

    const response = await api.get('/orders/seller/stats');
    
    terminalLog('SELLER_STATS_FETCH', 'SUCCESS', {
      sellerId: authCheck.seller._id,
      totalRevenue: response.data.data?.totalRevenue,
      orderCounts: response.data.data?.statusCounts
    });
    debugLog('✅ Seller stats fetched successfully', { totalRevenue: response.data.data?.totalRevenue }, 'success');

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    terminalLog('SELLER_STATS_FETCH', 'ERROR', {
      error: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    debugLog('❌ Failed to fetch seller stats', { status: error.response?.status, message: error.response?.data?.message || error.message }, 'error');

    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('⚠️ Cleaning up invalid seller token', { code: error.response.data.code }, 'warning');
        localStorage.removeItem('sellerToken');
        localStorage.removeItem('sellerData');
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Session expired. Please login again.',
        requiresAuth: true
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch seller order stats'
    };
  }
};

// Calculate order totals
export const calculateOrderTotals = (cartItems) => {
  terminalLog('ORDER_TOTALS_CALCULATION', 'PROCESSING', {
    itemCount: cartItems.length
  });

  const subtotal = cartItems.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  const taxPrice = Math.round(subtotal * 0.18); // 18% GST
  const shippingPrice = subtotal >= 500 ? 0 : 50; // Free shipping above ₹500
  const totalPrice = subtotal + taxPrice + shippingPrice;

  const totals = {
    subtotal: Math.round(subtotal),
    taxPrice,
    shippingPrice,
    totalPrice: Math.round(totalPrice)
  };

  terminalLog('ORDER_TOTALS_CALCULATION', 'SUCCESS', totals);
  debugLog('✅ Order totals calculated', totals, 'success');

  return totals;
};

// Validate order data before submission
export const validateOrderData = (orderData) => {
  terminalLog('ORDER_VALIDATION', 'PROCESSING', {
    hasOrderItems: !!orderData.orderItems,
    hasShippingAddress: !!orderData.shippingAddress,
    hasPaymentMethod: !!orderData.paymentMethod
  });

  debugLog('📋 Validating order data', { hasItems: !!orderData.orderItems, hasAddress: !!orderData.shippingAddress }, 'info');

  const errors = [];

  // Validate order items
  if (!orderData.orderItems || !Array.isArray(orderData.orderItems) || orderData.orderItems.length === 0) {
    errors.push('Order must contain at least one item');
    debugLog('❌ Validation Error: No order items', null, 'warning');
  }

  // Validate shipping address
  if (!orderData.shippingAddress) {
    errors.push('Shipping address is required');
    debugLog('❌ Validation Error: No shipping address', null, 'warning');
  } else {
    const { address, city, postalCode, phone } = orderData.shippingAddress;
    if (!address || !address.trim()) {
      errors.push('Street address is required');
      debugLog('❌ Validation Error: Missing street address', null, 'warning');
    }
    if (!city || !city.trim()) {
      errors.push('City is required');
      debugLog('❌ Validation Error: Missing city', null, 'warning');
    }
    if (!postalCode || !postalCode.trim()) {
      errors.push('Postal code is required');
      debugLog('❌ Validation Error: Missing postal code', null, 'warning');
    }
    if (!phone || !phone.trim()) {
      errors.push('Phone number is required');
      debugLog('❌ Validation Error: Missing phone', null, 'warning');
    }
  }

  // Validate payment method
  if (!orderData.paymentMethod || !orderData.paymentMethod.trim()) {
    errors.push('Payment method is required');
    debugLog('❌ Validation Error: Missing payment method', null, 'warning');
  }

  // Validate prices
  if (!orderData.totalPrice || orderData.totalPrice <= 0) {
    errors.push('Invalid total price');
    debugLog('❌ Validation Error: Invalid total price', { totalPrice: orderData.totalPrice }, 'warning');
  }

  const isValid = errors.length === 0;

  terminalLog('ORDER_VALIDATION', isValid ? 'SUCCESS' : 'ERROR', {
    isValid,
    errors
  });

  if (isValid) {
    debugLog('✅ Order data validation successful', null, 'success');
  } else {
    debugLog('❌ Order data validation failed', { errors }, 'warning');
  }

  return {
    isValid,
    errors
  };
};

// Download invoice for an order
export const downloadInvoice = async (orderId) => {
  try {
    terminalLog('INVOICE_DOWNLOAD', 'PROCESSING', { orderId });
    debugLog('⬇️ Attempting to download invoice', { orderId }, 'info');
    
    const response = await api.get(`/orders/${orderId}/invoice`, {
      responseType: 'blob' // Important for file downloads
    });
    
    // Create a blob from the PDF data
    const blob = new Blob([response.data], { type: 'application/pdf' });
    
    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${orderId}.pdf`;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    window.URL.revokeObjectURL(url);
    
    terminalLog('INVOICE_DOWNLOAD', 'SUCCESS', { orderId });
    debugLog('✅ Invoice downloaded successfully', { orderId }, 'success');
    
    return {
      success: true,
      message: 'Invoice downloaded successfully'
    };
  } catch (error) {
    terminalLog('INVOICE_DOWNLOAD', 'ERROR', {
      orderId,
      error: error.message
    });
    debugLog('❌ Failed to download invoice', { orderId, error: error.message }, 'error');
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to download invoice'
    };
  }
};

// Default export
const orderService = {
  processPayment,
  formatOrderForAPI,
  createOrder,
  getOrderById,
  getUserOrders,
  getSellerOrders,
  updateOrderStatus,
  getSellerOrderStats,
  calculateOrderTotals,
  validateOrderData,
  downloadInvoice
};

// 🎯 Global debug functions for production monitoring
if (typeof window !== 'undefined') {
  window.debugOrderFlow = {
    checkAuth: checkAuthentication,
    checkSellerAuth: checkSellerAuthentication,
    
    // Test functions for debugging
    simulateOrderCreation: async (testData) => {
      terminalLog('DEBUG_ORDER_SIMULATION', 'PROCESSING', testData);
      return await createOrder(testData);
    },
    
    monitorFlow: () => {
      console.log(`
🔍 ===============================
   ORDER FLOW MONITORING
===============================
🔑 User Auth: ${checkAuthentication().isAuthenticated ? '✅' : '❌'}
🏪 Seller Auth: ${checkSellerAuthentication().isAuthenticated ? '✅' : '❌'}
📱 Environment: ${process.env.NODE_ENV}
⏰ Timestamp: ${new Date().toLocaleString()}
===============================`);
    }
  };
  
  // Auto-monitor in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Order Service Debug Functions Available:');
    console.log('- window.debugOrderFlow.checkAuth()');
    console.log('- window.debugOrderFlow.checkSellerAuth()');
    console.log('- window.debugOrderFlow.monitorFlow()');
  }
}

export default orderService;
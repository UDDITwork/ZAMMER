import api from './api';

// Enhanced debugging
const debugLog = (message, data = null, type = 'info') => {
  if (process.env.NODE_ENV === 'development') {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50', 
      warning: '#FF9800',
      error: '#F44336'
    };
    
    console.log(
      `%c[OrderService] ${message}`,
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

// Check authentication before order operations
const checkAuthentication = () => {
  const userToken = localStorage.getItem('userToken');
  const userData = localStorage.getItem('userData');
  
  if (!userToken || !isValidJWTStructure(userToken) || !userData) {
    return {
      isAuthenticated: false,
      error: 'Please login to place orders'
    };
  }
  
  try {
    const parsedUserData = JSON.parse(userData);
    return {
      isAuthenticated: true,
      user: parsedUserData
    };
  } catch (error) {
    // Clean up corrupted data
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    return {
      isAuthenticated: false,
      error: 'Session data corrupted. Please login again.'
    };
  }
};

// Format order data for API
export const formatOrderForAPI = (cartItems, shippingAddress, paymentMethod) => {
  debugLog('📦 Formatting order data for API', {
    itemCount: cartItems.length,
    paymentMethod,
    hasShippingAddress: !!shippingAddress
  }, 'info');

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

  debugLog('✅ Order data formatted successfully', {
    orderItems: orderItems.length,
    subtotal,
    taxPrice,
    shippingPrice,
    totalPrice,
    sellerId
  }, 'success');

  return orderData;
};

// Create a new order
export const createOrder = async (orderData) => {
  try {
    debugLog('📝 Creating new order', {
      itemCount: orderData.orderItems?.length,
      totalPrice: orderData.totalPrice,
      paymentMethod: orderData.paymentMethod
    }, 'info');

    // Check authentication first
    const authCheck = checkAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('🚫 Order creation - Auth failed', authCheck, 'warning');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true
      };
    }

    const response = await api.post('/orders', orderData);
    
    debugLog('✅ Order created successfully', {
      orderId: response.data.data?._id,
      orderNumber: response.data.data?.orderNumber,
      success: response.data.success
    }, 'success');

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Order created successfully'
    };
  } catch (error) {
    debugLog('❌ Order creation failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code
    }, 'error');

    // Handle authentication errors
    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('🔑 Token error in order creation, clearing auth data', {
          code: error.response.data.code
        }, 'warning');
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

// Get order by ID
export const getOrderById = async (orderId) => {
  try {
    debugLog('🔍 Fetching order by ID', { orderId }, 'info');

    const response = await api.get(`/orders/${orderId}`);
    
    debugLog('✅ Order fetched successfully', {
      orderId,
      orderNumber: response.data.data?.orderNumber,
      status: response.data.data?.status
    }, 'success');

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    debugLog('❌ Order fetch failed', {
      orderId,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    }, 'error');

    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch order'
    };
  }
};

// Get user's orders
export const getUserOrders = async (page = 1, limit = 10) => {
  try {
    debugLog('📋 Fetching user orders', { page, limit }, 'info');

    // Check authentication first
    const authCheck = checkAuthentication();
    if (!authCheck.isAuthenticated) {
      debugLog('🚫 Get user orders - Auth failed', authCheck, 'warning');
      return {
        success: false,
        message: authCheck.error,
        requiresAuth: true
      };
    }

    const response = await api.get('/orders/myorders', {
      params: { page, limit }
    });
    
    debugLog('✅ User orders fetched successfully', {
      count: response.data.count,
      totalPages: response.data.totalPages,
      currentPage: response.data.currentPage
    }, 'success');

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
    debugLog('❌ User orders fetch failed', {
      page,
      limit,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code
    }, 'error');

    // Handle authentication errors
    if (error.response?.status === 401) {
      const isTokenError = error.response?.data?.code && [
        'INVALID_TOKEN', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN', 'NO_TOKEN'
      ].includes(error.response.data.code);
      
      if (isTokenError) {
        debugLog('🔑 Token error in get user orders, clearing auth data', {
          code: error.response.data.code
        }, 'warning');
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

// Calculate order totals
export const calculateOrderTotals = (cartItems) => {
  debugLog('🧮 Calculating order totals', {
    itemCount: cartItems.length
  }, 'info');

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

  debugLog('✅ Order totals calculated', totals, 'success');

  return totals;
};

// Validate order data before submission
export const validateOrderData = (orderData) => {
  debugLog('🔍 Validating order data', {
    hasOrderItems: !!orderData.orderItems,
    hasShippingAddress: !!orderData.shippingAddress,
    hasPaymentMethod: !!orderData.paymentMethod
  }, 'info');

  const errors = [];

  // Validate order items
  if (!orderData.orderItems || !Array.isArray(orderData.orderItems) || orderData.orderItems.length === 0) {
    errors.push('Order must contain at least one item');
  }

  // Validate shipping address
  if (!orderData.shippingAddress) {
    errors.push('Shipping address is required');
  } else {
    const { address, city, postalCode, phone } = orderData.shippingAddress;
    if (!address || !address.trim()) errors.push('Street address is required');
    if (!city || !city.trim()) errors.push('City is required');
    if (!postalCode || !postalCode.trim()) errors.push('Postal code is required');
    if (!phone || !phone.trim()) errors.push('Phone number is required');
  }

  // Validate payment method
  if (!orderData.paymentMethod || !orderData.paymentMethod.trim()) {
    errors.push('Payment method is required');
  }

  // Validate prices
  if (!orderData.totalPrice || orderData.totalPrice <= 0) {
    errors.push('Invalid total price');
  }

  const isValid = errors.length === 0;

  debugLog(isValid ? '✅ Order data is valid' : '❌ Order data validation failed', {
    isValid,
    errors
  }, isValid ? 'success' : 'error');

  return {
    isValid,
    errors
  };
};

// Default export
const orderService = {
  formatOrderForAPI,
  createOrder,
  getOrderById,
  getUserOrders,
  calculateOrderTotals,
  validateOrderData
};

export default orderService;
// frontend/src/services/orderService.js - Enhanced with Better Error Handling

import api from './api';

// Enhanced error handler
const handleApiError = (error, operation) => {
  console.error(`❌ [ORDER-SERVICE] ${operation} error:`, error);
  
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        return {
          success: false,
          message: 'Please login to continue',
          requiresAuth: true,
          errorCode: 'UNAUTHORIZED'
        };
      case 403:
        return {
          success: false,
          message: 'You do not have permission to perform this action',
          errorCode: 'FORBIDDEN'
        };
      case 404:
        return {
          success: false,
          message: 'The requested resource was not found',
          errorCode: 'NOT_FOUND'
        };
      case 409:
        return {
          success: false,
          message: data.message || 'A conflict occurred',
          errorCode: 'CONFLICT'
        };
      case 422:
        return {
          success: false,
          message: data.message || 'Invalid data provided',
          errorCode: 'VALIDATION_ERROR',
          errors: data.errors || []
        };
      case 500:
        return {
          success: false,
          message: 'Server error occurred. Please try again later.',
          errorCode: 'SERVER_ERROR'
        };
      default:
        return {
          success: false,
          message: data.message || `Error occurred (${status})`,
          errorCode: 'API_ERROR'
        };
    }
  } else if (error.request) {
    // Request was made but no response received
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
      errorCode: 'NETWORK_ERROR'
    };
  } else {
    // Something else happened
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
};

// Enhanced logging
const logOperation = (operation, data, type = 'info') => {
  const timestamp = new Date().toISOString().slice(11, 23);
  const colors = {
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336'
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `%c[ORDER-SERVICE] ${timestamp} - ${operation}`,
      `color: ${colors[type]}; font-weight: bold;`,
      data
    );
  }
};

// Mock Payment Processor
class MockPaymentProcessor {
  constructor() {
    this.isTestMode = true;
    this.testDelay = 2000;
  }

  async processPayment(paymentData) {
    logOperation('Mock Payment Processing', {
      method: paymentData.method,
      amount: paymentData.amount
    }, 'info');

    await this.simulateDelay();
    const mockResponse = this.generateMockResponse(paymentData);
    
    logOperation('Mock Payment Completed', mockResponse, 'success');
    
    return {
      success: true,
      data: mockResponse,
      message: 'Payment processed successfully (Mock)'
    };
  }

  async simulateDelay() {
    return new Promise(resolve => {
      setTimeout(resolve, this.testDelay);
    });
  }

  generateMockResponse(paymentData) {
    const timestamp = new Date().toISOString();
    const mockTransactionId = this.generateTransactionId(paymentData.method);

    switch (paymentData.method) {
      case 'Card':
        return {
          transactionId: mockTransactionId,
          method: 'Card',
          status: 'success',
          amount: paymentData.amount,
          currency: 'INR',
          processingTime: this.testDelay,
          gateway: 'MockCardGateway',
          cardLast4: paymentData.cardDetails?.cardNumber ? 
            paymentData.cardDetails.cardNumber.replace(/\s/g, '').slice(-4) : 
            '1234',
          authCode: this.generateAuthCode(),
          timestamp: timestamp,
          isTest: true
        };

      case 'UPI':
        return {
          transactionId: mockTransactionId,
          method: 'UPI',
          status: 'success',
          amount: paymentData.amount,
          currency: 'INR',
          processingTime: this.testDelay,
          gateway: 'MockUPIGateway',
          upiId: paymentData.upiId,
          bankRefId: this.generateBankRefId(),
          timestamp: timestamp,
          isTest: true
        };

      case 'Cash on Delivery':
        return {
          transactionId: mockTransactionId,
          method: 'Cash on Delivery',
          status: 'Pending',
          amount: paymentData.amount,
          currency: 'INR',
          processingTime: 0,
          gateway: 'MockCODSystem',
          note: 'Payment will be collected on delivery',
          timestamp: timestamp,
          isTest: true
        };

      default:
        throw new Error(`Unsupported payment method: ${paymentData.method}`);
    }
  }

  generateTransactionId(method) {
    const prefix = {
      'Card': 'TXN_CARD_',
      'UPI': 'TXN_UPI_',
      'Cash on Delivery': 'TXN_COD_'
    };

    const randomId = Math.random().toString(36).substring(2, 15) + 
                     Date.now().toString(36);
    
    return (prefix[method] || 'TXN_') + randomId.toUpperCase();
  }

  generateAuthCode() {
    return Math.floor(Math.random() * 900000) + 100000;
  }

  generateBankRefId() {
    return 'BNK' + Math.floor(Math.random() * 9000000000) + 1000000000;
  }

  async simulateFailure(paymentData, errorType = 'generic') {
    await this.simulateDelay();
    
    const errorMessages = {
      'card_declined': 'Card was declined by the issuing bank',
      'insufficient_funds': 'Insufficient funds in the account',
      'upi_timeout': 'UPI transaction timed out',
      'invalid_upi': 'Invalid UPI ID provided',
      'network_error': 'Network error during transaction',
      'generic': 'Payment processing failed. Please try again.'
    };

    return {
      success: false,
      error: errorMessages[errorType] || errorMessages.generic,
      errorCode: errorType.toUpperCase(),
      isTest: true
    };
  }
}

const mockPaymentProcessor = new MockPaymentProcessor();

// Enhanced Order Service
const orderService = {
  // Process payment
  async processPayment(paymentData) {
    try {
      logOperation('Payment Processing Start', {
        method: paymentData.method,
        amount: paymentData.amount
      }, 'info');

      if (mockPaymentProcessor.isTestMode) {
        logOperation('Using Mock Payment System', null, 'warning');
        
        if (paymentData.amount === 999) {
          return await mockPaymentProcessor.simulateFailure(paymentData, 'card_declined');
        }
        
        return await mockPaymentProcessor.processPayment(paymentData);
      }

      throw new Error('Real payment gateway not configured yet');
      
    } catch (error) {
      return handleApiError(error, 'processPayment');
    }
  },

  // Create order with enhanced error handling
  async createOrder(orderData) {
    try {
      logOperation('Order Creation Start', {
        itemCount: orderData.orderItems?.length,
        totalPrice: orderData.totalPrice,
        paymentMethod: orderData.paymentMethod,
        sellerId: orderData.sellerId
      }, 'info');

      // Validate order data before sending
      if (!orderData.orderItems || orderData.orderItems.length === 0) {
        throw new Error('Order must contain at least one item');
      }

      if (!orderData.shippingAddress) {
        throw new Error('Shipping address is required');
      }

      if (!orderData.paymentMethod) {
        throw new Error('Payment method is required');
      }

      const response = await api.post('/orders', orderData);
      
      logOperation('Order Created Successfully', {
        orderId: response.data.data._id,
        orderNumber: response.data.data.orderNumber,
        status: response.data.data.status
      }, 'success');

      return response.data;
    } catch (error) {
      return handleApiError(error, 'createOrder');
    }
  },

  // Get user orders with pagination and filtering
  async getUserOrders(page = 1, limit = 10, filters = {}) {
    try {
      logOperation('Fetching User Orders', { page, limit, filters }, 'info');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await api.get(`/orders/myorders?${params}`);
      
      logOperation('User Orders Fetched', {
        count: response.data.count,
        totalPages: response.data.totalPages,
        currentPage: response.data.currentPage
      }, 'success');

      return response.data;
    } catch (error) {
      return handleApiError(error, 'getUserOrders');
    }
  },

  // Get seller orders with enhanced filtering
  async getSellerOrders(page = 1, limit = 10, status = null) {
    try {
      logOperation('Fetching Seller Orders', { page, limit, status }, 'info');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (status) {
        params.append('status', status);
      }

      const response = await api.get(`/orders/seller?${params}`);
      
      logOperation('Seller Orders Fetched', {
        count: response.data.count,
        totalPages: response.data.totalPages,
        currentPage: response.data.currentPage
      }, 'success');

      return response.data;
    } catch (error) {
      return handleApiError(error, 'getSellerOrders');
    }
  },

  // Update order status with validation
  async updateOrderStatus(orderId, status, notes = '') {
    try {
      logOperation('Updating Order Status', { orderId, status, notes }, 'info');

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const response = await api.put(`/orders/${orderId}/status`, { 
        status,
        notes: notes.trim()
      });
      
      logOperation('Order Status Updated', {
        orderId,
        newStatus: status,
        orderNumber: response.data.data.orderNumber
      }, 'success');

      return response.data;
    } catch (error) {
      return handleApiError(error, 'updateOrderStatus');
    }
  },

  // Get order by ID with detailed error handling
  async getOrderById(orderId) {
    try {
      logOperation('Fetching Order by ID', { orderId }, 'info');

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const response = await api.get(`/orders/${orderId}`);
      
      logOperation('Order Fetched Successfully', {
        orderId,
        orderNumber: response.data.data.orderNumber,
        status: response.data.data.status
      }, 'success');

      return response.data;
    } catch (error) {
      return handleApiError(error, 'getOrderById');
    }
  },

  // Get order statistics for sellers
  async getSellerOrderStats() {
    try {
      logOperation('Fetching Seller Order Stats', null, 'info');

      const response = await api.get('/orders/seller/stats');
      
      logOperation('Seller Stats Fetched', {
        totalOrders: Object.values(response.data.data.statusCounts || {}).reduce((a, b) => a + b, 0),
        revenue: response.data.data.totalRevenue,
        todayOrders: response.data.data.todayOrdersCount
      }, 'success');

      return response.data;
    } catch (error) {
      return handleApiError(error, 'getSellerOrderStats');
    }
  },

  // Get order invoice with download handling
  async getOrderInvoice(orderId) {
    try {
      logOperation('Fetching Order Invoice', { orderId }, 'info');

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const response = await api.get(`/orders/${orderId}/invoice`);
      
      logOperation('Invoice Fetched Successfully', {
        orderId,
        invoiceUrl: response.data.data.invoiceUrl
      }, 'success');

      return response.data;
    } catch (error) {
      return handleApiError(error, 'getOrderInvoice');
    }
  },

  // Download invoice with proper error handling
  async downloadInvoice(orderNumber) {
    try {
      logOperation('Downloading Invoice', { orderNumber }, 'info');

      if (!orderNumber) {
        throw new Error('Order number is required');
      }

      // First get the invoice URL
      const orders = await this.getUserOrders(1, 100);
      if (!orders.success) {
        throw new Error('Failed to fetch orders');
      }

      const order = orders.data.find(o => o.orderNumber === orderNumber);
      if (!order) {
        throw new Error('Order not found');
      }

      const invoiceResponse = await this.getOrderInvoice(order._id);
      if (!invoiceResponse.success) {
        throw new Error(invoiceResponse.message || 'Failed to get invoice');
      }

      // Open invoice in new tab or download
      const invoiceUrl = invoiceResponse.data.invoiceUrl;
      if (invoiceUrl) {
        window.open(invoiceUrl, '_blank');
        logOperation('Invoice Downloaded', { orderNumber, invoiceUrl }, 'success');
        return { success: true, message: 'Invoice downloaded successfully' };
      } else {
        throw new Error('Invoice URL not available');
      }

    } catch (error) {
      return handleApiError(error, 'downloadInvoice');
    }
  },

  // Enhanced order formatting with validation
  formatOrderForAPI(cartItems, shippingAddress, paymentMethod) {
    try {
      logOperation('Formatting Order Data', {
        itemCount: cartItems.length,
        paymentMethod,
        hasShippingAddress: !!shippingAddress
      }, 'info');

      if (!cartItems || cartItems.length === 0) {
        throw new Error('No items in cart');
      }

      if (!shippingAddress) {
        throw new Error('Shipping address is required');
      }

      if (!paymentMethod) {
        throw new Error('Payment method is required');
      }

      // Validate shipping address
      const requiredAddressFields = ['address', 'city', 'postalCode', 'country', 'phone'];
      for (const field of requiredAddressFields) {
        if (!shippingAddress[field]) {
          throw new Error(`Shipping address ${field} is required`);
        }
      }

      // Group items by seller
      const itemsBySeller = cartItems.reduce((acc, item) => {
        const sellerId = item.product.seller._id || item.product.seller;
        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        acc[sellerId].push(item);
        return acc;
      }, {});

      const sellerIds = Object.keys(itemsBySeller);
      if (sellerIds.length > 1) {
        throw new Error('All items must be from the same seller');
      }

      const sellerId = sellerIds[0];
      
      // Calculate totals with validation
      const subtotal = cartItems.reduce((total, item) => {
        if (!item.price || !item.quantity) {
          throw new Error('Invalid item price or quantity');
        }
        return total + (item.price * item.quantity);
      }, 0);

      const taxPrice = Math.round(subtotal * 0.18); // 18% GST
      const shippingPrice = subtotal >= 500 ? 0 : 50; // Free shipping above ₹500
      const totalPrice = subtotal + taxPrice + shippingPrice;

      // Format order items with validation
      const orderItems = cartItems.map(item => {
        if (!item.product || !item.product._id) {
          throw new Error('Invalid product data');
        }

        return {
          product: item.product._id,
          name: item.product.name || 'Unknown Product',
          quantity: item.quantity || 1,
          price: item.price || 0,
          image: item.product.images?.[0] || '',
          size: item.selectedSize || 'Standard',
          color: item.selectedColor || 'Default'
        };
      });

      const formattedOrder = {
        sellerId,
        orderItems,
        shippingAddress,
        paymentMethod,
        taxPrice,
        shippingPrice,
        totalPrice: Math.round(totalPrice)
      };

      logOperation('Order Data Formatted Successfully', {
        sellerId,
        itemCount: orderItems.length,
        totalPrice: formattedOrder.totalPrice,
        subtotal,
        taxPrice,
        shippingPrice
      }, 'success');

      return formattedOrder;
      
    } catch (error) {
      logOperation('Order Formatting Error', { error: error.message }, 'error');
      throw error;
    }
  },

  // Retry mechanism for failed requests
  async retryRequest(requestFunction, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logOperation('Request Attempt', { attempt, maxRetries }, 'info');
        const result = await requestFunction();
        return result;
      } catch (error) {
        logOperation('Request Failed', { 
          attempt, 
          maxRetries, 
          error: error.message 
        }, 'warning');

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  },

  // Test mode controls
  setTestMode(enabled) {
    mockPaymentProcessor.isTestMode = enabled;
    logOperation(`Test Mode ${enabled ? 'Enabled' : 'Disabled'}`, null, 'info');
  },

  isTestMode() {
    return mockPaymentProcessor.isTestMode;
  },

  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/health');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: 'Service unavailable' };
    }
  },

  // 🎯 NEW: Generate shipping label for order
  async generateShippingLabel(orderId) {
    try {
      logOperation('Generating Shipping Label', { orderId }, 'info');

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const response = await api.post(`/sellers/orders/${orderId}/generate-label`);
      
      logOperation('Shipping Label Generated', {
        orderId,
        trackingNumber: response.data.data.trackingNumber,
        labelUrl: response.data.data.labelUrl
      }, 'success');

      return response.data;
    } catch (error) {
      return handleApiError(error, 'generateShippingLabel');
    }
  },

  // 🎯 NEW: Get shipping label data
  async getShippingLabel(orderId) {
    try {
      logOperation('Fetching Shipping Label', { orderId }, 'info');

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const response = await api.get(`/sellers/orders/${orderId}/label`);
      
      logOperation('Shipping Label Fetched', {
        orderId,
        trackingNumber: response.data.data.trackingNumber,
        isGenerated: response.data.data.labelUrl ? true : false
      }, 'success');

      return response.data;
    } catch (error) {
      return handleApiError(error, 'getShippingLabel');
    }
  },

  // 🎯 NEW: Download shipping label
  async downloadShippingLabel(orderId) {
    try {
      logOperation('Downloading Shipping Label', { orderId }, 'info');

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      // Get label data first to check if it exists
      const labelData = await this.getShippingLabel(orderId);
      if (!labelData.success) {
        throw new Error(labelData.message || 'Label not found');
      }

      // Open label URL in new tab for download
      if (labelData.data.labelUrl) {
        window.open(labelData.data.labelUrl, '_blank');
        logOperation('Shipping Label Downloaded', {
          orderId,
          trackingNumber: labelData.data.trackingNumber,
          labelUrl: labelData.data.labelUrl
        }, 'success');
        
        return { 
          success: true, 
          message: 'Shipping label downloaded successfully',
          data: labelData.data
        };
      } else {
        throw new Error('Label URL not available');
      }

    } catch (error) {
      return handleApiError(error, 'downloadShippingLabel');
    }
  }
};

export default orderService;
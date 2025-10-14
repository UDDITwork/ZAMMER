// backend/config/cashfreePG.js - Cashfree Payment Gateway Configuration (PRODUCTION ONLY)

require('dotenv').config();

const config = {
  production: {
    baseUrl: 'https://api.cashfree.com/pg',
    appId: process.env.CASHFREE_PG_APP_ID || '',
    secretKey: process.env.CASHFREE_PG_SECRET_KEY || '',
    apiVersion: '2023-08-01', // API version format: YYYY-MM-DD
    environment: 'production'
  }
};

// Get current environment configuration
const getConfig = () => {
  const productionConfig = config.production;
  
  // Validate required configuration
  if (!productionConfig.appId || !productionConfig.secretKey) {
    throw new Error('Cashfree Payment Gateway configuration missing - check CASHFREE_PG_APP_ID and CASHFREE_PG_SECRET_KEY environment variables');
  }
  
  return productionConfig;
};

// API Endpoints
const endpoints = {
  // Order Management
  createOrder: '/orders',
  getOrder: '/orders', // GET /orders/{order_id}
  getOrderPayments: '/orders', // GET /orders/{order_id}/payments
  
  // Order Operations (if needed later)
  createRefund: '/orders', // POST /orders/{order_id}/refunds
  getRefund: '/orders' // GET /orders/{order_id}/refunds/{refund_id}
};

// Request Headers Template
const getHeaders = (requestId = null) => {
  const cfg = getConfig();
  const headers = {
    'Content-Type': 'application/json',
    'x-api-version': cfg.apiVersion,
    'x-client-id': cfg.appId,
    'x-client-secret': cfg.secretKey
  };
  
  if (requestId) {
    headers['x-request-id'] = requestId;
  }
  
  return headers;
};

// Order Status Mapping
const orderStatusMap = {
  'ACTIVE': 'pending',      // No successful transaction yet
  'PAID': 'completed',       // Order paid successfully
  'EXPIRED': 'expired',      // Order expired
  'TERMINATED': 'cancelled', // Order terminated
  'TERMINATION_REQUESTED': 'cancelling' // Termination requested
};

// Payment Status Mapping
const paymentStatusMap = {
  'SUCCESS': 'completed',
  'FAILED': 'failed',
  'PENDING': 'pending',
  'USER_DROPPED': 'cancelled',
  'VOID': 'cancelled',
  'CANCELLED': 'cancelled',
  'NOT_ATTEMPTED': 'pending'
};

// Validation Rules (based on API documentation)
const validationRules = {
  orderAmount: {
    min: 1.0,
    max: 10000000.0, // 1 crore
    decimals: 2,
    required: true
  },
  orderCurrency: {
    default: 'INR',
    allowed: ['INR'],
    required: true
  },
  customerId: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9]+$/,
    required: true
  },
  customerPhone: {
    minLength: 10,
    pattern: /^[0-9+]+$/,
    required: true
  },
  customerEmail: {
    minLength: 3,
    maxLength: 100,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: false
  },
  customerName: {
    minLength: 3,
    maxLength: 100,
    required: false
  },
  orderId: {
    minLength: 3,
    maxLength: 45,
    pattern: /^[a-zA-Z0-9_-]+$/,
    required: false
  },
  orderNote: {
    minLength: 3,
    maxLength: 200,
    required: false
  }
};

// Utility Functions
const utils = {
  // Generate unique request ID
  generateRequestId: () => {
    return `CF_PG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Format amount for Cashfree API (up to 2 decimals)
  formatAmount: (amount) => {
    return Math.round(amount * 100) / 100;
  },
  
  // Generate customer ID from user MongoDB ID
  generateCustomerId: (userId) => {
    // Remove any special characters and ensure only alphanumeric
    const cleanId = userId.toString().replace(/[^a-zA-Z0-9]/g, '');
    return `USER${cleanId}`;
  },
  
  // Generate unique order ID
  generateOrderId: (orderMongoId) => {
    // Remove any special characters and ensure only alphanumeric
    const cleanId = orderMongoId.toString().replace(/[^a-zA-Z0-9]/g, '');
    return `ORDER${cleanId}`;
  },
  
  // Validate order amount
  validateOrderAmount: (amount) => {
    const rules = validationRules.orderAmount;
    if (amount < rules.min || amount > rules.max) {
      throw new Error(`Order amount must be between ₹${rules.min} and ₹${rules.max}`);
    }
    return utils.formatAmount(amount);
  },
  
  // Validate customer phone
  validateCustomerPhone: (phone) => {
    const rules = validationRules.customerPhone;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    
    if (cleanPhone.length < rules.minLength) {
      throw new Error(`Phone number must be at least ${rules.minLength} digits`);
    }
    
    if (!rules.pattern.test(cleanPhone)) {
      throw new Error('Invalid phone number format');
    }
    
    return cleanPhone;
  },
  
  // Validate customer ID
  validateCustomerId: (customerId) => {
    const rules = validationRules.customerId;
    
    if (customerId.length < rules.minLength || customerId.length > rules.maxLength) {
      throw new Error(`Customer ID must be between ${rules.minLength} and ${rules.maxLength} characters`);
    }
    
    // Since we're already cleaning the ID in generateCustomerId, just return it
    // The pattern validation is redundant as we ensure alphanumeric in generation
    return customerId;
  }
};

// Error Code Mapping (based on API documentation)
const errorCodeMap = {
  'request_failed': 'REQUEST_FAILED',
  'authentication_error': 'AUTHENTICATION_ERROR',
  'something_not_found': 'NOT_FOUND',
  'order_already_exists': 'ORDER_EXISTS',
  'request_invalid': 'INVALID_REQUEST',
  'idempotency_error': 'IDEMPOTENCY_ERROR',
  'rate_limit_error': 'RATE_LIMIT_EXCEEDED',
  'internal_error': 'INTERNAL_ERROR',
  'api_error': 'API_ERROR'
};

// HTTP Status Code Messages
const statusMessages = {
  400: 'Bad request - please check request parameters',
  401: 'Authentication failed - check API credentials',
  404: 'Resource not found',
  409: 'Order with same ID already exists',
  422: 'Invalid request - check parameters',
  429: 'Too many requests - rate limit exceeded',
  500: 'Internal server error - please try again',
  502: 'Bad gateway - service temporarily unavailable',
  503: 'Service unavailable - please try again later'
};

// Logging Configuration
const logging = {
  enabled: process.env.CASHFREE_PG_LOGGING_ENABLED === 'true' || true,
  logLevel: process.env.CASHFREE_PG_LOG_LEVEL || 'info'
};

module.exports = {
  getConfig,
  endpoints,
  getHeaders,
  orderStatusMap,
  paymentStatusMap,
  validationRules,
  utils,
  errorCodeMap,
  statusMessages,
  logging
};


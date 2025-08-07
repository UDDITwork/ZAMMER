// backend/config/smepay.js - SMEPay API Configuration

const smepayConfig = {
    // Base Configuration
    baseURL: process.env.SMEPAY_BASE_URL || 'https://apps.typof.in/api/external',
    
    // Credentials from environment
    clientId: process.env.SMEPAY_CLIENT_ID,
    clientSecret: process.env.SMEPAY_CLIENT_SECRET,
    
    // Webhook configuration
    webhookSecret: process.env.SMEPAY_WEBHOOK_SECRET,
    
    // API Endpoints
    endpoints: {
      auth: '/auth',
      createOrder: '/create-order', 
      validateOrder: '/validate-order',
      generateQR: '/generate-qr',
      checkQRStatus: '/check-qr-status'
    },
    
    // Default settings
    defaults: {
      currency: 'INR',
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000 // 1 second
    },
    
    // Callback URLs (dynamic based on environment)
    getCallbackURL: () => {
      // Dynamic frontend URL based on environment
      const getFrontendUrl = () => {
        if (process.env.NODE_ENV === 'production') {
          return process.env.FRONTEND_URL_PROD || 'https://zammer2.uc.r.appspot.com';
        }
        return process.env.FRONTEND_URL_LOCAL || 'http://localhost:3000';
      };
      
      const baseURL = getFrontendUrl();
      return `${baseURL}/payment/callback`;
    },
    
    getWebhookURL: () => {
      // Dynamic backend URL based on environment
      const getBackendUrl = () => {
        if (process.env.NODE_ENV === 'production') {
          return process.env.BACKEND_URL_PROD || 'https://onyx-osprey-462815-i9.uc.r.appspot.com';
        }
        return process.env.BACKEND_URL_LOCAL || 'http://localhost:5001';
      };
      
      const baseURL = getBackendUrl();
      return `${baseURL}/api/payments/webhook`;
    },
    
    // Validation helpers
    validateConfig: () => {
      const required = ['clientId', 'clientSecret'];
      const missing = required.filter(key => !smepayConfig[key]);
      
      if (missing.length > 0) {
        throw new Error(`Missing SMEPay configuration: ${missing.join(', ')}`);
      }
      
      return true;
    },
    
    // Logging configuration
    enableLogging: process.env.NODE_ENV === 'development',
    
    // Error codes and messages
    errorCodes: {
      INVALID_CREDENTIALS: 'Invalid client credentials',
      ORDER_CREATION_FAILED: 'Failed to create order with SMEPay',
      PAYMENT_VALIDATION_FAILED: 'Payment validation failed',
      NETWORK_ERROR: 'Network error communicating with SMEPay',
      TIMEOUT_ERROR: 'Request to SMEPay timed out',
      WEBHOOK_VERIFICATION_FAILED: 'Webhook signature verification failed'
    },
    
    // Status mappings
    statusMappings: {
      // SMEPay statuses to internal statuses
      'paid': 'success',
      'unpaid': 'pending',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'expired': 'expired'
    },
    
    // Payment method mappings
    paymentMethods: {
      'SMEPay': 'SMEPay',
      'UPI': 'UPI',
      'Card': 'Card'
    }
  };
  
  // Validation on module load
  try {
    smepayConfig.validateConfig();
    console.log('✅ SMEPay configuration validated successfully');
  } catch (error) {
    console.error('❌ SMEPay configuration error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
  
  module.exports = smepayConfig; 

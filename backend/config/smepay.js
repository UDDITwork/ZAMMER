// backend/config/smepay.js - SMEPay API Configuration - UNIVERSAL VERSION

const smepayConfig = {
  // Base Configuration - Environment Variable Based
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
  
  // 🎯 UNIVERSAL: Dynamic Frontend URL - Environment Variable Based
  getFrontendUrl: () => {
    if (process.env.NODE_ENV === 'production') {
      // Try production-specific variables first, then fallback
      return process.env.FRONTEND_URL_PROD || 
             process.env.FRONTEND_URL || 
             process.env.PUBLIC_URL ||
             'http://localhost:3000';
    }
    
    // Development environment
    return process.env.FRONTEND_URL_LOCAL || 
           process.env.FRONTEND_URL || 
           process.env.PUBLIC_URL ||
           'http://localhost:3000';
  },
  
  // 🎯 UNIVERSAL: Dynamic Backend URL - Environment Variable Based
  getBackendUrl: () => {
    if (process.env.NODE_ENV === 'production') {
      // Try production-specific variables first, then fallback
      return process.env.BACKEND_URL_PROD || 
             process.env.BACKEND_URL || 
             process.env.API_BASE_URL ||
             process.env.SERVER_URL ||
             'http://localhost:5001';
    }
    
    // Development environment
    return process.env.BACKEND_URL_LOCAL || 
           process.env.BACKEND_URL || 
           process.env.API_BASE_URL ||
           process.env.SERVER_URL ||
           'http://localhost:5001';
  },
  
  // Callback URLs (dynamic based on environment)
  getCallbackURL: () => {
    const baseURL = smepayConfig.getFrontendUrl();
    return `${baseURL}/payment/callback`;
  },
  
  getWebhookURL: () => {
    const baseURL = smepayConfig.getBackendUrl();
    return `${baseURL}/api/payments/webhook`;
  },
  
  // 🎯 NEW: Get Success/Failure URLs
  getSuccessURL: () => {
    const baseURL = smepayConfig.getFrontendUrl();
    return `${baseURL}/payment/success`;
  },
  
  getFailureURL: () => {
    const baseURL = smepayConfig.getFrontendUrl();
    return `${baseURL}/payment/failure`;
  },
  
  getCancelURL: () => {
    const baseURL = smepayConfig.getFrontendUrl();
    return `${baseURL}/payment/cancel`;
  },
  
  // 🎯 ENHANCED: Validation helpers with better error messages
  validateConfig: () => {
    const required = ['clientId', 'clientSecret'];
    const missing = required.filter(key => !smepayConfig[key]);
    
    if (missing.length > 0) {
      const errorMsg = `Missing SMEPay configuration: ${missing.join(', ')}. Please set environment variables: ${missing.map(key => `SMEPAY_${key.toUpperCase()}`).join(', ')}`;
      throw new Error(errorMsg);
    }
    
    // Validate URLs
    try {
      const frontendUrl = smepayConfig.getFrontendUrl();
      const backendUrl = smepayConfig.getBackendUrl();
      
      if (!frontendUrl.startsWith('http')) {
        throw new Error(`Invalid frontend URL: ${frontendUrl}. Must start with http:// or https://`);
      }
      
      if (!backendUrl.startsWith('http')) {
        throw new Error(`Invalid backend URL: ${backendUrl}. Must start with http:// or https://`);
      }
    } catch (error) {
      throw new Error(`URL validation failed: ${error.message}`);
    }
    
    return true;
  },
  
  // 🎯 NEW: Get configuration summary for debugging
  getConfigSummary: () => {
    return {
      environment: process.env.NODE_ENV || 'development',
      baseURL: smepayConfig.baseURL,
      hasClientId: !!smepayConfig.clientId,
      hasClientSecret: !!smepayConfig.clientSecret,
      hasWebhookSecret: !!smepayConfig.webhookSecret,
      frontendUrl: smepayConfig.getFrontendUrl(),
      backendUrl: smepayConfig.getBackendUrl(),
      callbackUrl: smepayConfig.getCallbackURL(),
      webhookUrl: smepayConfig.getWebhookURL(),
      urls: {
        success: smepayConfig.getSuccessURL(),
        failure: smepayConfig.getFailureURL(),
        cancel: smepayConfig.getCancelURL()
      },
      availableEnvVars: {
        // Frontend URLs
        hasFrontendUrlProd: !!process.env.FRONTEND_URL_PROD,
        hasFrontendUrl: !!process.env.FRONTEND_URL,
        hasFrontendUrlLocal: !!process.env.FRONTEND_URL_LOCAL,
        hasPublicUrl: !!process.env.PUBLIC_URL,
        
        // Backend URLs
        hasBackendUrlProd: !!process.env.BACKEND_URL_PROD,
        hasBackendUrl: !!process.env.BACKEND_URL,
        hasBackendUrlLocal: !!process.env.BACKEND_URL_LOCAL,
        hasApiBaseUrl: !!process.env.API_BASE_URL,
        hasServerUrl: !!process.env.SERVER_URL,
        
        // SMEPay credentials
        hasSmepayClientId: !!process.env.SMEPAY_CLIENT_ID,
        hasSmepayClientSecret: !!process.env.SMEPAY_CLIENT_SECRET,
        hasSmepayWebhookSecret: !!process.env.SMEPAY_WEBHOOK_SECRET,
        hasSmepayBaseUrl: !!process.env.SMEPAY_BASE_URL
      }
    };
  },
  
  // Logging configuration
  enableLogging: process.env.NODE_ENV === 'development' || process.env.SMEPAY_ENABLE_LOGGING === 'true',
  
  // Enhanced error codes and messages
  errorCodes: {
    INVALID_CREDENTIALS: 'Invalid client credentials',
    ORDER_CREATION_FAILED: 'Failed to create order with SMEPay',
    PAYMENT_VALIDATION_FAILED: 'Payment validation failed',
    NETWORK_ERROR: 'Network error communicating with SMEPay',
    TIMEOUT_ERROR: 'Request to SMEPay timed out',
    WEBHOOK_VERIFICATION_FAILED: 'Webhook signature verification failed',
    CONFIGURATION_ERROR: 'SMEPay configuration error',
    URL_VALIDATION_ERROR: 'URL validation error',
    ENVIRONMENT_ERROR: 'Environment variable error'
  },
  
  // Status mappings
  statusMappings: {
    // SMEPay statuses to internal statuses
    'paid': 'success',
    'unpaid': 'pending',
    'failed': 'failed',
    'cancelled': 'cancelled',
    'expired': 'expired',
    'processing': 'processing',
    'refunded': 'refunded',
    'partially_refunded': 'partially_refunded'
  },
  
  // Payment method mappings
  paymentMethods: {
    'SMEPay': 'SMEPay',
    'UPI': 'UPI',
    'Card': 'Card',
    'NetBanking': 'NetBanking',
    'Wallet': 'Wallet',
    'BNPL': 'BNPL' // Buy Now Pay Later
  },
  
  // 🎯 NEW: Environment-specific settings
  getEnvironmentSettings: () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      isProduction,
      isDevelopment,
      enableSSL: isProduction,
      enableDebugLogs: isDevelopment || process.env.SMEPAY_DEBUG === 'true',
      enableWebhookValidation: isProduction || process.env.SMEPAY_VALIDATE_WEBHOOKS === 'true',
      timeout: parseInt(process.env.SMEPAY_TIMEOUT) || smepayConfig.defaults.timeout,
      retryAttempts: parseInt(process.env.SMEPAY_RETRY_ATTEMPTS) || smepayConfig.defaults.retryAttempts,
      retryDelay: parseInt(process.env.SMEPAY_RETRY_DELAY) || smepayConfig.defaults.retryDelay
    };
  },
  
  // 🎯 NEW: URL utilities
  urlUtils: {
    // Ensure URL has protocol
    ensureProtocol: (url) => {
      if (!url) return url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      // Default to https for production, http for development
      const protocol = process.env.NODE_ENV === 'production' ? 'https://' : 'http://';
      return `${protocol}${url}`;
    },
    
    // Remove trailing slash
    removeTrailingSlash: (url) => {
      if (!url) return url;
      return url.replace(/\/$/, '');
    },
    
    // Combine base URL with path
    combinePath: (baseUrl, path) => {
      if (!baseUrl || !path) return baseUrl || path;
      const cleanBase = smepayConfig.urlUtils.removeTrailingSlash(baseUrl);
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${cleanBase}${cleanPath}`;
    }
  },
  
  // 🎯 NEW: Health check
  healthCheck: () => {
    try {
      smepayConfig.validateConfig();
      const summary = smepayConfig.getConfigSummary();
      
      return {
        healthy: true,
        message: 'SMEPay configuration is valid',
        timestamp: new Date().toISOString(),
        config: summary
      };
    } catch (error) {
      return {
        healthy: false,
        message: `SMEPay configuration error: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
};

// 🎯 ENHANCED: Validation on module load with better error handling
try {
  smepayConfig.validateConfig();
  
  if (smepayConfig.enableLogging) {
    console.log('✅ SMEPay configuration validated successfully');
    console.log('🔧 SMEPay Config Summary:', {
      environment: process.env.NODE_ENV,
      frontendUrl: smepayConfig.getFrontendUrl(),
      backendUrl: smepayConfig.getBackendUrl(),
      hasCredentials: !!(smepayConfig.clientId && smepayConfig.clientSecret)
    });
  }
} catch (error) {
  console.error('❌ SMEPay configuration error:', error.message);
  
  if (smepayConfig.enableLogging) {
    console.error('🔧 Available Environment Variables:', {
      NODE_ENV: process.env.NODE_ENV,
      SMEPAY_CLIENT_ID: !!process.env.SMEPAY_CLIENT_ID,
      SMEPAY_CLIENT_SECRET: !!process.env.SMEPAY_CLIENT_SECRET,
      FRONTEND_URL_PROD: process.env.FRONTEND_URL_PROD,
      BACKEND_URL_PROD: process.env.BACKEND_URL_PROD,
      FRONTEND_URL: process.env.FRONTEND_URL,
      BACKEND_URL: process.env.BACKEND_URL
    });
  }
  
  // Only throw in production to prevent development issues
  if (process.env.NODE_ENV === 'production') {
    throw error;
  }
}

module.exports = smepayConfig;
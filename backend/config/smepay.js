// backend/config/smepay.js - SMEPay Configuration

const smepayConfig = {
  // Base URL for SMEPay API
  baseURL: process.env.SMEPAY_BASE_URL || 'https://apps.typof.in/api/external',
  
  // Client credentials
  clientId: process.env.SMEPAY_CLIENT_ID,
  clientSecret: process.env.SMEPAY_CLIENT_SECRET,
  
  // Webhook configuration
  webhookSecret: process.env.SMEPAY_WEBHOOK_SECRET || 'smepay_webhook_secret_key',
  
  // API endpoints
  endpoints: {
    auth: '/login',
    createOrder: '/order',
    validateOrder: '/validate',
    generateQR: '/qrcode',
    checkQRStatus: '/qrstatus'
  },
  
  // Default configuration
  defaults: {
    timeout: 30000, // 30 seconds
    currency: 'INR',
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // Callback URL generator
  getCallbackURL: () => {
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL_PROD || process.env.FRONTEND_URL
      : process.env.FRONTEND_URL_LOCAL || process.env.FRONTEND_URL || 'http://localhost:3000';
    
    return `${frontendUrl}/payment/callback`;
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessful: true
  },
  
  // Phone number validation for Indian numbers
  validatePhoneNumber: (phone) => {
    if (!phone) throw new Error('Phone number is required');
    
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it's a valid Indian mobile number
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new Error('Invalid Indian mobile number format');
    }
    
    // Add country code if not present
    return cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
  },
  
  // Rate limiting check
  checkRateLimit: (phoneNumber) => {
    // In a production environment, you'd implement Redis-based rate limiting
    // For now, we'll do a simple in-memory check
    const now = Date.now();
    const windowMs = smepayConfig.rateLimit.windowMs;
    
    if (!global.smepayRateLimit) {
      global.smepayRateLimit = new Map();
    }
    
    const key = phoneNumber;
    const requests = global.smepayRateLimit.get(key) || [];
    
    // Clean old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= smepayConfig.rateLimit.maxRequests) {
      throw new Error(`Rate limit exceeded. Maximum ${smepayConfig.rateLimit.maxRequests} requests per minute.`);
    }
    
    // Add current request
    validRequests.push(now);
    global.smepayRateLimit.set(key, validRequests);
  },
  
  // Message templates for different purposes
  messageTemplates: {
    delivery: {
      english: 'Your delivery OTP is {otp}. Share this with the delivery agent to confirm receipt. Valid for 10 minutes. -Zammer',
      hindi: 'आपका डिलीवरी OTP {otp} है। डिलीवरी एजेंट के साथ साझा करें। 10 मिनट के लिए वैध। -Zammer'
    },
    pickup: {
      english: 'Pickup OTP: {otp}. Share with delivery agent for order collection. Valid for 15 minutes. -Zammer',
      hindi: 'पिकअप OTP: {otp}। डिलीवरी एजेंट के साथ साझा करें। 15 मिनट वैध। -Zammer'
    },
    payment: {
      english: 'Payment verification OTP: {otp}. Do not share with anyone. Valid for 5 minutes. -Zammer',
      hindi: 'भुगतान OTP: {otp}। किसी के साथ साझा न करें। 5 मिनट वैध। -Zammer'
    }
  },
  
  // Get message template
  getMessageTemplate: (purpose, language = 'english') => {
    return smepayConfig.messageTemplates[purpose]?.[language] || 
           smepayConfig.messageTemplates[purpose]?.english || 
           'Your OTP is {otp}. Valid for 10 minutes. -Zammer';
  },
  
  // Format message with OTP
  formatMessage: (template, otp) => {
    return template.replace('{otp}', otp);
  },
  
  // Test mode configuration
  testMode: {
    enabled: process.env.NODE_ENV === 'development' || process.env.SMEPAY_TEST_MODE === 'true',
    testOTP: '123456',
    simulateDelay: 2000, // 2 seconds
    simulateFailureRate: 0.05 // 5% failure rate for testing
  },
  
  // Validation helpers
  validateConfig: () => {
    const errors = [];
    
    if (!smepayConfig.clientId) {
      errors.push('SMEPAY_CLIENT_ID is required');
    }
    
    if (!smepayConfig.clientSecret) {
      errors.push('SMEPAY_CLIENT_SECRET is required');
    }
    
    if (!smepayConfig.baseURL) {
      errors.push('SMEPAY_BASE_URL is required');
    }
    
    if (errors.length > 0) {
      console.error('❌ SMEPay Configuration Errors:', errors);
      return { valid: false, errors };
    }
    
    console.log('✅ SMEPay Configuration Valid');
    return { valid: true, errors: [] };
  },
  
  // Debug logging
  logConfig: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 SMEPay Configuration:', {
        baseURL: smepayConfig.baseURL,
        clientId: smepayConfig.clientId ? `${smepayConfig.clientId.substring(0, 20)}...` : 'NOT_SET',
        hasClientSecret: !!smepayConfig.clientSecret,
        testMode: smepayConfig.testMode.enabled,
        callbackURL: smepayConfig.getCallbackURL(),
        endpoints: smepayConfig.endpoints
      });
    }
  }
};

// Validate configuration on load
smepayConfig.validateConfig();

// Log configuration in development
smepayConfig.logConfig();

module.exports = smepayConfig;
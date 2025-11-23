// backend/config/smepay.js - OFFICIAL SMEPay API Configuration

require('dotenv').config();

// 🎯 OFFICIAL SMEPay API Configuration based on WooCommerce plugin documentation
const smepayConfig = {
  // 🔥 UPDATED API URLs - Single base URL (no dev/prod split per new documentation)
  // Documentation: https://documenter.getpostman.com/view/43640931/2sB3HnJK8V
  baseURL: {
    development: 'https://extranet.smepay.in/api/wiz',
    production: 'https://extranet.smepay.in/api/wiz' // Same URL for both (per new API)
  },
  
  // Get base URL based on environment
  getBaseURL: function() {
    const mode = process.env.SMEPAY_MODE || 'development';
    return this.baseURL[mode];
  },
  
  // 🔥 CREDENTIALS from environment
  clientId: process.env.SMEPAY_CLIENT_ID,
  clientSecret: process.env.SMEPAY_CLIENT_SECRET,
  mode: process.env.SMEPAY_MODE || 'development', // 'development' or 'production'
  
  // 🔥 UPDATED API ENDPOINTS from SMEPay V2 documentation
  // Documentation: https://documenter.getpostman.com/view/43640931/2sB3HnJK8V
  endpoints: {
    auth: '/external/auth',                    // POST - Get access token (path unchanged)
    createOrder: '/external/order/create',     // POST - Create payment order (path changed)
    validateOrder: '/external/order/validate', // POST - Validate payment status (path changed)
    generateQR: '/external/generate-qr',       // POST - Generate QR code (verify if changed)
    paymentStatus: '/external/payment-status', // GET - Check payment status (verify if changed)
    checkQRStatus: '/external/qr/status'        // POST - Check QR payment status (path changed)
  },
  
  // Widget script configuration
  widget: {
    scriptURL: 'https://typof.co/smepay/checkout.js',
    widgetFunction: 'smepayCheckout'
  },
  
  // Default configuration
  defaults: {
    timeout: 30000, // 30 seconds
    retries: 3,
    currency: 'INR'
  },
  
  // Callback configuration
  callbacks: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    success: '/payment/success',
    failure: '/payment/failure',
    webhook: '/api/payments/smepay/webhook'
  }
};

// 🎯 CONFIGURATION VALIDATION
const validateConfig = () => {
  const errors = [];
  
  if (!smepayConfig.clientId) {
    errors.push('SMEPAY_CLIENT_ID is required in environment variables');
  }
  
  if (!smepayConfig.clientSecret) {
    errors.push('SMEPAY_CLIENT_SECRET is required in environment variables');
  }
  
  const baseURL = smepayConfig.getBaseURL();
  if (!baseURL) {
    errors.push('Invalid SMEPAY_MODE (must be "development" or "production")');
  }
  
  if (errors.length > 0) {
    console.error('❌ SMEPay Configuration Errors:');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('\n🔧 To fix this:');
    console.error('   1. Get SMEPay credentials from: https://dashboard.smepay.in/');
    console.error('   2. Add to your .env file:');
    console.error('      SMEPAY_CLIENT_ID=your_client_id_here');
    console.error('      SMEPAY_CLIENT_SECRET=your_client_secret_here');
    console.error('      SMEPAY_MODE=development # or production');
    return false;
  }
  
  return true;
};

// 🎯 HELPER FUNCTIONS
const getCallbackURL = (type = 'success') => {
  const baseURL = smepayConfig.callbacks.baseURL;
  
  switch (type) {
    case 'success':
      return `${baseURL}${smepayConfig.callbacks.success}`;
    case 'failure':
      return `${baseURL}${smepayConfig.callbacks.failure}`;
    case 'webhook':
      return `${baseURL}${smepayConfig.callbacks.webhook}`;
    default:
      return `${baseURL}/payment/callback`;
  }
};

const getFullEndpointURL = (endpoint) => {
  return `${smepayConfig.getBaseURL()}${smepayConfig.endpoints[endpoint]}`;
};

// 🎯 DEBUG CONFIGURATION INFO
const getConfigInfo = () => {
  return {
    mode: smepayConfig.mode,
    baseURL: smepayConfig.getBaseURL(),
    hasClientId: !!smepayConfig.clientId,
    hasClientSecret: !!smepayConfig.clientSecret,
    clientIdLength: smepayConfig.clientId ? smepayConfig.clientId.length : 0,
    clientSecretLength: smepayConfig.clientSecret ? smepayConfig.clientSecret.length : 0,
    endpoints: Object.keys(smepayConfig.endpoints).reduce((acc, key) => {
      acc[key] = getFullEndpointURL(key);
      return acc;
    }, {}),
    widgetScript: smepayConfig.widget.scriptURL,
    callbackURL: getCallbackURL(),
    webhookURL: getCallbackURL('webhook'),
    isValid: validateConfig()
  };
};

// 🎯 ENVIRONMENT VARIABLES TEMPLATE
const generateEnvTemplate = () => {
  return `
# SMEPay Configuration
# Get these credentials from https://dashboard.smepay.in/
SMEPAY_CLIENT_ID=your_smepay_client_id_here
SMEPAY_CLIENT_SECRET=your_smepay_client_secret_here
SMEPAY_MODE=development

# SMEPAY_MODE Options:
# - development: Uses https://extranet.smepay.in/api/wiz (for testing)
# - production: Uses https://extranet.smepay.in/api/wiz (for live payments)
# Note: Both use same URL per new SMEPay V2 API documentation

# Frontend URL for callbacks
FRONTEND_URL=http://localhost:3000
  `.trim();
};

// Initialize validation on load
if (process.env.NODE_ENV !== 'test') {
  const isValid = validateConfig();
  
  if (isValid) {
    console.log('✅ SMEPay Configuration Valid');
    console.log(`🌐 Mode: ${smepayConfig.mode}`);
    console.log(`🔗 Base URL: ${smepayConfig.getBaseURL()}`);
    console.log(`🔑 Client ID: ${smepayConfig.clientId ? `${smepayConfig.clientId.substring(0, 15)}...` : 'NOT SET'}`);
    console.log(`🔐 Client Secret: ${smepayConfig.clientSecret ? 'SET' : 'NOT SET'}`);
    console.log(`📱 Widget Script: ${smepayConfig.widget.scriptURL}`);
  } else {
    console.log('\n📝 Environment Template:');
    console.log(generateEnvTemplate());
  }
}

module.exports = {
  ...smepayConfig,
  validateConfig,
  getCallbackURL,
  getFullEndpointURL,
  getConfigInfo,
  generateEnvTemplate
};
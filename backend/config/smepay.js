// backend/config/smepay.js - OFFICIAL SMEPay API Configuration

require('dotenv').config();

// 🎯 OFFICIAL SMEPay API Configuration based on WooCommerce plugin documentation
const smepayConfig = {
  // 🔥 CORRECT API URLs based on mode
  baseURL: {
    development: 'https://apps.typof.in/api',
    production: 'https://apps.typof.com/api'
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
  
  // 🔥 OFFICIAL API ENDPOINTS from SMEPay documentation
  endpoints: {
    auth: '/external/auth',                    // POST - Get access token
    createOrder: '/external/create-order',     // POST - Create payment order
    validateOrder: '/external/validate-order', // POST - Validate payment status
    generateQR: '/external/generate-qr',       // POST - Generate QR code
    paymentStatus: '/external/payment-status', // GET - Check payment status
    checkQRStatus: '/external/check-qr-status' // POST - Check QR payment status
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
# - development: Uses https://apps.typof.in/api (for testing)
# - production: Uses https://apps.typof.com/api (for live payments)

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
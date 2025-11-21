// backend/config/msg91.js - MSG91 Messaging Configuration

require('dotenv').config();

const DEFAULT_BASE_URL = 'https://control.msg91.com';
const HARDCODED_AUTH_KEY = '475280AQaobbSCqUE6905dea0P1';
const HARDCODED_TEMPLATE_ID = '69155e78b16661312f320ae3';

const normalizePhoneNumber = (phoneNumber = '') => {
  const cleaned = phoneNumber.toString().replace(/\D/g, '');

  // Support Indian numbers by default
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return cleaned.slice(1);
  }

  // Fallback: return cleaned digits (MSG91 expects country code)
  return cleaned;
};

const msg91Config = {
  baseUrl: process.env.MSG91_BASE_URL || DEFAULT_BASE_URL,
  authKey: process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || HARDCODED_AUTH_KEY,
  templateId: process.env.MSG91_TEMPLATE_ID || HARDCODED_TEMPLATE_ID, // For delivery OTP
  signupTemplateId: process.env.SIGNUP_TEMPLATE_ID || null, // For signup OTP
  loginTemplateId: process.env.LOGIN_TEMPLATE_ID || null, // For login and forgot password OTP
  usingFallbackCredentials: !process.env.MSG91_AUTH_KEY && !process.env.MSG91_AUTHKEY,
  enableLogging: process.env.NODE_ENV !== 'production',
  rateLimitDefaults: {
    otpLength: 6,
    otpValidityMinutes: 10,
    maxAttempts: 3,
    rateLimitPerPhone: 5,
    rateLimitWindow: 60 * 60 * 1000 // 1 hour
  },

  normalizePhoneNumber,

  validateConfig() {
    if (!this.authKey) {
      throw new Error('MSG91 auth key is missing. Set AUTHKEY in the environment.');
    }

    if (!this.templateId) {
      throw new Error('MSG91 template ID is missing. Set TEMPLATE_ID in the environment.');
    }

    return true;
  }
};

if (msg91Config.enableLogging) {
  console.log(`
🚀 ===============================
   MSG91 CONFIGURATION LOADING
===============================
🌍 NODE_ENV: ${process.env.NODE_ENV}
🔑 AUTHKEY: ${msg91Config.authKey ? 'SET' : 'NOT_SET'}
🧾 TEMPLATE_ID: ${msg91Config.templateId || 'NOT_SET'}
⚠️ USING_FALLBACK_CREDENTIALS: ${msg91Config.usingFallbackCredentials ? 'YES' : 'NO'}
===============================`);

  if (msg91Config.usingFallbackCredentials) {
    console.warn(`
⚠️ ===============================
   MSG91 FALLBACK CREDENTIALS
===============================
❗ No MSG91_AUTH_KEY found in environment. Falling back to repo key.
   Please set MSG91_AUTH_KEY & MSG91_TEMPLATE_ID in production.
===============================`);
  }
}

try {
  msg91Config.validateConfig();
  if (msg91Config.enableLogging) {
    console.log('✅ MSG91 configuration validated successfully');
  }
} catch (error) {
  console.error(`
❌ ===============================
   MSG91 CONFIGURATION ERROR
===============================
❌ Error: ${error.message}
===============================`);
  throw error;
}

module.exports = msg91Config;


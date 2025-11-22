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

// Helper function to safely get env var (handles empty strings)
const getEnvVar = (key, fallback = null) => {
  const value = process.env[key];
  // Return fallback if value is undefined, null, or empty string after trim
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return fallback;
  }
  return value.trim();
};

const msg91Config = {
  baseUrl: process.env.MSG91_BASE_URL || DEFAULT_BASE_URL,
  authKey: process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || HARDCODED_AUTH_KEY,
  templateId: process.env.MSG91_TEMPLATE_ID || HARDCODED_TEMPLATE_ID, // For delivery OTP
  signupTemplateId: getEnvVar('SIGNUP_TEMPLATE_ID'), // For signup OTP - reads from production env
  loginTemplateId: getEnvVar('LOGIN_TEMPLATE_ID'), // For login and forgot password OTP - reads from production env
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

// Always log template IDs status (even in production) for debugging
const logTemplateIds = () => {
  const signupStatus = msg91Config.signupTemplateId ? `SET (${msg91Config.signupTemplateId.substring(0, 8)}...)` : 'NOT_SET';
  const loginStatus = msg91Config.loginTemplateId ? `SET (${msg91Config.loginTemplateId.substring(0, 8)}...)` : 'NOT_SET';
  
  if (msg91Config.enableLogging) {
    console.log(`
🚀 ===============================
   MSG91 CONFIGURATION LOADING
===============================
🌍 NODE_ENV: ${process.env.NODE_ENV}
🔑 AUTHKEY: ${msg91Config.authKey ? 'SET' : 'NOT_SET'}
🧾 TEMPLATE_ID (Delivery): ${msg91Config.templateId || 'NOT_SET'}
📝 SIGNUP_TEMPLATE_ID: ${signupStatus}
🔐 LOGIN_TEMPLATE_ID: ${loginStatus}
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

    if (!msg91Config.signupTemplateId) {
      console.warn(`
⚠️ SIGNUP_TEMPLATE_ID not set. Signup OTP will fail.
   Please set SIGNUP_TEMPLATE_ID in environment variables.
===============================`);
    }

    if (!msg91Config.loginTemplateId) {
      console.warn(`
⚠️ LOGIN_TEMPLATE_ID not set. Login/forgot password OTP will fail.
   Please set LOGIN_TEMPLATE_ID in environment variables.
===============================`);
    }
  } else {
    // Production logging - minimal but informative
    console.log(`[MSG91] Config loaded - Signup Template: ${signupStatus}, Login Template: ${loginStatus}`);
    
    if (!msg91Config.signupTemplateId) {
      console.warn('[MSG91] ⚠️ SIGNUP_TEMPLATE_ID not set - signup OTP will fail');
    }
    if (!msg91Config.loginTemplateId) {
      console.warn('[MSG91] ⚠️ LOGIN_TEMPLATE_ID not set - login/forgot password OTP will fail');
    }
  }
};

logTemplateIds();

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


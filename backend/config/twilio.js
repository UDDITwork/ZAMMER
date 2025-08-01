// backend/config/twilio.js - Twilio OTP Service Configuration

const twilioConfig = {
    // Credentials from environment
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
    
    // Default settings
    defaults: {
      otpLength: 6,
      otpValidityMinutes: 10,
      maxAttempts: 3,
      rateLimitPerPhone: 5, // Max 5 OTPs per phone per hour
      rateLimitWindow: 60 * 60 * 1000 // 1 hour in milliseconds
    },
    
    // Message templates
    messageTemplates: {
      delivery: {
        english: 'Your ZAMMER delivery OTP is: {code}. Valid for 10 minutes. Do not share with anyone.',
        hindi: 'आपका ZAMMER डिलीवरी OTP है: {code}। 10 मिनट के लिए वैध। किसी के साथ साझा न करें।'
      },
      pickup: {
        english: 'Your ZAMMER pickup verification OTP is: {code}. Valid for 10 minutes.',
        hindi: 'आपका ZAMMER पिकअप वेरिफिकेशन OTP है: {code}। 10 मिनट के लिए वैध।'
      },
      payment: {
        english: 'Your ZAMMER payment confirmation OTP is: {code}. Valid for 10 minutes.',
        hindi: 'आपका ZAMMER पेमेंट कन्फर्मेशन OTP है: {code}। 10 मिनट के लिए वैध।'
      }
    },
    
    // Phone number validation
    validatePhoneNumber: (phoneNumber) => {
      // Remove any spaces, dashes, or other characters
      const cleaned = phoneNumber.replace(/\D/g, '');
      
      // Check for Indian mobile number format
      const indianMobileRegex = /^([6-9]\d{9})$/;
      
      if (cleaned.length === 10 && indianMobileRegex.test(cleaned)) {
        return `+91${cleaned}`;
      }
      
      // Check for full international format
      if (cleaned.length === 12 && cleaned.startsWith('91')) {
        const mobileNumber = cleaned.substring(2);
        if (indianMobileRegex.test(mobileNumber)) {
          return `+${cleaned}`;
        }
      }
      
      // Check for already formatted number
      if (phoneNumber.startsWith('+91') && phoneNumber.length === 13) {
        const mobileNumber = phoneNumber.substring(3);
        if (indianMobileRegex.test(mobileNumber)) {
          return phoneNumber;
        }
      }
      
      throw new Error('Invalid Indian mobile number format');
    },
    
    // Configuration validation
    validateConfig: () => {
      const required = ['accountSid', 'authToken', 'verifyServiceSid'];
      const missing = required.filter(key => !twilioConfig[key]);
      
      if (missing.length > 0) {
        throw new Error(`Missing Twilio configuration: ${missing.join(', ')}`);
      }
      
      // Validate format of credentials
      if (!twilioConfig.accountSid.startsWith('AC')) {
        throw new Error('Invalid Twilio Account SID format');
      }
      
      if (!twilioConfig.verifyServiceSid.startsWith('VA')) {
        throw new Error('Invalid Twilio Verify Service SID format');
      }
      
      return true;
    },
    
    // Error codes
    errorCodes: {
      INVALID_PHONE_NUMBER: 'Invalid phone number format',
      OTP_SEND_FAILED: 'Failed to send OTP',
      OTP_VERIFY_FAILED: 'OTP verification failed',
      RATE_LIMIT_EXCEEDED: 'Too many OTP requests. Please try again later.',
      SERVICE_UNAVAILABLE: 'SMS service temporarily unavailable',
      INVALID_OTP: 'Invalid or expired OTP',
      MAX_ATTEMPTS_EXCEEDED: 'Maximum verification attempts exceeded'
    },
    
    // Rate limiting storage (in production, use Redis)
    rateLimitStore: new Map(),
    
    // Check rate limit for phone number
    checkRateLimit: (phoneNumber) => {
      const now = Date.now();
      const key = twilioConfig.validatePhoneNumber(phoneNumber);
      const rateLimitData = twilioConfig.rateLimitStore.get(key) || { count: 0, resetTime: now + twilioConfig.defaults.rateLimitWindow };
      
      // Reset if window has passed
      if (now > rateLimitData.resetTime) {
        rateLimitData.count = 0;
        rateLimitData.resetTime = now + twilioConfig.defaults.rateLimitWindow;
      }
      
      if (rateLimitData.count >= twilioConfig.defaults.rateLimitPerPhone) {
        const remainingTime = Math.ceil((rateLimitData.resetTime - now) / (1000 * 60)); // minutes
        throw new Error(`Rate limit exceeded. Try again in ${remainingTime} minutes.`);
      }
      
      rateLimitData.count += 1;
      twilioConfig.rateLimitStore.set(key, rateLimitData);
      
      return true;
    },
    
    // Get message template
    getMessageTemplate: (type, language = 'english') => {
      const template = twilioConfig.messageTemplates[type];
      if (!template) {
        return twilioConfig.messageTemplates.delivery.english;
      }
      
      return template[language] || template.english;
    },
    
    // Format message with OTP
    formatMessage: (template, otpCode) => {
      return template.replace('{code}', otpCode);
    },
    
    // Logging configuration
    enableLogging: process.env.NODE_ENV === 'development',
    
    // Test mode configuration
    testMode: {
      enabled: process.env.NODE_ENV === 'development',
      testPhoneNumbers: ['+911234567890', '+919876543210'],
      testOTP: '123456',
      simulateDelay: 1000 // 1 second delay for test mode
    },
    
    // Webhook configuration for delivery receipts
    webhook: {
      enabled: false, // Enable if you want delivery receipts
      url: process.env.TWILIO_WEBHOOK_URL,
      events: ['delivered', 'failed', 'undelivered']
    }
  };
  
  // Validation on module load (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    try {
      twilioConfig.validateConfig();
      console.log('✅ Twilio configuration validated successfully');
    } catch (error) {
      console.error('❌ Twilio configuration error:', error.message);
      
      // In development, we can continue without Twilio for testing
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Continuing in development mode without Twilio');
        twilioConfig.testMode.enabled = true;
      } else {
        throw error;
      }
    }
  }
  
  // Export configuration
  module.exports = twilioConfig; 

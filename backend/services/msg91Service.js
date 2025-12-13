// backend/services/msg91Service.js - MSG91 OTP & SMS Service

const https = require('https');
const msg91Config = require('../config/msg91');
const OtpVerification = require('../models/OtpVerification');

const terminalLog = (action, status, data = null, error = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';

  console.log(`\n${logLevel} ===============================
   [MSG91-SERVICE] ${action}
===============================
🕐 Timestamp: ${timestamp}
📊 Status: ${status}`);

  if (data) {
    console.log('📋 Data:', JSON.stringify(data, null, 2));
  }

  if (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('🌐 Response Status:', error.response.status);
      console.log('📬 Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('===============================\n');
};

class MSG91Service {
  constructor() {
    this.rateLimitStore = new Map();
    // 🎯 NEW: OTP Session Store for authentication (signup/login/forgot password)
    // Key: phoneNumber + purpose (e.g., "911234567890_signup")
    // Value: { code, expiresAt, attempts, userId, userData }
    this.otpSessionStore = new Map();
    // Clean up expired sessions every 5 minutes
    this.startSessionCleanup();

    terminalLog('SERVICE_INIT', 'SUCCESS', {
      baseUrl: msg91Config.baseUrl,
      templateId: msg91Config.templateId,
      signupTemplateId: msg91Config.signupTemplateId || 'NOT_SET',
      loginTemplateId: msg91Config.loginTemplateId || 'NOT_SET'
    });
  }

  // 🎯 NEW: Start periodic cleanup of expired OTP sessions
  startSessionCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, session] of this.otpSessionStore.entries()) {
        if (session.expiresAt < now) {
          this.otpSessionStore.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean every 5 minutes
  }

  // 🎯 NEW: Generate session key
  getSessionKey(phoneNumber, purpose) {
    const normalized = msg91Config.normalizePhoneNumber(phoneNumber);
    return `${normalized}_${purpose}`;
  }

  // 🎯 NEW: Store OTP session
  storeOTPSession(phoneNumber, purpose, otpCode, userData = null, expiryMinutes = 10) {
    const key = this.getSessionKey(phoneNumber, purpose);
    const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);

    this.otpSessionStore.set(key, {
      code: otpCode,
      expiresAt,
      attempts: 0,
      maxAttempts: 3,
      createdAt: Date.now(),
      userData // Store user data for registration/login
    });

    // Auto-delete after expiry
    setTimeout(() => {
      this.otpSessionStore.delete(key);
    }, expiryMinutes * 60 * 1000);

    return key;
  }

  // 🎯 NEW: Get OTP session
  getOTPSession(phoneNumber, purpose) {
    const key = this.getSessionKey(phoneNumber, purpose);
    const session = this.otpSessionStore.get(key);

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      this.otpSessionStore.delete(key);
      return null;
    }

    return session;
  }

  // 🎯 NEW: Verify OTP from session
  verifyOTPSession(phoneNumber, purpose, enteredCode) {
    // 🎯 CRITICAL: Normalize phone number to match session key format
    const normalizedPhone = msg91Config.normalizePhoneNumber(phoneNumber);
    const session = this.getOTPSession(normalizedPhone, purpose);

    if (!session) {
      return {
        success: false,
        message: 'OTP session not found or expired. Please request a new OTP.'
      };
    }

    // Check attempts
    if (session.attempts >= session.maxAttempts) {
      const key = this.getSessionKey(normalizedPhone, purpose);
      this.otpSessionStore.delete(key);
      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      };
    }

    // Increment attempts
    session.attempts += 1;

    // 🎯 CRITICAL: Trim and normalize OTP for comparison
    const cleanedEnteredCode = enteredCode ? enteredCode.toString().trim() : '';
    const cleanedSessionCode = session.code ? session.code.toString().trim() : '';

    // Verify code
    if (cleanedSessionCode !== cleanedEnteredCode) {
      return {
        success: false,
        message: `Invalid OTP. ${session.maxAttempts - session.attempts} attempts remaining.`
      };
    }

    // Success - delete session after successful verification
    const key = this.getSessionKey(normalizedPhone, purpose);
    const userData = session.userData;
    this.otpSessionStore.delete(key);

    return {
      success: true,
      message: 'OTP verified successfully',
      userData
    };
  }

  // 🎯 NEW: Delete OTP session
  deleteOTPSession(phoneNumber, purpose) {
    const key = this.getSessionKey(phoneNumber, purpose);
    this.otpSessionStore.delete(key);
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  checkRateLimit(phoneNumber) {
    const now = Date.now();
    const key = msg91Config.normalizePhoneNumber(phoneNumber);
    const defaults = msg91Config.rateLimitDefaults;
    const existing = this.rateLimitStore.get(key) || {
      count: 0,
      resetTime: now + defaults.rateLimitWindow
    };

    if (now > existing.resetTime) {
      existing.count = 0;
      existing.resetTime = now + defaults.rateLimitWindow;
    }

    if (existing.count >= defaults.rateLimitPerPhone) {
      const remainingMinutes = Math.ceil((existing.resetTime - now) / (1000 * 60));
      throw new Error(`Rate limit exceeded. Try again in ${remainingMinutes} minute(s).`);
    }

    existing.count += 1;
    this.rateLimitStore.set(key, existing);
  }

  async sendOTP(phoneNumber, options = {}) {
    // 🎯 CRITICAL: Validate phone number
    if (!phoneNumber || !phoneNumber.toString().trim()) {
      terminalLog('MSG91_SEND_OTP_INVALID_PHONE', 'ERROR', { phoneNumber });
      return { success: false, error: 'Phone number is required and cannot be empty', otpCode: null };
    }
    
    // 🎯 CRITICAL: Validate MSG91 configuration
    if (!msg91Config.authKey) {
      terminalLog('MSG91_SEND_OTP_MISSING_AUTH_KEY', 'ERROR', {});
      return { success: false, error: 'MSG91 auth key not configured. Check MSG91_AUTH_KEY in .env', otpCode: null };
    }
    
    if (!msg91Config.templateId) {
      terminalLog('MSG91_SEND_OTP_MISSING_TEMPLATE_ID', 'ERROR', {});
      return { success: false, error: 'MSG91 template ID not configured. Check MSG91_TEMPLATE_ID in .env', otpCode: null };
    }
    
    this.checkRateLimit(phoneNumber);

    const otpCode = options.otpCode || this.generateOTP();
    const templateId = options.templateId || msg91Config.templateId; // 🎯 Uses MSG91_TEMPLATE_ID from .env
    const normalizedPhone = msg91Config.normalizePhoneNumber(phoneNumber);
    const expiry = options.expiryMinutes || msg91Config.rateLimitDefaults.otpValidityMinutes;
    
    // 🎯 DEBUG: Log exact values being used (including phone number transformation)
    terminalLog('MSG91_SEND_OTP_CONFIG', 'PROCESSING', {
      originalPhone: phoneNumber,
      normalizedPhone: normalizedPhone,
      phoneTransformed: phoneNumber !== normalizedPhone,
      templateId: templateId,
      authKey: msg91Config.authKey ? `${msg91Config.authKey.substring(0, 10)}...` : 'NOT_SET',
      templateIdFromEnv: !!process.env.MSG91_TEMPLATE_ID,
      authKeyFromEnv: !!process.env.MSG91_AUTH_KEY,
      loginTemplateId: msg91Config.loginTemplateId,
      loginTemplateIdFromEnv: !!process.env.LOGIN_TEMPLATE_ID
    });

    // 🎯 MSG91 STANDARD FORMAT: POST /api/v5/otp?otp_expiry=&template_id=&mobile=&authkey=&realTimeResponse=
    const path = `/api/v5/otp?otp=${encodeURIComponent(otpCode)}&otp_expiry=${encodeURIComponent(expiry)}&template_id=${encodeURIComponent(templateId)}&mobile=${encodeURIComponent(normalizedPhone)}&authkey=${encodeURIComponent(msg91Config.authKey)}&realTimeResponse=1`;

    // 🎯 MSG91 STANDARD FORMAT: Body with Param1, Param2, Param3
    const payload = JSON.stringify({
      Param1: options.orderNumber || '',
      Param2: options.userName || '',
      Param3: options.purpose || 'delivery'
    });

    terminalLog('MSG91_SEND_OTP_REQUEST', 'PROCESSING', {
      templateId,
      phoneNumber: `${normalizedPhone.substring(0, 6)}****`,
      path,
      method: 'POST',
      hostname: 'control.msg91.com'
    });

    // 🎯 MSG91 STANDARD FORMAT: Headers - content-type: application/json, Content-Type: application/JSON
    const result = await this.executeRequest({
      method: 'POST',
      path,
      headers: {
        'content-type': 'application/json',
        'Content-Type': 'application/JSON'  // MSG91 standard: JSON in uppercase
      }
    }, payload);

    if (result.success) {
      // 🎯 FIX: Double-check response body for success indicators
      // MSG91 success responses typically have "type": "success" or contain "request_id"
      const response = result.response || {};
      const hasSuccessIndicator = response.type === 'success' || response.request_id || response.message?.toLowerCase().includes('success');
      const hasErrorIndicator = response.type === 'error' || (response.message && (
        response.message.toLowerCase().includes('error') ||
        response.message.toLowerCase().includes('invalid') ||
        response.message.toLowerCase().includes('missing') ||
        response.message.toLowerCase().includes('failed')
      ));

      if (hasErrorIndicator || !hasSuccessIndicator) {
        // Treat as error even though HTTP status was 200
        terminalLog('MSG91_SEND_OTP_ERROR', 'ERROR', {
          response: response,
          error: response.message || 'Unknown MSG91 error',
          errorType: response.type || 'unknown'
        });
        return { success: false, error: response.message || 'MSG91 returned an error', otpCode };
      }

      terminalLog('MSG91_SEND_OTP_SUCCESS', 'SUCCESS', result.response);
      
      // 🔧 CRITICAL FIX: Store OTP in session for authentication purposes (login/forgot_password only)
      // Signup OTPs are NOT stored - verification is done directly with MSG91 API
      // Only store for authentication-related purposes that use session verification, not for delivery OTPs (which use database)
      const authPurposes = ['login', 'forgot_password'];
      if (options.purpose && authPurposes.includes(options.purpose)) {
        this.storeOTPSession(
          normalizedPhone, 
          options.purpose, 
          otpCode, 
          options.userData || null, 
          expiry
        );
        terminalLog('OTP_SESSION_STORED', 'SUCCESS', {
          purpose: options.purpose,
          phoneNumber: `${normalizedPhone.substring(0, 6)}****`
        });
      }
      
      return { success: true, otpCode, response: result.response };
    }

    terminalLog('MSG91_SEND_OTP_ERROR', 'ERROR', result, result.errorDetails);
    return { success: false, error: result.error || 'MSG91 request failed', otpCode };
  }

  // 🎯 NEW: Send OTP for Signup
  async sendOTPForSignup(phoneNumber, options = {}) {
    if (!msg91Config.signupTemplateId) {
      throw new Error('Signup template ID not configured. Set SIGNUP_TEMPLATE_ID in environment variables.');
    }

    return this.sendOTP(phoneNumber, {
      ...options,
      templateId: msg91Config.signupTemplateId,
      purpose: 'signup'
    });
  }

  // 🎯 NEW: Send OTP for Login
  async sendOTPForLogin(phoneNumber, options = {}) {
    if (!msg91Config.loginTemplateId) {
      throw new Error('Login template ID not configured. Set LOGIN_TEMPLATE_ID in environment variables.');
    }

    return this.sendOTP(phoneNumber, {
      ...options,
      templateId: msg91Config.loginTemplateId,
      purpose: 'login'
    });
  }

  // 🎯 NEW: Send OTP for Forgot Password (uses login template ID)
  async sendOTPForForgotPassword(phoneNumber, options = {}) {
    if (!msg91Config.loginTemplateId) {
      throw new Error('Login template ID not configured. Set LOGIN_TEMPLATE_ID in environment variables.');
    }

    // 🎯 DEBUG: Log phone number received (for comparison with buyer side)
    terminalLog('SEND_OTP_FOR_FORGOT_PASSWORD_PHONE_RECEIVED', 'PROCESSING', {
      phoneNumber: phoneNumber,
      phoneType: typeof phoneNumber,
      phoneLength: phoneNumber?.toString().length,
      phoneValue: phoneNumber?.toString(),
      purpose: options.purpose || 'forgot_password',
      hasUserName: !!options.userName,
      hasOrderNumber: !!options.orderNumber,
      hasOtpCode: !!options.otpCode,
      loginTemplateId: msg91Config.loginTemplateId,
      loginTemplateIdFromEnv: !!process.env.LOGIN_TEMPLATE_ID
    });

    // 🎯 EXACT MATCH: Use loginTemplateId (LOGIN_TEMPLATE_ID from .env) - same as buyer side
    return this.sendOTP(phoneNumber, {
      ...options,
      templateId: msg91Config.loginTemplateId, // 🎯 Uses LOGIN_TEMPLATE_ID from .env (same as buyer side)
      purpose: options.purpose || 'forgot_password' // 🎯 Allow purpose override for delivery OTP
    });
  }

  async createDeliveryOTP(orderData) {
    try {
      terminalLog('CREATE_DELIVERY_OTP_START', 'PROCESSING', orderData);

      if (!orderData.orderId || !orderData.userId || !orderData.deliveryAgentId || !orderData.userPhone) {
        throw new Error('Missing required order data for OTP creation');
      }

      const otpRecord = await OtpVerification.createDeliveryOTP({
        orderId: orderData.orderId,
        userId: orderData.userId,
        deliveryAgentId: orderData.deliveryAgentId,
        purpose: orderData.purpose || 'delivery_confirmation',
        deliveryLocation: orderData.deliveryLocation,
        notes: orderData.notes
      });

      // 🎯 EXACT MATCH: Use sendOTPForForgotPassword() exactly like buyer side (userController.js line 860)
      // Buyer side: await msg91Service.sendOTPForForgotPassword(user.mobileNumber, { userName: user.name, purpose: 'forgot_password' })
      // This uses LOGIN_TEMPLATE_ID and same MSG91 API call
      
      // 🎯 CRITICAL: Log phone number BEFORE passing to sendOTPForForgotPassword (same as buyer side)
      terminalLog('CREATE_DELIVERY_OTP_PHONE_BEFORE_SEND', 'PROCESSING', {
        originalPhone: orderData.userPhone,
        phoneType: typeof orderData.userPhone,
        phoneLength: orderData.userPhone?.toString().length,
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber
      });
      
      const smsResult = await this.sendOTPForForgotPassword(orderData.userPhone, {
        userName: orderData.userName || 'Customer',
        purpose: 'delivery_confirmation', // Will be overridden to 'forgot_password' but that's okay - same template
        otpCode: otpRecord.code, // 🎯 Use the OTP code from database record (same as buyer side generates)
        orderNumber: orderData.orderNumber
      });

      if (!smsResult.success) {
        otpRecord.status = 'cancelled';
        otpRecord.verificationResult = {
          success: false,
          errorMessage: `SMS sending failed: ${smsResult.error}`,
          verifiedBy: 'system'
        };
        await otpRecord.save();

        throw new Error(`Failed to send OTP: ${smsResult.error || 'Unknown error from MSG91'}`);
      }

      terminalLog('CREATE_DELIVERY_OTP_SUCCESS', 'SUCCESS', {
        otpId: otpRecord._id,
        orderId: orderData.orderId,
        requestId: smsResult.response?.request_id
      });

      return {
        success: true,
        otpId: otpRecord._id,
        otpCode: otpRecord.code,
        expiresAt: otpRecord.expiresAt,
        message: 'Delivery OTP created and sent successfully',
        requestId: smsResult.response?.request_id
      };
    } catch (error) {
      terminalLog('CREATE_DELIVERY_OTP_ERROR', 'ERROR', {
        orderId: orderData.orderId,
        error: error.message
      }, error);

      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyDeliveryOTP(verificationData) {
    try {
      terminalLog('VERIFY_DELIVERY_OTP_START', 'PROCESSING', verificationData);

      const otpRecord = await OtpVerification.findById(verificationData.otpId)
        .populate([
          { path: 'order', select: 'orderNumber totalPrice' },
          { path: 'user', select: 'name mobileNumber' },
          { path: 'deliveryAgent', select: 'name phoneNumber' }
        ]);

      if (!otpRecord) {
        throw new Error('OTP record not found');
      }

      if (!otpRecord.canVerify) {
        const reason = otpRecord.status !== 'pending' ? 'OTP already processed' :
          otpRecord.isExpired ? 'OTP has expired' :
            'Maximum verification attempts exceeded';

        terminalLog('VERIFY_DELIVERY_OTP_INVALID', 'ERROR', {
          otpId: verificationData.otpId,
          reason
        });

        return {
          success: false,
          message: reason,
          otpRecord
        };
      }

      // 🎯 STEP 1: Verify with MSG91's standard API (authoritative verification)
      // MSG91 is the source of truth - we trust their verification result
      terminalLog('MSG91_VERIFY_START', 'PROCESSING', {
        phoneNumber: `${otpRecord.user.mobileNumber.substring(0, 6)}****`,
        otpLength: verificationData.enteredCode?.length || 0,
        otpId: verificationData.otpId
      });

      const msg91Result = await this.verifyOTP({
        phoneNumber: otpRecord.user.mobileNumber,
        otp: verificationData.enteredCode
      });

      terminalLog('MSG91_VERIFY_RESULT', msg91Result.success ? 'SUCCESS' : 'ERROR', {
        success: msg91Result.success,
        message: msg91Result.message,
        phoneNumber: `${otpRecord.user.mobileNumber.substring(0, 6)}****`
      });

      if (!msg91Result.success) {
        terminalLog('MSG91_VERIFY_FAILURE', 'ERROR', msg91Result);

        // Update database with failed attempt
        otpRecord.attemptCount = (otpRecord.attemptCount || 0) + 1;
        otpRecord.verificationResult = {
          success: false,
          errorMessage: msg91Result.message || 'OTP verification failed with MSG91',
          verifiedBy: verificationData.verifiedBy || 'delivery_agent'
        };

        if ((otpRecord.attemptCount >= msg91Config.rateLimitDefaults.maxAttempts) || (msg91Result.message && msg91Result.message.toLowerCase().includes('expired'))) {
          otpRecord.status = 'expired';
        }

        await otpRecord.save();

        return {
          success: false,
          message: msg91Result.message || 'OTP verification failed with MSG91',
          error: msg91Result.error
        };
      }

      // 🎯 STEP 2: MSG91 verified successfully - update database status (trust MSG91's verification)
      // Since MSG91 confirmed the OTP is valid, we update our database without re-checking the code
      // MSG91 is the authoritative source - if they say it's valid, it's valid
      terminalLog('MSG91_VERIFY_SUCCESS', 'SUCCESS', {
        message: 'MSG91 confirmed OTP is valid - updating database status',
        otpId: verificationData.otpId,
        orderId: verificationData.orderId
      });

      otpRecord.attemptCount = (otpRecord.attemptCount || 0) + 1;
      otpRecord.status = 'verified';
      otpRecord.verifiedAt = new Date();
      otpRecord.verificationResult = {
        success: true,
        errorMessage: '',
        verifiedBy: verificationData.verifiedBy || 'delivery_agent'
      };

      // Update delivery location if provided
      if (verificationData.deliveryLocation) {
        otpRecord.deliveryLocation = {
          ...otpRecord.deliveryLocation,
          ...verificationData.deliveryLocation
        };
      }

      // Update payment details if provided (for COD)
      if (verificationData.paymentDetails) {
        otpRecord.paymentDetails = {
          ...otpRecord.paymentDetails,
          ...verificationData.paymentDetails,
          receivedAt: new Date()
        };
      }

      await otpRecord.save();

      terminalLog('VERIFY_DELIVERY_OTP_RESULT', 'SUCCESS', {
        otpId: verificationData.otpId,
        orderId: verificationData.orderId,
        verificationSuccess: true,
        message: 'OTP verified successfully via MSG91',
        msg91Result: msg91Result.message
      });

      return {
        success: true,
        message: 'OTP verified successfully',
        verificationId: otpRecord._id,
        verifiedAt: otpRecord.verifiedAt,
        otpRecord,
        msg91Result
      };
    } catch (error) {
      terminalLog('VERIFY_DELIVERY_OTP_ERROR', 'ERROR', {
        otpId: verificationData.otpId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendPickupOTP(pickupData) {
    try {
      terminalLog('SEND_PICKUP_OTP_START', 'PROCESSING', pickupData);

    const otpCode = this.generateOTP();

    const smsResult = await this.sendOTP(pickupData.sellerPhone, {
      purpose: 'pickup',
      otpCode,
      orderNumber: pickupData.orderNumber,
      userName: pickupData.sellerName
    });

      terminalLog('SEND_PICKUP_OTP_RESULT', smsResult.success ? 'SUCCESS' : 'ERROR', {
        orderId: pickupData.orderId,
        success: smsResult.success
      });

      return {
        ...smsResult,
        otpCode
      };
    } catch (error) {
      terminalLog('SEND_PICKUP_OTP_ERROR', 'ERROR', {
        orderId: pickupData.orderId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyOTP({ phoneNumber, otp }) {
    // 🎯 CRITICAL: Trim OTP to remove any whitespace
    const cleanedOTP = otp ? otp.toString().trim() : '';
    const normalizedPhone = msg91Config.normalizePhoneNumber(phoneNumber);

    // 🎯 DEBUG: Log exact values being sent to MSG91
    terminalLog('MSG91_VERIFY_OTP_REQUEST', 'PROCESSING', {
      originalPhone: phoneNumber,
      normalizedPhone: normalizedPhone,
      originalOTP: otp,
      cleanedOTP: cleanedOTP,
      otpLength: cleanedOTP.length,
      phoneNumber: `${normalizedPhone.substring(0, 6)}****`,
      method: 'GET',
      hostname: 'control.msg91.com'
    });

    // 🎯 EXACT MSG91 FORMAT: Use the exact format provided by user
    // const options = {
    //   method: 'GET',
    //   hostname: 'control.msg91.com',
    //   port: null,
    //   path: '/api/v5/otp/verify?otp=&mobile=',
    //   headers: {
    //     authkey: 'Enter your MSG91 authkey'
    //   }
    // };
    const path = `/api/v5/otp/verify?otp=${encodeURIComponent(cleanedOTP)}&mobile=${encodeURIComponent(normalizedPhone)}`;

    // 🎯 EXACT MATCH: Use executeRequest with exact format
    const result = await this.executeRequest({
      method: 'GET',
      path,
      headers: {
        authkey: msg91Config.authKey // 🎯 EXACT MATCH: authkey in headers (as per user's format)
      }
    });

    terminalLog('MSG91_VERIFY_OTP_API_RESPONSE', result.success ? 'SUCCESS' : 'ERROR', {
      success: result.success,
      responseType: result.response?.type,
      responseMessage: result.response?.message,
      statusCode: result.statusCode,
      phoneNumber: `${normalizedPhone.substring(0, 6)}****`
    });

    if (result.success) {
      const type = result.response?.type;
      const message = result.response?.message;
      const fullResponse = result.response;

      // 🎯 DEBUG: Log full MSG91 response for debugging
      terminalLog('MSG91_VERIFY_OTP_FULL_RESPONSE', 'PROCESSING', {
        fullResponse: fullResponse,
        type: type,
        message: message,
        phoneNumber: `${normalizedPhone.substring(0, 6)}****`
      });

      if (type === 'success') {
        terminalLog('MSG91_VERIFY_OTP_SUCCESS', 'SUCCESS', {
          message,
          phoneNumber: `${normalizedPhone.substring(0, 6)}****`,
          verificationSource: 'MSG91 API (Authoritative)'
        });
        return { success: true, message };
      }

      // 🎯 ENHANCED: Check for specific MSG91 error messages
      const errorMessage = message || 'OTP verification failed';
      let userFriendlyMessage = errorMessage;
      
      if (errorMessage.toLowerCase().includes('expired')) {
        userFriendlyMessage = 'OTP has expired. Please request a new OTP.';
      } else if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('incorrect')) {
        userFriendlyMessage = 'Invalid OTP. Please check and try again.';
      } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('no otp')) {
        userFriendlyMessage = 'OTP not found. The OTP may have expired or was not sent. Please request a new OTP.';
      }

      terminalLog('MSG91_VERIFY_OTP_FAILED', 'ERROR', {
        type,
        originalMessage: message,
        userFriendlyMessage: userFriendlyMessage,
        phoneNumber: `${normalizedPhone.substring(0, 6)}****`,
        fullResponse: fullResponse
      });

      return {
        success: false,
        message: userFriendlyMessage,
        error: result.response,
        originalMessage: message
      };
    }

    terminalLog('MSG91_VERIFY_OTP_ERROR', 'ERROR', {
      error: result.error,
      errorDetails: result.errorDetails,
      phoneNumber: `${normalizedPhone.substring(0, 6)}****`
    });

    return { success: false, message: result.error || 'OTP verification failed', error: result.errorDetails };
  }

  async retryOTP(phoneNumber, retryType = 'text') {
    const normalizedPhone = msg91Config.normalizePhoneNumber(phoneNumber);

    // 🎯 MSG91 STANDARD FORMAT: GET /api/v5/otp/retry?authkey=&retrytype=&mobile=
    const path = `/api/v5/otp/retry?authkey=${encodeURIComponent(msg91Config.authKey)}&retrytype=${encodeURIComponent(retryType)}&mobile=${encodeURIComponent(normalizedPhone)}`;

    terminalLog('MSG91_RETRY_OTP_REQUEST', 'PROCESSING', {
      phoneNumber: `${normalizedPhone.substring(0, 6)}****`,
      retryType,
      path,
      method: 'GET',
      hostname: 'control.msg91.com'
    });

    // 🎯 MSG91 STANDARD FORMAT: Empty headers (as per MSG91 standard)
    // EXACT FORMAT: const options = { method: 'GET', hostname: 'control.msg91.com', path: '/api/v5/otp/retry?authkey=&retrytype=&mobile=', headers: {} }
    return this.executeRequest({
      method: 'GET',
      path,
      headers: {}  // 🎯 EXACT MATCH: Empty headers for retry (as per user's format)
    });
  }

  async executeRequest(options, body = null) {
    // 🎯 EXACT MSG91 FORMAT: Match user's provided format exactly
    // const options = {
    //   method: 'GET',
    //   hostname: 'control.msg91.com',
    //   port: null,
    //   path: '/api/v5/otp/verify?otp=&mobile=',
    //   headers: {
    //     authkey: 'Enter your MSG91 authkey'
    //   }
    // };
    const requestOptions = {
      method: options.method || 'GET',
      hostname: 'control.msg91.com',
      port: null, // 🎯 EXACT MATCH: port: null (as per user's format)
      path: options.path,
      headers: options.headers || {}
    };

    // 🎯 DEBUG: Log exact request options being sent (matching user's format)
    terminalLog('MSG91_EXECUTE_REQUEST_OPTIONS', 'PROCESSING', {
      method: requestOptions.method,
      hostname: requestOptions.hostname,
      port: requestOptions.port,
      path: requestOptions.path,
      headers: {
        ...requestOptions.headers,
        authkey: requestOptions.headers.authkey ? `${requestOptions.headers.authkey.substring(0, 10)}...` : 'NOT_SET'
      }
    });

    return new Promise((resolve) => {
      // 🎯 EXACT MATCH: const req = http.request(options, function (res) {
      // User's format: const req = http.request(options, function (res) {
      const req = https.request(requestOptions, (res) => {
        const chunks = [];

        // 🎯 EXACT MATCH: res.on('data', function (chunk) { chunks.push(chunk); });
        // User's format: res.on('data', function (chunk) { chunks.push(chunk); });
        res.on('data', (chunk) => chunks.push(chunk));

        // 🎯 EXACT MATCH: res.on('end', function () { const body = Buffer.concat(chunks); console.log(body.toString()); });
        // User's format: res.on('end', function () { const body = Buffer.concat(chunks); console.log(body.toString()); });
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString();
          
          // 🎯 EXACT MATCH: console.log(body.toString()) - Log raw response exactly as user's format
          console.log('📬 MSG91 Raw Response:', responseBody);
          
          let parsedBody = null;
          try {
            parsedBody = responseBody ? JSON.parse(responseBody) : null;
          } catch (parseError) {
            parsedBody = { raw: responseBody };
          }
          
          // 🎯 DEBUG: Log raw response (like user's format: console.log(body.toString()))
          terminalLog('MSG91_RAW_RESPONSE', 'PROCESSING', {
            rawResponse: responseBody,
            parsedResponse: parsedBody,
            statusCode: res.statusCode
          });

          // 🎯 FIX: Check both HTTP status code AND response body for errors
          // MSG91 sometimes returns 200 status with error in response body
          const hasHttpError = res.statusCode < 200 || res.statusCode >= 300;
          const hasResponseError = parsedBody && (
            parsedBody.type === 'error' ||
            (parsedBody.message && (
              parsedBody.message.toLowerCase().includes('error') ||
              parsedBody.message.toLowerCase().includes('invalid') ||
              parsedBody.message.toLowerCase().includes('missing') ||
              parsedBody.message.toLowerCase().includes('failed')
            ))
          );

          if (hasHttpError || hasResponseError) {
            const errorMessage = parsedBody?.message || 'MSG91 request failed';
            const errorType = parsedBody?.type || 'unknown';
            
            resolve({
              success: false,
              error: errorMessage,
              errorType: errorType,
              errorDetails: parsedBody,
              statusCode: res.statusCode
            });
          } else {
            resolve({ success: true, response: parsedBody });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          errorDetails: error
        });
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  async sendPayoutSMS() {
    terminalLog('MSG91_PAYOUT_SMS_SKIPPED', 'INFO', {
      message: 'Payout SMS via MSG91 is disabled (template not configured)'
    });

    return { success: false, error: 'Payout SMS not supported with current MSG91 configuration' };
  }
}

const msg91Service = new MSG91Service();

module.exports = msg91Service;


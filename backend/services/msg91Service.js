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

    terminalLog('SERVICE_INIT', 'SUCCESS', {
      baseUrl: msg91Config.baseUrl,
      templateId: msg91Config.templateId
    });
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
    this.checkRateLimit(phoneNumber);

    const otpCode = options.otpCode || this.generateOTP();
    const templateId = msg91Config.templateId;
    const normalizedPhone = msg91Config.normalizePhoneNumber(phoneNumber);
    const expiry = options.expiryMinutes || msg91Config.rateLimitDefaults.otpValidityMinutes;

    const path = `/api/v5/otp?otp=${encodeURIComponent(otpCode)}&otp_expiry=${expiry}&template_id=${encodeURIComponent(templateId)}&mobile=${encodeURIComponent(normalizedPhone)}&authkey=${encodeURIComponent(msg91Config.authKey)}&realTimeResponse=1`;

    const payload = JSON.stringify({
      Param1: options.orderNumber || '',
      Param2: options.userName || '',
      Param3: options.purpose || 'delivery'
    });

    terminalLog('MSG91_SEND_OTP_REQUEST', 'PROCESSING', {
      templateId,
      phoneNumber: `${normalizedPhone.substring(0, 6)}****`,
      path
    });

    const result = await this.executeRequest({
      method: 'POST',
      path,
      headers: {
        'content-type': 'application/json',
        'Content-Type': 'application/json'
      }
    }, payload);

    if (result.success) {
      terminalLog('MSG91_SEND_OTP_SUCCESS', 'SUCCESS', result.response);
      return { success: true, otpCode, response: result.response };
    }

    terminalLog('MSG91_SEND_OTP_ERROR', 'ERROR', result, result.errorDetails);
    return { success: false, error: result.error, otpCode };
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

      const smsResult = await this.sendOTP(orderData.userPhone, {
        purpose: otpRecord.purpose,
        otpCode: otpRecord.code,
        orderNumber: orderData.orderNumber,
        userName: orderData.userName
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

      const msg91Result = await this.verifyOTP({
        phoneNumber: otpRecord.user.mobileNumber,
        otp: verificationData.enteredCode
      });

      if (!msg91Result.success) {
        terminalLog('MSG91_VERIFY_FAILURE', 'ERROR', msg91Result);

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

      const otpVerificationResult = await otpRecord.verifyOTP(
        verificationData.enteredCode,
        {
          verifiedBy: verificationData.verifiedBy || 'delivery_agent',
          deliveryLocation: verificationData.deliveryLocation,
          paymentDetails: verificationData.paymentDetails
        }
      );

      terminalLog('VERIFY_DELIVERY_OTP_RESULT', otpVerificationResult.success ? 'SUCCESS' : 'ERROR', {
        otpId: verificationData.otpId,
        orderId: verificationData.orderId,
        verificationSuccess: otpVerificationResult.success,
        message: otpVerificationResult.message
      });

      return {
        success: otpVerificationResult.success,
        message: otpVerificationResult.message,
        verificationId: otpVerificationResult.verificationId,
        verifiedAt: otpVerificationResult.verifiedAt,
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
    const normalizedPhone = msg91Config.normalizePhoneNumber(phoneNumber);

    const path = `/api/v5/otp/verify?otp=${encodeURIComponent(otp)}&mobile=${encodeURIComponent(normalizedPhone)}`;

    const result = await this.executeRequest({
      method: 'GET',
      path,
      headers: {
        authkey: msg91Config.authKey
      }
    });

    if (result.success) {
      const type = result.response?.type;
      const message = result.response?.message;

      if (type === 'success') {
        return { success: true, message };
      }

      return {
        success: false,
        message: message || 'OTP verification failed',
        error: result.response
      };
    }

    return { success: false, message: result.error || 'OTP verification failed', error: result.errorDetails };
  }

  async retryOTP(phoneNumber, retryType = 'text') {
    const normalizedPhone = msg91Config.normalizePhoneNumber(phoneNumber);

    const path = `/api/v5/otp/retry?authkey=${encodeURIComponent(msg91Config.authKey)}&retrytype=${encodeURIComponent(retryType)}&mobile=${encodeURIComponent(normalizedPhone)}`;

    return this.executeRequest({
      method: 'GET',
      path
    });
  }

  async executeRequest(options, body = null) {
    const requestOptions = {
      method: options.method || 'GET',
      hostname: 'control.msg91.com',
      port: null,
      path: options.path,
      headers: options.headers || {}
    };

    return new Promise((resolve) => {
      const req = https.request(requestOptions, (res) => {
        const chunks = [];

        res.on('data', (chunk) => chunks.push(chunk));

        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString();
          let parsedBody = null;
          try {
            parsedBody = responseBody ? JSON.parse(responseBody) : null;
          } catch (parseError) {
            parsedBody = { raw: responseBody };
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, response: parsedBody });
          } else {
            resolve({
              success: false,
              error: parsedBody?.message || 'MSG91 request failed',
              errorDetails: parsedBody,
              statusCode: res.statusCode
            });
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


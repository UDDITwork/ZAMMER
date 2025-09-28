// backend/services/otpService.js - OTP Generation and Verification Service

const twilio = require('twilio');
const twilioConfig = require('../config/twilio');
const OtpVerification = require('../models/OtpVerification');

// Enhanced terminal logging
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [OTP-SERVICE] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
};

class OTPService {
  constructor() {
    this.isTestMode = twilioConfig.testMode.enabled;
    
    if (!this.isTestMode) {
      try {
        this.twilioClient = twilio(twilioConfig.accountSid, twilioConfig.authToken);
        this.verifyService = this.twilioClient.verify.v2.services(twilioConfig.verifyServiceSid);
        terminalLog('TWILIO_CLIENT_INITIALIZED', 'SUCCESS', {
          accountSid: twilioConfig.accountSid ? `${twilioConfig.accountSid.substring(0, 10)}...` : 'NOT_SET',
          verifyServiceSid: twilioConfig.verifyServiceSid ? `${twilioConfig.verifyServiceSid.substring(0, 10)}...` : 'NOT_SET'
        });
      } catch (error) {
        terminalLog('TWILIO_CLIENT_INIT_ERROR', 'ERROR', { error: error.message });
        console.warn('⚠️ Twilio client initialization failed, falling back to test mode');
        this.isTestMode = true;
      }
    } else {
      terminalLog('OTP_SERVICE_TEST_MODE', 'SUCCESS', {
        testMode: true,
        testOTP: twilioConfig.testMode.testOTP
      });
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    if (this.isTestMode) {
      return twilioConfig.testMode.testOTP;
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via SMS using Twilio
  async sendOTP(phoneNumber, otpData = {}) {
    try {
      terminalLog('SEND_OTP_START', 'PROCESSING', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 5)}***` : 'NOT_PROVIDED',
        purpose: otpData.purpose || 'delivery_confirmation',
        testMode: this.isTestMode
      });

      // Validate and format phone number
      const formattedPhone = twilioConfig.validatePhoneNumber(phoneNumber);
      
      // Check rate limit
      twilioConfig.checkRateLimit(formattedPhone);

      // Generate OTP
      const otpCode = this.generateOTP();
      
      if (this.isTestMode) {
        // Test mode - simulate sending
        terminalLog('SEND_OTP_TEST_MODE', 'SUCCESS', {
          phoneNumber: `${formattedPhone.substring(0, 5)}***`,
          otpCode: otpCode,
          simulatedDelay: twilioConfig.testMode.simulateDelay
        });

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, twilioConfig.testMode.simulateDelay));

        return {
          success: true,
          otpCode: otpCode,
          message: 'OTP sent successfully (Test Mode)',
          testMode: true,
          phoneNumber: formattedPhone
        };
      }

      // Real Twilio sending
      const messageTemplate = twilioConfig.getMessageTemplate(
        otpData.purpose || 'delivery', 
        otpData.language || 'english'
      );
      
      const message = twilioConfig.formatMessage(messageTemplate, otpCode);

      terminalLog('TWILIO_SEND_REQUEST', 'PROCESSING', {
        phoneNumber: `${formattedPhone.substring(0, 5)}***`,
        messageLength: message.length,
        purpose: otpData.purpose
      });

      const verification = await this.verifyService.verifications.create({
        to: formattedPhone,
        channel: 'sms'
      });

      terminalLog('SEND_OTP_SUCCESS', 'SUCCESS', {
        phoneNumber: `${formattedPhone.substring(0, 5)}***`,
        verificationSid: verification.sid,
        status: verification.status,
        purpose: otpData.purpose
      });

      return {
        success: true,
        otpCode: null, // Don't return actual OTP for security
        verificationSid: verification.sid,
        message: 'OTP sent successfully',
        testMode: false,
        phoneNumber: formattedPhone
      };
    } catch (error) {
      terminalLog('SEND_OTP_ERROR', 'ERROR', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 5)}***` : 'NOT_PROVIDED',
        error: error.message,
        errorCode: error.code
      });

      // Handle specific Twilio errors
      let errorMessage = 'Failed to send OTP';
      if (error.code === 21211) {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 20003) {
        errorMessage = 'Authentication failed with Twilio service';
      } else if (error.code === 20429) {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.message.includes('Rate limit')) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        errorCode: error.code,
        testMode: this.isTestMode
      };
    }
  }

  // Verify OTP using Twilio
  async verifyOTP(phoneNumber, otpCode, verificationData = {}) {
    try {
      terminalLog('VERIFY_OTP_START', 'PROCESSING', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 5)}***` : 'NOT_PROVIDED',
        otpCode: otpCode ? `${otpCode.substring(0, 2)}***` : 'NOT_PROVIDED',
        testMode: this.isTestMode
      });

      const formattedPhone = twilioConfig.validatePhoneNumber(phoneNumber);

      if (this.isTestMode) {
        // Test mode verification
        const isValidTestOTP = otpCode === twilioConfig.testMode.testOTP;
        
        terminalLog('VERIFY_OTP_TEST_MODE', isValidTestOTP ? 'SUCCESS' : 'ERROR', {
          phoneNumber: `${formattedPhone.substring(0, 5)}***`,
          isValid: isValidTestOTP,
          expectedOTP: twilioConfig.testMode.testOTP
        });

        if (isValidTestOTP) {
          return {
            success: true,
            status: 'approved',
            message: 'OTP verified successfully (Test Mode)',
            testMode: true
          };
        } else {
          return {
            success: false,
            status: 'denied',
            message: 'Invalid OTP (Test Mode)',
            testMode: true
          };
        }
      }

      // Real Twilio verification
      terminalLog('TWILIO_VERIFY_REQUEST', 'PROCESSING', {
        phoneNumber: `${formattedPhone.substring(0, 5)}***`,
        otpLength: otpCode.length
      });

      const verificationCheck = await this.verifyService.verificationChecks.create({
        to: formattedPhone,
        code: otpCode
      });

      const isVerified = verificationCheck.status === 'approved';

      terminalLog('VERIFY_OTP_SUCCESS', isVerified ? 'SUCCESS' : 'ERROR', {
        phoneNumber: `${formattedPhone.substring(0, 5)}***`,
        status: verificationCheck.status,
        isValid: isVerified
      });

      return {
        success: true,
        status: verificationCheck.status,
        isValid: isVerified,
        message: isVerified ? 'OTP verified successfully' : 'Invalid or expired OTP',
        testMode: false
      };
    } catch (error) {
      terminalLog('VERIFY_OTP_ERROR', 'ERROR', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 5)}***` : 'NOT_PROVIDED',
        error: error.message,
        errorCode: error.code
      });

      let errorMessage = 'OTP verification failed';
      if (error.code === 20404) {
        errorMessage = 'OTP not found or expired';
      } else if (error.code === 20429) {
        errorMessage = 'Too many verification attempts';
      }

      return {
        success: false,
        error: errorMessage,
        errorCode: error.code,
        testMode: this.isTestMode
      };
    }
  }

  // Create delivery OTP (combines database storage with SMS sending)
  async createDeliveryOTP(orderData) {
    try {
      terminalLog('CREATE_DELIVERY_OTP_START', 'PROCESSING', {
        orderId: orderData.orderId,
        userId: orderData.userId,
        deliveryAgentId: orderData.deliveryAgentId,
        userPhone: orderData.userPhone ? `${orderData.userPhone.substring(0, 5)}***` : 'NOT_PROVIDED'
      });

      // Validate required data
      if (!orderData.orderId || !orderData.userId || !orderData.deliveryAgentId || !orderData.userPhone) {
        throw new Error('Missing required order data for OTP creation');
      }

      // Create OTP record in database
      const otpRecord = await OtpVerification.createDeliveryOTP({
        orderId: orderData.orderId,
        userId: orderData.userId,
        deliveryAgentId: orderData.deliveryAgentId,
        purpose: orderData.purpose || 'delivery_confirmation',
        deliveryLocation: orderData.deliveryLocation,
        notes: orderData.notes
      });

      terminalLog('OTP_RECORD_CREATED', 'SUCCESS', {
        otpId: otpRecord._id,
        orderId: orderData.orderId,
        otpCode: otpRecord.code,
        expiresAt: otpRecord.expiresAt
      });

      // Send OTP via SMS
      const smsResult = await this.sendOTP(orderData.userPhone, {
        purpose: otpRecord.purpose,
        language: orderData.language || 'english'
      });

      if (!smsResult.success) {
        // If SMS failed, mark OTP as cancelled
        otpRecord.status = 'cancelled';
        otpRecord.verificationResult = {
          success: false,
          errorMessage: `SMS sending failed: ${smsResult.error}`,
          verifiedBy: 'system'
        };
        await otpRecord.save();

        throw new Error(`Failed to send OTP: ${smsResult.error}`);
      }

      terminalLog('CREATE_DELIVERY_OTP_SUCCESS', 'SUCCESS', {
        otpId: otpRecord._id,
        orderId: orderData.orderId,
        smsSent: smsResult.success,
        testMode: smsResult.testMode
      });

      return {
        success: true,
        otpId: otpRecord._id,
        otpCode: this.isTestMode ? otpRecord.code : null, // Only return code in test mode
        expiresAt: otpRecord.expiresAt,
        message: 'Delivery OTP created and sent successfully',
        testMode: smsResult.testMode,
        order: otpRecord.order,
        user: otpRecord.user
      };
    } catch (error) {
      terminalLog('CREATE_DELIVERY_OTP_ERROR', 'ERROR', {
        orderId: orderData.orderId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify delivery OTP (combines Twilio verification with database update)
  async verifyDeliveryOTP(verificationData) {
    try {
      terminalLog('VERIFY_DELIVERY_OTP_START', 'PROCESSING', {
        otpId: verificationData.otpId,
        orderId: verificationData.orderId,
        enteredCode: verificationData.enteredCode ? `${verificationData.enteredCode.substring(0, 2)}***` : 'NOT_PROVIDED'
      });

      // Find OTP record
      const otpRecord = await OtpVerification.findById(verificationData.otpId)
        .populate([
          { path: 'order', select: 'orderNumber totalPrice' },
          { path: 'user', select: 'name mobileNumber' },
          { path: 'deliveryAgent', select: 'name phoneNumber' }
        ]);

      if (!otpRecord) {
        throw new Error('OTP record not found');
      }

      // Check if OTP can be verified
      if (!otpRecord.canVerify) {
        const reason = otpRecord.status !== 'pending' ? 'OTP already processed' :
                      otpRecord.isExpired ? 'OTP has expired' :
                      'Maximum verification attempts exceeded';
        
        terminalLog('VERIFY_DELIVERY_OTP_INVALID', 'ERROR', {
          otpId: verificationData.otpId,
          reason: reason,
          status: otpRecord.status,
          isExpired: otpRecord.isExpired,
          attemptCount: otpRecord.attemptCount
        });

        return {
          success: false,
          message: reason,
          otpRecord: otpRecord
        };
      }

      // For test mode, verify against stored code
      let verificationResult;
      if (this.isTestMode) {
        verificationResult = {
          success: true,
          status: verificationData.enteredCode === otpRecord.code ? 'approved' : 'denied',
          isValid: verificationData.enteredCode === otpRecord.code,
          message: verificationData.enteredCode === otpRecord.code ? 'OTP verified (Test Mode)' : 'Invalid OTP (Test Mode)',
          testMode: true
        };
      } else {
        // Verify with Twilio
        verificationResult = await this.verifyOTP(
          otpRecord.user.mobileNumber,
          verificationData.enteredCode,
          verificationData
        );
      }

      // Update OTP record with verification result
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
        twilioResult: verificationResult.isValid,
        message: otpVerificationResult.message
      });

      return {
        success: otpVerificationResult.success,
        message: otpVerificationResult.message,
        verificationId: otpVerificationResult.verificationId,
        verifiedAt: otpVerificationResult.verifiedAt,
        otpRecord: otpRecord,
        twilioResult: verificationResult
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

  // Send pickup confirmation OTP to seller
  async sendPickupOTP(pickupData) {
    try {
      terminalLog('SEND_PICKUP_OTP_START', 'PROCESSING', {
        orderId: pickupData.orderId,
        sellerPhone: pickupData.sellerPhone ? `${pickupData.sellerPhone.substring(0, 5)}***` : 'NOT_PROVIDED'
      });

      const otpResult = await this.sendOTP(pickupData.sellerPhone, {
        purpose: 'pickup',
        language: pickupData.language || 'english'
      });

      terminalLog('SEND_PICKUP_OTP_RESULT', otpResult.success ? 'SUCCESS' : 'ERROR', {
        orderId: pickupData.orderId,
        success: otpResult.success,
        testMode: otpResult.testMode
      });

      return otpResult;
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

  // Get OTP statistics
  async getOTPStatistics(timeframe = 'today') {
    try {
      terminalLog('GET_OTP_STATISTICS_START', 'PROCESSING', { timeframe });

      const stats = await OtpVerification.getOTPStats(timeframe);

      terminalLog('GET_OTP_STATISTICS_SUCCESS', 'SUCCESS', {
        timeframe,
        stats
      });

      return {
        success: true,
        timeframe,
        stats
      };
    } catch (error) {
      terminalLog('GET_OTP_STATISTICS_ERROR', 'ERROR', {
        timeframe,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cleanup expired OTPs
  async cleanupExpiredOTPs() {
    try {
      terminalLog('CLEANUP_EXPIRED_OTPS_START', 'PROCESSING');

      const result = await OtpVerification.cleanupExpiredOTPs();

      terminalLog('CLEANUP_EXPIRED_OTPS_RESULT', result.success ? 'SUCCESS' : 'ERROR', {
        expiredCount: result.expiredCount || 0,
        success: result.success
      });

      return result;
    } catch (error) {
      terminalLog('CLEANUP_EXPIRED_OTPS_ERROR', 'ERROR', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Health check for OTP service
  async healthCheck() {
    try {
      terminalLog('OTP_HEALTH_CHECK_START', 'PROCESSING');

      const checks = {
        testMode: this.isTestMode,
        twilioConfigured: !!(twilioConfig.accountSid && twilioConfig.authToken),
        databaseConnection: true // Assume DB is connected if we can run this
      };

      if (!this.isTestMode && this.twilioClient) {
        try {
          // Test Twilio connection by fetching account info
          const account = await this.twilioClient.api.accounts(twilioConfig.accountSid).fetch();
          checks.twilioConnectionTest = true;
          checks.accountStatus = account.status;
        } catch (twilioError) {
          checks.twilioConnectionTest = false;
          checks.twilioError = twilioError.message;
        }
      }

      const isHealthy = checks.testMode || (checks.twilioConfigured && checks.twilioConnectionTest !== false);

      terminalLog('OTP_HEALTH_CHECK_RESULT', isHealthy ? 'SUCCESS' : 'ERROR', {
        checks,
        isHealthy
      });

      return {
        success: true,
        healthy: isHealthy,
        checks,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      terminalLog('OTP_HEALTH_CHECK_ERROR', 'ERROR', {
        error: error.message
      });

      return {
        success: false,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const otpService = new OTPService();

// Setup cleanup job
if (process.env.NODE_ENV !== 'test') {
  OtpVerification.setupCleanupJob();
}

module.exports = otpService; 

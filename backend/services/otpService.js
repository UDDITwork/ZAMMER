// backend/services/otpService.js - OTP Generation and Verification Service

const twilio = require('twilio');
const twilioConfig = require('../config/twilio');
const OtpVerification = require('../models/OtpVerification');

// Enhanced terminal logging with comprehensive error tracking
const terminalLog = (action, status, data = null, error = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`\n${logLevel} ===============================
   [OTP-SERVICE] ${action}
===============================
🕐 Timestamp: ${timestamp}
📊 Status: ${status}`);
  
  if (data) {
    console.log('📋 Data:', JSON.stringify(data, null, 2));
  }
  
  if (error) {
    console.log('❌ Error:', error.message);
    console.log('📊 Error Code:', error.code || 'N/A');
    console.log('📋 Stack Trace:', error.stack);
  }
  
  console.log('===============================\n');
};

class OTPService {
  constructor() {
    console.log(`
🚀 ===============================
   OTP SERVICE INITIALIZATION
===============================
🌍 Environment: ${process.env.NODE_ENV || 'unknown'}
📱 Account SID: ${twilioConfig.accountSid ? 'SET' : 'NOT_SET'}
🔑 Auth Token: ${twilioConfig.authToken ? 'SET' : 'NOT_SET'}
🛠️ Verify Service SID: ${twilioConfig.verifyServiceSid ? 'SET' : 'NOT_SET'}
===============================`);
    
    // Always use real Twilio - no test mode
    this.isTestMode = false;
    
    try {
      console.log('🔄 Initializing Twilio client...');
      this.twilioClient = twilio(twilioConfig.accountSid, twilioConfig.authToken);
      this.verifyService = this.twilioClient.verify.v2.services(twilioConfig.verifyServiceSid);
      
      terminalLog('TWILIO_CLIENT_INITIALIZED', 'SUCCESS', {
        accountSid: twilioConfig.accountSid ? `${twilioConfig.accountSid.substring(0, 10)}...` : 'NOT_SET',
        verifyServiceSid: twilioConfig.verifyServiceSid ? `${twilioConfig.verifyServiceSid.substring(0, 10)}...` : 'NOT_SET',
        environment: process.env.NODE_ENV
      });
      
      console.log('✅ OTP Service initialized successfully with Twilio');
    } catch (error) {
      terminalLog('TWILIO_CLIENT_INIT_ERROR', 'ERROR', {
        error: error.message,
        accountSid: twilioConfig.accountSid ? 'SET' : 'NOT_SET',
        authToken: twilioConfig.authToken ? 'SET' : 'NOT_SET',
        verifyServiceSid: twilioConfig.verifyServiceSid ? 'SET' : 'NOT_SET'
      }, error);
      
      console.error('❌ CRITICAL: OTP Service failed to initialize. SMS functionality will not work.');
      throw new Error(`Failed to initialize Twilio client: ${error.message}`);
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via SMS using Twilio
  async sendOTP(phoneNumber, otpData = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`
📤 ===============================
   SEND OTP METHOD STARTED
===============================
📞 Phone Number: ${phoneNumber}
🎯 Purpose: ${otpData.purpose || 'delivery_confirmation'}
🌐 Language: ${otpData.language || 'english'}
🔧 Twilio Client: ${this.twilioClient ? 'INITIALIZED' : 'NOT_INITIALIZED'}
🛠️ Verify Service: ${this.verifyService ? 'INITIALIZED' : 'NOT_INITIALIZED'}
===============================`);
      
      terminalLog('SEND_OTP_START', 'PROCESSING', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 5)}***` : 'NOT_PROVIDED',
        purpose: otpData.purpose || 'delivery_confirmation',
        language: otpData.language || 'english',
        timestamp: new Date().toISOString()
      });

      // Validate and format phone number
      const formattedPhone = twilioConfig.validatePhoneNumber(phoneNumber);
      
      // Check rate limit
      twilioConfig.checkRateLimit(formattedPhone);

      // Generate OTP
      const otpCode = this.generateOTP();

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
        phoneNumber: formattedPhone
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`
❌ ===============================
   SEND OTP FAILED!
===============================
📞 Phone Number: ${phoneNumber}
⏱️ Processing Time: ${processingTime}ms
❌ Error: ${error.message}
📊 Error Code: ${error.code || 'N/A'}
📋 Error Type: ${error.constructor.name}
===============================`);
      
      terminalLog('SEND_OTP_ERROR', 'ERROR', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 5)}***` : 'NOT_PROVIDED',
        processingTime: `${processingTime}ms`,
        error: error.message,
        errorCode: error.code,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }, error);

      // Handle specific Twilio errors
      let errorMessage = 'Failed to send OTP';
      let errorCategory = 'UNKNOWN';
      
      if (error.code === 21211) {
        errorMessage = 'Invalid phone number format';
        errorCategory = 'VALIDATION_ERROR';
      } else if (error.code === 20003) {
        errorMessage = 'Authentication failed with Twilio service';
        errorCategory = 'AUTHENTICATION_ERROR';
      } else if (error.code === 20429) {
        errorMessage = 'Too many requests. Please try again later.';
        errorCategory = 'RATE_LIMIT_ERROR';
      } else if (error.message.includes('Rate limit')) {
        errorMessage = error.message;
        errorCategory = 'RATE_LIMIT_ERROR';
      } else if (error.code === 21614) {
        errorMessage = 'Invalid phone number - not a mobile number';
        errorCategory = 'VALIDATION_ERROR';
      } else if (error.code === 21214) {
        errorMessage = 'Phone number is not a valid mobile number';
        errorCategory = 'VALIDATION_ERROR';
      }

      console.error(`🚨 Error Category: ${errorCategory}`);
      console.error(`📋 Detailed Error: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        errorCode: error.code,
        errorCategory: errorCategory,
        processingTime: processingTime
      };
    }
  }

  // Verify OTP using Twilio
  async verifyOTP(phoneNumber, otpCode, verificationData = {}) {
    try {
      terminalLog('VERIFY_OTP_START', 'PROCESSING', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 5)}***` : 'NOT_PROVIDED',
        otpCode: otpCode ? `${otpCode.substring(0, 2)}***` : 'NOT_PROVIDED',
      });

      const formattedPhone = twilioConfig.validatePhoneNumber(phoneNumber);

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
      };
    }
  }

  // Create delivery OTP (combines database storage with SMS sending)
  async createDeliveryOTP(orderData) {
    try {
      console.log(`
🚀 ===============================
   OTP SERVICE: CREATE_DELIVERY_OTP
===============================
📋 Order ID: ${orderData.orderId}
👤 User ID: ${orderData.userId}
🚚 Delivery Agent ID: ${orderData.deliveryAgentId}
📞 User Phone: ${orderData.userPhone}
🎯 Purpose: ${orderData.purpose || 'delivery_confirmation'}
📍 Location: ${JSON.stringify(orderData.deliveryLocation)}
📝 Notes: ${orderData.notes}
===============================`);
      
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
      console.log(`
📱 ===============================
   SENDING OTP VIA SMS
===============================
📞 Phone Number: ${orderData.userPhone}
🎯 Purpose: ${otpRecord.purpose}
🌐 Language: ${orderData.language || 'english'}
🔑 OTP Code: ${otpRecord.code}
⏰ Expires At: ${otpRecord.expiresAt}
📋 OTP ID: ${otpRecord._id}
===============================`);
      
      const smsResult = await this.sendOTP(orderData.userPhone, {
        purpose: otpRecord.purpose,
        language: orderData.language || 'english'
      });

      console.log(`
📤 ===============================
   SMS SEND RESULT
===============================
✅ Success: ${smsResult.success}
📱 Phone: ${orderData.userPhone}
🧪 Test Mode: ${smsResult.testMode ? 'YES' : 'NO'}
📋 Message: ${smsResult.message}
❌ Error: ${smsResult.error || 'None'}
===============================`);

      if (!smsResult.success) {
        console.error(`
❌ ===============================
   SMS SENDING FAILED!
===============================
📞 Phone: ${orderData.userPhone}
❌ Error: ${smsResult.error}
📊 Error Code: ${smsResult.errorCode}
===============================`);
        
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
      });

      return {
        success: true,
        otpId: otpRecord._id,
        otpCode: otpRecord.code, // Return OTP code for verification
        expiresAt: otpRecord.expiresAt,
        message: 'Delivery OTP created and sent successfully',
        order: otpRecord.order,
        user: otpRecord.user
      };
    } catch (error) {
      console.error(`
❌ ===============================
   CREATE DELIVERY OTP FAILED!
===============================
📋 Order ID: ${orderData.orderId}
👤 User ID: ${orderData.userId}
📞 Phone: ${orderData.userPhone}
❌ Error: ${error.message}
📊 Error Type: ${error.constructor.name}
===============================`);
      
      terminalLog('CREATE_DELIVERY_OTP_ERROR', 'ERROR', {
        orderId: orderData.orderId,
        userId: orderData.userId,
        userPhone: orderData.userPhone ? `${orderData.userPhone.substring(0, 5)}***` : 'NOT_PROVIDED',
        error: error.message,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }, error);

      return {
        success: false,
        error: error.message,
        errorType: error.constructor.name,
        orderId: orderData.orderId
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

      // Verify with Twilio
      const verificationResult = await this.verifyOTP(
        otpRecord.user.mobileNumber,
        verificationData.enteredCode,
        verificationData
      );

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
        twilioConfigured: !!(twilioConfig.accountSid && twilioConfig.authToken),
        databaseConnection: true // Assume DB is connected if we can run this
      };

      if (this.twilioClient) {
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

      const isHealthy = checks.twilioConfigured && checks.twilioConnectionTest !== false;

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

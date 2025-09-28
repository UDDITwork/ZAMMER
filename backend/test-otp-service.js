// backend/test-otp-service.js - Test OTP Service Integration
require('dotenv').config();
const OTPService = require('./services/otpService');

console.log('🧪 Testing ZAMMER OTP Service Integration');
console.log('==========================================');

async function testOTPService() {
  try {
    const otpService = OTPService;
    
    console.log('✅ OTP Service initialized successfully');
    console.log('🔧 Test Mode:', otpService.isTestMode);
    
    // Test OTP generation
    const testPhoneNumber = '+917456886877';
    console.log(`📱 Testing with phone number: ${testPhoneNumber}`);
    
    const otpData = {
      phoneNumber: testPhoneNumber,
      orderId: 'TEST_ORDER_123',
      purpose: 'delivery_verification'
    };
    
    console.log('📤 Sending OTP...');
    const sendResult = await otpService.sendOTP(testPhoneNumber, otpData);
    
    if (sendResult.success) {
      console.log('✅ OTP sent successfully!');
      console.log('📋 Verification SID:', sendResult.verificationSid);
      console.log('📱 Phone:', sendResult.phoneNumber);
    } else {
      console.log('❌ OTP send failed:', sendResult.error);
    }
    
  } catch (error) {
    console.error('❌ OTP Service Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testOTPService();

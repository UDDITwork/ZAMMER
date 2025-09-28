// backend/verify-otp.js - OTP Verification Script
require('dotenv').config();
const twilio = require('twilio');

console.log('🔐 Twilio OTP Verification Test');
console.log('================================');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const phoneNumber = '+917456886877';

if (!accountSid || !authToken || !verifyServiceSid) {
  console.error('❌ Missing Twilio credentials in .env file');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function verifyOTP(otpCode) {
  try {
    console.log(`🔍 Verifying OTP: ${otpCode} for ${phoneNumber}`);
    
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks
      .create({
        to: phoneNumber,
        code: otpCode
      });
    
    console.log(`✅ OTP Verification Status: ${verificationCheck.status}`);
    
    if (verificationCheck.status === 'approved') {
      console.log('🎉 OTP Verification Successful!');
      console.log('✅ Your Twilio integration is working perfectly!');
    } else {
      console.log('❌ OTP Verification Failed');
      console.log('💡 Please check the OTP code and try again');
    }
    
    return verificationCheck.status === 'approved';
    
  } catch (error) {
    console.error('❌ OTP Verification Error:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    
    if (error.status === 400) {
      console.error('💡 Invalid OTP code - please check and try again');
    } else if (error.status === 404) {
      console.error('💡 Verification not found - OTP may have expired');
    }
    
    return false;
  }
}

// Get OTP from command line argument
const otpCode = process.argv[2];

if (!otpCode) {
  console.log('Usage: node verify-otp.js <OTP_CODE>');
  console.log('Example: node verify-otp.js 123456');
  process.exit(1);
}

verifyOTP(otpCode);

// backend/quick-twilio-test.js - Quick Twilio Test
require('dotenv').config();
const twilio = require('twilio');

console.log('🚀 Quick Twilio API Test');
console.log('========================');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

console.log(`Account SID: ${accountSid ? accountSid.substring(0, 15) + '...' : 'NOT SET'}`);
console.log(`Auth Token: ${authToken ? authToken.substring(0, 15) + '...' : 'NOT SET'}`);
console.log(`Verify Service: ${verifyServiceSid ? verifyServiceSid.substring(0, 15) + '...' : 'NOT SET'}`);

if (!accountSid || !authToken || !verifyServiceSid) {
  console.error('❌ Missing Twilio credentials in .env file');
  process.exit(1);
}

// Now we have the correct Account SID and Auth Token
console.log('✅ Using Account SID authentication');
const client = twilio(accountSid, authToken);

async function quickTest() {
  try {
    // Test account access
    console.log(`🔍 Testing with Account SID: ${accountSid}`);
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`✅ Account Status: ${account.status}`);
    console.log(`💰 Balance: $${account.balance}`);
    
    // Send OTP to your number
    const yourPhoneNumber = '+917456886877'; // Your actual phone number
    
    console.log(`📱 Sending OTP to: ${yourPhoneNumber}`);
    
    // Check if Verify Service SID is correct (should start with VA)
    if (!verifyServiceSid.startsWith('VA')) {
      console.log('⚠️  Verify Service SID should start with "VA"');
      console.log('🔧 Current value:', verifyServiceSid);
      console.log('📋 Go to: https://console.twilio.com/us1/develop/verify/services');
      console.log('🔍 Get your Verify Service SID (starts with VA)');
      console.log('');
      console.log('💡 For now, let\'s try to list your Verify Services...');
      
      // Try to list Verify Services
      try {
        const services = await client.verify.v2.services.list();
        console.log('📋 Available Verify Services:');
        services.forEach(service => {
          console.log(`  - ${service.friendlyName}: ${service.sid}`);
        });
        console.log('');
        console.log('💡 Use one of these Service SIDs in your .env file');
        return;
      } catch (error) {
        console.error('❌ Could not list Verify Services:', error.message);
        return;
      }
    }
    
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({
        to: yourPhoneNumber,
        channel: 'sms'
      });
    
    console.log(`✅ OTP Sent! Status: ${verification.status}`);
    console.log(`📋 Verification SID: ${verification.sid}`);
    console.log('📱 Check your phone for the OTP message');
    console.log('');
    console.log('🔢 Please enter the OTP code you received:');
    
    // For testing purposes, let's create a simple verification
    // In a real app, you'd get this from user input
    const testOTP = '123456'; // This is just for testing - you'll need to enter the real OTP
    console.log(`🧪 Testing with OTP: ${testOTP}`);
    
    try {
      const verificationCheck = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks
        .create({
          to: yourPhoneNumber,
          code: testOTP
        });
      
      console.log(`✅ OTP Verification Status: ${verificationCheck.status}`);
      if (verificationCheck.status === 'approved') {
        console.log('🎉 OTP Verification Successful!');
      } else {
        console.log('❌ OTP Verification Failed');
      }
    } catch (error) {
      console.log('❌ OTP Verification Error:', error.message);
      console.log('💡 This is expected with a test OTP - enter the real OTP to verify');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    
    if (error.status === 401) {
      console.error('🔑 Authentication failed - API keys are invalid');
      console.error('💡 Make sure you have the correct Account SID (starts with AC) in your .env file');
    } else if (error.status === 404) {
      console.error('🔍 Service not found - Check Verify Service SID');
      console.error('💡 Make sure TWILIO_VERIFY_SERVICE_SID is correct in your .env file');
    } else if (error.code === 20003) {
      console.error('🔐 Authentication Error - Check your credentials');
      console.error('💡 Go to: https://console.twilio.com/us1/develop/account/settings');
      console.error('🔍 Get your Account SID (starts with AC) and Auth Token');
    }
  }
}

quickTest();

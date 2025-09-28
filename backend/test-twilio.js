// backend/test-twilio.js - Twilio API Keys Test Script
require('dotenv').config();
const twilio = require('twilio');

// Twilio Configuration from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

console.log('🔍 [TWILIO-TEST] Starting Twilio API Keys Test...');
console.log('📋 [TWILIO-TEST] Configuration:');
console.log(`   Account SID: ${accountSid ? accountSid.substring(0, 10) + '...' : 'NOT SET'}`);
console.log(`   Auth Token: ${authToken ? authToken.substring(0, 10) + '...' : 'NOT SET'}`);
console.log(`   Verify Service SID: ${verifyServiceSid ? verifyServiceSid.substring(0, 10) + '...' : 'NOT SET'}`);

// Validate environment variables
if (!accountSid || !authToken || !verifyServiceSid) {
  console.error('❌ [TWILIO-TEST] Missing required environment variables!');
  console.error('   Please check your .env file for:');
  console.error('   - TWILIO_ACCOUNT_SID');
  console.error('   - TWILIO_AUTH_TOKEN');
  console.error('   - TWILIO_VERIFY_SERVICE_SID');
  process.exit(1);
}

// Initialize Twilio client
const client = twilio(accountSid, authToken);

async function testTwilioAPI() {
  try {
    console.log('\n🔧 [TWILIO-TEST] Testing Twilio API connection...');
    
    // Test 1: Check account balance
    console.log('📊 [TWILIO-TEST] Checking account balance...');
    const balance = await client.api.accounts(accountSid).fetch();
    console.log(`✅ [TWILIO-TEST] Account Status: ${balance.status}`);
    console.log(`💰 [TWILIO-TEST] Account Balance: $${balance.balance}`);
    
    // Test 2: List available phone numbers (to verify API access)
    console.log('\n📱 [TWILIO-TEST] Testing phone number access...');
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 1 });
    console.log(`✅ [TWILIO-TEST] Phone Numbers Access: OK (${phoneNumbers.length} numbers found)`);
    
    // Test 3: Test Verify Service
    console.log('\n🔐 [TWILIO-TEST] Testing Verify Service...');
    const verifyService = await client.verify.v2.services(verifyServiceSid).fetch();
    console.log(`✅ [TWILIO-TEST] Verify Service: ${verifyService.friendlyName}`);
    console.log(`📧 [TWILIO-TEST] Service Status: ${verifyService.status}`);
    
    // Test 4: Send OTP to your phone number
    console.log('\n📲 [TWILIO-TEST] Sending OTP test...');
    const phoneNumber = '+919876543210'; // Replace with your actual phone number
    console.log(`📱 [TWILIO-TEST] Sending OTP to: ${phoneNumber}`);
    
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({
        to: phoneNumber,
        channel: 'sms'
      });
    
    console.log(`✅ [TWILIO-TEST] OTP Sent Successfully!`);
    console.log(`📋 [TWILIO-TEST] Verification SID: ${verification.sid}`);
    console.log(`📊 [TWILIO-TEST] Status: ${verification.status}`);
    console.log(`⏰ [TWILIO-TEST] Expires At: ${verification.dateExpires}`);
    
    console.log('\n🎉 [TWILIO-TEST] All tests passed! Your Twilio API keys are working correctly.');
    console.log('📱 Check your phone for the OTP message.');
    
  } catch (error) {
    console.error('\n❌ [TWILIO-TEST] Twilio API test failed!');
    console.error('🔍 [TWILIO-TEST] Error Details:');
    console.error(`   Status: ${error.status || 'Unknown'}`);
    console.error(`   Code: ${error.code || 'Unknown'}`);
    console.error(`   Message: ${error.message || 'Unknown error'}`);
    console.error(`   More Info: ${error.moreInfo || 'No additional info'}`);
    
    if (error.status === 401) {
      console.error('\n🔑 [TWILIO-TEST] Authentication failed!');
      console.error('   Your Twilio credentials are invalid or expired.');
      console.error('   Please check your Account SID and Auth Token.');
    } else if (error.status === 404) {
      console.error('\n🔍 [TWILIO-TEST] Service not found!');
      console.error('   Your Verify Service SID might be incorrect.');
    } else if (error.status === 400) {
      console.error('\n📱 [TWILIO-TEST] Invalid phone number!');
      console.error('   Please update the phone number in the script.');
    }
    
    console.error('\n💡 [TWILIO-TEST] Troubleshooting:');
    console.error('   1. Check if your Twilio account is active');
    console.error('   2. Verify your API keys in the Twilio Console');
    console.error('   3. Ensure you have sufficient balance');
    console.error('   4. Check if the Verify Service is properly configured');
    
    process.exit(1);
  }
}

// Run the test
testTwilioAPI();

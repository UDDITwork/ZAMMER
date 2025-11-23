// Test script to verify SMEPay API credentials (Client ID and Secret)
require('dotenv').config();
const axios = require('axios');
const smepayConfig = require('./config/smepay');

console.log('\n🔐 ===============================');
console.log('   SMEPAY CREDENTIALS TEST');
console.log('===============================\n');

// Step 1: Check if credentials exist
console.log('📋 Step 1: Checking Environment Variables');
console.log('');

const clientId = process.env.SMEPAY_CLIENT_ID;
const clientSecret = process.env.SMEPAY_CLIENT_SECRET;
const mode = process.env.SMEPAY_MODE || 'development';

console.log(`   SMEPAY_MODE: ${mode}`);
console.log(`   SMEPAY_CLIENT_ID: ${clientId ? `${clientId.substring(0, 15)}... (${clientId.length} chars)` : '❌ NOT SET'}`);
console.log(`   SMEPAY_CLIENT_SECRET: ${clientSecret ? '***SET*** (' + clientSecret.length + ' chars)' : '❌ NOT SET'}`);
console.log('');

if (!clientId || !clientSecret) {
  console.log('❌ ===============================');
  console.log('   CREDENTIALS MISSING');
  console.log('===============================');
  console.log('');
  console.log('Please add to your .env file:');
  console.log('   SMEPAY_CLIENT_ID=your_client_id_here');
  console.log('   SMEPAY_CLIENT_SECRET=your_client_secret_here');
  console.log('   SMEPAY_MODE=development # or production');
  console.log('');
  process.exit(1);
}

// Step 2: Get base URL
const baseURL = smepayConfig.getBaseURL();
const authURL = `${baseURL}${smepayConfig.endpoints.auth}`;

console.log('📋 Step 2: API Configuration');
console.log('');
console.log(`   Base URL: ${baseURL}`);
console.log(`   Auth Endpoint: ${smepayConfig.endpoints.auth}`);
console.log(`   Full Auth URL: ${authURL}`);
console.log('');

// Step 3: Test authentication
console.log('📋 Step 3: Testing Authentication');
console.log('');
console.log('   Sending request to SMEPay API...');
console.log('');

const authPayload = {
  client_id: clientId.trim(),
  client_secret: clientSecret.trim()
};

let testResult = {
  success: false,
  error: null,
  details: null
};

axios({
  method: 'POST',
  url: authURL,
  data: authPayload,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'ZAMMER-Credentials-Test/1.0'
  },
  validateStatus: function (status) {
    return status < 500; // Don't throw for 4xx errors
  }
})
  .then((response) => {
    console.log('   ✅ Response received from SMEPay API');
    console.log(`   Status Code: ${response.status}`);
    console.log('');

    // Check response status
    if (response.status === 200 || response.status === 201) {
      // Check for access token
      let accessToken = null;
      
      if (response.data?.access_token) {
        accessToken = response.data.access_token;
      } else if (response.data?.token) {
        accessToken = response.data.token;
      } else if (response.data?.data?.access_token) {
        accessToken = response.data.data.access_token;
      } else if (response.data?.data?.token) {
        accessToken = response.data.data.token;
      }

      if (accessToken) {
        testResult.success = true;
        console.log('✅ ===============================');
        console.log('   CREDENTIALS ARE VALID!');
        console.log('===============================');
        console.log('');
        console.log('   ✅ Client ID: CORRECT');
        console.log('   ✅ Client Secret: CORRECT');
        console.log(`   ✅ Access Token Received: ${accessToken.substring(0, 20)}...`);
        console.log(`   ✅ Token Length: ${accessToken.length} characters`);
        console.log('');
        console.log('   🎉 Your SMEPay credentials are working correctly!');
        console.log('');
      } else {
        testResult.success = false;
        testResult.error = 'No access token in response';
        testResult.details = response.data;
        
        console.log('⚠️ ===============================');
        console.log('   UNEXPECTED RESPONSE');
        console.log('===============================');
        console.log('');
        console.log('   Status: 200 OK, but no access token found');
        console.log('   Response:', JSON.stringify(response.data, null, 2));
        console.log('');
      }
    } else if (response.status === 401) {
      testResult.success = false;
      testResult.error = 'Invalid credentials';
      testResult.details = response.data;
      
      console.log('❌ ===============================');
      console.log('   CREDENTIALS ARE INVALID');
      console.log('===============================');
      console.log('');
      console.log('   ❌ Status: 401 Unauthorized');
      console.log('   ❌ Client ID or Client Secret is incorrect');
      console.log('');
      console.log('   Possible issues:');
      console.log('   1. Client ID is wrong');
      console.log('   2. Client Secret is wrong');
      console.log('   3. Credentials are for different mode (dev/prod)');
      console.log('   4. Account is suspended or inactive');
      console.log('');
      if (response.data?.message) {
        console.log(`   Error Message: ${response.data.message}`);
        console.log('');
      }
      console.log('   💡 Solution:');
      console.log('   - Get correct credentials from: https://dashboard.smepay.in/');
      console.log('   - Make sure SMEPAY_MODE matches your credentials');
      console.log('   - Check if credentials are active in your dashboard');
      console.log('');
    } else if (response.status === 403) {
      testResult.success = false;
      testResult.error = 'Access forbidden';
      testResult.details = response.data;
      
      console.log('❌ ===============================');
      console.log('   ACCESS FORBIDDEN');
      console.log('===============================');
      console.log('');
      console.log('   ❌ Status: 403 Forbidden');
      console.log('   ❌ Your account may be restricted or suspended');
      console.log('');
      if (response.data?.message) {
        console.log(`   Error Message: ${response.data.message}`);
        console.log('');
      }
    } else {
      testResult.success = false;
      testResult.error = `HTTP ${response.status}`;
      testResult.details = response.data;
      
      console.log('❌ ===============================');
      console.log('   AUTHENTICATION FAILED');
      console.log('===============================');
      console.log('');
      console.log(`   ❌ Status: ${response.status} ${response.statusText}`);
      console.log('');
      if (response.data) {
        console.log('   Response:', JSON.stringify(response.data, null, 2));
        console.log('');
      }
    }
  })
  .catch((error) => {
    testResult.success = false;
    testResult.error = error.message;
    testResult.details = error.response?.data || error.message;
    
    console.log('❌ ===============================');
    console.log('   CONNECTION ERROR');
    console.log('===============================');
    console.log('');
    
    if (error.code === 'ENOTFOUND') {
      console.log('   ❌ Error: Cannot reach SMEPay server');
      console.log('   ❌ Check your internet connection');
      console.log(`   ❌ URL: ${authURL}`);
      console.log('');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Error: Connection refused');
      console.log('   ❌ SMEPay server may be down');
      console.log(`   ❌ URL: ${authURL}`);
      console.log('');
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('   ❌ Error: Request timed out');
      console.log('   ❌ SMEPay server is not responding');
      console.log(`   ❌ URL: ${authURL}`);
      console.log('');
    } else if (error.response) {
      console.log(`   ❌ Status: ${error.response.status}`);
      console.log('   ❌ Response:', JSON.stringify(error.response.data, null, 2));
      console.log('');
    } else {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   ❌ Code: ${error.code || 'UNKNOWN'}`);
      console.log('');
    }
  })
  .finally(() => {
    // Final summary
    console.log('===============================');
    if (testResult.success) {
      console.log('✅ TEST PASSED: Credentials are valid');
      console.log('✅ Your SMEPay integration is ready to use');
    } else {
      console.log('❌ TEST FAILED: Credentials are invalid or connection failed');
      console.log(`❌ Error: ${testResult.error || 'Unknown error'}`);
    }
    console.log('===============================\n');
    
    // Exit with appropriate code
    process.exit(testResult.success ? 0 : 1);
  });


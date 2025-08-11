// backend/test-smepay.js - Test SMEPay Integration (Official API)
// Run this file to test your SMEPay configuration with official endpoints

require('dotenv').config();
const axios = require('axios');

console.log('🧪 TESTING SMEPAY INTEGRATION (OFFICIAL API)');
console.log('=============================================\n');

// Test configuration based on official SMEPay structure
const testConfig = {
  mode: process.env.SMEPAY_MODE || 'development',
  baseURLs: {
    development: 'https://apps.typof.in/api',
    production: 'https://apps.typof.com/api'
  },
  clientId: process.env.SMEPAY_CLIENT_ID,
  clientSecret: process.env.SMEPAY_CLIENT_SECRET,
  widgetScript: 'https://typof.co/smepay/checkout.js'
};

// Get the appropriate base URL
testConfig.baseURL = testConfig.baseURLs[testConfig.mode];

// Endpoints
const endpoints = {
  auth: '/external/auth',
  createOrder: '/external/create-order',
  validateOrder: '/external/validate-order'
};

// 🎯 TEST 1: Check Environment Variables
console.log('📋 Step 1: Checking Environment Variables');
console.log('-----------------------------------------');

console.log(`✅ SMEPAY_MODE: ${testConfig.mode}`);
console.log(`✅ Base URL: ${testConfig.baseURL}`);

if (!testConfig.clientId) {
  console.log('❌ SMEPAY_CLIENT_ID is not set');
  console.log('🔧 Add this to your .env file: SMEPAY_CLIENT_ID=your_client_id');
} else {
  console.log(`✅ SMEPAY_CLIENT_ID: ${testConfig.clientId.substring(0, 15)}... (${testConfig.clientId.length} chars)`);
}

if (!testConfig.clientSecret) {
  console.log('❌ SMEPAY_CLIENT_SECRET is not set');
  console.log('🔧 Add this to your .env file: SMEPAY_CLIENT_SECRET=your_client_secret');
} else {
  console.log(`✅ SMEPAY_CLIENT_SECRET: ${testConfig.clientSecret.substring(0, 10)}... (${testConfig.clientSecret.length} chars)`);
}

if (!testConfig.clientId || !testConfig.clientSecret) {
  console.log('\n❌ TEST FAILED: Missing required environment variables');
  console.log('\n🔧 To fix:');
  console.log('1. Create/edit .env file in your backend folder');
  console.log('2. Add the following lines:');
  console.log('   SMEPAY_CLIENT_ID=your_actual_client_id_here');
  console.log('   SMEPAY_CLIENT_SECRET=your_actual_client_secret_here');
  console.log('   SMEPAY_MODE=development');
  console.log('\n3. Get credentials from: https://dashboard.smepay.in/');
  process.exit(1);
}

// 🎯 TEST 2: Test Network Connectivity
async function testConnectivity() {
  console.log('\n🌐 Step 2: Testing Network Connectivity');
  console.log('--------------------------------------');
  
  try {
    // Test main domain connectivity
    const mainDomain = testConfig.baseURL.replace('/api', '');
    const response = await axios.get(mainDomain, {
      timeout: 10000,
      validateStatus: () => true // Accept any status
    });
    
    console.log(`✅ Network connectivity to ${testConfig.mode} server: OK (Status: ${response.status})`);
    console.log(`📡 Response headers: ${response.headers['content-type'] || 'Unknown'}`);
    
    // Test widget script availability
    try {
      const widgetResponse = await axios.get(testConfig.widgetScript, {
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`✅ Widget script availability: OK (Status: ${widgetResponse.status})`);
    } catch (widgetError) {
      console.log(`⚠️  Widget script test failed: ${widgetError.message}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Network connectivity: FAILED`);
    console.log(`🔍 Error: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      console.log('🔧 Fix: Check your internet connection');
      console.log(`🔧 Verify ${testConfig.mode} mode server is accessible`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log('🔧 Fix: SMEPay server may be down');
    } else if (error.code === 'ECONNABORTED') {
      console.log('🔧 Fix: Request timed out, try again');
    }
    
    return false;
  }
}

// 🎯 TEST 3: Test SMEPay Authentication (Official Endpoint)
async function testAuthentication() {
  console.log('\n🔐 Step 3: Testing SMEPay Authentication (Official API)');
  console.log('------------------------------------------------------');
  
  const authPayload = {
    client_id: testConfig.clientId,
    client_secret: testConfig.clientSecret
  };
  
  const authURL = `${testConfig.baseURL}${endpoints.auth}`;
  
  console.log('📤 Sending authentication request...');
  console.log(`🎯 Endpoint: ${authURL}`);
  console.log(`🌐 Mode: ${testConfig.mode}`);
  console.log(`📋 Client ID: ${testConfig.clientId.substring(0, 15)}...`);
  
  try {
    const response = await axios({
      method: 'POST',
      url: authURL,
      data: authPayload,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ZAMMER-Test/1.0'
      },
      timeout: 15000,
      validateStatus: () => true // Don't throw for any status
    });
    
    console.log(`📬 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Response Headers: ${response.headers['content-type']}`);
    console.log(`📝 Response Data:`, JSON.stringify(response.data, null, 2));
    
    // Check for successful authentication (flexible response structure)
    let accessToken = null;
    let isSuccess = false;
    
    if (response.status === 200) {
      // Try different possible token field names
      if (response.data?.access_token) {
        accessToken = response.data.access_token;
        isSuccess = true;
      } else if (response.data?.token) {
        accessToken = response.data.token;
        isSuccess = true;
      } else if (response.data?.data?.access_token) {
        accessToken = response.data.data.access_token;
        isSuccess = true;
      } else if (response.data?.data?.token) {
        accessToken = response.data.data.token;
        isSuccess = true;
      }
    }
    
    if (isSuccess && accessToken) {
      console.log(`✅ Authentication: SUCCESS`);
      console.log(`🎫 Access Token: ${accessToken.substring(0, 20)}...`);
      console.log(`⏰ Token Type: ${response.data.token_type || 'Bearer'}`);
      console.log(`🌐 Mode: ${testConfig.mode}`);
      return { success: true, token: accessToken };
    } else if (response.status === 401) {
      console.log(`❌ Authentication: FAILED - Invalid Credentials`);
      console.log(`🔍 Message: ${response.data?.message || 'Unknown error'}`);
      console.log(`🔧 Fix: Check your SMEPAY_CLIENT_ID and SMEPAY_CLIENT_SECRET for ${testConfig.mode} mode`);
      console.log(`🔧 Verify credentials are active in ${testConfig.mode} environment`);
      return { success: false, error: 'Invalid credentials' };
    } else {
      console.log(`❌ Authentication: FAILED - Unexpected Response`);
      console.log(`🔍 Status: ${response.status}`);
      console.log(`🔍 Data: ${JSON.stringify(response.data)}`);
      console.log(`🔧 This could indicate an API structure change or server issue`);
      return { success: false, error: 'Unexpected response' };
    }
    
  } catch (error) {
    console.log(`❌ Authentication: ERROR`);
    console.log(`🔍 Error: ${error.message}`);
    console.log(`🔍 Code: ${error.code}`);
    
    if (error.response) {
      console.log(`📬 Response Status: ${error.response.status}`);
      console.log(`📝 Response Data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    return { success: false, error: error.message };
  }
}

// 🎯 TEST 4: Test Order Creation (Official Endpoint)
async function testOrderCreation(accessToken) {
  console.log('\n📦 Step 4: Testing Order Creation (Official API)');
  console.log('------------------------------------------------');
  
  const testOrderPayload = {
    client_id: testConfig.clientId,
    amount: '100.00', // Always use decimal format
    order_id: `TEST_ORDER_${Date.now()}`,
    callback_url: 'http://localhost:3000/payment/callback',
    customer_details: {
      email: 'test@example.com',
      mobile: '9999999999',
      name: 'Test Customer'
    },
    currency: 'INR'
  };
  
  const createOrderURL = `${testConfig.baseURL}${endpoints.createOrder}`;
  
  console.log('📤 Sending test order creation request...');
  console.log(`🎯 Endpoint: ${createOrderURL}`);
  console.log(`📋 Test Order ID: ${testOrderPayload.order_id}`);
  console.log(`💰 Test Amount: ₹${testOrderPayload.amount}`);
  console.log(`👤 Customer: ${testOrderPayload.customer_details.email}`);
  console.log(`🌐 Mode: ${testConfig.mode}`);
  
  try {
    const response = await axios({
      method: 'POST',
      url: createOrderURL,
      data: testOrderPayload,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'ZAMMER-Test/1.0'
      },
      timeout: 15000,
      validateStatus: () => true
    });
    
    console.log(`📬 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📝 Response Data:`, JSON.stringify(response.data, null, 2));
    
    // Check for successful order creation (flexible response structure)
    let orderSlug = null;
    let isSuccess = false;
    
    if (response.status === 200) {
      // Check for success indicators
      if (response.data?.status === true || response.data?.success === true) {
        isSuccess = true;
      }
      
      // Try different possible slug field names
      if (response.data?.order_slug) {
        orderSlug = response.data.order_slug;
      } else if (response.data?.data?.order_slug) {
        orderSlug = response.data.data.order_slug;
      } else if (response.data?.slug) {
        orderSlug = response.data.slug;
      }
    }
    
    if (isSuccess && orderSlug) {
      console.log(`✅ Order Creation: SUCCESS`);
      console.log(`🏷️  Order Slug: ${orderSlug}`);
      console.log(`📱 Widget Script: ${testConfig.widgetScript}`);
      console.log(`🌐 Mode: ${testConfig.mode}`);
      return { success: true, orderSlug: orderSlug };
    } else {
      console.log(`❌ Order Creation: FAILED`);
      console.log(`🔍 Message: ${response.data?.message || 'Unknown error'}`);
      console.log(`🔧 Check if amount format is correct (decimal format required)`);
      console.log(`🔧 Verify customer details are properly formatted`);
      return { success: false, error: response.data?.message };
    }
    
  } catch (error) {
    console.log(`❌ Order Creation: ERROR`);
    console.log(`🔍 Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📬 Response Status: ${error.response.status}`);
      console.log(`📝 Response Data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    return { success: false, error: error.message };
  }
}

// 🎯 TEST 5: Test Order Validation (if order creation succeeded)
async function testOrderValidation(accessToken, orderSlug) {
  console.log('\n🔍 Step 5: Testing Order Validation (Official API)');
  console.log('--------------------------------------------------');
  
  const validatePayload = {
    client_id: testConfig.clientId,
    amount: '100.00',
    slug: orderSlug
  };
  
  const validateURL = `${testConfig.baseURL}${endpoints.validateOrder}`;
  
  console.log('📤 Sending order validation request...');
  console.log(`🎯 Endpoint: ${validateURL}`);
  console.log(`🏷️  Order Slug: ${orderSlug}`);
  console.log(`💰 Amount: ₹${validatePayload.amount}`);
  console.log(`🌐 Mode: ${testConfig.mode}`);
  
  try {
    const response = await axios({
      method: 'POST',
      url: validateURL,
      data: validatePayload,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'ZAMMER-Test/1.0'
      },
      timeout: 15000,
      validateStatus: () => true
    });
    
    console.log(`📬 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📝 Response Data:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log(`✅ Order Validation: SUCCESS`);
      console.log(`💳 Payment Status: ${response.data?.payment_status || response.data?.status || 'pending'}`);
      console.log(`🌐 Mode: ${testConfig.mode}`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ Order Validation: FAILED`);
      console.log(`🔍 Message: ${response.data?.message || 'Unknown error'}`);
      return { success: false, error: response.data?.message };
    }
    
  } catch (error) {
    console.log(`❌ Order Validation: ERROR`);
    console.log(`🔍 Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📬 Response Status: ${error.response.status}`);
      console.log(`📝 Response Data:`, JSON.stringify(error.response.data, null, 2));
    }
    
    return { success: false, error: error.message };
  }
}

// 🎯 MAIN TEST RUNNER
async function runTests() {
  console.log('🚀 Starting SMEPay Integration Tests (Official API)...\n');
  
  const results = {
    connectivity: false,
    authentication: false,
    orderCreation: false,
    orderValidation: false
  };
  
  // Test connectivity
  results.connectivity = await testConnectivity();
  if (!results.connectivity) {
    console.log('\n❌ TESTS FAILED: Network connectivity issues');
    return;
  }
  
  // Test authentication
  const authResult = await testAuthentication();
  results.authentication = authResult.success;
  if (!authResult.success) {
    console.log('\n❌ TESTS FAILED: Authentication failed');
    console.log('\n🔧 Next Steps:');
    console.log('1. Verify your SMEPay account is active');
    console.log('2. Check your Client ID and Client Secret');
    console.log(`3. Ensure credentials are valid for ${testConfig.mode} mode`);
    console.log('4. Contact SMEPay support if credentials are correct');
    return;
  }
  
  // Test order creation
  const orderResult = await testOrderCreation(authResult.token);
  results.orderCreation = orderResult.success;
  
  // Test order validation (if order creation succeeded)
  if (orderResult.success && orderResult.orderSlug) {
    const validateResult = await testOrderValidation(authResult.token, orderResult.orderSlug);
    results.orderValidation = validateResult.success;
  }
  
  // Final results
  console.log('\n🏁 TEST RESULTS SUMMARY');
  console.log('======================');
  console.log(`✅ Network Connectivity: ${results.connectivity ? 'PASSED' : 'FAILED'}`);
  console.log(`${results.authentication ? '✅' : '❌'} Authentication: ${results.authentication ? 'PASSED' : 'FAILED'}`);
  console.log(`${results.orderCreation ? '✅' : '❌'} Order Creation: ${results.orderCreation ? 'PASSED' : 'FAILED'}`);
  console.log(`${results.orderValidation ? '✅' : '❌'} Order Validation: ${results.orderValidation ? 'PASSED' : 'FAILED'}`);
  
  console.log(`\n🌐 Testing Mode: ${testConfig.mode.toUpperCase()}`);
  console.log(`🔗 API Server: ${testConfig.baseURL}`);
  console.log(`📱 Widget Script: ${testConfig.widgetScript}`);
  
  if (results.authentication && results.orderCreation) {
    console.log('\n🎉 CORE TESTS PASSED! 🎉');
    console.log('SMEPay integration is working correctly.');
    console.log('\n✅ You can now:');
    console.log('   • Start your ZAMMER backend server');
    console.log('   • Test payments in your application');
    if (testConfig.mode === 'production') {
      console.log('   • Process real transactions (PRODUCTION MODE)');
    } else {
      console.log('   • Test with development endpoints');
      console.log('   • Switch to production mode when ready');
    }
    console.log('\n📱 Integration Flow:');
    console.log('   1. Create order → Get order_slug');
    console.log('   2. Load checkout.js script');
    console.log('   3. Call smepayCheckout({ slug: order_slug })');
    console.log('   4. Handle payment callbacks');
    console.log('   5. Validate payment status');
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    console.log('Fix the issues above before using SMEPay in your application.');
    
    if (!results.authentication) {
      console.log('\n🔑 Authentication Issues:');
      console.log('   • Verify client_id and client_secret');
      console.log('   • Check if credentials match the current mode');
      console.log('   • Contact SMEPay support for credential verification');
    }
    
    if (!results.orderCreation) {
      console.log('\n📦 Order Creation Issues:');
      console.log('   • Check payload format requirements');
      console.log('   • Verify amount is in decimal format');
      console.log('   • Ensure customer details are complete');
    }
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 UNEXPECTED ERROR:', error.message);
  console.error('Stack:', error.stack);
});

// HOW TO RUN THIS TEST:
// ====================
// 1. Save this file as 'test-smepay.js' in your backend folder
// 2. Make sure your .env file has the correct SMEPay credentials
// 3. Run: node test-smepay.js
// 4. Check the output for any errors
// 5. Ensure all tests pass before using in your application
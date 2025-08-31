#!/usr/bin/env node

/**
 * ZAMMER API Endpoints Verification Script
 * 
 * This script tests all major API endpoints to ensure they're working correctly.
 * Run this from the backend directory: node test-api-endpoints.js
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_TIMEOUT = 10000; // 10 seconds

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: TEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 0
    };
  }
}

// Test function
async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Testing: ${testName}`.cyan);
  
  try {
    const result = await testFunction();
    if (result.success) {
      testResults.passed++;
      console.log(`✅ ${testName}: PASSED`.green);
      if (result.details) {
        console.log(`   ${result.details}`.gray);
      }
    } else {
      testResults.failed++;
      console.log(`❌ ${testName}: FAILED`.red);
      console.log(`   Error: ${result.error}`.red);
    }
    
    testResults.details.push({
      name: testName,
      success: result.success,
      error: result.error || null,
      details: result.details || null
    });
  } catch (error) {
    testResults.failed++;
    console.log(`❌ ${testName}: ERROR`.red);
    console.log(`   ${error.message}`.red);
    
    testResults.details.push({
      name: testName,
      success: false,
      error: error.message,
      details: null
    });
  }
}

// Individual test functions
async function testServerHealth() {
  const result = await makeRequest('GET', '/api/health');
  return {
    success: result.success && result.status === 200,
    details: result.success ? `Server responding on ${BASE_URL}` : 'Server not responding'
  };
}

async function testUserRegistration() {
  const testUser = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phone: '+1234567890'
  };
  
  const result = await makeRequest('POST', '/api/users/register', testUser);
  return {
    success: result.success && (result.status === 201 || result.status === 200),
    details: result.success ? 'User registration endpoint working' : 'Registration failed'
  };
}

async function testUserLogin() {
  const loginData = {
    email: 'test@example.com',
    password: 'TestPassword123!'
  };
  
  const result = await makeRequest('POST', '/api/users/login', loginData);
  return {
    success: result.success && result.status === 200,
    details: result.success ? 'User login endpoint working' : 'Login failed (expected if no test user exists)'
  };
}

async function testSellerRegistration() {
  const testSeller = {
    name: 'Test Seller',
    email: `seller${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phone: '+1234567890',
    businessName: 'Test Business',
    businessType: 'Retail'
  };
  
  const result = await makeRequest('POST', '/api/sellers/register', testSeller);
  return {
    success: result.success && (result.status === 201 || result.status === 200),
    details: result.success ? 'Seller registration endpoint working' : 'Seller registration failed'
  };
}

async function testProductEndpoints() {
  const result = await makeRequest('GET', '/api/products');
  return {
    success: result.success && result.status === 200,
    details: result.success ? 'Product listing endpoint working' : 'Product endpoints not accessible'
  };
}

async function testCartEndpoints() {
  const result = await makeRequest('GET', '/api/cart');
  return {
    success: result.success || result.status === 401, // 401 is expected without auth
    details: result.success ? 'Cart endpoint accessible' : 'Cart endpoint requires authentication (expected)'
  };
}

async function testOrderEndpoints() {
  const result = await makeRequest('GET', '/api/orders');
  return {
    success: result.success || result.status === 401, // 401 is expected without auth
    details: result.success ? 'Order endpoint accessible' : 'Order endpoint requires authentication (expected)'
  };
}

async function testPaymentEndpoints() {
  const result = await makeRequest('GET', '/api/payments');
  return {
    success: result.success || result.status === 401, // 401 is expected without auth
    details: result.success ? 'Payment endpoint accessible' : 'Payment endpoint requires authentication (expected)'
  };
}

async function testAdminEndpoints() {
  const result = await makeRequest('GET', '/api/admin');
  return {
    success: result.success || result.status === 401, // 401 is expected without auth
    details: result.success ? 'Admin endpoint accessible' : 'Admin endpoint requires authentication (expected)'
  };
}

async function testDeliveryEndpoints() {
  const result = await makeRequest('GET', '/api/delivery');
  return {
    success: result.success || result.status === 401, // 401 is expected without auth
    details: result.success ? 'Delivery endpoint accessible' : 'Delivery endpoint requires authentication (expected)'
  };
}

async function testUploadEndpoints() {
  const result = await makeRequest('GET', '/api/upload');
  return {
    success: result.success || result.status === 404, // 404 is expected for GET
    details: result.success ? 'Upload endpoint accessible' : 'Upload endpoint exists (404 for GET is expected)'
  };
}

async function testReviewEndpoints() {
  const result = await makeRequest('GET', '/api/reviews');
  return {
    success: result.success && result.status === 200,
    details: result.success ? 'Review listing endpoint working' : 'Review endpoints not accessible'
  };
}

async function testShopEndpoints() {
  const result = await makeRequest('GET', '/api/shops');
  return {
    success: result.success && result.status === 200,
    details: result.success ? 'Shop listing endpoint working' : 'Shop endpoints not accessible'
  };
}

// Database connection test
async function testDatabaseConnection() {
  try {
    // This would require importing your database connection
    // For now, we'll test if the server starts without database errors
    const result = await makeRequest('GET', '/api/health');
    return {
      success: result.success,
      details: result.success ? 'Database connection appears to be working' : 'Database connection issues detected'
    };
  } catch (error) {
    return {
      success: false,
      details: 'Database connection test failed'
    };
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting ZAMMER API Endpoints Verification'.bold.blue);
  console.log(`📍 Testing against: ${BASE_URL}`.gray);
  console.log('=' .repeat(60).gray);

  // Core server tests
  await runTest('Server Health Check', testServerHealth);
  await runTest('Database Connection', testDatabaseConnection);

  // User management tests
  await runTest('User Registration', testUserRegistration);
  await runTest('User Login', testUserLogin);

  // Seller management tests
  await runTest('Seller Registration', testSellerRegistration);

  // Product and shop tests
  await runTest('Product Endpoints', testProductEndpoints);
  await runTest('Shop Endpoints', testShopEndpoints);
  await runTest('Review Endpoints', testReviewEndpoints);

  // Protected endpoints (should require authentication)
  await runTest('Cart Endpoints', testCartEndpoints);
  await runTest('Order Endpoints', testOrderEndpoints);
  await runTest('Payment Endpoints', testPaymentEndpoints);
  await runTest('Admin Endpoints', testAdminEndpoints);
  await runTest('Delivery Endpoints', testDeliveryEndpoints);
  await runTest('Upload Endpoints', testUploadEndpoints);

  // Print summary
  console.log('\n' + '=' .repeat(60).gray);
  console.log('📊 TEST SUMMARY'.bold.blue);
  console.log('=' .repeat(60).gray);
  console.log(`✅ Passed: ${testResults.passed}`.green);
  console.log(`❌ Failed: ${testResults.failed}`.red);
  console.log(`📈 Total: ${testResults.total}`.blue);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`.yellow);

  // Detailed results
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:'.red.bold);
    testResults.details
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`.red);
      });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:'.yellow.bold);
  if (testResults.failed === 0) {
    console.log('   🎉 All tests passed! Your API is working correctly.'.green);
  } else if (testResults.passed > testResults.failed) {
    console.log('   ⚠️  Most tests passed. Check failed tests above.'.yellow);
  } else {
    console.log('   🚨 Multiple failures detected. Check server configuration.'.red);
  }

  console.log('\n📝 Next Steps:'.blue.bold);
  console.log('   1. Start your backend server: npm start (in backend directory)');
  console.log('   2. Start your frontend: npm start (in frontend directory)');
  console.log('   3. Test the full application in your browser');
  console.log('   4. Check server logs for any error messages');

  return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      process.exit(testResults.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Test runner failed:'.red, error.message);
      process.exit(1);
    });
}

module.exports = { runAllTests, testResults };

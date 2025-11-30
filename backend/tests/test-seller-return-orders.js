/**
 * Test Script: Seller Return Orders Endpoint
 * Tests: GET /api/returns/seller/dashboard
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
let sellerToken = '';

// Test data
const testSeller = {
  email: 'seller@example.com',
  password: 'sellerpassword123'
};

async function testSellerReturnOrders() {
  console.log('\n🧪 ============================================');
  console.log('TEST 2: Seller Return Orders Endpoint');
  console.log('============================================\n');

  try {
    // Step 1: Login as seller
    console.log('📝 Step 1: Logging in as seller...');
    const loginResponse = await axios.post(`${BASE_URL}/sellers/login`, {
      email: testSeller.email,
      password: testSeller.password
    });

    if (loginResponse.data.success && loginResponse.data.data.token) {
      sellerToken = loginResponse.data.data.token;
      console.log('✅ Seller login successful');
    } else {
      console.log('❌ Seller login failed');
      console.log('Response:', loginResponse.data);
      return;
    }

    // Step 2: Test without authentication (should fail)
    console.log('\n📝 Step 2: Testing endpoint WITHOUT authentication...');
    try {
      const response = await axios.get(`${BASE_URL}/returns/seller/dashboard`);
      console.log('❌ TEST FAILED: Should require authentication');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected - 401 Unauthorized');
      } else {
        console.log('✅ Request rejected (expected)');
      }
    }

    // Step 3: Test with authentication
    console.log('\n📝 Step 3: Testing endpoint WITH seller authentication...');
    const response = await axios.get(`${BASE_URL}/returns/seller/dashboard`, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });

    if (response.data.success) {
      console.log('✅ Successfully retrieved seller return orders');
      console.log(`📊 Found ${response.data.data.length} return orders`);
      console.log('\nSample order:', JSON.stringify(response.data.data[0], null, 2));
    } else {
      console.log('❌ Request failed');
      console.log('Response:', response.data);
    }

    // Step 4: Test with status filter
    console.log('\n📝 Step 4: Testing with status filter (approved)...');
    const filteredResponse = await axios.get(
      `${BASE_URL}/returns/seller/dashboard?status=approved`,
      { headers: { Authorization: `Bearer ${sellerToken}` } }
    );

    if (filteredResponse.data.success) {
      console.log(`✅ Filtered results: ${filteredResponse.data.data.length} orders`);
    }

    console.log('\n✅ Test 2 Complete\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

module.exports = testSellerReturnOrders;

if (require.main === module) {
  testSellerReturnOrders()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}


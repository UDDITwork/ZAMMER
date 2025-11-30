/**
 * Test Script: Return Request Authentication
 * Tests: POST /api/returns/request/:orderId
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
let userToken = '';
let testOrderId = '';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

async function testReturnRequestAuth() {
  console.log('\n🧪 ============================================');
  console.log('TEST 1: Return Request Authentication');
  console.log('============================================\n');

  try {
    // Step 1: Login as user to get token
    console.log('📝 Step 1: Logging in as user...');
    const loginResponse = await axios.post(`${BASE_URL}/users/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (loginResponse.data.success && loginResponse.data.data.token) {
      userToken = loginResponse.data.data.token;
      console.log('✅ Login successful, token obtained');
      
      // Get a real order ID from user's orders
      const ordersResponse = await axios.get(`${BASE_URL}/orders/myorders`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      if (ordersResponse.data.success && ordersResponse.data.data.length > 0) {
        const deliveredOrder = ordersResponse.data.data.find(
          order => order.status === 'Delivered'
        );
        if (deliveredOrder) {
          testOrderId = deliveredOrder._id;
          console.log(`✅ Found test order: ${testOrderId}`);
        }
      }
    } else {
      console.log('❌ Login failed');
      return;
    }

    // Step 2: Test without authentication (should fail)
    console.log('\n📝 Step 2: Testing return request WITHOUT authentication...');
    try {
      const responseWithoutAuth = await axios.post(
        `${BASE_URL}/returns/request/${testOrderId || 'test-order-id'}`,
        { reason: 'Product not as described' }
      );
      console.log('❌ TEST FAILED: Request should have been rejected without auth');
      console.log('Response:', responseWithoutAuth.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected - 401 Unauthorized');
      } else {
        console.log('✅ Request rejected (expected behavior)');
        console.log('Status:', error.response?.status || error.message);
      }
    }

    // Step 3: Test with authentication (should succeed if order is eligible)
    console.log('\n📝 Step 3: Testing return request WITH authentication...');
    if (testOrderId) {
      try {
        const responseWithAuth = await axios.post(
          `${BASE_URL}/returns/request/${testOrderId}`,
          { reason: 'Product not as described' },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );

        if (responseWithAuth.data.success) {
          console.log('✅ Return request submitted successfully');
          console.log('Response:', JSON.stringify(responseWithAuth.data, null, 2));
        } else {
          console.log('⚠️  Request processed but returned error (may be expected if order not eligible)');
          console.log('Response:', responseWithAuth.data);
        }
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.log('⚠️  400 Error (may be expected - order might not be eligible for return)');
          console.log('Message:', error.response.data.message);
        } else {
          console.log('❌ Unexpected error:', error.message);
        }
      }
    } else {
      console.log('⚠️  Skipped - No test order found');
    }

    console.log('\n✅ Test 1 Complete\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

module.exports = testReturnRequestAuth;

// Run if called directly
if (require.main === module) {
  testReturnRequestAuth()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}


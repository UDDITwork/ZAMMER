// test-order-id-verification.js - Test Order ID Verification in Delivery Agent System
// This script tests the complete order ID verification flow for delivery agent pickups

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Test data
let testData = {
  deliveryAgent: null,
  order: null,
  token: null
};

// Helper function to make authenticated requests
const makeRequest = async (method, url, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || error.message,
      status: error.response?.status || 500,
      code: error.response?.data?.code || 'UNKNOWN_ERROR'
    };
  }
};

// Test 1: Create a test delivery agent
const createTestDeliveryAgent = async () => {
  console.log('\n🧪 TEST 1: Creating test delivery agent...');
  
  const agentData = {
    name: 'Test Delivery Agent',
    email: `test.agent.${Date.now()}@example.com`,
    mobileNumber: `9999${Date.now().toString().slice(-6)}`,
    phoneNumber: `9999${Date.now().toString().slice(-6)}`,
    password: 'TestPassword123!',
    vehicleDetails: {
      type: 'bike',
      number: `TN${Date.now().toString().slice(-6)}`,
      model: 'Test Bike'
    },
    workingAreas: ['Chennai'],
    address: 'Test Address, Chennai'
  };

  const result = await makeRequest('POST', '/delivery/register', agentData);
  
  if (result.success) {
    testData.deliveryAgent = result.data.data;
    testData.token = result.data.data.token;
    console.log('✅ Test delivery agent created successfully');
    console.log(`   Agent ID: ${testData.deliveryAgent._id}`);
    console.log(`   Email: ${testData.deliveryAgent.email}`);
    return true;
  } else {
    console.log('❌ Failed to create test delivery agent:', result.message);
    return false;
  }
};

// Test 2: Create a test order
const createTestOrder = async () => {
  console.log('\n🧪 TEST 2: Creating test order...');
  
  // First, we need to create a test user and seller
  const userData = {
    name: 'Test Customer',
    email: `test.customer.${Date.now()}@example.com`,
    phone: `9999${Date.now().toString().slice(-6)}`,
    password: 'TestPassword123!'
  };

  const sellerData = {
    firstName: 'Test Seller',
    lastName: 'Store',
    email: `test.seller.${Date.now()}@example.com`,
    phone: `9999${Date.now().toString().slice(-6)}`,
    password: 'TestPassword123!',
    shop: {
      name: 'Test Store',
      address: 'Test Shop Address, Chennai'
    }
  };

  // Create user
  const userResult = await makeRequest('POST', '/auth/register', userData);
  if (!userResult.success) {
    console.log('❌ Failed to create test user:', userResult.message);
    return false;
  }

  // Create seller
  const sellerResult = await makeRequest('POST', '/auth/seller-register', sellerData);
  if (!sellerResult.success) {
    console.log('❌ Failed to create test seller:', sellerResult.message);
    return false;
  }

  // Create order
  const orderData = {
    items: [
      {
        product: '507f1f77bcf86cd799439011', // Use a valid product ID or create one
        quantity: 2,
        price: 500
      }
    ],
    deliveryAddress: {
      address: 'Test Delivery Address',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
      phone: userData.phone
    },
    paymentMethod: 'cod',
    totalAmount: 1000,
    sellerId: sellerResult.data.data._id
  };

  const orderResult = await makeRequest('POST', '/orders', orderData, userResult.data.token);
  
  if (orderResult.success) {
    testData.order = orderResult.data.data;
    console.log('✅ Test order created successfully');
    console.log(`   Order ID: ${testData.order._id}`);
    console.log(`   Order Number: ${testData.order.orderNumber}`);
    return true;
  } else {
    console.log('❌ Failed to create test order:', orderResult.message);
    return false;
  }
};

// Test 3: Assign order to delivery agent
const assignOrderToAgent = async () => {
  console.log('\n🧪 TEST 3: Assigning order to delivery agent...');
  
  const assignmentData = {
    orderId: testData.order._id,
    deliveryAgentId: testData.deliveryAgent._id,
    deliveryFee: 50
  };

  // This would typically be done by admin, so we'll simulate it
  // For testing purposes, we'll directly update the order
  const updateResult = await makeRequest('PUT', `/orders/${testData.order._id}/assign-delivery`, assignmentData);
  
  if (updateResult.success) {
    console.log('✅ Order assigned to delivery agent successfully');
    return true;
  } else {
    console.log('❌ Failed to assign order to delivery agent:', updateResult.message);
    return false;
  }
};

// Test 4: Test pickup with correct order ID
const testPickupWithCorrectOrderId = async () => {
  console.log('\n🧪 TEST 4: Testing pickup with CORRECT order ID...');
  
  const pickupData = {
    orderIdVerification: testData.order.orderNumber, // Correct order number
    pickupNotes: 'Test pickup with correct order ID'
  };

  const result = await makeRequest('PUT', `/delivery/orders/${testData.order._id}/pickup`, pickupData, testData.token);
  
  if (result.success) {
    console.log('✅ Pickup completed successfully with correct order ID');
    console.log(`   Status: ${result.data.data.status}`);
    console.log(`   Delivery Status: ${result.data.data.deliveryStatus}`);
    return true;
  } else {
    console.log('❌ Pickup failed with correct order ID:', result.message);
    console.log(`   Code: ${result.code}`);
    return false;
  }
};

// Test 5: Test pickup with incorrect order ID (should fail)
const testPickupWithIncorrectOrderId = async () => {
  console.log('\n🧪 TEST 5: Testing pickup with INCORRECT order ID...');
  
  // First, let's create another order to test with wrong ID
  const wrongPickupData = {
    orderIdVerification: 'WRONG_ORDER_ID_12345',
    pickupNotes: 'Test pickup with wrong order ID'
  };

  const result = await makeRequest('PUT', `/delivery/orders/${testData.order._id}/pickup`, wrongPickupData, testData.token);
  
  if (!result.success && result.code === 'ORDER_ID_MISMATCH') {
    console.log('✅ Pickup correctly rejected with incorrect order ID');
    console.log(`   Error Code: ${result.code}`);
    console.log(`   Message: ${result.message}`);
    return true;
  } else {
    console.log('❌ Pickup should have failed with incorrect order ID but didn\'t');
    console.log(`   Result: ${JSON.stringify(result)}`);
    return false;
  }
};

// Test 6: Test pickup without order ID (should fail)
const testPickupWithoutOrderId = async () => {
  console.log('\n🧪 TEST 6: Testing pickup WITHOUT order ID...');
  
  const pickupData = {
    // orderIdVerification: missing
    pickupNotes: 'Test pickup without order ID'
  };

  const result = await makeRequest('PUT', `/delivery/orders/${testData.order._id}/pickup`, pickupData, testData.token);
  
  if (!result.success && result.code === 'MISSING_ORDER_ID_VERIFICATION') {
    console.log('✅ Pickup correctly rejected without order ID');
    console.log(`   Error Code: ${result.code}`);
    console.log(`   Message: ${result.message}`);
    return true;
  } else {
    console.log('❌ Pickup should have failed without order ID but didn\'t');
    console.log(`   Result: ${JSON.stringify(result)}`);
    return false;
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Order ID Verification Tests...');
  console.log('==========================================');

  let testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // Run all tests
  const tests = [
    { name: 'Create Test Delivery Agent', fn: createTestDeliveryAgent },
    { name: 'Create Test Order', fn: createTestOrder },
    { name: 'Assign Order to Agent', fn: assignOrderToAgent },
    { name: 'Pickup with Correct Order ID', fn: testPickupWithCorrectOrderId },
    { name: 'Pickup with Incorrect Order ID', fn: testPickupWithIncorrectOrderId },
    { name: 'Pickup without Order ID', fn: testPickupWithoutOrderId }
  ];

  for (const test of tests) {
    testResults.total++;
    try {
      const result = await test.fn();
      if (result) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    } catch (error) {
      console.log(`❌ Test "${test.name}" threw an error:`, error.message);
      testResults.failed++;
    }
  }

  // Print summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Order ID verification is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return testResults;
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };

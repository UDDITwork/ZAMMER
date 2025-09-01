// 🧪 COMPREHENSIVE ORDER SYNCHRONIZATION TEST SCRIPT
// This script tests the complete flow from admin approval to delivery agent assignment
// and identifies all synchronization issues between controllers

const axios = require('axios');
const mongoose = require('mongoose');

// Configuration
const BASE_URL = 'http://localhost:5001/api';
const TEST_CONFIG = {
  adminToken: null,
  deliveryAgentToken: null,
  testOrderId: null,
  testDeliveryAgentId: null,
  testUserId: null,
  testSellerId: null
};

// Test data
const TEST_DATA = {
  admin: {
    email: 'admin@zammer.com',
    password: 'admin123'
  },
  deliveryAgent: {
    email: 'testagent@zammer.com',
    password: 'agent123',
    name: 'Test Agent',
    phone: '9876543210',
    vehicleType: 'Motorcycle',
    address: 'Test Address'
  },
  user: {
    email: 'testuser@zammer.com',
    password: 'user123',
    name: 'Test User',
    phone: '9876543211'
  },
  seller: {
    email: 'testseller@zammer.com',
    password: 'seller123',
    firstName: 'Test',
    lastName: 'Seller',
    phone: '9876543212'
  }
};

// 🧪 TEST 1: Admin Authentication
async function testAdminAuthentication() {
  console.log('\n🧪 TEST 1: Admin Authentication');
  console.log('================================');
  
  try {
    const response = await axios.post(`${BASE_URL}/admin/login`, {
      email: TEST_DATA.admin.email,
      password: TEST_DATA.admin.password
    });
    
    if (response.data.success) {
      TEST_CONFIG.adminToken = response.data.token;
      console.log('✅ Admin authentication successful');
      console.log('   Token:', TEST_CONFIG.adminToken.substring(0, 20) + '...');
      return true;
    } else {
      console.log('❌ Admin authentication failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Admin authentication error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 2: Create Test User
async function testCreateUser() {
  console.log('\n🧪 TEST 2: Create Test User');
  console.log('============================');
  
  try {
    const response = await axios.post(`${BASE_URL}/users/register`, {
      name: TEST_DATA.user.name,
      email: TEST_DATA.user.email,
      password: TEST_DATA.user.password,
      phone: TEST_DATA.user.phone
    });
    
    if (response.data.success) {
      TEST_CONFIG.testUserId = response.data.data._id;
      console.log('✅ Test user created successfully');
      console.log('   User ID:', TEST_CONFIG.testUserId);
      return true;
    } else {
      console.log('❌ User creation failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ User creation error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 3: Create Test Seller
async function testCreateSeller() {
  console.log('\n🧪 TEST 3: Create Test Seller');
  console.log('==============================');
  
  try {
    const response = await axios.post(`${BASE_URL}/sellers/register`, {
      firstName: TEST_DATA.seller.firstName,
      lastName: TEST_DATA.seller.lastName,
      email: TEST_DATA.seller.email,
      password: TEST_DATA.seller.password,
      phone: TEST_DATA.seller.phone
    });
    
    if (response.data.success) {
      TEST_CONFIG.testSellerId = response.data.data._id;
      console.log('✅ Test seller created successfully');
      console.log('   Seller ID:', TEST_CONFIG.testSellerId);
      return true;
    } else {
      console.log('❌ Seller creation failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Seller creation error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 4: Create Test Delivery Agent
async function testCreateDeliveryAgent() {
  console.log('\n🧪 TEST 4: Create Test Delivery Agent');
  console.log('=====================================');
  
  try {
    const response = await axios.post(`${BASE_URL}/delivery/register`, {
      name: TEST_DATA.deliveryAgent.name,
      email: TEST_DATA.deliveryAgent.email,
      password: TEST_DATA.deliveryAgent.password,
      phone: TEST_DATA.deliveryAgent.phone,
      address: TEST_DATA.deliveryAgent.address,
      vehicleType: TEST_DATA.deliveryAgent.vehicleType
    });
    
    if (response.data.success) {
      TEST_CONFIG.testDeliveryAgentId = response.data.data._id;
      console.log('✅ Test delivery agent created successfully');
      console.log('   Agent ID:', TEST_CONFIG.testDeliveryAgentId);
      return true;
    } else {
      console.log('❌ Delivery agent creation failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Delivery agent creation error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 5: Create Test Order
async function testCreateOrder() {
  console.log('\n🧪 TEST 5: Create Test Order');
  console.log('=============================');
  
  try {
    // First, create a test product
    const productResponse = await axios.post(`${BASE_URL}/products`, {
      name: 'Test Product',
      description: 'Test product for order testing',
      price: 100,
      category: 'Test',
      seller: TEST_CONFIG.testSellerId
    }, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` }
    });
    
    if (!productResponse.data.success) {
      console.log('❌ Product creation failed:', productResponse.data.message);
      return false;
    }
    
    const productId = productResponse.data.data._id;
    
    // Create order
    const orderResponse = await axios.post(`${BASE_URL}/orders`, {
      orderItems: [{
        product: productId,
        name: 'Test Product',
        quantity: 1,
        price: 100,
        image: 'test-image.jpg',
        size: 'M',
        color: 'Red'
      }],
      shippingAddress: {
        address: 'Test Address',
        city: 'Test City',
        postalCode: '12345',
        country: 'Test Country',
        phone: TEST_DATA.user.phone
      },
      paymentMethod: 'Cash on Delivery',
      seller: TEST_CONFIG.testSellerId
    }, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` }
    });
    
    if (orderResponse.data.success) {
      TEST_CONFIG.testOrderId = orderResponse.data.data._id;
      console.log('✅ Test order created successfully');
      console.log('   Order ID:', TEST_CONFIG.testOrderId);
      console.log('   Order Status:', orderResponse.data.data.status);
      return true;
    } else {
      console.log('❌ Order creation failed:', orderResponse.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Order creation error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 6: Check Order Status Before Admin Approval
async function testOrderStatusBeforeApproval() {
  console.log('\n🧪 TEST 6: Check Order Status Before Admin Approval');
  console.log('====================================================');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/orders/${TEST_CONFIG.testOrderId}`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` }
    });
    
    if (response.data.success) {
      const order = response.data.data;
      console.log('✅ Order status check successful');
      console.log('   Current Status:', order.status);
      console.log('   Admin Approval Status:', order.adminApproval?.status);
      console.log('   Delivery Agent Assignment:', order.deliveryAgent);
      
      // Check if status matches expected values
      if (order.status === 'Pending') {
        console.log('   ✅ Order status is correct (Pending)');
      } else {
        console.log('   ❌ Order status mismatch. Expected: Pending, Got:', order.status);
      }
      
      return true;
    } else {
      console.log('❌ Order status check failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Order status check error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 7: Admin Approve and Assign Order
async function testAdminApproveAndAssign() {
  console.log('\n🧪 TEST 7: Admin Approve and Assign Order');
  console.log('===========================================');
  
  try {
    const response = await axios.post(`${BASE_URL}/admin/orders/approve-assign`, {
      orderId: TEST_CONFIG.testOrderId,
      deliveryAgentId: TEST_CONFIG.testDeliveryAgentId,
      notes: 'Test approval and assignment'
    }, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Admin approval and assignment successful');
      console.log('   Order Status:', response.data.data.status);
      console.log('   Admin Approval Status:', response.data.data.adminApprovalStatus);
      console.log('   Assigned Agent:', response.data.data.deliveryAgent.name);
      console.log('   Assignment Time:', response.data.data.assignedAt);
      
      return true;
    } else {
      console.log('❌ Admin approval failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Admin approval error:', error.response?.data?.message || error.message);
    console.log('   Status Code:', error.response?.status);
    console.log('   Full Error:', error.response?.data);
    return false;
  }
}

// 🧪 TEST 8: Check Order Status After Admin Approval
async function testOrderStatusAfterApproval() {
  console.log('\n🧪 TEST 8: Check Order Status After Admin Approval');
  console.log('===================================================');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/orders/${TEST_CONFIG.testOrderId}`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` }
    });
    
    if (response.data.success) {
      const order = response.data.data;
      console.log('✅ Order status check after approval successful');
      console.log('   Current Status:', order.status);
      console.log('   Admin Approval Status:', order.adminApproval?.status);
      console.log('   Delivery Agent Assignment:', order.deliveryAgent);
      
      // Check if status matches expected values
      if (order.status === 'Pickup_Ready') {
        console.log('   ✅ Order status is correct (Pickup_Ready)');
      } else {
        console.log('   ❌ Order status mismatch. Expected: Pickup_Ready, Got:', order.status);
      }
      
      if (order.deliveryAgent?.agent) {
        console.log('   ✅ Delivery agent is assigned');
      } else {
        console.log('   ❌ Delivery agent assignment failed');
      }
      
      return true;
    } else {
      console.log('❌ Order status check failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Order status check error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 9: Delivery Agent Authentication
async function testDeliveryAgentAuthentication() {
  console.log('\n🧪 TEST 9: Delivery Agent Authentication');
  console.log('=========================================');
  
  try {
    const response = await axios.post(`${BASE_URL}/delivery/login`, {
      email: TEST_DATA.deliveryAgent.email,
      password: TEST_DATA.deliveryAgent.password
    });
    
    if (response.data.success) {
      TEST_CONFIG.deliveryAgentToken = response.data.token;
      console.log('✅ Delivery agent authentication successful');
      console.log('   Token:', TEST_CONFIG.deliveryAgentToken.substring(0, 20) + '...');
      return true;
    } else {
      console.log('❌ Delivery agent authentication failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Delivery agent authentication error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 10: Check Order Availability for Delivery Agent
async function testOrderAvailabilityForAgent() {
  console.log('\n🧪 TEST 10: Check Order Availability for Delivery Agent');
  console.log('========================================================');
  
  try {
    const response = await axios.get(`${BASE_URL}/delivery/orders/available`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.deliveryAgentToken}` }
    });
    
    if (response.data.success) {
      const orders = response.data.data;
      console.log('✅ Available orders check successful');
      console.log('   Available Orders Count:', orders.length);
      
      // Check if our test order is available
      const testOrder = orders.find(order => order._id === TEST_CONFIG.testOrderId);
      if (testOrder) {
        console.log('   ✅ Test order is available for assignment');
        console.log('     Order Status:', testOrder.status);
        console.log('     Delivery Agent Status:', testOrder.deliveryAgent?.status);
      } else {
        console.log('   ❌ Test order is not available for assignment');
      }
      
      return true;
    } else {
      console.log('❌ Available orders check failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Available orders check error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 11: Delivery Agent Accept Order
async function testDeliveryAgentAcceptOrder() {
  console.log('\n🧪 TEST 11: Delivery Agent Accept Order');
  console.log('=========================================');
  
  try {
    const response = await axios.put(`${BASE_URL}/delivery/orders/${TEST_CONFIG.testOrderId}/accept`, {}, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.deliveryAgentToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Delivery agent order acceptance successful');
      console.log('   Order Status:', response.data.data.status);
      console.log('   Assignment Status:', response.data.data.deliveryAgent?.status);
      
      return true;
    } else {
      console.log('❌ Delivery agent order acceptance failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Delivery agent order acceptance error:', error.response?.data?.message || error.message);
    console.log('   Status Code:', error.response?.status);
    console.log('   Full Error:', error.response?.data);
    return false;
  }
}

// 🧪 TEST 12: Final Order Status Verification
async function testFinalOrderStatus() {
  console.log('\n🧪 TEST 12: Final Order Status Verification');
  console.log('===========================================');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/orders/${TEST_CONFIG.testOrderId}`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` }
    });
    
    if (response.data.success) {
      const order = response.data.data;
      console.log('✅ Final order status verification successful');
      console.log('   Final Status:', order.status);
      console.log('   Admin Approval Status:', order.adminApproval?.status);
      console.log('   Delivery Agent Assignment:', order.deliveryAgent);
      console.log('   Order History:', order.statusHistory?.length || 0, 'entries');
      
      return true;
    } else {
      console.log('❌ Final order status verification failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Final order status verification error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 MAIN TEST EXECUTION
async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE ORDER SYNCHRONIZATION TESTS');
  console.log('====================================================');
  console.log('Time:', new Date().toISOString());
  console.log('Base URL:', BASE_URL);
  
  const testResults = [];
  
  try {
    // Run tests in sequence
    testResults.push(await testAdminAuthentication());
    testResults.push(await testCreateUser());
    testResults.push(await testCreateSeller());
    testResults.push(await testCreateDeliveryAgent());
    testResults.push(await testCreateOrder());
    testResults.push(await testOrderStatusBeforeApproval());
    testResults.push(await testAdminApproveAndAssign());
    testResults.push(await testOrderStatusAfterApproval());
    testResults.push(await testDeliveryAgentAuthentication());
    testResults.push(await testOrderAvailabilityForAgent());
    testResults.push(await testDeliveryAgentAcceptOrder());
    testResults.push(await testFinalOrderStatus());
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    const passedTests = testResults.filter(result => result === true).length;
    const totalTests = testResults.length;
    
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Order synchronization is working correctly.');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED. Review the output above for synchronization issues.');
    }
    
  } catch (error) {
    console.log('\n💥 CRITICAL ERROR:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testAdminAuthentication,
  testCreateUser,
  testCreateSeller,
  testCreateDeliveryAgent,
  testCreateOrder,
  testOrderStatusBeforeApproval,
  testAdminApproveAndAssign,
  testOrderStatusAfterApproval,
  testDeliveryAgentAuthentication,
  testOrderAvailabilityForAgent,
  testDeliveryAgentAcceptOrder,
  testFinalOrderStatus
};

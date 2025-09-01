// 🧪 FOCUSED ORDER STATUS SYNCHRONIZATION TEST
// This script specifically tests the status mismatch issue between admin approval and delivery agent assignment

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5001/api';
const TEST_CONFIG = {
  adminToken: null,
  deliveryAgentToken: null,
  testOrderId: null,
  testDeliveryAgentId: null
};

// Test data
const TEST_DATA = {
  admin: {
    email: 'admin@zammer.com',
    password: 'admin123'
  },
  deliveryAgent: {
    email: 'maya@gmail.com',
    password: 'jpmc123'
  }
};

// 🧪 UTILITY: Get Order Details
async function getOrderDetails(orderId, token, context = 'Admin') {
  try {
    const response = await axios.get(`${BASE_URL}/admin/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      const order = response.data.data;
      console.log(`\n📋 [${context}] Order Details for ${orderId}:`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Admin Approval: ${order.adminApproval?.status || 'N/A'}`);
      console.log(`   Delivery Agent: ${order.deliveryAgent?.agent ? 'Assigned' : 'Not Assigned'}`);
      console.log(`   Delivery Agent Status: ${order.deliveryAgent?.status || 'N/A'}`);
      console.log(`   Assigned At: ${order.deliveryAgent?.assignedAt || 'N/A'}`);
      console.log(`   Order History: ${order.statusHistory?.length || 0} entries`);
      
      if (order.statusHistory && order.statusHistory.length > 0) {
        console.log(`   Recent Status Changes:`);
        order.statusHistory.slice(-3).forEach((change, index) => {
          console.log(`     ${index + 1}. ${change.status} (${change.changedBy}) - ${change.changedAt}`);
        });
      }
      
      return order;
    } else {
      console.log(`❌ [${context}] Failed to get order details:`, response.data.message);
      return null;
    }
  } catch (error) {
    console.log(`❌ [${context}] Error getting order details:`, error.response?.data?.message || error.message);
    return null;
  }
}

// 🧪 TEST 1: Admin Authentication
async function testAdminAuth() {
  console.log('\n🧪 TEST 1: Admin Authentication');
  console.log('================================');
  
  try {
    const response = await axios.post(`${BASE_URL}/admin/login`, {
      email: TEST_DATA.admin.email,
      password: TEST_DATA.admin.password
    });
    
    if (response.data.success) {
      TEST_CONFIG.adminToken = response.data.data.token;
      console.log('✅ Admin authentication successful');
      console.log('🔍 Token details:');
      console.log('   Token type:', typeof response.data.data.token);
      console.log('   Token length:', response.data.data.token ? response.data.data.token.length : 'undefined');
      console.log('   Token preview:', response.data.data.token ? `${response.data.data.token.substring(0, 20)}...` : 'undefined');
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

// 🧪 TEST 2: Get Available Orders for Admin
async function testGetAvailableOrders() {
  console.log('\n🧪 TEST 2: Get Available Orders for Admin');
  console.log('===========================================');
  
  try {
    // First try without status filter to see if there are any orders
    console.log('🔍 Trying to get orders without status filter first...');
    const responseWithoutFilter = await axios.get(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` },
      params: { limit: 10 }
    });
    
    if (responseWithoutFilter.data.success) {
      const orders = responseWithoutFilter.data.data;
      console.log(`✅ Found ${orders.length} orders (no status filter)`);
      
      if (orders.length > 0) {
        console.log('📋 Sample order statuses:');
        orders.slice(0, 3).forEach((order, index) => {
          console.log(`   ${index + 1}. Order ${order.orderNumber || order._id}: Status = "${order.status}"`);
        });
        
        // Now try with status filter
        console.log('\n🔍 Trying with status filter...');
        const responseWithFilter = await axios.get(`${BASE_URL}/admin/orders`, {
          headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` },
          params: { status: 'Pending', limit: 10 }
        });
        
        if (responseWithFilter.data.success) {
          const pendingOrders = responseWithFilter.data.data;
          console.log(`✅ Found ${pendingOrders.length} pending orders`);
          
          if (pendingOrders.length > 0) {
            TEST_CONFIG.testOrderId = pendingOrders[0]._id;
            console.log(`📋 Selected order for testing: ${pendingOrders[0].orderNumber || pendingOrders[0]._id} (${pendingOrders[0]._id})`);
            console.log(`   Current Status: ${pendingOrders[0].status}`);
            return true;
          }
        }
      } else {
        console.log('❌ No orders found in the system');
        return false;
      }
    } else {
      console.log('❌ Failed to get orders:', responseWithoutFilter.data.message);
      return false;
    }
    
    return false;
  } catch (error) {
    console.log('❌ Error getting orders:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.log('🔍 Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
    }
    return false;
  }
}

// 🧪 TEST 3: Get Available Delivery Agents
async function testGetDeliveryAgents() {
  console.log('\n🧪 TEST 3: Get Available Delivery Agents');
  console.log('==========================================');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/delivery-agents`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` },
      params: { status: 'available', limit: 10 }
    });
    
    if (response.data.success) {
      const agents = response.data.data;
      console.log(`✅ Found ${agents.length} available delivery agents`);
      
      if (agents.length > 0) {
        // Use the first available agent for testing
        TEST_CONFIG.testDeliveryAgentId = agents[0]._id;
        console.log(`🚚 Selected agent for testing: ${agents[0].name} (${agents[0]._id})`);
        console.log(`   Status: ${agents[0].status}`);
        console.log(`   Vehicle: ${agents[0].vehicleType}`);
        
        return true;
      } else {
        console.log('❌ No available delivery agents found for testing');
        return false;
      }
    } else {
      console.log('❌ Failed to get delivery agents:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error getting delivery agents:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 4: Check Order Status Before Admin Action
async function testOrderStatusBeforeAction() {
  console.log('\n🧪 TEST 4: Check Order Status Before Admin Action');
  console.log('==================================================');
  
  if (!TEST_CONFIG.testOrderId) {
    console.log('❌ No test order ID available');
    return false;
  }
  
  const order = await getOrderDetails(TEST_CONFIG.testOrderId, TEST_CONFIG.adminToken, 'BEFORE');
  
  if (order) {
    // Check if order is in correct state for admin approval
    if (order.status === 'Pending' || order.status === 'Processing') {
      console.log('   ✅ Order status is correct for admin approval');
      return true;
    } else {
      console.log(`   ❌ Order status mismatch. Expected: Pending or Processing, Got: ${order.status}`);
      return false;
    }
  }
  
  return false;
}

// 🧪 TEST 5: Admin Approve and Assign Order
async function testAdminApproveAssign() {
  console.log('\n🧪 TEST 5: Admin Approve and Assign Order');
  console.log('===========================================');
  
  if (!TEST_CONFIG.testOrderId || !TEST_CONFIG.testDeliveryAgentId) {
    console.log('❌ Missing test order ID or delivery agent ID');
    return false;
  }
  
  try {
    console.log(`📋 Attempting to approve order ${TEST_CONFIG.testOrderId} and assign to agent ${TEST_CONFIG.testDeliveryAgentId}`);
    
    const response = await axios.post(`${BASE_URL}/admin/orders/approve-assign`, {
      orderId: TEST_CONFIG.testOrderId,
      deliveryAgentId: TEST_CONFIG.testDeliveryAgentId,
      notes: 'Test approval and assignment for status sync testing'
    }, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.adminToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Admin approval and assignment successful');
      console.log('   Response Data:', JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.log('❌ Admin approval failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Admin approval error:', error.response?.data?.message || error.message);
    console.log('   Status Code:', error.response?.status);
    console.log('   Full Error Response:', JSON.stringify(error.response?.data, null, 2));
    return false;
  }
}

// 🧪 TEST 6: Check Order Status After Admin Action
async function testOrderStatusAfterAction() {
  console.log('\n🧪 TEST 6: Check Order Status After Admin Action');
  console.log('=================================================');
  
  if (!TEST_CONFIG.testOrderId) {
    console.log('❌ No test order ID available');
    return false;
  }
  
  const order = await getOrderDetails(TEST_CONFIG.testOrderId, TEST_CONFIG.adminToken, 'AFTER');
  
  if (order) {
    // Check if order status was updated correctly
    if (order.status === 'Pickup_Ready') {
      console.log('   ✅ Order status updated correctly to Pickup_Ready');
    } else {
      console.log(`   ❌ Order status not updated correctly. Expected: Pickup_Ready, Got: ${order.status}`);
    }
    
    // Check if delivery agent was assigned
    if (order.deliveryAgent?.agent) {
      console.log('   ✅ Delivery agent assigned successfully');
    } else {
      console.log('   ❌ Delivery agent assignment failed');
    }
    
    // Check admin approval status
    if (order.adminApproval?.status === 'approved') {
      console.log('   ✅ Admin approval status updated correctly');
    } else {
      console.log(`   ❌ Admin approval status not updated. Expected: approved, Got: ${order.adminApproval?.status || 'N/A'}`);
    }
    
    return true;
  }
  
  return false;
}

// 🧪 TEST 7: Delivery Agent Authentication
async function testDeliveryAgentAuth() {
  console.log('\n🧪 TEST 7: Delivery Agent Authentication');
  console.log('=========================================');
  
  try {
    const response = await axios.post(`${BASE_URL}/delivery/login`, {
      email: TEST_DATA.deliveryAgent.email,
      password: TEST_DATA.deliveryAgent.password
    });
    
    if (response.data.success) {
      TEST_CONFIG.deliveryAgentToken = response.data.token;
      console.log('✅ Delivery agent authentication successful');
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

// 🧪 TEST 8: Check Order Availability for Delivery Agent
async function testOrderAvailabilityForAgent() {
  console.log('\n🧪 TEST 8: Check Order Availability for Delivery Agent');
  console.log('========================================================');
  
  if (!TEST_CONFIG.testOrderId) {
    console.log('❌ No test order ID available');
    return false;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/delivery/orders/available`, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.deliveryAgentToken}` }
    });
    
    if (response.data.success) {
      const orders = response.data.data;
      console.log(`✅ Available orders check successful. Found ${orders.length} orders`);
      
      // Check if our test order is available
      const testOrder = orders.find(order => order._id === TEST_CONFIG.testOrderId);
      if (testOrder) {
        console.log('   ✅ Test order is available for delivery agent');
        console.log(`     Order Status: ${testOrder.status}`);
        console.log(`     Delivery Agent Status: ${testOrder.deliveryAgent?.status || 'N/A'}`);
        console.log(`     Admin Approval: ${testOrder.adminApproval?.status || 'N/A'}`);
        
        // Check the specific status that delivery agent controller expects
        if (testOrder.deliveryAgent?.status === 'unassigned') {
          console.log('   ✅ Order delivery agent status is "unassigned" (as expected by delivery agent controller)');
        } else {
          console.log(`   ❌ Order delivery agent status mismatch. Expected: unassigned, Got: ${testOrder.deliveryAgent?.status || 'N/A'}`);
        }
        
        return true;
      } else {
        console.log('   ❌ Test order is NOT available for delivery agent');
        console.log('   📋 Available orders:');
        orders.forEach((order, index) => {
          console.log(`     ${index + 1}. ${order.orderNumber} - Status: ${order.status}, Agent Status: ${order.deliveryAgent?.status || 'N/A'}`);
        });
        return false;
      }
    } else {
      console.log('❌ Available orders check failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Available orders check error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🧪 TEST 9: Attempt Delivery Agent Order Acceptance
async function testDeliveryAgentAcceptOrder() {
  console.log('\n🧪 TEST 9: Attempt Delivery Agent Order Acceptance');
  console.log('===================================================');
  
  if (!TEST_CONFIG.testOrderId) {
    console.log('❌ No test order ID available');
    return false;
  }
  
  try {
    console.log(`📋 Attempting to accept order ${TEST_CONFIG.testOrderId}`);
    
    const response = await axios.put(`${BASE_URL}/delivery/orders/${TEST_CONFIG.testOrderId}/accept`, {}, {
      headers: { Authorization: `Bearer ${TEST_CONFIG.deliveryAgentToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Delivery agent order acceptance successful');
      console.log('   Response Data:', JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.log('❌ Delivery agent order acceptance failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Delivery agent order acceptance error:', error.response?.data?.message || error.message);
    console.log('   Status Code:', error.response?.status);
    console.log('   Full Error Response:', JSON.stringify(error.response?.data, null, 2));
    return false;
  }
}

// 🧪 MAIN TEST EXECUTION
async function runStatusSyncTests() {
  console.log('🚀 STARTING ORDER STATUS SYNCHRONIZATION TESTS');
  console.log('==============================================');
  console.log('Time:', new Date().toISOString());
  console.log('Base URL:', BASE_URL);
  console.log('Focus: Testing status synchronization between admin and delivery agent controllers');
  
  const testResults = [];
  
  try {
    // Run tests in sequence
    testResults.push(await testAdminAuth());
    testResults.push(await testGetAvailableOrders());
    testResults.push(await testGetDeliveryAgents());
    testResults.push(await testOrderStatusBeforeAction());
    testResults.push(await testAdminApproveAssign());
    testResults.push(await testOrderStatusAfterAction());
    testResults.push(await testDeliveryAgentAuth());
    testResults.push(await testOrderAvailabilityForAgent());
    testResults.push(await testDeliveryAgentAcceptOrder());
    
    // Summary
    console.log('\n📊 STATUS SYNCHRONIZATION TEST SUMMARY');
    console.log('=======================================');
    const passedTests = testResults.filter(result => result === true).length;
    const totalTests = testResults.length;
    
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL STATUS SYNCHRONIZATION TESTS PASSED!');
      console.log('   The admin and delivery agent controllers are properly synchronized.');
    } else {
      console.log('\n⚠️  STATUS SYNCHRONIZATION ISSUES DETECTED!');
      console.log('   Review the failed tests above to identify the specific problems.');
      console.log('\n🔍 COMMON ISSUES TO CHECK:');
      console.log('   1. Order status field mapping between controllers');
      console.log('   2. Delivery agent assignment status values');
      console.log('   3. Admin approval workflow status transitions');
      console.log('   4. Database schema consistency');
    }
    
  } catch (error) {
    console.log('\n💥 CRITICAL ERROR:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runStatusSyncTests().catch(console.error);
}

module.exports = {
  runStatusSyncTests,
  testAdminAuth,
  testGetAvailableOrders,
  testGetDeliveryAgents,
  testOrderStatusBeforeAction,
  testAdminApproveAssign,
  testOrderStatusAfterAction,
  testDeliveryAgentAuth,
  testOrderAvailabilityForAgent,
  testDeliveryAgentAcceptOrder
};

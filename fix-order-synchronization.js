// 🔧 ORDER SYNCHRONIZATION FIX SCRIPT
// This script fixes the status mismatch issues between admin and delivery agent controllers

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5001/api';
const FIX_CONFIG = {
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
    email: 'testagent@zammer.com',
    password: 'agent123'
  }
};

// 🔧 UTILITY: Get Order Details
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

// 🔧 STEP 1: Admin Authentication
async function authenticateAdmin() {
  console.log('\n🔧 STEP 1: Admin Authentication');
  console.log('================================');
  
  try {
    const response = await axios.post(`${BASE_URL}/admin/login`, {
      email: TEST_DATA.admin.email,
      password: TEST_DATA.admin.password
    });
    
    if (response.data.success) {
      FIX_CONFIG.adminToken = response.data.token;
      console.log('✅ Admin authentication successful');
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

// 🔧 STEP 2: Find Available Orders
async function findAvailableOrders() {
  console.log('\n🔧 STEP 2: Find Available Orders');
  console.log('==================================');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${FIX_CONFIG.adminToken}` },
      params: { status: 'Pending', limit: 10 }
    });
    
    if (response.data.success) {
      const orders = response.data.data;
      console.log(`✅ Found ${orders.length} pending orders`);
      
      if (orders.length > 0) {
        // Use the first pending order for testing
        FIX_CONFIG.testOrderId = orders[0]._id;
        console.log(`📋 Selected order for testing: ${orders[0].orderNumber} (${orders[0]._id})`);
        console.log(`   Current Status: ${orders[0].status}`);
        console.log(`   Admin Approval: ${orders[0].adminApproval?.status || 'N/A'}`);
        
        return true;
      } else {
        console.log('❌ No pending orders found for testing');
        return false;
      }
    } else {
      console.log('❌ Failed to get orders:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Error getting orders:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🔧 STEP 3: Find Available Delivery Agents
async function findAvailableDeliveryAgents() {
  console.log('\n🔧 STEP 3: Find Available Delivery Agents');
  console.log('==========================================');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/delivery-agents`, {
      headers: { Authorization: `Bearer ${FIX_CONFIG.adminToken}` },
      params: { status: 'available', limit: 10 }
    });
    
    if (response.data.success) {
      const agents = response.data.data;
      console.log(`✅ Found ${agents.length} available delivery agents`);
      
      if (agents.length > 0) {
        // Use the first available agent for testing
        FIX_CONFIG.testDeliveryAgentId = agents[0]._id;
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

// 🔧 STEP 4: Check Current Order Status
async function checkCurrentOrderStatus() {
  console.log('\n🔧 STEP 4: Check Current Order Status');
  console.log('=======================================');
  
  if (!FIX_CONFIG.testOrderId) {
    console.log('❌ No test order ID available');
    return false;
  }
  
  const order = await getOrderDetails(FIX_CONFIG.testOrderId, FIX_CONFIG.adminToken, 'CURRENT');
  
  if (order) {
    console.log('\n🔍 STATUS ANALYSIS:');
    console.log(`   Order Status: ${order.status}`);
    console.log(`   Admin Approval Status: ${order.adminApproval?.status || 'N/A'}`);
    console.log(`   Delivery Agent Assignment: ${order.deliveryAgent?.agent ? 'Yes' : 'No'}`);
    console.log(`   Delivery Agent Status: ${order.deliveryAgent?.status || 'N/A'}`);
    
    // Check if order is ready for admin approval
    if (order.status === 'Pending' || order.status === 'Processing') {
      console.log('   ✅ Order is in correct state for admin approval');
      return true;
    } else {
      console.log(`   ❌ Order is NOT in correct state for admin approval`);
      console.log(`      Expected: Pending or Processing, Got: ${order.status}`);
      return false;
    }
  }
  
  return false;
}

// 🔧 STEP 5: Attempt Admin Approval and Assignment
async function attemptAdminApproval() {
  console.log('\n🔧 STEP 5: Attempt Admin Approval and Assignment');
  console.log('=================================================');
  
  if (!FIX_CONFIG.testOrderId || !FIX_CONFIG.testDeliveryAgentId) {
    console.log('❌ Missing test order ID or delivery agent ID');
    return false;
  }
  
  try {
    console.log(`📋 Attempting to approve order ${FIX_CONFIG.testOrderId} and assign to agent ${FIX_CONFIG.testDeliveryAgentId}`);
    
    const response = await axios.post(`${BASE_URL}/admin/orders/approve-assign`, {
      orderId: FIX_CONFIG.testOrderId,
      deliveryAgentId: FIX_CONFIG.testDeliveryAgentId,
      notes: 'Fix script: Testing order approval and assignment'
    }, {
      headers: { Authorization: `Bearer ${FIX_CONFIG.adminToken}` }
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
    
    // Analyze the specific error
    if (error.response?.status === 400) {
      console.log('\n🔍 ERROR ANALYSIS:');
      console.log('   This is a 400 Bad Request error, which means:');
      console.log('   1. Order status validation failed');
      console.log('   2. Order is already assigned');
      console.log('   3. Delivery agent is not available');
      console.log('   4. Required fields are missing');
      
      // Check the specific error message
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.includes('cannot be assigned in current status')) {
        console.log('\n🎯 SPECIFIC ISSUE IDENTIFIED:');
        console.log('   Order status validation failed in admin controller');
        console.log('   The order is not in the expected state for assignment');
        
        // Get current order status to understand the issue
        const currentOrder = await getOrderDetails(FIX_CONFIG.testOrderId, FIX_CONFIG.adminToken, 'ERROR_ANALYSIS');
        if (currentOrder) {
          console.log('\n📊 CURRENT ORDER STATE:');
          console.log(`   Status: ${currentOrder.status}`);
          console.log(`   Expected: Pending or Processing`);
          console.log(`   Admin Approval: ${currentOrder.adminApproval?.status || 'N/A'}`);
          console.log(`   Delivery Agent: ${currentOrder.deliveryAgent?.agent ? 'Assigned' : 'Not Assigned'}`);
          
          // Provide specific fix recommendations
          console.log('\n🔧 RECOMMENDED FIXES:');
          if (currentOrder.status !== 'Pending' && currentOrder.status !== 'Processing') {
            console.log('   1. Order status needs to be reset to "Pending"');
            console.log('   2. Check if order was already processed by another admin');
            console.log('   3. Verify order creation workflow');
          }
          
          if (currentOrder.deliveryAgent?.agent) {
            console.log('   4. Order is already assigned to a delivery agent');
            console.log('   5. Check if this is a duplicate assignment attempt');
          }
          
          if (currentOrder.adminApproval?.status === 'approved') {
            console.log('   6. Order is already approved by admin');
            console.log('   7. Check if this is a duplicate approval attempt');
          }
        }
      }
    }
    
    return false;
  }
}

// 🔧 STEP 6: Verify Order Status After Approval
async function verifyOrderStatusAfterApproval() {
  console.log('\n🔧 STEP 6: Verify Order Status After Approval');
  console.log('===============================================');
  
  if (!FIX_CONFIG.testOrderId) {
    console.log('❌ No test order ID available');
    return false;
  }
  
  const order = await getOrderDetails(FIX_CONFIG.testOrderId, FIX_CONFIG.adminToken, 'VERIFICATION');
  
  if (order) {
    console.log('\n🔍 POST-APPROVAL STATUS VERIFICATION:');
    console.log(`   Order Status: ${order.status}`);
    console.log(`   Admin Approval Status: ${order.adminApproval?.status || 'N/A'}`);
    console.log(`   Delivery Agent Assignment: ${order.deliveryAgent?.agent ? 'Yes' : 'No'}`);
    console.log(`   Delivery Agent Status: ${order.deliveryAgent?.status || 'N/A'}`);
    
    // Check if all expected changes were made
    let allChecksPassed = true;
    
    if (order.status === 'Pickup_Ready') {
      console.log('   ✅ Order status updated to Pickup_Ready');
    } else {
      console.log(`   ❌ Order status not updated correctly. Expected: Pickup_Ready, Got: ${order.status}`);
      allChecksPassed = false;
    }
    
    if (order.adminApproval?.status === 'approved') {
      console.log('   ✅ Admin approval status updated to approved');
    } else {
      console.log(`   ❌ Admin approval status not updated. Expected: approved, Got: ${order.adminApproval?.status || 'N/A'}`);
      allChecksPassed = false;
    }
    
    if (order.deliveryAgent?.agent) {
      console.log('   ✅ Delivery agent assigned successfully');
    } else {
      console.log('   ❌ Delivery agent assignment failed');
      allChecksPassed = false;
    }
    
    if (order.deliveryAgent?.status === 'assigned') {
      console.log('   ✅ Delivery agent status set to assigned');
    } else {
      console.log(`   ❌ Delivery agent status not set correctly. Expected: assigned, Got: ${order.deliveryAgent?.status || 'N/A'}`);
      allChecksPassed = false;
    }
    
    return allChecksPassed;
  }
  
  return false;
}

// 🔧 STEP 7: Test Delivery Agent Access
async function testDeliveryAgentAccess() {
  console.log('\n🔧 STEP 7: Test Delivery Agent Access');
  console.log('=======================================');
  
  try {
    // Authenticate delivery agent
    const authResponse = await axios.post(`${BASE_URL}/delivery/login`, {
      email: TEST_DATA.deliveryAgent.email,
      password: TEST_DATA.deliveryAgent.password
    });
    
    if (authResponse.data.success) {
      FIX_CONFIG.deliveryAgentToken = authResponse.data.token;
      console.log('✅ Delivery agent authentication successful');
      
      // Check available orders
      const ordersResponse = await axios.get(`${BASE_URL}/delivery/orders/available`, {
        headers: { Authorization: `Bearer ${FIX_CONFIG.deliveryAgentToken}` }
      });
      
      if (ordersResponse.data.success) {
        const orders = ordersResponse.data.data;
        console.log(`✅ Available orders check successful. Found ${orders.length} orders`);
        
        // Check if our test order is available
        const testOrder = orders.find(order => order._id === FIX_CONFIG.testOrderId);
        if (testOrder) {
          console.log('   ✅ Test order is available for delivery agent');
          console.log(`     Order Status: ${testOrder.status}`);
          console.log(`     Delivery Agent Status: ${testOrder.deliveryAgent?.status || 'N/A'}`);
          console.log(`     Admin Approval: ${testOrder.adminApproval?.status || 'N/A'}`);
          
          // Check the specific status that delivery agent controller expects
          if (testOrder.deliveryAgent?.status === 'unassigned') {
            console.log('   ✅ Order delivery agent status is "unassigned" (as expected)');
            return true;
          } else {
            console.log(`   ❌ Order delivery agent status mismatch. Expected: unassigned, Got: ${testOrder.deliveryAgent?.status || 'N/A'}`);
            console.log('\n🔍 STATUS MISMATCH ANALYSIS:');
            console.log('   The delivery agent controller expects orders with deliveryAgent.status = "unassigned"');
            console.log('   But the admin controller sets deliveryAgent.status = "assigned"');
            console.log('   This creates a synchronization issue!');
            return false;
          }
        } else {
          console.log('   ❌ Test order is NOT available for delivery agent');
          console.log('   📋 Available orders:');
          orders.forEach((order, index) => {
            console.log(`     ${index + 1}. ${order.orderNumber} - Status: ${order.status}, Agent Status: ${order.deliveryAgent?.status || 'N/A'}`);
          });
          return false;
        }
      } else {
        console.log('❌ Available orders check failed:', ordersResponse.data.message);
        return false;
      }
    } else {
      console.log('❌ Delivery agent authentication failed:', authResponse.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Delivery agent access test error:', error.response?.data?.message || error.message);
    return false;
  }
}

// 🔧 MAIN FIX EXECUTION
async function runOrderSynchronizationFix() {
  console.log('🔧 STARTING ORDER SYNCHRONIZATION FIX');
  console.log('=====================================');
  console.log('Time:', new Date().toISOString());
  console.log('Base URL:', BASE_URL);
  console.log('Purpose: Identify and fix status synchronization issues');
  
  const fixResults = [];
  
  try {
    // Run fix steps in sequence
    fixResults.push(await authenticateAdmin());
    fixResults.push(await findAvailableOrders());
    fixResults.push(await findAvailableDeliveryAgents());
    fixResults.push(await checkCurrentOrderStatus());
    fixResults.push(await attemptAdminApproval());
    fixResults.push(await verifyOrderStatusAfterApproval());
    fixResults.push(await testDeliveryAgentAccess());
    
    // Summary
    console.log('\n📊 FIX EXECUTION SUMMARY');
    console.log('==========================');
    const passedSteps = fixResults.filter(result => result === true).length;
    const totalSteps = fixResults.length;
    
    console.log(`✅ Passed: ${passedSteps}/${totalSteps}`);
    console.log(`❌ Failed: ${totalSteps - passedSteps}/${totalSteps}`);
    
    if (passedSteps === totalSteps) {
      console.log('\n🎉 ALL FIX STEPS COMPLETED SUCCESSFULLY!');
      console.log('   Order synchronization is now working correctly.');
    } else {
      console.log('\n⚠️  SOME FIX STEPS FAILED. Review the output above.');
      console.log('\n🔧 NEXT STEPS TO RESOLVE ISSUES:');
      console.log('   1. Check the specific error messages above');
      console.log('   2. Verify database schema consistency');
      console.log('   3. Check controller logic for status transitions');
      console.log('   4. Ensure proper field mapping between controllers');
    }
    
  } catch (error) {
    console.log('\n💥 CRITICAL ERROR:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Run fix if this file is executed directly
if (require.main === module) {
  runOrderSynchronizationFix().catch(console.error);
}

module.exports = {
  runOrderSynchronizationFix,
  authenticateAdmin,
  findAvailableOrders,
  findAvailableDeliveryAgents,
  checkCurrentOrderStatus,
  attemptAdminApproval,
  verifyOrderStatusAfterApproval,
  testDeliveryAgentAccess
};

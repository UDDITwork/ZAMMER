/**
 * Test Script: Delivery Agent Earnings Endpoint
 * Tests: GET /api/delivery/earnings
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';
let deliveryAgentToken = '';

// Test data
const testDeliveryAgent = {
  email: 'delivery@example.com',
  password: 'deliverypassword123'
};

async function testDeliveryEarnings() {
  console.log('\n🧪 ============================================');
  console.log('TEST 4: Delivery Agent Earnings Endpoint');
  console.log('============================================\n');

  try {
    // Step 1: Login as delivery agent
    console.log('📝 Step 1: Logging in as delivery agent...');
    const loginResponse = await axios.post(`${BASE_URL}/delivery/login`, {
      email: testDeliveryAgent.email,
      password: testDeliveryAgent.password
    });

    if (loginResponse.data.success && loginResponse.data.data.token) {
      deliveryAgentToken = loginResponse.data.data.token;
      console.log('✅ Delivery agent login successful');
    } else {
      console.log('❌ Login failed');
      console.log('Response:', loginResponse.data);
      return;
    }

    // Step 2: Test without authentication
    console.log('\n📝 Step 2: Testing endpoint WITHOUT authentication...');
    try {
      await axios.get(`${BASE_URL}/delivery/earnings`);
      console.log('❌ TEST FAILED: Should require authentication');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected - 401 Unauthorized');
      }
    }

    // Step 3: Test with authentication (all time)
    console.log('\n📝 Step 3: Fetching earnings (all time)...');
    const allTimeResponse = await axios.get(
      `${BASE_URL}/delivery/earnings`,
      { headers: { Authorization: `Bearer ${deliveryAgentToken}` } }
    );

    if (allTimeResponse.data.success) {
      const data = allTimeResponse.data.data;
      console.log('✅ Earnings retrieved successfully');
      console.log('\n📊 Summary:');
      console.log(`   Total Earnings: ₹${data.summary.totalEarnings}`);
      console.log(`   Total Deliveries: ${data.summary.totalDeliveries}`);
      console.log(`   Avg per Delivery: ₹${data.summary.avgEarningsPerDelivery}`);
      console.log(`   Earnings by Day: ${data.earningsByDay.length} days`);
      console.log(`   Order Breakdown: ${data.orderWiseBreakdown.length} orders`);
    } else {
      console.log('❌ Request failed');
      console.log('Response:', allTimeResponse.data);
    }

    // Step 4: Test with period filter (today)
    console.log('\n📝 Step 4: Fetching earnings for today...');
    const todayResponse = await axios.get(
      `${BASE_URL}/delivery/earnings?period=day`,
      { headers: { Authorization: `Bearer ${deliveryAgentToken}` } }
    );

    if (todayResponse.data.success) {
      console.log(`✅ Today's earnings: ₹${todayResponse.data.data.summary.totalEarnings}`);
      console.log(`   Deliveries today: ${todayResponse.data.data.summary.totalDeliveries}`);
    }

    // Step 5: Test with period filter (week)
    console.log('\n📝 Step 5: Fetching earnings for this week...');
    const weekResponse = await axios.get(
      `${BASE_URL}/delivery/earnings?period=week`,
      { headers: { Authorization: `Bearer ${deliveryAgentToken}` } }
    );

    if (weekResponse.data.success) {
      console.log(`✅ Week's earnings: ₹${weekResponse.data.data.summary.totalEarnings}`);
    }

    // Step 6: Test with period filter (month)
    console.log('\n📝 Step 6: Fetching earnings for this month...');
    const monthResponse = await axios.get(
      `${BASE_URL}/delivery/earnings?period=month`,
      { headers: { Authorization: `Bearer ${deliveryAgentToken}` } }
    );

    if (monthResponse.data.success) {
      console.log(`✅ Month's earnings: ₹${monthResponse.data.data.summary.totalEarnings}`);
    }

    // Step 7: Test with custom date range
    console.log('\n📝 Step 7: Testing custom date range...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    const dateRangeResponse = await axios.get(
      `${BASE_URL}/delivery/earnings?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      { headers: { Authorization: `Bearer ${deliveryAgentToken}` } }
    );

    if (dateRangeResponse.data.success) {
      console.log(`✅ Custom range earnings: ₹${dateRangeResponse.data.data.summary.totalEarnings}`);
    }

    // Step 8: Verify day-wise breakdown structure
    if (allTimeResponse.data.success && allTimeResponse.data.data.earningsByDay.length > 0) {
      console.log('\n📝 Step 8: Verifying day-wise breakdown structure...');
      const firstDay = allTimeResponse.data.data.earningsByDay[0];
      const hasDate = !!firstDay.date;
      const hasEarnings = typeof firstDay.totalEarnings === 'number';
      const hasOrders = Array.isArray(firstDay.orders);

      if (hasDate && hasEarnings && hasOrders) {
        console.log('✅ Day-wise breakdown structure is correct');
        console.log(`   Sample day: ${firstDay.date}`);
        console.log(`   Earnings: ₹${firstDay.totalEarnings}`);
        console.log(`   Orders: ${firstDay.orders.length}`);
      } else {
        console.log('❌ Day-wise breakdown structure is incorrect');
      }
    }

    // Step 9: Verify order-wise breakdown structure
    if (allTimeResponse.data.success && allTimeResponse.data.data.orderWiseBreakdown.length > 0) {
      console.log('\n📝 Step 9: Verifying order-wise breakdown structure...');
      const firstOrder = allTimeResponse.data.data.orderWiseBreakdown[0];
      const hasOrderNumber = !!firstOrder.orderNumber;
      const hasEarnings = typeof firstOrder.earnings === 'number';
      const hasCompletedAt = !!firstOrder.completedAt;

      if (hasOrderNumber && hasEarnings && hasCompletedAt) {
        console.log('✅ Order-wise breakdown structure is correct');
        console.log(`   Sample order: ${firstOrder.orderNumber}`);
        console.log(`   Earnings: ₹${firstOrder.earnings}`);
      } else {
        console.log('❌ Order-wise breakdown structure is incorrect');
      }
    }

    console.log('\n✅ Test 4 Complete\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

module.exports = testDeliveryEarnings;

if (require.main === module) {
  testDeliveryEarnings()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}


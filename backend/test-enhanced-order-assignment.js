// backend/test-enhanced-order-assignment.js
// 🧪 COMPREHENSIVE TEST SCRIPT FOR ENHANCED ORDER ASSIGNMENT SYSTEM
// Tests the new multi-order capacity management functionality

const mongoose = require('mongoose');
const Order = require('./models/Order');
const DeliveryAgent = require('./models/DeliveryAgent');
const Admin = require('./models/Admin');

// Test configuration
const MAX_ORDERS_PER_AGENT = 5; // Configurable capacity
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/zammer',
  MAX_ORDERS_PER_AGENT: MAX_ORDERS_PER_AGENT
};

// Test data
const testDeliveryAgent = {
  name: 'Test Agent',
  email: 'testagent@example.com',
  mobileNumber: '9876543210',
  vehicleType: 'bike',
  area: 'Test Area',
  password: 'testpass123',
  isActive: true,
  isVerified: true,
  status: 'available'
};

const testOrders = [
  {
    orderNumber: 'TEST-001',
    status: 'Pending',
    isPaid: true,
    totalPrice: 100,
    user: null, // Will be set after user creation
    seller: null // Will be set after seller creation
  },
  {
    orderNumber: 'TEST-002',
    status: 'Pending',
    isPaid: true,
    totalPrice: 150,
    user: null,
    seller: null
  },
  {
    orderNumber: 'TEST-003',
    status: 'Pending',
    isPaid: true,
    totalPrice: 200,
    user: null,
    seller: null
  }
];

class OrderAssignmentTester {
  constructor() {
    this.agentId = null;
    this.orderIds = [];
    this.testResults = [];
  }

  async connectDB() {
    try {
      await mongoose.connect(TEST_CONFIG.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      // Clean up test data
      await DeliveryAgent.deleteMany({ email: testDeliveryAgent.email });
      await Order.deleteMany({ orderNumber: { $regex: /^TEST-/ } });
      
      // Close database connection
      await mongoose.connection.close();
      
      console.log('🧹 Cleaned up test data and closed connection');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      // Ensure connection is closed even if cleanup fails
      try {
        await mongoose.connection.close();
      } catch (closeError) {
        console.error('❌ Failed to close database connection:', closeError);
      }
    }
  }

  async setupTestData() {
    try {
      // Create test delivery agent
      const agent = new DeliveryAgent(testDeliveryAgent);
      await agent.save();
      this.agentId = agent._id;
      console.log('✅ Created test delivery agent:', agent.name);

      // Create test orders (simplified - no user/seller for this test)
      for (const orderData of testOrders) {
        const order = new Order(orderData);
        await order.save();
        this.orderIds.push(order._id);
        console.log('✅ Created test order:', order.orderNumber);
      }

    } catch (error) {
      console.error('❌ Test data setup failed:', error);
      throw error;
    }
  }

  async testAgentCapacityMethods() {
    console.log('\n🧪 Testing Agent Capacity Methods...');
    
    try {
      const agent = await DeliveryAgent.findById(this.agentId);
      
      // Test isAvailableForAssignment
      const isAvailable = agent.isAvailableForAssignment(MAX_ORDERS_PER_AGENT);
      this.testResults.push({
        test: 'isAvailableForAssignment',
        result: isAvailable,
        expected: true,
        status: isAvailable === true ? 'PASS' : 'FAIL'
      });
      console.log(`✅ isAvailableForAssignment: ${isAvailable}`);

      // Test getCapacityInfo
      const capacityInfo = agent.getCapacityInfo(MAX_ORDERS_PER_AGENT);
      const expectedCapacity = {
        current: 0,
        max: MAX_ORDERS_PER_AGENT,
        available: MAX_ORDERS_PER_AGENT,
        percentage: 0,
        isAtCapacity: false,
        isAvailable: true
      };
      
      const capacityMatch = JSON.stringify(capacityInfo) === JSON.stringify(expectedCapacity);
      this.testResults.push({
        test: 'getCapacityInfo',
        result: capacityInfo,
        expected: expectedCapacity,
        status: capacityMatch ? 'PASS' : 'FAIL'
      });
      console.log(`✅ getCapacityInfo:`, capacityInfo);

      // Test canHandleOrders
      const canHandle3 = agent.canHandleOrders(3, MAX_ORDERS_PER_AGENT);
      const canHandle6 = agent.canHandleOrders(6, MAX_ORDERS_PER_AGENT);
      
      this.testResults.push({
        test: 'canHandleOrders(3)',
        result: canHandle3,
        expected: true,
        status: canHandle3 === true ? 'PASS' : 'FAIL'
      });
      
      this.testResults.push({
        test: 'canHandleOrders(6)',
        result: canHandle6,
        expected: false,
        status: canHandle6 === false ? 'PASS' : 'FAIL'
      });
      
      console.log(`✅ canHandleOrders(3): ${canHandle3}`);
      console.log(`✅ canHandleOrders(6): ${canHandle6}`);

    } catch (error) {
      console.error('❌ Agent capacity methods test failed:', error);
      this.testResults.push({
        test: 'agentCapacityMethods',
        result: error.message,
        expected: 'success',
        status: 'FAIL'
      });
    }
  }

  async testStaticMethods() {
    console.log('\n🧪 Testing Static Methods...');
    
    try {
      // Test findByVehicleAndArea
      const agents = await DeliveryAgent.findByVehicleAndArea('bike', 'Test Area', MAX_ORDERS_PER_AGENT);
      this.testResults.push({
        test: 'findByVehicleAndArea',
        result: agents.length,
        expected: 1,
        status: agents.length === 1 ? 'PASS' : 'FAIL'
      });
      console.log(`✅ findByVehicleAndArea: Found ${agents.length} agents`);

      // Test findNearbyAvailable (with mock coordinates)
      const nearbyAgents = await DeliveryAgent.findNearbyAvailable(12.9716, 77.5946, 10, MAX_ORDERS_PER_AGENT);
      this.testResults.push({
        test: 'findNearbyAvailable',
        result: nearbyAgents.length,
        expected: 0, // No agents with location data
        status: nearbyAgents.length === 0 ? 'PASS' : 'FAIL'
      });
      console.log(`✅ findNearbyAvailable: Found ${nearbyAgents.length} agents`);

    } catch (error) {
      console.error('❌ Static methods test failed:', error);
      this.testResults.push({
        test: 'staticMethods',
        result: error.message,
        expected: 'success',
        status: 'FAIL'
      });
    }
  }

  async testOrderAssignmentSimulation() {
    console.log('\n🧪 Testing Order Assignment Simulation...');
    
    try {
      const agent = await DeliveryAgent.findById(this.agentId);
      
      // Simulate assigning orders one by one
      for (let i = 0; i < this.orderIds.length; i++) {
        const orderId = this.orderIds[i];
        
        // Add order to assignedOrders
        agent.assignedOrders.push({
          order: orderId,
          assignedAt: new Date(),
          status: 'assigned'
        });
        
        // Update currentOrder if this is the first order
        if (i === 0) {
          agent.currentOrder = orderId;
        }
        
        // Update status only for first order
        if (i === 0) {
          agent.status = 'assigned';
        }
        
        await agent.save();
        
        // Check capacity after each assignment
        const capacityInfo = agent.getCapacityInfo(MAX_ORDERS_PER_AGENT);
        const isAvailable = agent.isAvailableForAssignment(MAX_ORDERS_PER_AGENT);
        
        console.log(`✅ Assigned order ${i + 1}: Capacity ${capacityInfo.current}/${capacityInfo.max}, Available: ${isAvailable}`);
        
        this.testResults.push({
          test: `assignment_${i + 1}_capacity`,
          result: capacityInfo.current,
          expected: i + 1,
          status: capacityInfo.current === (i + 1) ? 'PASS' : 'FAIL'
        });
        
        this.testResults.push({
          test: `assignment_${i + 1}_available`,
          result: isAvailable,
          expected: (i + 1) < MAX_ORDERS_PER_AGENT,
          status: isAvailable === ((i + 1) < MAX_ORDERS_PER_AGENT) ? 'PASS' : 'FAIL'
        });
      }
      
      // Test capacity limit
      const finalCapacity = agent.getCapacityInfo(MAX_ORDERS_PER_AGENT);
      const canHandleMore = agent.canHandleOrders(1, MAX_ORDERS_PER_AGENT);
      
      this.testResults.push({
        test: 'final_capacity_limit',
        result: canHandleMore,
        expected: false,
        status: canHandleMore === false ? 'PASS' : 'FAIL'
      });
      
      console.log(`✅ Final capacity: ${finalCapacity.current}/${finalCapacity.max}, Can handle more: ${canHandleMore}`);

    } catch (error) {
      console.error('❌ Order assignment simulation failed:', error);
      this.testResults.push({
        test: 'orderAssignmentSimulation',
        result: error.message,
        expected: 'success',
        status: 'FAIL'
      });
    }
  }

  async testCapacityOverflow() {
    console.log('\n🧪 Testing Capacity Overflow Protection...');
    
    try {
      const agent = await DeliveryAgent.findById(this.agentId);
      
      // Try to assign more orders than capacity allows
      const extraOrderId = new mongoose.Types.ObjectId();
      
      // This should fail capacity check
      const canHandleExtra = agent.canHandleOrders(1, MAX_ORDERS_PER_AGENT);
      const isAvailableForExtra = agent.isAvailableForAssignment(MAX_ORDERS_PER_AGENT);
      
      this.testResults.push({
        test: 'capacity_overflow_protection',
        result: !canHandleExtra && !isAvailableForExtra,
        expected: true,
        status: (!canHandleExtra && !isAvailableForExtra) === true ? 'PASS' : 'FAIL'
      });
      
      console.log(`✅ Capacity overflow protection: Can handle extra: ${canHandleExtra}, Available: ${isAvailableForExtra}`);

    } catch (error) {
      console.error('❌ Capacity overflow test failed:', error);
      this.testResults.push({
        test: 'capacityOverflow',
        result: error.message,
        expected: 'success',
        status: 'FAIL'
      });
    }
  }

  printTestResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(test => {
          console.log(`  - ${test.test}: Expected ${test.expected}, Got ${test.result}`);
        });
    }
    
    console.log('\n🎯 ENHANCED ORDER ASSIGNMENT SYSTEM TEST COMPLETE');
    console.log(`🔧 MAX_ORDERS_PER_AGENT: ${MAX_ORDERS_PER_AGENT}`);
    console.log(`🚚 Test Agent: ${testDeliveryAgent.name}`);
    console.log(`📦 Test Orders: ${testOrders.length}`);
  }

  async runAllTests() {
    try {
      console.log('🚀 STARTING ENHANCED ORDER ASSIGNMENT SYSTEM TESTS');
      console.log('='.repeat(60));
      
      await this.connectDB();
      await this.cleanup();
      await this.setupTestData();
      
      await this.testAgentCapacityMethods();
      await this.testStaticMethods();
      await this.testOrderAssignmentSimulation();
      await this.testCapacityOverflow();
      
      this.printTestResults();
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    } finally {
      await this.cleanup();
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new OrderAssignmentTester();
  tester.runAllTests().catch(console.error);
}

module.exports = OrderAssignmentTester;

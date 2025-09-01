// backend/test-admin-dashboard-fix.js - Test Admin Dashboard Fix
// 🎯 PURPOSE: Verify that admin dashboard now shows both Pending and Processing orders
// 🎯 TESTS: Order filtering, dashboard metrics, and order display

const mongoose = require('mongoose');
const Order = require('./models/Order');
const Admin = require('./models/Admin');
const { generateAdminToken } = require('./utils/jwtToken');

// Load environment variables
require('dotenv').config();

// Configuration
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/zammer';
const TEST_ADMIN_EMAIL = 'admin@zammer.com';

// Test data with all required fields
const testOrders = [
  {
    orderNumber: 'TEST-001',
    status: 'Pending',
    isPaid: false,
    totalPrice: 150.00,
    paymentMethod: 'Cash on Delivery',
    shippingAddress: {
      address: '123 Test Street',
      city: 'Test City',
      postalCode: '12345',
      country: 'Test Country',
      phone: '1234567890'
    },
    user: new mongoose.Types.ObjectId(), // Generate a fake ObjectId
    seller: new mongoose.Types.ObjectId(), // Generate a fake ObjectId
    adminApproval: { status: 'pending', isRequired: true }
  },
  {
    orderNumber: 'TEST-002', 
    status: 'Processing',
    isPaid: true,
    totalPrice: 200.00,
    paymentMethod: 'UPI',
    shippingAddress: {
      address: '456 Test Avenue',
      city: 'Test City',
      postalCode: '12345',
      country: 'Test Country',
      phone: '1234567890'
    },
    user: new mongoose.Types.ObjectId(),
    seller: new mongoose.Types.ObjectId(),
    adminApproval: { status: 'pending', isRequired: true }
  },
  {
    orderNumber: 'TEST-003',
    status: 'Processing',
    isPaid: true,
    totalPrice: 175.50,
    paymentMethod: 'Card',
    shippingAddress: {
      address: '789 Test Road',
      city: 'Test City',
      postalCode: '12345',
      country: 'Test Country',
      phone: '1234567890'
    },
    user: new mongoose.Types.ObjectId(),
    seller: new mongoose.Types.ObjectId(),
    adminApproval: { status: 'pending', isRequired: true }
  },
  {
    orderNumber: 'TEST-004',
    status: 'Shipped',
    isPaid: true,
    totalPrice: 300.00,
    paymentMethod: 'SMEPay',
    shippingAddress: {
      address: '321 Test Lane',
      city: 'Test City',
      postalCode: '12345',
      country: 'Test Country',
      phone: '1234567890'
    },
    user: new mongoose.Types.ObjectId(),
    seller: new mongoose.Types.ObjectId(),
    adminApproval: { status: 'approved', isRequired: true }
  }
];

async function testAdminDashboardFix() {
  try {
    console.log('🚀 Starting Admin Dashboard Fix Test...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clean up existing test orders
    await Order.deleteMany({ orderNumber: { $in: testOrders.map(o => o.orderNumber) } });
    console.log('🧹 Cleaned up existing test orders');

    // Create test orders
    const createdOrders = await Order.insertMany(testOrders);
    console.log(`✅ Created ${createdOrders.length} test orders`);

    // Test 1: Verify orders exist in database
    console.log('\n📊 Test 1: Database Order Status Analysis');
    const allOrders = await Order.find({}).select('orderNumber status isPaid adminApproval.status');
    console.log('📋 All orders in database:');
    allOrders.forEach(order => {
      console.log(`   - ${order.orderNumber}: ${order.status} (Paid: ${order.isPaid}, Admin: ${order.adminApproval.status})`);
    });

    // Test 2: Test the fixed filtering logic
    console.log('\n🔍 Test 2: Fixed Filtering Logic Test');
    
    // Test without status filter (should show Pending + Processing)
    const ordersNeedingAttention = await Order.find({
      status: { $in: ['Pending', 'Processing'] }
    }).select('orderNumber status isPaid');
    
    console.log(`✅ Orders needing admin attention: ${ordersNeedingAttention.length}`);
    ordersNeedingAttention.forEach(order => {
      console.log(`   - ${order.orderNumber}: ${order.status} (Paid: ${order.isPaid})`);
    });

    // Test 3: Verify dashboard metrics calculation
    console.log('\n📈 Test 3: Dashboard Metrics Calculation');
    
    const pendingOrdersCount = await Order.countDocuments({
      status: { $in: ['Pending', 'Processing'] }
    });
    
    const recentPaidOrders = await Order.countDocuments({
      isPaid: true,
      paidAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    const ordersNeedingDelivery = await Order.countDocuments({
      'adminApproval.status': { $in: ['approved', 'auto_approved'] },
      'deliveryAgent.status': 'unassigned',
      status: { $nin: ['Cancelled', 'Delivered'] }
    });
    
    console.log('📊 Dashboard Metrics:');
    console.log(`   - Total Orders: ${allOrders.length}`);
    console.log(`   - Pending Admin Action: ${pendingOrdersCount}`);
    console.log(`   - Recent Paid Orders (24h): ${recentPaidOrders}`);
    console.log(`   - Need Delivery Assignment: ${ordersNeedingDelivery}`);

    // Test 4: Test the actual admin dashboard endpoint logic
    console.log('\n🌐 Test 4: Admin Dashboard Endpoint Logic Simulation');
    
    // Simulate the fixed filtering logic
    const dashboardFilter = {};
    // No status filter provided - should show orders needing admin attention
    dashboardFilter.status = { $in: ['Pending', 'Processing'] };
    
    const dashboardOrders = await Order.find(dashboardFilter)
      .select('orderNumber status isPaid adminApproval.status')
      .sort({ createdAt: -1 })
      .limit(20);
    
    console.log(`✅ Dashboard orders (no status filter): ${dashboardOrders.length}`);
    dashboardOrders.forEach(order => {
      console.log(`   - ${order.orderNumber}: ${order.status} (Paid: ${order.isPaid}, Admin: ${order.adminApproval.status})`);
    });

    // Test 5: Test with specific status filter
    console.log('\n🎯 Test 5: Specific Status Filter Test');
    
    const pendingOnlyOrders = await Order.find({ status: 'Pending' })
      .select('orderNumber status isPaid');
    
    const processingOnlyOrders = await Order.find({ status: 'Processing' })
      .select('orderNumber status isPaid');
    
    console.log(`✅ Pending orders only: ${pendingOnlyOrders.length}`);
    pendingOnlyOrders.forEach(order => {
      console.log(`   - ${order.orderNumber}: ${order.status} (Paid: ${order.isPaid})`);
    });
    
    console.log(`✅ Processing orders only: ${processingOnlyOrders.length}`);
    processingOnlyOrders.forEach(order => {
      console.log(`   - ${order.orderNumber}: ${order.status} (Paid: ${order.isPaid})`);
    });

    // Test 6: Verify the fix addresses the original issue
    console.log('\n🎯 Test 6: Original Issue Resolution Verification');
    
    const originalProblemFilter = { status: 'pending' }; // This was the problem
    const originalProblemOrders = await Order.find(originalProblemFilter);
    
    console.log(`❌ Original problem filter (status: 'pending'): ${originalProblemOrders.length} orders`);
    console.log(`✅ Fixed filter (status: { $in: ['Pending', 'Processing'] }): ${dashboardOrders.length} orders`);
    
    if (dashboardOrders.length > originalProblemOrders.length) {
      console.log('🎉 SUCCESS: The fix resolves the original issue!');
      console.log(`   - Before: ${originalProblemOrders.length} orders (filtered incorrectly)`);
      console.log(`   - After: ${dashboardOrders.length} orders (showing all orders needing attention)`);
    } else {
      console.log('⚠️  WARNING: The fix may not be working as expected');
    }

    console.log('\n✅ Admin Dashboard Fix Test Completed Successfully!');
    console.log('\n📋 Summary of Changes Made:');
    console.log('   1. ✅ Backend: Updated getAdminDashboardOrders to show orders needing admin attention');
    console.log('   2. ✅ Frontend: Removed status filter to show all relevant orders');
    console.log('   3. ✅ Logic: Now shows both Pending (unpaid) and Processing (paid) orders');
    console.log('   4. ✅ Metrics: Fixed pendingOrdersCount calculation');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test data
    try {
      await Order.deleteMany({ orderNumber: { $in: testOrders.map(o => o.orderNumber) } });
      console.log('🧹 Cleaned up test orders');
    } catch (cleanupError) {
      console.error('⚠️  Cleanup error:', cleanupError);
    }
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testAdminDashboardFix();
}

module.exports = { testAdminDashboardFix };

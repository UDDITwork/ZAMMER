// backend/test-complete-payment-flow.js - Complete Payment Flow Test

const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
const Seller = require('./models/Seller');
const Product = require('./models/Product');
const smepayService = require('./services/smepayService');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/zammer');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Test complete payment flow
const testCompletePaymentFlow = async () => {
  try {
    console.log('\n🧪 Testing Complete Payment Flow...\n');
    
    // Step 1: Find test orders
    console.log('📋 Step 1: Finding test orders...');
    
    const allOrders = await Order.find({})
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('orderItems.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(5);

    if (allOrders.length === 0) {
      console.log('❌ No orders found in database');
      return;
    }

    console.log(`✅ Found ${allOrders.length} orders in database\n`);

    // Step 2: Analyze each order
    for (let i = 0; i < allOrders.length; i++) {
      const order = allOrders[i];
      console.log(`📦 Order ${i + 1}: ${order.orderNumber}`);
      console.log(`   ID: ${order._id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Is Paid: ${order.isPaid}`);
      console.log(`   Payment Gateway: ${order.paymentGateway || 'Not set'}`);
      console.log(`   SMEPay Slug: ${order.smepayOrderSlug || 'Not set'}`);
      console.log(`   Amount: ₹${order.totalPrice}`);
      console.log(`   Customer: ${order.user?.name || 'Unknown'}`);
      console.log(`   Seller: ${order.seller?.firstName || 'Unknown'}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Updated: ${order.updatedAt}`);
      
      // Check payment attempts
      if (order.paymentAttempts && order.paymentAttempts.length > 0) {
        console.log(`   💳 Payment Attempts: ${order.paymentAttempts.length}`);
        order.paymentAttempts.forEach((attempt, idx) => {
          console.log(`      ${idx + 1}. ${attempt.gateway} - ${attempt.status}`);
          console.log(`         Amount: ₹${attempt.amount}`);
          console.log(`         Created: ${attempt.createdAt}`);
          if (attempt.completedAt) {
            console.log(`         Completed: ${attempt.completedAt}`);
          }
        });
      }

      // Check status history
      if (order.statusHistory && order.statusHistory.length > 0) {
        console.log(`   📋 Status History: ${order.statusHistory.length}`);
        order.statusHistory.forEach((status, idx) => {
          console.log(`      ${idx + 1}. ${status.status} - ${status.changedBy}`);
          console.log(`         Time: ${status.changedAt}`);
          console.log(`         Notes: ${status.notes}`);
        });
      }

      console.log('');
    }

    // Step 3: Check SMEPay orders specifically
    console.log('🔍 Step 2: Checking SMEPay orders...');
    
    const smepayOrders = await Order.find({
      paymentGateway: 'smepay',
      smepayOrderSlug: { $exists: true, $ne: null }
    }).populate('user seller');

    if (smepayOrders.length === 0) {
      console.log('❌ No SMEPay orders found');
      console.log('💡 Create an order with SMEPay payment first');
    } else {
      console.log(`✅ Found ${smepayOrders.length} SMEPay orders\n`);
      
      for (const order of smepayOrders) {
        console.log(`🔍 Checking SMEPay order: ${order.orderNumber}`);
        
        if (order.smepayOrderSlug) {
          try {
            // Test SMEPay validation
            console.log(`   📡 Calling SMEPay API for slug: ${order.smepayOrderSlug}`);
            
            const validationResult = await smepayService.validateOrder({
              slug: order.smepayOrderSlug,
              amount: order.totalPrice
            });

            if (validationResult.success) {
              console.log(`   ✅ SMEPay API Response:`);
              console.log(`      Payment Status: ${validationResult.paymentStatus}`);
              console.log(`      Is Successful: ${validationResult.isPaymentSuccessful}`);
              console.log(`      Data:`, validationResult.data);
              
              // Check if order needs updating
              if (validationResult.isPaymentSuccessful && !order.isPaid) {
                console.log(`   💰 Payment confirmed but order not updated!`);
                console.log(`   🔧 Order needs manual update`);
              } else if (validationResult.isPaymentSuccessful && order.isPaid) {
                console.log(`   ✅ Payment confirmed and order updated`);
              } else {
                console.log(`   ⏳ Payment not yet completed`);
              }
            } else {
              console.log(`   ❌ SMEPay API Error: ${validationResult.error}`);
            }
          } catch (error) {
            console.log(`   ❌ SMEPay API Call Failed: ${error.message}`);
          }
        }
        console.log('');
      }
    }

    // Step 4: Check orders that should appear in admin dashboard
    console.log('📊 Step 3: Checking orders for admin dashboard...');
    
    const adminDashboardOrders = await Order.find({
      isPaid: true,
      status: { $in: ['Pending', 'Processing'] }
    }).populate('user seller');

    console.log(`✅ Found ${adminDashboardOrders.length} orders that should appear in admin dashboard\n`);
    
    if (adminDashboardOrders.length > 0) {
      console.log('📋 Orders for Admin Dashboard:');
      adminDashboardOrders.forEach((order, idx) => {
        console.log(`   ${idx + 1}. ${order.orderNumber}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Payment: ${order.paymentStatus}`);
        console.log(`      Customer: ${order.user?.name}`);
        console.log(`      Seller: ${order.seller?.firstName}`);
        console.log(`      Amount: ₹${order.totalPrice}`);
        console.log(`      Paid At: ${order.paidAt}`);
      });
    } else {
      console.log('❌ No orders found for admin dashboard');
      console.log('💡 This explains why admin dashboard shows "0 orders pending"');
    }

    // Step 5: Summary and recommendations
    console.log('\n📊 Step 4: Summary and Recommendations\n');
    
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments({ isPaid: true });
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });
    const processingOrders = await Order.countDocuments({ status: 'Processing' });
    const smepayOrdersCount = await Order.countDocuments({ paymentGateway: 'smepay' });
    
    console.log('📈 Database Summary:');
    console.log(`   Total Orders: ${totalOrders}`);
    console.log(`   Paid Orders: ${paidOrders}`);
    console.log(`   Pending Orders: ${pendingOrders}`);
    console.log(`   Processing Orders: ${processingOrders}`);
    console.log(`   SMEPay Orders: ${smepayOrdersCount}`);
    
    console.log('\n🔧 Issues Found:');
    
    if (paidOrders === 0) {
      console.log('   ❌ No orders are marked as paid');
      console.log('   💡 This means payment confirmation is not working');
    }
    
    if (pendingOrders === 0 && processingOrders === 0) {
      console.log('   ❌ No orders in Pending or Processing status');
      console.log('   💡 This explains why admin dashboard shows no pending orders');
    }
    
    if (smepayOrdersCount === 0) {
      console.log('   ❌ No orders using SMEPay payment gateway');
      console.log('   💡 Create orders with SMEPay payment first');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Complete a payment on SMEPay');
    console.log('2. Run: node check-payment-status.js');
    console.log('3. Check admin dashboard for incoming orders');
    console.log('4. Verify order status changes to "Processing"');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await testCompletePaymentFlow();
  
  console.log('\n🚀 Complete payment flow test completed!');
  process.exit(0);
};

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCompletePaymentFlow };

// backend/check-payment-status.js - Manual Payment Status Checker

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

// Check and update payment status for orders
const checkPaymentStatus = async () => {
  try {
    console.log('\n🔍 Checking Payment Status for Orders...\n');
    
    // Find orders with SMEPay payments that are not yet paid
    const pendingOrders = await Order.find({
      paymentGateway: 'smepay',
      smepayOrderSlug: { $exists: true, $ne: null },
      isPaid: false,
      status: 'Pending'
    }).populate('user seller');

    if (pendingOrders.length === 0) {
      console.log('✅ No pending SMEPay orders found');
      return;
    }

    console.log(`📦 Found ${pendingOrders.length} pending SMEPay orders\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const order of pendingOrders) {
      try {
        console.log(`🔍 Checking order: ${order.orderNumber}`);
        console.log(`   SMEPay Slug: ${order.smepayOrderSlug}`);
        console.log(`   Amount: ₹${order.totalPrice}`);
        console.log(`   Customer: ${order.user?.name}`);
        console.log(`   Seller: ${order.seller?.firstName}`);

        // Check payment status with SMEPay
        const statusResult = await smepayService.validateOrder({
          slug: order.smepayOrderSlug,
          amount: order.totalPrice
        });

        if (statusResult.success && statusResult.isPaymentSuccessful) {
          console.log(`💰 Payment confirmed for order: ${order.orderNumber}`);
          
          // Update order
          order.isPaid = true;
          order.paidAt = new Date();
          order.paymentStatus = 'completed';
          order.paymentResult = {
            gateway: 'smepay',
            transactionId: statusResult.data.transactionId || 'manual_check_' + Date.now(),
            paidAt: new Date(),
            paymentMethod: 'SMEPay'
          };

          // Update order status
          order.status = 'Processing';
          order.statusHistory.push({
            status: 'Processing',
            changedBy: 'system',
            changedAt: new Date(),
            notes: 'Payment confirmed via manual status check, order processing started'
          });

          await order.save();
          updatedCount++;

          console.log(`✅ Order ${order.orderNumber} updated successfully`);
          console.log(`   New Status: ${order.status}`);
          console.log(`   Payment Status: ${order.paymentStatus}`);
          console.log(`   Is Paid: ${order.isPaid}\n`);

        } else {
          console.log(`ℹ️ Payment not yet completed for order: ${order.orderNumber}`);
          console.log(`   Status: ${statusResult.paymentStatus || 'unknown'}\n`);
        }

      } catch (error) {
        console.error(`❌ Error checking order ${order.orderNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Payment Status Check Summary:');
    console.log(`   Total Orders Checked: ${pendingOrders.length}`);
    console.log(`   Orders Updated: ${updatedCount}`);
    console.log(`   Errors: ${errorCount}`);

    if (updatedCount > 0) {
      console.log('\n🎉 Some orders were updated! Check your admin dashboard now.');
    }

  } catch (error) {
    console.error('❌ Payment status check failed:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await checkPaymentStatus();
  
  console.log('\n🚀 Payment status check completed!');
  process.exit(0);
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkPaymentStatus };

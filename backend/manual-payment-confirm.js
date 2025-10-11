// backend/manual-payment-confirm.js - Manual Payment Confirmation Tool

const mongoose = require('mongoose');
const Order = require('./models/Order');
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

// Manual payment confirmation
const confirmPayment = async (orderSlug) => {
  try {
    console.log(`\n🔍 Confirming payment for order: ${orderSlug}\n`);
    
    // Find the order
    const order = await Order.findOne({ smepayOrderSlug: orderSlug });
    if (!order) {
      console.log(`❌ Order not found with slug: ${orderSlug}`);
      return;
    }
    
    console.log(`📦 Found order: ${order.orderNumber}`);
    console.log(`   Amount: ₹${order.totalPrice}`);
    console.log(`   Customer: ${order.user?.name || 'Unknown'}`);
    console.log(`   Current Status: ${order.status}`);
    console.log(`   Payment Status: ${order.paymentStatus}`);
    
    // Check payment status with SMEPay
    console.log(`\n🔄 Checking payment status with SMEPay...`);
    console.log(`   Order Slug: ${orderSlug}`);
    console.log(`   Amount: ₹${order.totalPrice}`);
    
    const paymentStatus = await smepayService.validateOrder({
      slug: orderSlug,
      amount: order.totalPrice
    });
    
    if (paymentStatus.success && paymentStatus.paymentStatus === 'paid') {
      console.log(`✅ Payment confirmed by SMEPay!`);
      
      // 🎯 FIXED: Update order status - Keep as Pending after payment
      order.paymentStatus = 'completed';
      order.isPaid = true;
      // Status remains Pending until seller manually confirms
      
      // Add status history
      if (!order.statusHistory || order.statusHistory.length === 0) {
        order.statusHistory = [];
      }
      
      const hasManualConfirmHistory = order.statusHistory.some(
        h => h.notes && h.notes.includes('Payment confirmed manually')
      );
      
      if (!hasManualConfirmHistory) {
        order.statusHistory.push({
          status: 'Pending',
          timestamp: new Date(),
          updatedBy: 'system',
          changedBy: 'system',
          notes: 'Payment confirmed manually, awaiting seller confirmation'
        });
      }
      
      await order.save();
      
      console.log(`✅ Order updated successfully!`);
      console.log(`   New Status: Pending (awaiting seller confirmation)`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Is Paid: ${order.isPaid}`);
      
    } else {
      console.log(`❌ Payment not confirmed by SMEPay`);
      console.log(`   Status: ${paymentStatus.paymentStatus}`);
      console.log(`   Message: ${paymentStatus.error || 'Payment not completed'}`);
    }
    
  } catch (error) {
    console.error('❌ Error confirming payment:', error.message);
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    // Get order slug from command line argument
    const orderSlug = process.argv[2];
    
    if (!orderSlug) {
      console.log('❌ Please provide order slug as argument');
      console.log('Usage: node manual-payment-confirm.js <order-slug>');
      console.log('\nExample: node manual-payment-confirm.js cL3VVqhlhrdL');
      process.exit(1);
    }
    
    await confirmPayment(orderSlug);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🚀 Manual payment confirmation completed!');
  }
};

// Run the script
main();

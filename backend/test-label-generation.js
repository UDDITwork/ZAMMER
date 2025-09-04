// backend/test-label-generation.js
// Test script for shipping label generation functionality

const mongoose = require('mongoose');
const Order = require('./models/Order');
const Seller = require('./models/Seller');
const User = require('./models/User');
const labelGenerationService = require('./services/labelGenerationService');
require('dotenv').config();

async function testLabelGeneration() {
  try {
    console.log('🧪 [Test] Starting label generation test...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zammer', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ [Test] Connected to MongoDB');

    // Find a test order in Processing status
    const testOrder = await Order.findOne({ status: 'Processing' })
      .populate('user', 'name email')
      .populate('seller', 'firstName shop');

    if (!testOrder) {
      console.log('❌ [Test] No Processing orders found. Creating a test order...');
      
      // Find any seller and user for testing
      const seller = await Seller.findOne();
      const user = await User.findOne();
      
      if (!seller || !user) {
        console.log('❌ [Test] No seller or user found. Please create some test data first.');
        return;
      }

      // Create a test order
      const newOrder = new Order({
        user: user._id,
        seller: seller._id,
        orderItems: [{
          product: new mongoose.Types.ObjectId(),
          name: 'Test Product',
          quantity: 1,
          price: 100,
          image: 'https://example.com/image.jpg',
          size: 'L',
          color: 'Red'
        }],
        shippingAddress: {
          address: '123 Test Street, Test Area',
          city: 'Mumbai',
          postalCode: '400001',
          country: 'India',
          phone: '9876543210'
        },
        paymentMethod: 'SMEPay',
        taxPrice: 18,
        shippingPrice: 50,
        totalPrice: 168,
        isPaid: true,
        paidAt: new Date(),
        status: 'Processing',
        orderNumber: `TEST-${Date.now()}`
      });

      await newOrder.save();
      console.log('✅ [Test] Created test order:', newOrder.orderNumber);
      
      // Use the new order for testing
      testOrder = newOrder;
    }

    console.log('📦 [Test] Using order:', testOrder.orderNumber);

    // Test 1: Generate label data in order
    console.log('🏷️ [Test] Step 1: Generating label data...');
    await testOrder.generateShippingLabel();
    console.log('✅ [Test] Label data generated:', {
      trackingNumber: testOrder.shippingLabel.trackingNumber,
      destinationCode: testOrder.shippingLabel.destinationCode,
      returnCode: testOrder.shippingLabel.returnCode
    });

    // Test 2: Generate PDF label
    console.log('📄 [Test] Step 2: Generating PDF label...');
    const seller = await Seller.findById(testOrder.seller);
    const labelResult = await labelGenerationService.generateShippingLabel(testOrder, seller);
    console.log('✅ [Test] PDF label generated:', {
      success: labelResult.success,
      labelUrl: labelResult.labelUrl,
      trackingNumber: labelResult.trackingNumber
    });

    // Test 3: Update order with label URL
    console.log('💾 [Test] Step 3: Updating order with label URL...');
    testOrder.shippingLabel.labelUrl = labelResult.labelUrl;
    await testOrder.save();
    console.log('✅ [Test] Order updated with label URL');

    // Test 4: Verify final order state
    console.log('🔍 [Test] Step 4: Verifying final order state...');
    const finalOrder = await Order.findById(testOrder._id);
    console.log('✅ [Test] Final order state:', {
      orderNumber: finalOrder.orderNumber,
      status: finalOrder.status,
      labelGenerated: finalOrder.shippingLabel.isGenerated,
      trackingNumber: finalOrder.shippingLabel.trackingNumber,
      labelUrl: finalOrder.shippingLabel.labelUrl ? 'Present' : 'Missing'
    });

    console.log('🎉 [Test] All tests passed successfully!');
    console.log('📋 [Test] Summary:');
    console.log('   - Order:', finalOrder.orderNumber);
    console.log('   - Tracking:', finalOrder.shippingLabel.trackingNumber);
    console.log('   - Label URL:', finalOrder.shippingLabel.labelUrl);
    console.log('   - Status:', finalOrder.status);

  } catch (error) {
    console.error('❌ [Test] Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 [Test] Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testLabelGeneration();
}

module.exports = testLabelGeneration;


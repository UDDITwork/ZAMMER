const mongoose = require('mongoose');
const Order = require('./models/Order');
const Review = require('./models/Review');
const Product = require('./models/Product');

// Test review eligibility for a specific user and product
async function testReviewEligibility() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/zammer', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('🔗 Connected to MongoDB');
    
    // Test with a specific product ID from the URL
    const productId = '68b5334d8f837d46e62f380d';
    
    console.log(`\n🧪 Testing review eligibility for product: ${productId}`);
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      console.log('❌ Product not found');
      return;
    }
    
    console.log('✅ Product found:', product.name);
    
    // Get all orders for this product
    const orders = await Order.find({
      'orderItems.product': productId
    }).populate('user', 'name email');
    
    console.log(`\n📦 Found ${orders.length} orders for this product:`);
    
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order ${order.orderNumber}:`);
      console.log(`   User: ${order.user.name} (${order.user.email})`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Is Paid: ${order.isPaid}`);
      console.log(`   Payment Method: ${order.paymentMethod}`);
      console.log(`   Created: ${order.createdAt}`);
      
      // Check if this order would qualify for review
      const canReview = order.isPaid && 
                       ['completed', 'processing'].includes(order.paymentStatus) &&
                       order.status !== 'Cancelled';
      
      console.log(`   Can Review: ${canReview ? '✅ YES' : '❌ NO'}`);
      
      if (!canReview) {
        console.log(`   Reason: ${!order.isPaid ? 'Not paid' : 
                                 !['completed', 'processing'].includes(order.paymentStatus) ? 'Payment not completed' :
                                 order.status === 'Cancelled' ? 'Order cancelled' : 'Unknown'}`);
      }
    });
    
    // Check existing reviews
    const reviews = await Review.find({ product: productId }).populate('user', 'name email');
    console.log(`\n📝 Found ${reviews.length} existing reviews:`);
    
    reviews.forEach((review, index) => {
      console.log(`${index + 1}. ${review.user.name}: ${review.rating} stars - "${review.review.substring(0, 50)}..."`);
    });
    
    console.log('\n🎯 Summary:');
    console.log(`   Total Orders: ${orders.length}`);
    console.log(`   Eligible for Review: ${orders.filter(o => o.isPaid && ['completed', 'processing'].includes(o.paymentStatus) && o.status !== 'Cancelled').length}`);
    console.log(`   Existing Reviews: ${reviews.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testReviewEligibility();


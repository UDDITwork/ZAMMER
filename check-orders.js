// check-orders.js - Check if there are any orders in the database
const mongoose = require('./backend/node_modules/mongoose');
require('./backend/node_modules/dotenv').config();

const checkOrders = async () => {
  try {
    console.log('🔍 Checking database for orders...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Import Order model
    const Order = require('./backend/models/Order');
    
    // Count total orders
    const totalOrders = await Order.countDocuments();
    console.log(`📊 Total orders in database: ${totalOrders}`);
    
    if (totalOrders > 0) {
      // Get sample orders
      const sampleOrders = await Order.find().limit(5).select('_id orderNumber status createdAt');
      console.log('\n📋 Sample orders:');
      sampleOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. ID: ${order._id}`);
        console.log(`      Order Number: ${order.orderNumber || 'N/A'}`);
        console.log(`      Status: ${order.status || 'N/A'}`);
        console.log(`      Created: ${order.createdAt}`);
        console.log('');
      });
    } else {
      console.log('❌ No orders found in database');
    }
    
    // Check for specific statuses
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('📊 Orders by status:');
    statusCounts.forEach(status => {
      console.log(`   ${status._id || 'No Status'}: ${status.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking orders:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
};

checkOrders();

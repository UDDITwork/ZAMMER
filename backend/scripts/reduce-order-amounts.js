#!/usr/bin/env node

/**
 * 📉 Reduce Order Amounts Script
 * 
 * Reduces the main order amount (items price) to approximately ₹50 for testing purposes.
 * Preserves delivery fees and recalculates total price accordingly.
 * 
 * Usage:
 *   node scripts/reduce-order-amounts.js
 * 
 * This script will:
 * 1. Find orders: ORD-20251122-002 and ORD-20251122-003
 * 2. Calculate current items price (sum of orderItems price * quantity)
 * 3. Reduce item prices proportionally to make items price = ₹50
 * 4. Adjust tax price to be minimal (5% of items price = ₹2.5)
 * 5. Recalculate totalPrice = itemsPrice + taxPrice + shippingPrice + deliveryFees.totalFee
 * 6. Keep deliveryFees unchanged
 */

const path = require('path');
const mongoose = require('mongoose');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const Order = require('../models/Order');

// Target order numbers to update
const TARGET_ORDER_NUMBERS = [
  'ORD-20251122-002',
  'ORD-20251122-003'
];

// Target items price (main order amount)
const TARGET_ITEMS_PRICE = 50;

// Tax rate (5% of items price)
const TAX_RATE = 0.05;

/**
 * Calculate current items price from order items
 */
const calculateItemsPrice = (orderItems) => {
  return orderItems.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
};

/**
 * Reduce order amounts to target price
 */
const reduceOrderAmount = async (order) => {
  console.log(`\n📦 Processing Order: ${order.orderNumber}`);
  console.log(`   Current Status: ${order.status}`);
  
  // Calculate current items price
  const currentItemsPrice = calculateItemsPrice(order.orderItems);
  console.log(`   Current Items Price: ₹${currentItemsPrice.toFixed(2)}`);
  
  // Get current delivery fees (to preserve)
  const deliveryFeesTotal = order.deliveryFees?.totalFee || 0;
  const currentShippingPrice = order.shippingPrice || 0;
  const currentTaxPrice = order.taxPrice || 0;
  const currentTotalPrice = order.totalPrice || 0;
  
  console.log(`   Current Tax Price: ₹${currentTaxPrice.toFixed(2)}`);
  console.log(`   Current Shipping Price: ₹${currentShippingPrice.toFixed(2)}`);
  console.log(`   Current Delivery Fees: ₹${deliveryFeesTotal.toFixed(2)}`);
  console.log(`   Current Total Price: ₹${currentTotalPrice.toFixed(2)}`);
  
  // Calculate reduction factor
  const reductionFactor = TARGET_ITEMS_PRICE / currentItemsPrice;
  console.log(`   Reduction Factor: ${reductionFactor.toFixed(4)}`);
  
  // Reduce each order item's price proportionally
  order.orderItems.forEach((item, index) => {
    const oldPrice = item.price;
    item.price = Math.round((item.price * reductionFactor) * 100) / 100; // Round to 2 decimal places
    console.log(`   Item ${index + 1} (${item.name}): ₹${oldPrice.toFixed(2)} → ₹${item.price.toFixed(2)}`);
  });
  
  // Calculate new items price (should be close to target)
  const newItemsPrice = calculateItemsPrice(order.orderItems);
  console.log(`   New Items Price: ₹${newItemsPrice.toFixed(2)}`);
  
  // Calculate new tax price (5% of items price)
  const newTaxPrice = Math.round((newItemsPrice * TAX_RATE) * 100) / 100;
  order.taxPrice = newTaxPrice;
  console.log(`   New Tax Price: ₹${newTaxPrice.toFixed(2)}`);
  
  // Keep shipping price and delivery fees unchanged
  // Recalculate total price
  const newTotalPrice = Math.round((newItemsPrice + newTaxPrice + currentShippingPrice + deliveryFeesTotal) * 100) / 100;
  order.totalPrice = newTotalPrice;
  
  console.log(`   New Total Price: ₹${newTotalPrice.toFixed(2)}`);
  console.log(`   (Items: ₹${newItemsPrice.toFixed(2)} + Tax: ₹${newTaxPrice.toFixed(2)} + Shipping: ₹${currentShippingPrice.toFixed(2)} + Delivery Fees: ₹${deliveryFeesTotal.toFixed(2)})`);
  
  // Save the order
  await order.save();
  console.log(`   ✅ Order updated successfully!`);
  
  return {
    orderNumber: order.orderNumber,
    oldItemsPrice: currentItemsPrice,
    newItemsPrice: newItemsPrice,
    oldTotalPrice: currentTotalPrice,
    newTotalPrice: newTotalPrice,
    deliveryFeesPreserved: deliveryFeesTotal
  };
};

/**
 * Main function to reduce order amounts
 */
const reduceOrderAmounts = async () => {
  console.log('🔧 Starting order amount reduction script...\n');
  console.log(`📋 Target Orders: ${TARGET_ORDER_NUMBERS.join(', ')}`);
  console.log(`💰 Target Items Price: ₹${TARGET_ITEMS_PRICE}`);
  console.log(`📊 Tax Rate: ${(TAX_RATE * 100)}%\n`);
  
  const results = [];
  
  for (const orderNumber of TARGET_ORDER_NUMBERS) {
    try {
      // Find the order
      const order = await Order.findOne({ orderNumber });
      
      if (!order) {
        console.log(`⚠️  Order ${orderNumber} not found. Skipping...`);
        continue;
      }
      
      // Reduce the order amount
      const result = await reduceOrderAmount(order);
      results.push(result);
      
    } catch (error) {
      console.error(`❌ Error processing order ${orderNumber}:`, error.message);
      console.error(error.stack);
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  if (results.length === 0) {
    console.log('⚠️  No orders were updated.');
  } else {
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Order ${result.orderNumber}:`);
      console.log(`   Items Price: ₹${result.oldItemsPrice.toFixed(2)} → ₹${result.newItemsPrice.toFixed(2)}`);
      console.log(`   Total Price: ₹${result.oldTotalPrice.toFixed(2)} → ₹${result.newTotalPrice.toFixed(2)}`);
      console.log(`   Delivery Fees Preserved: ₹${result.deliveryFeesPreserved.toFixed(2)}`);
    });
    
    console.log(`\n✅ Successfully updated ${results.length} order(s).`);
  }
  
  console.log('='.repeat(60));
};

/**
 * Main execution
 */
const main = async () => {
  try {
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set. Please check your .env file.');
    }
    
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Reduce order amounts
    await reduceOrderAmounts();
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    }
  }
};

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = reduceOrderAmounts;


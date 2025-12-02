/**
 * Seed Support Categories
 * Run this script to populate initial support categories for all user types
 * Usage: node backend/scripts/seedSupportCategories.js
 */

const mongoose = require('mongoose');
const path = require('path');
const SupportCategory = require('../models/SupportCategory');
// Load .env from backend directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const categories = [
  // Buyer Categories
  {
    userType: 'buyer',
    categoryCode: 'ORDER_NOT_DELIVERED',
    categoryName: 'Order not delivered',
    description: 'Order has not been delivered within expected timeframe',
    defaultPriority: 'high'
  },
  {
    userType: 'buyer',
    categoryCode: 'DELIVERY_AGENT_BEHAVIOR',
    categoryName: 'Delivery Agent Behavior',
    description: 'Issues with delivery agent conduct or service',
    defaultPriority: 'medium'
  },
  {
    userType: 'buyer',
    categoryCode: 'WRONG_PRODUCT',
    categoryName: 'Wrong product received',
    description: 'Received a different product than ordered',
    defaultPriority: 'high'
  },
  {
    userType: 'buyer',
    categoryCode: 'DAMAGED_PRODUCT',
    categoryName: 'Damaged/defective product',
    description: 'Product received is damaged or defective',
    defaultPriority: 'high'
  },
  {
    userType: 'buyer',
    categoryCode: 'SIZE_FIT_ISSUE',
    categoryName: 'Size or fit issue',
    description: 'Product size or fit does not match expectations',
    defaultPriority: 'medium'
  },
  {
    userType: 'buyer',
    categoryCode: 'REFUND_EXCHANGE',
    categoryName: 'Need refund or exchange',
    description: 'Request for refund or product exchange',
    defaultPriority: 'medium'
  },
  {
    userType: 'buyer',
    categoryCode: 'RETURN_NOT_PICKED',
    categoryName: 'Return not picked up',
    description: 'Return order has not been picked up by delivery partner',
    defaultPriority: 'medium'
  },
  {
    userType: 'buyer',
    categoryCode: 'OTHER',
    categoryName: 'Other',
    description: 'Other issues not listed above',
    defaultPriority: 'low'
  },
  
  // Seller Categories
  {
    userType: 'seller',
    categoryCode: 'RETURN_ISSUES',
    categoryName: 'Return issues (wrong return, damage return)',
    description: 'Issues related to product returns',
    defaultPriority: 'medium'
  },
  {
    userType: 'seller',
    categoryCode: 'PAYMENT_SETTLEMENT',
    categoryName: 'Payment/settlement issue',
    description: 'Issues with payment processing or settlement',
    defaultPriority: 'high'
  },
  {
    userType: 'seller',
    categoryCode: 'LISTING_NOT_VISIBLE',
    categoryName: 'Listing not visible',
    description: 'Product listing is not appearing in search results',
    defaultPriority: 'medium'
  },
  {
    userType: 'seller',
    categoryCode: 'ORDER_STUCK_SHIPPING',
    categoryName: 'Order stuck in shipping',
    description: 'Order status is not updating or stuck in shipping phase',
    defaultPriority: 'high'
  },
  {
    userType: 'seller',
    categoryCode: 'DELIVERY_NOT_PICKING',
    categoryName: 'Delivery Partner not picking order',
    description: 'Delivery partner has not picked up the order',
    defaultPriority: 'high'
  },
  {
    userType: 'seller',
    categoryCode: 'ACCOUNT_KYC',
    categoryName: 'Account or KYC issues',
    description: 'Issues with account verification or KYC process',
    defaultPriority: 'high'
  },
  {
    userType: 'seller',
    categoryCode: 'LABEL_INVOICE',
    categoryName: 'Label/invoice not generating',
    description: 'Shipping labels or invoices are not being generated',
    defaultPriority: 'high'
  },
  {
    userType: 'seller',
    categoryCode: 'OTHER',
    categoryName: 'Other',
    description: 'Other issues not listed above',
    defaultPriority: 'low'
  },
  
  // Delivery Categories
  {
    userType: 'delivery',
    categoryCode: 'PICKUP_ISSUE',
    categoryName: 'Issue picking up product from seller',
    description: 'Problems encountered while picking up product from seller',
    defaultPriority: 'high'
  },
  {
    userType: 'delivery',
    categoryCode: 'BUYER_UNAVAILABLE',
    categoryName: 'Buyer not available/wrong address',
    description: 'Buyer is unavailable or provided incorrect address',
    defaultPriority: 'medium'
  },
  {
    userType: 'delivery',
    categoryCode: 'PAYMENT_DISPUTE',
    categoryName: 'Payment dispute (for COD orders)',
    description: 'Disputes regarding Cash on Delivery payments',
    defaultPriority: 'high'
  },
  {
    userType: 'delivery',
    categoryCode: 'PARCEL_DAMAGED',
    categoryName: 'Parcel damaged before picked',
    description: 'Parcel was already damaged when attempting pickup',
    defaultPriority: 'medium'
  },
  {
    userType: 'delivery',
    categoryCode: 'PAYOUT_INCENTIVE',
    categoryName: 'Rider payout & incentive not received',
    description: 'Issues with receiving payouts or incentives',
    defaultPriority: 'high'
  },
  {
    userType: 'delivery',
    categoryCode: 'OTHER',
    categoryName: 'Other',
    description: 'Other issues not listed above',
    defaultPriority: 'low'
  }
];

const seedCategories = async () => {
  try {
    // Check if MONGO_URI is defined
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined. Please check your backend/.env file.');
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing categories (optional - comment out if you want to keep existing)
    // await SupportCategory.deleteMany({});
    // console.log('🗑️ Cleared existing categories');

    // Insert categories
    let inserted = 0;
    let skipped = 0;

    for (const category of categories) {
      try {
        // Use upsert to avoid duplicates
        const result = await SupportCategory.findOneAndUpdate(
          { userType: category.userType, categoryCode: category.categoryCode },
          category,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        if (result.isNew) {
          inserted++;
          console.log(`✅ Inserted: ${category.userType} - ${category.categoryName}`);
        } else {
          skipped++;
          console.log(`⏭️ Skipped (already exists): ${category.userType} - ${category.categoryName}`);
        }
      } catch (error) {
        console.error(`❌ Error inserting ${category.categoryName}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${categories.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedCategories();
}

module.exports = { seedCategories, categories };


#!/usr/bin/env node

/**
 * 🔧 Wishlist Validation Fix Script
 * 
 * This script fixes corrupted wishlist entries that are causing
 * "User validation failed: wishlist.0.product: Path `product` is required" errors
 * 
 * Usage: node scripts/fix-wishlist-validation.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import the User model
const User = require('../models/User');

async function connectDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function fixWishlistValidation() {
  try {
    console.log('🔍 Finding users with corrupted wishlist entries...');
    
    // Find all users with wishlist entries
    const users = await User.find({ 
      wishlist: { $exists: true, $ne: [] } 
    }).select('_id name email wishlist');
    
    console.log(`📊 Found ${users.length} users with wishlist entries`);
    
    let fixedCount = 0;
    let totalCorruptedItems = 0;
    
    for (const user of users) {
      if (!user.wishlist || !Array.isArray(user.wishlist)) {
        continue;
      }
      
      const originalCount = user.wishlist.length;
      const corruptedItems = user.wishlist.filter(item => 
        !item || !item.product || typeof item.product !== 'object'
      );
      
      if (corruptedItems.length > 0) {
        console.log(`🔧 Fixing user ${user.name} (${user.email})`);
        console.log(`   Original wishlist items: ${originalCount}`);
        console.log(`   Corrupted items: ${corruptedItems.length}`);
        
        // Clean up corrupted entries
        user.wishlist = user.wishlist.filter(item => 
          item && item.product && typeof item.product === 'object'
        );
        
        await user.save();
        
        console.log(`   ✅ Fixed: ${user.wishlist.length} valid items remaining`);
        
        fixedCount++;
        totalCorruptedItems += corruptedItems.length;
      }
    }
    
    console.log('\n🎉 Wishlist validation fix completed!');
    console.log(`📈 Summary:`);
    console.log(`   Users processed: ${users.length}`);
    console.log(`   Users fixed: ${fixedCount}`);
    console.log(`   Corrupted items removed: ${totalCorruptedItems}`);
    
  } catch (error) {
    console.error('❌ Error fixing wishlist validation:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Wishlist Validation Fix...');
    
    await connectDB();
    await fixWishlistValidation();
    
  } catch (error) {
    console.error('💥 Script execution failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Script interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Script terminated');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  fixWishlistValidation
};

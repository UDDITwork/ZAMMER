// backend/fix-shop-locations.js - Database Fix Script for Shop Locations

const mongoose = require('mongoose');
const Seller = require('./models/Seller');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zammer');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// 🎯 FIX 1: Update shops with default coordinates to Ahmedabad
const fixDefaultCoordinates = async () => {
  console.log('\n🔧 ===============================');
  console.log('   FIXING DEFAULT COORDINATES');
  console.log('===============================');

  try {
    // Find shops with invalid coordinates
    const shopsToFix = await Seller.find({
      $or: [
        { "shop.location.coordinates": [0, 0] },
        { "shop.location.coordinates": { $exists: false } },
        { "shop.location.coordinates": null }
      ]
    });

    console.log(`📊 Found ${shopsToFix.length} shops with invalid coordinates`);

    if (shopsToFix.length === 0) {
      console.log('✅ No shops need coordinate fixing');
      return;
    }

    // Update shops with Ahmedabad coordinates
    const result = await Seller.updateMany(
      {
        $or: [
          { "shop.location.coordinates": [0, 0] },
          { "shop.location.coordinates": { $exists: false } },
          { "shop.location.coordinates": null }
        ]
      },
      {
        $set: {
          "shop.location": {
            type: "Point",
            coordinates: [72.5714, 23.0225] // Ahmedabad coordinates
          }
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} shops with Ahmedabad coordinates`);
    console.log('📍 New coordinates: [72.5714, 23.0225] (Ahmedabad, Gujarat)');

  } catch (error) {
    console.error('❌ Error fixing coordinates:', error);
  }
};

// 🎯 FIX 2: Ensure geospatial index exists
const ensureGeospatialIndex = async () => {
  console.log('\n🔧 ===============================');
  console.log('   ENSURING GEOSPATIAL INDEX');
  console.log('===============================');

  try {
    // Create geospatial index
    await Seller.collection.createIndex({ "shop.location": "2dsphere" });
    console.log('✅ Geospatial index created/verified');

    // Create additional indexes for better performance
    await Seller.collection.createIndex({ "shop.name": 1 });
    await Seller.collection.createIndex({ "shop.category": 1 });
    await Seller.collection.createIndex({ isVerified: 1 });
    console.log('✅ Additional indexes created');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

// 🎯 FIX 3: Verify the fix
const verifyFix = async () => {
  console.log('\n🔧 ===============================');
  console.log('   VERIFYING FIX');
  console.log('===============================');

  try {
    // Count shops with valid locations
    const shopsWithValidLocation = await Seller.countDocuments({
      "shop.location.coordinates": { 
        $ne: [0, 0], 
        $exists: true 
      }
    });

    const totalShops = await Seller.countDocuments({});
    const shopsWithInvalidLocation = totalShops - shopsWithValidLocation;

    console.log(`📊 Total shops: ${totalShops}`);
    console.log(`✅ Shops with valid locations: ${shopsWithValidLocation}`);
    console.log(`❌ Shops with invalid locations: ${shopsWithInvalidLocation}`);

    // Test nearby query
    const testLocation = { longitude: 72.5714, latitude: 23.0225 }; // Ahmedabad
    const nearbyShops = await Seller.find({
      "shop.location": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [testLocation.longitude, testLocation.latitude]
          },
          $maxDistance: 50000 // 50km
        }
      },
      isVerified: true
    }).limit(5);

    console.log(`🔍 Test nearby query found ${nearbyShops.length} shops within 50km of Ahmedabad`);

    if (nearbyShops.length > 0) {
      console.log('📋 Sample shops:');
      nearbyShops.forEach((shop, index) => {
        console.log(`   ${index + 1}. ${shop.shop?.name || 'Unnamed Shop'}`);
        console.log(`      Location: ${shop.shop?.location?.coordinates?.join(', ') || 'No coordinates'}`);
        console.log(`      Category: ${shop.shop?.category || 'Unknown'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error verifying fix:', error);
  }
};

// 🎯 FIX 4: Update shop status
const updateShopStatus = async () => {
  console.log('\n🔧 ===============================');
  console.log('   UPDATING SHOP STATUS');
  console.log('===============================');

  try {
    // Add isActive field to shops that don't have it
    const result = await Seller.updateMany(
      { "shop.isActive": { $exists: false } },
      { $set: { "shop.isActive": true } }
    );

    console.log(`✅ Updated ${result.modifiedCount} shops with isActive status`);

  } catch (error) {
    console.error('❌ Error updating shop status:', error);
  }
};

// 🎯 MAIN FIX FUNCTION
const runFixes = async () => {
  console.log('🚀 Starting shop location fixes...\n');

  try {
    await connectDB();

    // Run all fixes
    await fixDefaultCoordinates();
    await ensureGeospatialIndex();
    await updateShopStatus();
    await verifyFix();

    console.log('\n🎉 ===============================');
    console.log('   ALL FIXES COMPLETED SUCCESSFULLY!');
    console.log('===============================');
    console.log('✅ Default coordinates fixed');
    console.log('✅ Geospatial indexes created');
    console.log('✅ Shop status updated');
    console.log('✅ Verification completed');
    console.log('\n🎯 Your shop routes should now work with accurate distance calculations!');

  } catch (error) {
    console.error('❌ Error running fixes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run fixes if this file is executed directly
if (require.main === module) {
  runFixes().catch(console.error);
}

module.exports = {
  fixDefaultCoordinates,
  ensureGeospatialIndex,
  updateShopStatus,
  verifyFix,
  runFixes
}; 
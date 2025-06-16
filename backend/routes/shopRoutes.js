const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');

// @desc    Get ALL shops from database (NO RESTRICTIONS)
// @route   GET /api/shops/nearby
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    console.log('🏪 [ShopRoutes] ===== FETCHING ALL SHOPS =====');
    console.log('🏪 [ShopRoutes] Route hit: GET /api/shops/nearby');
    console.log('🏪 [ShopRoutes] Request query:', req.query);
    console.log('🏪 [ShopRoutes] Request headers:', {
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers.authorization ? 'Present' : 'Not present'
    });
    
    // 🎯 FIXED: Get ALL sellers with shop data - NO CONDITIONS
    console.log('🏪 [ShopRoutes] Executing database query...');
    
    const sellers = await Seller.find({
      // 🎯 CRITICAL: Only check if shop.name exists - that's it!
      'shop.name': { $exists: true, $ne: null, $ne: '' }
    })
    .select(`
      _id
      firstName 
      email
      shop.name 
      shop.description 
      shop.category 
      shop.location 
      shop.images 
      shop.mainImage 
      shop.openTime 
      shop.closeTime 
      shop.phoneNumber 
      shop.address 
      shop.gstNumber
      shop.workingDays
      averageRating 
      numReviews 
      createdAt
      updatedAt
    `)
    .sort({ 'shop.name': 1 });
    
    console.log(`🏪 [ShopRoutes] Database query completed`);
    console.log(`🏪 [ShopRoutes] Found ${sellers.length} sellers with shops`);
    
    // 🎯 DEBUGGING: Log each shop found
    if (sellers.length > 0) {
      console.log('🏪 [ShopRoutes] Shop details:');
      sellers.forEach((seller, index) => {
        console.log(`   ${index + 1}. ${seller.shop?.name || 'NO NAME'} (ID: ${seller._id})`);
        console.log(`      - Category: ${seller.shop?.category || 'No category'}`);
        console.log(`      - Address: ${seller.shop?.address || 'No address'}`);
        console.log(`      - Images: ${seller.shop?.images?.length || 0} images`);
        console.log(`      - Location: ${seller.shop?.location ? 'Has location' : 'No location'}`);
      });
      
      // Sample shop data for debugging
      console.log('📊 [ShopRoutes] Sample shop data:', {
        sellerId: sellers[0]._id,
        name: sellers[0].shop?.name,
        hasLocation: !!sellers[0].shop?.location,
        hasImages: !!sellers[0].shop?.images?.length,
        imagesArray: sellers[0].shop?.images || [],
        category: sellers[0].shop?.category,
        address: sellers[0].shop?.address
      });
    } else {
      console.log('⚠️ [ShopRoutes] NO SHOPS FOUND IN DATABASE!');
      
      // 🎯 DEBUGGING: Check if ANY sellers exist
      const totalSellers = await Seller.countDocuments();
      console.log(`🔍 [ShopRoutes] Total sellers in database: ${totalSellers}`);
      
      if (totalSellers > 0) {
        // Check sellers without shop names
        const sellersWithoutShopName = await Seller.find({
          $or: [
            { 'shop.name': { $exists: false } },
            { 'shop.name': null },
            { 'shop.name': '' }
          ]
        }).select('_id firstName email shop');
        
        console.log(`🔍 [ShopRoutes] Sellers without shop name: ${sellersWithoutShopName.length}`);
        if (sellersWithoutShopName.length > 0) {
          console.log('🔍 [ShopRoutes] Sample sellers without shop name:', 
            sellersWithoutShopName.slice(0, 3).map(s => ({
              id: s._id,
              name: s.firstName,
              email: s.email,
              shopName: s.shop?.name || 'MISSING'
            }))
          );
        }
      }
    }
    
    // 🎯 ALWAYS return success with data (even if empty)
    const response = {
      success: true,
      count: sellers.length,
      data: sellers,
      message: sellers.length > 0 
        ? `Found ${sellers.length} shops` 
        : 'No shops found with valid shop names',
      timestamp: new Date().toISOString(),
      debug: {
        queryUsed: "{ 'shop.name': { $exists: true, $ne: null, $ne: '' } }",
        totalCount: sellers.length
      }
    };
    
    console.log('📤 [ShopRoutes] Sending response:', {
      success: response.success,
      count: response.count,
      dataLength: response.data.length,
      message: response.message
    });
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ [ShopRoutes] Critical error fetching shops:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({
      success: false,
      message: 'Server Error while fetching shops',
      error: error.message,
      timestamp: new Date().toISOString(),
      debug: {
        route: '/api/shops/nearby',
        method: 'GET'
      }
    });
  }
});

// 🎯 DEBUGGING ENDPOINT: Get ALL sellers (for debugging)
router.get('/debug/all-sellers', async (req, res) => {
  try {
    console.log('🔍 [ShopRoutes] DEBUG: Fetching ALL sellers...');
    
    const allSellers = await Seller.find({})
      .select('_id firstName email shop')
      .limit(10); // Limit for safety
    
    const sellersWithShops = await Seller.countDocuments({
      'shop.name': { $exists: true, $ne: null, $ne: '' }
    });
    
    const totalSellers = await Seller.countDocuments();
    
    res.json({
      success: true,
      debug: true,
      stats: {
        totalSellers,
        sellersWithShops,
        sellersWithoutShops: totalSellers - sellersWithShops
      },
      sampleSellers: allSellers.map(seller => ({
        id: seller._id,
        name: seller.firstName,
        email: seller.email,
        hasShop: !!seller.shop,
        shopName: seller.shop?.name || 'NO SHOP NAME',
        shopCategory: seller.shop?.category || 'NO CATEGORY'
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 
// backend/routes/shopRoutes.js - Production-Ready Shop Routes with Distance Calculation

const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');
const locationService = require('../utils/locationUtils');

// 🎯 LOGGING UTILITIES
const logShopRequest = (action, data) => {
  const timestamp = new Date().toISOString();
  console.log(`🏪 [SHOP-ROUTES] ${timestamp} | ${action} | ${JSON.stringify(data)}`);
};

const logShopError = (action, error, additionalData = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`❌ [SHOP-ROUTES-ERROR] ${timestamp} | ${action} | Error: ${error.message} | Data: ${JSON.stringify(additionalData)}`);
};

// 🎯 GET ALL SHOPS (with distance calculation)
// @desc    Get all shops with optional distance calculation
// @route   GET /api/shops
// @access  Public
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    logShopRequest('GET_ALL_SHOPS', { query: req.query });
    
    const { lat, lng, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {
      isVerified: true,
      "shop.isActive": true,
      "shop.name": { $exists: true, $ne: null, $ne: '' }
    };
    
    // Add location-based query if coordinates provided
    if (lat && lng) {
      const userLocation = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
      const validation = locationService.validateCoordinates(userLocation.longitude, userLocation.latitude);
      
      if (validation.isValid) {
        query = {
          ...query,
          "shop.location": {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [validation.longitude, validation.latitude]
              },
              $maxDistance: 50000000 // 50000km in meters
            }
          }
        };
        logShopRequest('LOCATION_BASED_QUERY', { userLocation, validation });
      } else {
        logShopError('INVALID_COORDINATES', new Error(validation.error), { userLocation });
      }
    }
    
    // Execute query
    const sellers = await Seller.find(query)
      .select(`
        _id firstName email shop.name shop.description shop.category 
        shop.location shop.images shop.mainImage shop.openTime shop.closeTime 
        shop.phoneNumber shop.address shop.gstNumber shop.workingDays
        averageRating numReviews createdAt updatedAt
      `)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    logShopRequest('QUERY_RESULTS', { 
      found: sellers.length, 
      processingTime: `${Date.now() - startTime}ms` 
    });
    
    // Calculate distances if coordinates provided
    let shopsWithDistances = sellers;
    if (lat && lng) {
      const userLocation = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
      shopsWithDistances = locationService.sortShopsByDistance(sellers, userLocation);
      logShopRequest('DISTANCE_CALCULATION_COMPLETE', { 
        shopsProcessed: shopsWithDistances.length 
      });
    }
    
    // Get total count for pagination
    const totalShops = await Seller.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: shopsWithDistances,
      count: shopsWithDistances.length,
      totalShops,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalShops / limit),
        hasNext: page * limit < totalShops,
        hasPrev: page > 1
      },
      userLocation: lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : null,
      processingTime: `${Date.now() - startTime}ms`
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logShopError('GET_ALL_SHOPS_FAILED', error, { processingTime: `${processingTime}ms` });
    
    res.status(500).json({
      success: false,
      message: 'Error fetching shops',
      error: error.message,
      processingTime: `${processingTime}ms`
    });
  }
});

// 🎯 GET NEARBY SHOPS (Production-Grade)
// @desc    Get shops within specified distance
// @route   GET /api/shops/nearby
// @access  Public
router.get('/nearby', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { lat, lng, maxDistance = 50000, limit = 20 } = req.query;
    
    logShopRequest('NEARBY_SHOPS_REQUEST', { lat, lng, maxDistance, limit });
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required for nearby search'
      });
    }
    
    const userLocation = { 
      latitude: parseFloat(lat), 
      longitude: parseFloat(lng) 
    };
    
    const validation = locationService.validateCoordinates(userLocation.longitude, userLocation.latitude);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided',
        error: validation.error
      });
    }
    
    // Create geospatial query
    const nearbyQuery = locationService.createNearbyQuery(userLocation, parseInt(maxDistance));
    
    logShopRequest('NEARBY_QUERY_CREATED', { 
      userLocation, 
      maxDistance: `${maxDistance}km`,
      query: nearbyQuery 
    });
    
    // Execute query with geospatial index
    const sellers = await Seller.find(nearbyQuery)
      .select(`
        _id firstName email shop.name shop.description shop.category 
        shop.location shop.images shop.mainImage shop.openTime shop.closeTime 
        shop.phoneNumber shop.address shop.gstNumber shop.workingDays
        averageRating numReviews createdAt updatedAt
      `)
      .limit(parseInt(limit))
      .lean();
    
    logShopRequest('NEARBY_QUERY_RESULTS', { 
      found: sellers.length, 
      processingTime: `${Date.now() - startTime}ms` 
    });
    
    // Calculate exact distances and sort
    const shopsWithDistances = locationService.sortShopsByDistance(sellers, userLocation);
    
    // Filter by max distance (additional safety check)
    const filteredShops = shopsWithDistances.filter(shop => 
      shop.distance <= parseInt(maxDistance)
    );
    
    logShopRequest('NEARBY_SHOPS_FINAL', { 
      totalFound: sellers.length,
      withinDistance: filteredShops.length,
      maxDistance: `${maxDistance}km`
    });
    
    res.status(200).json({
      success: true,
      data: filteredShops,
      count: filteredShops.length,
      userLocation,
      searchRadius: `${maxDistance}km`,
      processingTime: `${Date.now() - startTime}ms`,
      stats: {
        totalShopsFound: sellers.length,
        shopsWithinRadius: filteredShops.length,
        averageDistance: filteredShops.length > 0 
          ? (filteredShops.reduce((sum, shop) => sum + shop.distance, 0) / filteredShops.length).toFixed(2)
          : 0
      }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logShopError('NEARBY_SHOPS_FAILED', error, { processingTime: `${processingTime}ms` });
    
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby shops',
      error: error.message,
      processingTime: `${processingTime}ms`
    });
  }
});

// 🎯 GET SHOP BY ID (with distance calculation)
// @desc    Get specific shop by ID
// @route   GET /api/shops/:id
// @access  Public
router.get('/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { lat, lng } = req.query;
    
    logShopRequest('GET_SHOP_BY_ID', { shopId: id, userLocation: lat && lng ? { lat, lng } : null });
    
    const seller = await Seller.findById(id)
      .select(`
        _id firstName email shop.name shop.description shop.category 
        shop.location shop.images shop.mainImage shop.openTime shop.closeTime 
        shop.phoneNumber shop.address shop.gstNumber shop.workingDays
        averageRating numReviews createdAt updatedAt
      `)
      .lean();
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }
    
    let shopData = seller;
    
    // Calculate distance if user location provided
    if (lat && lng && seller.shop?.location?.coordinates) {
      const userLocation = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
      const distanceResult = locationService.calculateDistance(
        [userLocation.longitude, userLocation.latitude],
        seller.shop.location.coordinates
      );
      
      shopData = {
        ...seller,
        distance: distanceResult.distance,
        distanceText: distanceResult.distanceText,
        isAccurate: distanceResult.isAccurate
      };
      
      logShopRequest('DISTANCE_CALCULATED', { 
        shopId: id, 
        distance: distanceResult.distanceText,
        isAccurate: distanceResult.isAccurate 
      });
    }
    
    res.status(200).json({
      success: true,
      data: shopData,
      userLocation: lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : null,
      processingTime: `${Date.now() - startTime}ms`
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logShopError('GET_SHOP_BY_ID_FAILED', error, { processingTime: `${processingTime}ms` });
    
    res.status(500).json({
      success: false,
      message: 'Error fetching shop',
      error: error.message,
      processingTime: `${processingTime}ms`
    });
  }
});

// 🎯 TEST DISTANCE CALCULATION
// @desc    Test distance calculation for a specific shop
// @route   GET /api/shops/test-distance/:shopId
// @access  Public
router.get('/test-distance/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide lat and lng query parameters'
      });
    }

    const shop = await Seller.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const userLocation = { longitude: parseFloat(lng), latitude: parseFloat(lat) };
    const distance = locationService.calculateDistance(
      [userLocation.longitude, userLocation.latitude],
      shop.shop.location.coordinates
    );

    res.json({
      success: true,
      data: {
        shopName: shop.shop.name,
        shopAddress: shop.shop.address,
        userLocation: `${lat}, ${lng}`,
        shopLocation: shop.shop.location.coordinates,
        distance: distance.distance,
        distanceText: distance.distanceText,
        isAccurate: distance.distance < 1000 // Should be less than 1000km for Gujarat
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🎯 HEALTH CHECK
// @desc    Check shop service health
// @route   GET /api/shops/health
// @access  Public
router.get('/health', async (req, res) => {
  try {
    const stats = await locationService.getLocationStats(Seller);
    
    res.status(200).json({
      success: true,
      service: 'shopRoutes',
      timestamp: new Date().toISOString(),
      stats: {
        totalShops: stats.totalShops,
        shopsWithValidLocation: stats.shopsWithValidLocation,
        averageLatitude: stats.averageLatitude,
        averageLongitude: stats.averageLongitude
      },
      routes: {
        getAllShops: 'GET /api/shops',
        getNearbyShops: 'GET /api/shops/nearby?lat=&lng=&maxDistance=',
        getShopById: 'GET /api/shops/:id',
        testDistance: 'GET /api/shops/test-distance/:shopId?lat=&lng=',
        health: 'GET /api/shops/health'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'shopRoutes',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 ERROR HANDLING MIDDLEWARE
router.use((error, req, res, next) => {
  console.error('❌ [ShopRoutes] Error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Shop service error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
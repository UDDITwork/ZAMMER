// File: /backend/controllers/userController.js - CORRECTED with 50,000 KM Distance

const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

// Enhanced logging
const logUser = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '👤',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [USER-CONTROLLER] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, password, mobileNumber, location } = req.body;

    logUser('REGISTER_USER_START', { name, email, mobileNumber });

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Check if mobile number already exists
    const mobileExists = await User.findOne({ mobileNumber });
    if (mobileExists) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already registered'
      });
    }

    // Create user with location if provided
    const userData = {
      name,
      email,
      password,
      mobileNumber
    };

    // Add location if provided
    if (location && location.coordinates && location.coordinates.length === 2) {
      userData.location = {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address || ''
      };
    }

    const user = await User.create(userData);

    logUser('USER_REGISTERED_SUCCESS', {
        userId: user._id, 
      email: user.email,
      hasLocation: !!user.location?.coordinates?.length
    }, 'success');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        location: user.location,
        token: generateToken(user._id)
      }
    });

  } catch (error) {
    logUser('REGISTER_USER_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Server error during user registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    logUser('LOGIN_USER_START', { email });

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    logUser('USER_LOGIN_SUCCESS', {
      userId: user._id,
      email: user.email
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      location: user.location,
        wishlist: user.wishlist,
        token: generateToken(user._id)
      }
    });

  } catch (error) {
    logUser('LOGIN_USER_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    logUser('GET_USER_PROFILE_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { name, email, mobileNumber, location } = req.body;

    logUser('UPDATE_USER_PROFILE_START', {
      userId: req.user._id,
      updates: Object.keys(req.body)
    });
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    
    // Update location if provided
    if (location) {
      if (location.coordinates && location.coordinates.length === 2) {
        user.location = {
          type: 'Point',
          coordinates: location.coordinates,
          address: location.address || user.location?.address || ''
        };
        logUser('USER_LOCATION_UPDATED', {
          userId: user._id,
          coordinates: location.coordinates,
          address: location.address
        }, 'success');
      }
    }

    const updatedUser = await user.save();

    logUser('USER_PROFILE_UPDATED_SUCCESS', {
      userId: updatedUser._id,
      hasLocation: !!updatedUser.location?.coordinates?.length
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobileNumber,
        location: updatedUser.location,
        wishlist: updatedUser.wishlist
      }
    });

  } catch (error) {
    logUser('UPDATE_USER_PROFILE_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error updating user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🎯 FIXED: Get nearby shops based on user location with 50,000 KM radius
// @desc    Get nearby shops
// @route   GET /api/users/nearby-shops
// @access  Public (but better with auth for location)
const getNearbyShops = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // 🔥 MAIN FIX: Changed default from 50000 to 50000000 (50,000 km in meters)
    const { lat, lng, maxDistance = 50000000, limit = 50 } = req.query;
    let userLocation = null;

    logUser('GET_NEARBY_SHOPS_START', {
      queryParams: { lat, lng, maxDistance: `${maxDistance} meters (${maxDistance/1000} km)`, limit },
      hasAuthUser: !!req.user,
      userId: req.user?._id
    });

    // Try to get user location from multiple sources
    if (req.user) {
      // 1. First try from authenticated user's saved location
      const user = await User.findById(req.user._id).select('location');
      if (user?.location?.coordinates?.length === 2) {
        userLocation = {
          longitude: user.location.coordinates[0],
          latitude: user.location.coordinates[1],
          address: user.location.address || 'Saved location'
        };
        logUser('USER_LOCATION_FROM_DB', userLocation);
      }
    }

    // 2. Override with query parameters if provided
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        userLocation = { latitude, longitude, address: 'Current location' };
        logUser('USER_LOCATION_FROM_QUERY', userLocation);
      }
    }

    // 3. If no location available, return all shops without distance
    if (!userLocation) {
      logUser('NO_USER_LOCATION_AVAILABLE', null, 'warning');
      
        const shops = await Seller.find({ 
        isVerified: true,
        "shop.name": { $exists: true, $ne: null, $ne: '' }
      })
      .select(`
        _id firstName email shop.name shop.description shop.category 
        shop.location shop.images shop.mainImage shop.openTime shop.closeTime 
        shop.phoneNumber shop.address shop.gstNumber shop.workingDays
        averageRating numReviews createdAt updatedAt
      `)
      .limit(parseInt(limit))
      .lean();

      logUser('RETURNING_ALL_SHOPS_NO_LOCATION', { count: shops.length });
        
        return res.status(200).json({
          success: true,
        data: shops,
          count: shops.length,
        userLocation: null,
        message: `All available shops (location not provided) - ${shops.length} shops found`,
        processingTime: `${Date.now() - startTime}ms`
      });
    }

    // 4. Validate coordinates
    if (userLocation.latitude < -90 || userLocation.latitude > 90 ||
        userLocation.longitude < -180 || userLocation.longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // 5. Create MongoDB geospatial query
    // 🔥 SECOND FIX: Use maxDistance directly (already in meters)
    const nearbyQuery = {
      "shop.location": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [userLocation.longitude, userLocation.latitude]
          },
          $maxDistance: parseInt(maxDistance) // Already in meters (50,000,000 = 50,000 km)
        }
      },
      isVerified: true,
      "shop.name": { $exists: true, $ne: null, $ne: '' }
    };

    logUser('MONGODB_GEOSPATIAL_QUERY', {
      userCoordinates: [userLocation.longitude, userLocation.latitude],
      maxDistanceKm: `${maxDistance/1000} km`,
      maxDistanceMeters: parseInt(maxDistance),
      queryObject: JSON.stringify(nearbyQuery, null, 2)
    });

    // 6. Execute geospatial query
    const sellers = await Seller.find(nearbyQuery)
      .select(`
        _id firstName email shop.name shop.description shop.category 
        shop.location shop.images shop.mainImage shop.openTime shop.closeTime 
        shop.phoneNumber shop.address shop.gstNumber shop.workingDays
        averageRating numReviews createdAt updatedAt
      `)
      .limit(parseInt(limit))
      .lean();

    logUser('MONGODB_QUERY_RESULTS', {
      shopsFound: sellers.length,
      processingTime: `${Date.now() - startTime}ms`
    });

    // 7. If no shops found with geospatial query, try to get all shops and calculate distances
    if (sellers.length === 0) {
      logUser('NO_SHOPS_IN_GEOSPATIAL_QUERY_TRYING_ALL_SHOPS', null, 'warning');
      
      const allShops = await Seller.find({
        isVerified: true,
        "shop.name": { $exists: true, $ne: null, $ne: '' }
      })
      .select(`
        _id firstName email shop.name shop.description shop.category 
        shop.location shop.images shop.mainImage shop.openTime shop.closeTime 
        shop.phoneNumber shop.address shop.gstNumber shop.workingDays
        averageRating numReviews createdAt updatedAt
      `)
      .limit(parseInt(limit))
      .lean();

      logUser('ALL_SHOPS_FALLBACK', { totalShops: allShops.length });

      // Calculate distances for all shops and sort by distance
      const shopsWithDistances = allShops.map(shop => {
        if (!shop.shop?.location?.coordinates || 
            shop.shop.location.coordinates[0] === 0 || 
            shop.shop.location.coordinates[1] === 0) {
          return {
            ...shop,
            distance: 999999,
            distanceText: 'Location unavailable',
            isAccurate: false
          };
        }

        const distance = calculateHaversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          shop.shop.location.coordinates[1], // latitude
          shop.shop.location.coordinates[0]  // longitude
        );

        let distanceText;
        if (distance < 1) {
          distanceText = `${Math.round(distance * 1000)}m`;
        } else if (distance < 10) {
          distanceText = `${distance.toFixed(1)}km`;
        } else {
          distanceText = `${Math.round(distance)}km`;
        }

        return {
          ...shop,
          distance: distance,
          distanceText: distanceText,
          isAccurate: distance < 10000 // Less than 10,000 km is reasonable
        };
      }).sort((a, b) => a.distance - b.distance);
      
      return res.status(200).json({
        success: true,
        data: shopsWithDistances,
        count: shopsWithDistances.length,
        userLocation: userLocation,
        searchRadius: `${maxDistance/1000}km`,
        processingTime: `${Date.now() - startTime}ms`,
        message: `Showing all shops sorted by distance (fallback method)`,
        stats: {
          totalShopsFound: allShops.length,
          averageDistance: shopsWithDistances.length > 0 
            ? (shopsWithDistances.reduce((sum, shop) => sum + (shop.distance || 0), 0) / shopsWithDistances.length).toFixed(2)
            : 0
        }
      });
    }

    // 8. Calculate exact distances using Haversine formula for found shops
    const shopsWithDistances = sellers.map(shop => {
      if (!shop.shop?.location?.coordinates) {
        return {
          ...shop,
          distance: 999999,
          distanceText: 'Location unavailable',
          isAccurate: false
        };
      }

      const distance = calculateHaversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        shop.shop.location.coordinates[1], // latitude
        shop.shop.location.coordinates[0]  // longitude
      );

      let distanceText;
      if (distance < 1) {
        distanceText = `${Math.round(distance * 1000)}m`;
      } else if (distance < 10) {
        distanceText = `${distance.toFixed(1)}km`;
      } else {
        distanceText = `${Math.round(distance)}km`;
      }

      return {
        ...shop,
        distance: distance,
        distanceText: distanceText,
        isAccurate: distance < 10000 // Less than 10,000 km is reasonable
      };
    });

    // 9. Sort by distance (should already be sorted by MongoDB, but ensure)
    shopsWithDistances.sort((a, b) => a.distance - b.distance);

    logUser('NEARBY_SHOPS_SUCCESS', {
      shopsReturned: shopsWithDistances.length,
      userLocation: userLocation,
      processingTime: `${Date.now() - startTime}ms`,
      nearestShop: shopsWithDistances[0] ? {
        name: shopsWithDistances[0].shop?.name,
        distance: shopsWithDistances[0].distanceText
      } : null
    }, 'success');
    
    res.status(200).json({
      success: true,
      data: shopsWithDistances,
      count: shopsWithDistances.length,
      userLocation: userLocation,
      searchRadius: `${maxDistance/1000}km`,
      processingTime: `${Date.now() - startTime}ms`,
      stats: {
        totalShopsFound: sellers.length,
        averageDistance: shopsWithDistances.length > 0 
          ? (shopsWithDistances.reduce((sum, shop) => sum + (shop.distance || 0), 0) / shopsWithDistances.length).toFixed(2)
          : 0
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logUser('GET_NEARBY_SHOPS_ERROR', {
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`
    }, 'error');

      res.status(500).json({
        success: false,
      message: 'Error fetching nearby shops',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      processingTime: `${processingTime}ms`
    });
  }
};

// 🎯 Haversine Distance Calculation Function
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return parseFloat(distance.toFixed(2));
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'wishlist',
        populate: {
          path: 'seller',
          select: 'shop.name'
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user.wishlist
    });

  } catch (error) {
    logUser('GET_WISHLIST_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error fetching wishlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist
// @access  Private
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if product already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    user.wishlist.push(productId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      data: user.wishlist
    });

  } catch (error) {
    logUser('ADD_TO_WISHLIST_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error adding to wishlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: user.wishlist
    });

  } catch (error) {
    logUser('REMOVE_FROM_WISHLIST_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error removing from wishlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Check if product is in wishlist
// @route   GET /api/users/wishlist/check/:productId
// @access  Private
const checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isInWishlist = user.wishlist.includes(productId);

    res.status(200).json({
      success: true,
      data: { isInWishlist }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking wishlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify email (placeholder)
// @route   POST /api/users/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
    res.status(200).json({
      success: true,
    message: 'Email verification feature coming soon'
  });
};

// @desc    Reset password (placeholder)
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Password reset feature coming soon'
  });
};

const verifyAllSellers = async (req, res) => {
  try {
    const result = await Seller.updateMany({}, {$set: {isVerified: true}});
    res.json({
      success: true,
      message: `${result.modifiedCount} sellers verified`,
      result: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Add this function before the module.exports line
const debugSellers = async (req, res) => {
  try {
    const sellers = await Seller.find({})
      .select('shop.name shop.location.coordinates isVerified')
      .limit(10);
    
    res.json({
      success: true,
      count: sellers.length,
      sellers: sellers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getNearbyShops,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  verifyEmail,
  resetPassword,
  debugSellers,
  verifyAllSellers
};
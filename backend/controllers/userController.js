const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, password, mobileNumber, location } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      mobileNumber,
      location
    });

    if (user) {
      // Generate JWT token
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          mobileNumber: user.mobileNumber,
          location: user.location,
          token
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Match password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        location: user.location,
        token
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
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
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields that are sent
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.mobileNumber) user.mobileNumber = req.body.mobileNumber;
    
    // Update location if sent
    if (req.body.location) {
      if (req.body.location.coordinates) {
        user.location.coordinates = req.body.location.coordinates;
      }
      if (req.body.location.address) {
        user.location.address = req.body.location.address;
      }
    }

    // Update password if sent
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobileNumber,
        location: updatedUser.location
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get shops near user location
// @route   GET /api/users/nearby-shops
// @access  Public (with optional authentication)
exports.getNearbyShops = async (req, res) => {
  try {
    // If user is not authenticated, return all shops or use default coordinates
    if (!req.isAuthenticated || !req.user) {
      // Return all shops without location-based filtering
      const shops = await Seller.find({})
        .select('-password -bankDetails')
        .limit(20);
      
      return res.status(200).json({
        success: true,
        count: shops.length,
        message: 'Showing all shops (location-based filtering requires login)',
        data: shops
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user || !user.location || !user.location.coordinates) {
      // Return all shops if user doesn't have location set
      const shops = await Seller.find({})
        .select('-password -bankDetails')
        .limit(20);
      
      return res.status(200).json({
        success: true,
        count: shops.length,
        message: 'User location not available, showing all shops',
        data: shops
      });
    }
    
    // Get user's coordinates
    const [longitude, latitude] = user.location.coordinates;
    
    // Find nearby shops using geospatial query (default 10km radius)
    const maxDistance = parseInt(req.query.distance) || 10000; // in meters
    
    const shops = await Seller.find({
      'shop.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    }).select('-password -bankDetails');
    
    res.status(200).json({
      success: true,
      count: shops.length,
      data: shops
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get user's wishlist
// @route   GET /api/users/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'wishlist',
        select: 'name images zammerPrice mrp category'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      count: user.wishlist.length,
      data: user.wishlist
    });
  } catch (error) {
    console.error('Error in getWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist
// @access  Private
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update user's wishlist
    const user = await User.findById(req.user._id);

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
      data: { product: productId }
    });
  } catch (error) {
    console.error('Error in addToWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Update user's wishlist
    const user = await User.findById(req.user._id);

    // Check if product in wishlist
    const index = user.wishlist.indexOf(productId);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }

    user.wishlist.splice(index, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: {}
    });
  } catch (error) {
    console.error('Error in removeFromWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Check if product is in wishlist
// @route   GET /api/users/wishlist/check/:productId
// @access  Private
exports.checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Get user's wishlist
    const user = await User.findById(req.user._id);

    // Check if product in wishlist
    const isInWishlist = user.wishlist.includes(productId);

    res.status(200).json({
      success: true,
      data: { isInWishlist }
    });
  } catch (error) {
    console.error('Error in checkWishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
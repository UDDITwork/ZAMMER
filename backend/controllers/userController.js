const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    console.log('👤 [UserRegister] Registration attempt started');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [UserRegister] Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { name, email, password, mobileNumber, location } = req.body;

    console.log('📝 [UserRegister] Processing registration for:', { 
      name, 
      email, 
      mobileNumber: mobileNumber?.substring(0, 3) + '***' 
    });

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('❌ [UserRegister] User already exists:', email);
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
      console.log('✅ [UserRegister] User created successfully:', { 
        userId: user._id, 
        userName: user.name 
      });

      // Generate JWT token
      const token = generateToken(user._id);
      console.log('🔑 [UserRegister] Token generated successfully');

      const responseData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        location: user.location,
        token
      };

      console.log('📤 [UserRegister] Sending success response');

      res.status(201).json({
        success: true,
        data: responseData
      });
    } else {
      console.log('❌ [UserRegister] Failed to create user');
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error('💥 [UserRegister] Registration error:', error);
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
    console.log('🔐 [UserLogin] Login attempt started');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [UserLogin] Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;
    console.log('📝 [UserLogin] Login attempt for email:', email);

    // Handle test user login
    if (email === 'test@example.com' && password === 'password123') {
      console.log('🧪 [UserLogin] Test user login detected');
      
      // Check if test user exists, create if not
      let testUser = await User.findOne({ email: 'test@example.com' });
      
      if (!testUser) {
        console.log('🔧 [UserLogin] Creating test user...');
        try {
          testUser = await User.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123', // This will be hashed by the pre-save middleware
            mobileNumber: '9999999999',
            location: {
              coordinates: [77.2090, 28.6139], // Delhi coordinates
              address: 'New Delhi, India'
            },
            isVerified: true
          });
          console.log('✅ [UserLogin] Test user created successfully:', testUser._id);
        } catch (createError) {
          console.error('❌ [UserLogin] Failed to create test user:', createError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create test user'
          });
        }
      } else {
        console.log('✅ [UserLogin] Test user found:', testUser._id);
      }

      // Generate token for test user
      const token = generateToken(testUser._id);
      console.log('🔑 [UserLogin] Token generated for test user');

      const responseData = {
        _id: testUser._id,
        name: testUser.name,
        email: testUser.email,
        mobileNumber: testUser.mobileNumber,
        location: testUser.location,
        token
      };

      console.log('📤 [UserLogin] Sending test user success response');
      return res.status(200).json({
        success: true,
        data: responseData
      });
    }

    // Find regular user
    const user = await User.findOne({ email });

    if (!user) {
      console.log('❌ [UserLogin] User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('👤 [UserLogin] User found, checking password...');

    // Match password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log('❌ [UserLogin] Password mismatch for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ [UserLogin] Password match successful');

    // Generate JWT token
    const token = generateToken(user._id);
    console.log('🔑 [UserLogin] Token generated successfully');

    const responseData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      location: user.location,
      token
    };

    console.log('📤 [UserLogin] Sending success response for:', user.name);

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('💥 [UserLogin] Login error:', error);
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
    console.log('👤 [UserProfile] Profile request for user:', req.user._id);
    
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      console.log('❌ [UserProfile] User not found:', req.user._id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ [UserProfile] Profile fetched successfully:', user.name);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('💥 [UserProfile] Profile error:', error);
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
    console.log('✏️ [UserUpdate] Profile update request for user:', req.user._id);
    
    const user = await User.findById(req.user._id);

    if (!user) {
      console.log('❌ [UserUpdate] User not found:', req.user._id);
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
    console.log('✅ [UserUpdate] Profile updated successfully:', updatedUser.name);

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
    console.error('💥 [UserUpdate] Update error:', error);
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
    console.log('🏪 [NearbyShops] Request received');
    
    // 🎯 FIX: Better authentication check
    if (!req.isAuthenticated || !req.user) {
      console.log('📍 [NearbyShops] Unauthenticated request, returning all shops');
      
      // Return all shops without location-based filtering
      const shops = await Seller.find({ 
        'shop.isActive': { $ne: false }
      })
        .select('-password -bankDetails')
        .limit(20);
      
      console.log(`✅ [NearbyShops] Returning ${shops.length} shops (no location filtering)`);
      
      return res.status(200).json({
        success: true,
        count: shops.length,
        message: 'Showing all shops (location-based filtering requires login)',
        data: shops
      });
    }

    // 🎯 FIX: Add error handling for user lookup
    let user;
    try {
      user = await User.findById(req.user._id);
      if (!user) {
        console.log('⚠️ [NearbyShops] User not found in database:', req.user._id);
        // Fall back to showing all shops instead of erroring
        const shops = await Seller.find({ 
          'shop.isActive': { $ne: false }
        })
          .select('-password -bankDetails')
          .limit(20);
        
        return res.status(200).json({
          success: true,
          count: shops.length,
          message: 'User profile incomplete, showing all shops',
          data: shops
        });
      }
    } catch (userError) {
      console.error('❌ [NearbyShops] User lookup error:', userError);
      // Return all shops as fallback
      const shops = await Seller.find({ 
        'shop.isActive': { $ne: false }
      })
        .select('-password -bankDetails')
        .limit(20);
      
      return res.status(200).json({
        success: true,
        count: shops.length,
        message: 'Location service unavailable, showing all shops',
        data: shops
      });
    }
    
    if (!user.location || !user.location.coordinates) {
      console.log('📍 [NearbyShops] User location not available, returning all shops');
      // Return all shops if user doesn\'t have location set
      const shops = await Seller.find({ 
        'shop.isActive': { $ne: false }
      })
        .select('-password -bankDetails')
        .limit(20);
      
      console.log(`✅ [NearbyShops] Returning ${shops.length} shops (no user location)`);
      
      return res.status(200).json({
        success: true,
        count: shops.length,
        message: 'User location not available, showing all shops',
        data: shops
      });
    }
    
    // Get user\'s coordinates
    const [longitude, latitude] = user.location.coordinates;
    console.log('📍 [NearbyShops] User location:', { latitude, longitude });
    
    // Find nearby shops using geospatial query (default 2000km radius)
    const maxDistance = parseInt(req.query.distance) || 2000000; // in meters (2000km)
    
    const shops = await Seller.find({
      'shop.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      },
      'shop.isActive': { $ne: false }
    }).select('-password -bankDetails');
    
    console.log(`✅ [NearbyShops] Found ${shops.length} nearby shops`);
    
    res.status(200).json({
      success: true,
      count: shops.length,
      data: shops
    });
  } catch (error) {
    console.error('💥 [NearbyShops] Error:', error);
    
    // 🎯 FIX: Return shops even on error instead of failing
    try {
      const fallbackShops = await Seller.find({ 
        'shop.isActive': { $ne: false }
      })
        .select('-password -bankDetails')
        .limit(20);
      
      res.status(200).json({
        success: true,
        count: fallbackShops.length,
        message: 'Location service error, showing all available shops',
        data: fallbackShops
      });
    } catch (fallbackError) {
      console.error('💥 [NearbyShops] Fallback error:', fallbackError);
      res.status(500).json({
        success: false,
        message: 'Server Error',
        error: error.message
      });
    }
  }
};

// @desc    Get user's wishlist
// @route   GET /api/users/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
  try {
    console.log('❤️ [Wishlist] Get wishlist request for user:', req.user._id);
    
    const user = await User.findById(req.user._id)
      .populate({
        path: 'wishlist',
        select: 'name images zammerPrice mrp category'
      });

    if (!user) {
      console.log('❌ [Wishlist] User not found:', req.user._id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ [Wishlist] Found ${user.wishlist.length} items in wishlist`);

    res.status(200).json({
      success: true,
      count: user.wishlist.length,
      data: user.wishlist
    });
  } catch (error) {
    console.error('💥 [Wishlist] Get wishlist error:', error);
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
    console.log('❤️ [Wishlist] Add to wishlist request:', req.body.productId);
    
    const { productId } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      console.log('❌ [Wishlist] Product not found:', productId);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update user's wishlist
    const user = await User.findById(req.user._id);

    // Check if product already in wishlist
    if (user.wishlist.includes(productId)) {
      console.log('⚠️ [Wishlist] Product already in wishlist:', productId);
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    user.wishlist.push(productId);
    await user.save();

    console.log('✅ [Wishlist] Product added to wishlist successfully');

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist',
      data: { product: productId }
    });
  } catch (error) {
    console.error('💥 [Wishlist] Add to wishlist error:', error);
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
    console.log('❤️ [Wishlist] Remove from wishlist request:', req.params.productId);
    
    const { productId } = req.params;

    // Update user's wishlist
    const user = await User.findById(req.user._id);

    // Check if product in wishlist
    const index = user.wishlist.indexOf(productId);
    if (index === -1) {
      console.log('❌ [Wishlist] Product not found in wishlist:', productId);
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }

    user.wishlist.splice(index, 1);
    await user.save();

    console.log('✅ [Wishlist] Product removed from wishlist successfully');

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: {}
    });
  } catch (error) {
    console.error('💥 [Wishlist] Remove from wishlist error:', error);
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
    console.log('❤️ [Wishlist] Check wishlist request:', req.params.productId);
    
    const { productId } = req.params;

    // Get user's wishlist
    const user = await User.findById(req.user._id);

    // Check if product in wishlist
    const isInWishlist = user.wishlist.includes(productId);

    console.log(`✅ [Wishlist] Product ${isInWishlist ? 'is' : 'is not'} in wishlist`);

    res.status(200).json({
      success: true,
      data: { isInWishlist }
    });
  } catch (error) {
    console.error('💥 [Wishlist] Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Verify email for password reset
// @route   POST /api/users/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email',
      error: error.message
    });
  }
};

// @desc    Reset password
// @route   POST /api/users/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Save user with new password
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};
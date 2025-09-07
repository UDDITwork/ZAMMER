// File: /backend/controllers/userController.js - FIXED PASSWORD HANDLING

const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// 🎯 ENHANCED: Comprehensive logging utility for user controller
const logUser = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '👤',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    critical: '🚨',
    password: '🔐',
    security: '🛡️',
    auth: '🔑',
    reset: '🔄'
  };
  
  console.log(`${logLevels[level]} [USER-CONTROLLER] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

// 🎯 ENHANCED: Generate JWT Token with logging
const generateToken = (id) => {
  try {
    const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    logUser('JWT_TOKEN_GENERATED', {
      userId: id,
      tokenLength: token.length,
      expiresIn: '30d',
      hasSecret: !!process.env.JWT_SECRET
    }, 'auth');
    
    return token;
  } catch (error) {
    logUser('JWT_TOKEN_GENERATION_ERROR', {
      userId: id,
      error: error.message,
      hasSecret: !!process.env.JWT_SECRET
    }, 'critical');
    throw error;
  }
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

    // Create user data
    const userData = {
      name,
      email,
      password, // Will be hashed by pre-save middleware
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

// 🔧 FIXED: Enhanced login with better password verification
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

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logUser('LOGIN_FAILED_USER_NOT_FOUND', { email }, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logUser('LOGIN_FAILED_ACCOUNT_LOCKED', { email }, 'warning');
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      logUser('LOGIN_FAILED_ACCOUNT_INACTIVE', { email }, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    logUser('PASSWORD_VERIFICATION_START', {
      email,
      enteredPasswordLength: password.length,
      storedPasswordLength: user.password.length,
      storedPasswordFormat: user.password.substring(0, 4) + '...',
      isHashedFormat: user.password.startsWith('$2'),
      currentAttempts: user.loginAttempts || 0,
      isLocked: user.isLocked
    }, 'password');

    // Verify password
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      logUser('LOGIN_FAILED_WRONG_PASSWORD', { 
        email,
        enteredPasswordLength: password.length,
        storedPasswordLength: user.password.length,
        currentAttempts: user.loginAttempts || 0
      }, 'warning');
      
      // Increment login attempts
      await user.incLoginAttempts();
      
      // Check if account is now locked
      const updatedUser = await User.findById(user._id);
      if (updatedUser.isLocked) {
        logUser('ACCOUNT_LOCKED_AFTER_FAILED_LOGIN', {
          email,
          lockUntil: updatedUser.lockUntil,
          failedAttempts: updatedUser.loginAttempts
        }, 'critical');
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    logUser('USER_LOGIN_SUCCESS', {
      userId: user._id,
      email: user.email,
      name: user.name,
      previousAttempts: user.loginAttempts || 0,
      wasLocked: user.isLocked,
      lastLogin: user.lastLogin
    }, 'success');

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        ...userResponse,
        token: generateToken(user._id)
      }
    });

  } catch (error) {
    logUser('LOGIN_USER_ERROR', { error: error.message, stack: error.stack }, 'error');
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

    // Remove password from response
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
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

// 🔧 FIXED: Change user password with enhanced verification
// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    logUser('CHANGE_PASSWORD_CONTROLLER_START', { 
      userId: req.user._id,
      email: req.user.email,
      requestBody: req.body
    }, 'password');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logUser('CHANGE_PASSWORD_VALIDATION_FAILED', { 
        errors: errors.array() 
      }, 'error');
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    logUser('CHANGE_PASSWORD_START', { 
      userId: req.user._id,
      email: req.user.email,
      currentPasswordLength: currentPassword.length,
      newPasswordLength: newPassword.length
    }, 'password');

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      logUser('CHANGE_PASSWORD_USER_NOT_FOUND', { 
        userId: req.user._id 
      }, 'error');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      logUser('CHANGE_PASSWORD_FAILED', { 
        userId: req.user._id,
        email: user.email,
        reason: 'Invalid current password',
        currentPasswordLength: currentPassword.length,
        storedPasswordLength: user.password.length
      }, 'warning');
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current password
    if (newPassword === currentPassword) {
      logUser('CHANGE_PASSWORD_FAILED', {
        userId: req.user._id,
        email: user.email,
        reason: 'New password same as current password'
      }, 'warning');
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password (will be hashed by pre-save middleware)
    const oldPasswordHash = user.password;
    user.password = newPassword;
    await user.save();

    logUser('CHANGE_PASSWORD_SUCCESS', { 
      userId: req.user._id,
      email: user.email,
      oldPasswordLength: oldPasswordHash.length,
      newPasswordLength: user.password.length,
      passwordChanged: oldPasswordHash !== user.password
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logUser('CHANGE_PASSWORD_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 NEW: Request password reset
// @desc    Request password reset
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    logUser('FORGOT_PASSWORD_START', { 
      email,
      requestTime: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }, 'reset');

    const user = await User.findOne({ email });

    if (!user) {
      logUser('FORGOT_PASSWORD_USER_NOT_FOUND', { 
        email,
        reason: 'User does not exist'
      }, 'warning');
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If a user with that email exists, a password reset link has been sent.'
      });
    }

    logUser('FORGOT_PASSWORD_USER_FOUND', {
      userId: user._id,
      email: user.email,
      isActive: user.isActive,
      isLocked: user.isLocked
    }, 'reset');

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // In a real app, you would send an email here
    // For development, we'll return the token
    logUser('PASSWORD_RESET_TOKEN_GENERATED', {
      userId: user._id,
      email,
      tokenLength: resetToken.length,
      expires: user.resetPasswordExpires,
      expiresAt: new Date(user.resetPasswordExpires).toISOString()
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Password reset token generated',
      // Remove this in production - only for development
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (error) {
    logUser('FORGOT_PASSWORD_ERROR', { error: error.message }, 'error');
    
    // Clear reset token fields on error
    if (req.body.email) {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Email could not be sent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 NEW: Reset password with token
// @desc    Reset password
// @route   PUT /api/users/reset-password/:resetToken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { resetToken } = req.params;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    logUser('RESET_PASSWORD_START', { 
      resetToken: resetToken.substring(0, 10) + '...',
      newPasswordLength: newPassword.length,
      requestTime: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }, 'reset');

    // Find user by reset token
    const user = await User.findByResetToken(resetToken);

    if (!user) {
      logUser('RESET_PASSWORD_FAILED', { 
        reason: 'Invalid or expired token',
        tokenLength: resetToken.length,
        tokenPreview: resetToken.substring(0, 10) + '...'
      }, 'warning');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    logUser('RESET_PASSWORD_USER_FOUND', {
      userId: user._id,
      email: user.email,
      tokenExpires: user.resetPasswordExpires,
      isActive: user.isActive,
      isLocked: user.isLocked
    }, 'reset');

    // Set new password (will be hashed by pre-save middleware)
    const oldPasswordHash = user.password;
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    logUser('RESET_PASSWORD_SUCCESS', { 
      userId: user._id,
      email: user.email,
      oldPasswordLength: oldPasswordHash.length,
      newPasswordLength: user.password.length,
      passwordChanged: oldPasswordHash !== user.password,
      loginAttemptsReset: true,
      lockCleared: true
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id)
      }
    });

  } catch (error) {
    logUser('RESET_PASSWORD_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 NEW: Test password functionality
// @desc    Test password operations
// @route   POST /api/users/test-password
// @access  Public (for development only)
const testPassword = async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const { email, password, newPassword } = req.body;

    logUser('TEST_PASSWORD_START', { email });

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const results = {
      userFound: true,
      email: user.email,
      passwordLength: user.password.length,
      passwordFormat: user.password.substring(0, 10) + '...',
      isHashedFormat: user.password.startsWith('$2'),
      tests: {}
    };

    // Test current password
    if (password) {
      try {
        const isMatch = await user.matchPassword(password);
        results.tests.currentPasswordMatch = isMatch;
        
        // Also test with bcrypt directly
        const directMatch = await bcrypt.compare(password, user.password);
        results.tests.directBcryptMatch = directMatch;
      } catch (error) {
        results.tests.passwordError = error.message;
      }
    }

    // Test password update
    if (newPassword) {
      try {
        const originalPassword = user.password;
        user.password = newPassword;
        await user.save();
        
        results.tests.passwordUpdated = true;
        results.tests.newPasswordLength = user.password.length;
        results.tests.passwordChanged = originalPassword !== user.password;
        
        // Test new password
        const newMatch = await user.matchPassword(newPassword);
        results.tests.newPasswordMatch = newMatch;
      } catch (error) {
        results.tests.updateError = error.message;
      }
    }

    logUser('TEST_PASSWORD_RESULTS', results, 'success');

    res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    logUser('TEST_PASSWORD_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
};

// Keep existing functions (getNearbyShops, wishlist functions, etc.)
const getNearbyShops = async (req, res) => {
  // ... existing implementation from your original file
  const startTime = Date.now();
  
  try {
    const { lat, lng, maxDistance = 50000000, limit = 50 } = req.query;
    let userLocation = null;

    logUser('GET_NEARBY_SHOPS_START', {
      queryParams: { lat, lng, maxDistance: `${maxDistance} meters (${maxDistance/1000} km)`, limit },
      hasAuthUser: !!req.user,
      userId: req.user?._id
    });

    if (req.user) {
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

    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        userLocation = { latitude, longitude, address: 'Current location' };
        logUser('USER_LOCATION_FROM_QUERY', userLocation);
      }
    }

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

    // Validate coordinates
    if (userLocation.latitude < -90 || userLocation.latitude > 90 ||
        userLocation.longitude < -180 || userLocation.longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // Create MongoDB geospatial query
    const nearbyQuery = {
      "shop.location": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [userLocation.longitude, userLocation.latitude]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      isVerified: true,
      "shop.name": { $exists: true, $ne: null, $ne: '' }
    };

    const sellers = await Seller.find(nearbyQuery)
      .select(`
        _id firstName email shop.name shop.description shop.category 
        shop.location shop.images shop.mainImage shop.openTime shop.closeTime 
        shop.phoneNumber shop.address shop.gstNumber shop.workingDays
        averageRating numReviews createdAt updatedAt
      `)
      .limit(parseInt(limit))
      .lean();

    // Calculate distances
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
        shop.shop.location.coordinates[1],
        shop.shop.location.coordinates[0]
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
        isAccurate: distance < 10000
      };
    });

    shopsWithDistances.sort((a, b) => a.distance - b.distance);
    
    res.status(200).json({
      success: true,
      data: shopsWithDistances,
      count: shopsWithDistances.length,
      userLocation: userLocation,
      searchRadius: `${maxDistance/1000}km`,
      processingTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logUser('GET_NEARBY_SHOPS_ERROR', {
      error: error.message,
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

// Haversine Distance Calculation Function
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c;
  return parseFloat(distance.toFixed(2));
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// Wishlist functions
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'wishlist.product',
        populate: {
          path: 'seller',
          select: 'firstName shop.name'
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
      count: user.wishlist.length,
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

    const existingItem = user.wishlist.find(item => 
      item.product.toString() === productId.toString()
    );
    
    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    user.wishlist.push({
      product: productId,
      addedAt: new Date()
    });
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist successfully'
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

    user.wishlist = user.wishlist.filter(item => 
      item.product.toString() !== productId.toString()
    );
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist successfully'
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

    const isInWishlist = user.wishlist.some(item => 
      item.product.toString() === productId.toString()
    );

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

// Placeholder functions
const verifyEmail = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Email verification feature coming soon'
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
  changePassword,
  forgotPassword,
  testPassword,
  debugSellers,
  verifyAllSellers
};
// File: /backend/controllers/userController.js - FIXED PASSWORD HANDLING

const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const msg91Service = require('../services/msg91Service');

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

// 🔧 NEW: Send OTP for signup
// @desc    Send OTP to phone number for signup verification
// @route   POST /api/users/send-signup-otp
// @access  Public
const sendSignupOTP = async (req, res) => {
  try {
    // Check validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, mobileNumber } = req.body;

    logUser('SEND_SIGNUP_OTP_START', {
      name,
      email: email?.toLowerCase(),
      mobileNumber
    }, 'auth');

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Check if mobile number already exists
    const cleanedPhone = mobileNumber.trim().replace(/\D/g, '');
    const searchVariants = [
      cleanedPhone,
      cleanedPhone.length === 10 ? `91${cleanedPhone}` : null,
      cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`,
      cleanedPhone.replace(/^91/, '')
    ].filter(Boolean);

    const mobileExists = await User.findOne({ 
      mobileNumber: { $in: searchVariants } 
    });
    if (mobileExists) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already registered'
      });
    }

    // Send OTP via MSG91
    try {
      const otpResult = await msg91Service.sendOTPForSignup(mobileNumber, {
        userName: name,
        purpose: 'signup',
        userData: { name, email: email.toLowerCase().trim(), mobileNumber: cleanedPhone } // Store user data for later
      });

      if (!otpResult.success) {
        logUser('SEND_SIGNUP_OTP_FAILED', {
          email,
          error: otpResult.error
        }, 'error');
        
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again later.'
        });
      }

      logUser('SEND_SIGNUP_OTP_SUCCESS', {
        email,
        phoneNumber: `${mobileNumber.substring(0, 6)}****`,
        requestId: otpResult.response?.request_id || 'N/A'
      }, 'success');

      res.status(200).json({
        success: true,
        message: 'OTP has been sent to your phone number',
        data: {
          phoneNumber: `${mobileNumber.substring(0, 6)}****${mobileNumber.slice(-2)}` // Masked phone
        }
      });

    } catch (otpError) {
      logUser('SEND_SIGNUP_OTP_ERROR', {
        email,
        error: otpError.message,
        stack: otpError.stack
      }, 'error');

      // Check if it's a template ID configuration error
      if (otpError.message && otpError.message.includes('template ID not configured')) {
        return res.status(500).json({
          success: false,
          message: 'OTP service configuration error. Please contact support.',
          error: process.env.NODE_ENV === 'development' ? otpError.message : undefined
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? otpError.message : undefined
      });
    }

  } catch (error) {
    logUser('SEND_SIGNUP_OTP_ERROR', { error: error.message, stack: error.stack }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Failed to send signup OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 NEW: Resend signup OTP
// @desc    Resend OTP to phone number for signup verification
// @route   POST /api/users/resend-signup-otp
// @access  Public
const resendSignupOTP = async (req, res) => {
  try {
    // Check validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { mobileNumber } = req.body;

    logUser('RESEND_SIGNUP_OTP_START', {
      mobileNumber
    }, 'auth');

    // Normalize phone number
    const msg91Config = require('../config/msg91');
    const normalizedMobileNumber = msg91Config.normalizePhoneNumber(mobileNumber);

    // Check if OTP session exists (user must have requested OTP first)
    const existingSession = msg91Service.getOTPSession(normalizedMobileNumber, 'signup');
    if (!existingSession) {
      logUser('RESEND_SIGNUP_OTP_NO_SESSION', {
        mobileNumber: `${mobileNumber.substring(0, 6)}****`
      }, 'warning');
      
      return res.status(400).json({
        success: false,
        message: 'No active OTP session found. Please request a new OTP first.'
      });
    }

    // Resend OTP via MSG91 retry API
    try {
      const retryResult = await msg91Service.retryOTP(normalizedMobileNumber, 'text');

      if (!retryResult.success) {
        logUser('RESEND_SIGNUP_OTP_FAILED', {
          mobileNumber: `${mobileNumber.substring(0, 6)}****`,
          error: retryResult.error || retryResult.message
        }, 'error');
        
        return res.status(500).json({
          success: false,
          message: retryResult.message || 'Failed to resend OTP. Please try again later.'
        });
      }

      logUser('RESEND_SIGNUP_OTP_SUCCESS', {
        phoneNumber: `${mobileNumber.substring(0, 6)}****`,
        requestId: retryResult.response?.request_id || 'N/A'
      }, 'success');

      res.status(200).json({
        success: true,
        message: 'OTP has been resent to your phone number',
        data: {
          phoneNumber: `${mobileNumber.substring(0, 6)}****${mobileNumber.slice(-2)}` // Masked phone
        }
      });

    } catch (retryError) {
      logUser('RESEND_SIGNUP_OTP_ERROR', {
        mobileNumber: `${mobileNumber.substring(0, 6)}****`,
        error: retryError.message,
        stack: retryError.stack
      }, 'error');

      return res.status(500).json({
        success: false,
        message: 'Failed to resend OTP. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? retryError.message : undefined
      });
    }

  } catch (error) {
    logUser('RESEND_SIGNUP_OTP_ERROR', { error: error.message, stack: error.stack }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Failed to resend signup OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 NEW: Verify signup OTP and register user
// @desc    Verify OTP and create user account
// @route   POST /api/users/verify-signup-otp
// @access  Public
const verifySignupOTPAndRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, password, mobileNumber, otp, location, gender } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Valid 6-digit OTP is required'
      });
    }

    logUser('VERIFY_SIGNUP_OTP_START', {
      name,
      email: email?.toLowerCase(),
      mobileNumber,
      otpLength: otp.length
    }, 'auth');

    // 🎯 CRITICAL FIX: Normalize phone number before verification to match MSG91 format
    const msg91Config = require('../config/msg91');
    const normalizedMobileNumber = msg91Config.normalizePhoneNumber(mobileNumber);
    
    logUser('VERIFY_SIGNUP_OTP_PHONE_NORMALIZATION', {
      original: mobileNumber,
      normalized: normalizedMobileNumber,
      otpLength: otp.length
    }, 'auth');

    // 🎯 FIX: Verify OTP directly with MSG91 API (authoritative verification)
    // MSG91 API is the source of truth - it verifies against the OTP it sent
    const verificationResult = await msg91Service.verifyOTP({
      phoneNumber: normalizedMobileNumber,
      otp: otp.trim() // 🎯 CRITICAL: Trim OTP to remove any whitespace
    });

    if (!verificationResult.success) {
      logUser('VERIFY_SIGNUP_OTP_FAILED', {
        email,
        message: verificationResult.message
      }, 'warning');

      return res.status(400).json({
        success: false,
        message: verificationResult.message || 'Invalid or expired OTP'
      });
    }

    // OTP verified via MSG91 API - use request body data directly
    const finalName = name;
    const finalEmail = email.toLowerCase().trim();
    const finalMobileNumber = mobileNumber.trim().replace(/\D/g, '');

    // Double-check user doesn't exist (race condition protection)
    const userExists = await User.findOne({ email: finalEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const cleanedPhone = finalMobileNumber.replace(/\D/g, '');
    const searchVariants = [
      cleanedPhone,
      cleanedPhone.length === 10 ? `91${cleanedPhone}` : null,
      cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`,
      cleanedPhone.replace(/^91/, '')
    ].filter(Boolean);

    const mobileExists = await User.findOne({ 
      mobileNumber: { $in: searchVariants } 
    });
    if (mobileExists) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already registered'
      });
    }

    // Create user data
    const userData = {
      name: finalName,
      email: finalEmail,
      password, // Will be hashed by pre-save middleware
      mobileNumber: cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone, // Normalize to include country code
      gender: gender || '' // Add gender field (optional)
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
      hasLocation: !!user.location?.coordinates?.length,
      otpVerified: true
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
    logUser('VERIFY_SIGNUP_OTP_ERROR', { error: error.message, stack: error.stack }, 'error');
    
    // Check for duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Mobile number'} already registered`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during user registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Register user (DEPRECATED - Use OTP flow instead)
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

    // 🎯 CRITICAL FIX: Clean up corrupted wishlist data before saving
    if (user.wishlist && Array.isArray(user.wishlist)) {
      user.wishlist = user.wishlist.filter(item => 
        item && item.product && typeof item.product === 'object'
      );
      logUser('WISHLIST_CLEANED', { 
        originalCount: user.wishlist.length,
        cleanedCount: user.wishlist.length 
      }, 'info');
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
    
    // 🎯 CRITICAL FIX: Handle wishlist validation errors specifically
    if (error.message.includes('wishlist') && error.message.includes('product')) {
      logUser('WISHLIST_VALIDATION_ERROR_DETECTED', { 
        userId: req.user._id,
        error: error.message 
      }, 'warning');
      
      try {
        // Clean up the user's wishlist completely
        const user = await User.findById(req.user._id);
        if (user) {
          user.wishlist = [];
          await user.save();
          
          logUser('WISHLIST_CLEARED_SUCCESSFULLY', { userId: user._id }, 'success');
          
          // Retry the original location update
          if (req.body.location) {
            user.location = {
              type: 'Point',
              coordinates: req.body.location.coordinates,
              address: req.body.location.address || user.location?.address || ''
            };
            await user.save();
            
            logUser('LOCATION_UPDATE_RETRY_SUCCESS', { 
              userId: user._id,
              coordinates: req.body.location.coordinates 
            }, 'success');
            
            const userResponse = user.toObject();
            delete userResponse.password;
            
            return res.status(200).json({
              success: true,
              message: 'Profile updated successfully (wishlist cleaned)',
              data: userResponse
            });
          }
        }
      } catch (retryError) {
        logUser('WISHLIST_CLEANUP_FAILED', { 
          error: retryError.message 
        }, 'error');
      }
    }
    
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

// 🔧 NEW: Request password reset with OTP via MSG91
// @desc    Request password reset - sends OTP to user's phone
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    // Accept either email or phone number
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    logUser('FORGOT_PASSWORD_START', { 
      email: email || null,
      phoneNumber: phoneNumber || null,
      requestTime: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }, 'reset');

    // Find user by email or phone number
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else {
      // Normalize phone number for search - try multiple formats
      const cleanedPhone = phoneNumber.trim().replace(/\D/g, '');
      const searchVariants = [
        cleanedPhone, // Original format
        cleanedPhone.length === 10 ? `91${cleanedPhone}` : null, // Add country code if 10 digits
        cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`, // Ensure country code
        cleanedPhone.replace(/^91/, '') // Without country code
      ].filter(Boolean);
      
      user = await User.findOne({ 
        mobileNumber: { $in: searchVariants } 
      });
    }

    if (!user) {
      logUser('FORGOT_PASSWORD_USER_NOT_FOUND', { 
        email: email || null,
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : null,
        reason: 'User does not exist'
      }, 'warning');
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If a user with that email/phone exists, an OTP has been sent.'
      });
    }

    // Check if user has a mobile number
    if (!user.mobileNumber) {
      logUser('FORGOT_PASSWORD_NO_PHONE', {
        userId: user._id,
        email: user.email
      }, 'warning');
      return res.status(400).json({
        success: false,
        message: 'User account does not have a registered phone number. Please contact support.'
      });
    }

    logUser('FORGOT_PASSWORD_USER_FOUND', {
      userId: user._id,
      email: user.email,
      mobileNumber: user.mobileNumber ? `${user.mobileNumber.substring(0, 6)}****` : 'NOT_SET',
      isActive: user.isActive,
      isLocked: user.isLocked
    }, 'reset');

    // Send OTP via MSG91
    try {
      // 🎯 DEBUG: Log phone number format before sending (for comparison with delivery side)
      logUser('FORGOT_PASSWORD_PHONE_BEFORE_SEND', {
        mobileNumber: user.mobileNumber,
        phoneType: typeof user.mobileNumber,
        phoneLength: user.mobileNumber?.toString().length,
        userId: user._id
      }, 'reset');
      
      const otpResult = await msg91Service.sendOTPForForgotPassword(user.mobileNumber, {
        userName: user.name,
        purpose: 'forgot_password'
      });

      if (!otpResult.success) {
        logUser('FORGOT_PASSWORD_OTP_FAILED', {
          userId: user._id,
          error: otpResult.error
        }, 'error');
        
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again later.'
        });
      }

      // Store OTP session in msg91Service (already done by sendOTPForForgotPassword)
      // The OTP is stored with key: phoneNumber_forgot_password
      logUser('FORGOT_PASSWORD_OTP_SENT', {
        userId: user._id,
        phoneNumber: `${user.mobileNumber.substring(0, 6)}****`,
        requestId: otpResult.response?.request_id || 'N/A'
      }, 'success');

      // Return success without revealing OTP
      res.status(200).json({
        success: true,
        message: 'OTP has been sent to your registered phone number',
        data: {
          phoneNumber: `${user.mobileNumber.substring(0, 6)}****${user.mobileNumber.slice(-2)}` // Masked phone
        }
      });

    } catch (otpError) {
      logUser('FORGOT_PASSWORD_OTP_ERROR', {
        userId: user._id,
        error: otpError.message
      }, 'error');

      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? otpError.message : undefined
      });
    }

  } catch (error) {
    logUser('FORGOT_PASSWORD_ERROR', { error: error.message, stack: error.stack }, 'error');
    
    res.status(500).json({
      success: false,
      message: 'Password reset request failed',
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
    // Validate Seller model is available
    if (!Seller) {
      throw new Error('Seller model is not available');
    }

    const { lat, lng, maxDistance = 50000000, limit = 50 } = req.query;
    let userLocation = null;

    logUser('GET_NEARBY_SHOPS_START', {
      queryParams: { lat, lng, maxDistance: `${maxDistance} meters (${maxDistance/1000} km)`, limit },
      hasAuthUser: !!req.user,
      userId: req.user?._id,
      sellerModelAvailable: !!Seller
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
      
      try {
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
        .limit(parseInt(limit) || 50)
        .lean();

        logUser('RETURNING_ALL_SHOPS_NO_LOCATION', { count: shops.length });
          
        return res.status(200).json({
          success: true,
          data: shops || [],
          count: shops?.length || 0,
          userLocation: null,
          message: `All available shops (location not provided) - ${shops?.length || 0} shops found`,
          processingTime: `${Date.now() - startTime}ms`
        });
      } catch (dbError) {
        logUser('DATABASE_QUERY_ERROR_NO_LOCATION', { 
          error: dbError.message,
          stack: dbError.stack 
        }, 'error');
        
        return res.status(500).json({
          success: false,
          message: 'Error fetching shops from database',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
          processingTime: `${Date.now() - startTime}ms`
        });
      }
    }

    // Validate coordinates
    if (userLocation.latitude < -90 || userLocation.latitude > 90 ||
        userLocation.longitude < -180 || userLocation.longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // Create base query for verified shops
    const baseQuery = {
      isVerified: true,
      "shop.name": { $exists: true, $ne: null, $ne: '' },
      "shop.location": { $exists: true, $ne: null },
      "shop.location.coordinates": { $exists: true, $type: "array", $size: 2 }
    };

    let sellers;
    
    // Try geospatial query first, fallback to regular query if it fails
    try {
      const nearbyQuery = {
        ...baseQuery,
        "shop.location": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [userLocation.longitude, userLocation.latitude]
            },
            $maxDistance: parseInt(maxDistance)
          }
        }
      };

      sellers = await Seller.find(nearbyQuery)
        .select(`
          _id firstName email shop.name shop.description shop.category 
          shop.location shop.images shop.mainImage shop.openTime shop.closeTime 
          shop.phoneNumber shop.address shop.gstNumber shop.workingDays
          averageRating numReviews createdAt updatedAt
        `)
        .limit(parseInt(limit) * 2) // Get more to filter by distance ranges
        .lean();
        
      logUser('GEOSPATIAL_QUERY_SUCCESS', { found: sellers.length });
    } catch (geoError) {
      // Fallback: Get all shops and calculate distance manually
      logUser('GEOSPATIAL_QUERY_FAILED', { error: geoError.message }, 'warning');
      
      sellers = await Seller.find(baseQuery)
        .select(`
          _id firstName email shop.name shop.description shop.category 
          shop.location shop.images shop.mainImage shop.openTime shop.closeTime 
          shop.phoneNumber shop.address shop.gstNumber shop.workingDays
          averageRating numReviews createdAt updatedAt
        `)
        .limit(parseInt(limit) * 3) // Get more for manual filtering
        .lean();
    }

    // Safety check: ensure sellers array exists
    if (!sellers || !Array.isArray(sellers)) {
      logUser('NO_SELLERS_FOUND', { sellers: sellers }, 'warning');
      sellers = [];
    }

    // Calculate distances and group by distance ranges
    const shopsWithDistances = sellers
      .map(shop => {
        if (!shop.shop?.location?.coordinates || shop.shop.location.coordinates.length !== 2) {
          return null; // Skip shops without valid coordinates
        }

        const distance = calculateHaversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          shop.shop.location.coordinates[1], // latitude
          shop.shop.location.coordinates[0]  // longitude
        );

        // Filter by maxDistance
        if (distance > (parseInt(maxDistance) / 1000)) {
          return null; // Skip shops beyond max distance
        }

        let distanceText;
        if (distance < 1) {
          distanceText = `${Math.round(distance * 1000)}m`;
        } else if (distance < 10) {
          distanceText = `${distance.toFixed(1)}km`;
        } else {
          distanceText = `${Math.round(distance)}km`;
        }

        // Determine distance range for progressive sorting
        let distanceRange = 999; // Default to last range
        if (distance <= 5) {
          distanceRange = 1; // 0-5km (first priority)
        } else if (distance <= 7) {
          distanceRange = 2; // 5-7km (second priority)
        } else if (distance <= 10) {
          distanceRange = 3; // 7-10km (third priority)
        } else if (distance <= 15) {
          distanceRange = 4; // 10-15km
        } else if (distance <= 20) {
          distanceRange = 5; // 15-20km
        } else {
          distanceRange = 6; // 20km+
        }

        return {
          ...shop,
          distance: distance,
          distanceText: distanceText,
          distanceRange: distanceRange,
          isAccurate: distance < 10000
        };
      })
      .filter(shop => shop !== null); // Remove null entries

    // Sort by distance range first, then by actual distance within each range
    shopsWithDistances.sort((a, b) => {
      if (a.distanceRange !== b.distanceRange) {
        return a.distanceRange - b.distanceRange; // Sort by range (1, 2, 3, etc.)
      }
      return a.distance - b.distance; // Within same range, sort by actual distance
    });

    // Limit to requested number after sorting
    const limitedShops = shopsWithDistances.slice(0, parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: limitedShops,
      count: limitedShops.length,
      userLocation: userLocation,
      searchRadius: `${maxDistance/1000}km`,
      processingTime: `${Date.now() - startTime}ms`,
      distanceRanges: {
        '0-5km': limitedShops.filter(s => s.distanceRange === 1).length,
        '5-7km': limitedShops.filter(s => s.distanceRange === 2).length,
        '7-10km': limitedShops.filter(s => s.distanceRange === 3).length,
        '10-15km': limitedShops.filter(s => s.distanceRange === 4).length,
        '15-20km': limitedShops.filter(s => s.distanceRange === 5).length,
        '20km+': limitedShops.filter(s => s.distanceRange === 6).length
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logUser('GET_NEARBY_SHOPS_ERROR', {
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`
    }, 'error');

    console.error('❌ [GET_NEARBY_SHOPS] Full error:', error);

    res.status(500).json({
      success: false,
      message: 'Error fetching nearby shops',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
// 🔧 NEW: Verify OTP for password reset
// @desc    Verify OTP sent for password reset
// @route   POST /api/users/verify-forgot-password-otp
// @access  Public
const verifyForgotPasswordOTP = async (req, res) => {
  try {
    const { email, phoneNumber, otp } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Valid 6-digit OTP is required'
      });
    }

    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    logUser('VERIFY_FORGOT_PASSWORD_OTP_START', {
      email: email || null,
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : null,
      otpLength: otp.length,
      requestTime: new Date().toISOString()
    }, 'reset');

    // Find user - normalize phone number for consistent searching
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else {
      // Normalize phone number for search - try multiple formats
      const cleanedPhone = phoneNumber.trim().replace(/\D/g, '');
      const searchVariants = [
        cleanedPhone, // Original format
        cleanedPhone.length === 10 ? `91${cleanedPhone}` : null, // Add country code if 10 digits
        cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`, // Ensure country code
        cleanedPhone.replace(/^91/, '') // Without country code
      ].filter(Boolean);
      
      user = await User.findOne({ 
        mobileNumber: { $in: searchVariants } 
      });
    }

    if (!user) {
      logUser('VERIFY_FORGOT_PASSWORD_OTP_USER_NOT_FOUND', { 
        email: email || null,
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : null
      }, 'warning');
      return res.status(400).json({
        success: false,
        message: 'Invalid email/phone number or OTP'
      });
    }

    if (!user.mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'User account does not have a registered phone number'
      });
    }

    // Verify OTP using msg91Service
    const verificationResult = await msg91Service.verifyOTPSession(
      user.mobileNumber,
      'forgot_password',
      otp
    );

    if (!verificationResult.success) {
      logUser('VERIFY_FORGOT_PASSWORD_OTP_FAILED', {
        userId: user._id,
        message: verificationResult.message
      }, 'warning');

      return res.status(400).json({
        success: false,
        message: verificationResult.message || 'Invalid or expired OTP'
      });
    }

    // OTP verified successfully - generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    logUser('VERIFY_FORGOT_PASSWORD_OTP_SUCCESS', {
      userId: user._id,
      email: user.email,
      tokenLength: resetToken.length,
      expiresAt: new Date(user.resetPasswordExpires).toISOString()
    }, 'success');

    // Return reset token (frontend will use this for password reset)
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        resetToken,
        expiresAt: user.resetPasswordExpires
      }
    });

  } catch (error) {
    logUser('VERIFY_FORGOT_PASSWORD_OTP_ERROR', {
      error: error.message,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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
  sendSignupOTP,
  resendSignupOTP,
  verifySignupOTPAndRegister,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getNearbyShops,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  verifyEmail,
  verifyForgotPasswordOTP,
  resetPassword,
  changePassword,
  forgotPassword,
  testPassword,
  debugSellers,
  verifyAllSellers
};
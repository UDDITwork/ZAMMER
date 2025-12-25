//backend/controllers/sellerController.js 
const Seller = require('../models/Seller');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const Order = require('../models/Order'); // Added Order model import
const labelGenerationService = require('../services/labelGenerationService');
const msg91Service = require('../services/msg91Service');
const msg91Config = require('../config/msg91');

// @desc    Register a new seller
// @route   POST /api/sellers/register
// @access  Public
exports.registerSeller = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      firstName,
      email,
      password,
      mobileNumber,
      shop,
      bankDetails
    } = req.body;

    // Check if seller already exists
    const sellerExists = await Seller.findOne({ email });
    if (sellerExists) {
      return res.status(400).json({
        success: false,
        message: 'Seller already exists'
      });
    }

    // Create new seller
    const seller = await Seller.create({
      firstName,
      email,
      password,
      mobileNumber,
      shop,
      bankDetails
    });

    if (seller) {
      // Generate JWT token
      const token = generateToken(seller._id, 'seller');

      res.status(201).json({
        success: true,
        data: {
          _id: seller._id,
          firstName: seller.firstName,
          email: seller.email,
          mobileNumber: seller.mobileNumber,
          shop: seller.shop,
          token
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid seller data'
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

// 🔧 NEW: Send OTP for seller signup
// @desc    Send OTP to phone number for seller signup verification
// @route   POST /api/sellers/send-signup-otp
// @access  Public
exports.sendSignupOTP = async (req, res) => {
  try {
    const { firstName, email, mobileNumber } = req.body;

    if (!firstName || !email || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'First name, email, and mobile number are required'
      });
    }

    console.log('🔵 [SELLER-SIGNUP-OTP-SEND] START:', {
      firstName,
      email: email.toLowerCase(),
      mobileNumber
    });

    // Check if seller already exists
    const sellerExists = await Seller.findOne({ email: email.toLowerCase().trim() });
    if (sellerExists) {
      return res.status(400).json({
        success: false,
        message: 'Seller already exists with this email'
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

    const mobileExists = await Seller.findOne({ 
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
        userName: firstName,
        purpose: 'signup',
        userData: { firstName, email: email.toLowerCase().trim(), mobileNumber: cleanedPhone }
      });

      if (!otpResult.success) {
        console.error('🔵 [SELLER-SIGNUP-OTP-SEND] FAILED:', {
          email,
          error: otpResult.error
        });
        
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again later.'
        });
      }

      console.log('🔵 [SELLER-SIGNUP-OTP-SEND] SUCCESS:', {
        email,
        phoneNumber: `${mobileNumber.substring(0, 6)}****`,
        requestId: otpResult.response?.request_id || 'N/A'
      });

      res.status(200).json({
        success: true,
        message: 'OTP has been sent to your phone number',
        data: {
          phoneNumber: `${mobileNumber.substring(0, 6)}****${mobileNumber.slice(-2)}`
        }
      });

    } catch (otpError) {
      console.error('🔵 [SELLER-SIGNUP-OTP-SEND] ERROR:', {
        email,
        error: otpError.message
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? otpError.message : undefined
      });
    }

  } catch (error) {
    console.error('🔵 [SELLER-SIGNUP-OTP-SEND] ERROR:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to send signup OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 NEW: Verify signup OTP and register seller
// @desc    Verify OTP and create seller account
// @route   POST /api/sellers/verify-signup-otp
// @access  Public
exports.verifySignupOTPAndRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { firstName, email, password, mobileNumber, otp, shop, bankDetails } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Valid 6-digit OTP is required'
      });
    }

    console.log('🟢 [SELLER-SIGNUP-OTP-VERIFY] START:', {
      firstName,
      email: email?.toLowerCase(),
      mobileNumber,
      otpLength: otp.length
    });

    // 🎯 CRITICAL FIX: Normalize phone number before verification to match MSG91 format (same as buyer side)
    const normalizedMobileNumber = msg91Config.normalizePhoneNumber(mobileNumber);

    console.log('🟢 [SELLER-SIGNUP-OTP-VERIFY] PHONE_NORMALIZATION:', {
      original: mobileNumber,
      normalized: normalizedMobileNumber,
      otpLength: otp.length
    });

    // �� FIX: Verify OTP directly with MSG91 API (authoritative verification) - same as buyer side
    // MSG91 API is the source of truth - it verifies against the OTP it sent
    const verificationResult = await msg91Service.verifyOTP({
      phoneNumber: normalizedMobileNumber,
      otp: otp.trim() // 🎯 CRITICAL: Trim OTP to remove any whitespace
    });

    if (!verificationResult.success) {
      console.warn('🟢 [SELLER-SIGNUP-OTP-VERIFY] FAILED:', {
        email,
        message: verificationResult.message
      });

      return res.status(400).json({
        success: false,
        message: verificationResult.message || 'Invalid or expired OTP'
      });
    }

    // OTP verified via MSG91 API - use request body data directly (same as buyer side)
    const finalFirstName = firstName;
    const finalEmail = email.toLowerCase().trim();
    const finalMobileNumber = mobileNumber.trim().replace(/\D/g, '');

    // Double-check seller doesn't exist (race condition protection)
    const sellerExists = await Seller.findOne({ email: finalEmail });
    if (sellerExists) {
      return res.status(400).json({
        success: false,
        message: 'Seller already exists with this email'
      });
    }

    const cleanedPhone = finalMobileNumber.replace(/\D/g, '');
    const searchVariants = [
      cleanedPhone,
      cleanedPhone.length === 10 ? `91${cleanedPhone}` : null,
      cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`,
      cleanedPhone.replace(/^91/, '')
    ].filter(Boolean);

    const mobileExists = await Seller.findOne({ 
      mobileNumber: { $in: searchVariants } 
    });
    if (mobileExists) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already registered'
      });
    }

    // Create seller data
    const sellerData = {
      firstName: finalFirstName,
      email: finalEmail,
      password, // Will be hashed by pre-save middleware
      mobileNumber: cleanedPhone.length === 10 ? `91${cleanedPhone}` : cleanedPhone,
      shop: shop || {},
      bankDetails: bankDetails || {}
    };

    const seller = await Seller.create(sellerData);

    console.log('🟢 [SELLER-SIGNUP-OTP-VERIFY] SUCCESS:', {
      sellerId: seller._id,
      email: seller.email,
      otpVerified: true
    });

    // Generate JWT token
    const token = generateToken(seller._id, 'seller');

    res.status(201).json({
      success: true,
      message: 'Seller registered successfully',
      data: {
        _id: seller._id,
        firstName: seller.firstName,
        email: seller.email,
        mobileNumber: seller.mobileNumber,
        shop: seller.shop,
        token
      }
    });

  } catch (error) {
    console.error('🟢 [SELLER-SIGNUP-OTP-VERIFY] ERROR:', {
      error: error.message,
      stack: error.stack
    });
    
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
      message: 'Server error during seller registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Login seller
// @route   POST /api/sellers/login
// @access  Public
exports.loginSeller = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    console.log('🔐 [SellerLogin] Login attempt:', {
      email: email,
      passwordLength: password?.length || 0,
      hasPassword: !!password
    });

    // Find seller
    const seller = await Seller.findOne({ email });

    if (!seller) {
      console.log('❌ [SellerLogin] Seller not found:', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ [SellerLogin] Seller found:', {
      sellerId: seller._id,
      sellerName: seller.firstName,
      hasStoredPassword: !!seller.password,
      storedPasswordLength: seller.password?.length || 0
    });

    // Match password
    const isMatch = await seller.matchPassword(password);

    console.log('🔍 [SellerLogin] Password match result:', {
      isMatch: isMatch,
      enteredPasswordLength: password?.length || 0,
      storedPasswordLength: seller.password?.length || 0
    });

    if (!isMatch) {
      console.log('❌ [SellerLogin] Password mismatch for seller:', {
        sellerId: seller._id,
        sellerEmail: seller.email
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(seller._id, 'seller');

    console.log('✅ [SellerLogin] Login successful:', {
      sellerId: seller._id,
      sellerName: seller.firstName,
      tokenGenerated: !!token
    });

    res.status(200).json({
      success: true,
      data: {
        _id: seller._id,
        firstName: seller.firstName,
        email: seller.email,
        mobileNumber: seller.mobileNumber,
        shop: seller.shop,
        token
      }
    });
  } catch (error) {
    console.error('❌ [SellerLogin] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get seller profile
// @route   GET /api/sellers/profile
// @access  Private
exports.getSellerProfile = async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id).select('-password');

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    res.status(200).json({
      success: true,
      data: seller
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

// @desc    Upload shop images
// @route   POST /api/sellers/upload-shop-images
// @access  Private
exports.uploadShopImages = async (req, res) => {
  try {
    console.log('📸 Shop image upload request received');
    
    const seller = await Seller.findById(req.seller._id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    let uploadedImages = [];
    
    // Handle file uploads
    if (req.files && req.files.length > 0) {
      console.log(`📁 Processing ${req.files.length} files`);
      
      const uploadPromises = req.files.map(async (file) => {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        return await uploadToCloudinary(dataURI, 'shop_images');
      });

      const results = await Promise.all(uploadPromises);
      uploadedImages = results.map(result => result.url);
      console.log('📁 Processed Cloudinary uploads:', uploadedImages);
    }

    if (uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    // Update seller's shop images
    seller.shop.images = [...(seller.shop.images || []), ...uploadedImages];
    
    // Set main image if not already set
    if (!seller.shop.mainImage && uploadedImages.length > 0) {
      seller.shop.mainImage = uploadedImages[0];
    }

    await seller.save();

    console.log('✅ Shop images uploaded successfully');
    
    res.status(200).json({
      success: true,
      message: 'Shop images uploaded successfully',
      data: {
        images: seller.shop.images,
        mainImage: seller.shop.mainImage
      }
    });

  } catch (error) {
    console.error('❌ Shop image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update seller profile
// @route   PUT /api/sellers/profile
// @access  Private
exports.updateSellerProfile = async (req, res) => {
  try {
    console.log('🔄 Profile update request received');
    console.log('📦 Request body keys:', Object.keys(req.body));
    
    // 🎯 DEBUGGING: Log shop data specifically
    if (req.body.shop) {
      console.log('🏪 Shop data received:', {
        hasImages: !!req.body.shop.images,
        imagesCount: req.body.shop.images?.length || 0,
        hasMainImage: !!req.body.shop.mainImage,
        imageTypes: req.body.shop.images?.map(img => 
          img.includes('cloudinary.com') ? 'Cloudinary' : 'Base64/Other'
        )
      });
    }

    const seller = await Seller.findById(req.seller._id);

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Update fields that are sent in the request
    if (req.body.firstName) seller.firstName = req.body.firstName;
    if (req.body.email) seller.email = req.body.email;
    if (req.body.mobileNumber) seller.mobileNumber = req.body.mobileNumber;
    
    // Update shop details if provided
    if (req.body.shop) {
      // Initialize shop object if it doesn't exist
      if (!seller.shop) {
        seller.shop = {};
      }

      // 🎯 FIXED: Handle shop images update properly
      if (req.body.shop.images) {
        // Filter out base64 images and keep only Cloudinary URLs
        const validImages = req.body.shop.images.filter(img => 
          img.includes('cloudinary.com') || img.startsWith('http')
        );
        
        if (validImages.length !== req.body.shop.images.length) {
          console.log('⚠️ Filtered out non-Cloudinary images:', {
            original: req.body.shop.images.length,
            valid: validImages.length
          });
        }
        
        seller.shop.images = validImages;
      }

      // Update main image if provided (only if it's a valid URL)
      if (req.body.shop.mainImage && 
          (req.body.shop.mainImage.includes('cloudinary.com') || 
           req.body.shop.mainImage.startsWith('http'))) {
        seller.shop.mainImage = req.body.shop.mainImage;
      }

      // Update other shop details
      if (req.body.shop.name) seller.shop.name = req.body.shop.name;
      if (req.body.shop.address) seller.shop.address = req.body.shop.address;
      if (req.body.shop.gstNumber) seller.shop.gstNumber = req.body.shop.gstNumber;
      if (req.body.shop.phoneNumber) {
        seller.shop.phoneNumber = seller.shop.phoneNumber || {};
        if (req.body.shop.phoneNumber.main) 
          seller.shop.phoneNumber.main = req.body.shop.phoneNumber.main;
        if (req.body.shop.phoneNumber.alternate) 
          seller.shop.phoneNumber.alternate = req.body.shop.phoneNumber.alternate;
      }
      if (req.body.shop.category) seller.shop.category = req.body.shop.category;
      if (req.body.shop.openTime) seller.shop.openTime = req.body.shop.openTime;
      if (req.body.shop.closeTime) seller.shop.closeTime = req.body.shop.closeTime;
      if (req.body.shop.workingDays) seller.shop.workingDays = req.body.shop.workingDays;
      if (req.body.shop.description) seller.shop.description = req.body.shop.description;
      
      // 🎯 ENHANCED: Handle location updates with validation
      if (req.body.shop.location) {
        const locationService = require('../utils/locationUtils');
        
        // If coordinates are provided, validate them
        if (req.body.shop.location.coordinates && 
            Array.isArray(req.body.shop.location.coordinates) && 
            req.body.shop.location.coordinates.length === 2) {
          
          const [lng, lat] = req.body.shop.location.coordinates;
          const validation = locationService.validateCoordinates(lng, lat);
          
          if (validation.isValid) {
            seller.shop.location = {
              type: 'Point',
              coordinates: [validation.longitude, validation.latitude]
            };
            console.log('✅ Shop location updated:', validation);
          } else {
            console.warn('⚠️ Invalid coordinates provided:', validation.error);
            // Keep existing location if new one is invalid
          }
        } else {
          // Handle address-based location (you can extend this)
          seller.shop.location = req.body.shop.location;
        }
      }
    }

    // Update bank details if provided
    if (req.body.bankDetails) {
      seller.bankDetails = seller.bankDetails || {};
      if (req.body.bankDetails.accountNumber) 
        seller.bankDetails.accountNumber = req.body.bankDetails.accountNumber;
      if (req.body.bankDetails.ifscCode) 
        seller.bankDetails.ifscCode = req.body.bankDetails.ifscCode;
      if (req.body.bankDetails.bankName) 
        seller.bankDetails.bankName = req.body.bankDetails.bankName;
      if (req.body.bankDetails.accountType) 
        seller.bankDetails.accountType = req.body.bankDetails.accountType;
    }

    // Update password if provided
    if (req.body.password) {
      seller.password = req.body.password;
    }

    // 🎯 DEBUGGING: Log seller data before saving
    console.log('💾 Seller data before saving:', {
      shopImagesCount: seller.shop.images?.length || 0,
      hasMainImage: !!seller.shop.mainImage,
      shopName: seller.shop.name,
      validCloudinaryImages: seller.shop.images?.filter(img => img.includes('cloudinary.com')).length || 0
    });

    const updatedSeller = await seller.save();

    // 🎯 DEBUGGING: Log seller data after saving
    console.log('✅ Seller data after saving:', {
      shopImagesCount: updatedSeller.shop.images?.length || 0,
      hasMainImage: !!updatedSeller.shop.mainImage,
      shopName: updatedSeller.shop.name
    });

    console.log('✅ Profile updated successfully');

    res.status(200).json({
      success: true,
      data: {
        _id: updatedSeller._id,
        firstName: updatedSeller.firstName,
        email: updatedSeller.email,
        mobileNumber: updatedSeller.mobileNumber,
        shop: updatedSeller.shop // 🎯 IMPORTANT: Return full shop data including images
      }
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// 🔧 NEW: Request password reset with OTP via MSG91 (uses LOGIN_TEMPLATE_ID)
// @desc    Request password reset - sends OTP to seller's phone
// @route   POST /api/sellers/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;

    // Accept either email or phone number
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    console.log('🟠 [SELLER-FORGOT-PASSWORD] START:', { 
      email: email || null,
      phoneNumber: phoneNumber || null,
      requestTime: new Date().toISOString()
    });

    // Find seller by email or phone number
    let seller;
    if (email) {
      seller = await Seller.findOne({ email: email.toLowerCase().trim() });
    } else {
      // Normalize phone number for search - try multiple formats
      const cleanedPhone = phoneNumber.trim().replace(/\D/g, '');
      const searchVariants = [
        cleanedPhone,
        cleanedPhone.length === 10 ? `91${cleanedPhone}` : null,
        cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`,
        cleanedPhone.replace(/^91/, '')
      ].filter(Boolean);
      
      seller = await Seller.findOne({ 
        mobileNumber: { $in: searchVariants } 
      });
    }

    if (!seller) {
      console.warn('🟠 [SELLER-FORGOT-PASSWORD] SELLER NOT FOUND:', { 
        email: email || null,
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : null
      });
      // Don't reveal if seller exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If a seller with that email/phone exists, an OTP has been sent.'
      });
    }

    // Check if seller has a mobile number
    if (!seller.mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Seller account does not have a registered phone number for OTP verification'
      });
    }

    // Send OTP via MSG91 (uses LOGIN_TEMPLATE_ID)
    try {
      const otpResult = await msg91Service.sendOTPForForgotPassword(seller.mobileNumber, {
        userName: seller.firstName || seller.email.split('@')[0],
        purpose: 'forgot_password'
      });

      if (!otpResult.success) {
        console.error('🟠 [SELLER-FORGOT-PASSWORD] OTP SEND FAILED:', {
          sellerId: seller._id,
          error: otpResult.error
        });
        
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again later.'
        });
      }

      console.log('🟠 [SELLER-FORGOT-PASSWORD] OTP SENT:', {
        sellerId: seller._id,
        email: seller.email,
        phoneNumber: `${seller.mobileNumber.substring(0, 6)}****`,
        requestId: otpResult.response?.request_id || 'N/A'
      });

      // Return masked phone number
      res.status(200).json({
        success: true,
        message: 'OTP has been sent to your phone number',
        data: {
          phoneNumber: `${seller.mobileNumber.substring(0, 6)}****${seller.mobileNumber.slice(-2)}`
        }
      });

    } catch (otpError) {
      console.error('🟠 [SELLER-FORGOT-PASSWORD] ERROR:', {
        sellerId: seller._id,
        error: otpError.message
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? otpError.message : undefined
      });
    }

  } catch (error) {
    console.error('🟠 [SELLER-FORGOT-PASSWORD] ERROR:', { 
      error: error.message,
      stack: error.stack 
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 NEW: Verify OTP for password reset (uses LOGIN_TEMPLATE_ID OTP)
// @desc    Verify OTP sent for password reset
// @route   POST /api/sellers/verify-forgot-password-otp
// @access  Public
exports.verifyForgotPasswordOTP = async (req, res) => {
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

    console.log('🟡 [SELLER-VERIFY-FORGOT-PASSWORD-OTP] START:', {
      email: email || null,
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : null,
      otpLength: otp.length
    });

    // Find seller - normalize phone number for consistent searching
    let seller;
    if (email) {
      seller = await Seller.findOne({ email: email.toLowerCase().trim() });
    } else {
      // Normalize phone number for search - try multiple formats
      const cleanedPhone = phoneNumber.trim().replace(/\D/g, '');
      const searchVariants = [
        cleanedPhone,
        cleanedPhone.length === 10 ? `91${cleanedPhone}` : null,
        cleanedPhone.startsWith('91') ? cleanedPhone : `91${cleanedPhone}`,
        cleanedPhone.replace(/^91/, '')
      ].filter(Boolean);
      
      seller = await Seller.findOne({ 
        mobileNumber: { $in: searchVariants } 
      });
    }

    if (!seller) {
      console.warn('🟡 [SELLER-VERIFY-FORGOT-PASSWORD-OTP] SELLER NOT FOUND:', { 
        email: email || null,
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 6)}****` : null
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid email/phone number or OTP'
      });
    }

    if (!seller.mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Seller account does not have a registered phone number'
      });
    }

    // Verify OTP using msg91Service
    const verificationResult = await msg91Service.verifyOTPSession(
      seller.mobileNumber,
      'forgot_password',
      otp
    );

    if (!verificationResult.success) {
      console.warn('🟡 [SELLER-VERIFY-FORGOT-PASSWORD-OTP] FAILED:', {
        sellerId: seller._id,
        message: verificationResult.message
      });

      return res.status(400).json({
        success: false,
        message: verificationResult.message || 'Invalid or expired OTP'
      });
    }

    // OTP verified successfully - generate reset token
    const resetToken = seller.getResetPasswordToken();
    await seller.save({ validateBeforeSave: false });

    console.log('🟡 [SELLER-VERIFY-FORGOT-PASSWORD-OTP] SUCCESS:', {
      sellerId: seller._id,
      email: seller.email,
      tokenLength: resetToken.length,
      expiresAt: new Date(seller.resetPasswordExpires).toISOString()
    });

    // Return reset token (frontend will use this for password reset)
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        resetToken,
        expiresAt: seller.resetPasswordExpires
      }
    });

  } catch (error) {
    console.error('🟡 [SELLER-VERIFY-FORGOT-PASSWORD-OTP] ERROR:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verify Reset Token (DEPRECATED - Use OTP flow instead)
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find seller by reset token and check if token is not expired
    const seller = await Seller.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!seller) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Token is valid'
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing your request'
    });
  }
};

// Reset Password (uses reset token from OTP verification)
// @desc    Reset password using token from OTP verification
// @route   PUT /api/sellers/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    console.log('🔄 [SELLER-RESET-PASSWORD] START:', {
      tokenLength: resetToken?.length || 0,
      passwordLength: password?.length || 0
    });

    // Hash the token to compare with stored hash (similar to User model)
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Find seller by reset token and check if token is not expired
    const seller = await Seller.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!seller) {
      console.log('❌ [SELLER-RESET-PASSWORD] Invalid or expired token');
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }

    console.log('✅ [SELLER-RESET-PASSWORD] Seller found:', {
      sellerId: seller._id,
      sellerName: seller.firstName,
      email: seller.email
    });

    // Update password (will be hashed by pre-save middleware)
    seller.password = password;
    seller.markModified('password');

    // Clear reset token fields
    seller.resetPasswordToken = undefined;
    seller.resetPasswordExpires = undefined;

    await seller.save();

    console.log('✅ [SELLER-RESET-PASSWORD] SUCCESS:', {
      sellerId: seller._id,
      email: seller.email
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('❌ [SELLER-RESET-PASSWORD] ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Direct Password Reset (no token required)
exports.resetPasswordDirect = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔄 [ResetPasswordDirect] Password reset attempt:', {
      email: email,
      passwordLength: password?.length || 0
    });
    
    // Find seller by email
    const seller = await Seller.findOne({ email });
    
    if (!seller) {
      console.log('❌ [ResetPasswordDirect] Seller not found:', { email });
      return res.status(404).json({
        success: false,
        message: 'Seller with this email does not exist'
      });
    }
    
    console.log('✅ [ResetPasswordDirect] Seller found:', {
      sellerId: seller._id,
      sellerName: seller.firstName,
      currentPasswordLength: seller.password?.length || 0
    });
    
    // 🎯 FIX: Use markModified to ensure pre-save middleware triggers
    seller.password = password;
    seller.markModified('password');
    
    await seller.save();
    
    console.log('✅ [ResetPasswordDirect] Password reset successful:', {
      sellerId: seller._id,
      newPasswordLength: seller.password?.length || 0
    });
    
    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('❌ [ResetPasswordDirect] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

// Check if email exists
exports.checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find seller by email
    const seller = await Seller.findOne({ email });
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller with this email does not exist'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Email exists'
    });
  } catch (error) {
    console.error('Check email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking email'
    });
  }
};

// 🎯 NEW: Get seller payment tracking data
// @desc    Get seller payment tracking and earnings data
// @route   GET /api/sellers/payment-tracking
// @access  Private
exports.getPaymentTracking = async (req, res) => {
  try {
    console.log('💰 [PaymentTracking] Fetching payment data for seller:', req.seller._id);
    
    const seller = await Seller.findById(req.seller._id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Get query parameters for filtering
    const { 
      startDate, 
      endDate, 
      status, 
      paymentMethod,
      page = 1, 
      limit = 20 
    } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    // Build status filter
    const statusFilter = {};
    if (status) {
      statusFilter.status = status;
    }

    // Build payment method filter
    const paymentFilter = {};
    if (paymentMethod) {
      paymentFilter.paymentMethod = paymentMethod;
    }

    // Combine all filters
    const combinedFilter = {
      seller: req.seller._id,
      ...dateFilter,
      ...statusFilter,
      ...paymentFilter
    };

    console.log('🔍 [PaymentTracking] Applied filters:', combinedFilter);

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch orders with pagination
    const orders = await Order.find(combinedFilter)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(combinedFilter);

    // Calculate earnings statistics
    const earningsStats = await Order.aggregate([
      {
        $match: {
          seller: req.seller._id,
          status: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isPaid: true
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalPrice' }
        }
      }
    ]);

    // Calculate daily earnings for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyEarnings = await Order.aggregate([
      {
        $match: {
          seller: req.seller._id,
          createdAt: { $gte: thirtyDaysAgo },
          status: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isPaid: true
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          dailyEarnings: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Calculate payment method distribution
    const paymentMethodStats = await Order.aggregate([
      {
        $match: {
          seller: req.seller._id,
          status: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isPaid: true
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Calculate status distribution
    const statusStats = await Order.aggregate([
      {
        $match: {
          seller: req.seller._id
        }
      },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Format orders for response
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      totalPrice: order.totalPrice,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      customer: {
        name: order.user?.name || 'Unknown',
        email: order.user?.email || 'Unknown'
      },
      items: order.orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image
      })),
      // 🎯 NEW: Payment tracking details
      paymentDetails: {
        gateway: order.paymentGateway,
        transactionId: order.paymentResult?.smepay_transaction_id || null,
        orderSlug: order.smepayOrderSlug || null,
        refId: order.paymentResult?.smepay_ref_id || null
      }
    }));

    const response = {
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / parseInt(limit)),
          totalOrders,
          hasNextPage: skip + orders.length < totalOrders,
          hasPrevPage: parseInt(page) > 1
        },
        statistics: {
          totalEarnings: earningsStats[0]?.totalEarnings || 0,
          totalOrders: earningsStats[0]?.totalOrders || 0,
          averageOrderValue: earningsStats[0]?.averageOrderValue || 0,
          dailyEarnings,
          paymentMethodStats,
          statusStats
        }
      }
    };

    console.log('✅ [PaymentTracking] Payment data fetched successfully:', {
      ordersCount: formattedOrders.length,
      totalEarnings: response.data.statistics.totalEarnings,
      totalOrders: response.data.statistics.totalOrders
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ [PaymentTracking] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// 🎯 NEW: Get seller earnings summary
// @desc    Get seller earnings summary for dashboard
// @route   GET /api/sellers/earnings-summary
// @access  Private
exports.getEarningsSummary = async (req, res) => {
  try {
    console.log('💰 [EarningsSummary] Fetching earnings summary for seller:', req.seller._id);

    const seller = await Seller.findById(req.seller._id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Get date range from query params
    const { period = '30' } = req.query; // Default to 30 days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // Calculate earnings for the period
    const periodEarnings = await Order.aggregate([
      {
        $match: {
          seller: req.seller._id,
          createdAt: { $gte: daysAgo },
          status: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isPaid: true
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$totalPrice' }
        }
      }
    ]);

    // Calculate today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEarnings = await Order.aggregate([
      {
        $match: {
          seller: req.seller._id,
          createdAt: { $gte: today, $lt: tomorrow },
          status: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isPaid: true
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Calculate this month's earnings
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const thisMonthEarnings = await Order.aggregate([
      {
        $match: {
          seller: req.seller._id,
          createdAt: { $gte: thisMonth },
          status: { $in: ['Delivered', 'Shipped', 'Processing'] },
          isPaid: true
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Get pending payments (orders delivered but not paid)
    const pendingPayments = await Order.aggregate([
      {
        $match: {
          seller: req.seller._id,
          status: 'Delivered',
          isPaid: false
        }
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    const response = {
      success: true,
      data: {
        periodEarnings: {
          total: periodEarnings[0]?.totalEarnings || 0,
          orders: periodEarnings[0]?.orderCount || 0,
          average: periodEarnings[0]?.averageOrderValue || 0
        },
        todayEarnings: {
          total: todayEarnings[0]?.totalEarnings || 0,
          orders: todayEarnings[0]?.orderCount || 0
        },
        thisMonthEarnings: {
          total: thisMonthEarnings[0]?.totalEarnings || 0,
          orders: thisMonthEarnings[0]?.orderCount || 0
        },
        pendingPayments: {
          total: pendingPayments[0]?.totalPending || 0,
          orders: pendingPayments[0]?.orderCount || 0
        }
      }
    };

    console.log('✅ [EarningsSummary] Earnings summary fetched successfully:', {
      periodEarnings: response.data.periodEarnings.total,
      todayEarnings: response.data.todayEarnings.total,
      thisMonthEarnings: response.data.thisMonthEarnings.total
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ [EarningsSummary] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// 🎯 NEW: Generate shipping label for order
// @desc    Generate shipping label for a specific order
// @route   POST /api/sellers/orders/:orderId/generate-label
// @access  Private
exports.generateShippingLabel = async (req, res) => {
  try {
    console.log('🏷️ [GenerateLabel] Label generation request for order:', req.params.orderId);
    
    const { orderId } = req.params;
    const sellerId = req.seller._id;

    // Find the order and verify seller ownership
    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    }).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to access this order'
      });
    }

    // Check if order is in correct status for label generation
    if (order.status !== 'Processing') {
      return res.status(400).json({
        success: false,
        message: 'Label can only be generated for orders in "Ready to Ship" status'
      });
    }

    // Check if label is already generated
    if (order.shippingLabel.isGenerated) {
      return res.status(400).json({
        success: false,
        message: 'Shipping label has already been generated for this order',
        data: {
          labelUrl: order.shippingLabel.labelUrl,
          trackingNumber: order.shippingLabel.trackingNumber,
          generatedAt: order.shippingLabel.generatedAt
        }
      });
    }

    // Generate label data in order
    await order.generateShippingLabel();

    // Get seller data for label generation
    const seller = await Seller.findById(sellerId);

    // Generate PDF label
    const labelResult = await labelGenerationService.generateShippingLabel(order, seller);

    // Update order with label URL
    order.shippingLabel.labelUrl = labelResult.labelUrl;
    await order.save();

    console.log('✅ [GenerateLabel] Label generated successfully:', {
      orderId,
      orderNumber: order.orderNumber,
      trackingNumber: labelResult.trackingNumber,
      labelUrl: labelResult.labelUrl
    });

    res.status(200).json({
      success: true,
      message: 'Shipping label generated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: labelResult.trackingNumber,
        destinationCode: labelResult.destinationCode,
        returnCode: labelResult.returnCode,
        labelUrl: labelResult.labelUrl,
        generatedAt: order.shippingLabel.generatedAt
      }
    });

  } catch (error) {
    console.error('❌ [GenerateLabel] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate shipping label',
      error: error.message
    });
  }
};

// 🎯 NEW: Get shipping label data
// @desc    Get shipping label information for a specific order
// @route   GET /api/sellers/orders/:orderId/label
// @access  Private
exports.getShippingLabel = async (req, res) => {
  try {
    console.log('🏷️ [GetLabel] Fetching label data for order:', req.params.orderId);
    
    const { orderId } = req.params;
    const sellerId = req.seller._id;

    // Find the order and verify seller ownership
    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    }).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to access this order'
      });
    }

    if (!order.shippingLabel.isGenerated) {
      return res.status(404).json({
        success: false,
        message: 'Shipping label has not been generated for this order yet'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: order.shippingLabel.trackingNumber,
        carrier: order.shippingLabel.carrier,
        serviceType: order.shippingLabel.serviceType,
        destinationCode: order.shippingLabel.destinationCode,
        returnCode: order.shippingLabel.returnCode,
        labelUrl: order.shippingLabel.labelUrl,
        generatedAt: order.shippingLabel.generatedAt,
        labelData: order.shippingLabel.labelData
      }
    });

  } catch (error) {
    console.error('❌ [GetLabel] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipping label data',
      error: error.message
    });
  }
};

// 🎯 NEW: Download shipping label PDF
// @desc    Download shipping label PDF for a specific order
// @route   GET /api/sellers/orders/:orderId/label/download
// @access  Private
exports.downloadShippingLabel = async (req, res) => {
  try {
    console.log('📥 [DownloadLabel] Download request for order:', req.params.orderId);
    
    const { orderId } = req.params;
    const sellerId = req.seller._id;

    // Find the order and verify seller ownership
    const order = await Order.findOne({
      _id: orderId,
      seller: sellerId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission to access this order'
      });
    }

    if (!order.shippingLabel.isGenerated || !order.shippingLabel.labelUrl) {
      return res.status(404).json({
        success: false,
        message: 'Shipping label has not been generated for this order yet'
      });
    }

    // Redirect to the label URL for download
    res.redirect(order.shippingLabel.labelUrl);

  } catch (error) {
    console.error('❌ [DownloadLabel] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download shipping label',
      error: error.message
    });
  }
};
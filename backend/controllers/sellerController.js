//backend/controllers/sellerController.js 
const Seller = require('../models/Seller');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

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

// Request Password Reset
exports.forgotPassword = async (req, res) => {
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
    
    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token expiry (1 hour from now)
    seller.resetPasswordToken = resetToken;
    seller.resetPasswordExpires = Date.now() + 3600000; // 1 hour in milliseconds
    
    await seller.save();
    
    // In a real implementation, send an email with the reset link
    // For now, we'll just return success
    // The reset link would be: `${process.env.FRONTEND_URL}/seller/reset-password/${resetToken}`
    
    return res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email',
      // In development, we can return the token directly
      // In production, remove this and send email instead
      devToken: resetToken
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing your request'
    });
  }
};

// Verify Reset Token
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

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    console.log('🔄 [ResetPassword] Password reset attempt:', {
      tokenLength: token?.length || 0,
      passwordLength: password?.length || 0
    });
    
    // Find seller by reset token and check if token is not expired
    const seller = await Seller.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!seller) {
      console.log('❌ [ResetPassword] Invalid or expired token:', { token });
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }
    
    console.log('✅ [ResetPassword] Seller found:', {
      sellerId: seller._id,
      sellerName: seller.firstName,
      currentPasswordLength: seller.password?.length || 0
    });
    
    // 🎯 FIX: Use markModified to ensure pre-save middleware triggers
    seller.password = password;
    seller.markModified('password');
    
    // Clear reset token fields
    seller.resetPasswordToken = undefined;
    seller.resetPasswordExpires = undefined;
    
    await seller.save();
    
    console.log('✅ [ResetPassword] Password reset successful:', {
      sellerId: seller._id,
      newPasswordLength: seller.password?.length || 0
    });
    
    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('❌ [ResetPassword] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error resetting password'
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
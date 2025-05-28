const Seller = require('../models/Seller');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 🎯 NEW: Mock image upload function (same as used in AddProduct.js)
const mockImageUpload = async (file) => {
  try {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create base64 data URL for reliable image display
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target.result); // Returns base64 data URL
      };
      reader.onerror = (error) => {
        console.error('File reading error:', error);
        // Fallback to a placeholder
        resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz4KPHRleHQgeD0iMTUwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+U2hvcCBJbWFnZTwvdGV4dD4KPC9zdmc+');
      };
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Image upload error:', error);
    // Return placeholder SVG
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz4KPHRleHQgeD0iMTUwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+U2hvcCBJbWFnZTwvdGV4dD4KPC9zdmc+';
  }
};

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
      const token = generateToken(seller._id);

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

    // Find seller
    const seller = await Seller.findOne({ email });

    if (!seller) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Match password
    const isMatch = await seller.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(seller._id);

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
    console.error(error);
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

// 🎯 NEW: Upload shop images endpoint
// @desc    Upload shop images
// @route   POST /api/sellers/upload-shop-images
// @access  Private
exports.uploadShopImages = async (req, res) => {
  try {
    console.log('📸 Shop image upload request received');
    console.log('Request body:', req.body);
    console.log('Files received:', req.files ? req.files.length : 'No files');

    const seller = await Seller.findById(req.seller._id);
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Handle images from request body (base64 encoded images)
    let uploadedImages = [];
    
    if (req.body.images && Array.isArray(req.body.images)) {
      uploadedImages = req.body.images;
      console.log('📷 Processing base64 images:', uploadedImages.length);
    }

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      const fileUrls = req.files.map(file => `/uploads/${file.filename}`);
      uploadedImages = [...uploadedImages, ...fileUrls];
      console.log('📁 Processing file uploads:', fileUrls);
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
        firstImageType: req.body.shop.images?.[0]?.substring(0, 20) + '...' || 'none'
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

      // Update basic shop details
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
      
      // 🎯 ENHANCED: Handle shop images update with better debugging  
      if (req.body.shop.images) {
        console.log('📸 Updating shop images');
        console.log('📊 Images data:', {
          isArray: Array.isArray(req.body.shop.images),
          length: req.body.shop.images.length,
          firstImagePreview: req.body.shop.images[0]?.substring(0, 50) + '...' || 'none'
        });
        
        // Ensure images is an array and initialize if needed
        if (Array.isArray(req.body.shop.images)) {
          seller.shop.images = req.body.shop.images;
          console.log('✅ Shop images updated successfully');
        } else {
          console.log('❌ Shop images is not an array:', typeof req.body.shop.images);
          seller.shop.images = []; // Initialize as empty array if invalid
        }
      }

      // 🎯 ENHANCED: Handle main image update with debugging
      if (req.body.shop.mainImage) {
        console.log('🖼️ Updating main shop image');
        console.log('🔍 Main image preview:', req.body.shop.mainImage.substring(0, 50) + '...');
        seller.shop.mainImage = req.body.shop.mainImage;
        console.log('✅ Main shop image updated successfully');
      }

      // 🎯 Handle shop description
      if (req.body.shop.description !== undefined) {
        seller.shop.description = req.body.shop.description;
        console.log('📝 Shop description updated');
      }
      
      // Location data
      if (req.body.shop.location && req.body.shop.location.coordinates) {
        seller.shop.location = {
          type: 'Point',
          coordinates: req.body.shop.location.coordinates
        };
        console.log('📍 Shop location updated');
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
      shopName: seller.shop.name
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
    
    // Update password
    seller.password = password;
    
    // Clear reset token fields
    seller.resetPasswordToken = undefined;
    seller.resetPasswordExpires = undefined;
    
    await seller.save();
    
    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
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
    
    // Find seller by email
    const seller = await Seller.findOne({ email });
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller with this email does not exist'
      });
    }
    
    // Update password
    seller.password = password;
    
    await seller.save();
    
    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
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
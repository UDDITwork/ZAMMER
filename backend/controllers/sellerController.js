const Seller = require('../models/Seller');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

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

// @desc    Update seller profile
// @route   PUT /api/sellers/profile
// @access  Private
exports.updateSellerProfile = async (req, res) => {
  try {
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
      if (req.body.shop.name) seller.shop.name = req.body.shop.name;
      if (req.body.shop.address) seller.shop.address = req.body.shop.address;
      if (req.body.shop.gstNumber) seller.shop.gstNumber = req.body.shop.gstNumber;
      if (req.body.shop.phoneNumber) {
        if (req.body.shop.phoneNumber.main) 
          seller.shop.phoneNumber.main = req.body.shop.phoneNumber.main;
        if (req.body.shop.phoneNumber.alternate) 
          seller.shop.phoneNumber.alternate = req.body.shop.phoneNumber.alternate;
      }
      if (req.body.shop.category) seller.shop.category = req.body.shop.category;
      if (req.body.shop.openTime) seller.shop.openTime = req.body.shop.openTime;
      if (req.body.shop.closeTime) seller.shop.closeTime = req.body.shop.closeTime;
      if (req.body.shop.workingDays) seller.shop.workingDays = req.body.shop.workingDays;
      
      // Location data
      if (req.body.shop.location && req.body.shop.location.coordinates) {
        seller.shop.location = {
          type: 'Point',
          coordinates: req.body.shop.location.coordinates
        };
      }
    }

    // Update bank details if provided
    if (req.body.bankDetails) {
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

    const updatedSeller = await seller.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedSeller._id,
        firstName: updatedSeller.firstName,
        email: updatedSeller.email,
        mobileNumber: updatedSeller.mobileNumber,
        shop: updatedSeller.shop
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
const express = require('express');
const router = express.Router();
const { upload, handleMulterError, logUploadOperation } = require('../middleware/uploadMiddleware');
const { uploadToCloudinary } = require('../utils/cloudinary');

// Custom middleware that checks token and sets appropriate user object (same as supportRoutes)
const protectAnyUser = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Try to find user in each model
      const User = require('../models/User');
      const Seller = require('../models/Seller');
      const DeliveryAgent = require('../models/DeliveryAgent');
      
      // Check buyer
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        return next();
      }
      
      // Check seller
      const seller = await Seller.findById(decoded.id).select('-password');
      if (seller) {
        req.seller = seller;
        return next();
      }
      
      // Check delivery agent
      const agent = await DeliveryAgent.findById(decoded.id).select('-password');
      if (agent) {
        req.deliveryAgent = agent;
        return next();
      }
      
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// @route   POST /api/support/upload
// @desc    Upload image for support ticket (works for all user types)
// @access  Private (User/Seller/Delivery)
router.post('/', protectAnyUser, logUploadOperation, upload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('📁 Processing support ticket image upload to Cloudinary');
    
    // Convert buffer to base64 for Cloudinary
    const b64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    // Upload to Cloudinary with support_tickets folder
    const result = await uploadToCloudinary(dataURI, 'support_tickets');
    
    console.log('✅ Support ticket image uploaded to Cloudinary:', result.url);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Support ticket Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image to Cloudinary',
      error: error.message
    });
  }
});

// @route   POST /api/support/upload/multiple
// @desc    Upload multiple images for support ticket (works for all user types)
// @access  Private (User/Seller/Delivery)
router.post('/multiple', protectAnyUser, logUploadOperation, upload.array('images', 5), handleMulterError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    console.log(`📁 Processing ${req.files.length} support ticket images for Cloudinary upload`);
    
    const uploadPromises = req.files.map(async (file) => {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      return await uploadToCloudinary(dataURI, 'support_tickets');
    });

    const results = await Promise.all(uploadPromises);
    
    console.log(`✅ ${results.length} support ticket images uploaded to Cloudinary`);
    
    res.json({
      success: true,
      data: results.map(result => ({
        url: result.url,
        public_id: result.public_id
      }))
    });
  } catch (error) {
    console.error('❌ Multiple support ticket Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images to Cloudinary',
      error: error.message
    });
  }
});

module.exports = router;


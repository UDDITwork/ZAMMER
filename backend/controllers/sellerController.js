//backend/controllers/sellerController.js 
const Seller = require('../models/Seller');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const Order = require('../models/Order'); // Added Order model import

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
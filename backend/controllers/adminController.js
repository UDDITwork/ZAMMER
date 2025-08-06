const Admin = require('../models/Admin');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Product = require('../models/Product');
const { generateAdminToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');

// Enhanced logging function
const adminLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [ADMIN-CONTROLLER] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
};

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
exports.loginAdmin = async (req, res) => {
  try {
    adminLog('Admin Login Attempt', 'INFO', { email: req.body.email });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      adminLog('Admin Login Validation Error', 'ERROR', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email, isActive: true });

    if (!admin) {
      adminLog('Admin Login Failed', 'ERROR', { email, reason: 'Admin not found' });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      adminLog('Admin Login Failed', 'ERROR', { email, reason: 'Password mismatch' });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = generateAdminToken(admin._id);

    adminLog('Admin Login Success', 'SUCCESS', { 
      adminId: admin._id, 
      adminName: admin.name,
      role: admin.role 
    });

    res.status(200).json({
      success: true,
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        token
      }
    });
  } catch (error) {
    adminLog('Admin Login Error', 'ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get All Registered Sellers
// @route   GET /api/admin/sellers
// @access  Private (Admin)
exports.getAllSellers = async (req, res) => {
  try {
    adminLog('Get All Sellers Request', 'INFO');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get all sellers with shop information
    const [sellers, totalSellers] = await Promise.all([
      Seller.find({})
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Seller.countDocuments({})
    ]);

    // Get product counts for each seller
    const sellerIds = sellers.map(seller => seller._id);
    const productCounts = await Product.aggregate([
      { $match: { seller: { $in: sellerIds } } },
      { $group: { _id: '$seller', count: { $sum: 1 } } }
    ]);

    // Create a map for quick lookup
    const productCountMap = productCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    // Add product counts to sellers
    const sellersWithCounts = sellers.map(seller => ({
      ...seller,
      productCount: productCountMap[seller._id.toString()] || 0
    }));

    adminLog('Get All Sellers Success', 'SUCCESS', { 
      count: sellers.length,
      total: totalSellers,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      data: sellersWithCounts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSellers / limit),
        totalSellers,
        hasNextPage: page < Math.ceil(totalSellers / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    adminLog('Get All Sellers Error', 'ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get Single Seller Profile with Products
// @route   GET /api/admin/sellers/:id
// @access  Private (Admin)
exports.getSellerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    adminLog('Get Seller Profile Request', 'INFO', { sellerId: id });

    // Get seller details
    const seller = await Seller.findById(id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .lean();

    if (!seller) {
      adminLog('Get Seller Profile Error', 'ERROR', { sellerId: id, reason: 'Seller not found' });
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Get seller's products
    const products = await Product.find({ seller: id })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate seller statistics
    const stats = {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.status === 'active').length,
      pausedProducts: products.filter(p => p.status === 'paused').length,
      outOfStockProducts: products.filter(p => p.status === 'outOfStock').length,
      limitedEditionProducts: products.filter(p => p.isLimitedEdition).length,
      trendingProducts: products.filter(p => p.isTrending).length
    };

    adminLog('Get Seller Profile Success', 'SUCCESS', { 
      sellerId: id,
      sellerName: seller.firstName,
      shopName: seller.shop?.name,
      totalProducts: stats.totalProducts
    });

    res.status(200).json({
      success: true,
      data: {
        seller,
        products,
        stats
      }
    });
  } catch (error) {
    adminLog('Get Seller Profile Error', 'ERROR', { 
      sellerId: req.params.id, 
      error: error.message 
    });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get All Registered Users/Buyers
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    adminLog('Get All Users Request', 'INFO');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get all users
    const [users, totalUsers] = await Promise.all([
      User.find({})
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({})
    ]);

    adminLog('Get All Users Success', 'SUCCESS', { 
      count: users.length,
      total: totalUsers,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: page < Math.ceil(totalUsers / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    adminLog('Get All Users Error', 'ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get Single User Profile
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
exports.getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    adminLog('Get User Profile Request', 'INFO', { userId: id });

    // Get user details with populated wishlist
    const user = await User.findById(id)
      .select('-password')
      .populate({
        path: 'wishlist',
        select: 'name images zammerPrice mrp category'
      })
      .lean();

    if (!user) {
      adminLog('Get User Profile Error', 'ERROR', { userId: id, reason: 'User not found' });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate user statistics
    const stats = {
      wishlistItems: user.wishlist ? user.wishlist.length : 0,
      isVerified: user.isVerified,
      hasLocation: !!(user.location && user.location.coordinates),
      joinedDate: user.createdAt
    };

    adminLog('Get User Profile Success', 'SUCCESS', { 
      userId: id,
      userName: user.name,
      userEmail: user.email,
      wishlistItems: stats.wishlistItems
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        stats
      }
    });
  } catch (error) {
    adminLog('Get User Profile Error', 'ERROR', { 
      userId: req.params.id, 
      error: error.message 
    });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get Admin Dashboard Statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    adminLog('Get Dashboard Stats Request', 'INFO');

    const [
      totalSellers,
      totalUsers,
      totalProducts,
      activeProducts,
      sellersWithShops,
      recentSellers,
      recentUsers
    ] = await Promise.all([
      Seller.countDocuments({}),
      User.countDocuments({}),
      Product.countDocuments({}),
      Product.countDocuments({ status: 'active' }),
      Seller.countDocuments({ 'shop.name': { $exists: true, $ne: null, $ne: '' } }),
      Seller.find({}).sort({ createdAt: -1 }).limit(5).select('firstName email shop.name createdAt').lean(),
      User.find({}).sort({ createdAt: -1 }).limit(5).select('name email createdAt').lean()
    ]);

    const stats = {
      overview: {
        totalSellers,
        totalUsers,
        totalProducts,
        activeProducts,
        sellersWithShops
      },
      recent: {
        sellers: recentSellers,
        users: recentUsers
      }
    };

    adminLog('Get Dashboard Stats Success', 'SUCCESS', { 
      totalSellers,
      totalUsers,
      totalProducts
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    adminLog('Get Dashboard Stats Error', 'ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 
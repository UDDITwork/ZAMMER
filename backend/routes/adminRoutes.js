// backend/routes/adminRoutes.js - COMPLETE Admin Routes with Order Management
// 🎯 ADDED: Complete admin order management routes
// 🎯 ADDED: Delivery agent management routes
// 🎯 ADDED: Order approval and assignment endpoints

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');

const { 
  loginAdmin,
  getDashboardStats,
  getAllSellers,
  getAllUsers,
  // Order management functions
  getRecentOrders,
  getAllOrders,
  getOrderDetails,
  getAssignedAcceptedOrders,
  approveAndAssignOrder,
  bulkAssignOrders,
  updateOrderStatus,
  // Delivery agent management functions
  getDeliveryAgents,
  getAvailableDeliveryAgents,
  getDeliveryAgentProfile,
  // Payout management functions
  getPayoutAnalytics,
  getAllPayouts,
  getPayoutBatchDetails,
  processManualBatchPayout,
  updateOrderPayoutEligibility,
  getPayoutEligibilityStats
} = require('../controllers/adminController');

// Import all required models
const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const DeliveryAgent = require('../models/DeliveryAgent');

const { protectAdmin } = require('../middleware/adminMiddleware');

// Enhanced validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Enhanced logging middleware for admin routes
const logAdminRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`🔧 [ADMIN-ROUTES] ${timestamp} - ${req.method} ${req.originalUrl}`, {
    adminId: req.admin?._id,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    params: req.params,
    query: req.query
  });
  next();
};

// Apply logging to all admin routes
router.use(logAdminRequest);

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], validateRequest, loginAdmin);

// @route   GET /api/admin/test
// @desc    Test admin endpoint
// @access  Public (for testing)
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin endpoint is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Apply admin authentication to all routes below
router.use(protectAdmin);

// @route   GET /api/admin/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/dashboard/stats', getDashboardStats);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard orders (NEW ROUTE)
// @access  Private (Admin)
router.get('/dashboard', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isString().withMessage('Status must be a string'),
  validateRequest
], async (req, res) => {
  try {
    const { getAdminDashboardOrders } = require('../controllers/orderController');
    await getAdminDashboardOrders(req, res);
  } catch (error) {
    console.error('Admin dashboard route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// 🎯 NEW: Order Management Routes

// @route   GET /api/admin/orders/recent
// @desc    Get recent orders needing approval
// @access  Private (Admin)
router.get('/orders/recent', [
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'all'])
    .withMessage('Invalid status filter'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
], validateRequest, getRecentOrders);

// @route   GET /api/admin/orders
// @desc    Get all orders with filtering
// @access  Private (Admin)
router.get('/orders', [
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'all'])
    .withMessage('Invalid status filter'),
  query('paymentStatus')
    .optional()
    .isIn(['paid', 'unpaid'])
    .withMessage('Invalid payment status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo')
], validateRequest, getAllOrders);

// @route   GET /api/admin/orders/:orderId
// @desc    Get detailed information about a specific order
// @access  Private (Admin)
router.get('/orders/:orderId', [
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format')
], validateRequest, getOrderDetails);

// @route   GET /api/admin/orders/assigned-accepted
// @desc    Get orders assigned to delivery agents and accepted by them with tracking
// @access  Private (Admin)
router.get('/orders/assigned-accepted', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], validateRequest, getAssignedAcceptedOrders);

// @route   POST /api/admin/orders/approve-assign
// @desc    Approve an order and assign it to a delivery agent
// @access  Private (Admin)
router.post('/orders/approve-assign', [
  body('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  body('deliveryAgentId')
    .isMongoId()
    .withMessage('Invalid delivery agent ID format'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
], validateRequest, approveAndAssignOrder);

// @route   POST /api/admin/orders/bulk-assign
// @desc    Bulk assign multiple orders to a single delivery agent
// @access  Private (Admin)
router.post('/orders/bulk-assign', [
  body('orderIds')
    .isArray({ min: 1 })
    .withMessage('Order IDs must be a non-empty array'),
  body('orderIds.*')
    .isMongoId()
    .withMessage('Each order ID must be a valid MongoDB ObjectId'),
  body('deliveryAgentId')
    .isMongoId()
    .withMessage('Invalid delivery agent ID format'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
], validateRequest, bulkAssignOrders);

// @route   PUT /api/admin/orders/:orderId/status
// @desc    Update order status with admin notes
// @access  Private (Admin)
router.put('/orders/:orderId/status', [
  param('orderId')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  body('status')
    .isIn(['pending', 'confirmed', 'approved', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
], validateRequest, updateOrderStatus);

// 🎯 NEW: Delivery Agent Management Routes

// @route   GET /api/admin/delivery-agents
// @desc    Get all delivery agents with filtering
// @access  Private (Admin)
router.get('/delivery-agents', [
  query('status')
    .optional()
    .isIn(['available', 'assigned', 'offline', 'all'])
    .withMessage('Invalid status filter'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  query('vehicleType')
    .optional()
    .isIn(['bike', 'scooter', 'car', 'bicycle', 'all'])
    .withMessage('Invalid vehicle type'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], validateRequest, getDeliveryAgents);

// @route   GET /api/admin/delivery-agents/available
// @desc    Get available delivery agents with capacity information
// @access  Private (Admin)
router.get('/delivery-agents/available', [
  query('vehicleType')
    .optional()
    .isIn(['bike', 'scooter', 'car', 'bicycle', 'all'])
    .withMessage('Invalid vehicle type'),
  query('area')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Area must be less than 100 characters'),
  query('maxCapacity')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Max capacity must be between 1 and 10')
], validateRequest, getAvailableDeliveryAgents);

// @route   GET /api/admin/delivery-agents/:agentId
// @desc    Get detailed information about a specific delivery agent
// @access  Private (Admin)
router.get('/delivery-agents/:agentId', [
  param('agentId')
    .isMongoId()
    .withMessage('Invalid agent ID format')
], validateRequest, getDeliveryAgentProfile);

// @route   POST /api/admin/delivery-agents
// @desc    Create a new delivery agent
// @access  Private (Admin)
router.post('/delivery-agents', [
  body('name')
    .notEmpty()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('mobileNumber')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid Indian mobile number'),
  body('vehicleType')
    .isIn(['bike', 'scooter', 'car', 'bicycle'])
    .withMessage('Invalid vehicle type'),
  body('licenseNumber')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('License number must be between 5 and 20 characters'),
  body('area')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Area must be less than 100 characters')
], validateRequest, async (req, res) => {
  try {
    const agentData = req.body;
    
    // Check if agent already exists
    const existingAgent = await DeliveryAgent.findOne({ 
      $or: [
        { email: agentData.email },
        { mobileNumber: agentData.mobileNumber }
      ]
    });

    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Delivery agent with this email or mobile number already exists'
      });
    }

    // Create new delivery agent
    const agent = new DeliveryAgent({
      ...agentData,
      createdBy: req.admin._id,
      isActive: true,
      status: 'available'
    });

    await agent.save();

    console.log(`✅ [ADMIN-ROUTES] Delivery agent created:`, {
      agentId: agent._id,
      name: agent.name,
      email: agent.email,
      createdBy: req.admin._id
    });

    res.status(201).json({
      success: true,
      message: 'Delivery agent created successfully',
      data: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        mobileNumber: agent.mobileNumber,
        vehicleType: agent.vehicleType,
        status: agent.status,
        isActive: agent.isActive
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN-ROUTES] Create delivery agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery agent'
    });
  }
});

// @route   PUT /api/admin/delivery-agents/:agentId/status
// @desc    Update delivery agent status
// @access  Private (Admin)
router.put('/delivery-agents/:agentId/status', [
  param('agentId')
    .isMongoId()
    .withMessage('Invalid agent ID format'),
  body('status')
    .optional()
    .isIn(['available', 'assigned', 'offline'])
    .withMessage('Invalid status'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], validateRequest, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status, isActive } = req.body;

    const agent = await DeliveryAgent.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // Update fields if provided
    if (status !== undefined) {
      agent.status = status;
    }
    
    if (isActive !== undefined) {
      agent.isActive = isActive;
    }

    agent.updatedBy = req.admin._id;
    await agent.save();

    console.log(`✅ [ADMIN-ROUTES] Delivery agent status updated:`, {
      agentId,
      newStatus: agent.status,
      isActive: agent.isActive,
      updatedBy: req.admin._id
    });

    res.status(200).json({
      success: true,
      message: 'Delivery agent status updated successfully',
      data: {
        _id: agent._id,
        name: agent.name,
        status: agent.status,
        isActive: agent.isActive,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN-ROUTES] Update delivery agent status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery agent status'
    });
  }
});

// 🎯 EXISTING: User and Seller Management Routes

// @route   GET /api/admin/sellers
// @desc    Get all sellers
// @access  Private (Admin)
router.get('/sellers', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('Invalid status filter'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters')
], validateRequest, getAllSellers);

// @route   GET /api/admin/sellers/:sellerId
// @desc    Get seller profile with details
// @access  Private (Admin)
router.get('/sellers/:sellerId', [
  param('sellerId')
    .isMongoId()
    .withMessage('Invalid seller ID format')
], validateRequest, async (req, res) => {
  try {
    const { sellerId } = req.params;

    const seller = await Seller.findById(sellerId)
      .select('-password')
      .populate('shop');

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    // Get seller statistics
    const [totalProducts, activeProducts, totalOrders, totalRevenue] = await Promise.all([
      Product.countDocuments({ seller: sellerId }),
      Product.countDocuments({ seller: sellerId, isActive: true }),
      Order.countDocuments({ seller: sellerId }),
      Order.aggregate([
        { $match: { seller: sellerId, isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ])
    ]);

    const stats = {
      totalProducts,
      activeProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    };

    res.status(200).json({
      success: true,
      message: 'Seller profile retrieved successfully',
      data: {
        seller,
        stats
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN-ROUTES] Get seller profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller profile'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('Invalid status filter'),
  query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters')
], validateRequest, getAllUsers);

// @route   GET /api/admin/users/:userId
// @desc    Get user profile with details
// @access  Private (Admin)
router.get('/users/:userId', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
], validateRequest, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user statistics
    const [totalOrders, totalSpent, wishlistItems] = await Promise.all([
      Order.countDocuments({ user: userId }),
      Order.aggregate([
        { $match: { user: userId, isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      // Assuming you have a Wishlist model or wishlist field in User
      0 // Placeholder for wishlist count
    ]);

    const stats = {
      totalOrders,
      totalSpent: totalSpent[0]?.total || 0,
      wishlistItems
    };

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user,
        stats
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN-ROUTES] Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// 🎯 NEW: Analytics and Reporting Routes

// @route   GET /api/admin/analytics/orders
// @desc    Get order analytics
// @access  Private (Admin)
router.get('/analytics/orders', [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Invalid period. Use 7d, 30d, 90d, or 1y'),
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Invalid groupBy. Use day, week, or month')
], validateRequest, async (req, res) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;

    // Calculate date range
    const now = new Date();
    const periodMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    
    const startDate = new Date(now.getTime() - (periodMap[period] * 24 * 60 * 60 * 1000));

    // Group by format
    const groupFormat = {
      day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      week: { $dateToString: { format: "%Y-W%U", date: "$createdAt" } },
      month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
    };

    const analytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupFormat[groupBy],
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, "$totalPrice", 0] } },
          paidOrders: { $sum: { $cond: [{ $eq: ["$isPaid", true] }, 1, 0] } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Order analytics retrieved successfully',
      data: {
        period,
        groupBy,
        analytics
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN-ROUTES] Get order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order analytics'
    });
  }
});

// 🎯 NEW: Payout Management Routes

// @route   GET /api/admin/payouts/analytics
// @desc    Get comprehensive payout analytics
// @access  Private (Admin)
router.get('/payouts/analytics', [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Invalid period. Use 7d, 30d, 90d, or 1y'),
  query('sellerId')
    .optional()
    .isMongoId()
    .withMessage('Invalid seller ID format')
], validateRequest, getPayoutAnalytics);

// @route   GET /api/admin/payouts
// @desc    Get all payouts with filtering
// @access  Private (Admin)
router.get('/payouts', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['ELIGIBLE', 'NOT_ELIGIBLE', 'PENDING', 'RECEIVED', 'APPROVAL_PENDING', 'SENT_TO_BANK', 'SUCCESS', 'FAILED', 'REJECTED', 'REVERSED', 'CANCELLED', 'all'])
    .withMessage('Invalid payout status'),
  query('sellerId')
    .optional()
    .isMongoId()
    .withMessage('Invalid seller ID format'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo'),
  query('batchTransferId')
    .optional()
    .isString()
    .withMessage('Invalid batch transfer ID format'),
  query('orderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid order ID format')
], validateRequest, getAllPayouts);

// @route   GET /api/admin/payouts/batch/:batchTransferId
// @desc    Get detailed information about a payout batch
// @access  Private (Admin)
router.get('/payouts/batch/:batchTransferId', [
  param('batchTransferId')
    .notEmpty()
    .withMessage('Batch transfer ID is required')
], validateRequest, getPayoutBatchDetails);

// @route   POST /api/admin/payouts/process-batch
// @desc    Manually trigger batch payout processing
// @access  Private (Admin)
router.post('/payouts/process-batch', [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('sellerIds')
    .optional()
    .isArray()
    .withMessage('Seller IDs must be an array'),
  body('sellerIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each seller ID must be a valid MongoDB ObjectId'),
  body('force')
    .optional()
    .isBoolean()
    .withMessage('Force must be a boolean')
], validateRequest, processManualBatchPayout);

// @route   POST /api/admin/payouts/update-eligibility
// @desc    Manually update payout eligibility for orders
// @access  Private (Admin)
router.post('/payouts/update-eligibility', [
  body('orderIds')
    .isArray({ min: 1 })
    .withMessage('Order IDs must be a non-empty array'),
  body('orderIds.*')
    .isMongoId()
    .withMessage('Each order ID must be a valid MongoDB ObjectId'),
  body('eligible')
    .isBoolean()
    .withMessage('Eligible must be a boolean'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
], validateRequest, updateOrderPayoutEligibility);

// @route   GET /api/admin/payouts/eligibility-stats
// @desc    Get statistics about payout eligibility
// @access  Private (Admin)
router.get('/payouts/eligibility-stats', getPayoutEligibilityStats);

// 🎯 NEW: System Health and Monitoring

// @route   GET /api/admin/system/health
// @desc    Get system health status
// @access  Private (Admin)
router.get('/system/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'unknown', // Add redis check if used
        smtp: 'unknown'   // Add email service check if used
      },
      stats: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    };

    res.status(200).json({
      success: true,
      data: health
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Error handling middleware for admin routes
router.use((error, req, res, next) => {
  console.error('❌ [ADMIN-ROUTES] Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    adminId: req.admin?._id
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error in admin operation',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;
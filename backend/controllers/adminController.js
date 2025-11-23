// backend/controllers/adminController.js - ENHANCED with Order Management
// 🎯 ADDED: Complete order management system for admins
// 🎯 ADDED: Delivery agent assignment functionality
// 🎯 ADDED: Real-time notifications for order workflow

const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const Admin = require('../models/Admin');
const DeliveryAgent = require('../models/DeliveryAgent');
const CashfreeBeneficiary = require('../models/CashfreeBeneficiary');
const Payout = require('../models/Payout');
const PayoutBatch = require('../models/PayoutBatch');
const { generateAdminToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const BatchPayoutService = require('../services/batchPayoutService');
const PayoutCalculationService = require('../services/payoutCalculationService');

// Enhanced logging for admin operations
const { logger } = require('../utils/logger');
const { 
  orderAssignmentLogger, 
  logAgentAvailability, 
  logCapacityCheck, 
  logAssignmentAttempt, 
  logBulkAttempt, 
  logSuccess, 
  logFailure, 
  logNotification, 
  logStatusUpdate 
} = require('../utils/orderAssignmentLogger');

const logAdmin = (action, data, level = 'info', correlationId = null) => {
  logger.admin(`ADMIN_${action}`, {
    ...data,
    timestamp: new Date().toISOString()
  }, level, correlationId);
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    logAdmin('ADMIN_LOGIN_ATTEMPT', {
      email,
      hasPassword: !!password,
      timestamp: new Date().toISOString()
    });

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email }).select('+password');
    
    if (!admin) {
      logAdmin('ADMIN_LOGIN_FAILED', { email, reason: 'admin_not_found' }, 'error');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      logAdmin('ADMIN_LOGIN_FAILED', { email, reason: 'admin_inactive' }, 'error');
      return res.status(401).json({
        success: false,
        message: 'Admin account is inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check password
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      logAdmin('ADMIN_LOGIN_FAILED', { email, reason: 'password_mismatch' }, 'error');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate token
    const token = generateAdminToken(admin._id);

    logAdmin('ADMIN_LOGIN_SUCCESS', {
      adminId: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
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
    logAdmin('ADMIN_LOGIN_ERROR', {
      error: error.message,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    logAdmin('DASHBOARD_STATS_REQUEST', { adminId: req.admin._id });

    // Get various statistics
    const [
      totalUsers,
      totalSellers,
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      recentUsers,
      recentSellers
    ] = await Promise.all([
      User.countDocuments(),
      Seller.countDocuments(),
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'Pending' }),
      Order.countDocuments({ status: 'Delivered' }),
      Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt'),
      Seller.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email shop createdAt')
    ]);

    const revenueData = totalRevenue[0] || { total: 0 };

    const stats = {
      overview: {
        totalUsers,
        totalSellers,
        totalProducts,
        activeProducts,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue: revenueData.total
      },
      recent: {
        users: recentUsers,
        sellers: recentSellers
      }
    };

    logAdmin('DASHBOARD_STATS_SUCCESS', {
      adminId: req.admin._id,
      statsGenerated: Object.keys(stats.overview)
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logAdmin('DASHBOARD_STATS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// 🎯 NEW: Get recent orders for admin approval
// @desc    Get recent orders needing approval
// @route   GET /api/admin/orders/recent
// @access  Private (Admin)
const getRecentOrders = async (req, res) => {
  try {
    const { status = 'Pending', limit = 10, page = 1 } = req.query;

    logAdmin('GET_RECENT_ORDERS_START', {
      adminId: req.admin._id,
      filters: { status, limit, page }
    });

    const skip = (page - 1) * limit;

    // Build query filter
    const filter = {
      isPaid: true, // Only show paid orders
      status: { $in: ['Pending', 'Processing'] }
    };

    if (status && status !== 'all') {
      filter.status = status;
    }

    // Get orders with populated data
    const orders = await Order.find(filter)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('assignedDeliveryAgent', 'name email vehicleType')
      .populate('orderItems.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    logAdmin('GET_RECENT_ORDERS_SUCCESS', {
      adminId: req.admin._id,
      ordersCount: orders.length,
      totalOrders,
      currentPage: page
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Recent orders retrieved successfully',
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    logAdmin('GET_RECENT_ORDERS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent orders'
    });
  }
};

// 🎯 NEW: Get all orders with filtering
// @desc    Get all orders with filtering and pagination
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus, 
      dateFrom, 
      dateTo,
      sellerId,
      userId
    } = req.query;

    logAdmin('GET_ALL_ORDERS_START', {
      adminId: req.admin._id,
      filters: { page, limit, status, paymentStatus, dateFrom, dateTo }
    });

    const skip = (page - 1) * limit;

    // Build query filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.isPaid = paymentStatus === 'paid';
    }

    if (sellerId) {
      filter.seller = sellerId;
    }

    if (userId) {
      filter.user = userId;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Get orders with populated data
    const orders = await Order.find(filter)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('assignedDeliveryAgent', 'name email vehicleType status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    logAdmin('GET_ALL_ORDERS_SUCCESS', {
      adminId: req.admin._id,
      ordersCount: orders.length,
      totalOrders,
      filters: filter
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    logAdmin('GET_ALL_ORDERS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// 🎯 NEW: Get single order details
// @desc    Get detailed information about a specific order
// @route   GET /api/admin/orders/:orderId
// @access  Private (Admin)
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    logAdmin('GET_ORDER_DETAILS_START', {
      adminId: req.admin._id,
      orderId
    });

    const order = await Order.findById(orderId)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('assignedDeliveryAgent', 'name email vehicleType status')
      .populate('orderItems.product', 'name images price description')
      .populate('deliveryAgent.agent', 'name email mobileNumber vehicleType');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    logAdmin('GET_ORDER_DETAILS_SUCCESS', {
      adminId: req.admin._id,
      orderId,
      orderNumber: order.orderNumber,
      status: order.status
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Order details retrieved successfully',
      data: order
    });

  } catch (error) {
    logAdmin('GET_ORDER_DETAILS_ERROR', {
      adminId: req.admin._id,
      orderId: req.params.orderId,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
};

// 🎯 NEW: Get assigned/accepted orders with tracking
// @desc    Get orders assigned to delivery agents and accepted by them
// @route   GET /api/admin/orders/assigned-accepted
// @access  Private (Admin)
const getAssignedAcceptedOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    logAdmin('GET_ASSIGNED_ACCEPTED_ORDERS_START', {
      adminId: req.admin._id,
      page,
      limit
    });

    // Find orders that are assigned to delivery agents and have been accepted
    const orders = await Order.find({
      'deliveryAgent.agent': { $exists: true, $ne: null },
      'deliveryAgent.status': { $in: ['assigned', 'accepted', 'pickup_completed', 'location_reached', 'delivery_completed'] }
    })
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('deliveryAgent.agent', 'name email mobileNumber vehicleType')
      .populate('orderItems.product', 'name images')
      .sort({ 'deliveryAgent.assignedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments({
      'deliveryAgent.agent': { $exists: true, $ne: null },
      'deliveryAgent.status': { $in: ['assigned', 'accepted', 'pickup_completed', 'location_reached', 'delivery_completed'] }
    });

    // Format orders with tracking information
    const formattedOrders = orders.map(order => {
      const trackingEvents = [];
      
      // Build tracking timeline
      // 1. Accepted by Delivery Agent
      if (order.deliveryAgent?.status === 'accepted' || order.deliveryAgent?.acceptedAt) {
        trackingEvents.push({
          status: 'accepted',
          label: 'Accepted by Delivery Agent',
          timestamp: order.deliveryAgent?.acceptedAt || order.deliveryAgent?.assignedAt,
          completed: true
        });
      }
      
      // 2. Reached Seller Location (now tracked separately in database)
      if (order.pickup?.sellerLocationReachedAt) {
        trackingEvents.push({
          status: 'reached_seller_location',
          label: 'Delivery Agent Reached Seller Location',
          timestamp: order.pickup?.sellerLocationReachedAt,
          completed: true,
          notes: 'Agent confirmed arrival at seller location'
        });
      }
      
      // 3. Order Picked Up
      if (order.pickup?.isCompleted || order.deliveryAgent?.status === 'pickup_completed') {
        trackingEvents.push({
          status: 'pickup_completed',
          label: 'Order Has Been Picked Up',
          timestamp: order.pickup?.completedAt,
          completed: true,
          notes: order.pickup?.pickupNotes
        });
      }
      
      // 4. Reached Delivery Address
      if (order.deliveryAgent?.status === 'location_reached' || order.delivery?.locationReachedAt || order.deliveryAgent?.locationReachedAt) {
        trackingEvents.push({
          status: 'location_reached',
          label: 'Delivery Agent Has Reached Delivery Address',
          timestamp: order.delivery?.locationReachedAt || order.deliveryAgent?.locationReachedAt,
          completed: true
        });
      }
      
      // 5. OTP Verification (for prepaid orders only)
      if (order.paymentMethod !== 'COD' && order.paymentMethod !== 'Cash on Delivery' && order.isPaid) {
        if (order.otpVerification?.isVerified && order.otpVerification?.verifiedAt) {
          trackingEvents.push({
            status: 'otp_verified',
            label: 'OTP Verified',
            timestamp: order.otpVerification?.verifiedAt,
            completed: true,
            notes: 'Delivery OTP verified successfully'
          });
        }
      }
      
      // 6. Order Delivered
      if (order.delivery?.isCompleted || order.deliveryAgent?.status === 'delivery_completed') {
        trackingEvents.push({
          status: 'delivery_completed',
          label: 'Order Has Been Delivered',
          timestamp: order.delivery?.completedAt || order.deliveredAt,
          completed: true,
          notes: order.delivery?.deliveryNotes
        });
      }

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        seller: order.seller,
        deliveryAgent: order.deliveryAgent,
        orderItems: order.orderItems,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        isPaid: order.isPaid,
        status: order.status,
        deliveryStatus: order.deliveryAgent?.status,
        assignedAt: order.deliveryAgent?.assignedAt,
        acceptedAt: order.deliveryAgent?.acceptedAt,
        pickupCompletedAt: order.pickup?.completedAt || order.deliveryAgent?.pickupCompletedAt,
        deliveryCompletedAt: order.delivery?.completedAt || order.deliveryAgent?.deliveryCompletedAt || order.deliveredAt,
        trackingEvents,
        createdAt: order.createdAt,
        shippingAddress: order.shippingAddress
      };
    });

    logAdmin('GET_ASSIGNED_ACCEPTED_ORDERS_SUCCESS', {
      adminId: req.admin._id,
      ordersCount: formattedOrders.length,
      totalOrders
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Assigned/accepted orders retrieved successfully',
      data: formattedOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasNextPage: page < Math.ceil(totalOrders / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    logAdmin('GET_ASSIGNED_ACCEPTED_ORDERS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned/accepted orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🎯 NEW: Get delivery agents
// @desc    Get all delivery agents with filtering
// @route   GET /api/admin/delivery-agents
// @access  Private (Admin)
const getDeliveryAgents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      isActive, 
      vehicleType,
      area 
    } = req.query;

    logAdmin('GET_DELIVERY_AGENTS_START', {
      adminId: req.admin._id,
      filters: { page, limit, status, isActive, vehicleType }
    });

    const skip = (page - 1) * limit;

    // Build query filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (vehicleType && vehicleType !== 'all') {
      filter.vehicleType = vehicleType;
    }

    if (area) {
      filter.area = new RegExp(area, 'i');
    }

    const agents = await DeliveryAgent.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalAgents = await DeliveryAgent.countDocuments(filter);
    const totalPages = Math.ceil(totalAgents / limit);

    logAdmin('GET_DELIVERY_AGENTS_SUCCESS', {
      adminId: req.admin._id,
      agentsCount: agents.length,
      totalAgents,
      activeAgents: agents.filter(a => a.isActive).length
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Delivery agents retrieved successfully',
      data: agents,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAgents,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    logAdmin('GET_DELIVERY_AGENTS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery agents'
    });
  }
};

// 🎯 NEW: Get available delivery agents with capacity information
// @desc    Get delivery agents available for assignment with capacity details (shows ALL agents including busy ones)
// @route   GET /api/admin/delivery-agents/available
// @access  Private (Admin)
const getAvailableDeliveryAgents = async (req, res) => {
  try {
    const { vehicleType, area, maxCapacity } = req.query;
    
    logAdmin('GET_AVAILABLE_DELIVERY_AGENTS_START', {
      adminId: req.admin._id,
      filters: { vehicleType, area, maxCapacity }
    });

    const MAX_ORDERS_PER_AGENT = process.env.MAX_ORDERS_PER_AGENT || 5;
    
    // 🔧 CRITICAL FIX: Show ALL active agents, regardless of verification status or capacity
    // Build query filter - only filter by active status (remove verification requirement)
    const filter = {
      isActive: true,
      isBlocked: false
      // 🔧 REMOVED: isVerified filter - show all active agents even if not verified
      // 🔧 REMOVED: status filter - show all agents regardless of busy/available status
    };

    if (vehicleType && vehicleType !== 'all') {
      filter.vehicleType = vehicleType;
    }

    if (area) {
      filter.area = new RegExp(area, 'i');
    }

    // Get ALL agents with capacity information
    const agents = await DeliveryAgent.find(filter)
      .select('-password')
      .populate('assignedOrders.order', 'orderNumber status totalPrice createdAt')
      .sort({ 'deliveryStats.averageRating': -1, 'deliveryStats.completedDeliveries': -1 });

    // 🔧 ENHANCED: Add capacity information but DON'T filter out busy agents
    const availableAgents = agents.map(agent => {
      // 🔧 CRITICAL FIX: Only count orders that are still 'assigned' (not accepted/pickedUp/delivered)
      const currentOrderCount = agent.assignedOrders?.filter(order => order.status === 'assigned').length || 0;
      const availableCapacity = MAX_ORDERS_PER_AGENT - currentOrderCount;
      const capacityPercentage = (currentOrderCount / MAX_ORDERS_PER_AGENT) * 100;
      
      return {
        ...agent.toObject(),
        capacity: {
          current: currentOrderCount,
          max: MAX_ORDERS_PER_AGENT,
          available: availableCapacity,
          percentage: Math.round(capacityPercentage),
          isAtCapacity: currentOrderCount >= MAX_ORDERS_PER_AGENT,
          isAvailable: availableCapacity > 0
        }
      };
    }).filter(agent => {
      // 🔧 MODIFIED: Only filter by maxCapacity if explicitly requested, otherwise show ALL agents
      if (maxCapacity && parseInt(maxCapacity) > 0) {
        return agent.capacity.available >= parseInt(maxCapacity);
      }
      // 🔧 CRITICAL: Return ALL agents, even those at capacity - let admin decide
      return true;
    });

    // Sort by availability and rating (agents with more capacity appear first)
    availableAgents.sort((a, b) => {
      // First by availability (more available capacity first)
      if (a.capacity.available !== b.capacity.available) {
        return b.capacity.available - a.capacity.available;
      }
      // Then by rating
      return b.deliveryStats.averageRating - a.deliveryStats.averageRating;
    });

    logAdmin('GET_AVAILABLE_DELIVERY_AGENTS_SUCCESS', {
      adminId: req.admin._id,
      totalAgents: agents.length,
      availableAgents: availableAgents.length,
      agentsWithCapacity: availableAgents.filter(a => a.capacity.isAvailable).length,
      agentsAtCapacity: availableAgents.filter(a => a.capacity.isAtCapacity).length,
      filters: filter
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Available delivery agents retrieved successfully',
      data: {
        agents: availableAgents,
        capacity: {
          maxOrdersPerAgent: MAX_ORDERS_PER_AGENT,
          totalAgents: agents.length,
          availableAgents: availableAgents.length,
          agentsWithCapacity: availableAgents.filter(a => a.capacity.isAvailable).length,
          agentsAtCapacity: availableAgents.filter(a => a.capacity.isAtCapacity).length
        }
      }
    });

  } catch (error) {
    logAdmin('GET_AVAILABLE_DELIVERY_AGENTS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch available delivery agents'
    });
  }
};

// 🎯 NEW: Get delivery agent profile with history
// @desc    Get detailed delivery agent profile
// @route   GET /api/admin/delivery-agents/:agentId
// @access  Private (Admin)
const getDeliveryAgentProfile = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    logAdmin('GET_DELIVERY_AGENT_PROFILE_START', {
      adminId: req.admin._id,
      agentId
    });

    const agent = await DeliveryAgent.findById(agentId)
      .select('-password')
      .populate('currentOrder', 'orderNumber status totalPrice createdAt')
      .populate('assignedOrders.order', 'orderNumber status totalPrice createdAt deliveredAt user');
      
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }
    
    // Calculate delivery history stats
    const deliveryHistory = await Order.find({
      assignedDeliveryAgent: agentId
    }).populate('user', 'name').sort({ createdAt: -1 });

    logAdmin('GET_DELIVERY_AGENT_PROFILE_SUCCESS', {
      adminId: req.admin._id,
      agentId,
      agentName: agent.name,
      totalDeliveries: agent.deliveryStats.totalDeliveries
    }, 'success');
    
    res.status(200).json({
      success: true,
      message: 'Delivery agent profile retrieved successfully',
      data: {
        agent,
        deliveryHistory,
        stats: {
          totalDeliveries: agent.deliveryStats.totalDeliveries,
          completedDeliveries: agent.deliveryStats.completedDeliveries,
          averageRating: agent.deliveryStats.averageRating,
          completionRate: agent.completionRate
        }
      }
    });

  } catch (error) {
    logAdmin('GET_DELIVERY_AGENT_PROFILE_ERROR', {
      adminId: req.admin._id,
      agentId: req.params.agentId,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery agent profile'
    });
  }
};

// 🎯 NEW: Get COD collections for delivery agent
// @desc    Get COD collections with date-wise breakdown for a delivery agent
// @route   GET /api/admin/delivery-agents/:agentId/cod-collections
// @access  Private (Admin)
const getDeliveryAgentCODCollections = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { dateFrom, dateTo, paymentMethod } = req.query;
    
    logAdmin('GET_DELIVERY_AGENT_COD_COLLECTIONS_START', {
      adminId: req.admin._id,
      agentId,
      dateFrom,
      dateTo,
      paymentMethod
    });

    // Verify agent exists
    const agent = await DeliveryAgent.findById(agentId).select('name email');
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // Build query filter
    const filter = {
      'deliveryAgent.agent': agentId,
      status: 'Delivered',
      'codPayment.isCollected': true,
      'delivery.completedAt': { $exists: true }
    };

    // Date filtering
    if (dateFrom || dateTo) {
      filter['delivery.completedAt'] = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filter['delivery.completedAt'].$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter['delivery.completedAt'].$lte = toDate;
      }
    }

    // Payment method filtering
    if (paymentMethod && paymentMethod !== 'all') {
      if (paymentMethod === 'cash') {
        filter['codPayment.paymentMethod'] = 'cash';
      } else if (paymentMethod === 'upi' || paymentMethod === 'smepay') {
        filter['codPayment.paymentMethod'] = 'upi';
      }
    }

    // Fetch orders
    const orders = await Order.find(filter)
      .populate('user', 'name mobileNumber')
      .populate('seller', 'firstName lastName shop')
      .populate('orderItems.product', 'name images')
      .sort({ 'delivery.completedAt': -1 });

    // Group orders by date and payment method
    const dailyBreakdownMap = new Map();
    let totalCashCOD = 0;
    let totalSMEPayCOD = 0;
    let totalOrders = orders.length;

    orders.forEach(order => {
      const completedDate = new Date(order.delivery.completedAt);
      const dateKey = completedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!dailyBreakdownMap.has(dateKey)) {
        dailyBreakdownMap.set(dateKey, {
          date: dateKey,
          cashCOD: {
            amount: 0,
            orderCount: 0,
            orders: []
          },
          smepayCOD: {
            amount: 0,
            orderCount: 0,
            orders: []
          },
          total: 0
        });
      }

      const dayData = dailyBreakdownMap.get(dateKey);
      const codAmount = order.codPayment?.collectedAmount || order.totalPrice || 0;
      const paymentMethod = order.codPayment?.paymentMethod || 'cash';

      // Prepare order summary
      const orderSummary = {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.user?.name || 'N/A',
        customerPhone: order.user?.mobileNumber || 'N/A',
        amount: codAmount,
        paymentMethod: paymentMethod,
        collectedAt: order.codPayment?.collectedAt || order.delivery.completedAt,
        completedAt: order.delivery.completedAt
      };

      if (paymentMethod === 'cash') {
        dayData.cashCOD.amount += codAmount;
        dayData.cashCOD.orderCount += 1;
        dayData.cashCOD.orders.push(orderSummary);
        totalCashCOD += codAmount;
      } else if (paymentMethod === 'upi') {
        dayData.smepayCOD.amount += codAmount;
        dayData.smepayCOD.orderCount += 1;
        dayData.smepayCOD.orders.push(orderSummary);
        totalSMEPayCOD += codAmount;
      }

      dayData.total = dayData.cashCOD.amount + dayData.smepayCOD.amount;
    });

    // Convert map to array and sort by date (newest first)
    const dailyBreakdown = Array.from(dailyBreakdownMap.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate summary
    const summary = {
      totalCashCOD,
      totalSMEPayCOD,
      totalCOD: totalCashCOD + totalSMEPayCOD,
      totalOrders
    };

    logAdmin('GET_DELIVERY_AGENT_COD_COLLECTIONS_SUCCESS', {
      adminId: req.admin._id,
      agentId,
      agentName: agent.name,
      totalOrders,
      totalCashCOD,
      totalSMEPayCOD,
      daysCount: dailyBreakdown.length
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'COD collections retrieved successfully',
      data: {
        summary,
        dailyBreakdown,
        orders: orders.map(order => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          customerName: order.user?.name || 'N/A',
          customerPhone: order.user?.mobileNumber || 'N/A',
          sellerName: order.seller?.firstName || 'N/A',
          amount: order.codPayment?.collectedAmount || order.totalPrice || 0,
          paymentMethod: order.codPayment?.paymentMethod || 'cash',
          collectedAt: order.codPayment?.collectedAt || order.delivery.completedAt,
          completedAt: order.delivery.completedAt,
          status: order.status
        }))
      }
    });

  } catch (error) {
    logAdmin('GET_DELIVERY_AGENT_COD_COLLECTIONS_ERROR', {
      adminId: req.admin._id,
      agentId: req.params.agentId,
      error: error.message,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch COD collections',
      error: error.message
    });
  }
};

// 🎯 NEW: Approve order and assign to delivery agent
// @desc    Approve an order and assign it to a delivery agent
// @route   POST /api/admin/orders/approve-assign
// @access  Private (Admin)
const approveAndAssignOrder = async (req, res) => {
  const operationId = orderAssignmentLogger.startAssignmentOperation('SINGLE_ORDER_ASSIGNMENT', {
    adminId: req.admin._id,
    orderId: req.body.orderId,
    deliveryAgentId: req.body.deliveryAgentId,
    hasNotes: !!req.body.notes
  });

  try {
    const { orderId, deliveryAgentId, notes } = req.body;

    logAdmin('APPROVE_ASSIGN_ORDER_START', {
      adminId: req.admin._id,
      orderId,
      deliveryAgentId,
      hasNotes: !!notes
    }, 'info', operationId);

    // Validate input
    if (!orderId || !deliveryAgentId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and Delivery Agent ID are required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // 🔧 FIXED: Enhanced status validation with better error messages
    const allowedStatuses = ['Pending', 'Processing'];
    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be assigned in current status. Current status: ${order.status}. Expected: ${allowedStatuses.join(' or ')}`,
        currentStatus: order.status,
        allowedStatuses: allowedStatuses
      });
    }

    // 🔧 FIXED: Check if order is already assigned with better validation
    if (order.deliveryAgent && order.deliveryAgent.agent) {
      return res.status(400).json({
        success: false,
        message: 'Order is already assigned to a delivery agent',
        assignedAgentId: order.deliveryAgent.agent,
        assignedAt: order.deliveryAgent.assignedAt
      });
    }

    // Find the delivery agent
    const deliveryAgent = await DeliveryAgent.findById(deliveryAgentId);

    if (!deliveryAgent) {
      logFailure(orderId, deliveryAgentId, {
        code: 'AGENT_NOT_FOUND',
        message: 'Delivery agent not found',
        type: 'validation_error'
      });
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // 🔧 ENHANCED: Check agent availability but ALLOW assignment even if busy/at capacity
    const MAX_ORDERS_PER_AGENT = process.env.MAX_ORDERS_PER_AGENT || 5; // Configurable capacity
    // 🔧 CRITICAL FIX: Only count orders that are still 'assigned' (not accepted/pickedUp/delivered)
    const currentOrderCount = deliveryAgent.assignedOrders?.filter(order => order.status === 'assigned').length || 0;
    const isWithinCapacity = currentOrderCount < MAX_ORDERS_PER_AGENT;
    
    // 🔧 RELAXED: Only check critical availability criteria (active, not blocked)
    // Allow assignment regardless of verification status, status, or capacity - admin has final say
    const isAvailable = deliveryAgent.isActive && 
                       !deliveryAgent.isBlocked;
    // 🔧 REMOVED: isVerified check - allow assignment to unverified agents
    // 🔧 REMOVED: status check and capacity check - allow assignment to busy agents

    // Log capacity check (informational only, doesn't block assignment)
    logCapacityCheck(deliveryAgentId, currentOrderCount, 1, MAX_ORDERS_PER_AGENT, isWithinCapacity);

    // Log agent availability check with detailed reasoning
    let unavailabilityReason = '';
    let warningMessage = '';
    if (!deliveryAgent.isActive) unavailabilityReason = 'Agent is inactive';
    else if (deliveryAgent.isBlocked) unavailabilityReason = 'Agent is blocked';
    // 🔧 REMOVED: isVerified check - allow assignment to unverified agents
    
    // 🔧 NEW: Add warning for capacity but don't block assignment
    if (!isWithinCapacity) {
      warningMessage = `Warning: Agent is at or exceeds capacity (${currentOrderCount}/${MAX_ORDERS_PER_AGENT}). Assignment allowed.`;
      logAdmin('AGENT_CAPACITY_WARNING', {
        deliveryAgentId,
        currentOrderCount,
        maxCapacity: MAX_ORDERS_PER_AGENT,
        message: warningMessage
      }, 'warning');
    }
    
    logAgentAvailability(deliveryAgentId, deliveryAgent, isAvailable, unavailabilityReason || 'Available for assignment');

    // 🔧 CRITICAL: Only block assignment if agent is inactive, not verified, or blocked
    if (!isAvailable) {
      logFailure(orderId, deliveryAgentId, {
        code: 'AGENT_NOT_AVAILABLE',
        message: `Delivery agent cannot be assigned: ${unavailabilityReason}`,
        type: 'availability_error',
        agentStatus: deliveryAgent.status,
        isActive: deliveryAgent.isActive,
        isVerified: deliveryAgent.isVerified,
        isBlocked: deliveryAgent.isBlocked
      });
      return res.status(400).json({
        success: false,
        message: `Delivery agent cannot be assigned: ${unavailabilityReason}`,
        agentStatus: deliveryAgent.status,
        isActive: deliveryAgent.isActive,
        isVerified: deliveryAgent.isVerified,
        isBlocked: deliveryAgent.isBlocked
      });
    }
    
    // 🔧 NEW: Log warning if agent is at capacity but allow assignment to proceed
    if (warningMessage) {
      console.log(`⚠️ [ADMIN-CONTROLLER] ${warningMessage}`);
    }

    // Log assignment attempt
    logAssignmentAttempt(orderId, deliveryAgentId, order, deliveryAgent);

    // ✅ SET ALL FIELDS ATOMICALLY BEFORE SAVING
    order.deliveryAgent = {
      agent: deliveryAgentId,
      assignedAt: new Date(),
      assignedBy: req.admin._id,
      status: 'assigned'
    };

    order.status = 'Pickup_Ready';
    order.adminApproval = {
      isRequired: true,
      status: 'approved',
      approvedBy: req.admin._id,
      approvedAt: new Date()
    };
    
    if (notes) {
      order.adminNotes = notes;
    }

    // Add to order history
    order.statusHistory.push({
      status: 'Pickup_Ready',
      changedBy: 'admin',
      changedAt: new Date(),
      notes: notes || 'Order approved and assigned to delivery agent'
    });

    await order.save();

    // Log order status update
    logStatusUpdate(orderId, order.status, 'Pickup_Ready', 'order', 'admin', 'Order approved and assigned');

    // 🔧 FIXED: Update delivery agent status to support multiple orders
    const oldAgentStatus = deliveryAgent.status;
    
    // Only change status to 'assigned' if this is the first order
    if (deliveryAgent.assignedOrders?.length === 0) {
      deliveryAgent.status = 'assigned';
    }
    // Keep status as 'assigned' for additional orders
    
    // 🔧 FIXED: Don't set currentOrder - agents can handle multiple orders
    // Only set currentOrder if this is the first order or if currentOrder is null
    if (!deliveryAgent.currentOrder) {
      deliveryAgent.currentOrder = orderId;
    }
    
    // Add to assigned orders
    deliveryAgent.assignedOrders.push({
      order: orderId,
      assignedAt: new Date(),
      status: 'assigned'
    });
    
    await deliveryAgent.save();

    // Log agent status update with capacity info
    const newOrderCount = deliveryAgent.assignedOrders?.length || 0;
    logStatusUpdate(deliveryAgentId, oldAgentStatus, deliveryAgent.status, 'agent', 'admin', 
      `Order assigned. Total orders: ${newOrderCount}/${MAX_ORDERS_PER_AGENT}`);

    // Log successful assignment
    logSuccess(orderId, deliveryAgentId, {
      orderNumber: order.orderNumber,
      agentName: deliveryAgent.name,
      customerName: order.user.name,
      totalPrice: order.totalPrice,
      agentNewOrderCount: deliveryAgent.assignedOrders.length
    });

    logAdmin('APPROVE_ASSIGN_ORDER_SUCCESS', {
      adminId: req.admin._id,
      orderId,
      orderNumber: order.orderNumber,
      deliveryAgentId,
      agentName: deliveryAgent.name
    }, 'success', operationId);

    // 🎯 NEW: Send real-time notification to delivery agent
    try {
      if (global.emitToDeliveryAgent) {
        const notificationData = {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerName: order.user.name,
          customerPhone: order.user.mobileNumber,
          pickupAddress: order.seller.shop?.address || 'Address not provided',
          deliveryAddress: order.shippingAddress.address,
          totalAmount: order.totalPrice,
          itemCount: order.orderItems.length,
          assignedAt: new Date(),
          message: 'New order assigned to you'
        };
        
        global.emitToDeliveryAgent(deliveryAgentId, 'order-assigned', notificationData);
        logNotification(deliveryAgentId, 'order-assigned', notificationData, true);
        logAdmin('DELIVERY_AGENT_NOTIFICATION_SENT', { deliveryAgentId, orderId }, 'success', operationId);
      }
    } catch (notificationError) {
      logNotification(deliveryAgentId, 'order-assigned', { error: notificationError.message }, false);
      logAdmin('DELIVERY_AGENT_NOTIFICATION_FAILED', { 
        deliveryAgentId, 
        orderId, 
        error: notificationError.message 
      }, 'warning', operationId);
    }

    // 🎯 NEW: Send notification to seller
    try {
      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'order-approved', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          assignedDeliveryAgent: {
            name: deliveryAgent.name,
            vehicleType: deliveryAgent.vehicleType
          },
          message: 'Your order has been approved and assigned for delivery'
        });
        logAdmin('SELLER_NOTIFICATION_SENT', { sellerId: order.seller._id, orderId });
      }
    } catch (notificationError) {
      logAdmin('SELLER_NOTIFICATION_FAILED', { 
        sellerId: order.seller._id, 
        orderId, 
        error: notificationError.message 
      }, 'warning');
    }

    // 🎯 NEW: Send notification to buyer
    try {
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'order-status-update', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: 'approved',
          assignedDeliveryAgent: {
            name: deliveryAgent.name,
            vehicleType: deliveryAgent.vehicleType
          },
          message: 'Your order has been approved and will be delivered soon'
        });
        logAdmin('BUYER_NOTIFICATION_SENT', { userId: order.user._id, orderId });
      }
    } catch (notificationError) {
      logAdmin('BUYER_NOTIFICATION_FAILED', { 
        userId: order.user._id, 
        orderId, 
        error: notificationError.message 
      }, 'warning');
    }

    // Log performance metrics and end operation
    orderAssignmentLogger.logPerformanceMetrics('SINGLE_ORDER_ASSIGNMENT', {
      totalOrders: 1,
      successfulAssignments: 1,
      failedAssignments: 0
    });
    
    const finalMetrics = orderAssignmentLogger.endAssignmentOperation('COMPLETED', {
      orderId,
      deliveryAgentId,
      assignmentTime: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Order approved and assigned successfully',
      data: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        adminApprovalStatus: order.adminApproval.status,
        deliveryAgent: {
          _id: deliveryAgent._id,
          name: deliveryAgent.name,
          email: deliveryAgent.email,
          vehicleType: deliveryAgent.vehicleType
        },
        assignedAt: order.deliveryAgent.assignedAt,
        approvedBy: req.admin._id,
        approvedAt: order.approvedAt
      },
      metrics: finalMetrics
    });

  } catch (error) {
    // Log assignment failure
    logFailure(req.body.orderId, req.body.deliveryAgentId, {
      code: 'ASSIGNMENT_ERROR',
      message: error.message,
      type: 'system_error'
    });

    logAdmin('APPROVE_ASSIGN_ORDER_ERROR', {
      adminId: req.admin._id,
      orderId: req.body.orderId,
      deliveryAgentId: req.body.deliveryAgentId,
      error: error.message
    }, 'error', operationId);

    // End operation with failure
    orderAssignmentLogger.endAssignmentOperation('FAILED', {
      error: error.message,
      orderId: req.body.orderId,
      deliveryAgentId: req.body.deliveryAgentId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to approve and assign order'
    });
  }
};

// 🎯 NEW: Bulk assign orders to delivery agent
// @desc    Assign multiple orders to a single delivery agent
// @route   POST /api/admin/orders/bulk-assign
// @access  Private (Admin)
const bulkAssignOrders = async (req, res) => {
  const operationId = orderAssignmentLogger.startAssignmentOperation('BULK_ORDER_ASSIGNMENT', {
    adminId: req.admin._id,
    orderIds: req.body.orderIds?.length || 0,
    deliveryAgentId: req.body.deliveryAgentId,
    hasNotes: !!req.body.notes
  });

  try {
    const { orderIds, deliveryAgentId, notes } = req.body;

    logAdmin('BULK_ASSIGN_ORDERS_START', {
      adminId: req.admin._id,
      orderIds: orderIds?.length || 0,
      deliveryAgentId,
      hasNotes: !!notes
    }, 'info', operationId);

    // Validate input
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required and must not be empty'
      });
    }

    if (!deliveryAgentId) {
      return res.status(400).json({
        success: false,
        message: 'Delivery Agent ID is required'
      });
    }

    // Find the delivery agent
    const deliveryAgent = await DeliveryAgent.findById(deliveryAgentId);

    if (!deliveryAgent) {
      logBulkAttempt(orderIds, deliveryAgentId, {});
      logFailure('BULK_ASSIGNMENT', deliveryAgentId, {
        code: 'AGENT_NOT_FOUND',
        message: 'Delivery agent not found',
        type: 'validation_error'
      });
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // Log bulk assignment attempt
    logBulkAttempt(orderIds, deliveryAgentId, deliveryAgent);

    // 🔧 ENHANCED: Check agent availability but ALLOW bulk assignment even if busy/at capacity
    const MAX_ORDERS_PER_AGENT = process.env.MAX_ORDERS_PER_AGENT || 5; // Configurable capacity
    // 🔧 CRITICAL FIX: Only count orders that are still 'assigned' (not accepted/pickedUp/delivered)
    const currentOrderCount = deliveryAgent.assignedOrders?.filter(order => order.status === 'assigned').length || 0;
    const requestedOrderCount = orderIds.length;
    const totalAfterAssignment = currentOrderCount + requestedOrderCount;
    const canHandleAllOrders = totalAfterAssignment <= MAX_ORDERS_PER_AGENT;
    
    // 🔧 RELAXED: Only check critical availability criteria (active, not blocked)
    // Allow bulk assignment regardless of verification status, status, or capacity - admin has final say
    const isAvailable = deliveryAgent.isActive && 
                       !deliveryAgent.isBlocked;
    // 🔧 REMOVED: isVerified check - allow bulk assignment to unverified agents
    // 🔧 REMOVED: status check and capacity check - allow bulk assignment to busy agents

    // Log capacity check for bulk assignment (informational only, doesn't block assignment)
    logCapacityCheck(deliveryAgentId, currentOrderCount, requestedOrderCount, MAX_ORDERS_PER_AGENT, canHandleAllOrders);

    // Log agent availability check with detailed reasoning
    let unavailabilityReason = '';
    let warningMessage = '';
    if (!deliveryAgent.isActive) unavailabilityReason = 'Agent is inactive';
    else if (deliveryAgent.isBlocked) unavailabilityReason = 'Agent is blocked';
    // 🔧 REMOVED: isVerified check - allow bulk assignment to unverified agents
    
    // 🔧 NEW: Add warning for capacity but don't block bulk assignment
    if (!canHandleAllOrders) {
      warningMessage = `Warning: Agent will exceed capacity after assignment. Current: ${currentOrderCount}, Requested: ${requestedOrderCount}, Total: ${totalAfterAssignment}/${MAX_ORDERS_PER_AGENT}. Assignment allowed.`;
      logAdmin('BULK_AGENT_CAPACITY_WARNING', {
        deliveryAgentId,
        currentOrderCount,
        requestedOrderCount,
        totalAfterAssignment,
        maxCapacity: MAX_ORDERS_PER_AGENT,
        message: warningMessage
      }, 'warning');
    }
    
    logAgentAvailability(deliveryAgentId, deliveryAgent, isAvailable, unavailabilityReason || 'Available for bulk assignment');

    // 🔧 CRITICAL: Only block bulk assignment if agent is inactive, not verified, or blocked
    if (!isAvailable) {
      logFailure('BULK_ASSIGNMENT', deliveryAgentId, {
        code: 'AGENT_NOT_AVAILABLE',
        message: `Delivery agent cannot be assigned: ${unavailabilityReason}`,
        type: 'availability_error',
        agentStatus: deliveryAgent.status,
        isActive: deliveryAgent.isActive,
        isVerified: deliveryAgent.isVerified,
        isBlocked: deliveryAgent.isBlocked
      });
      return res.status(400).json({
        success: false,
        message: `Delivery agent cannot be assigned for bulk assignment: ${unavailabilityReason}`,
        agentStatus: deliveryAgent.status,
        isActive: deliveryAgent.isActive,
        isVerified: deliveryAgent.isVerified,
        isBlocked: deliveryAgent.isBlocked
      });
    }
    
    // 🔧 NEW: Log warning if agent will exceed capacity but allow bulk assignment to proceed
    if (warningMessage) {
      console.log(`⚠️ [ADMIN-CONTROLLER] ${warningMessage}`);
    }

    // Find all orders that can be assigned
    const orders = await Order.find({
      _id: { $in: orderIds },
      status: { $in: ['Pending', 'Processing'] },
      'deliveryAgent.status': 'unassigned'
    }).populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('orderItems.product', 'name images');

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found that can be assigned. Orders must be in Pending/Processing status and not already assigned.'
      });
    }

    const assignedOrders = [];
    const failedAssignments = [];

    // Process each order
    for (const order of orders) {
      try {
        // Update order with delivery agent assignment
        order.deliveryAgent = {
          agent: deliveryAgentId,
          assignedAt: new Date(),
          assignedBy: req.admin._id,
          status: 'assigned'
        };

        order.status = 'Pickup_Ready';
        order.adminApproval = {
          isRequired: true,
          status: 'approved',
          approvedBy: req.admin._id,
          approvedAt: new Date()
        };
        
        if (notes) {
          order.adminNotes = notes;
        }

        // Add to order history
        order.statusHistory.push({
          status: 'Pickup_Ready',
          changedBy: 'admin',
          changedAt: new Date(),
          notes: notes || `Bulk assigned to delivery agent: ${deliveryAgent.name}`
        });

        await order.save();

        // Add to delivery agent's assigned orders
        deliveryAgent.assignedOrders.push({
          order: order._id,
          assignedAt: new Date(),
          status: 'assigned'
        });

        assignedOrders.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerName: order.user.name,
          totalPrice: order.totalPrice
        });

        // Send real-time notification to delivery agent
        try {
          if (global.emitToDeliveryAgent) {
            global.emitToDeliveryAgent(deliveryAgentId, 'bulk-order-assigned', {
              orderId: order._id,
              orderNumber: order.orderNumber,
              customerName: order.user.name,
              customerPhone: order.user.mobileNumber,
              pickupAddress: order.seller.shop?.address || 'Address not provided',
              deliveryAddress: order.shippingAddress.address,
              totalAmount: order.totalPrice,
              itemCount: order.orderItems.length,
              assignedAt: new Date(),
              message: `Bulk assignment: Order ${order.orderNumber} assigned to you`,
              isBulkAssignment: true,
              totalBulkOrders: orders.length
            });
          }
        } catch (notificationError) {
          logAdmin('BULK_DELIVERY_AGENT_NOTIFICATION_FAILED', { 
            deliveryAgentId, 
            orderId: order._id, 
            error: notificationError.message 
          }, 'warning');
        }

      } catch (orderError) {
        failedAssignments.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          error: orderError.message
        });
        logAdmin('BULK_ORDER_ASSIGNMENT_ERROR', {
          orderId: order._id,
          error: orderError.message
        }, 'error');
      }
    }

    // 🔧 FIXED: Update delivery agent status for bulk assignment with capacity management
    if (assignedOrders.length > 0) {
      // Only change status to 'assigned' if this was the first assignment
      if (deliveryAgent.assignedOrders?.length === assignedOrders.length) {
        deliveryAgent.status = 'assigned';
      }
      // Keep status as 'assigned' for additional orders
      
      // Only set currentOrder if it's not already set
      if (!deliveryAgent.currentOrder) {
        deliveryAgent.currentOrder = assignedOrders[0].orderId; // Set first order as current
      }
      
      await deliveryAgent.save();
      
      // Log agent status update with capacity info
      const finalOrderCount = deliveryAgent.assignedOrders?.length || 0;
      logStatusUpdate(deliveryAgentId, 'bulk_assignment', deliveryAgent.status, 'agent', 'admin', 
        `Bulk assignment completed. Total orders: ${finalOrderCount}/${MAX_ORDERS_PER_AGENT}`);
    }

    logAdmin('BULK_ASSIGN_ORDERS_SUCCESS', {
      adminId: req.admin._id,
      deliveryAgentId,
      agentName: deliveryAgent.name,
      totalOrders: orders.length,
      assignedCount: assignedOrders.length,
      failedCount: failedAssignments.length
    }, 'success');

    // Send bulk assignment notification to delivery agent
    if (assignedOrders.length > 0 && global.emitToDeliveryAgent) {
      try {
        global.emitToDeliveryAgent(deliveryAgentId, 'bulk-assignment-complete', {
          assignedOrders: assignedOrders,
          totalOrders: assignedOrders.length,
          deliveryAgentName: deliveryAgent.name,
          assignedBy: req.admin._id,
          assignedAt: new Date(),
          message: `Bulk assignment complete: ${assignedOrders.length} orders assigned to you`,
          notes: notes
        });
      } catch (notificationError) {
        logAdmin('BULK_COMPLETE_NOTIFICATION_FAILED', { 
          deliveryAgentId, 
          error: notificationError.message 
        }, 'warning');
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk assignment completed: ${assignedOrders.length} orders assigned successfully`,
      data: {
        deliveryAgent: {
          _id: deliveryAgent._id,
          name: deliveryAgent.name,
          email: deliveryAgent.email,
          vehicleType: deliveryAgent.vehicleType
        },
        assignedOrders,
        failedAssignments,
        summary: {
          totalRequested: orderIds.length,
          totalProcessed: orders.length,
          successfullyAssigned: assignedOrders.length,
          failed: failedAssignments.length
        },
        assignedAt: new Date(),
        assignedBy: req.admin._id
      }
    });

  } catch (error) {
    logAdmin('BULK_ASSIGN_ORDERS_ERROR', {
      adminId: req.admin._id,
      orderIds: req.body.orderIds,
      deliveryAgentId: req.body.deliveryAgentId,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk order assignment'
    });
  }
};

// 🎯 NEW: Update order status
// @desc    Update order status with admin notes
// @route   PUT /api/admin/orders/:orderId/status
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    logAdmin('UPDATE_ORDER_STATUS_START', {
      adminId: req.admin._id,
      orderId,
      newStatus: status,
      hasNotes: !!notes
    });

    // Validate status - use Order model enum values
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Pickup_Ready', 'Out_for_Delivery'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status provided. Valid statuses: ' + validStatuses.join(', ')
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousStatus = order.status;

    // Update order
    order.status = status;
    
    if (notes) {
      order.adminNotes = notes;
    }

    // Add to status history
    order.statusHistory.push({
      status,
      updatedBy: req.admin._id,
      updatedAt: new Date(),
      notes: notes || `Status updated by admin`
    });

    await order.save();

    logAdmin('UPDATE_ORDER_STATUS_SUCCESS', {
      adminId: req.admin._id,
      orderId,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: status
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        previousStatus,
        updatedBy: req.admin._id,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    logAdmin('UPDATE_ORDER_STATUS_ERROR', {
      adminId: req.admin._id,
      orderId: req.params.orderId,
      status: req.body.status,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// Existing functions (getAllSellers, getSellerProfile, getAllUsers, getUserProfile) remain the same...
// 🎯 KEEPING EXISTING FUNCTIONALITY - Adding only the missing ones for completeness

// @desc    Get all sellers
// @route   GET /api/admin/sellers
// @access  Private (Admin)
const getAllSellers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    logAdmin('GET_ALL_SELLERS_START', {
      adminId: req.admin._id,
      filters: { page, limit, status, search }
    });

    let filter = {};
    
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }
    
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { 'shop.name': new RegExp(search, 'i') }
      ];
    }

    const sellers = await Seller.find(filter)
      .select('-password')
      .populate('shop')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalSellers = await Seller.countDocuments(filter);
    const totalPages = Math.ceil(totalSellers / limit);

    logAdmin('GET_ALL_SELLERS_SUCCESS', {
      adminId: req.admin._id,
      sellersCount: sellers.length,
      totalSellers
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Sellers retrieved successfully',
      data: sellers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSellers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    logAdmin('GET_ALL_SELLERS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch sellers'
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    logAdmin('GET_ALL_USERS_START', {
      adminId: req.admin._id,
      filters: { page, limit, status, search }
    });

    let filter = {};
    
    if (status && status !== 'all') {
      filter.isActive = status === 'active';
    }
    
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    logAdmin('GET_ALL_USERS_SUCCESS', {
      adminId: req.admin._id,
      usersCount: users.length,
      totalUsers
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    logAdmin('GET_ALL_USERS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// 🎯 NEW: Get payout analytics and statistics
// @desc    Get comprehensive payout analytics for admin dashboard
// @route   GET /api/admin/payouts/analytics
// @access  Private (Admin)
const getPayoutAnalytics = async (req, res) => {
  try {
    const { period = '30d', sellerId } = req.query;

    logAdmin('GET_PAYOUT_ANALYTICS_START', {
      adminId: req.admin._id,
      period,
      sellerId
    });

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Build filter
    const filter = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (sellerId) {
      filter.seller = sellerId;
    }

    // Get payout statistics
    const [
      totalPayouts,
      totalAmount,
      completedPayouts,
      failedPayouts,
      pendingPayouts,
      beneficiariesCount,
      topSellers,
      dailyPayouts,
      payoutTrends
    ] = await Promise.all([
      Payout.countDocuments(filter),
      Payout.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$payoutAmount' } } }
      ]),
      Payout.countDocuments({ ...filter, status: 'SUCCESS' }),
      Payout.countDocuments({ ...filter, status: 'FAILED' }),
      Payout.countDocuments({ ...filter, status: 'PENDING' }),
      CashfreeBeneficiary.countDocuments({ status: 'VERIFIED' }),
      Payout.aggregate([
        { $match: filter },
        { $group: { 
          _id: '$seller', 
          totalPayouts: { $sum: '$payoutAmount' },
          payoutCount: { $sum: 1 }
        }},
        { $lookup: {
          from: 'sellers',
          localField: '_id',
          foreignField: '_id',
          as: 'seller'
        }},
        { $unwind: '$seller' },
        { $project: {
          sellerName: { $concat: ['$seller.firstName', ' ', '$seller.lastName'] },
          shopName: '$seller.shop.name',
          totalPayouts: 1,
          payoutCount: 1
        }},
        { $sort: { totalPayouts: -1 } },
        { $limit: 10 }
      ]),
      Payout.aggregate([
        { $match: filter },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalAmount: { $sum: '$payoutAmount' },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]),
      Payout.aggregate([
        { $match: filter },
        { $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$payoutAmount' }
        }}
      ])
    ]);

    const totalAmountValue = totalAmount[0]?.total || 0;
    const successRate = totalPayouts > 0 ? ((completedPayouts / totalPayouts) * 100).toFixed(2) : 0;

    const analytics = {
      overview: {
        totalPayouts,
        totalAmount: totalAmountValue,
        completedPayouts,
        failedPayouts,
        pendingPayouts,
        successRate: parseFloat(successRate),
        beneficiariesCount
      },
      topSellers,
      dailyPayouts,
      payoutTrends,
      period: {
        startDate,
        endDate,
        days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      }
    };

    logAdmin('GET_PAYOUT_ANALYTICS_SUCCESS', {
      adminId: req.admin._id,
      totalPayouts,
      totalAmount: totalAmountValue,
      successRate
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Payout analytics retrieved successfully',
      data: analytics
    });

  } catch (error) {
    logAdmin('GET_PAYOUT_ANALYTICS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch payout analytics'
    });
  }
};

// 🎯 NEW: Get all payouts with filtering
// @desc    Get all payouts with advanced filtering
// @route   GET /api/admin/payouts
// @access  Private (Admin)
const getAllPayouts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      sellerId,
      dateFrom, 
      dateTo,
      batchTransferId,
      orderId
    } = req.query;

    logAdmin('GET_ALL_PAYOUTS_START', {
      adminId: req.admin._id,
      filters: { page, limit, status, sellerId, dateFrom, dateTo }
    });

    const skip = (page - 1) * limit;

    // Build query filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (sellerId) {
      filter.seller = sellerId;
    }

    if (batchTransferId) {
      filter.batchTransferId = batchTransferId;
    }

    if (orderId) {
      filter.order = orderId;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Get payouts with populated data
    const payouts = await Payout.find(filter)
      .populate('order', 'orderNumber totalPrice status')
      .populate('seller', 'firstName lastName email shop')
      .populate('beneficiary', 'beneficiaryName bankAccountNumber bankIfsc status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPayouts = await Payout.countDocuments(filter);
    const totalPages = Math.ceil(totalPayouts / limit);

    logAdmin('GET_ALL_PAYOUTS_SUCCESS', {
      adminId: req.admin._id,
      payoutsCount: payouts.length,
      totalPayouts,
      filters: filter
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Payouts retrieved successfully',
      data: payouts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPayouts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    logAdmin('GET_ALL_PAYOUTS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch payouts'
    });
  }
};

// 🎯 NEW: Get payout batch details
// @desc    Get detailed information about a payout batch
// @route   GET /api/admin/payouts/batch/:batchTransferId
// @access  Private (Admin)
const getPayoutBatchDetails = async (req, res) => {
  try {
    const { batchTransferId } = req.params;

    logAdmin('GET_PAYOUT_BATCH_DETAILS_START', {
      adminId: req.admin._id,
      batchTransferId
    });

    const batch = await PayoutBatch.findOne({ batchTransferId })
      .populate('payouts')
      .populate('processedBy', 'name email');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Payout batch not found'
      });
    }

    // Get detailed payout information
    const payouts = await Payout.find({ batchTransferId })
      .populate('order', 'orderNumber totalPrice status')
      .populate('seller', 'firstName lastName email shop')
      .populate('beneficiary', 'beneficiaryName bankAccountNumber bankIfsc status')
      .sort({ createdAt: -1 });

    const batchDetails = {
      ...batch.toObject(),
      payouts,
      summary: {
        totalPayouts: payouts.length,
        successfulPayouts: payouts.filter(p => p.status === 'SUCCESS').length,
        failedPayouts: payouts.filter(p => p.status === 'FAILED').length,
        pendingPayouts: payouts.filter(p => p.status === 'PENDING').length,
        successRate: payouts.length > 0 ? 
          ((payouts.filter(p => p.status === 'SUCCESS').length / payouts.length) * 100).toFixed(2) : 0
      }
    };

    logAdmin('GET_PAYOUT_BATCH_DETAILS_SUCCESS', {
      adminId: req.admin._id,
      batchTransferId,
      totalPayouts: payouts.length,
      status: batch.status
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Payout batch details retrieved successfully',
      data: batchDetails
    });

  } catch (error) {
    logAdmin('GET_PAYOUT_BATCH_DETAILS_ERROR', {
      adminId: req.admin._id,
      batchTransferId: req.params.batchTransferId,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch payout batch details'
    });
  }
};

// 🎯 NEW: Process manual batch payout
// @desc    Manually trigger batch payout processing
// @route   POST /api/admin/payouts/process-batch
// @access  Private (Admin)
const processManualBatchPayout = async (req, res) => {
  try {
    const { date, sellerIds, force = false } = req.body;

    logAdmin('PROCESS_MANUAL_BATCH_PAYOUT_START', {
      adminId: req.admin._id,
      date,
      sellerIds: sellerIds?.length || 0,
      force
    });

    const result = await BatchPayoutService.processManualBatchPayout({
      date,
      sellerIds,
      force,
      processedBy: req.admin._id
    });

    logAdmin('PROCESS_MANUAL_BATCH_PAYOUT_SUCCESS', {
      adminId: req.admin._id,
      batchTransferId: result.batchTransferId,
      transferCount: result.transferCount,
      totalAmount: result.totalAmount
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Batch payout processed successfully',
      data: result
    });

  } catch (error) {
    logAdmin('PROCESS_MANUAL_BATCH_PAYOUT_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to process batch payout',
      error: error.message
    });
  }
};

// 🎯 NEW: Update order payout eligibility
// @desc    Manually update payout eligibility for orders
// @route   POST /api/admin/payouts/update-eligibility
// @access  Private (Admin)
const updateOrderPayoutEligibility = async (req, res) => {
  try {
    const { orderIds, eligible, reason } = req.body;

    logAdmin('UPDATE_ORDER_PAYOUT_ELIGIBILITY_START', {
      adminId: req.admin._id,
      orderIds: orderIds?.length || 0,
      eligible,
      reason
    });

    const result = await PayoutCalculationService.updateOrderPayoutEligibility({
      orderIds,
      eligible,
      reason,
      updatedBy: req.admin._id
    });

    logAdmin('UPDATE_ORDER_PAYOUT_ELIGIBILITY_SUCCESS', {
      adminId: req.admin._id,
      updatedOrders: result.updatedOrders,
      eligibleCount: result.eligibleCount,
      notEligibleCount: result.notEligibleCount
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Order payout eligibility updated successfully',
      data: result
    });

  } catch (error) {
    logAdmin('UPDATE_ORDER_PAYOUT_ELIGIBILITY_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to update order payout eligibility',
      error: error.message
    });
  }
};

// 🎯 NEW: Get payout eligibility statistics
// @desc    Get statistics about payout eligibility
// @route   GET /api/admin/payouts/eligibility-stats
// @access  Private (Admin)
const getPayoutEligibilityStats = async (req, res) => {
  try {
    logAdmin('GET_PAYOUT_ELIGIBILITY_STATS_START', {
      adminId: req.admin._id
    });

    const stats = await PayoutCalculationService.getPayoutEligibilityStats();

    logAdmin('GET_PAYOUT_ELIGIBILITY_STATS_SUCCESS', {
      adminId: req.admin._id,
      totalOrders: stats.totalOrders,
      eligibleOrders: stats.eligibleOrders,
      notEligibleOrders: stats.notEligibleOrders
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Payout eligibility statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logAdmin('GET_PAYOUT_ELIGIBILITY_STATS_ERROR', {
      adminId: req.admin._id,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch payout eligibility statistics'
    });
  }
};

module.exports = {
  loginAdmin,
  getDashboardStats,
  getAllSellers,
  getAllUsers,
  // 🎯 NEW: Order management exports
  getRecentOrders,
  getAllOrders,
  getOrderDetails,
  getAssignedAcceptedOrders,
  approveAndAssignOrder,
  bulkAssignOrders,
  updateOrderStatus,
  // 🎯 NEW: Delivery agent management exports
  getDeliveryAgents,
  getAvailableDeliveryAgents,
  getDeliveryAgentProfile,
  getDeliveryAgentCODCollections,
  // 🎯 NEW: Payout management exports
  getPayoutAnalytics,
  getAllPayouts,
  getPayoutBatchDetails,
  processManualBatchPayout,
  updateOrderPayoutEligibility,
  getPayoutEligibilityStats
};
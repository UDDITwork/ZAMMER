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
const { generateAdminToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');

// Enhanced logging for admin operations
const logAdmin = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '🔧',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [ADMIN-CONTROLLER] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
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
      .populate('orderItems.product', 'name images price description');

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

// 🎯 NEW: Approve order and assign to delivery agent
// @desc    Approve an order and assign it to a delivery agent
// @route   POST /api/admin/orders/approve-assign
// @access  Private (Admin)
const approveAndAssignOrder = async (req, res) => {
  try {
    const { orderId, deliveryAgentId, notes } = req.body;

    logAdmin('APPROVE_ASSIGN_ORDER_START', {
      adminId: req.admin._id,
      orderId,
      deliveryAgentId,
      hasNotes: !!notes
    });

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
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // Check if agent is available
    if (!deliveryAgent.isActive || deliveryAgent.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Delivery agent is not available',
        agentStatus: deliveryAgent.status,
        isActive: deliveryAgent.isActive
      });
    }

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

    // Update delivery agent status
    deliveryAgent.status = 'assigned';
    deliveryAgent.currentOrder = orderId;
    
    // Add to assigned orders
    deliveryAgent.assignedOrders.push({
      order: orderId,
      assignedAt: new Date(),
      status: 'assigned'
    });
    
    await deliveryAgent.save();

    logAdmin('APPROVE_ASSIGN_ORDER_SUCCESS', {
      adminId: req.admin._id,
      orderId,
      orderNumber: order.orderNumber,
      deliveryAgentId,
      agentName: deliveryAgent.name
    }, 'success');

    // 🎯 NEW: Send real-time notification to delivery agent
    try {
      if (global.emitToDeliveryAgent) {
        global.emitToDeliveryAgent(deliveryAgentId, 'order-assigned', {
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
        });
        logAdmin('DELIVERY_AGENT_NOTIFICATION_SENT', { deliveryAgentId, orderId });
      }
    } catch (notificationError) {
      logAdmin('DELIVERY_AGENT_NOTIFICATION_FAILED', { 
        deliveryAgentId, 
        orderId, 
        error: notificationError.message 
      }, 'warning');
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
      }
    });

  } catch (error) {
    logAdmin('APPROVE_ASSIGN_ORDER_ERROR', {
      adminId: req.admin._id,
      orderId: req.body.orderId,
      deliveryAgentId: req.body.deliveryAgentId,
      error: error.message
    }, 'error');

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
  try {
    const { orderIds, deliveryAgentId, notes } = req.body;

    logAdmin('BULK_ASSIGN_ORDERS_START', {
      adminId: req.admin._id,
      orderIds: orderIds?.length || 0,
      deliveryAgentId,
      hasNotes: !!notes
    });

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
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // Check if agent is available
    if (!deliveryAgent.isActive || deliveryAgent.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Delivery agent is not available for bulk assignment',
        agentStatus: deliveryAgent.status,
        isActive: deliveryAgent.isActive
      });
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

    // Update delivery agent status if any orders were assigned
    if (assignedOrders.length > 0) {
      deliveryAgent.status = 'assigned';
      deliveryAgent.currentOrder = assignedOrders[0].orderId; // Set first order as current
      await deliveryAgent.save();
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

module.exports = {
  loginAdmin,
  getDashboardStats,
  getAllSellers,
  getAllUsers,
  // 🎯 NEW: Order management exports
  getRecentOrders,
  getAllOrders,
  getOrderDetails,
  approveAndAssignOrder,
  bulkAssignOrders,
  updateOrderStatus,
  // 🎯 NEW: Delivery agent management exports
  getDeliveryAgents,
  getDeliveryAgentProfile
};
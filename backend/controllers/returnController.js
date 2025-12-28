// backend/controllers/returnController.js - Order Return Management System

const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');
const DeliveryAgent = require('../models/DeliveryAgent');
const Admin = require('../models/Admin');
const msg91Service = require('../services/msg91Service');

// Enhanced logging for return operations
const logReturnOperation = (operation, data, type = 'info') => {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    return: '\x1b[35m',  // Magenta
    reset: '\x1b[0m'     // Reset
  };
  
  const timestamp = new Date().toISOString().slice(11, 23);
  const prefix = `${colors[type]}🔄 [Return-${operation}] ${timestamp}`;
  const suffix = colors.reset;
  
  if (typeof data === 'object') {
    console.log(`${prefix} ${JSON.stringify(data, null, 2)}${suffix}`);
  } else {
    console.log(`${prefix} ${data}${suffix}`);
  }
};

// 🎯 RETURN ELIGIBILITY CHECK
const getReturnEligibility = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    logReturnOperation('CheckEligibility', {
      orderId,
      userId,
      timestamp: new Date().toISOString()
    }, 'return');

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized to view this order (only if user is logged in)
    if (userId && order.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access this order'
      });
    }

    // Check return eligibility
    const eligibility = order.checkReturnEligibility();

    logReturnOperation('CheckEligibility', {
      success: true,
      orderId,
      orderNumber: order.orderNumber,
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      hoursRemaining: eligibility.hoursRemaining
    }, eligibility.eligible ? 'success' : 'warning');

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        eligible: eligibility.eligible,
        reason: eligibility.reason,
        hoursRemaining: eligibility.hoursRemaining,
        deadline: eligibility.deadline,
        deliveredAt: order.deliveredAt,
        currentReturnStatus: order.returnDetails?.returnStatus || 'eligible'
      }
    });

  } catch (error) {
    logReturnOperation('CheckEligibility', {
      error: error.message,
      orderId: req.params.orderId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to check return eligibility',
      error: error.message
    });
  }
};

// 🎯 REQUEST RETURN
const requestReturn = async (req, res) => {
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    // 🎯 AGGRESSIVE LOGGING: Entry point
    console.log(`🔄 [${requestId}] [RETURN-CONTROLLER] RequestReturn - ENTRY:`, JSON.stringify({
      requestId,
      orderId,
      reason: reason?.substring(0, 50), // Truncate for logging
      userId,
      timestamp: new Date().toISOString()
    }, null, 2));

    logReturnOperation('RequestReturn', {
      requestId,
      orderId,
      reason: reason?.substring(0, 50),
      userId,
      timestamp: new Date().toISOString()
    }, 'return');

    // 🎯 VALIDATION LOGGING
    if (!orderId || !reason) {
      console.error(`❌ [${requestId}] [RETURN-CONTROLLER] RequestReturn - VALIDATION FAILED:`, JSON.stringify({
        requestId,
        hasOrderId: !!orderId,
        hasReason: !!reason,
        error: 'Order ID and return reason are required'
      }, null, 2));
      
      return res.status(400).json({
        success: false,
        message: 'Order ID and return reason are required'
      });
    }

    // Find the order
    console.log(`🔍 [${requestId}] [RETURN-CONTROLLER] RequestReturn - FETCHING ORDER:`, orderId);
    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop email');

    if (!order) {
      console.error(`❌ [${requestId}] [RETURN-CONTROLLER] RequestReturn - ORDER NOT FOUND:`, orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`✅ [${requestId}] [RETURN-CONTROLLER] RequestReturn - ORDER FOUND:`, JSON.stringify({
      requestId,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      isDelivered: order.isDelivered,
      deliveredAt: order.deliveredAt,
      userId: order.user._id.toString(),
      returnStatus: order.returnDetails?.returnStatus
    }, null, 2));

    // Check if user is authorized to request return for this order (only if user is logged in)
    if (userId && order.user._id.toString() !== userId) {
      console.error(`❌ [${requestId}] [RETURN-CONTROLLER] RequestReturn - UNAUTHORIZED:`, JSON.stringify({
        requestId,
        orderUserId: order.user._id.toString(),
        requestUserId: userId,
        error: 'User mismatch'
      }, null, 2));
      
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to request return for this order'
      });
    }

    // Check if return is already requested or approved
    if (order.returnDetails?.returnStatus === 'requested' || order.returnDetails?.returnStatus === 'approved') {
      console.error(`❌ [${requestId}] [RETURN-CONTROLLER] RequestReturn - ALREADY REQUESTED:`, JSON.stringify({
        requestId,
        currentReturnStatus: order.returnDetails?.returnStatus,
        error: 'Return already in progress'
      }, null, 2));
      
      return res.status(400).json({
        success: false,
        message: 'Return already requested and approved for this order'
      });
    }

    try {
      // 🎯 LOGGING: Before calling model method
      console.log(`🔄 [${requestId}] [RETURN-CONTROLLER] RequestReturn - CALLING MODEL METHOD:`, JSON.stringify({
        requestId,
        orderId: order._id.toString(),
        orderStatus: order.status,
        currentReturnStatus: order.returnDetails?.returnStatus,
        beforeState: {
          returnStatus: order.returnDetails?.returnStatus,
          hasReturnDetails: !!order.returnDetails
        }
      }, null, 2));
      
      // Request return using the model method
      await order.requestReturn(reason, userId);
      
      // 🎯 LOGGING: After model method call
      console.log(`✅ [${requestId}] [RETURN-CONTROLLER] RequestReturn - MODEL METHOD SUCCESS:`, JSON.stringify({
        requestId,
        orderId: order._id.toString(),
        afterState: {
          returnStatus: order.returnDetails?.returnStatus,
          returnRequestedAt: order.returnDetails?.returnRequestedAt,
          returnApprovedAt: order.returnDetails?.returnApprovedAt
        }
      }, null, 2));

      // 🎯 LOGGING: Success response
      console.log(`✅ [${requestId}] [RETURN-CONTROLLER] RequestReturn - SUCCESS:`, JSON.stringify({
        requestId,
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        returnStatus: order.returnDetails.returnStatus,
        returnRequestedAt: order.returnDetails.returnRequestedAt,
        returnApprovedAt: order.returnDetails.returnApprovedAt,
        autoApproved: true
      }, null, 2));
      
      logReturnOperation('RequestReturn', {
        requestId,
        success: true,
        orderId,
        orderNumber: order.orderNumber,
        reason: reason?.substring(0, 50),
        returnStatus: order.returnDetails.returnStatus,
        autoApproved: true
      }, 'success');

      // Notify seller about return request (auto-approved)
      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'return-requested', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          user: order.user,
          reason,
          requestedAt: order.returnDetails.returnRequestedAt,
          returnStatus: 'approved',
          approvedAt: order.returnDetails.returnApprovedAt,
          returnDeadline: order.returnDetails.returnWindow.returnDeadline
        });
      }

      // Notify admin about return request (auto-approved) - appears in admin portal
      if (global.emitToAdmin) {
        global.emitToAdmin('return-requested', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          user: order.user,
          seller: order.seller,
          reason,
          requestedAt: order.returnDetails.returnRequestedAt,
          returnStatus: 'approved',
          approvedAt: order.returnDetails.returnApprovedAt,
          autoApproved: true
        });
      }

      res.json({
        success: true,
        message: 'Return request submitted and auto-approved successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          requestedAt: order.returnDetails.returnRequestedAt,
          approvedAt: order.returnDetails.returnApprovedAt,
          returnDeadline: order.returnDetails.returnWindow.returnDeadline,
          autoApproved: true
        }
      });

    } catch (eligibilityError) {
      // 🎯 LOGGING: Eligibility error
      console.error(`❌ [${requestId}] [RETURN-CONTROLLER] RequestReturn - ELIGIBILITY ERROR:`, JSON.stringify({
        requestId,
        orderId,
        error: eligibilityError.message,
        stack: eligibilityError.stack,
        errorType: eligibilityError.constructor.name
      }, null, 2));
      
      logReturnOperation('RequestReturn', {
        requestId,
        error: eligibilityError.message,
        orderId,
        reason: reason?.substring(0, 50),
        stack: eligibilityError.stack
      }, 'error');

      res.status(400).json({
        success: false,
        message: eligibilityError.message
      });
    }

  } catch (error) {
    // 🎯 LOGGING: General error
    console.error(`❌ [${requestId}] [RETURN-CONTROLLER] RequestReturn - GENERAL ERROR:`, JSON.stringify({
      requestId,
      orderId: req.params.orderId,
      error: error.message,
      stack: error.stack,
      errorType: error.constructor.name,
      errorName: error.name
    }, null, 2));
    
    logReturnOperation('RequestReturn', {
      requestId,
      error: error.message,
      orderId: req.params.orderId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to request return',
      error: error.message
    });
  }
};

// 🎯 GET RETURN ORDERS (Admin Dashboard)
const getReturnOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const adminId = req.admin?._id;

    logReturnOperation('GetReturnOrders', {
      status,
      adminId,
      timestamp: new Date().toISOString()
    }, 'return');

    let query = {};
    
    if (status) {
      query['returnDetails.returnStatus'] = status;
    } else {
      // Get all return-related orders
      query['returnDetails.returnStatus'] = {
        $in: [
          'requested',
          'approved',
          'assigned',
          'accepted',
          'agent_reached_buyer',
          'picked_up',
          'agent_reached_seller',
          'pickup_failed',
          'returned_to_seller',
          'completed',
          'rejected'
        ]
      };
    }

    const returnOrders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('seller', 'firstName lastName shop email phone')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone')
      .populate('returnDetails.returnAssignment.assignedBy', 'firstName lastName')
      .sort({ 'returnDetails.returnRequestedAt': -1 });

    logReturnOperation('GetReturnOrders', {
      success: true,
      count: returnOrders.length,
      status: status || 'all'
    }, 'success');

    res.json({
      success: true,
      data: returnOrders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        seller: order.seller,
        totalPrice: order.totalPrice,
        deliveredAt: order.deliveredAt,
        returnDetails: order.returnDetails,
        orderItems: order.orderItems,
        shippingAddress: order.shippingAddress
      }))
    });

  } catch (error) {
    logReturnOperation('GetReturnOrders', {
      error: error.message,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch return orders',
      error: error.message
    });
  }
};

// 🎯 GET SELLER RETURN ORDERS
const getSellerReturnOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const sellerId = req.seller._id;

    logReturnOperation('GetSellerReturnOrders', {
      status,
      sellerId,
      timestamp: new Date().toISOString()
    }, 'return');

    let query = { seller: sellerId };
    
    if (status) {
      query['returnDetails.returnStatus'] = status;
    } else {
      // Get all return-related orders for this seller
      query['returnDetails.returnStatus'] = {
        $in: [
          'requested',
          'approved',
          'assigned',
          'accepted',
          'agent_reached_buyer',
          'picked_up',
          'agent_reached_seller',
          'pickup_failed',
          'returned_to_seller',
          'completed',
          'rejected'
        ]
      };
    }

    const returnOrders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone')
      .populate('returnDetails.returnAssignment.assignedBy', 'firstName lastName')
      .sort({ 'returnDetails.returnRequestedAt': -1 });

    logReturnOperation('GetSellerReturnOrders', {
      success: true,
      sellerId,
      count: returnOrders.length,
      status: status || 'all'
    }, 'success');

    res.json({
      success: true,
      data: returnOrders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        totalPrice: order.totalPrice,
        deliveredAt: order.deliveredAt,
        returnDetails: order.returnDetails,
        orderItems: order.orderItems,
        shippingAddress: order.shippingAddress
      }))
    });

  } catch (error) {
    logReturnOperation('GetSellerReturnOrders', {
      error: error.message,
      sellerId: req.seller?._id,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller return orders',
      error: error.message
    });
  }
};

// 🎯 ASSIGN RETURN DELIVERY AGENT
const assignReturnAgent = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { agentId } = req.body;
    // 🎯 FIXED: Use req.admin?._id for admin routes (consistent with getReturnOrders)
    const adminId = req.admin?._id || req.user?.id;

    logReturnOperation('AssignReturnAgent', {
      returnId,
      agentId,
      adminId,
      timestamp: new Date().toISOString()
    }, 'return');

    if (!agentId) {
      return res.status(400).json({
        success: false,
        message: 'Delivery agent ID is required'
      });
    }

    // Find the order
    const order = await Order.findById(returnId)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // 🎯 UPDATED: Check if return is in correct status (allow both 'requested' and 'approved')
    if (order.returnDetails?.returnStatus !== 'requested' && order.returnDetails?.returnStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot assign agent. Return status must be 'requested' or 'approved'. Current status: ${order.returnDetails?.returnStatus}`
      });
    }

    // Verify delivery agent exists
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    if (!deliveryAgent) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    try {
      // Assign return agent using the model method
      await order.assignReturnAgent(agentId, adminId);

      logReturnOperation('AssignReturnAgent', {
        success: true,
        returnId,
        orderNumber: order.orderNumber,
        agentId,
        agentName: deliveryAgent.firstName + ' ' + deliveryAgent.lastName,
        returnStatus: order.returnDetails.returnStatus
      }, 'success');

      // Notify delivery agent about return assignment
      if (global.emitToDeliveryAgent) {
        global.emitToDeliveryAgent(agentId, 'return-assigned', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          user: order.user,
          seller: order.seller,
          returnReason: order.returnDetails.returnReason,
          assignedAt: order.returnDetails.returnAssignment.assignedAt,
          returnDeadline: order.returnDetails.returnWindow.returnDeadline,
          shippingAddress: order.shippingAddress,
          orderItems: order.orderItems
        });
      }

      // Notify buyer about return approval
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'return-approved', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          assignedAgent: deliveryAgent,
          assignedAt: order.returnDetails.returnAssignment.assignedAt
        });
      }

      // Notify seller about return assignment
      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'return-assigned', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          assignedAgent: deliveryAgent,
          assignedAt: order.returnDetails.returnAssignment.assignedAt
        });
      }

      res.json({
        success: true,
        message: 'Return assigned to delivery agent successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          assignedAgent: deliveryAgent,
          assignedAt: order.returnDetails.returnAssignment.assignedAt
        }
      });

    } catch (assignmentError) {
      logReturnOperation('AssignReturnAgent', {
        error: assignmentError.message,
        returnId,
        agentId
      }, 'error');

      res.status(400).json({
        success: false,
        message: assignmentError.message
      });
    }

  } catch (error) {
    logReturnOperation('AssignReturnAgent', {
      error: error.message,
      returnId: req.params.returnId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to assign return agent',
      error: error.message
    });
  }
};

// 🎯 DELIVERY AGENT RESPONSE TO RETURN ASSIGNMENT
const handleReturnAssignmentResponse = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { response, reason } = req.body;
    // 🎯 FIX: Use req.deliveryAgent instead of req.user for delivery agent routes
    const agentId = req.deliveryAgent?._id || req.deliveryAgent?.id;

    logReturnOperation('ReturnAssignmentResponse', {
      returnId,
      response,
      reason,
      agentId,
      timestamp: new Date().toISOString()
    }, 'return');

    if (!response || !['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Response must be either "accepted" or "rejected"'
      });
    }

    // Find the order
    const order = await Order.findById(returnId)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if agent is assigned to this return
    if (order.returnDetails?.returnAssignment?.deliveryAgent?.toString() !== agentId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to respond to this return assignment'
      });
    }

    // Check if return is in correct status
    if (order.returnDetails?.returnAssignment?.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot respond. Assignment status is: ${order.returnDetails?.returnAssignment?.status}`
      });
    }

    try {
      // Handle response using the model method
      await order.handleReturnAgentResponse(response, reason);

      logReturnOperation('ReturnAssignmentResponse', {
        success: true,
        returnId,
        orderNumber: order.orderNumber,
        response,
        reason,
        returnStatus: order.returnDetails.returnStatus
      }, 'success');

      if (response === 'accepted') {
        // Notify buyer about return acceptance
        if (global.emitToBuyer) {
          global.emitToBuyer(order.user._id, 'return-agent-accepted', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            agent: order.returnDetails.returnAssignment.deliveryAgent,
            acceptedAt: order.returnDetails.returnAssignment.acceptedAt
          });
        }

        // Notify seller about return acceptance
        if (global.emitToSeller) {
          global.emitToSeller(order.seller._id, 'return-agent-accepted', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            agent: order.returnDetails.returnAssignment.deliveryAgent,
            acceptedAt: order.returnDetails.returnAssignment.acceptedAt
          });
        }

        // Notify admin about return acceptance
        if (global.emitToAdmin) {
          global.emitToAdmin('return-agent-accepted', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            agent: order.returnDetails.returnAssignment.deliveryAgent,
            acceptedAt: order.returnDetails.returnAssignment.acceptedAt
          });
        }

      } else if (response === 'rejected') {
        // Notify admin about return rejection for reassignment
        if (global.emitToAdmin) {
          global.emitToAdmin('return-agent-rejected', {
            orderId: order._id,
            orderNumber: order.orderNumber,
            agent: order.returnDetails.returnAssignment.deliveryAgent,
            rejectedAt: order.returnDetails.returnAssignment.rejectedAt,
            rejectionReason: reason
          });
        }
      }

      res.json({
        success: true,
        message: `Return assignment ${response} successfully`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          assignmentStatus: order.returnDetails.returnAssignment.status,
          response,
          reason,
          timestamp: new Date().toISOString()
        }
      });

    } catch (responseError) {
      logReturnOperation('ReturnAssignmentResponse', {
        error: responseError.message,
        returnId,
        response
      }, 'error');

      res.status(400).json({
        success: false,
        message: responseError.message
      });
    }

  } catch (error) {
    logReturnOperation('ReturnAssignmentResponse', {
      error: error.message,
      returnId: req.params.returnId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to handle return assignment response',
      error: error.message
    });
  }
};

// 🎯 MARK BUYER LOCATION REACHED (Delivery Agent)
const markReturnBuyerArrival = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { location, notes } = req.body;
    // 🎯 FIX: Use req.deliveryAgent instead of req.user for delivery agent routes
    const agentId = req.deliveryAgent?._id || req.deliveryAgent?.id;

    logReturnOperation('ReturnBuyerArrival', {
      returnId,
      agentId,
      hasLocation: Boolean(location),
      timestamp: new Date().toISOString()
    }, 'return');

    const order = await Order.findById(returnId)
      .populate('user', 'name email phone')
      .populate('seller', 'firstName shop')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.returnDetails?.returnAssignment?.deliveryAgent?.toString() !== agentId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this return assignment'
      });
    }

    // Check if return is in correct status (only accept 'accepted' to prevent redundant calls)
    const assignmentStatus = order.returnDetails?.returnAssignment?.status;
    if (assignmentStatus !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark buyer arrival. Assignment status must be 'accepted', but is: ${assignmentStatus}`
      });
    }

    // 🎯 ISSUE 6 FIX: Generate and send OTP to buyer for return pickup verification
    const buyerPhone = order.user?.mobileNumber || order.user?.phone;
    let otpResult = null;
    
    if (buyerPhone) {
      try {
        otpResult = await msg91Service.sendOTPForForgotPassword(buyerPhone, {
          purpose: 'return_pickup',
          orderNumber: order.orderNumber,
          userName: order.user?.name || 'Customer'
        });

        if (otpResult.success) {
          // Store OTP metadata in return pickup details
          order.returnDetails.returnPickup = order.returnDetails.returnPickup || {};
          order.returnDetails.returnPickup.buyerOtpMeta = {
            lastSentAt: new Date(),
            requestId: otpResult.response?.request_id || otpResult.response?.requestId || '',
            phoneNumber: buyerPhone,
            verificationAttempts: 0
          };
          
          logReturnOperation('ReturnBuyerArrival', {
            otpSent: true,
            buyerPhone,
            requestId: otpResult.response?.request_id || otpResult.response?.requestId
          }, 'success');
        } else {
          logReturnOperation('ReturnBuyerArrival', {
            otpSent: false,
            error: otpResult.error || 'Failed to send OTP'
          }, 'warning');
        }
      } catch (otpError) {
        logReturnOperation('ReturnBuyerArrival', {
          otpError: otpError.message
        }, 'warning');
        // Continue even if OTP fails - frontend can handle fallback
      }
    } else {
      logReturnOperation('ReturnBuyerArrival', {
        warning: 'Buyer phone number not available for OTP'
      }, 'warning');
    }

    const arrivalTime = new Date();
    order.returnDetails.returnAssignment.buyerLocationReachedAt = arrivalTime;
    order.returnDetails.returnAssignment.status = 'agent_reached_buyer';
    order.returnDetails.returnStatus = 'agent_reached_buyer';
    if (location) {
      order.returnDetails.returnAssignment.lastKnownLocation = {
        type: location.type || 'Point',
        coordinates: location.coordinates || [0, 0],
        address: location.address || ''
      };
    }

    order.returnDetails.returnHistory.push({
      status: 'agent_reached_buyer',
      changedBy: 'delivery_agent',
      changedAt: arrivalTime,
      notes: notes || 'Delivery agent reached buyer location for return pickup',
      location: location || {
        type: 'Point',
        coordinates: [0, 0]
      },
      otpSent: otpResult?.success || false
    });

    await order.save();

    // Notify buyer/admin about update
    if (global.emitToBuyer) {
      global.emitToBuyer(order.user._id, 'return-agent-arrived', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.returnDetails.returnStatus,
        arrivedAt: arrivalTime,
        otpSent: otpResult?.success || false,
        // Include OTP info if sent successfully
        ...(otpResult?.success && {
          otpInfo: {
            phoneNumber: buyerPhone,
            sentAt: order.returnDetails?.returnPickup?.buyerOtpMeta?.lastSentAt
          }
        })
      });
    }

    if (global.emitToAdmin) {
      global.emitToAdmin('return-agent-arrived', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.returnDetails.returnStatus,
        arrivedAt: arrivalTime,
        deliveryAgent: order.returnDetails.returnAssignment.deliveryAgent
      });
    }

    res.json({
      success: true,
      message: 'Buyer location marked as reached' + (otpResult?.success ? ' and OTP sent' : ''),
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnStatus: order.returnDetails.returnStatus,
        buyerLocationReachedAt: arrivalTime,
        otpSent: otpResult?.success || false,
        buyerOtpMeta: order.returnDetails?.returnPickup?.buyerOtpMeta || null
      }
    });

  } catch (error) {
    logReturnOperation('ReturnBuyerArrival', {
      error: error.message,
      returnId: req.params.returnId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to mark buyer location as reached',
      error: error.message
    });
  }
};

// 🎯 COMPLETE RETURN PICKUP
const completeReturnPickup = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { otp, location, notes } = req.body;
    // 🎯 FIX: Use req.deliveryAgent instead of req.user for delivery agent routes
    const agentId = req.deliveryAgent?._id || req.deliveryAgent?.id;

    logReturnOperation('CompleteReturnPickup', {
      returnId,
      agentId,
      hasOtp: !!otp,
      hasLocation: !!location,
      timestamp: new Date().toISOString()
    }, 'return');

    // Find the order
    const order = await Order.findById(returnId)
      .populate('user', 'name email phone mobileNumber')
      .populate('seller', 'firstName shop')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if agent is assigned to this return
    if (order.returnDetails?.returnAssignment?.deliveryAgent?.toString() !== agentId?.toString() !== agentId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to complete pickup for this return'
      });
    }

    // Check if return is in correct status (accept both 'accepted' and 'agent_reached_buyer')
    const assignmentStatus = order.returnDetails?.returnAssignment?.status;
    if (!['accepted', 'agent_reached_buyer'].includes(assignmentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete pickup. Assignment status is: ${assignmentStatus}`
      });
    }

    // 🎯 MANDATORY OTP VERIFICATION: Buyer OTP is required to complete pickup
    const buyerPhone = order.user?.mobileNumber || order.user?.phone;

    // Validate OTP is provided
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Buyer OTP is required to complete pickup. Please enter the OTP shared by the buyer.'
      });
    }

    // Validate buyer phone exists
    if (!buyerPhone) {
      logReturnOperation('CompleteReturnPickup', {
        error: 'Buyer phone number not found',
        userId: order.user?._id,
        returnId
      }, 'error');
      return res.status(400).json({
        success: false,
        message: 'Buyer phone number not found. Cannot verify OTP. Please contact support.'
      });
    }

    // Verify OTP with MSG91
    try {
      const otpVerification = await msg91Service.verifyOTP({
        phoneNumber: buyerPhone,
        otp
      });

      if (!otpVerification.success) {
        return res.status(400).json({
          success: false,
          message: otpVerification.message || 'Invalid OTP. Please check and try again.'
        });
      }

      // Update OTP verification attempts
      if (order.returnDetails?.returnPickup?.buyerOtpMeta) {
        order.returnDetails.returnPickup.buyerOtpMeta.verificationAttempts =
          (order.returnDetails.returnPickup.buyerOtpMeta.verificationAttempts || 0) + 1;
        order.returnDetails.returnPickup.buyerOtpMeta.verifiedAt = new Date();
      }
    } catch (otpError) {
      logReturnOperation('CompleteReturnPickup', {
        otpError: otpError.message
      }, 'warning');
      return res.status(400).json({
        success: false,
        message: 'Failed to verify OTP. Please try again.'
      });
    }

    try {
      // Complete return pickup using the model method
      await order.completeReturnPickup({
        pickupOTP: otp || null,
        location: location || {
          type: 'Point',
          coordinates: [0, 0]
        },
        notes
      });

      logReturnOperation('CompleteReturnPickup', {
        success: true,
        returnId,
        orderNumber: order.orderNumber,
        returnStatus: order.returnDetails.returnStatus,
        pickupCompletedAt: order.returnDetails.returnPickup.completedAt
      }, 'success');

      // Notify buyer about return pickup completion
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'return-picked-up', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          agent: order.returnDetails.returnAssignment.deliveryAgent,
          pickedUpAt: order.returnDetails.returnPickup.completedAt,
          returnStatus: order.returnDetails.returnStatus
        });
      }

      // Notify seller about return pickup completion
      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'return-picked-up', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          agent: order.returnDetails.returnAssignment.deliveryAgent,
          pickedUpAt: order.returnDetails.returnPickup.completedAt,
          returnStatus: order.returnDetails.returnStatus
        });
      }

      // Notify admin about return pickup completion
      if (global.emitToAdmin) {
        global.emitToAdmin('return-picked-up', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          agent: order.returnDetails.returnAssignment.deliveryAgent,
          pickedUpAt: order.returnDetails.returnPickup.completedAt,
          returnStatus: order.returnDetails.returnStatus
        });
      }

      res.json({
        success: true,
        message: 'Return pickup completed successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          pickupCompletedAt: order.returnDetails.returnPickup.completedAt,
          nextStep: 'deliver_return_to_seller'
        }
      });

    } catch (pickupError) {
      logReturnOperation('CompleteReturnPickup', {
        error: pickupError.message,
        returnId
      }, 'error');

      res.status(400).json({
        success: false,
        message: pickupError.message
      });
    }

  } catch (error) {
    logReturnOperation('CompleteReturnPickup', {
      error: error.message,
      returnId: req.params.returnId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to complete return pickup',
      error: error.message
    });
  }
};

// 🎯 MARK SELLER LOCATION & TRIGGER OTP (Delivery Agent)
const markReturnSellerArrival = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { location, notes } = req.body;
    // 🎯 FIX: Use req.deliveryAgent instead of req.user for delivery agent routes
    const agentId = req.deliveryAgent?._id || req.deliveryAgent?.id;

    logReturnOperation('ReturnSellerArrival', {
      returnId,
      agentId,
      hasLocation: Boolean(location),
      timestamp: new Date().toISOString()
    }, 'return');

    const order = await Order.findById(returnId)
      .populate('user', 'name email phone mobileNumber')
      .populate('seller', 'firstName lastName shop mobileNumber phone email')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.returnDetails?.returnAssignment?.deliveryAgent?.toString() !== agentId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this return assignment'
      });
    }

    if (!order.returnDetails?.returnAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Return assignment not found'
      });
    }

    if (order.returnDetails.returnAssignment.status !== 'picked_up') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark seller arrival. Assignment status must be 'picked_up', but is: ${order.returnDetails.returnAssignment.status}`
      });
    }

    // 🎯 Enhanced seller phone retrieval with extended fallbacks and logging
    const sellerPhone =
      order.seller?.mobileNumber ||
      order.seller?.phone ||
      order.seller?.shop?.phoneNumber?.main ||
      order.seller?.shop?.phoneNumber?.alternate ||
      order.seller?.shop?.phone ||
      order.seller?.shop?.mobile ||
      order.seller?.shop?.mobileNumber;

    if (!sellerPhone) {
      logReturnOperation('ReturnSellerArrival', {
        error: 'Seller phone number not found',
        sellerId: order.seller?._id,
        sellerName: order.seller?.firstName,
        shopName: order.seller?.shop?.name,
        returnId,
        orderNumber: order.orderNumber
      }, 'error');

      return res.status(400).json({
        success: false,
        message: 'Seller mobile number is not available. Please contact admin to update seller details.'
      });
    }

    const otpResult = await msg91Service.sendOTPForForgotPassword(sellerPhone, {
      purpose: 'return_delivery',
      orderNumber: order.orderNumber,
      userName: order.seller?.firstName || order.seller?.shop?.name || 'Seller'
    });

    if (!otpResult.success) {
      return res.status(502).json({
        success: false,
        message: otpResult.error || 'Failed to send OTP to seller'
      });
    }

    const arrivalTime = new Date();
    order.returnDetails.returnAssignment.sellerLocationReachedAt = arrivalTime;
    order.returnDetails.returnAssignment.status = 'agent_reached_seller';
    order.returnDetails.returnStatus = 'agent_reached_seller';
    if (location) {
      order.returnDetails.returnAssignment.lastKnownLocation = {
        type: location.type || 'Point',
        coordinates: location.coordinates || [0, 0],
        address: location.address || ''
      };
    }

    order.returnDetails.returnDelivery = order.returnDetails.returnDelivery || {};
    order.returnDetails.returnDelivery.sellerOtpMeta = {
      ...(order.returnDetails.returnDelivery.sellerOtpMeta || {}),
      lastSentAt: new Date(),
      requestId: otpResult.response?.request_id || otpResult.response?.requestId || '',
      phoneNumber: sellerPhone,
      verificationAttempts: order.returnDetails.returnDelivery.sellerOtpMeta?.verificationAttempts || 0
    };

    order.returnDetails.returnHistory.push({
      status: 'agent_reached_seller',
      changedBy: 'delivery_agent',
      changedAt: arrivalTime,
      notes: notes || 'Delivery agent reached seller location with return package',
      location: location || {
        type: 'Point',
        coordinates: [0, 0]
      }
    });

    await order.save();

    if (global.emitToSeller) {
      global.emitToSeller(order.seller._id, 'return-agent-arrived', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.returnDetails.returnStatus,
        otpSentAt: order.returnDetails.returnDelivery.sellerOtpMeta.lastSentAt
      });
    }

    res.json({
      success: true,
      message: 'Seller arrival recorded and OTP sent',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnStatus: order.returnDetails.returnStatus,
        sellerOtpMeta: order.returnDetails.returnDelivery.sellerOtpMeta
      }
    });

  } catch (error) {
    logReturnOperation('ReturnSellerArrival', {
      error: error.message,
      returnId: req.params.returnId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to mark seller arrival or send OTP',
      error: error.message
    });
  }
};

// 🎯 COMPLETE RETURN DELIVERY TO SELLER
const completeReturnDelivery = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { otp, location, notes } = req.body;
    // 🎯 FIX: Use req.deliveryAgent instead of req.user for delivery agent routes
    const agentId = req.deliveryAgent?._id || req.deliveryAgent?.id;

    logReturnOperation('CompleteReturnDelivery', {
      returnId,
      agentId,
      hasOtp: !!otp,
      hasLocation: !!location,
      timestamp: new Date().toISOString()
    }, 'return');

    // Find the order
    const order = await Order.findById(returnId)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop email phone')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if agent is assigned to this return
    if (order.returnDetails?.returnAssignment?.deliveryAgent?.toString() !== agentId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to complete delivery for this return'
      });
    }

    // Check if return is in correct status (must be 'agent_reached_seller' after OTP is sent)
    if (order.returnDetails?.returnAssignment?.status !== 'agent_reached_seller') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete delivery. Assignment status must be 'agent_reached_seller', but is: ${order.returnDetails?.returnAssignment?.status}`
      });
    }

    const sellerPhone =
      order.seller?.mobileNumber ||
      order.seller?.shop?.phoneNumber?.main ||
      order.seller?.shop?.phoneNumber?.alternate;

    if (!sellerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Seller mobile number is not available for OTP verification'
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'Seller OTP is required to complete return delivery'
      });
    }

    const otpVerification = await msg91Service.verifyOTP({
      phoneNumber: sellerPhone,
      otp
    });

    if (!otpVerification.success) {
      return res.status(400).json({
        success: false,
        message: otpVerification.message || 'Failed to verify seller OTP'
      });
    }

    order.returnDetails.returnDelivery = order.returnDetails.returnDelivery || {};
    order.returnDetails.returnDelivery.sellerOtpMeta = {
      ...(order.returnDetails.returnDelivery.sellerOtpMeta || {}),
      verificationAttempts: (order.returnDetails.returnDelivery.sellerOtpMeta?.verificationAttempts || 0) + 1,
      verifiedAt: new Date()
    };

    try {
      // Complete return delivery using the model method
      // Note: sellerOTP is set to null since we're using MSG91 OTP directly (no OtpVerification record)
      // OTP verification info is stored in sellerOtpMeta instead
      await order.completeReturnDelivery({
        sellerOTP: null, // No OtpVerification record created for return deliveries using MSG91
        location: location || {
          type: 'Point',
          coordinates: [0, 0]
        },
        notes
      });

      logReturnOperation('CompleteReturnDelivery', {
        success: true,
        returnId,
        orderNumber: order.orderNumber,
        returnStatus: order.returnDetails.returnStatus,
        deliveryCompletedAt: order.returnDetails.returnDelivery.completedAt
      }, 'success');

      // Notify seller about return delivery completion
      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'return-delivered', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          agent: order.returnDetails.returnAssignment.deliveryAgent,
          deliveredAt: order.returnDetails.returnDelivery.completedAt,
          returnStatus: order.returnDetails.returnStatus,
          user: order.user
        });
      }

      // Notify buyer about return delivery completion
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'return-delivered-to-seller', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          deliveredAt: order.returnDetails.returnDelivery.completedAt,
          returnStatus: order.returnDetails.returnStatus
        });
      }

      // Notify admin about return delivery completion
      if (global.emitToAdmin) {
        global.emitToAdmin('return-delivered', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          agent: order.returnDetails.returnAssignment.deliveryAgent,
          deliveredAt: order.returnDetails.returnDelivery.completedAt,
          returnStatus: order.returnDetails.returnStatus
        });
      }

      res.json({
        success: true,
        message: 'Return delivered to seller successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          deliveryCompletedAt: order.returnDetails.returnDelivery.completedAt,
          nextStep: 'seller_confirmation'
        }
      });

    } catch (deliveryError) {
      logReturnOperation('CompleteReturnDelivery', {
        error: deliveryError.message,
        returnId
      }, 'error');

      res.status(400).json({
        success: false,
        message: deliveryError.message
      });
    }

  } catch (error) {
    logReturnOperation('CompleteReturnDelivery', {
      error: error.message,
      returnId: req.params.returnId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to complete return delivery',
      error: error.message
    });
  }
};

// 🎯 COMPLETE RETURN PROCESS
const completeReturn = async (req, res) => {
  try {
    const { returnId } = req.params;
    const adminId = req.user?.id;

    logReturnOperation('CompleteReturn', {
      returnId,
      adminId,
      timestamp: new Date().toISOString()
    }, 'return');

    // Find the order
    const order = await Order.findById(returnId)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if return is in correct status
    if (order.returnDetails?.returnStatus !== 'returned_to_seller') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete return. Status is: ${order.returnDetails?.returnStatus}`
      });
    }

    try {
      // Complete return using the model method
      await order.completeReturn();

      logReturnOperation('CompleteReturn', {
        success: true,
        returnId,
        orderNumber: order.orderNumber,
        returnStatus: order.returnDetails.returnStatus
      }, 'success');

      // Notify all parties about return completion
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'return-completed', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          completedAt: new Date().toISOString()
        });
      }

      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'return-completed', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          completedAt: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Return process completed successfully',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          returnStatus: order.returnDetails.returnStatus,
          completedAt: new Date().toISOString()
        }
      });

    } catch (completionError) {
      logReturnOperation('CompleteReturn', {
        error: completionError.message,
        returnId
      }, 'error');

      res.status(400).json({
        success: false,
        message: completionError.message
      });
    }

  } catch (error) {
    logReturnOperation('CompleteReturn', {
      error: error.message,
      returnId: req.params.returnId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to complete return',
      error: error.message
    });
  }
};

// 🎯 GET DELIVERY AGENT RETURN ASSIGNMENTS
const getDeliveryAgentReturns = async (req, res) => {
  try {
    // 🎯 FIX: Use req.deliveryAgent instead of req.user for delivery agent routes
    const agentId = req.deliveryAgent?._id || req.deliveryAgent?.id;

    logReturnOperation('GetDeliveryAgentReturns', {
      agentId,
      timestamp: new Date().toISOString()
    }, 'return');

    // Find return assignments for this delivery agent
    const returnAssignments = await Order.findReturnAssignments(agentId);

    logReturnOperation('GetDeliveryAgentReturns', {
      success: true,
      agentId,
      assignmentCount: returnAssignments.length
    }, 'success');

    res.json({
      success: true,
      data: returnAssignments.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        seller: order.seller,
        returnDetails: order.returnDetails,
        orderItems: order.orderItems,
        shippingAddress: order.shippingAddress,
        deliveredAt: order.deliveredAt
      }))
    });

  } catch (error) {
    logReturnOperation('GetDeliveryAgentReturns', {
      error: error.message,
      agentId: req.deliveryAgent?._id || req.deliveryAgent?.id,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery agent returns',
      error: error.message
    });
  }
};

// 🎯 GET RETURN STATUS
const getReturnStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    logReturnOperation('GetReturnStatus', {
      orderId,
      userId,
      timestamp: new Date().toISOString()
    }, 'return');

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized to view this order (only if user is logged in)
    if (userId && order.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view return status for this order'
      });
    }

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnDetails: order.returnDetails,
        returnWindowInfo: order.returnWindowInfo,
        isReturnEligible: order.isReturnEligible,
        isReturnInProgress: order.isReturnInProgress
      }
    });

  } catch (error) {
    logReturnOperation('GetReturnStatus', {
      error: error.message,
      orderId: req.params.orderId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to fetch return status',
      error: error.message
    });
  }
};

// @desc    Mark return pickup as failed due to buyer not responding
// @route   PUT /api/returns/:returnId/pickup-failed
// @access  Private/DeliveryAgent
const markReturnPickupFailed = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { reason } = req.body;
    // 🎯 FIX: Use req.deliveryAgent instead of req.user for delivery agent routes
    const agentId = req.deliveryAgent?._id || req.deliveryAgent?.id;

    logReturnOperation('MarkReturnPickupFailed', {
      returnId,
      agentId,
      reason,
      timestamp: new Date().toISOString()
    }, 'return');

    // Find the order
    const order = await Order.findById(returnId)
      .populate('user', 'name email phone')
      .populate('seller', 'firstName shop')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if agent is assigned to this return
    if (order.returnDetails?.returnAssignment?.deliveryAgent?.toString() !== agentId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to mark pickup as failed for this return'
      });
    }

    // Check if return is in correct status (accept both 'accepted' and 'agent_reached_buyer')
    const assignmentStatus = order.returnDetails?.returnAssignment?.status;
    if (!['accepted', 'agent_reached_buyer'].includes(assignmentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark pickup as failed. Assignment status is: ${assignmentStatus}`
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failure reason is required'
      });
    }

    // Update return status to failed
    order.returnDetails.returnStatus = 'pickup_failed';
    order.returnDetails.returnAssignment.status = 'pickup_failed';
    
    // Add to return history
    order.returnDetails.returnHistory.push({
      status: 'pickup_failed',
      changedBy: 'delivery_agent',
      changedAt: new Date(),
      notes: `Pickup failed: ${reason}`,
      location: {
        type: 'Point',
        coordinates: [0, 0] // Will be updated with actual location if provided
      }
    });

    await order.save();

    logReturnOperation('MarkReturnPickupFailed', {
      success: true,
      returnId,
      orderNumber: order.orderNumber,
      agentId,
      reason,
      newStatus: 'pickup_failed'
    }, 'success');

    // Notify admin about failed pickup
    if (global.emitToAdmin) {
      global.emitToAdmin('return-pickup-failed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        seller: order.seller,
        deliveryAgent: order.returnDetails.returnAssignment.deliveryAgent,
        reason,
        failedAt: new Date(),
        returnStatus: 'pickup_failed'
      });
    }

    // Notify seller about failed pickup
    if (global.emitToSeller) {
      global.emitToSeller(order.seller._id, 'return-pickup-failed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        reason,
        failedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Return pickup marked as failed due to buyer not responding',
      returnDetails: order.returnDetails
    });

  } catch (error) {
    logReturnOperation('MarkReturnPickupFailed', {
      error: error.message,
      returnId: req.params.returnId,
      agentId: req.deliveryAgent?._id || req.deliveryAgent?.id,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to mark return pickup as failed',
      error: error.message
    });
  }
};

// 🎯 RESEND BUYER PICKUP OTP (Delivery Agent)
const resendBuyerPickupOTP = async (req, res) => {
  try {
    const { returnId } = req.params;
    const agentId = req.deliveryAgent?._id || req.deliveryAgent?.id;

    logReturnOperation('ResendBuyerPickupOTP', {
      returnId,
      agentId,
      timestamp: new Date().toISOString()
    }, 'return');

    const order = await Order.findById(returnId)
      .populate('user', 'name email phone mobileNumber')
      .populate('seller', 'firstName lastName shop email phone mobileNumber')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Return order not found'
      });
    }

    // Check if agent is assigned to this return
    if (order.returnDetails?.returnAssignment?.deliveryAgent?._id?.toString() !== agentId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to resend OTP for this return'
      });
    }

    // Check if return is in correct status
    const returnStatus = order.returnDetails?.returnStatus;
    if (returnStatus !== 'agent_reached_buyer') {
      return res.status(400).json({
        success: false,
        message: `Cannot resend buyer OTP. Return status must be 'agent_reached_buyer', current status is: ${returnStatus}`
      });
    }

    // Rate limiting check - max 3 resends, 60 second cooldown
    const buyerOtpMeta = order.returnDetails?.returnPickup?.buyerOtpMeta;
    const resendCount = buyerOtpMeta?.resendCount || 0;
    const lastSentAt = buyerOtpMeta?.lastSentAt;

    if (resendCount >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP resend limit reached (3). Please contact support.'
      });
    }

    if (lastSentAt) {
      const secondsSinceLastSend = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSend < 60) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(60 - secondsSinceLastSend)} seconds before requesting a new OTP`
        });
      }
    }

    // Get buyer phone number
    const buyerPhone = order.user?.mobileNumber || order.user?.phone;
    if (!buyerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Buyer phone number not found. Cannot send OTP.'
      });
    }

    // Send OTP via MSG91
    const otpResult = await msg91Service.sendOTPForForgotPassword(buyerPhone, {
      purpose: 'return_pickup',
      orderNumber: order.orderNumber,
      userName: order.user?.name || 'Customer'
    });

    if (!otpResult.success) {
      logReturnOperation('ResendBuyerPickupOTP', {
        error: 'Failed to send OTP via MSG91',
        returnId,
        buyerPhone
      }, 'error');
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    // Update OTP metadata
    order.returnDetails.returnPickup.buyerOtpMeta = {
      ...buyerOtpMeta,
      lastSentAt: new Date(),
      requestId: otpResult.response?.request_id || otpResult.response?.requestId || '',
      phoneNumber: buyerPhone,
      resendCount: resendCount + 1
    };

    await order.save();

    logReturnOperation('ResendBuyerPickupOTP', {
      success: true,
      returnId,
      orderNumber: order.orderNumber,
      resendCount: resendCount + 1
    }, 'success');

    res.json({
      success: true,
      message: 'OTP resent successfully to buyer',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        resendCount: resendCount + 1,
        maxResends: 3
      }
    });

  } catch (error) {
    logReturnOperation('ResendBuyerPickupOTP', {
      error: error.message,
      returnId: req.params.returnId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to resend buyer OTP',
      error: error.message
    });
  }
};

// 🎯 RESEND SELLER DELIVERY OTP (Delivery Agent)
const resendSellerDeliveryOTP = async (req, res) => {
  try {
    const { returnId } = req.params;
    const agentId = req.deliveryAgent?._id || req.deliveryAgent?.id;

    logReturnOperation('ResendSellerDeliveryOTP', {
      returnId,
      agentId,
      timestamp: new Date().toISOString()
    }, 'return');

    const order = await Order.findById(returnId)
      .populate('user', 'name email phone mobileNumber')
      .populate('seller', 'firstName lastName shop email phone mobileNumber')
      .populate('returnDetails.returnAssignment.deliveryAgent', 'firstName lastName phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Return order not found'
      });
    }

    // Check if agent is assigned to this return
    if (order.returnDetails?.returnAssignment?.deliveryAgent?._id?.toString() !== agentId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to resend OTP for this return'
      });
    }

    // Check if return is in correct status
    const returnStatus = order.returnDetails?.returnStatus;
    if (returnStatus !== 'agent_reached_seller') {
      return res.status(400).json({
        success: false,
        message: `Cannot resend seller OTP. Return status must be 'agent_reached_seller', current status is: ${returnStatus}`
      });
    }

    // Rate limiting check - max 3 resends, 60 second cooldown
    const sellerOtpMeta = order.returnDetails?.returnDelivery?.sellerOtpMeta;
    const resendCount = sellerOtpMeta?.resendCount || 0;
    const lastSentAt = sellerOtpMeta?.lastSentAt;

    if (resendCount >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP resend limit reached (3). Please contact support.'
      });
    }

    if (lastSentAt) {
      const secondsSinceLastSend = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSend < 60) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(60 - secondsSinceLastSend)} seconds before requesting a new OTP`
        });
      }
    }

    // Get seller phone number with extended fallbacks
    const sellerPhone = order.seller?.mobileNumber ||
                        order.seller?.phone ||
                        order.seller?.shop?.phone ||
                        order.seller?.shop?.mobile ||
                        order.seller?.shop?.mobileNumber;

    if (!sellerPhone) {
      logReturnOperation('ResendSellerDeliveryOTP', {
        error: 'Seller phone number not found',
        sellerId: order.seller?._id,
        returnId
      }, 'error');
      return res.status(400).json({
        success: false,
        message: 'Seller phone number not found. Please contact admin.'
      });
    }

    // Send OTP via MSG91
    const otpResult = await msg91Service.sendOTPForForgotPassword(sellerPhone, {
      purpose: 'return_delivery',
      orderNumber: order.orderNumber,
      userName: order.seller?.firstName || order.seller?.shop?.name || 'Seller'
    });

    if (!otpResult.success) {
      logReturnOperation('ResendSellerDeliveryOTP', {
        error: 'Failed to send OTP via MSG91',
        returnId,
        sellerPhone
      }, 'error');
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    // Update OTP metadata
    order.returnDetails.returnDelivery.sellerOtpMeta = {
      ...sellerOtpMeta,
      lastSentAt: new Date(),
      requestId: otpResult.response?.request_id || otpResult.response?.requestId || '',
      phoneNumber: sellerPhone,
      resendCount: resendCount + 1
    };

    await order.save();

    logReturnOperation('ResendSellerDeliveryOTP', {
      success: true,
      returnId,
      orderNumber: order.orderNumber,
      resendCount: resendCount + 1
    }, 'success');

    res.json({
      success: true,
      message: 'OTP resent successfully to seller',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        resendCount: resendCount + 1,
        maxResends: 3
      }
    });

  } catch (error) {
    logReturnOperation('ResendSellerDeliveryOTP', {
      error: error.message,
      returnId: req.params.returnId,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to resend seller OTP',
      error: error.message
    });
  }
};

module.exports = {
  getReturnEligibility,
  requestReturn,
  getReturnOrders,
  getSellerReturnOrders,
  assignReturnAgent,
  handleReturnAssignmentResponse,
  markReturnBuyerArrival,
  completeReturnPickup,
  markReturnSellerArrival,
  completeReturnDelivery,
  completeReturn,
  getDeliveryAgentReturns,
  getReturnStatus,
  markReturnPickupFailed,
  resendBuyerPickupOTP,
  resendSellerDeliveryOTP
};

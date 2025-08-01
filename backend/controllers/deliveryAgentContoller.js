// backend/controllers/deliveryAgentController.js - Complete Delivery Agent Management

const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const OtpVerification = require('../models/OtpVerification');
const User = require('../models/User');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const otpService = require('../services/otpService');

// Enhanced terminal logging for delivery operations
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [DELIVERY-CONTROLLER] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
  
  // Additional structured logging for production monitoring
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      timestamp,
      service: 'deliveryAgentController',
      action,
      status,
      data
    }));
  }
};

// @desc    Register new delivery agent
// @route   POST /api/delivery/register
// @access  Public
exports.registerDeliveryAgent = async (req, res) => {
  try {
    terminalLog('DELIVERY_AGENT_REGISTER_START', 'PROCESSING', {
      email: req.body.email,
      name: req.body.name,
      phoneNumber: req.body.phoneNumber ? `${req.body.phoneNumber.substring(0, 5)}***` : 'N/A'
    });

    console.log(`
🚚 ===============================
   DELIVERY AGENT REGISTRATION
===============================
👤 Name: ${req.body.name}
📧 Email: ${req.body.email}
📱 Phone: ${req.body.phoneNumber ? `${req.body.phoneNumber.substring(0, 5)}***` : 'N/A'}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      terminalLog('DELIVERY_AGENT_VALIDATION_ERROR', 'ERROR', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      name,
      email,
      password,
      phoneNumber,
      aadharNumber,
      panNumber,
      licenseNumber,
      dateOfBirth,
      address,
      vehicleDetails,
      emergencyContact,
      workingHours,
      preferredAreas
    } = req.body;

    // Check if delivery agent already exists
    const existingAgent = await DeliveryAgent.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phoneNumber }
      ]
    });

    if (existingAgent) {
      terminalLog('DELIVERY_AGENT_ALREADY_EXISTS', 'ERROR', {
        email: email.toLowerCase(),
        phoneNumber,
        existingAgentId: existingAgent._id
      });
      return res.status(400).json({
        success: false,
        message: 'Delivery agent already exists with this email or phone number'
      });
    }

    // Create new delivery agent
    const deliveryAgentData = {
      name,
      email: email.toLowerCase(),
      password,
      phoneNumber,
      aadharNumber: aadharNumber || '',
      panNumber: panNumber || '',
      licenseNumber: licenseNumber || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address: address || {
        street: '',
        city: '',
        state: '',
        pincode: '',
        coordinates: [0, 0]
      },
      vehicleDetails: vehicleDetails || {
        type: 'Motorcycle',
        model: '',
        registrationNumber: '',
        insuranceExpiry: null
      },
      emergencyContact: emergencyContact || {
        name: '',
        phoneNumber: '',
        relationship: ''
      },
      workingHours: workingHours || {
        startTime: '09:00',
        endTime: '21:00',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      },
      preferredAreas: preferredAreas || []
    };

    const deliveryAgent = new DeliveryAgent(deliveryAgentData);
    const savedAgent = await deliveryAgent.save();

    // Generate JWT token
    const token = generateToken(savedAgent._id);

    terminalLog('DELIVERY_AGENT_REGISTER_SUCCESS', 'SUCCESS', {
      agentId: savedAgent._id,
      name: savedAgent.name,
      email: savedAgent.email,
      phoneNumber: `${savedAgent.phoneNumber.substring(0, 5)}***`
    });

    console.log(`
✅ ===============================
   DELIVERY AGENT REGISTERED!
===============================
🆔 Agent ID: ${savedAgent._id}
👤 Name: ${savedAgent.name}
📧 Email: ${savedAgent.email}
📱 Phone: ${savedAgent.phoneNumber.substring(0, 5)}***
🚗 Vehicle: ${savedAgent.vehicleDetails.type}
📅 Registered: ${new Date().toLocaleString()}
===============================`);

    res.status(201).json({
      success: true,
      message: 'Delivery agent registered successfully',
      data: {
        _id: savedAgent._id,
        name: savedAgent.name,
        email: savedAgent.email,
        phoneNumber: savedAgent.phoneNumber,
        isVerified: savedAgent.isVerified,
        vehicleDetails: savedAgent.vehicleDetails,
        token
      }
    });

  } catch (error) {
    terminalLog('DELIVERY_AGENT_REGISTER_ERROR', 'ERROR', {
      error: error.message,
      stack: error.stack
    });
    
    console.log(`
❌ ===============================
   DELIVERY AGENT REGISTRATION FAILED!
===============================
🚨 Error: ${error.message}
⏱️  Time: ${new Date().toLocaleString()}
===============================`);
    
    console.error('❌ Register Delivery Agent Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Login delivery agent
// @route   POST /api/delivery/login
// @access  Public
exports.loginDeliveryAgent = async (req, res) => {
  try {
    terminalLog('DELIVERY_AGENT_LOGIN_START', 'PROCESSING', {
      email: req.body.email
    });

    console.log(`🔑 Delivery agent login attempt: ${req.body.email}`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      terminalLog('DELIVERY_AGENT_LOGIN_VALIDATION_ERROR', 'ERROR', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find delivery agent by email
    const deliveryAgent = await DeliveryAgent.findOne({ 
      email: email.toLowerCase() 
    }).select('+password');

    if (!deliveryAgent) {
      terminalLog('DELIVERY_AGENT_LOGIN_NOT_FOUND', 'ERROR', {
        email: email.toLowerCase()
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if agent is blocked
    if (deliveryAgent.isBlocked) {
      terminalLog('DELIVERY_AGENT_LOGIN_BLOCKED', 'ERROR', {
        agentId: deliveryAgent._id,
        blockReason: deliveryAgent.blockReason
      });
      return res.status(403).json({
        success: false,
        message: `Account blocked: ${deliveryAgent.blockReason}`
      });
    }

    // Check password
    const isMatch = await deliveryAgent.matchPassword(password);

    if (!isMatch) {
      terminalLog('DELIVERY_AGENT_LOGIN_INVALID_PASSWORD', 'ERROR', {
        email: email.toLowerCase(),
        agentId: deliveryAgent._id
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last active time
    deliveryAgent.lastActiveAt = new Date();
    await deliveryAgent.save();

    // Generate JWT token
    const token = generateToken(deliveryAgent._id);

    terminalLog('DELIVERY_AGENT_LOGIN_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      name: deliveryAgent.name,
      email: deliveryAgent.email,
      isOnline: deliveryAgent.isOnline,
      isAvailable: deliveryAgent.isAvailable
    });

    console.log(`✅ Delivery agent logged in: ${deliveryAgent.name} (${deliveryAgent.email})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: deliveryAgent._id,
        name: deliveryAgent.name,
        email: deliveryAgent.email,
        phoneNumber: deliveryAgent.phoneNumber,
        isOnline: deliveryAgent.isOnline,
        isAvailable: deliveryAgent.isAvailable,
        isVerified: deliveryAgent.isVerified,
        currentOrder: deliveryAgent.currentOrder,
        orderStatus: deliveryAgent.orderStatus,
        stats: deliveryAgent.stats,
        vehicleDetails: deliveryAgent.vehicleDetails,
        token
      }
    });

  } catch (error) {
    terminalLog('DELIVERY_AGENT_LOGIN_ERROR', 'ERROR', {
      error: error.message
    });
    console.error('❌ Delivery Agent Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get delivery agent profile
// @route   GET /api/delivery/profile
// @access  Private (Delivery Agent)
exports.getDeliveryAgentProfile = async (req, res) => {
  try {
    terminalLog('GET_DELIVERY_AGENT_PROFILE', 'PROCESSING', {
      agentId: req.deliveryAgent._id
    });

    const deliveryAgent = await DeliveryAgent.findById(req.deliveryAgent._id)
      .populate('currentOrder', 'orderNumber totalPrice user seller status')
      .select('-password -resetPasswordToken');

    terminalLog('GET_DELIVERY_AGENT_PROFILE_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      name: deliveryAgent.name,
      hasCurrentOrder: !!deliveryAgent.currentOrder
    });

    res.status(200).json({
      success: true,
      data: deliveryAgent
    });

  } catch (error) {
    terminalLog('GET_DELIVERY_AGENT_PROFILE_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
    });
    console.error('❌ Get Delivery Agent Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update delivery agent status (online/offline)
// @route   PUT /api/delivery/status
// @access  Private (Delivery Agent)
exports.updateDeliveryAgentStatus = async (req, res) => {
  try {
    terminalLog('UPDATE_DELIVERY_AGENT_STATUS_START', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      requestBody: req.body
    });

    const { isOnline, isAvailable, currentLocation } = req.body;

    const deliveryAgent = req.deliveryAgent;

    // Update status fields
    if (typeof isOnline === 'boolean') {
      deliveryAgent.isOnline = isOnline;
    }
    
    if (typeof isAvailable === 'boolean') {
      deliveryAgent.isAvailable = isAvailable;
    }

    // Update location if provided
    if (currentLocation && currentLocation.coordinates) {
      deliveryAgent.currentLocation = {
        type: 'Point',
        coordinates: currentLocation.coordinates,
        lastUpdated: new Date()
      };
    }

    deliveryAgent.lastActiveAt = new Date();
    await deliveryAgent.save();

    terminalLog('UPDATE_DELIVERY_AGENT_STATUS_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      isOnline: deliveryAgent.isOnline,
      isAvailable: deliveryAgent.isAvailable,
      locationUpdated: !!(currentLocation && currentLocation.coordinates)
    });

    console.log(`🔄 Delivery agent status updated: ${deliveryAgent.name} - Online: ${deliveryAgent.isOnline}, Available: ${deliveryAgent.isAvailable}`);

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: {
        isOnline: deliveryAgent.isOnline,
        isAvailable: deliveryAgent.isAvailable,
        currentLocation: deliveryAgent.currentLocation,
        lastActiveAt: deliveryAgent.lastActiveAt
      }
    });

  } catch (error) {
    terminalLog('UPDATE_DELIVERY_AGENT_STATUS_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
    });
    console.error('❌ Update Delivery Agent Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get available orders for delivery agent
// @route   GET /api/delivery/orders/available
// @access  Private (Delivery Agent)
exports.getAvailableOrders = async (req, res) => {
  try {
    terminalLog('GET_AVAILABLE_ORDERS_START', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      agentLocation: req.deliveryAgent.currentLocation.coordinates
    });

    console.log(`📦 Getting available orders for agent: ${req.deliveryAgent.name}`);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Get orders ready for assignment
    const orders = await Order.find({
      'adminApproval.status': { $in: ['approved', 'auto_approved'] },
      'deliveryAgent.status': 'unassigned',
      status: { $nin: ['Cancelled', 'Delivered'] },
      isPaid: true // Only assign paid orders
    })
    .populate('user', 'name email mobileNumber')
    .populate('seller', 'firstName shop')
    .sort({ createdAt: 1 }) // FIFO basis
    .skip(skip)
    .limit(limit);

    const totalOrders = await Order.countDocuments({
      'adminApproval.status': { $in: ['approved', 'auto_approved'] },
      'deliveryAgent.status': 'unassigned',
      status: { $nin: ['Cancelled', 'Delivered'] },
      isPaid: true
    });

    terminalLog('GET_AVAILABLE_ORDERS_SUCCESS', 'SUCCESS', {
      agentId: req.deliveryAgent._id,
      availableOrdersCount: orders.length,
      totalAvailableOrders: totalOrders,
      page
    });

    console.log(`✅ Found ${orders.length} available orders for delivery`);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: orders
    });

  } catch (error) {
    terminalLog('GET_AVAILABLE_ORDERS_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
    });
    console.error('❌ Get Available Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Accept order for delivery
// @route   PUT /api/delivery/orders/:orderId/accept
// @access  Private (Delivery Agent)
exports.acceptOrder = async (req, res) => {
  try {
    terminalLog('ACCEPT_ORDER_START', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      orderId: req.params.orderId
    });

    console.log(`🤝 Delivery agent ${req.deliveryAgent.name} accepting order: ${req.params.orderId}`);

    const { orderId } = req.params;
    const deliveryAgent = req.deliveryAgent;

    // Check if agent can accept orders
    if (!deliveryAgent.canAcceptOrder()) {
      terminalLog('ACCEPT_ORDER_AGENT_UNAVAILABLE', 'ERROR', {
        agentId: deliveryAgent._id,
        isOnline: deliveryAgent.isOnline,
        isAvailable: deliveryAgent.isAvailable,
        isBlocked: deliveryAgent.isBlocked,
        orderStatus: deliveryAgent.orderStatus,
        currentOrder: deliveryAgent.currentOrder
      });
      return res.status(400).json({
        success: false,
        message: 'Agent is not available to accept orders'
      });
    }

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName shop');

    if (!order) {
      terminalLog('ACCEPT_ORDER_NOT_FOUND', 'ERROR', { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be assigned
    if (!order.canAssignDeliveryAgent) {
      terminalLog('ACCEPT_ORDER_NOT_ASSIGNABLE', 'ERROR', {
        orderId,
        adminApprovalStatus: order.adminApproval.status,
        deliveryAgentStatus: order.deliveryAgent.status,
        orderStatus: order.status
      });
      return res.status(400).json({
        success: false,
        message: 'Order is not available for assignment'
      });
    }

    // Assign delivery agent to order
    order.deliveryAgent = {
      agent: deliveryAgent._id,
      assignedAt: new Date(),
      assignedBy: null, // Self-assigned
      status: 'accepted',
      acceptedAt: new Date()
    };

    order.status = 'Pickup_Ready';
    order._statusChangedBy = 'delivery_agent';
    order._statusChangeNotes = `Order accepted by delivery agent ${deliveryAgent.name}`;

    await order.save();

    // Update delivery agent status
    deliveryAgent.currentOrder = order._id;
    deliveryAgent.orderStatus = 'assigned';
    deliveryAgent.isAvailable = false; // Agent is now busy
    await deliveryAgent.save();

    terminalLog('ACCEPT_ORDER_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.user.name,
      totalPrice: order.totalPrice
    });

    console.log(`
✅ ===============================
   ORDER ACCEPTED BY AGENT!
===============================
🚚 Agent: ${deliveryAgent.name}
📦 Order: ${order.orderNumber}
👤 Customer: ${order.user.name}
💰 Amount: ₹${order.totalPrice}
📅 Accepted: ${new Date().toLocaleString()}
===============================`);

    // Emit real-time notifications
    if (global.emitToBuyer) {
      global.emitToBuyer(order.user._id, 'delivery-agent-assigned', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryAgent: {
          name: deliveryAgent.name,
          phoneNumber: deliveryAgent.phoneNumber,
          vehicleDetails: deliveryAgent.vehicleDetails
        }
      });
    }

    if (global.emitToSeller) {
      global.emitToSeller(order.seller._id, 'delivery-agent-assigned', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryAgent: {
          name: deliveryAgent.name,
          phoneNumber: deliveryAgent.phoneNumber
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        customer: order.user,
        seller: order.seller,
        totalPrice: order.totalPrice,
        deliveryAgent: {
          status: order.deliveryAgent.status,
          acceptedAt: order.deliveryAgent.acceptedAt
        }
      }
    });

  } catch (error) {
    terminalLog('ACCEPT_ORDER_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      orderId: req.params.orderId,
      error: error.message
    });
    console.error('❌ Accept Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Confirm order pickup from seller
// @route   PUT /api/delivery/orders/:orderId/pickup
// @access  Private (Delivery Agent)
exports.confirmPickup = async (req, res) => {
  try {
    terminalLog('CONFIRM_PICKUP_START', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      orderId: req.params.orderId,
      requestBody: req.body
    });

    console.log(`📤 Confirming pickup for order: ${req.params.orderId}`);

    const { orderId } = req.params;
    const { verificationMethod, location, notes } = req.body;
    const deliveryAgent = req.deliveryAgent;

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName shop');

    if (!order) {
      terminalLog('PICKUP_ORDER_NOT_FOUND', 'ERROR', { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if delivery agent is assigned to this order
    if (!order.deliveryAgent.agent || order.deliveryAgent.agent.toString() !== deliveryAgent._id.toString()) {
      terminalLog('PICKUP_UNAUTHORIZED_AGENT', 'ERROR', {
        orderId,
        assignedAgentId: order.deliveryAgent.agent?.toString(),
        requestingAgentId: deliveryAgent._id.toString()
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pickup this order'
      });
    }

    // Check if order is ready for pickup
    if (order.deliveryAgent.status !== 'accepted' || order.status !== 'Pickup_Ready') {
      terminalLog('PICKUP_INVALID_STATUS', 'ERROR', {
        orderId,
        deliveryAgentStatus: order.deliveryAgent.status,
        orderStatus: order.status
      });
      return res.status(400).json({
        success: false,
        message: 'Order is not ready for pickup'
      });
    }

    // Complete pickup
    const pickupData = {
      method: verificationMethod || 'order_id',
      location: location || {
        type: 'Point',
        coordinates: deliveryAgent.currentLocation.coordinates
      },
      notes: notes || 'Order picked up successfully'
    };

    await order.completePickup(pickupData);

    // Update delivery agent status
    deliveryAgent.orderStatus = 'pickup_in_progress';
    await deliveryAgent.save();

    terminalLog('CONFIRM_PICKUP_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      verificationMethod: pickupData.method
    });

    console.log(`
✅ ===============================
   ORDER PICKUP CONFIRMED!
===============================
🚚 Agent: ${deliveryAgent.name}
📦 Order: ${order.orderNumber}
👤 Customer: ${order.user.name}
🏪 Seller: ${order.seller.firstName}
📍 Method: ${pickupData.method}
📅 Picked up: ${new Date().toLocaleString()}
===============================`);

    // Emit real-time notifications
    if (global.emitToBuyer) {
      global.emitToBuyer(order.user._id, 'order-picked-up', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        pickup: order.pickup
      });
    }

    if (global.emitToSeller) {
      global.emitToSeller(order.seller._id, 'order-picked-up', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        pickup: order.pickup
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pickup confirmed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        pickup: order.pickup,
        deliveryAgent: {
          status: order.deliveryAgent.status
        }
      }
    });

  } catch (error) {
    terminalLog('CONFIRM_PICKUP_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      orderId: req.params.orderId,
      error: error.message
    });
    console.error('❌ Confirm Pickup Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Generate OTP for delivery confirmation
// @route   POST /api/delivery/orders/:orderId/generate-otp
// @access  Private (Delivery Agent)
exports.generateDeliveryOTP = async (req, res) => {
  try {
    terminalLog('GENERATE_DELIVERY_OTP_START', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      orderId: req.params.orderId
    });

    const { orderId } = req.params;
    const deliveryAgent = req.deliveryAgent;

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName shop');

    if (!order) {
      terminalLog('OTP_ORDER_NOT_FOUND', 'ERROR', { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if delivery agent is assigned to this order
    if (!order.deliveryAgent.agent || order.deliveryAgent.agent.toString() !== deliveryAgent._id.toString()) {
      terminalLog('OTP_UNAUTHORIZED_AGENT', 'ERROR', {
        orderId,
        assignedAgentId: order.deliveryAgent.agent?.toString(),
        requestingAgentId: deliveryAgent._id.toString()
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate OTP for this order'
      });
    }

    // Check if order is out for delivery
    if (order.status !== 'Out_for_Delivery') {
      terminalLog('OTP_INVALID_ORDER_STATUS', 'ERROR', {
        orderId,
        orderStatus: order.status
      });
      return res.status(400).json({
        success: false,
        message: 'Order must be out for delivery to generate OTP'
      });
    }

    // Create OTP using OTP service
    const otpResult = await otpService.createDeliveryOTP({
      orderId: order._id,
      userId: order.user._id,
      deliveryAgentId: deliveryAgent._id,
      userPhone: order.user.mobileNumber || order.shippingAddress.phone,
      purpose: 'delivery_confirmation',
      deliveryLocation: {
        type: 'Point',
        coordinates: deliveryAgent.currentLocation.coordinates,
        address: order.shippingAddress.address
      },
      notes: 'OTP for order delivery confirmation'
    });

    if (!otpResult.success) {
      terminalLog('GENERATE_DELIVERY_OTP_FAILED', 'ERROR', {
        orderId,
        error: otpResult.error
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to generate delivery OTP',
        error: otpResult.error
      });
    }

    // Update order with OTP reference
    order.otpVerification.currentOTP = otpResult.otpId;
    await order.save();

    terminalLog('GENERATE_DELIVERY_OTP_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      otpId: otpResult.otpId,
      customerPhone: order.user.mobileNumber ? `${order.user.mobileNumber.substring(0, 5)}***` : 'N/A'
    });

    console.log(`📱 OTP generated for delivery of order: ${order.orderNumber}`);

    res.status(200).json({
      success: true,
      message: 'Delivery OTP generated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        otpId: otpResult.otpId,
        expiresAt: otpResult.expiresAt,
        testMode: otpResult.testMode,
        // Only return OTP code in test mode
        otpCode: otpResult.testMode ? otpResult.otpCode : null
      }
    });

  } catch (error) {
    terminalLog('GENERATE_DELIVERY_OTP_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      orderId: req.params.orderId,
      error: error.message
    });
    console.error('❌ Generate Delivery OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Confirm delivery with OTP
// @route   PUT /api/delivery/orders/:orderId/deliver
// @access  Private (Delivery Agent)
exports.confirmDelivery = async (req, res) => {
  try {
    terminalLog('CONFIRM_DELIVERY_START', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      orderId: req.params.orderId,
      requestBody: req.body
    });

    console.log(`📦 Confirming delivery for order: ${req.params.orderId}`);

    const { orderId } = req.params;
    const { otpCode, recipientName, notes, codPayment, location } = req.body;
    const deliveryAgent = req.deliveryAgent;

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName shop');

    if (!order) {
      terminalLog('DELIVERY_ORDER_NOT_FOUND', 'ERROR', { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if delivery agent is assigned to this order
    if (!order.deliveryAgent.agent || order.deliveryAgent.agent.toString() !== deliveryAgent._id.toString()) {
      terminalLog('DELIVERY_UNAUTHORIZED_AGENT', 'ERROR', {
        orderId,
        assignedAgentId: order.deliveryAgent.agent?.toString(),
        requestingAgentId: deliveryAgent._id.toString()
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to deliver this order'
      });
    }

    // Check if order is out for delivery
    if (order.status !== 'Out_for_Delivery') {
      terminalLog('DELIVERY_INVALID_STATUS', 'ERROR', {
        orderId,
        orderStatus: order.status
      });
      return res.status(400).json({
        success: false,
        message: 'Order is not ready for delivery'
      });
    }

    // Verify OTP if required
    if (order.otpVerification.isRequired && otpCode) {
      if (!order.otpVerification.currentOTP) {
        terminalLog('DELIVERY_OTP_NOT_GENERATED', 'ERROR', {
          orderId,
          orderNumber: order.orderNumber
        });
        return res.status(400).json({
          success: false,
          message: 'OTP not generated for this order'
        });
      }

      // Verify OTP using OTP service
      const otpVerificationResult = await otpService.verifyDeliveryOTP({
        otpId: order.otpVerification.currentOTP,
        orderId: order._id,
        enteredCode: otpCode,
        verifiedBy: 'delivery_agent',
        deliveryLocation: location || {
          type: 'Point',
          coordinates: deliveryAgent.currentLocation.coordinates
        },
        paymentDetails: codPayment
      });

      if (!otpVerificationResult.success) {
        terminalLog('DELIVERY_OTP_VERIFICATION_FAILED', 'ERROR', {
          orderId,
          error: otpVerificationResult.message
        });
        return res.status(400).json({
          success: false,
          message: otpVerificationResult.message
        });
      }
    }

    // Complete delivery
    const deliveryData = {
      location: location || {
        type: 'Point',
        coordinates: deliveryAgent.currentLocation.coordinates
      },
      recipientName: recipientName || order.user.name,
      notes: notes || 'Order delivered successfully',
      codPayment: codPayment,
      deliveryAgentId: deliveryAgent._id
    };

    await order.completeDelivery(deliveryData);

    // Update delivery agent status
    deliveryAgent.currentOrder = null;
    deliveryAgent.orderStatus = 'idle';
    deliveryAgent.isAvailable = true; // Agent is now available for new orders
    
    // Update delivery stats
    await deliveryAgent.updateDeliveryStats('completed', null, order.deliveryFees.agentEarning);

    terminalLog('CONFIRM_DELIVERY_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      recipientName: deliveryData.recipientName,
      codCollected: !!(codPayment && codPayment.amount)
    });

    console.log(`
🎉 ===============================
   ORDER DELIVERED SUCCESSFULLY!
===============================
🚚 Agent: ${deliveryAgent.name}
📦 Order: ${order.orderNumber}
👤 Customer: ${order.user.name}
📋 Recipient: ${deliveryData.recipientName}
💰 COD: ${codPayment ? `₹${codPayment.amount}` : 'No'}
📅 Delivered: ${new Date().toLocaleString()}
===============================`);

    // Emit real-time notifications
    if (global.emitToBuyer) {
      global.emitToBuyer(order.user._id, 'order-delivered', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        delivery: order.delivery,
        isDelivered: order.isDelivered,
        deliveredAt: order.deliveredAt
      });
    }

    if (global.emitToSeller) {
      global.emitToSeller(order.seller._id, 'order-delivered', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        delivery: order.delivery,
        isDelivered: order.isDelivered,
        deliveredAt: order.deliveredAt
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery confirmed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        isDelivered: order.isDelivered,
        deliveredAt: order.deliveredAt,
        delivery: order.delivery,
        codPayment: order.codPayment,
        agentEarning: order.deliveryFees.agentEarning
      }
    });

  } catch (error) {
    terminalLog('CONFIRM_DELIVERY_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      orderId: req.params.orderId,
      error: error.message
    });
    console.error('❌ Confirm Delivery Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get delivery agent's order history
// @route   GET /api/delivery/orders/history
// @access  Private (Delivery Agent)
exports.getDeliveryHistory = async (req, res) => {
  try {
    terminalLog('GET_DELIVERY_HISTORY_START', 'PROCESSING', {
      agentId: req.deliveryAgent._id
    });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Get orders handled by this delivery agent
    const orders = await Order.find({
      'deliveryAgent.agent': req.deliveryAgent._id
    })
    .populate('user', 'name email mobileNumber')
    .populate('seller', 'firstName shop')
    .sort({ 'deliveryAgent.assignedAt': -1 })
    .skip(skip)
    .limit(limit);

    const totalOrders = await Order.countDocuments({
      'deliveryAgent.agent': req.deliveryAgent._id
    });

    terminalLog('GET_DELIVERY_HISTORY_SUCCESS', 'SUCCESS', {
      agentId: req.deliveryAgent._id,
      orderCount: orders.length,
      totalOrders,
      page
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: orders
    });

  } catch (error) {
    terminalLog('GET_DELIVERY_HISTORY_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
    });
    console.error('❌ Get Delivery History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get delivery agent dashboard stats
// @route   GET /api/delivery/dashboard/stats
// @access  Private (Delivery Agent)
exports.getDeliveryDashboardStats = async (req, res) => {
  try {
    terminalLog('GET_DELIVERY_DASHBOARD_STATS', 'PROCESSING', {
      agentId: req.deliveryAgent._id
    });

    const deliveryAgent = req.deliveryAgent;

    // Get today's deliveries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayDeliveries = await Order.countDocuments({
      'deliveryAgent.agent': deliveryAgent._id,
      'delivery.completedAt': { $gte: todayStart },
      'delivery.isCompleted': true
    });

    // Get this week's deliveries
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekDeliveries = await Order.countDocuments({
      'deliveryAgent.agent': deliveryAgent._id,
      'delivery.completedAt': { $gte: weekStart },
      'delivery.isCompleted': true
    });

    // Get pending orders
    const pendingOrders = await Order.countDocuments({
      'deliveryAgent.agent': deliveryAgent._id,
      'delivery.isCompleted': false,
      status: { $nin: ['Cancelled', 'Delivered'] }
    });

    // Get recent earnings (this month)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyEarnings = await Order.aggregate([
      {
        $match: {
          'deliveryAgent.agent': deliveryAgent._id,
          'delivery.completedAt': { $gte: monthStart },
          'delivery.isCompleted': true
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$deliveryFees.agentEarning' }
        }
      }
    ]);

    const stats = {
      agent: {
        name: deliveryAgent.name,
        isOnline: deliveryAgent.isOnline,
        isAvailable: deliveryAgent.isAvailable,
        currentOrder: deliveryAgent.currentOrder,
        orderStatus: deliveryAgent.orderStatus
      },
      performance: deliveryAgent.stats,
      today: {
        deliveries: todayDeliveries
      },
      week: {
        deliveries: weekDeliveries
      },
      pending: {
        orders: pendingOrders
      },
      earnings: {
        thisMonth: monthlyEarnings[0]?.totalEarnings || 0,
        total: deliveryAgent.stats.totalEarnings
      }
    };

    terminalLog('GET_DELIVERY_DASHBOARD_STATS_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      todayDeliveries,
      weekDeliveries,
      pendingOrders,
      monthlyEarnings: stats.earnings.thisMonth
    });

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    terminalLog('GET_DELIVERY_DASHBOARD_STATS_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
    });
    console.error('❌ Get Delivery Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 

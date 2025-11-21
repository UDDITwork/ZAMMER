// backend/controllers/deliveryAgentController.js - COMPREHENSIVE LOGGING DELIVERY AGENT CONTROLLER
// 🚚 ENHANCED: Comprehensive logging for all delivery operations

const mongoose = require('mongoose');
const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const OtpVerification = require('../models/OtpVerification');
const msg91Config = require('../config/msg91');
const { generateDeliveryAgentToken, verifyDeliveryAgentToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { 
  logger,
  startOperation,
  endOperation,
  logDeliveryOperation,
  logDatabaseOperation,
  logExternalAPI
} = require('../utils/logger');

// 🚚 DELIVERY AGENT LOGGING UTILITIES - FIXED
const logDelivery = (action, data, type = 'info') => {
  const timestamp = new Date().toISOString();
  const logColor = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[36m';
  const resetColor = '\x1b[0m';
  
  console.log(`${logColor}🚚 [DELIVERY-AGENT] ${timestamp} | ${action} | ${JSON.stringify(data)}${resetColor}`);
};

const logDeliveryError = (action, error, additionalData = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`\x1b[31m🚚 [DELIVERY-AGENT-ERROR] ${timestamp} | ${action} | Error: ${error.message} | Stack: ${error.stack} | Data: ${JSON.stringify(additionalData)}\x1b[0m`);
};

// 🎯 VEHICLE TYPE MAPPING UTILITY - ENHANCED
const mapVehicleType = (frontendType) => {
  const vehicleTypeMap = {
    // Frontend → Model Enum (enhanced mapping)
    'Bicycle': 'Bicycle',
    'bicycle': 'Bicycle',
    
    'Motorcycle': 'Motorcycle',
    'motorcycle': 'Motorcycle',
    
    'Scooter': 'Scooter',
    'scooter': 'Scooter',
    
    'Car': 'Car',
    'car': 'Car',
    
    'Van': 'Van',
    'van': 'Van'
  };
  
  return vehicleTypeMap[frontendType] || frontendType;
};

// @desc    Register new delivery agent
// @route   POST /api/delivery/register
// @access  Public
const registerDeliveryAgent = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logDelivery('REGISTRATION_STARTED', { 
      email: req.body.email, 
      name: req.body.name,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 🎯 ENHANCED LOGGING
    console.log(`
🚚 ===============================
   DELIVERY AGENT REGISTRATION
===============================
📧 Email: ${req.body.email}
👤 Name: ${req.body.name}
📱 Phone: ${req.body.phone}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logDeliveryError('REGISTRATION_VALIDATION_FAILED', new Error('Validation error'), { errors: errors.array() });
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // ✅ FIXED: Proper field mapping and validation
    const { 
      name, 
      email, 
      password, 
      phone,           // Frontend sends 'phone'
      address, 
      vehicleType, 
      vehicleModel, 
      vehicleRegistration, 
      licenseNumber, 
      workingAreas, 
      emergencyContact 
    } = req.body;

    // 🔍 VALIDATION: Check for existing agent
    logDelivery('CHECKING_EXISTING_AGENT', { email });
    
    const existingAgent = await DeliveryAgent.findOne({
      $or: [
        { email: email },
        { mobileNumber: phone },  // Check against mobileNumber field
        { phone: phone },         // Also check phone field for backward compatibility
        { phoneNumber: phone }    // Check phoneNumber field as well
      ]
    });

    if (existingAgent) {
      const error = new Error('Delivery agent already exists with this email or phone');
      logDeliveryError('REGISTRATION_DUPLICATE_EMAIL', error, { email, phone });
      return res.status(400).json({
        success: false,
        message: 'Agent already exists with this email or phone number',
        code: 'DUPLICATE_AGENT'
      });
    }

    // 🚗 VEHICLE TYPE MAPPING - ENHANCED
    const vehicleTypeMapping = {
      'bicycle': 'Bicycle',
      'Bicycle': 'Bicycle',
      'motorcycle': 'Motorcycle', 
      'Motorcycle': 'Motorcycle',
      'scooter': 'Scooter',
      'Scooter': 'Scooter',
      'car': 'Car',
      'Car': 'Car',
      'van': 'Van',
      'Van': 'Van'
    };

    const mappedVehicleType = vehicleTypeMapping[vehicleType] || vehicleType;
    
    logDelivery('VEHICLE_TYPE_MAPPING', { 
      original: vehicleType, 
      mapped: mappedVehicleType 
    });
    
    console.log(`🚗 Vehicle Type Mapping: "${vehicleType}" → "${mappedVehicleType}"`);

    // ✅ FIXED: Create delivery agent with proper field mapping
    logDelivery('CREATING_DELIVERY_AGENT', { 
      email, 
      name, 
      vehicleType: mappedVehicleType,
      hasEmergencyContact: !!emergencyContact
    });

    // 🎯 CRITICAL FIX: Map phone to mobileNumber for database model
    const deliveryAgentData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Will be hashed by pre-save middleware
      mobileNumber: phone,  // ✅ Map phone to mobileNumber
      phone: phone,         // Keep phone for backward compatibility  
      phoneNumber: phone,   // Also map to phoneNumber for compatibility
      address,
      vehicleDetails: {
        type: mappedVehicleType,
        model: vehicleModel,
        registrationNumber: vehicleRegistration
      },
      documents: {
        licenseNumber
      },
      workingAreas: workingAreas ? (Array.isArray(workingAreas) ? workingAreas : workingAreas.split(',').map(area => area.trim())) : [],
      emergencyContact,
      isVerified: false,
      isOnline: true,
      isAvailable: true,
      isBlocked: false,
      rating: 0,
      totalDeliveries: 0,
      totalEarnings: 0,
      currentLocation: {
        type: 'Point',
        coordinates: [0, 0] // Will be updated when agent shares location
      },
      profileCompletion: 85 // Initial completion percentage
    };

    const deliveryAgent = new DeliveryAgent(deliveryAgentData);
    
    // 💾 SAVE TO DATABASE
    await deliveryAgent.save();

    // 🔐 GENERATE JWT TOKEN - FIXED
    const token = generateDeliveryAgentToken(deliveryAgent._id);

    // 📤 SUCCESSFUL RESPONSE
    const processingTime = Date.now() - startTime;
    
    logDelivery('REGISTRATION_SUCCESS', { 
      agentId: deliveryAgent._id,
      email: deliveryAgent.email,
      processingTime: `${processingTime}ms`,
      tokenGenerated: !!token
    }, 'success');

    console.log(`
✅ ===============================
   DELIVERY AGENT REGISTERED!
===============================
🆔 Agent ID: ${deliveryAgent._id}
👤 Name: ${deliveryAgent.name}
📧 Email: ${deliveryAgent.email}
🚗 Vehicle: ${deliveryAgent.vehicleDetails.type}
📅 Registered: ${new Date().toLocaleString()}
===============================`);

    // 🔔 SEND WELCOME NOTIFICATION (if socket service available)
    try {
      if (req.io) {
        req.io.emit('deliveryAgentRegistered', {
          message: 'New delivery agent registered',
          agent: {
            id: deliveryAgent._id,
            name: deliveryAgent.name,
            email: deliveryAgent.email,
            vehicleType: deliveryAgent.vehicleDetails.type
          }
        });
      }
    } catch (socketError) {
      console.log('Socket notification failed:', socketError.message);
    }

    const responseData = {
      _id: deliveryAgent._id,
      name: deliveryAgent.name,
      email: deliveryAgent.email,
      mobileNumber: deliveryAgent.mobileNumber,
      phoneNumber: deliveryAgent.phoneNumber,
      isOnline: deliveryAgent.isOnline,
      isAvailable: deliveryAgent.isAvailable,
      vehicleDetails: deliveryAgent.vehicleDetails,
      workingAreas: deliveryAgent.workingAreas,
      isVerified: deliveryAgent.isVerified,
      rating: deliveryAgent.rating,
      totalDeliveries: deliveryAgent.totalDeliveries,
      token
    };

    res.status(201).json({
      success: true,
      message: 'Delivery agent registered successfully',
      data: responseData
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logDeliveryError('REGISTRATION_FAILED', error, { 
      body: req.body,
      processingTime: `${processingTime}ms`
    });

    console.error('❌ Delivery Agent Registration Error:', error);

    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }

    // Handle duplicate key errors (E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
        code: 'DUPLICATE_KEY'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'REGISTRATION_ERROR'
    });
  }
};

// @desc    Login delivery agent
// @route   POST /api/delivery/login
// @access  Public
const loginDeliveryAgent = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logDelivery('LOGIN_STARTED', { 
      email: req.body.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.log(`
🔐 ===============================
   DELIVERY AGENT LOGIN
===============================
📧 Email: ${req.body.email}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logDeliveryError('LOGIN_VALIDATION_FAILED', new Error('Validation error'), { errors: errors.array() });
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find delivery agent by email
    const deliveryAgent = await DeliveryAgent.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');

    if (!deliveryAgent) {
      logDeliveryError('LOGIN_AGENT_NOT_FOUND', new Error('Agent not found'), { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if agent is blocked
    if (deliveryAgent.isBlocked) {
      logDeliveryError('LOGIN_AGENT_BLOCKED', new Error('Agent blocked'), { 
        email, 
        agentId: deliveryAgent._id,
        reason: deliveryAgent.blockReason
      });
      return res.status(403).json({
        success: false,
        message: `Your account has been blocked: ${deliveryAgent.blockReason || 'Please contact support.'}`,
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // Verify password
    const isPasswordValid = await deliveryAgent.matchPassword(password);
    
    if (!isPasswordValid) {
      logDeliveryError('LOGIN_INVALID_PASSWORD', new Error('Invalid password'), { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update agent status
    deliveryAgent.isOnline = true;
    deliveryAgent.lastLoginAt = new Date();
    deliveryAgent.lastActiveAt = new Date();
    await deliveryAgent.save();

    // Generate JWT token - FIXED
    console.log('🔑 Generating JWT token for delivery agent:', deliveryAgent._id);
    const token = generateDeliveryAgentToken(deliveryAgent._id);
    console.log('✅ JWT token generated successfully');
    
    // ✅ Verify the token immediately to ensure it's valid
    const verification = verifyDeliveryAgentToken(token);
    
    if (!verification.success) {
      throw new Error(`Token verification failed: ${verification.error}`);
    }
    
    console.log('✅ Token verification successful:', { userId: verification.decoded.id });

    const processingTime = Date.now() - startTime;
    
    logDelivery('LOGIN_SUCCESS', { 
      agentId: deliveryAgent._id,
      email: deliveryAgent.email,
      processingTime: `${processingTime}ms`
    }, 'success');

    console.log(`
✅ ===============================
   DELIVERY AGENT LOGGED IN!
===============================
🆔 Agent ID: ${deliveryAgent._id}
👤 Name: ${deliveryAgent.name}
📧 Email: ${deliveryAgent.email}
🟢 Status: Online
📅 Login Time: ${new Date().toLocaleString()}
===============================`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: deliveryAgent._id,
        name: deliveryAgent.name,
        email: deliveryAgent.email,
        mobileNumber: deliveryAgent.mobileNumber,
        phoneNumber: deliveryAgent.phoneNumber,
        isOnline: deliveryAgent.isOnline,
        isAvailable: deliveryAgent.isAvailable,
        currentLocation: deliveryAgent.currentLocation,
        vehicleDetails: deliveryAgent.vehicleDetails,
        workingAreas: deliveryAgent.workingAreas,
        isVerified: deliveryAgent.isVerified,
        rating: deliveryAgent.rating,
        totalDeliveries: deliveryAgent.totalDeliveries,
        totalEarnings: deliveryAgent.totalEarnings,
        stats: deliveryAgent.stats,
        token
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logDeliveryError('LOGIN_FAILED', error, { 
      email: req.body.email,
      processingTime: `${processingTime}ms`
    });

    console.error('❌ Delivery Agent Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'LOGIN_ERROR'
    });
  }
};

// @desc    Get delivery agent profile
// @route   GET /api/delivery/profile
// @access  Private (Delivery Agent)
const getDeliveryAgentProfile = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('PROFILE_REQUEST', { agentId });

    const deliveryAgent = await DeliveryAgent.findById(agentId)
      .select('-password -resetPasswordToken');

    if (!deliveryAgent) {
      logDeliveryError('PROFILE_AGENT_NOT_FOUND', new Error('Agent not found'), { agentId });
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    logDelivery('PROFILE_RETRIEVED', { agentId, email: deliveryAgent.email });

    res.status(200).json({
      success: true,
      data: deliveryAgent
    });
  } catch (error) {
    logDeliveryError('PROFILE_RETRIEVAL_FAILED', error, { agentId: req.deliveryAgent?.id });
    console.error('❌ Get Delivery Agent Profile Error:', error);
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
const getAvailableOrders = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('AVAILABLE_ORDERS_REQUEST', { agentId });

    console.log(`
📦 ===============================
   FETCHING AVAILABLE ORDERS
===============================
🚚 Agent: ${req.deliveryAgent.name}
📍 Location: ${req.deliveryAgent.currentLocation?.coordinates || 'Not set'}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // 🔧 FIXED: Find orders that are assigned to this delivery agent and ready for pickup
    const orders = await Order.find({
      'adminApproval.status': 'approved',
      'deliveryAgent.agent': agentId,
      'deliveryAgent.status': 'assigned',
      status: 'Pickup_Ready'
    })
    .populate('user', 'name mobileNumber')
    .populate('seller', 'firstName shop')
    .populate('orderItems.product', 'name images')
    .sort({ 'deliveryAgent.assignedAt': 1 }) // FIFO basis by assignment time
    .limit(20);

    logDelivery('AVAILABLE_ORDERS_RETRIEVED', { 
      agentId, 
      orderCount: orders.length 
    });

    console.log(`
✅ ===============================
   AVAILABLE ORDERS FETCHED
===============================
📦 Orders Found: ${orders.length}
🚚 Agent: ${req.deliveryAgent.name}
📅 Time: ${new Date().toLocaleString()}
===============================`);

    // Format orders for delivery agent (show order number after assignment)
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber, // Now visible since order is assigned
      status: order.status,
      totalPrice: order.totalPrice,
      deliveryFees: order.deliveryFees,
      orderItems: order.orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        image: item.image
      })),
      user: {
        name: order.user.name,
        mobileNumber: order.user.mobileNumber
      },
      seller: {
        name: order.seller.firstName,
        shopName: order.seller.shop?.name,
        address: order.seller.shop?.address
      },
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      assignedAt: order.deliveryAgent.assignedAt,
      estimatedDelivery: order.estimatedDelivery?.estimatedAt
    }));

    res.status(200).json({
      success: true,
      count: formattedOrders.length,
      data: formattedOrders
    });
  } catch (error) {
    logDeliveryError('AVAILABLE_ORDERS_FAILED', error, { agentId: req.deliveryAgent?.id });
    console.error('❌ Get Available Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Accept order for delivery
// @route   PUT /api/delivery/orders/:id/accept
// @access  Private (Delivery Agent)
const acceptOrder = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;

    logDelivery('ORDER_ACCEPT_STARTED', { 
      agentId, 
      orderId 
    });

    console.log(`
📦 ===============================
   ACCEPTING ORDER
===============================
📋 Order ID: ${req.params.id}
🚚 Agent: ${req.deliveryAgent.name}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber')
      .populate('seller', 'firstName shop');

    if (!order) {
      logDeliveryError('ACCEPT_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // 🔧 FIXED: Enhanced order availability validation
    console.log('🔍 Order validation details:', {
      orderId: order._id,
      orderStatus: order.status,
      adminApprovalStatus: order.adminApproval?.status,
      deliveryAgentStatus: order.deliveryAgent?.status,
      assignedAgent: order.deliveryAgent?.agent
    });

    // Check if order is in correct state for acceptance
    if (order.status !== 'Pickup_Ready') {
      logDeliveryError('ORDER_STATUS_INVALID', new Error('Order status is not Pickup_Ready'), { 
        orderId, 
        currentStatus: order.status,
        expectedStatus: 'Pickup_Ready'
      });
      return res.status(400).json({
        success: false,
        message: `Order is not ready for pickup. Current status: ${order.status}. Expected: Pickup_Ready`
      });
    }

    // Check if order is approved by admin
    if (order.adminApproval?.status !== 'approved') {
      logDeliveryError('ORDER_NOT_APPROVED', new Error('Order not approved by admin'), { 
        orderId, 
        adminApprovalStatus: order.adminApproval?.status
      });
      return res.status(400).json({
        success: false,
        message: 'Order has not been approved by admin yet'
      });
    }

    // Check if order is assigned to this delivery agent
    // 🔧 CRITICAL FIX: Convert both to strings for comparison
    const assignedAgentId = order.deliveryAgent?.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (!order.deliveryAgent?.agent || assignedAgentId !== currentAgentId) {
      logDeliveryError('ORDER_NOT_ASSIGNED_TO_AGENT', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: assignedAgentId,
        currentAgent: currentAgentId,
        comparison: {
          assigned: assignedAgentId,
          current: currentAgentId,
          equal: assignedAgentId === currentAgentId
        }
      });
      return res.status(400).json({
        success: false,
        message: 'Order is not assigned to you'
      });
    }

    // Check if order is already accepted
    if (order.deliveryAgent.status === 'accepted') {
      logDeliveryError('ORDER_ALREADY_ACCEPTED', new Error('Order already accepted'), { 
        orderId, 
        currentStatus: order.deliveryAgent.status
      });
      return res.status(400).json({
        success: false,
        message: 'Order is already accepted'
      });
    }

    // 🔧 FIXED: Use the Order model's handleDeliveryAgentResponse method
    try {
      await order.handleDeliveryAgentResponse('accepted');
    } catch (responseError) {
      logDeliveryError('DELIVERY_AGENT_RESPONSE_ERROR', responseError, { orderId, response: 'accepted' });
      return res.status(500).json({
        success: false,
        message: 'Failed to process order acceptance'
      });
    }

    // Update delivery agent status and assignedOrders array
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    if (deliveryAgent) {
      // Update stats
      deliveryAgent.stats.acceptedOrders += 1;
      deliveryAgent.stats.assignedOrders -= 1;
      
      // 🔧 CRITICAL FIX: Update the assignedOrders array to reflect accepted status
      const assignedOrderIndex = deliveryAgent.assignedOrders.findIndex(
        assignedOrder => assignedOrder.order.toString() === orderId
      );
      
      if (assignedOrderIndex !== -1) {
        deliveryAgent.assignedOrders[assignedOrderIndex].status = 'accepted';
        deliveryAgent.assignedOrders[assignedOrderIndex].acceptedAt = new Date();
      }
      
      await deliveryAgent.save();
    }

    logDelivery('ORDER_ACCEPT_SUCCESS', { 
      agentId, 
      orderId,
      processingTime: `${Date.now() - startTime}ms`
    }, 'success');

    console.log(`
✅ ===============================
   ORDER ACCEPTED!
===============================
📦 Order: ${order.orderNumber}
🚚 Agent: ${req.deliveryAgent.name}
🏪 Seller: ${order.seller.firstName}
👤 Customer: ${order.user.name}
📅 Time: ${new Date().toLocaleString()}
===============================`);

    // Emit real-time notifications
    // 🎯 UPDATED: Emit order-accepted-by-agent to buyer for consistency
    if (global.emitToBuyer) {
      global.emitToBuyer(order.user._id, 'order-accepted-by-agent', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryStatus: order.deliveryAgent.status,
        deliveryAgent: {
          name: req.deliveryAgent.name,
          phone: req.deliveryAgent.phoneNumber,
          vehicleType: req.deliveryAgent.vehicleDetails?.type
        },
        acceptedAt: order.deliveryAgent.acceptedAt,
        message: `Order ${order.orderNumber} has been accepted by delivery agent ${req.deliveryAgent.name}`
      });
      
      // Also emit order-agent-assigned for backward compatibility
      global.emitToBuyer(order.user._id, 'order-agent-assigned', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryAgent: {
          name: req.deliveryAgent.name,
          phone: req.deliveryAgent.phoneNumber
        }
      });
    }

    if (global.emitToSeller) {
      global.emitToSeller(order.seller._id, 'order-agent-assigned', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryAgent: {
          name: req.deliveryAgent.name,
          phone: req.deliveryAgent.phoneNumber
        }
      });
    }

    // 🎯 NEW: Instant admin notification when order is accepted
    if (global.emitToAdmin) {
      global.emitToAdmin('order-accepted-by-agent', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryAgent: {
          name: req.deliveryAgent.name,
          phone: req.deliveryAgent.phoneNumber,
          vehicleType: req.deliveryAgent.vehicleDetails?.type
        },
        customer: {
          name: order.user.name,
          mobileNumber: order.user.mobileNumber
        },
        seller: {
          name: order.seller.firstName,
          shopName: order.seller.shop?.name
        },
        acceptedAt: order.deliveryAgent.acceptedAt,
        message: `Order ${order.orderNumber} has been accepted by delivery agent ${req.deliveryAgent.name}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryAgent: {
          _id: req.deliveryAgent._id || req.deliveryAgent.id,
          name: req.deliveryAgent.name,
          phone: req.deliveryAgent.phoneNumber
        },
        acceptedAt: order.deliveryAgent.acceptedAt
      }
    });

  } catch (error) {
    logDeliveryError('ACCEPT_ORDER_ERROR', error, { 
      agentId: req.deliveryAgent?.id, 
      orderId: req.params.id 
    });
    
    console.error('❌ Accept Order Error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to accept order'
    });
  }
};

// @desc    Update delivery agent location
// @route   PUT /api/delivery/location
// @access  Private (Delivery Agent)
const updateLocation = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const { latitude, longitude } = req.body;

    logDelivery('UPDATE_LOCATION_STARTED', { agentId, latitude, longitude });

    if (!latitude || !longitude) {
      logDeliveryError('UPDATE_LOCATION_MISSING_COORDINATES', new Error('Latitude and longitude are required'), { agentId, latitude: !!latitude, longitude: !!longitude });
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const deliveryAgent = await DeliveryAgent.findById(agentId);
    deliveryAgent.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    deliveryAgent.lastActiveAt = new Date();

    await deliveryAgent.save();

    logDelivery('UPDATE_LOCATION_SUCCESS', { agentId, coordinates: [longitude, latitude] }, 'success');

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        currentLocation: deliveryAgent.currentLocation
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryError('UPDATE_LOCATION_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      processingTime: `${processingTime}ms`
    });
    console.error('❌ Update Location Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Toggle delivery agent availability
// @route   PUT /api/delivery/availability
// @access  Private (Delivery Agent)
const toggleAvailability = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('TOGGLE_AVAILABILITY_STARTED', { agentId, currentStatus: req.deliveryAgent.isAvailable });

    const deliveryAgent = await DeliveryAgent.findById(agentId);
    deliveryAgent.isAvailable = !deliveryAgent.isAvailable;
    deliveryAgent.lastActiveAt = new Date();

    // If going offline, also set isOnline to false
    if (!deliveryAgent.isAvailable) {
      deliveryAgent.isOnline = false;
    } else {
      deliveryAgent.isOnline = true;
    }

    await deliveryAgent.save();

    logDelivery('TOGGLE_AVAILABILITY_SUCCESS', { agentId, newStatus: deliveryAgent.isAvailable, isOnline: deliveryAgent.isOnline }, 'success');

    console.log(`
🔄 ===============================
   AVAILABILITY UPDATED
===============================
🚚 Agent: ${deliveryAgent.name}
📱 Available: ${deliveryAgent.isAvailable ? 'YES' : 'NO'}
🟢 Online: ${deliveryAgent.isOnline ? 'YES' : 'NO'}
📅 Time: ${new Date().toLocaleString()}
===============================`);

    res.status(200).json({
      success: true,
      message: `Agent is now ${deliveryAgent.isAvailable ? 'available' : 'unavailable'}`,
      data: {
        isAvailable: deliveryAgent.isAvailable,
        isOnline: deliveryAgent.isOnline
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryError('TOGGLE_AVAILABILITY_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      processingTime: `${processingTime}ms`
    });
    console.error('❌ Toggle Availability Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Logout delivery agent
// @route   POST /api/delivery/logout
// @access  Private (Delivery Agent)
const logoutDeliveryAgent = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('DELIVERY_AGENT_LOGOUT_STARTED', { agentId });

    // Update agent status to offline
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    deliveryAgent.isOnline = false;
    deliveryAgent.isAvailable = false;
    deliveryAgent.lastActiveAt = new Date();
    await deliveryAgent.save();

    logDelivery('DELIVERY_AGENT_LOGOUT_SUCCESS', { agentId, agentName: req.deliveryAgent.name }, 'success');

    console.log(`
🚪 ===============================
   DELIVERY AGENT LOGGED OUT
===============================
🚚 Agent: ${req.deliveryAgent.name}
📴 Status: Offline
📅 Time: ${new Date().toLocaleString()}
===============================`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryError('DELIVERY_AGENT_LOGOUT_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      processingTime: `${processingTime}ms`
    });
    console.error('❌ Delivery Agent Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Placeholder functions for other endpoints - ENHANCED
// @desc    Update delivery agent profile
// @route   PUT /api/delivery/profile
// @access  Private (Delivery Agent)
const updateDeliveryAgentProfile = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('PROFILE_UPDATE_STARTED', { agentId });
    
    console.log(`
✏️ ===============================
   UPDATING DELIVERY AGENT PROFILE
===============================
🚚 Agent: ${req.deliveryAgent.name}
🆔 Agent ID: ${agentId}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logDeliveryError('PROFILE_UPDATE_VALIDATION_FAILED', new Error('Validation error'), { errors: errors.array() });
      return res.status(400).json({ 
      success: false, 
        errors: errors.array() 
      });
    }

    // 🎯 ALLOWED FIELDS: Only allow updating specific profile fields
    const allowedUpdates = {};
    const updateFields = [
      'name', 'address', 'vehicleDetails', 'workingAreas', 
      'emergencyContact', 'profileImage', 'isAvailable'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'vehicleDetails') {
          // Handle vehicle details update with validation
          if (req.body.vehicleDetails?.type) {
            const mappedVehicleType = mapVehicleType(req.body.vehicleDetails.type);
            allowedUpdates['vehicleDetails.type'] = mappedVehicleType;
            console.log(`🚗 Vehicle Type Update: "${req.body.vehicleDetails.type}" → "${mappedVehicleType}"`);
          }
          if (req.body.vehicleDetails?.model) {
            allowedUpdates['vehicleDetails.model'] = req.body.vehicleDetails.model;
          }
          if (req.body.vehicleDetails?.registrationNumber) {
            allowedUpdates['vehicleDetails.registrationNumber'] = req.body.vehicleDetails.registrationNumber;
          }
        } else if (field === 'workingAreas') {
          // Handle working areas array
          allowedUpdates[field] = Array.isArray(req.body[field]) ? 
            req.body[field] : req.body[field].split(',').map(area => area.trim());
        } else if (field === 'emergencyContact') {
          // Handle emergency contact object
          if (req.body.emergencyContact?.name && req.body.emergencyContact?.phone) {
            allowedUpdates[field] = req.body.emergencyContact;
          }
        } else {
          allowedUpdates[field] = req.body[field];
        }
      }
    });

    // 🎯 VALIDATION: Check if there are any updates to make
    if (Object.keys(allowedUpdates).length === 0) {
      logDeliveryError('PROFILE_UPDATE_NO_CHANGES', new Error('No valid fields to update'), { agentId });
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
        code: 'NO_CHANGES'
      });
    }

    // 🎯 UPDATE PROFILE: Apply changes to delivery agent
    const updatedAgent = await DeliveryAgent.findByIdAndUpdate(
      agentId,
      { 
        ...allowedUpdates,
        lastUpdatedAt: new Date()
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-password -resetPasswordToken');

    if (!updatedAgent) {
      logDeliveryError('PROFILE_UPDATE_AGENT_NOT_FOUND', new Error('Agent not found'), { agentId });
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // 🎯 CALCULATE PROFILE COMPLETION: Update completion percentage
    let completionScore = 0;
    if (updatedAgent.name) completionScore += 15;
    if (updatedAgent.email) completionScore += 15;
    if (updatedAgent.mobileNumber) completionScore += 15;
    if (updatedAgent.address) completionScore += 10;
    if (updatedAgent.vehicleDetails?.type) completionScore += 15;
    if (updatedAgent.vehicleDetails?.model) completionScore += 5;
    if (updatedAgent.vehicleDetails?.registrationNumber) completionScore += 5;
    if (updatedAgent.workingAreas?.length > 0) completionScore += 10;

    // Update profile completion
    await DeliveryAgent.findByIdAndUpdate(agentId, {
      profileCompletion: Math.min(completionScore, 100)
    });

    const processingTime = Date.now() - startTime;
    
    logDelivery('PROFILE_UPDATE_SUCCESS', { 
      agentId, 
      updatedFields: Object.keys(allowedUpdates),
      profileCompletion: completionScore,
      processingTime: `${processingTime}ms`
    }, 'success');

    console.log(`
✅ ===============================
   PROFILE UPDATED SUCCESSFULLY!
===============================
🚚 Agent: ${updatedAgent.name}
📊 Profile Completion: ${completionScore}%
📝 Updated Fields: ${Object.keys(allowedUpdates).join(', ')}
📅 Updated: ${new Date().toLocaleString()}
===============================`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...updatedAgent.toObject(),
        profileCompletion: completionScore
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logDeliveryError('PROFILE_UPDATE_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      processingTime: `${processingTime}ms`
    });

    console.error('❌ Update Profile Error:', error);

    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
};

// @desc    Mark delivery agent as reached seller location
// @route   PUT /api/delivery/orders/:id/reached-seller-location
// @access  Private (Delivery Agent)
const markReachedSellerLocation = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('MARK_REACHED_SELLER_LOCATION_STARTED', { agentId, orderId });
    
    console.log(`
📍 ===============================
   REACHED SELLER LOCATION
===============================
📋 Order ID: ${orderId}
🚚 Agent: ${req.deliveryAgent.name}
🕐 Time: ${new Date().toLocaleString()}
==============================`);

    // 🎯 VALIDATION: Check if order exists and is assigned to this agent
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      logDeliveryError('REACHED_SELLER_LOCATION_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
        success: false, 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 🎯 AUTHORIZATION: Verify order is assigned to this agent
    const assignedAgentId = order.deliveryAgent.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      logDeliveryError('REACHED_SELLER_LOCATION_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: assignedAgentId, 
        currentAgent: currentAgentId
      });
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you',
        code: 'UNAUTHORIZED_ORDER'
      });
    }

    // 🎯 STATUS VALIDATION: Check if agent can mark seller location as reached
    if (order.deliveryAgent.status !== 'accepted') {
      logDeliveryError('REACHED_SELLER_LOCATION_STATUS_INVALID', new Error('Order must be accepted first'), { 
        orderId, 
        currentStatus: order.deliveryAgent.status 
      });
      return res.status(400).json({
        success: false,
        message: 'Order must be accepted before reaching seller location',
        code: 'ORDER_NOT_ACCEPTED'
      });
    }

    if (order.pickup?.sellerLocationReachedAt) {
      logDeliveryError('REACHED_SELLER_LOCATION_ALREADY_REACHED', new Error('Seller location already marked as reached'), { orderId });
      return res.status(400).json({
        success: false,
        message: 'Seller location has already been marked as reached for this order',
        code: 'SELLER_LOCATION_ALREADY_REACHED'
      });
    }

    // 🎯 BUSINESS LOGIC: Update order with seller location reached timestamp
    const reachedTime = new Date();
    
    // Initialize pickup object if it doesn't exist
    if (!order.pickup) {
      order.pickup = {};
    }
    
    // Update seller location reached timestamp
    order.pickup.sellerLocationReachedAt = reachedTime;

    // Save order
    await order.save();

    logDelivery('MARK_REACHED_SELLER_LOCATION_SUCCESS', { 
      agentId, 
      orderId,
      reachedTime,
      processingTime: `${Date.now() - startTime}ms`
    }, 'success');

    console.log(`
✅ ===============================
   SELLER LOCATION REACHED!
===============================
📦 Order: ${order.orderNumber}
🚚 Agent: ${req.deliveryAgent.name}
🏪 Seller: ${order.seller.firstName}
👤 Customer: ${order.user.name}
📅 Time: ${reachedTime.toLocaleString()}
===============================`);

    // 🎯 EMIT SOCKET EVENTS for real-time updates
    try {
      // Notify admin about seller location reached
      if (global.emitToAdmin) {
        global.emitToAdmin('seller-location-reached', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryStatus: order.deliveryAgent.status,
          reachedTime: reachedTime,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber,
            vehicleType: req.deliveryAgent.vehicleDetails?.type
          },
          customer: {
            name: order.user.name,
            mobileNumber: order.user.mobileNumber
          },
          seller: {
            name: order.seller.firstName,
            shopName: order.seller.shop?.name
          }
        });
      }

      // Notify buyer about order status update (agent reached seller)
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'order-status-update', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryStatus: order.deliveryAgent.status,
          reachedSellerTime: reachedTime,
          message: 'Delivery agent has reached seller location',
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          }
        });
      }

    } catch (socketError) {
      console.error('❌ Socket notification failed:', socketError.message);
      logDeliveryError('REACHED_SELLER_LOCATION_SOCKET_ERROR', socketError, { orderId });
    }

    // 📤 SUCCESS RESPONSE
    res.status(200).json({
      success: true,
      message: 'Seller location marked as reached successfully',
      data: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryStatus: order.deliveryAgent.status,
        sellerLocationReachedAt: reachedTime,
        nextStep: 'Please complete pickup by entering order ID from seller'
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logDeliveryError('MARK_REACHED_SELLER_LOCATION_FAILED', error, { 
      agentId: req.deliveryAgent?.id, 
      orderId: req.params.id, 
      processingTime: `${processingTime}ms`
    });

    console.error('❌ Mark Reached Seller Location Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to mark seller location as reached',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'REACHED_SELLER_LOCATION_ERROR'
    });
  }
};

// @desc    Complete order pickup from seller
// @route   PUT /api/delivery/orders/:id/pickup
// @access  Private (Delivery Agent)
const completePickup = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('COMPLETE_PICKUP_STARTED', { agentId, orderId });
    
    console.log(`
📦 ===============================
   COMPLETING ORDER PICKUP
===============================
📋 Order ID: ${orderId}
🚚 Agent: ${req.deliveryAgent.name}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // 🎯 VALIDATION: Check if order exists and is assigned to this agent
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      logDeliveryError('PICKUP_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
      success: false, 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 🎯 AUTHORIZATION: Verify order is assigned to this agent
    // 🔧 CRITICAL FIX: Convert both to strings for comparison
    const assignedAgentId = order.deliveryAgent.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    console.log('🔧 DEBUG: Authorization check:', {
      orderId,
      assignedAgentId,
      currentAgentId,
      areEqual: assignedAgentId === currentAgentId,
      assignedAgentType: typeof order.deliveryAgent.agent,
      currentAgentType: typeof agentId
    });
    
    if (assignedAgentId !== currentAgentId) {
      logDeliveryError('PICKUP_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: assignedAgentId, 
        currentAgent: currentAgentId,
        comparison: {
          assigned: assignedAgentId,
          current: currentAgentId,
          equal: assignedAgentId === currentAgentId
        }
      });
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you',
        code: 'UNAUTHORIZED_ORDER',
        debug: {
          assignedAgent: assignedAgentId,
          currentAgent: currentAgentId
        }
      });
    }

    // 🎯 STATUS VALIDATION: Check if pickup can be completed
    if (order.deliveryAgent.status === 'delivery_completed') {
      logDeliveryError('PICKUP_ALREADY_DELIVERED', new Error('Order already delivered'), { orderId });
      return res.status(400).json({
        success: false,
        message: 'Order has already been delivered',
        code: 'ORDER_ALREADY_DELIVERED'
      });
    }

    if (order.deliveryAgent.status === 'pickup_completed') {
      logDeliveryError('PICKUP_ALREADY_COMPLETED', new Error('Pickup already completed'), { orderId });
      return res.status(400).json({
        success: false,
        message: 'Pickup has already been completed for this order',
        code: 'PICKUP_ALREADY_COMPLETED'
      });
    }

    // 🎯 ORDER ID VERIFICATION: Verify order ID provided by seller
    const { orderIdVerification } = req.body;
    
    if (!orderIdVerification) {
      logDeliveryError('PICKUP_MISSING_ORDER_ID', new Error('Order ID verification missing'), { orderId });
      return res.status(400).json({
        success: false,
        message: 'Order ID verification is required for pickup',
        code: 'MISSING_ORDER_ID_VERIFICATION'
      });
    }

    // Verify order ID matches the actual order number
    if (orderIdVerification.trim() !== order.orderNumber) {
      logDeliveryError('PICKUP_ORDER_ID_MISMATCH', new Error('Order ID verification failed'), { 
        orderId, 
        providedId: orderIdVerification.trim(), 
        actualOrderNumber: order.orderNumber 
      });
      return res.status(400).json({
        success: false,
        message: 'Order ID verification failed. Please check with seller and try again.',
        code: 'ORDER_ID_MISMATCH',
        details: {
          provided: orderIdVerification.trim(),
          expected: order.orderNumber
        }
      });
    }

    // 🎯 BUSINESS LOGIC: Update order status and pickup details
    const pickupNotes = req.body.pickupNotes || '';
    const pickupTime = new Date();

    // Update order delivery status
    order.deliveryAgent.status = 'pickup_completed';
    order.deliveryAgent.pickupCompletedAt = pickupTime;
    
    // Update pickup details
    if (!order.pickup) order.pickup = {};
    order.pickup.isCompleted = true;
    order.pickup.completedAt = pickupTime;
    order.pickup.pickupNotes = pickupNotes;
    order.pickup.completedBy = agentId;

    // Update order status to "Out for Delivery"
    if (order.status === 'Confirmed' || order.status === 'Processing') {
      order.status = 'Out for Delivery';
    }

    // Update order timeline
    if (!order.orderTimeline) order.orderTimeline = [];
    order.orderTimeline.push({
      status: 'pickup_completed',
      timestamp: pickupTime,
      description: 'Order picked up by delivery agent',
      agentId: agentId,
      notes: pickupNotes
    });

    await order.save();

    // 🎯 UPDATE DELIVERY AGENT: Update agent statistics
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    if (deliveryAgent) {
      deliveryAgent.stats.pickupsCompleted = (deliveryAgent.stats.pickupsCompleted || 0) + 1;
      deliveryAgent.lastActiveAt = new Date();
      await deliveryAgent.save();
    }

    const processingTime = Date.now() - startTime;
    
    logDelivery('PICKUP_COMPLETE_SUCCESS', { 
      agentId, 
      orderId,
      pickupTime: pickupTime.toISOString(),
      processingTime: `${processingTime}ms`
    }, 'success');

    console.log(`
✅ ===============================
   PICKUP COMPLETED SUCCESSFULLY!
===============================
📦 Order: ${order.orderNumber}
🚚 Agent: ${req.deliveryAgent.name}
🏪 Seller: ${order.seller.firstName}
👤 Customer: ${order.user.name}
📅 Pickup Time: ${pickupTime.toLocaleString()}
📝 Notes: ${pickupNotes || 'None'}
===============================`);

    // 🔔 EMIT REAL-TIME NOTIFICATIONS
    try {
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'order-pickup-completed', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          pickupTime: pickupTime,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          }
        });
      }

      if (global.emitToSeller) {
        // 🎯 MAP STATUS FOR SELLER: Transform backend status to seller-friendly status
        const { mapStatusForSeller } = require('../utils/orderUtils');
        const sellerStatus = mapStatusForSeller(order.status);
        
        global.emitToSeller(order.seller._id, 'order-pickup-completed', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: sellerStatus, // Use mapped status for seller
          pickupTime: pickupTime,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          }
        });
      }

      // 🎯 NEW: Instant admin notification when pickup is completed
      if (global.emitToAdmin) {
        global.emitToAdmin('order-pickup-completed', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          pickupTime: pickupTime,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber,
            vehicleType: req.deliveryAgent.vehicleDetails?.type
          },
          customer: {
            name: order.user.name,
            mobileNumber: order.user.mobileNumber
          },
          seller: {
            name: order.seller.firstName,
            shopName: order.seller.shop?.name,
            address: order.seller.shop?.address
          },
          pickupNotes: pickupNotes,
          message: `Order ${order.orderNumber} pickup completed by delivery agent ${req.deliveryAgent.name} at seller location`
        });
      }
    } catch (socketError) {
      console.log('Socket notification failed:', socketError.message);
    }

    // 📤 SUCCESS RESPONSE
    res.status(200).json({
      success: true,
      message: 'Order pickup completed successfully',
      data: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryStatus: order.deliveryAgent.status,
        pickup: {
          isCompleted: order.pickup.isCompleted,
          completedAt: order.pickup.completedAt,
          notes: order.pickup.pickupNotes
        },
        estimatedDelivery: order.estimatedDelivery?.estimatedAt,
        nextStep: 'Proceed to customer for delivery'
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logDeliveryError('PICKUP_COMPLETE_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      orderId: req.params.id,
      processingTime: `${processingTime}ms`
    });

    console.error('❌ Complete Pickup Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to complete pickup',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'PICKUP_COMPLETE_ERROR'
    });
  }
};

// @desc    Mark delivery agent as reached customer location
// @route   PUT /api/delivery/orders/:id/reached-location
// @access  Private (Delivery Agent)
const markReachedLocation = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('MARK_REACHED_LOCATION_STARTED', { agentId, orderId });
    
    console.log(`
📍 ===============================
   REACHED CUSTOMER LOCATION
===============================
📋 Order ID: ${orderId}
🚚 Agent: ${req.deliveryAgent.name}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // 🎯 VALIDATION: Check if order exists and is assigned to this agent
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      logDeliveryError('REACHED_LOCATION_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
        success: false, 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 🎯 AUTHORIZATION: Verify order is assigned to this agent
    // 🔧 CRITICAL FIX: Convert both to strings for comparison
    const assignedAgentId = order.deliveryAgent.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      logDeliveryError('REACHED_LOCATION_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: assignedAgentId, 
        currentAgent: currentAgentId,
        comparison: {
          assigned: assignedAgentId,
          current: currentAgentId,
          equal: assignedAgentId === currentAgentId
        }
      });
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you',
        code: 'UNAUTHORIZED_ORDER'
      });
    }

    // 🎯 STATUS VALIDATION + IDEMPOTENCY HANDLING
    if (order.deliveryAgent.status === 'location_reached') {
      logDelivery('REACHED_LOCATION_ALREADY_MARKED', { orderId });

      let paymentData = {};
      const reachedTime = order.delivery?.locationReachedAt || order.deliveryAgent.locationReachedAt || new Date();

      if (order.paymentMethod === 'COD') {
        const codQR = order.paymentDetails?.codQR;
        paymentData = {
          type: 'COD',
          qrCode: codQR?.qrCode || codQR?.qrData?.qrCode,
          qrData: codQR?.qrData || null,
          amount: order.paymentDetails?.amount || order.totalAmount,
          paymentId: codQR?.paymentId
        };
      } else {
        try {
          const msg91Service = require('../services/msg91Service');
          const otpData = await msg91Service.createDeliveryOTP({
            orderId: order._id,
            userId: order.user._id,
            deliveryAgentId: agentId,
            userPhone: order.user.mobileNumber,
            purpose: 'delivery_confirmation',
            deliveryLocation: {
              type: 'Point',
              coordinates: [0, 0]
            },
            notes: req.body.locationNotes || 'OTP resend requested',
            orderNumber: order.orderNumber,
            userName: order.user.name
          });

          if (otpData?.success) {
            paymentData = {
              type: 'PREPAID',
              otp: otpData.otpCode,
              otpId: otpData.otpId,
              expiresAt: otpData.expiresAt,
              phoneNumber: order.user.mobileNumber
            };

            order.otpVerification = {
              isRequired: true,
              otpId: otpData.otpId,
              generatedAt: new Date(),
              expiresAt: otpData.expiresAt,
              isVerified: false
            };
            await order.save();
          } else {
            paymentData = {
              type: 'PREPAID',
              error: otpData?.error || 'OTP generation failed',
              phoneNumber: order.user.mobileNumber
            };
          }
        } catch (otpError) {
          logDeliveryError('REACHED_LOCATION_RESEND_OTP_FAILED', otpError, { orderId });
          paymentData = {
            type: 'PREPAID',
            error: otpError.message,
            phoneNumber: order.user.mobileNumber
          };
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Location was already marked as reached',
        data: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryStatus: order.deliveryAgent.status,
          reachedTime,
          paymentData,
          nextStep: order.paymentMethod === 'COD'
            ? 'Wait for customer to scan QR code and make payment'
            : 'Wait for customer to provide OTP for delivery verification'
        }
      });
    }

    if (order.deliveryAgent.status !== 'pickup_completed') {
      logDeliveryError('REACHED_LOCATION_PICKUP_NOT_COMPLETED', new Error('Pickup not completed yet'), { 
        orderId, 
        currentStatus: order.deliveryAgent.status 
      });
      return res.status(400).json({
        success: false,
        message: 'Order pickup must be completed before reaching location',
        code: 'PICKUP_NOT_COMPLETED'
      });
    }

    // 🎯 BUSINESS LOGIC: Update order status and generate required data
    const reachedTime = new Date();
    const locationNotes = req.body.locationNotes || '';

    // Update order delivery status
    order.deliveryAgent.status = 'location_reached';
    order.deliveryAgent.locationReachedAt = reachedTime;

    // Update delivery details
    if (!order.delivery) order.delivery = {};
    order.delivery.locationReachedAt = reachedTime;
    order.delivery.locationNotes = locationNotes;

    // Update order timeline
    if (!order.orderTimeline) order.orderTimeline = [];
    order.orderTimeline.push({
      status: 'location_reached',
      timestamp: reachedTime,
      description: 'Delivery agent reached customer location',
      agentId: agentId,
      notes: locationNotes
    });

    // 🎯 GENERATE PAYMENT DATA BASED ON ORDER TYPE
    let paymentData = {};
    
    if (order.paymentMethod === 'COD') {
      // Generate SMEPay QR code for COD orders
      try {
        const smepayService = require('../services/smepayService');
        const qrData = await smepayService.generateDynamicQR({
          amount: order.totalAmount,
          orderId: order.orderNumber,
          description: `Payment for Order #${order.orderNumber}`
        });
        
        paymentData = {
          type: 'COD',
          qrCode: qrData.qrCode,
          qrData: qrData.qrData,
          amount: order.totalAmount,
          paymentId: qrData.paymentId
        };
        
        // Store QR payment details in order
        order.paymentDetails = {
          ...order.paymentDetails,
          codQR: qrData,
          paymentMethod: 'COD',
          amount: order.totalAmount
        };
      } catch (qrError) {
        console.error('❌ QR Code Generation Failed:', qrError);
        // Continue without QR code - frontend will handle fallback
      }
    } else {
      // Generate OTP for prepaid orders
      console.log(`
🚨 ===============================
   OTP GENERATION STARTED
===============================
📋 Order ID: ${order._id}
📞 Customer Phone: ${order.user.mobileNumber}
👤 Customer Name: ${order.user.name}
🚚 Agent ID: ${agentId}
💳 Payment Method: ${order.paymentMethod}
===============================`);
      
      try {
        const msg91Service = require('../services/msg91Service');
        
        console.log('🔄 Loading MSG91 Service...');
        console.log('📞 Preparing OTP data for customer:', order.user.mobileNumber);
        console.log(`⚙️ MSG91 Credentials in use: fallback=${msg91Config.usingFallbackCredentials}, template=${msg91Config.templateId}`);
        
        const otpRequestData = {
          orderId: order._id,
          userId: order.user._id,
          deliveryAgentId: agentId,
          userPhone: order.user.mobileNumber,
          purpose: 'delivery_verification',
          deliveryLocation: {
            type: 'Point',
            coordinates: [0, 0] // Default coordinates - will be updated when delivery is completed
          },
          notes: req.body.locationNotes || 'Delivery agent reached customer location'
        };
        
        console.log('📋 OTP Request Data:', JSON.stringify(otpRequestData, null, 2));
        console.log('🚀 Calling createDeliveryOTP with data:', {
          orderId: otpRequestData.orderId,
          userId: otpRequestData.userId,
          deliveryAgentId: otpRequestData.deliveryAgentId,
          userPhone: otpRequestData.userPhone
        });
        
        const otpData = await msg91Service.createDeliveryOTP({
          ...otpRequestData,
          orderNumber: order.orderNumber,
          userName: order.user.name
        });
        
        console.log('✅ OTP Service Response:', JSON.stringify(otpData, null, 2));
        
        if (otpData && otpData.success) {
          paymentData = {
            type: 'PREPAID',
            otp: otpData.otpCode,
            otpId: otpData.otpId,
            expiresAt: otpData.expiresAt,
            phoneNumber: order.user.mobileNumber
          };
          
          // Store OTP details in order
          if (!order.otpVerification) order.otpVerification = {};
          order.otpVerification = {
            isRequired: true,
            otpId: otpData.otpId,
            generatedAt: new Date(),
            expiresAt: otpData.expiresAt,
            isVerified: false
          };
          
        console.log(`
🎉 ===============================
   OTP GENERATION SUCCESS!
===============================
📱 OTP Sent to: ${order.user.mobileNumber}
🔑 OTP ID: ${otpData.otpId}
⏰ Expires At: ${otpData.expiresAt}
===============================`);
        } else {
          console.error('⚠️ OTP generation response indicated failure:', otpData);
          throw new Error(`OTP service returned failure: ${otpData?.error || 'Unknown error'}`);
        }
      } catch (otpError) {
        console.error(`
❌ ===============================
   OTP GENERATION FAILED!
===============================
📋 Order ID: ${order._id}
📞 Customer Phone: ${order.user.mobileNumber}
🚚 Agent ID: ${agentId}
❌ Error: ${otpError.message}
📊 Stack Trace: ${otpError.stack}
===============================`);
        console.error('⚙️ MSG91 CONFIG SNAPSHOT:', {
          usingFallbackCredentials: msg91Config.usingFallbackCredentials,
          templateId: msg91Config.templateId,
          baseUrl: msg91Config.baseUrl
        });
        
        // Continue without OTP - frontend will handle fallback
        paymentData = {
          type: 'PREPAID',
          error: 'OTP generation failed',
          phoneNumber: order.user.mobileNumber,
          errorDetails: otpError.message
        };
      }
    }

    await order.save();

    const processingTime = Date.now() - startTime;
    
    logDelivery('REACHED_LOCATION_SUCCESS', { 
      agentId, 
      orderId,
      reachedTime: reachedTime.toISOString(),
      paymentType: order.paymentMethod,
      processingTime: `${processingTime}ms`
    }, 'success');

    console.log(`
✅ ===============================
   LOCATION REACHED SUCCESSFULLY!
===============================
📦 Order: ${order.orderNumber}
🚚 Agent: ${req.deliveryAgent.name}
🏪 Seller: ${order.seller.firstName}
👤 Customer: ${order.user.name}
📅 Reached Time: ${reachedTime.toLocaleString()}
💳 Payment Type: ${order.paymentMethod}
${paymentData.type === 'COD' ? `💰 COD Amount: ₹${paymentData.amount}` : `📱 OTP Sent to: ${paymentData.phoneNumber}`}
===============================`);

    // 🔔 EMIT REAL-TIME NOTIFICATIONS
    try {
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'delivery-agent-reached', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryStatus: order.deliveryAgent.status,
          reachedTime: reachedTime,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          },
          paymentData: paymentData
        });
      }

      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'delivery-agent-reached', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryStatus: order.deliveryAgent.status,
          reachedTime: reachedTime,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          }
        });
      }

      // Notify admin
      if (global.emitToAdmin) {
        global.emitToAdmin('delivery-agent-reached', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryStatus: order.deliveryAgent.status,
          reachedTime: reachedTime,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          },
          customer: {
            name: order.user.name,
            mobileNumber: order.user.mobileNumber
          }
        });
      }
    } catch (socketError) {
      console.log('Socket notification failed:', socketError.message);
    }

    // 📤 SUCCESS RESPONSE
    res.status(200).json({
      success: true,
      message: 'Location marked as reached successfully',
      data: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryStatus: order.deliveryAgent.status,
        reachedTime: reachedTime,
        paymentData: paymentData,
        nextStep: order.paymentMethod === 'COD' 
          ? 'Wait for customer to scan QR code and make payment'
          : 'Wait for customer to provide OTP for delivery verification'
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logDeliveryError('REACHED_LOCATION_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      orderId: req.params.id,
      processingTime: `${processingTime}ms`
    });

    console.error('❌ Mark Reached Location Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to mark location as reached',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'REACHED_LOCATION_ERROR'
    });
  }
};

// @desc    Generate QR code for COD payment
// @route   POST /api/delivery/orders/:id/generate-qr
// @access  Private (Delivery Agent)
const generateCODQR = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('GENERATE_COD_QR_STARTED', { agentId, orderId });
    
    console.log(`
💳 ===============================
   GENERATING COD QR CODE
===============================
📋 Order ID: ${orderId}
🚚 Agent: ${req.deliveryAgent.name}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // 🎯 VALIDATION: Check if order exists and is assigned to this agent
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      logDeliveryError('GENERATE_QR_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
        success: false, 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 🎯 AUTHORIZATION: Verify order is assigned to this agent
    const assignedAgentId = order.deliveryAgent.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      logDeliveryError('GENERATE_QR_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: assignedAgentId, 
        currentAgent: currentAgentId
      });
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you',
        code: 'UNAUTHORIZED_ORDER'
      });
    }

    // 🎯 VALIDATION: Check if order is COD
    if (order.paymentMethod !== 'COD' && order.paymentMethod !== 'Cash on Delivery') {
      logDeliveryError('GENERATE_QR_NOT_COD', new Error('Order is not COD'), { 
        orderId, 
        paymentMethod: order.paymentMethod 
      });
      return res.status(400).json({
        success: false,
        message: 'QR code generation is only available for COD orders',
        code: 'NOT_COD_ORDER'
      });
    }

    // 🎯 STATUS VALIDATION: Check if agent has reached buyer location
    // QR code should only be generated after reaching buyer location
    if (order.deliveryAgent.status !== 'location_reached') {
      logDeliveryError('GENERATE_QR_LOCATION_NOT_REACHED', new Error('Location not reached'), { 
        orderId, 
        currentStatus: order.deliveryAgent.status 
      });
      return res.status(400).json({
        success: false,
        message: 'Please reach buyer location before generating QR code',
        code: 'LOCATION_NOT_REACHED'
      });
    }
    
    // 🎯 CHECK: If QR code already generated, return existing one
    if (order.paymentDetails?.codQR && order.paymentDetails.codQR.paymentId) {
      const existingQR = order.paymentDetails.codQR;
      logDelivery('GENERATE_QR_ALREADY_EXISTS', { orderId, paymentId: existingQR.paymentId });
      return res.status(200).json({
        success: true,
        message: 'QR code already generated for this order',
        data: {
          _id: order._id,
          orderNumber: order.orderNumber,
          qrCode: existingQR.qrCode,
          qrData: existingQR.qrData,
          paymentId: existingQR.paymentId,
          amount: existingQR.amount || order.totalAmount || order.totalPrice,
          currency: 'INR',
          status: existingQR.status || 'pending'
        }
      });
    }

    // 🎯 GENERATE QR CODE
    try {
      const smepayService = require('../services/smepayService');
      const qrData = await smepayService.generateDynamicQR({
        amount: order.totalAmount || order.totalPrice,
        orderId: order.orderNumber,
        description: `Payment for Order #${order.orderNumber}`
      });
      
      // Store QR payment details in order
      if (!order.paymentDetails) order.paymentDetails = {};
      order.paymentDetails.codQR = {
        paymentId: qrData.paymentId,
        qrCode: qrData.qrCode,
        qrData: qrData.qrData,
        amount: order.totalAmount || order.totalPrice,
        generatedAt: new Date(),
        generatedBy: agentId,
        status: 'pending'
      };
      order.paymentDetails.paymentMethod = 'COD';
      order.paymentDetails.amount = order.totalAmount || order.totalPrice;

      await order.save();

      const processingTime = Date.now() - startTime;
      
      logDelivery('GENERATE_COD_QR_SUCCESS', { 
        agentId, 
        orderId,
        paymentId: qrData.paymentId,
        processingTime: `${processingTime}ms`
      }, 'success');

      console.log(`
✅ ===============================
   COD QR CODE GENERATED!
===============================
📦 Order: ${order.orderNumber}
💳 Payment ID: ${qrData.paymentId}
💰 Amount: ₹${order.totalAmount || order.totalPrice}
⏱️ Processing Time: ${processingTime}ms
===============================`);

      // 📤 SUCCESS RESPONSE
      res.status(200).json({
        success: true,
        message: 'QR code generated successfully',
        data: {
          _id: order._id,
          orderNumber: order.orderNumber,
          qrCode: qrData.qrCode,
          qrData: qrData.qrData,
          paymentId: qrData.paymentId,
          amount: order.totalAmount || order.totalPrice,
          currency: qrData.currency || 'INR',
          expiryTime: qrData.expiryTime,
          status: 'pending'
        }
      });

    } catch (qrError) {
      logDeliveryError('GENERATE_QR_FAILED', qrError, { orderId });
      console.error('❌ QR Code Generation Failed:', qrError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        error: process.env.NODE_ENV === 'development' ? qrError.message : 'QR generation service unavailable',
        code: 'QR_GENERATION_FAILED'
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logDeliveryError('GENERATE_COD_QR_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      orderId: req.params.id,
      processingTime: `${processingTime}ms`
    });

    console.error('❌ Generate COD QR Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'GENERATE_QR_ERROR'
    });
  }
};

// @desc    Check COD payment status and generate OTP if payment completed
// @route   POST /api/delivery/orders/:id/check-payment-status
// @access  Private (Delivery Agent)
const checkCODPaymentStatus = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('CHECK_COD_PAYMENT_STATUS_STARTED', { agentId, orderId });

    // 🎯 VALIDATION: Check if order exists and is assigned to this agent
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email')
      .populate('seller', 'firstName shop');

    if (!order) {
      logDeliveryError('CHECK_PAYMENT_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
        success: false, 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 🎯 AUTHORIZATION: Verify order is assigned to this agent
    const assignedAgentId = order.deliveryAgent.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      logDeliveryError('CHECK_PAYMENT_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: assignedAgentId, 
        currentAgent: currentAgentId
      });
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you',
        code: 'UNAUTHORIZED_ORDER'
      });
    }

    // 🎯 VALIDATION: Check if order is COD and has QR code
    if (order.paymentMethod !== 'COD' && order.paymentMethod !== 'Cash on Delivery') {
      return res.status(400).json({
        success: false,
        message: 'Payment status check is only available for COD orders',
        code: 'NOT_COD_ORDER'
      });
    }

    const codQR = order.paymentDetails?.codQR;
    if (!codQR || !codQR.paymentId) {
      return res.status(400).json({
        success: false,
        message: 'QR code not generated for this order. Please generate QR code first.',
        code: 'QR_NOT_GENERATED'
      });
    }

    // 🎯 CHECK PAYMENT STATUS
    try {
      const smepayService = require('../services/smepayService');
      const statusResult = await smepayService.checkQRPaymentStatus(codQR.paymentId);
      
      const isPaymentCompleted = statusResult.status === 'completed' || statusResult.status === 'success';
      
      // 🎯 AUTO-GENERATE OTP IF PAYMENT IS COMPLETED
      let otpGenerated = false;
      let otpData = null;
      
      // 🎯 UPDATE PAYMENT STATUS: Save payment completion even if OTP generation fails
      if (isPaymentCompleted) {
        // Update payment status (paymentStatus is at order level, not codPayment level)
        if (!order.codPayment) order.codPayment = {};
        order.paymentStatus = 'completed';
        order.codPayment.transactionId = statusResult.transactionId || codQR.paymentId;
        order.isPaid = true;
        order.paidAt = statusResult.paidAt || new Date();
        
        // Update QR status
        if (order.paymentDetails?.codQR) {
          order.paymentDetails.codQR.status = 'completed';
          order.paymentDetails.codQR.paidAt = statusResult.paidAt || new Date();
        }
      }
      
      // 🎯 AUTO-GENERATE OTP IF PAYMENT IS COMPLETED AND OTP NOT ALREADY VERIFIED
      // Generate OTP if payment completed but OTP not required yet OR required but not verified
      const needsOTPGeneration = isPaymentCompleted && (
        !order.otpVerification?.isRequired || 
        (order.otpVerification.isRequired && !order.otpVerification.isVerified)
      );
      
      if (needsOTPGeneration && !order.otpVerification?.isVerified) {
        try {
          const msg91Service = require('../services/msg91Service');
          
          console.log(`
🎯 ===============================
   AUTO-GENERATING OTP FOR COD
===============================
📦 Order: ${order.orderNumber}
📞 Buyer Phone: ${order.user.mobileNumber}
💳 Payment Status: Completed
===============================`);
          
          otpData = await msg91Service.createDeliveryOTP({
            orderId: order._id,
            userId: order.user._id,
            deliveryAgentId: agentId,
            userPhone: order.user.mobileNumber,
            purpose: 'delivery_confirmation',
            deliveryLocation: {
              type: 'Point',
              coordinates: [0, 0]
            },
            notes: 'OTP generated after COD QR payment completion',
            orderNumber: order.orderNumber,
            userName: order.user.name
          });
          
          if (otpData?.success) {
            // Store OTP details in order
            if (!order.otpVerification) order.otpVerification = {};
            order.otpVerification = {
              isRequired: true,
              otpId: otpData.otpId,
              generatedAt: new Date(),
              expiresAt: otpData.expiresAt,
              isVerified: false
            };
            
            otpGenerated = true;
            
            console.log(`
✅ ===============================
   OTP GENERATED SUCCESSFULLY!
===============================
📱 OTP Sent to: ${order.user.mobileNumber}
🔑 OTP ID: ${otpData.otpId}
⏰ Expires At: ${otpData.expiresAt}
===============================`);
          }
        } catch (otpError) {
          console.error('❌ OTP Generation Failed:', otpError);
          // Continue even if OTP generation fails - payment status already saved
        }
      } else if (order.otpVerification?.isRequired) {
        // OTP already generated or required
        otpGenerated = true;
        otpData = {
          otpId: order.otpVerification.otpId,
          expiresAt: order.otpVerification.expiresAt,
          isVerified: order.otpVerification.isVerified || false
        };
      }

      // 🎯 SAVE ORDER: Always save if payment completed, even if OTP generation failed
      if (isPaymentCompleted || otpGenerated) {
        await order.save();
      }

      const processingTime = Date.now() - startTime;
      
      logDelivery('CHECK_COD_PAYMENT_STATUS_SUCCESS', { 
        agentId, 
        orderId,
        paymentStatus: statusResult.status,
        isPaymentCompleted,
        otpGenerated,
        processingTime: `${processingTime}ms`
      }, 'success');

      // 📤 SUCCESS RESPONSE
      res.status(200).json({
        success: true,
        message: 'Payment status checked successfully',
        data: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: statusResult.status,
          isPaymentCompleted: isPaymentCompleted,
          paymentId: codQR.paymentId,
          transactionId: statusResult.transactionId,
          amount: codQR.amount || order.totalAmount || order.totalPrice,
          paidAt: statusResult.paidAt,
          otpGenerated: otpGenerated,
          otpData: otpData ? {
            otpId: otpData.otpId,
            expiresAt: otpData.expiresAt,
            isVerified: otpData.isVerified || false
          } : null,
          nextStep: isPaymentCompleted 
            ? (otpGenerated ? 'Enter OTP from buyer to complete delivery' : 'OTP generation in progress')
            : 'Wait for customer to scan QR code and make payment'
        }
      });

    } catch (statusError) {
      logDeliveryError('CHECK_PAYMENT_STATUS_FAILED', statusError, { orderId });
      console.error('❌ Payment Status Check Failed:', statusError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to check payment status',
        error: process.env.NODE_ENV === 'development' ? statusError.message : 'Payment status service unavailable',
        code: 'PAYMENT_STATUS_CHECK_FAILED'
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logDeliveryError('CHECK_COD_PAYMENT_STATUS_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      orderId: req.params.id,
      processingTime: `${processingTime}ms`
    });

    console.error('❌ Check COD Payment Status Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'CHECK_PAYMENT_STATUS_ERROR'
    });
  }
};

// @desc    Complete order delivery to customer
// @route   PUT /api/delivery/orders/:id/delivery
// @access  Private (Delivery Agent)
const completeDelivery = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('COMPLETE_DELIVERY_STARTED', { agentId, orderId });
    
    console.log(`
📦 ===============================
   COMPLETING ORDER DELIVERY
===============================
📋 Order ID: ${orderId}
🚚 Agent: ${req.deliveryAgent.name}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // 🎯 VALIDATION: Check if order exists and is assigned to this agent
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      logDeliveryError('DELIVERY_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
      success: false, 
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 🎯 AUTHORIZATION: Verify order is assigned to this agent
    // 🔧 CRITICAL FIX: Convert both to strings for comparison
    const assignedAgentId = order.deliveryAgent.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      logDeliveryError('DELIVERY_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: assignedAgentId, 
        currentAgent: currentAgentId,
        comparison: {
          assigned: assignedAgentId,
          current: currentAgentId,
          equal: assignedAgentId === currentAgentId
        }
      });
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you',
        code: 'UNAUTHORIZED_ORDER'
      });
    }

    // 🎯 STATUS VALIDATION: Check if delivery can be completed
    if (order.deliveryAgent.status === 'delivery_completed') {
      logDeliveryError('DELIVERY_ALREADY_COMPLETED', new Error('Delivery already completed'), { orderId });
      return res.status(400).json({
        success: false,
        message: 'Delivery has already been completed for this order',
        code: 'DELIVERY_ALREADY_COMPLETED'
      });
    }

    // 🎯 STATUS VALIDATION: Allow both pickup_completed and location_reached statuses
    // Agent can complete delivery after reaching buyer location
    if (order.deliveryAgent.status !== 'pickup_completed' && order.deliveryAgent.status !== 'location_reached') {
      logDeliveryError('DELIVERY_PICKUP_NOT_COMPLETED', new Error('Pickup not completed yet'), { 
        orderId, 
        currentStatus: order.deliveryAgent.status 
      });
      return res.status(400).json({
        success: false,
        message: 'Order pickup must be completed and you must reach buyer location before delivery',
        code: 'PICKUP_NOT_COMPLETED'
      });
    }
    
    // 🎯 PICKUP VERIFICATION: Ensure pickup.isCompleted flag is true
    if (!order.pickup?.isCompleted) {
      logDeliveryError('DELIVERY_PICKUP_NOT_VERIFIED', new Error('Pickup verification not completed'), { 
        orderId
      });
      return res.status(400).json({
        success: false,
        message: 'Pickup verification must be completed before delivery. Please complete pickup first.',
        code: 'PICKUP_NOT_VERIFIED'
      });
    }

    // 🎯 OTP VERIFICATION: Check if OTP verification is required
    const isCOD = order.paymentMethod === 'COD' || order.paymentMethod === 'Cash on Delivery';
    const codPayment = req.body.codPayment;
    const isCODQRPayment = isCOD && codPayment?.method === 'qr';
    const isCODCashPayment = isCOD && codPayment?.method === 'cash';
    
    // 🎯 OTP VERIFICATION FOR COD QR PAYMENTS
    if (isCODQRPayment && order.otpVerification?.isRequired) {
      const otpCode = req.body.otp;
      
      if (!otpCode || !otpCode.trim()) {
        logDeliveryError('DELIVERY_OTP_MISSING', new Error('OTP is required for COD QR payment'), { orderId });
        return res.status(400).json({
          success: false,
          message: 'OTP is required for COD QR payment. Please enter the OTP sent to buyer.',
          code: 'OTP_REQUIRED'
        });
      }
      
      // Verify OTP using OtpVerification model
      try {
        const otpRecord = await OtpVerification.findById(order.otpVerification.otpId);
        
        if (!otpRecord) {
          logDeliveryError('DELIVERY_OTP_RECORD_NOT_FOUND', new Error('OTP record not found'), { orderId });
          return res.status(400).json({
            success: false,
            message: 'OTP record not found. Please request a new OTP.',
            code: 'OTP_RECORD_NOT_FOUND'
          });
        }
        
        // Verify OTP
        const verifyResult = await otpRecord.verifyOTP(otpCode.trim(), {
          verifiedBy: 'delivery_agent',
          deliveryAgentId: agentId
        });
        
        if (!verifyResult.success) {
          logDeliveryError('DELIVERY_OTP_VERIFICATION_FAILED', new Error(verifyResult.message), { orderId });
          return res.status(400).json({
            success: false,
            message: verifyResult.message || 'Invalid OTP. Please check and try again.',
            code: 'OTP_VERIFICATION_FAILED'
          });
        }
        
        // Mark OTP as verified in order (will be saved later)
        order.otpVerification.isVerified = true;
        order.otpVerification.verifiedAt = new Date();
        
        console.log(`✅ OTP verified successfully for COD QR payment`);
      } catch (otpError) {
        logDeliveryError('DELIVERY_OTP_VERIFICATION_ERROR', otpError, { orderId });
        return res.status(500).json({
          success: false,
          message: 'Failed to verify OTP. Please try again.',
          code: 'OTP_VERIFICATION_ERROR'
        });
      }
    } 
    // 🎯 OTP VERIFICATION FOR COD CASH PAYMENTS (if OTP is required)
    else if (isCODCashPayment && order.otpVerification?.isRequired && !order.otpVerification?.isVerified) {
      const otpCode = req.body.otp;
      
      if (!otpCode || !otpCode.trim()) {
        logDeliveryError('DELIVERY_OTP_MISSING', new Error('OTP is required for COD cash payment'), { orderId });
        return res.status(400).json({
          success: false,
          message: 'OTP is required. Please enter the OTP sent to buyer.',
          code: 'OTP_REQUIRED'
        });
      }
      
      // Verify OTP for cash payment too
      try {
        const otpRecord = await OtpVerification.findById(order.otpVerification.otpId);
        
        if (!otpRecord) {
          logDeliveryError('DELIVERY_OTP_RECORD_NOT_FOUND', new Error('OTP record not found'), { orderId });
          return res.status(400).json({
            success: false,
            message: 'OTP record not found. Please request a new OTP.',
            code: 'OTP_RECORD_NOT_FOUND'
          });
        }
        
        const verifyResult = await otpRecord.verifyOTP(otpCode.trim(), {
          verifiedBy: 'delivery_agent',
          deliveryAgentId: agentId
        });
        
        if (!verifyResult.success) {
          logDeliveryError('DELIVERY_OTP_VERIFICATION_FAILED', new Error(verifyResult.message), { orderId });
          return res.status(400).json({
            success: false,
            message: verifyResult.message || 'Invalid OTP. Please check and try again.',
            code: 'OTP_VERIFICATION_FAILED'
          });
        }
        
        order.otpVerification.isVerified = true;
        order.otpVerification.verifiedAt = new Date();
        
        console.log(`✅ OTP verified successfully for COD cash payment`);
      } catch (otpError) {
        logDeliveryError('DELIVERY_OTP_VERIFICATION_ERROR', otpError, { orderId });
        return res.status(500).json({
          success: false,
          message: 'Failed to verify OTP. Please try again.',
          code: 'OTP_VERIFICATION_ERROR'
        });
      }
    }
    // 🎯 OTP VERIFICATION FOR PREPAID ORDERS
    else if (!isCOD && order.otpVerification?.isRequired && !order.otpVerification?.isVerified) {
      logDeliveryError('DELIVERY_OTP_NOT_VERIFIED', new Error('OTP verification required'), { orderId });
      return res.status(400).json({
        success: false,
        message: 'OTP verification is required before completing delivery',
        code: 'OTP_VERIFICATION_REQUIRED'
      });
    }

    // 🎯 BUSINESS LOGIC: Update order status and delivery details
    const deliveryNotes = req.body.deliveryNotes || '';
    const deliveryTime = new Date();
    const customerSignature = req.body.customerSignature || null;
    const deliveryProof = req.body.deliveryProof || null;

    // Update order delivery status
    order.deliveryAgent.status = 'delivery_completed';
    order.deliveryAgent.deliveryCompletedAt = deliveryTime;
    
    // Update delivery details
    if (!order.delivery) order.delivery = {};
    order.delivery.isCompleted = true;
    order.delivery.completedAt = deliveryTime;
    order.delivery.deliveryNotes = deliveryNotes;
    order.delivery.completedBy = agentId;
    order.delivery.customerSignature = customerSignature;
    order.delivery.deliveryProof = deliveryProof;

    // 🎯 HANDLE COD PAYMENT: Update payment status for COD orders
    if (isCOD && codPayment) {
      if (!order.codPayment) order.codPayment = {};
      
      order.codPayment.isCollected = true;
      order.codPayment.collectedAt = deliveryTime;
      order.codPayment.collectedAmount = order.totalAmount || order.totalPrice;
      // Map payment method: 'qr' -> 'upi' (as per Order model enum), 'cash' -> 'cash'
      order.codPayment.paymentMethod = codPayment.method === 'qr' ? 'upi' : (codPayment.method || 'cash');
      order.codPayment.collectedBy = agentId;
      
      // For QR payments, get transaction ID from payment details
      if (codPayment.method === 'qr' && order.paymentDetails?.codQR) {
        order.codPayment.transactionId = order.paymentDetails.codQR.paymentId || '';
        // Mark as paid since QR payment was completed
        order.isPaid = true;
        order.paidAt = deliveryTime;
        order.paymentStatus = 'completed';
      } else if (codPayment.method === 'cash') {
        // For cash payments, mark as paid when collected
        order.isPaid = true;
        order.paidAt = deliveryTime;
        order.paymentStatus = 'completed';
      }
      
      console.log(`💰 COD Payment collected: ${codPayment.method}, Amount: ₹${order.totalAmount || order.totalPrice}`);
    }
    
    // 🎯 OTP VERIFICATION STATUS: Already marked as verified above if verification was done
    // Only update if OTP was required but not already verified (shouldn't happen if validation above is correct)
    // This is a safety check
    if (order.otpVerification?.isRequired && !order.otpVerification.isVerified) {
      // OTP should have been verified above, but if somehow it wasn't, mark it now
      // This should not happen if validation logic is correct
      console.warn(`⚠️ OTP verification status not set properly for order ${orderId}`);
      order.otpVerification.isVerified = true;
      order.otpVerification.verifiedAt = deliveryTime;
    }

    // Update order status to "Delivered"
    order.status = 'Delivered';
    order.deliveredAt = deliveryTime;

    // Update order timeline
    if (!order.orderTimeline) order.orderTimeline = [];
    order.orderTimeline.push({
      status: 'delivery_completed',
      timestamp: deliveryTime,
      description: 'Order delivered to customer',
      agentId: agentId,
      notes: deliveryNotes
    });

    // 🎯 CALCULATE DELIVERY TIME: Track delivery performance
    if (order.deliveryAgent.assignedAt) {
      const assignedTime = new Date(order.deliveryAgent.assignedAt);
      const deliveryDuration = deliveryTime.getTime() - assignedTime.getTime();
      order.deliveryAgent.deliveryDuration = Math.round(deliveryDuration / (1000 * 60)); // in minutes
    }

    await order.save();

    // 🎯 UPDATE DELIVERY AGENT: Update agent statistics and earnings
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    if (deliveryAgent) {
      deliveryAgent.stats.deliveriesCompleted = (deliveryAgent.stats.deliveriesCompleted || 0) + 1;
      deliveryAgent.totalDeliveries = (deliveryAgent.totalDeliveries || 0) + 1;
      
      // Calculate and add delivery earnings
      const deliveryEarning = order.deliveryFees?.agentEarning || 0;
      deliveryAgent.totalEarnings = (deliveryAgent.totalEarnings || 0) + deliveryEarning;
      
      // Update average delivery time
      const currentAvgTime = deliveryAgent.stats.averageDeliveryTime || 0;
      const completedDeliveries = deliveryAgent.stats.deliveriesCompleted;
      deliveryAgent.stats.averageDeliveryTime = Math.round(
        ((currentAvgTime * (completedDeliveries - 1)) + order.deliveryAgent.deliveryDuration) / completedDeliveries
      );
      
      deliveryAgent.lastActiveAt = new Date();
      await deliveryAgent.save();
    }

    const processingTime = Date.now() - startTime;
    
    logDelivery('DELIVERY_COMPLETE_SUCCESS', { 
      agentId, 
      orderId,
      deliveryTime: deliveryTime.toISOString(),
      deliveryDuration: order.deliveryAgent.deliveryDuration,
      earnings: order.deliveryFees?.agentEarning,
      processingTime: `${processingTime}ms`
    }, 'success');

    console.log(`
✅ ===============================
   DELIVERY COMPLETED SUCCESSFULLY!
===============================
📦 Order: ${order.orderNumber}
🚚 Agent: ${req.deliveryAgent.name}
🏪 Seller: ${order.seller.firstName}
👤 Customer: ${order.user.name}
📅 Delivery Time: ${deliveryTime.toLocaleString()}
⏱️ Delivery Duration: ${order.deliveryAgent.deliveryDuration} minutes
💰 Agent Earnings: ₹${order.deliveryFees?.agentEarning || 0}
📝 Notes: ${deliveryNotes || 'None'}
===============================`);

    // 🔔 EMIT REAL-TIME NOTIFICATIONS
    try {
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'order-delivered', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryTime: deliveryTime,
          paymentStatus: order.paymentStatus || (order.isPaid ? 'completed' : 'pending'),
          codPayment: isCOD && order.codPayment ? {
            isCollected: order.codPayment.isCollected,
            method: order.codPayment.paymentMethod,
            collectedAt: order.codPayment.collectedAt,
            amount: order.codPayment.collectedAmount
          } : null,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          }
        });
      }

      if (global.emitToSeller) {
        // 🎯 MAP STATUS FOR SELLER: Transform backend status to seller-friendly status
        const { mapStatusForSeller } = require('../utils/orderUtils');
        const sellerStatus = mapStatusForSeller(order.status);
        
        global.emitToSeller(order.seller._id, 'order-delivered', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: sellerStatus, // Use mapped status for seller (Delivered maps to Delivered)
          deliveryTime: deliveryTime,
          paymentStatus: order.paymentStatus || (order.isPaid ? 'completed' : 'pending'),
          codPayment: isCOD && order.codPayment ? {
            isCollected: order.codPayment.isCollected,
            method: order.codPayment.paymentMethod,
            collectedAt: order.codPayment.collectedAt,
            amount: order.codPayment.collectedAmount
          } : null,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          }
        });
      }

      // Notify admin about delivery completion
      if (global.emitToAdmin) {
        global.emitToAdmin('order-delivered', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryTime: deliveryTime,
          paymentStatus: order.paymentStatus || (order.isPaid ? 'completed' : 'pending'),
          codPayment: isCOD && order.codPayment ? {
            isCollected: order.codPayment.isCollected,
            method: order.codPayment.paymentMethod,
            collectedAt: order.codPayment.collectedAt,
            amount: order.codPayment.collectedAmount
          } : null,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          }
        });
      }
    } catch (socketError) {
      console.log('Socket notification failed:', socketError.message);
    }

    // 📤 SUCCESS RESPONSE
    res.status(200).json({
      success: true,
      message: 'Order delivery completed successfully',
      data: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryStatus: order.deliveryAgent.status,
        paymentStatus: order.paymentStatus || (order.isPaid ? 'completed' : 'pending'),
        isPaid: order.isPaid,
        paidAt: order.paidAt,
        codPayment: isCOD && order.codPayment ? {
          isCollected: order.codPayment.isCollected,
          method: order.codPayment.paymentMethod,
          collectedAt: order.codPayment.collectedAt,
          amount: order.codPayment.collectedAmount,
          transactionId: order.codPayment.transactionId
        } : null,
        delivery: {
          isCompleted: order.delivery.isCompleted,
          completedAt: order.delivery.completedAt,
          notes: order.delivery.deliveryNotes,
          duration: order.deliveryAgent.deliveryDuration
        },
        agentEarnings: order.deliveryFees?.agentEarning || 0,
        nextStep: 'Order completed successfully'
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logDeliveryError('DELIVERY_COMPLETE_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      orderId: req.params.id,
      processingTime: `${processingTime}ms`
    });

    console.error('❌ Complete Delivery Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to complete delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'DELIVERY_COMPLETE_ERROR'
    });
  }
};

// @desc    Get assigned orders for delivery agent  
// @route   GET /api/delivery/orders/assigned
// @access  Private (Delivery Agent)
const getAssignedOrders = async (req, res) => {
  // ⬇️ YE LINES ADD करें - FUNCTION के शुरुआत में
  console.log('🟢 getAssignedOrders FUNCTION CALLED!');
  console.log('🟢 Agent ID:', req.deliveryAgent?._id || req.deliveryAgent?.id);
  console.log('🟢 Request method:', req.method);
  console.log('🟢 Request URL:', req.originalUrl);
  
  console.log('🔥🔥🔥 NEW getAssignedOrders called - REAL IMPLEMENTATION LOADED! 🔥🔥🔥');
  
  try {
    // 🔧 CRITICAL FIX: Use _id instead of id (lean() doesn't provide id virtual)
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('ASSIGNED_ORDERS_REQUEST', { agentId });
    
    console.log(`
📋 ===============================
   FETCHING ASSIGNED ORDERS
===============================
🚚 Agent: ${req.deliveryAgent.name}
🆔 Agent ID: ${agentId}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // 🎯 BUSINESS LOGIC: Get orders assigned to this agent that are still in progress
    const inProgressStatuses = ['assigned', 'accepted', 'pickup_completed', 'location_reached'];

    const assignedOrders = await Order.find({
      'deliveryAgent.agent': agentId,
      'deliveryAgent.status': { 
        $in: inProgressStatuses 
      },
      status: { $nin: ['Cancelled', 'Delivered'] }
    })
    .populate('user', 'name email mobileNumber')
    .populate('seller', 'firstName lastName email shop')
    .populate('orderItems.product', 'name images')
    .sort({ 'deliveryAgent.assignedAt': 1 }) // FIFO - oldest assignments first
    .limit(50); // Reasonable limit

    const statusBreakdown = assignedOrders.reduce((acc, order) => {
      const status = order.deliveryAgent.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    logDelivery('ASSIGNED_ORDERS_RETRIEVED', { 
      agentId, 
      orderCount: assignedOrders.length,
      statusBreakdown
    });

    console.log(`
✅ ===============================
   ASSIGNED ORDERS FETCHED
===============================
📦 Orders Found: ${assignedOrders.length}
📊 Status Breakdown:
   - Assigned: ${statusBreakdown['assigned'] || 0}
   - Accepted: ${statusBreakdown['accepted'] || 0}  
   - Picked Up: ${statusBreakdown['pickup_completed'] || 0}
   - Location Reached: ${statusBreakdown['location_reached'] || 0}
🚚 Agent: ${req.deliveryAgent.name}
===============================`);

    // 🎯 FRONTEND COMPATIBLE: Format orders for delivery agent dashboard
    const formattedOrders = assignedOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber, // ✅ Visible after assignment
      status: order.status,
      deliveryStatus: order.deliveryAgent.status,
      totalPrice: order.totalPrice,
      deliveryFees: order.deliveryFees,
      
      // Customer information
      user: {
        name: order.user.name,
        phone: order.user.mobileNumber,
        email: order.user.email
      },
      
      // Seller information for pickup
      seller: {
        name: order.seller.firstName + (order.seller.lastName ? ' ' + order.seller.lastName : ''),
        shopName: order.seller.shop?.name || 'Shop',
        email: order.seller.email,
        phone: order.seller.shop?.phoneNumber?.main || order.seller.mobileNumber,
        address: order.seller.shop?.address || 'Address not provided'
      },
      
      // Delivery information
      shippingAddress: order.shippingAddress,
      
      // Order items summary
      orderItems: order.orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        image: item.image,
        size: item.size,
        color: item.color
      })),
      
      // Timeline information
      assignedAt: order.deliveryAgent.assignedAt,
      acceptedAt: order.deliveryAgent.acceptedAt,
      estimatedDelivery: order.estimatedDelivery?.estimatedAt,
      
      // Order tracking
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      isPaid: order.isPaid,
      
      // Pickup and delivery tracking
      pickup: {
        isCompleted: order.pickup?.isCompleted || false,
        completedAt: order.pickup?.completedAt,
        sellerLocationReachedAt: order.pickup?.sellerLocationReachedAt || null,
        notes: order.pickup?.pickupNotes
      },
      
      delivery: {
        isCompleted: order.delivery?.isCompleted || false,
        locationReachedAt: order.delivery?.locationReachedAt || null,
        attemptCount: order.delivery?.attemptCount || 0,
        notes: order.delivery?.deliveryNotes
      },
      
      // OTP verification status
      otpVerification: {
        isRequired: order.otpVerification?.isRequired || false,
        isVerified: order.otpVerification?.isVerified || false
      }
    }));

    res.status(200).json({
      success: true,
      message: 'Assigned orders retrieved successfully',
      count: formattedOrders.length,
      data: formattedOrders
    });

  } catch (error) {
    logDeliveryError('ASSIGNED_ORDERS_FAILED', error, { agentId: req.deliveryAgent?.id });
    console.error('❌ Get Assigned Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get delivery agent statistics
// @route   GET /api/delivery/stats
// @access  Private (Delivery Agent)
const getDeliveryStats = async (req, res) => {
  // ⬇️ YE LINES ADD करें - FUNCTION के शुरुआत में
  console.log('🟢 getDeliveryStats FUNCTION CALLED!');
  console.log('🟢 Agent ID:', req.deliveryAgent?.id);
  console.log('🟢 Request method:', req.method);
  console.log('🟢 Request URL:', req.originalUrl);
  
  console.log('🔥🔥🔥 NEW getDeliveryStats called - REAL IMPLEMENTATION LOADED! 🔥🔥🔥');
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('DELIVERY_STATS_REQUEST', { agentId });
    
    console.log(`
📊 ===============================
   CALCULATING DELIVERY STATS
===============================
🚚 Agent: ${req.deliveryAgent.name}
🆔 Agent ID: ${agentId}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // Get date ranges for calculations
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));
    
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 🎯 PRODUCTION QUERIES: Calculate real statistics from Order collection
    const [
      // Total completed deliveries and earnings
      totalStats,
      
      // Today's deliveries and earnings
      todayStats,
      
      // Weekly stats
      weeklyStats,
      
      // Monthly stats  
      monthlyStats,
      
      // Current assigned orders (in progress)
      currentAssigned,
      
      // Performance metrics
      averageRating,
      
      // Recent activity
      recentCompletedOrders
    ] = await Promise.all([
      // Total completed deliveries with earnings
      Order.aggregate([
        {
          $match: {
            'deliveryAgent.agent': new mongoose.Types.ObjectId(agentId),
            'deliveryAgent.status': 'delivery_completed'
          }
        },
        {
          $group: {
            _id: null,
            totalDeliveries: { $sum: 1 },
            totalEarnings: { $sum: '$deliveryFees.agentEarning' },
            totalOrderValue: { $sum: '$totalPrice' }
          }
        }
      ]),

      // Today's deliveries and earnings
      Order.aggregate([
        {
          $match: {
            'deliveryAgent.agent': new mongoose.Types.ObjectId(agentId),
            'deliveryAgent.status': 'delivery_completed',
            'delivery.completedAt': { $gte: todayStart, $lte: todayEnd }
          }
        },
        {
          $group: {
            _id: null,
            todayDeliveries: { $sum: 1 },
            todayEarnings: { $sum: '$deliveryFees.agentEarning' }
          }
        }
      ]),

      // Weekly stats
      Order.aggregate([
        {
          $match: {
            'deliveryAgent.agent': new mongoose.Types.ObjectId(agentId),
            'deliveryAgent.status': 'delivery_completed',
            'delivery.completedAt': { $gte: weekStart }
          }
        },
        {
          $group: {
            _id: null,
            weeklyDeliveries: { $sum: 1 },
            weeklyEarnings: { $sum: '$deliveryFees.agentEarning' }
          }
        }
      ]),

      // Monthly stats
      Order.aggregate([
        {
          $match: {
            'deliveryAgent.agent': new mongoose.Types.ObjectId(agentId),
            'deliveryAgent.status': 'delivery_completed',
            'delivery.completedAt': { $gte: monthStart }
          }
        },
        {
          $group: {
            _id: null,
            monthlyDeliveries: { $sum: 1 },
            monthlyEarnings: { $sum: '$deliveryFees.agentEarning' }
          }
        }
      ]),

      // Current assigned orders count (in progress)
      Order.countDocuments({
        'deliveryAgent.agent': agentId,
        'deliveryAgent.status': { $in: ['assigned', 'accepted', 'pickup_completed'] }
      }),

      // Average rating from completed orders
      Order.aggregate([
        {
          $match: {
            'deliveryAgent.agent': new mongoose.Types.ObjectId(agentId),
            'deliveryAgent.status': 'delivery_completed',
            'deliveryRating': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$deliveryRating' },
            ratingCount: { $sum: 1 }
          }
        }
      ]),

      // Recent completed orders for activity tracking
      Order.find({
        'deliveryAgent.agent': agentId,
        'deliveryAgent.status': 'delivery_completed'
      })
      .sort({ 'delivery.completedAt': -1 })
      .limit(5)
      .select('orderNumber totalPrice delivery.completedAt deliveryFees.agentEarning')
    ]);

    // 🎯 PROCESS RESULTS: Extract data with fallbacks
    const total = totalStats[0] || { totalDeliveries: 0, totalEarnings: 0, totalOrderValue: 0 };
    const today = todayStats[0] || { todayDeliveries: 0, todayEarnings: 0 };
    const weekly = weeklyStats[0] || { weeklyDeliveries: 0, weeklyEarnings: 0 };
    const monthly = monthlyStats[0] || { monthlyDeliveries: 0, monthlyEarnings: 0 };
    const rating = averageRating[0] || { averageRating: 0, ratingCount: 0 };

    // 🎯 BUSINESS LOGIC: Calculate performance metrics
    const completionRate = total.totalDeliveries > 0 ? 100 : 0; // Since we only count completed deliveries
    const avgEarningsPerDelivery = total.totalDeliveries > 0 ? 
      Math.round((total.totalEarnings / total.totalDeliveries) * 100) / 100 : 0;

    // 🎯 FRONTEND COMPATIBLE: Format response to match dashboard expectations
    const statsResponse = {
      today: {
        deliveries: today.todayDeliveries,
        earnings: Math.round(today.todayEarnings * 100) / 100
      },
      total: {
        deliveries: total.totalDeliveries,
        earnings: Math.round(total.totalEarnings * 100) / 100
      },
      weekly: {
        deliveries: weekly.weeklyDeliveries,
        earnings: Math.round(weekly.weeklyEarnings * 100) / 100
      },
      monthly: {
        deliveries: monthly.monthlyDeliveries,
        earnings: Math.round(monthly.monthlyEarnings * 100) / 100
      },
      current: {
        assigned: currentAssigned,
        pending: currentAssigned // Same value for now
      },
      performance: {
        rating: Math.round(rating.averageRating * 10) / 10 || 0,
        completionRate: completionRate,
        avgEarningsPerDelivery: avgEarningsPerDelivery,
        totalOrderValue: Math.round(total.totalOrderValue * 100) / 100,
        ratingCount: rating.ratingCount
      },
      recent: {
        orders: recentCompletedOrders.map(order => ({
          orderNumber: order.orderNumber,
          completedAt: order.delivery.completedAt,
          earnings: order.deliveryFees.agentEarning,
          orderValue: order.totalPrice
        }))
      }
    };

    // 🎯 SYNC DELIVERY AGENT: Update the agent's stats to match calculated values
    try {
      await DeliveryAgent.findByIdAndUpdate(agentId, {
        totalDeliveries: total.totalDeliveries,
        totalEarnings: total.totalEarnings,
        rating: rating.averageRating || 0,
        'deliveryStats.totalDeliveries': total.totalDeliveries,
        'deliveryStats.completedDeliveries': total.totalDeliveries,
        'deliveryStats.totalEarnings': total.totalEarnings,
        'deliveryStats.averageRating': rating.averageRating || 0,
        'deliveryStats.thisWeek.deliveries': weekly.weeklyDeliveries,
        'deliveryStats.thisWeek.earnings': weekly.weeklyEarnings,
        'deliveryStats.thisMonth.deliveries': monthly.monthlyDeliveries,
        'deliveryStats.thisMonth.earnings': monthly.monthlyEarnings
      });
      
      logDelivery('AGENT_STATS_SYNCED', { 
        agentId, 
        totalDeliveries: total.totalDeliveries,
        totalEarnings: total.totalEarnings 
      });
    } catch (syncError) {
      logDeliveryError('AGENT_STATS_SYNC_FAILED', syncError, { agentId });
      // Continue even if sync fails
    }

    logDelivery('DELIVERY_STATS_SUCCESS', { 
      agentId, 
      totalDeliveries: total.totalDeliveries,
      todayDeliveries: today.todayDeliveries,
      totalEarnings: total.totalEarnings,
      currentAssigned: currentAssigned
    }, 'success');

    console.log(`
✅ ===============================
   DELIVERY STATS CALCULATED
===============================
📦 Total Deliveries: ${total.totalDeliveries}
💰 Total Earnings: ₹${total.totalEarnings}
📅 Today: ${today.todayDeliveries} deliveries, ₹${today.todayEarnings}
📊 Current Assigned: ${currentAssigned}
⭐ Rating: ${rating.averageRating || 0}/5
📈 Completion Rate: ${completionRate}%
===============================`);

    res.status(200).json({
      success: true,
      message: 'Delivery statistics retrieved successfully',
      data: statsResponse
    });

  } catch (error) {
    logDeliveryError('DELIVERY_STATS_FAILED', error, { agentId: req.deliveryAgent?.id });
    console.error('❌ Get Delivery Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get delivery agent delivery history
// @route   GET /api/delivery/history
// @access  Private (Delivery Agent)
const getDeliveryHistory = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('DELIVERY_HISTORY_REQUEST', { agentId });
    
    console.log(`
📚 ===============================
   FETCHING DELIVERY HISTORY
===============================
🚚 Agent: ${req.deliveryAgent.name}
🆔 Agent ID: ${agentId}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // 🎯 QUERY PARAMETERS: Handle pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status; // Filter by delivery status
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    // 🎯 BUILD QUERY: Filter completed deliveries
    const query = {
      'deliveryAgent.agent': agentId,
      'deliveryAgent.status': 'delivery_completed'
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      query['delivery.completedAt'] = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (startDate) {
      query['delivery.completedAt'] = { $gte: startDate };
    } else if (endDate) {
      query['delivery.completedAt'] = { $lte: endDate };
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // 🎯 EXECUTE QUERY: Get paginated delivery history
    const skip = (page - 1) * limit;
    
    const [deliveryHistory, totalCount] = await Promise.all([
      Order.find(query)
        .populate('user', 'name mobileNumber email')
        .populate('seller', 'firstName shop')
        .populate('orderItems.product', 'name images')
        .sort({ 'delivery.completedAt': -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .select('orderNumber status totalPrice deliveryFees delivery deliveryAgent shippingAddress createdAt deliveredAt'),
      
      Order.countDocuments(query)
    ]);

    logDelivery('DELIVERY_HISTORY_RETRIEVED', { 
      agentId, 
      orderCount: deliveryHistory.length,
      totalCount,
      page,
      limit
    });

    console.log(`
✅ ===============================
   DELIVERY HISTORY FETCHED
===============================
📦 Orders Found: ${deliveryHistory.length}
📊 Total Orders: ${totalCount}
📄 Page: ${page} of ${Math.ceil(totalCount / limit)}
🚚 Agent: ${req.deliveryAgent.name}
===============================`);

    // 🎯 FORMAT RESPONSE: Structure data for frontend consumption
    const formattedHistory = deliveryHistory.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalPrice: order.totalPrice,
      deliveryFees: order.deliveryFees,
      
      // Customer information
      customer: {
        name: order.user.name,
        mobileNumber: order.user.mobileNumber,
        email: order.user.email
      },
      
      // Seller information
      seller: {
        name: order.seller.firstName,
        shopName: order.seller.shop?.name || 'Shop'
      },
      
      // Delivery details
      delivery: {
        completedAt: order.delivery?.completedAt,
        duration: order.deliveryAgent?.deliveryDuration,
        notes: order.delivery?.deliveryNotes,
        agentEarnings: order.deliveryFees?.agentEarning || 0
      },
      
      // Order timeline
      assignedAt: order.deliveryAgent?.assignedAt,
      acceptedAt: order.deliveryAgent?.acceptedAt,
      pickupCompletedAt: order.deliveryAgent?.pickupCompletedAt,
      deliveryCompletedAt: order.deliveryAgent?.deliveryCompletedAt,
      
      // Location and timing
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt
    }));

    // 🎯 CALCULATE PAGINATION: Provide pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // 🎯 SUMMARY STATISTICS: Provide overview of history period
    const summaryStats = {
      totalDeliveries: totalCount,
      totalEarnings: deliveryHistory.reduce((sum, order) => 
        sum + (order.deliveryFees?.agentEarning || 0), 0
      ),
      averageDeliveryTime: deliveryHistory.length > 0 ? 
        Math.round(deliveryHistory.reduce((sum, order) => 
          sum + (order.deliveryAgent?.deliveryDuration || 0), 0
        ) / deliveryHistory.length) : 0,
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Present'
      }
    };

    res.status(200).json({
      success: true,
      message: 'Delivery history retrieved successfully',
      data: {
        history: formattedHistory,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        },
        summary: summaryStats
      }
    });

  } catch (error) {
    logDeliveryError('DELIVERY_HISTORY_FAILED', error, { agentId: req.deliveryAgent?.id });
    console.error('❌ Get Delivery History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'DELIVERY_HISTORY_ERROR'
    });
  }
};

// 🎯 NEW: Get assigned orders notifications (for dashboard)
// @desc    Get notifications for newly assigned orders
// @route   GET /api/delivery/notifications
// @access  Private (Delivery Agent)
const getOrderNotifications = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('GET_ORDER_NOTIFICATIONS', { agentId });
    
    // Get orders that are assigned but not yet accepted/rejected
    const notifications = await Order.find({
      'deliveryAgent.agent': agentId,
      'deliveryAgent.status': 'assigned'
    })
    .populate('user', 'name mobileNumber')
    .populate('seller', 'firstName lastName shop')
    .populate('orderItems.product', 'name images')
    .sort({ 'deliveryAgent.assignedAt': -1 })
    .limit(10);

    logDelivery('ORDER_NOTIFICATIONS_RETRIEVED', { 
      agentId, 
      notificationCount: notifications.length 
    });

    // Format notifications (without order ID for security)
    const formattedNotifications = notifications.map(order => ({
      notificationId: order._id, // Use order ID as notification ID
      orderNumber: null, // Order number hidden until accepted
      status: 'assigned',
      assignedAt: order.deliveryAgent.assignedAt,
      
      // Basic order info (safe to show)
      customerName: order.user.name,
      customerPhone: order.user.mobileNumber,
      pickupAddress: order.seller.shop?.address || 'Address not provided',
      deliveryAddress: order.shippingAddress.address,
      totalAmount: order.totalPrice,
      itemCount: order.orderItems.length,
      
      // Seller info for pickup
      sellerName: `${order.seller.firstName} ${order.seller.lastName || ''}`.trim(),
      shopName: order.seller.shop?.name || 'Shop',
      
      // Order items summary (without sensitive details)
      itemsSummary: order.orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        image: item.image
      })),
      
      message: 'New order assigned to you',
      requiresAction: true
    }));

    res.status(200).json({
      success: true,
      message: 'Order notifications retrieved successfully',
      data: formattedNotifications,
      count: formattedNotifications.length
    });

  } catch (error) {
    logDeliveryError('GET_ORDER_NOTIFICATIONS', error, { agentId: req.deliveryAgent?.id });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order notifications'
    });
  }
};

// 🎯 NEW: Bulk accept orders
// @desc    Accept multiple assigned orders at once
// @route   POST /api/delivery/orders/bulk-accept
// @access  Private (Delivery Agent)
const bulkAcceptOrders = async (req, res) => {
  try {
    // Check validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🔧 DEBUG: Validation errors:', errors.array());
      console.log('🔧 DEBUG: Request body:', req.body);
      logDelivery('BULK_ACCEPT_VALIDATION_FAILED', { 
        errors: errors.array(),
        agentId: req.deliveryAgent?.id,
        requestBody: req.body
      }, 'error');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        receivedData: req.body
      });
    }

    const { orderIds } = req.body;
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    // 🔧 DEBUG: Log the exact data received
    console.log('🔧 DEBUG: bulkAcceptOrders received data:', {
      orderIds: orderIds,
      orderIdsType: typeof orderIds,
      orderIdsIsArray: Array.isArray(orderIds),
      orderIdsLength: orderIds?.length,
      fullRequestBody: req.body
    });
    
    logDelivery('BULK_ACCEPT_ORDERS_START', { 
      orderIds: orderIds,  // 🔧 FIXED: Log the actual array, not just the length
      orderIdsCount: orderIds?.length || 0, 
      agentId,
      agentName: req.deliveryAgent.name
    });

    // Validate input
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      console.log('🔧 DEBUG: Validation failed - orderIds:', orderIds, 'isArray:', Array.isArray(orderIds));
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required and must not be empty',
        received: {
          orderIds: orderIds,
          type: typeof orderIds,
          isArray: Array.isArray(orderIds),
          length: orderIds?.length
        }
      });
    }

    // Find all orders that can be accepted
    // 🔧 FIXED: Check both Order collection and DeliveryAgent's assignedOrders array
    // This handles cases where there might be data inconsistency between the two collections
    const orders = await Order.find({
      _id: { $in: orderIds },
      'deliveryAgent.agent': agentId,
      status: 'Pickup_Ready'
      // 🔧 REMOVED: 'deliveryAgent.status': 'assigned' - this was causing the issue
      // We'll check the DeliveryAgent's assignedOrders array instead for more accurate status
    }).populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('orderItems.product', 'name images');

    // 🔧 FIXED: Filter orders based on DeliveryAgent's assignedOrders array for accurate status
    const deliveryAgentForAccept = await DeliveryAgent.findById(agentId);
    if (!deliveryAgentForAccept) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // Filter orders that are actually assigned and not yet accepted
    const assignableOrders = orders.filter(order => {
      const assignedOrder = deliveryAgentForAccept.assignedOrders.find(
        assigned => assigned.order.toString() === order._id.toString() && assigned.status === 'assigned'
      );
      return assignedOrder !== undefined;
    });

    if (assignableOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found that can be accepted. Orders must be assigned to you with status "assigned" and in Pickup_Ready status.',
        details: {
          totalOrdersFound: orders.length,
          ordersInAssignedStatus: assignableOrders.length,
          agentAssignedOrders: deliveryAgentForAccept.assignedOrders.length
        }
      });
    }

    const acceptedOrders = [];
    const failedAcceptances = [];

    // Process each assignable order
    for (const order of assignableOrders) {
      try {
        // Update order delivery agent status
        order.deliveryAgent.status = 'accepted';
        order.deliveryAgent.acceptedAt = new Date();

        // Add to order history
        order.statusHistory.push({
          status: 'Pickup_Ready',
          changedBy: 'delivery_agent',
          changedAt: new Date(),
          notes: `Order accepted by delivery agent: ${req.deliveryAgent.name}`
        });

        await order.save();

        acceptedOrders.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerName: order.user.name,
          totalPrice: order.totalPrice,
          pickupAddress: order.seller.shop?.address || 'Address not provided',
          deliveryAddress: order.shippingAddress.address
        });

        // Send notification to seller
        try {
          if (global.emitToSeller) {
            global.emitToSeller(order.seller._id, 'order-accepted-by-agent', {
              orderId: order._id,
              orderNumber: order.orderNumber,
              deliveryAgent: {
                name: req.deliveryAgent.name,
                phone: req.deliveryAgent.phoneNumber,
                vehicleType: req.deliveryAgent.vehicleType
              },
              message: `Order ${order.orderNumber} has been accepted by delivery agent`
            });
          }
        } catch (notificationError) {
          logDelivery('SELLER_NOTIFICATION_FAILED', { 
            sellerId: order.seller._id, 
            orderId: order._id, 
            error: notificationError.message 
          }, 'warning');
        }

        // Send notification to buyer
        try {
          if (global.emitToBuyer) {
            global.emitToBuyer(order.user._id, 'order-accepted-by-agent', {
              orderId: order._id,
              orderNumber: order.orderNumber,
              deliveryAgent: {
                name: req.deliveryAgent.name,
                phone: req.deliveryAgent.phoneNumber,
                vehicleType: req.deliveryAgent.vehicleType
              },
              message: `Your order ${order.orderNumber} has been accepted and will be picked up soon`
            });
          }
        } catch (notificationError) {
          logDelivery('BUYER_NOTIFICATION_FAILED', { 
            userId: order.user._id, 
            orderId: order._id, 
            error: notificationError.message 
          }, 'warning');
        }

      } catch (orderError) {
        failedAcceptances.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          error: orderError.message
        });
        logDelivery('BULK_ORDER_ACCEPTANCE_ERROR', {
          orderId: order._id,
          error: orderError.message
        }, 'error');
      }
    }

    // Update delivery agent status and assignedOrders array
    const deliveryAgentForUpdate = await DeliveryAgent.findById(agentId);
    if (acceptedOrders.length > 0) {
      deliveryAgentForUpdate.status = 'assigned';
      deliveryAgentForUpdate.currentOrder = acceptedOrders[0].orderId; // Set first order as current
      
      // 🔧 CRITICAL FIX: Update the assignedOrders array to reflect accepted status for all accepted orders
      acceptedOrders.forEach(acceptedOrder => {
        const assignedOrderIndex = deliveryAgentForUpdate.assignedOrders.findIndex(
          assignedOrder => assignedOrder.order.toString() === acceptedOrder.orderId
        );
        
        if (assignedOrderIndex !== -1) {
          deliveryAgentForUpdate.assignedOrders[assignedOrderIndex].status = 'accepted';
          deliveryAgentForUpdate.assignedOrders[assignedOrderIndex].acceptedAt = new Date();
        }
      });
      
      await deliveryAgentForUpdate.save();
    }

    logDelivery('BULK_ACCEPT_ORDERS_SUCCESS', {
      agentId,
      agentName: req.deliveryAgent.name,
      totalOrders: assignableOrders.length,
      acceptedCount: acceptedOrders.length,
      failedCount: failedAcceptances.length
    }, 'success');

    res.status(200).json({
      success: true,
      message: `Bulk acceptance completed: ${acceptedOrders.length} orders accepted successfully`,
      data: {
        acceptedOrders,
        failedAcceptances,
        summary: {
          totalRequested: orderIds.length,
          totalProcessed: assignableOrders.length,
          successfullyAccepted: acceptedOrders.length,
          failed: failedAcceptances.length
        },
        acceptedAt: new Date(),
        acceptedBy: agentId
      }
    });

  } catch (error) {
    logDelivery('BULK_ACCEPT_ORDERS_ERROR', {
      agentId: req.deliveryAgent?.id,
      orderIds: req.body.orderIds,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk order acceptance'
    });
  }
};

// 🎯 NEW: Bulk reject orders
// @desc    Reject multiple assigned orders at once
// @route   POST /api/delivery/orders/bulk-reject
// @access  Private (Delivery Agent)
const bulkRejectOrders = async (req, res) => {
  try {
    // Check validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logDelivery('BULK_REJECT_VALIDATION_FAILED', { 
        errors: errors.array(),
        agentId: req.deliveryAgent?.id 
      }, 'error');
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { orderIds, reason } = req.body;
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('BULK_REJECT_ORDERS_START', { 
      orderIds: orderIds?.length || 0, 
      agentId,
      agentName: req.deliveryAgent.name,
      reason: reason || 'No reason provided'
    });

    // Validate input
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required and must not be empty'
      });
    }

    // Find all orders that can be rejected
    // 🔧 FIXED: Check both Order collection and DeliveryAgent's assignedOrders array
    // This handles cases where there might be data inconsistency between the two collections
    const orders = await Order.find({
      _id: { $in: orderIds },
      'deliveryAgent.agent': agentId,
      status: 'Pickup_Ready'
      // 🔧 REMOVED: 'deliveryAgent.status': 'assigned' - this was causing the issue
      // We'll check the DeliveryAgent's assignedOrders array instead for more accurate status
    }).populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('orderItems.product', 'name images');

    // 🔧 FIXED: Filter orders based on DeliveryAgent's assignedOrders array for accurate status
    const deliveryAgentForReject = await DeliveryAgent.findById(agentId);
    if (!deliveryAgentForReject) {
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // Filter orders that are actually assigned and not yet accepted
    const rejectableOrders = orders.filter(order => {
      const assignedOrder = deliveryAgentForReject.assignedOrders.find(
        assigned => assigned.order.toString() === order._id.toString() && assigned.status === 'assigned'
      );
      return assignedOrder !== undefined;
    });

    if (rejectableOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found that can be rejected. Orders must be assigned to you with status "assigned" and in Pickup_Ready status.',
        details: {
          totalOrdersFound: orders.length,
          ordersInAssignedStatus: rejectableOrders.length,
          agentAssignedOrders: deliveryAgentForReject.assignedOrders.length
        }
      });
    }

    const rejectedOrders = [];
    const failedRejections = [];

    // Process each rejectable order
    for (const order of rejectableOrders) {
      try {
        // Update order delivery agent status
        order.deliveryAgent.status = 'rejected';
        order.deliveryAgent.rejectedAt = new Date();
        order.deliveryAgent.rejectionReason = reason || 'No reason provided';

        // Reset delivery agent assignment
        order.deliveryAgent.agent = null;
        order.deliveryAgent.assignedAt = null;
        order.deliveryAgent.assignedBy = null;

        // Add to order history
        order.statusHistory.push({
          status: 'Processing',
          changedBy: 'delivery_agent',
          changedAt: new Date(),
          notes: `Order rejected by delivery agent: ${req.deliveryAgent.name}. Reason: ${reason || 'No reason provided'}`
        });

        await order.save();

        rejectedOrders.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerName: order.user.name,
          totalPrice: order.totalPrice,
          rejectionReason: reason || 'No reason provided'
        });

        // Send notification to admin about rejection
        try {
          if (global.emitToAdmin) {
            global.emitToAdmin('order-rejected-by-agent', {
              orderId: order._id,
              orderNumber: order.orderNumber,
              deliveryAgent: {
                name: req.deliveryAgent.name,
                phone: req.deliveryAgent.phoneNumber,
                vehicleType: req.deliveryAgent.vehicleType
              },
              customer: order.user,
              seller: order.seller,
              rejectionReason: reason || 'No reason provided',
              message: `Order ${order.orderNumber} rejected by delivery agent ${req.deliveryAgent.name}`
            });
          }
        } catch (notificationError) {
          logDelivery('ADMIN_NOTIFICATION_FAILED', { 
            orderId: order._id, 
            error: notificationError.message 
          }, 'warning');
        }

        // Send notification to seller
        try {
          if (global.emitToSeller) {
            global.emitToSeller(order.seller._id, 'order-rejected-by-agent', {
              orderId: order._id,
              orderNumber: order.orderNumber,
              deliveryAgent: {
                name: req.deliveryAgent.name,
                phone: req.deliveryAgent.phoneNumber
              },
              rejectionReason: reason || 'No reason provided',
              message: `Order ${order.orderNumber} was rejected by delivery agent. It will be reassigned.`
            });
          }
        } catch (notificationError) {
          logDelivery('SELLER_NOTIFICATION_FAILED', { 
            sellerId: order.seller._id, 
            orderId: order._id, 
            error: notificationError.message 
          }, 'warning');
        }

      } catch (orderError) {
        failedRejections.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          error: orderError.message
        });
        logDelivery('BULK_ORDER_REJECTION_ERROR', {
          orderId: order._id,
          error: orderError.message
        }, 'error');
      }
    }

    // Update delivery agent status
    const deliveryAgentForRejectUpdate = await DeliveryAgent.findById(agentId);
    if (rejectedOrders.length > 0) {
      // Check if agent has any remaining assigned orders
      const remainingAssignedOrders = await Order.countDocuments({
        'deliveryAgent.agent': agentId,
        'deliveryAgent.status': { $in: ['assigned', 'accepted'] }
      });

      if (remainingAssignedOrders === 0) {
        deliveryAgentForRejectUpdate.status = 'available';
        deliveryAgentForRejectUpdate.currentOrder = null;
        await deliveryAgentForRejectUpdate.save();
      }
    }

    logDelivery('BULK_REJECT_ORDERS_SUCCESS', {
      agentId,
      agentName: req.deliveryAgent.name,
      totalOrders: rejectableOrders.length,
      rejectedCount: rejectedOrders.length,
      failedCount: failedRejections.length
    }, 'success');

    res.status(200).json({
      success: true,
      message: `Bulk rejection completed: ${rejectedOrders.length} orders rejected successfully`,
      data: {
        rejectedOrders,
        failedRejections,
        summary: {
          totalRequested: orderIds.length,
          totalProcessed: rejectableOrders.length,
          successfullyRejected: rejectedOrders.length,
          failed: failedRejections.length
        },
        rejectedAt: new Date(),
        rejectedBy: agentId
      }
    });

  } catch (error) {
    logDelivery('BULK_REJECT_ORDERS_ERROR', {
      agentId: req.deliveryAgent?.id,
      orderIds: req.body.orderIds,
      error: error.message
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk order rejection'
    });
  }
};

// 🎯 NEW: Reject order
// @desc    Reject an assigned order
// @route   PUT /api/delivery/orders/:id/reject
// @access  Private (Delivery Agent)
const rejectOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { reason } = req.body;
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('REJECT_ORDER_START', { 
      orderId, 
      agentId,
      agentName: req.deliveryAgent.name,
      reason: reason || 'No reason provided'
    });

    // Find the order
    const order = await Order.findOne({
      _id: orderId,
      'deliveryAgent.agent': agentId,
      'deliveryAgent.status': 'assigned'
    })
    .populate('user', 'name email mobileNumber')
    .populate('seller', 'firstName lastName email shop');

    if (!order) {
      logDelivery('REJECT_ORDER_FAILED', { 
        orderId, 
        agentId, 
        reason: 'order_not_found_or_not_assigned' 
      }, 'error');
      
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you'
      });
    }

    // Check if order is still in correct state
    if (order.status !== 'approved') {
      logDelivery('REJECT_ORDER_FAILED', { 
        orderId, 
        agentId, 
        reason: 'order_status_invalid',
        currentStatus: order.status 
      }, 'error');
      
      return res.status(400).json({
        success: false,
        message: 'Order is not in a state that can be rejected'
      });
    }

    // 🎯 UPDATE: Use the Order model's handleDeliveryAgentResponse method
    order.handleDeliveryAgentResponse('rejected', reason);
    
    // Update order status back to approved (so admin can reassign)
    order.status = 'approved';
    
    // Add to status history
    order.statusHistory.push({
      status: 'approved',
      updatedBy: agentId,
      updatedAt: new Date(),
      notes: `Order rejected by delivery agent: ${reason || 'No reason provided'}`
    });

    await order.save();

    // Update delivery agent status
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    if (deliveryAgent) {
      deliveryAgent.status = 'available';
      deliveryAgent.currentOrder = null;
      
      // Update assigned order status
      const assignedOrder = deliveryAgent.assignedOrders.find(
        ao => ao.order.toString() === orderId
      );
      if (assignedOrder) {
        assignedOrder.status = 'rejected';
      }
      
      await deliveryAgent.save();
    }

    logDelivery('REJECT_ORDER_SUCCESS', { 
      orderId, 
      agentId,
      orderNumber: order.orderNumber,
      reason
    }, 'success');

    // 🎯 NEW: Send notification to admin
    try {
      if (global.emitToAdmin) {
        global.emitToAdmin('order-rejected', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            id: agentId
          },
          customerName: order.user.name,
          reason: reason || 'No reason provided',
          message: `Order ${order.orderNumber} rejected by delivery agent ${req.deliveryAgent.name}`
        });
      }
    } catch (notificationError) {
      logDelivery('ADMIN_NOTIFICATION_FAILED', { 
        orderId, 
        error: notificationError.message 
      }, 'warning');
    }

    // 🎯 NEW: Send notification to seller
    try {
      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'order-rejected-by-agent', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          deliveryAgent: {
            name: req.deliveryAgent.name,
            vehicleType: deliveryAgent?.vehicleType || 'N/A'
          },
          reason: reason || 'No reason provided',
          message: `Order ${order.orderNumber} has been rejected by delivery agent ${req.deliveryAgent.name}`
        });
      }
    } catch (notificationError) {
      logDelivery('SELLER_NOTIFICATION_FAILED', { 
        orderId, 
        error: notificationError.message 
      }, 'warning');
    }

    res.status(200).json({
      success: true,
      message: 'Order rejected successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: 'rejected',
        reason: reason || 'No reason provided',
        rejectedAt: new Date(),
        message: 'Order has been rejected and will be reassigned to another agent'
      }
    });

  } catch (error) {
    logDeliveryError('REJECT_ORDER', error, { 
      orderId: req.params.id, 
      agentId: req.deliveryAgent?.id 
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to reject order'
    });
  }
};

module.exports = {
  registerDeliveryAgent,
  loginDeliveryAgent,
  getDeliveryAgentProfile,
  updateDeliveryAgentProfile,
  getAvailableOrders,
  acceptOrder,
  bulkAcceptOrders,
  bulkRejectOrders,
  markReachedSellerLocation,
  completePickup,
  markReachedLocation,
  generateCODQR,
  checkCODPaymentStatus,
  completeDelivery,
  updateLocation,
  getAssignedOrders,
  getDeliveryStats,
  toggleAvailability,
  getDeliveryHistory,
  logoutDeliveryAgent,
  getOrderNotifications,
  rejectOrder
};
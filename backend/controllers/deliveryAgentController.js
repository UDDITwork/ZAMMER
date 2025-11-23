// backend/controllers/deliveryAgentController.js - COMPREHENSIVE LOGGING DELIVERY AGENT CONTROLLER
// 🚚 ENHANCED: Comprehensive logging for all delivery operations

const mongoose = require('mongoose');
const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const OtpVerification = require('../models/OtpVerification');
const User = require('../models/User'); // 🎯 EXACT MATCH: Import User model like buyer side
const msg91Config = require('../config/msg91');
const msg91Service = require('../services/msg91Service'); // 🎯 EXACT MATCH: Import msg91Service at top level like buyer side (userController.js line 10)
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

      // COD orders are those that are NOT prepaid (isPaid === false)
      if (!order.isPaid) {
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
          nextStep: !order.isPaid
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
    // COD orders are those that are NOT prepaid (isPaid === false)
    let paymentData = {};
    
    if (!order.isPaid) {
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
        nextStep: !order.isPaid
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
    // 🎯 CRITICAL: Populate user EXACTLY like buyer side does (line 45 in paymentController.js)
    const order = await Order.findById(orderId)
      .populate('user') // 🎯 EXACT MATCH: Buyer side uses .populate('user') without field selection
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
    // COD orders are those that are NOT prepaid (isPaid === false)
    // Prepaid orders (SMEPay, Cashfree) have isPaid === true
    const isCOD = !order.isPaid;
    
    if (!isCOD) {
      logDeliveryError('GENERATE_QR_NOT_COD', new Error('Order is not COD'), { 
        orderId, 
        paymentMethod: order.paymentMethod,
        isPaid: order.isPaid,
        paymentStatus: order.paymentStatus
      });
      return res.status(400).json({
        success: false,
        message: `QR code generation is only available for COD orders. This order is already paid (prepaid payment method: ${order.paymentMethod || 'unknown'}).`,
        code: 'NOT_COD_ORDER',
        orderPaymentMethod: order.paymentMethod,
        isPaid: order.isPaid
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
          orderSlug: existingQR.orderSlug,
          amount: existingQR.amount || order.totalAmount || order.totalPrice,
          currency: 'INR',
          status: existingQR.status || 'pending'
        }
      });
    }
    
    // 🎯 STEP 1: Check for existing slug in multiple places BEFORE creating new order
    // Priority: 1) order.smepayOrderSlug, 2) order.paymentAttempts[], 3) order.paymentResult.smepay_order_slug
    let orderSlug = order.smepayOrderSlug;
    
    // If slug not in main field, check paymentAttempts array
    if (!orderSlug && order.paymentAttempts && Array.isArray(order.paymentAttempts)) {
      const smepayAttempt = order.paymentAttempts
        .filter(attempt => attempt.gateway === 'smepay' && attempt.orderSlug)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]; // Get most recent
      
      if (smepayAttempt && smepayAttempt.orderSlug) {
        orderSlug = smepayAttempt.orderSlug;
        console.log('✅ Found existing slug in paymentAttempts:', orderSlug);
        logDelivery('SLUG_RECOVERED_FROM_PAYMENT_ATTEMPTS', { orderId, slug: orderSlug });
        
        // 🎯 CRITICAL: Save recovered slug to main field for future use
        order.smepayOrderSlug = orderSlug;
        await order.save();
        console.log('✅ Recovered slug saved to order.smepayOrderSlug');
      }
    }
    
    // If still not found, check paymentResult
    if (!orderSlug && order.paymentResult?.smepay_order_slug) {
      orderSlug = order.paymentResult.smepay_order_slug;
      console.log('✅ Found existing slug in paymentResult:', orderSlug);
      logDelivery('SLUG_RECOVERED_FROM_PAYMENT_RESULT', { orderId, slug: orderSlug });
      
      // 🎯 CRITICAL: Save recovered slug to main field
      order.smepayOrderSlug = orderSlug;
      await order.save();
      console.log('✅ Recovered slug saved to order.smepayOrderSlug');
    }
    
    // 🎯 If slug exists, try to generate QR from it (skip order creation)
    if (orderSlug) {
      console.log('✅ Using existing SMEPay order slug:', orderSlug);
      logDelivery('GENERATE_QR_FROM_EXISTING_SLUG', { orderId, slug: orderSlug });
      
      try {
        const smepayService = require('../services/smepayService');
        const orderAmount = order.totalAmount || order.totalPrice;
        
        // Generate QR directly from existing slug
        const qrData = await smepayService.generateQRFromSlug({
          slug: orderSlug,
          amount: Number(orderAmount)
        });
        
        if (qrData && qrData.success) {
          // 🎯 CRITICAL: Store QR payment details in order
          if (!order.paymentDetails) order.paymentDetails = {};
          order.paymentDetails.codQR = {
            paymentId: qrData.paymentId || orderSlug,
            orderSlug: orderSlug,
            qrCode: qrData.qrCode,
            qrData: qrData.qrData,
            amount: orderAmount,
            generatedAt: new Date(),
            generatedBy: agentId,
            status: 'pending'
          };
          order.paymentDetails.paymentMethod = 'COD';
          order.paymentDetails.amount = orderAmount;
          
          // 🎯 CRITICAL: Ensure slug is saved to main field (in case it was only in paymentAttempts)
          if (!order.smepayOrderSlug) {
            order.smepayOrderSlug = orderSlug;
          }
          
          await order.save();
          
          logDelivery('GENERATE_QR_FROM_SLUG_SUCCESS', { orderId, slug: orderSlug }, 'success');
          
          return res.status(200).json({
            success: true,
            message: 'QR code generated from existing order',
            data: {
              _id: order._id,
              orderNumber: order.orderNumber,
              qrCode: qrData.qrCode,
              qrData: qrData.qrData,
              paymentId: qrData.paymentId || orderSlug,
              orderSlug: orderSlug,
              amount: orderAmount,
              currency: 'INR',
              status: 'pending'
            }
          });
        }
      } catch (slugError) {
        console.error('❌ Failed to generate QR from existing slug:', slugError);
        logDeliveryError('GENERATE_QR_FROM_SLUG_FAILED', slugError, { orderId, slug: orderSlug });
        // Continue to try creating new order if slug doesn't work
      }
    }

    // 🎯 VALIDATION: Check amount and order number before generating QR
    // Note: orderAmount is already defined above if slug exists, but we need it here too for the creation path
    const orderAmount = order.totalAmount || order.totalPrice;
    const orderNumber = order.orderNumber;
    
    // Validate amount
    if (!orderAmount || orderAmount <= 0 || isNaN(orderAmount)) {
      logDeliveryError('GENERATE_QR_INVALID_AMOUNT', new Error('Invalid order amount'), { 
        orderId,
        totalAmount: order.totalAmount,
        totalPrice: order.totalPrice,
        calculatedAmount: orderAmount
      });
      return res.status(400).json({
        success: false,
        message: 'Order amount is invalid or missing. Cannot generate QR code.',
        code: 'INVALID_AMOUNT'
      });
    }
    
    // Validate order number
    if (!orderNumber || typeof orderNumber !== 'string' || orderNumber.trim() === '') {
      logDeliveryError('GENERATE_QR_INVALID_ORDER_NUMBER', new Error('Invalid order number'), { 
        orderId,
        orderNumber: order.orderNumber
      });
      return res.status(400).json({
        success: false,
        message: 'Order number is invalid or missing. Cannot generate QR code.',
        code: 'INVALID_ORDER_NUMBER'
      });
    }
    
    // 🎯 LOG: What we're sending to SMEPay
    console.log(`
📋 ===============================
   QR GENERATION DATA
===============================
💰 Amount: ₹${orderAmount}
📦 Order Number: ${orderNumber}
📝 Description: Payment for Order #${orderNumber}
===============================`);
    
    // 🎯 GENERATE QR CODE - FOLLOWING BUYER SIDE PATTERN (2-step process)
    try {
      const smepayService = require('../services/smepayService');
      const smepayConfig = require('../config/smepay');
      
      // 🎯 STEP 1: Create SMEPay order ONLY if slug doesn't exist
      // Note: orderSlug was already checked and recovered above, so if it's still null, we need to create
      if (!orderSlug) {
        console.log('📝 Step 1: Creating SMEPay order...');
        
        // 🎯 MATCH BUYER SIDE EXACTLY: Use MongoDB ObjectId as orderId (line 82 in paymentController.js)
        // 🎯 CRITICAL: Access user.email directly like buyer side (line 85) - user is already populated
        if (!order.user || !order.user.email) {
          throw new Error(`Customer email is missing for order ${order.orderNumber}. Cannot generate QR code.`);
        }
        
        const smepayOrderData = {
          orderId: order._id.toString(), // 🎯 EXACT MATCH: Buyer side line 82
          amount: Number(orderAmount),
        customerDetails: {
            email: order.user.email, // 🎯 EXACT MATCH: Buyer side line 85 (no optional chaining)
            mobile: order.user.mobileNumber, // 🎯 EXACT MATCH: Buyer side line 86
            name: order.user.name // 🎯 EXACT MATCH: Buyer side line 87
          },
          callbackUrl: smepayConfig.getCallbackURL('success') // 🎯 EXACT MATCH: Buyer side line 89
        };
        
        const smepayResult = await smepayService.createOrder(smepayOrderData);
        
        // 🎯 HANDLE 409 ERROR: Order already exists - try to recover slug from paymentAttempts
        if (!smepayResult.success && smepayResult.errorCode === 'ORDER_ALREADY_EXISTS') {
          console.log('⚠️ Order already exists in SMEPay (409). Checking paymentAttempts for existing slug...');
          logDelivery('ORDER_ALREADY_EXISTS_409', { orderId, error: smepayResult.error });
          
          // Try to find slug in paymentAttempts
          if (order.paymentAttempts && Array.isArray(order.paymentAttempts)) {
            const smepayAttempt = order.paymentAttempts
              .filter(attempt => attempt.gateway === 'smepay' && attempt.orderSlug)
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
            
            if (smepayAttempt && smepayAttempt.orderSlug) {
              orderSlug = smepayAttempt.orderSlug;
              console.log('✅ Recovered slug from paymentAttempts after 409 error:', orderSlug);
              logDelivery('SLUG_RECOVERED_AFTER_409', { orderId, slug: orderSlug });
              
              // 🎯 CRITICAL: Save recovered slug to main field
              order.smepayOrderSlug = orderSlug;
              await order.save();
              console.log('✅ Recovered slug saved to database');
            } else {
              // No slug found anywhere - this is a real problem
              throw new Error(`Order ID already exists in SMEPay, but no slug found in database. Please contact support. Order ID: ${order._id}`);
            }
          } else {
            throw new Error(`Order ID already exists in SMEPay, but no payment attempts found. Please contact support. Order ID: ${order._id}`);
          }
        } else if (!smepayResult.success) {
          // Other errors
          throw new Error(smepayResult.error || 'Failed to create SMEPay order');
        } else if (!smepayResult.orderSlug) {
          throw new Error('No order slug received from SMEPay');
        } else {
          // Success - got new slug
          orderSlug = smepayResult.orderSlug;
          
          // 🎯 CRITICAL: SAVE SLUG TO DATABASE IMMEDIATELY (like buyer side does)
          // Save to BOTH smepayOrderSlug AND paymentAttempts
          order.smepayOrderSlug = orderSlug;
          order.paymentGateway = 'smepay';
          order.paymentStatus = 'pending';
          
          // Add payment attempt to order history
          if (!order.paymentAttempts) {
            order.paymentAttempts = [];
          }
          order.paymentAttempts.push({
            gateway: 'smepay',
            orderSlug: orderSlug,
            amount: Number(orderAmount),
            status: 'initiated',
            createdAt: new Date()
          });
          
          // 🎯 CRITICAL: Save slug to database BEFORE generating QR
          await order.save();
          console.log('✅ Step 1 Complete: SMEPay order created, slug saved to database:', orderSlug);
        }
      } else {
        console.log('✅ Step 1 Skip: SMEPay order slug already exists:', orderSlug);
      }
      
      // 🎯 STEP 2: Generate QR code from slug - USE EXACT SAME METHOD AS generateDynamicQR
      // 🎯 CRITICAL: Use generateQRFromSlug which uses the EXACT same code as generateDynamicQR Step 2
      console.log('📝 Step 2: Generating QR code from slug...');
      const qrResult = await smepayService.generateQRFromSlug({
        slug: orderSlug,
        amount: Number(orderAmount)
      });
      
      if (!qrResult.success) {
        throw new Error(qrResult.error || 'Failed to generate QR code');
      }
      
      // 🎯 VALIDATE: Ensure we got QR code data (same validation as generateDynamicQR)
      if (!qrResult.qrCode && !qrResult.qrData) {
        throw new Error('SMEPay did not return QR code data in response');
      }
      
      // 🎯 CRITICAL: Ensure slug is saved to main field (in case it was recovered from paymentAttempts)
      if (!order.smepayOrderSlug && orderSlug) {
        order.smepayOrderSlug = orderSlug;
        console.log('✅ Ensuring slug is saved to order.smepayOrderSlug:', orderSlug);
      }
      
      // 🎯 Store QR payment details in order
      if (!order.paymentDetails) order.paymentDetails = {};
      order.paymentDetails.codQR = {
        paymentId: qrResult.paymentId || orderSlug,
        orderSlug: orderSlug,
        qrCode: qrResult.qrCode,
        qrData: qrResult.qrData,
        amount: orderAmount, // Use the orderAmount variable defined above
        generatedAt: new Date(),
        generatedBy: agentId,
        status: 'pending'
      };
      order.paymentDetails.paymentMethod = 'COD';
      order.paymentDetails.amount = orderAmount; // Use the orderAmount variable defined above
      
      // 🎯 CRITICAL: Ensure slug is also in paymentAttempts if not already there
      if (!order.paymentAttempts) {
        order.paymentAttempts = [];
      }
      
      if (Array.isArray(order.paymentAttempts)) {
        const hasSlugInAttempts = order.paymentAttempts.some(
          attempt => attempt.gateway === 'smepay' && attempt.orderSlug === orderSlug
        );
        
        if (!hasSlugInAttempts && orderSlug) {
          order.paymentAttempts.push({
            gateway: 'smepay',
            orderSlug: orderSlug,
            amount: Number(orderAmount),
            status: 'initiated',
            createdAt: new Date()
          });
          console.log('✅ Slug also saved to paymentAttempts array');
        }
      }
      
      // 🎯 CRITICAL: Save QR data AND slug to database
      await order.save();
      console.log('✅ Step 2 Complete: QR code generated and slug saved to database');
      
      // Prepare response data (matching buyer side format)
      const qrData = {
        paymentId: qrResult.paymentId || orderSlug,
        orderSlug: orderSlug,
        qrCode: qrResult.qrCode,
        qrData: qrResult.qrData,
        amount: order.totalAmount || order.totalPrice,
        currency: 'INR',
        status: 'pending'
      };

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
          orderSlug: qrData.orderSlug, // 🎯 CRITICAL: Include orderSlug for payment status checks
          amount: order.totalAmount || order.totalPrice,
          currency: qrData.currency || 'INR',
          expiryTime: qrData.expiryTime,
          status: 'pending'
        }
      });

    } catch (qrError) {
      // 🎯 ENHANCED ERROR LOGGING: Capture detailed error information
      const errorDetails = {
        orderId,
        orderNumber: orderNumber || 'N/A',
        amount: orderAmount || 'N/A',
        errorMessage: qrError.message,
        errorStack: qrError.stack,
        isAxiosError: qrError.isAxiosError || false,
        axiosStatus: qrError.response?.status,
        axiosStatusText: qrError.response?.statusText,
        axiosData: qrError.response?.data,
        axiosHeaders: qrError.response?.headers
      };
      
      logDeliveryError('GENERATE_QR_FAILED', qrError, errorDetails);
      
      console.error(`
❌ ===============================
   QR CODE GENERATION FAILED
===============================
📦 Order ID: ${orderId}
📋 Order Number: ${orderNumber || 'N/A'}
💰 Amount: ₹${orderAmount || 'N/A'}
❌ Error: ${qrError.message}
${qrError.isAxiosError ? `
🌐 API Response:
   Status: ${qrError.response?.status} ${qrError.response?.statusText}
   Data: ${JSON.stringify(qrError.response?.data, null, 2)}
` : ''}
===============================`);
      
      // 🎯 USER-FRIENDLY ERROR MESSAGE
      let errorMessage = 'Failed to generate QR code';
      if (qrError.isAxiosError && qrError.response?.data?.message) {
        errorMessage = qrError.response.data.message;
      } else if (qrError.message) {
        errorMessage = qrError.message;
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? qrError.message : 'QR generation service unavailable',
        code: 'QR_GENERATION_FAILED',
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
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
    
    // 🎯 CRITICAL: Log that endpoint was called
    console.log(`
🚨 ===============================
   CHECK_COD_PAYMENT_STATUS CALLED
===============================
📦 Order ID: ${orderId}
🚚 Agent ID: ${agentId}
⏰ Time: ${new Date().toISOString()}
===============================`);
    
    logDelivery('CHECK_COD_PAYMENT_STATUS_STARTED', { agentId, orderId });

    // 🎯 VALIDATION: Check if order exists and is assigned to this agent
    // 🎯 FIX: Refresh order from DB to ensure we have latest data including QR code
    let order = await Order.findById(orderId)
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

    // 🎯 VALIDATION: Check if order is COD
    // COD orders are those that are NOT prepaid (isPaid === false)
    // BUT: If order is already paid (isPaid === true), we should still allow checking to generate OTP
    // So we only block if it's a prepaid order (paymentMethod !== 'COD')
    if (order.isPaid && order.paymentMethod && order.paymentMethod !== 'COD') {
      return res.status(400).json({
        success: false,
        message: 'Payment status check is only available for COD orders. This order is already paid (prepaid).',
        code: 'NOT_COD_ORDER',
        isPaid: order.isPaid,
        paymentMethod: order.paymentMethod
      });
    }
    
    // 🎯 CRITICAL: If order is already paid (isPaid === true), generate OTP immediately
    // This handles cases where payment was confirmed via webhook but OTP wasn't sent yet
    if (order.isPaid === true) {
      console.log(`
🎯 ===============================
   ORDER ALREADY PAID - CHECKING OTP
===============================
📦 Order: ${order.orderNumber}
✅ isPaid: ${order.isPaid}
🔑 OTP Required: ${order.otpVerification?.isRequired || false}
✅ OTP Verified: ${order.otpVerification?.isVerified || false}
===============================`);
      
      // Skip payment validation if already paid, go directly to OTP generation
      const needsOTPGeneration = !order.otpVerification?.isRequired || 
        (order.otpVerification.isRequired && !order.otpVerification.isVerified);
      
      if (needsOTPGeneration) {
        // Generate OTP for already paid order
        let otpGenerated = false;
        let otpData = null;
        
        try {
          // 🎯 EXACT MATCH: Fetch user directly from User model (same as buyer side)
          const user = await User.findById(order.user._id || order.user);
          
          if (!user) {
            logDeliveryError('OTP_GENERATION_USER_NOT_FOUND', new Error('User not found'), {
              orderId: order._id,
              userId: order.user._id || order.user
            });
            // Continue without OTP - don't block response
          } else if (!user.mobileNumber) {
            logDeliveryError('OTP_GENERATION_MISSING_PHONE', new Error('User mobile number not found'), {
              orderId: order._id,
              userId: user._id,
              email: user.email
            });
            // Continue without OTP - don't block response
          } else if (!msg91Config.authKey || !msg91Config.loginTemplateId) {
            logDeliveryError('OTP_GENERATION_MSG91_CONFIG_MISSING', new Error('MSG91 configuration missing'), {
              hasAuthKey: !!msg91Config.authKey,
              hasLoginTemplateId: !!msg91Config.loginTemplateId
            });
            // Continue without OTP - don't block response
          } else {
            // Generate OTP
            console.log(`
🎯 ===============================
   AUTO-GENERATING OTP FOR PAID ORDER
===============================
📦 Order: ${order.orderNumber}
📞 Buyer Phone: ${user.mobileNumber} (from User model)
👤 Buyer Name: ${user.name}
💳 Payment Status: Already Paid (isPaid=true)
🔑 MSG91 Auth Key: ${msg91Config.authKey ? `${msg91Config.authKey.substring(0, 10)}...` : 'NOT_SET'}
🧾 MSG91 Login Template ID: ${msg91Config.loginTemplateId || 'NOT_SET'}
===============================`);
            
            otpData = await msg91Service.createDeliveryOTP({
              orderId: order._id,
              userId: user._id,
              deliveryAgentId: agentId,
              userPhone: user.mobileNumber,
              purpose: 'delivery_confirmation',
              deliveryLocation: {
                type: 'Point',
                coordinates: [0, 0]
              },
              notes: 'OTP generated for already paid COD order',
              orderNumber: order.orderNumber,
              userName: user.name
            });
            
            if (otpData?.success) {
              if (!order.otpVerification) order.otpVerification = {};
              order.otpVerification = {
                isRequired: true,
                otpId: otpData.otpId,
            generatedAt: new Date(),
                expiresAt: otpData.expiresAt,
                isVerified: false
          };
          
              otpGenerated = true;
          await order.save();
          
              console.log(`
✅ ===============================
   OTP GENERATED SUCCESSFULLY!
===============================
📱 OTP Sent to: ${user.mobileNumber}
🔑 OTP ID: ${otpData.otpId}
⏰ Expires At: ${otpData.expiresAt}
===============================`);
            }
          }
        } catch (otpError) {
          logDeliveryError('OTP_GENERATION_EXCEPTION', otpError, { 
            orderId: order._id,
            orderNumber: order.orderNumber,
            error: otpError.message
          });
        }
        
        // Return response for already paid order
        return res.status(200).json({
          success: true,
          message: 'Payment already confirmed',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            isPaymentSuccessful: true,
            paymentStatus: 'completed',
            isPaid: true,
            orderStatus: order.status,
            otpGenerated: otpGenerated,
            otpRequired: order.otpVerification?.isRequired || false,
            otpVerified: order.otpVerification?.isVerified || false
          }
        });
      } else {
        // OTP already generated or verified
        return res.status(200).json({
          success: true,
          message: 'Payment already confirmed',
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            isPaymentSuccessful: true,
            paymentStatus: 'completed',
            isPaid: true,
            orderStatus: order.status,
            otpGenerated: false,
            otpRequired: order.otpVerification?.isRequired || false,
            otpVerified: order.otpVerification?.isVerified || false
          }
        });
      }
    }

    // 🎯 CRITICAL FIX: Only check payment status, DO NOT regenerate QR code (exactly like buyer side)
    // Buyer side generates QR once and it stays the same until payment is confirmed
    // We should only check status, not regenerate QR during polling
    let codQR = order.paymentDetails?.codQR;
    
    // 🎯 FIX: If QR code doesn't exist, return error asking to generate it first (don't auto-generate)
    if (!codQR || !codQR.paymentId) {
      // Check if we have orderSlug but no QR code in DB
      if (order.smepayOrderSlug) {
        // We have slug but no QR in DB - this means QR was never generated or was lost
        // Return error asking agent to generate QR manually (don't auto-generate during status check)
      return res.status(400).json({
        success: false,
          message: 'QR code not found for this order. Please generate QR code first using the "Generate SMEPay QR Code" button.',
                code: 'QR_NOT_GENERATED',
          hasOrderSlug: true,
          orderSlug: order.smepayOrderSlug,
          suggestion: 'Click "Generate SMEPay QR Code" button to create QR code'
              });
          }
          
      // No QR and no slug - QR was never generated
          return res.status(400).json({
            success: false,
        message: 'QR code not generated for this order. Please generate QR code first using the "Generate SMEPay QR Code" button.',
            code: 'QR_NOT_GENERATED',
        suggestion: 'Click "Generate SMEPay QR Code" button to create QR code'
            });
          }
          
    // 🎯 EXACT MATCH: Use same fast-check logic as buyer side (fastConfirmSMEPayPayment)
    // If already paid, return immediately (like buyer side line 714)
    if (order.isPaid) {
      return res.status(200).json({
        success: true,
        message: 'Payment already confirmed',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          isPaymentSuccessful: true,
          paymentStatus: 'completed',
          isPaid: true,
          orderStatus: order.status
        }
      });
    }

    // 🎯 CHECK PAYMENT STATUS - Only validate if not already paid (exactly like buyer side)
    try {
      const smepayService = require('../services/smepayService');
      
      // 🎯 USE ORDER SLUG: For COD QR payments, use orderSlug for status checks (like buyer side)
      const orderSlug = codQR.orderSlug || order.smepayOrderSlug;
            
      if (!orderSlug) {
        return res.status(400).json({
          success: false,
          message: 'No SMEPay payment found for this order',
          code: 'NO_SMEPAY_SLUG'
        });
          }
          
      // 🚀 OPTIMIZED: Quick validation with cached results (exactly like buyer side line 737)
      const validateResult = await smepayService.validateOrder({
            slug: orderSlug,
          amount: codQR.amount || order.totalAmount || order.totalPrice
        });
        
      if (!validateResult.success) {
        logDelivery('CHECK_PAYMENT_STATUS_VALIDATION_FAILED', {
          orderId,
          error: validateResult.error
        }, 'error');

              return res.status(400).json({
                success: false,
          message: validateResult.error || 'Failed to confirm payment',
          code: 'VALIDATION_FAILED'
        });
      }
      
      // 🎯 EXACT MATCH: Use isPaymentSuccessful like buyer side (line 755 in paymentController.js)
      const isPaymentCompleted = validateResult.isPaymentSuccessful;
      
      // 🎯 AUTO-GENERATE OTP IF PAYMENT IS COMPLETED
      let otpGenerated = false;
      let otpData = null;
      
      // 🎯 UPDATE PAYMENT STATUS: EXACT MATCH with buyer side (lines 755-788 in paymentController.js)
      if (isPaymentCompleted && !order.isPaid) {
        console.log(`🎉 Payment confirmed for COD order: ${order.orderNumber}`);
        
        // 🎯 EXACT MATCH: Update payment status like buyer side
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentStatus = 'completed';
        
        // 🎯 EXACT MATCH: Create paymentResult object like buyer side (lines 762-767)
        order.paymentResult = {
          gateway: 'smepay',
          transactionId: validateResult.data?.transactionId || codQR.paymentId || 'smepay_' + Date.now(),
          paidAt: new Date(),
          paymentMethod: 'COD_QR'
        };
        
        // 🎯 EXACT MATCH: Add status history like buyer side (lines 769-786)
        if (!order.statusHistory || order.statusHistory.length === 0) {
          order.statusHistory = [];
        }
        
        const hasPaymentConfirmedHistory = order.statusHistory.some(
          h => h.notes && h.notes.includes('Payment confirmed')
        );
        
        if (!hasPaymentConfirmedHistory) {
          order.statusHistory.push({
            status: 'Pending',
            changedBy: 'system',
            changedAt: new Date(),
            notes: 'Payment confirmed via SMEPay COD QR, awaiting seller confirmation'
          });
        }
        
        // Update QR status
        if (order.paymentDetails?.codQR) {
          order.paymentDetails.codQR.status = 'completed';
          order.paymentDetails.codQR.paidAt = new Date();
        }
        
        // Update codPayment for backward compatibility
        if (!order.codPayment) order.codPayment = {};
        order.codPayment.transactionId = order.paymentResult.transactionId;
        
        // 🎯 CRITICAL: Save order to database after updating isPaid (exactly like buyer side)
        await order.save();
        console.log(`✅ Order ${order.orderNumber} saved with isPaid=true after SMEPay verification`);
        
        // 🎯 CRITICAL: Refresh order from DB to ensure we have latest data (including isPaid=true)
        // This ensures OTP generation sees the updated isPaid status
        order = await Order.findById(orderId)
          .populate('user', 'name mobileNumber email')
          .populate('seller', 'firstName shop');
        
        console.log(`🔄 Order refreshed from DB - isPaid: ${order.isPaid}`);
      }
      
      // 🎯 AUTO-GENERATE OTP IF PAYMENT IS COMPLETED AND OTP NOT ALREADY VERIFIED
      // Generate OTP if payment completed (from validation) OR order is already marked as paid (from webhook/previous check)
      // AND OTP not required yet OR required but not verified
      // 🎯 CRITICAL: Check order.isPaid AFTER potential update and refresh
      const needsOTPGeneration = (isPaymentCompleted || order.isPaid === true) && (
        !order.otpVerification?.isRequired || 
        (order.otpVerification.isRequired && !order.otpVerification.isVerified)
      );
      
      // 🎯 DEBUG: Log OTP generation condition check
      console.log(`
🔍 ===============================
   OTP GENERATION CONDITION CHECK
===============================
📦 Order: ${order.orderNumber}
💳 isPaymentCompleted: ${isPaymentCompleted}
✅ order.isPaid: ${order.isPaid}
🔑 needsOTPGeneration: ${needsOTPGeneration}
📋 OTP Required: ${order.otpVerification?.isRequired || false}
✅ OTP Verified: ${order.otpVerification?.isVerified || false}
===============================`);
      
      if (needsOTPGeneration && !order.otpVerification?.isVerified) {
        try {
          // 🎯 EXACT MATCH: msg91Service and User are already imported at top level (like buyer side)
          
          // 🎯 EXACT MATCH: Fetch user directly from User model (same as buyer side userController.js line 809/820)
          // Buyer side: user = await User.findOne({ email }) or User.findOne({ mobileNumber: { $in: searchVariants } })
          // Delivery side: Fetch user by userId from order
          const user = await User.findById(order.user._id || order.user);
          
          if (!user) {
            logDeliveryError('OTP_GENERATION_USER_NOT_FOUND', new Error('User not found'), {
              orderId: order._id,
              userId: order.user._id || order.user
            });
            return res.status(404).json({
              success: false,
              message: 'User not found. Cannot send OTP.',
              code: 'USER_NOT_FOUND'
            });
          }
          
          // 🎯 EXACT MATCH: Check if user has mobile number (same as buyer side userController.js line 839)
          if (!user.mobileNumber) {
            logDeliveryError('OTP_GENERATION_MISSING_PHONE', new Error('User mobile number not found'), {
              orderId: order._id,
              userId: user._id,
              email: user.email
            });
            return res.status(400).json({
              success: false,
              message: 'User account does not have a registered phone number. Cannot send OTP.',
              code: 'MISSING_PHONE_NUMBER'
            });
          }
          
          // 🎯 CRITICAL: Validate MSG91 configuration
          if (!msg91Config.authKey || !msg91Config.loginTemplateId) {
            logDeliveryError('OTP_GENERATION_MSG91_CONFIG_MISSING', new Error('MSG91 configuration missing'), {
              hasAuthKey: !!msg91Config.authKey,
              hasLoginTemplateId: !!msg91Config.loginTemplateId,
              authKeyFromEnv: !!process.env.MSG91_AUTH_KEY,
              loginTemplateIdFromEnv: !!process.env.LOGIN_TEMPLATE_ID
            });
            return res.status(500).json({
              success: false,
              message: 'MSG91 service not configured. Cannot send OTP.',
              code: 'MSG91_CONFIG_ERROR'
            });
          }
          
          console.log(`
🎯 ===============================
   AUTO-GENERATING OTP FOR COD
===============================
📦 Order: ${order.orderNumber}
📞 Buyer Phone: ${user.mobileNumber} (from User model - EXACT MATCH buyer side)
👤 Buyer Name: ${user.name}
💳 Payment Status: Completed
🔑 MSG91 Auth Key: ${msg91Config.authKey ? `${msg91Config.authKey.substring(0, 10)}...` : 'NOT_SET'}
🧾 MSG91 Login Template ID: ${msg91Config.loginTemplateId || 'NOT_SET'}
===============================`);
          
          // 🎯 EXACT MATCH: Use user.mobileNumber directly (same variable path as buyer side userController.js line 860)
          // Buyer side: await msg91Service.sendOTPForForgotPassword(user.mobileNumber, { userName: user.name, purpose: 'forgot_password' })
          // Delivery side: await msg91Service.sendOTPForForgotPassword(user.mobileNumber, { userName: user.name, purpose: 'delivery_confirmation', ... })
          otpData = await msg91Service.createDeliveryOTP({
            orderId: order._id,
            userId: user._id,
            deliveryAgentId: agentId,
            userPhone: user.mobileNumber, // 🎯 EXACT MATCH: Use user.mobileNumber (same variable path as buyer side)
            purpose: 'delivery_confirmation',
            deliveryLocation: {
              type: 'Point',
              coordinates: [0, 0]
            },
            notes: 'OTP generated after COD QR payment completion',
            orderNumber: order.orderNumber,
            userName: user.name // 🎯 EXACT MATCH: Use user.name (same variable path as buyer side)
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
📋 Request ID: ${otpData.requestId || 'N/A'}
===============================`);
          } else {
            // 🎯 CRITICAL: Log OTP generation failure
            logDeliveryError('OTP_GENERATION_FAILED', new Error(otpData?.error || 'Unknown error'), {
              orderId: order._id,
              orderNumber: order.orderNumber,
              buyerPhone: order.user.mobileNumber,
              error: otpData?.error
            });
            console.error(`
❌ ===============================
   OTP GENERATION FAILED!
===============================
📦 Order: ${order.orderNumber}
📞 Buyer Phone: ${order.user.mobileNumber}
❌ Error: ${otpData?.error || 'Unknown error'}
===============================`);
          }
        } catch (otpError) {
          logDeliveryError('OTP_GENERATION_EXCEPTION', otpError, { 
            orderId: order._id,
            orderNumber: order.orderNumber,
            buyerPhone: order.user?.mobileNumber,
            error: otpError.message,
            stack: otpError.stack?.substring(0, 300)
          });
          console.error(`
❌ ===============================
   OTP GENERATION EXCEPTION!
===============================
📦 Order: ${order.orderNumber}
📞 Buyer Phone: ${order.user?.mobileNumber || 'NOT_FOUND'}
❌ Error: ${otpError.message}
📋 Stack: ${otpError.stack?.substring(0, 200)}...
===============================`);
          // Continue even if OTP generation fails - payment status already saved
          otpData = { success: false, error: otpError.message };
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
      
      // 🎯 EXACT MATCH: Log success like buyer side (line 790 in paymentController.js)
      if (isPaymentCompleted && order.isPaid) {
        console.log(`
✅ ===============================
   COD PAYMENT CONFIRMED!
===============================
📦 Order: ${order.orderNumber}
💳 Payment ID: ${codQR.paymentId}
💰 Amount: ₹${codQR.amount || order.totalAmount || order.totalPrice}
✅ isPaid: ${order.isPaid}
📊 Payment Status: ${order.paymentStatus}
===============================`);
      }
      
      logDelivery('CHECK_COD_PAYMENT_STATUS_SUCCESS', { 
        agentId, 
        orderId,
        paymentStatus: validateResult.paymentStatus || 'pending',
        isPaymentCompleted,
        isPaid: order.isPaid,
        otpGenerated,
        processingTime: `${processingTime}ms`
      }, 'success');

      // 📤 SUCCESS RESPONSE - EXACT MATCH with buyer side format (lines 798-810 in paymentController.js)
      res.status(200).json({
        success: true,
        message: 'Payment confirmation completed', // 🎯 EXACT MATCH: Same message as buyer side
        data: {
          orderId: order._id, // 🎯 EXACT MATCH: Use orderId (not _id) like buyer side
          orderNumber: order.orderNumber,
          // 🎯 EXACT MATCH: Use same field names as buyer side (fast-confirm endpoint line 804)
          isPaymentSuccessful: isPaymentCompleted, // Primary field (matches buyer side exactly)
          paymentStatus: validateResult.paymentStatus || (isPaymentCompleted ? 'completed' : 'pending'),
          isPaid: order.isPaid, // 🎯 CRITICAL: Include isPaid like buyer side
          orderStatus: order.status, // 🎯 EXACT MATCH: Include orderStatus like buyer side
          // 🎯 DELIVERY-SPECIFIC: Additional fields for delivery agent workflow
          paymentId: codQR.paymentId,
          transactionId: validateResult.data?.transactionId || codQR.paymentId,
          amount: codQR.amount || order.totalAmount || order.totalPrice,
          paidAt: order.paidAt || new Date(),
          otpGenerated: otpGenerated,
          otpData: otpData ? {
            otpId: otpData.otpId,
            expiresAt: otpData.expiresAt,
            isVerified: otpData.isVerified || false
          } : null,
          smepayData: validateResult.data // 🎯 EXACT MATCH: Include smepayData like buyer side
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
    // COD orders are those that are NOT prepaid (isPaid === false)
    // Prepaid orders (SMEPay, Cashfree) have isPaid === true
    const isCOD = !order.isPaid;
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
      
      // 🎯 Verify OTP using MSG91 API directly (same as standalone verify endpoint)
      // Use verifyOTP() directly instead of verifyDeliveryOTP() to avoid database record dependency
      try {
        const msg91Service = require('../services/msg91Service');
        const msg91Config = require('../config/msg91');
        
        // Fetch user to get phone number
        const user = await User.findById(order.user._id || order.user);
        
        if (!user || !user.mobileNumber) {
          return res.status(400).json({
            success: false,
            message: 'Buyer phone number not found. Cannot verify OTP.',
            code: 'PHONE_NOT_FOUND'
          });
        }
        
        // 🎯 Verify OTP directly with MSG91 API (authoritative verification)
        const verifyResult = await msg91Service.verifyOTP({
          phoneNumber: user.mobileNumber, // Will be normalized inside verifyOTP
          otp: otpCode.trim() // 🎯 CRITICAL: Trim whitespace from OTP
        });
        
        if (!verifyResult.success) {
          logDeliveryError('DELIVERY_OTP_VERIFICATION_FAILED', new Error(verifyResult.message), { 
            orderId,
            buyerPhone: user.mobileNumber,
            otpLength: otpCode?.length
          });
          return res.status(400).json({
            success: false,
            message: verifyResult.message || 'Invalid OTP. Please check and try again.',
            code: 'OTP_VERIFICATION_FAILED'
          });
        }
        
        // Mark OTP as verified in order (will be saved later)
        order.otpVerification.isVerified = true;
        order.otpVerification.verifiedAt = new Date();
        
        console.log(`✅ OTP verified successfully via MSG91 for COD QR payment`);
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
      
      // 🎯 Verify OTP using MSG91 API directly (same as standalone verify endpoint)
      // Use verifyOTP() directly instead of verifyDeliveryOTP() to avoid database record dependency
      try {
        const msg91Service = require('../services/msg91Service');
        const msg91Config = require('../config/msg91');
        
        // Fetch user to get phone number
        const user = await User.findById(order.user._id || order.user);
        
        if (!user || !user.mobileNumber) {
          return res.status(400).json({
            success: false,
            message: 'Buyer phone number not found. Cannot verify OTP.',
            code: 'PHONE_NOT_FOUND'
          });
        }
        
        // 🎯 Verify OTP directly with MSG91 API (authoritative verification)
        const verifyResult = await msg91Service.verifyOTP({
          phoneNumber: user.mobileNumber, // Will be normalized inside verifyOTP
          otp: otpCode.trim() // 🎯 CRITICAL: Trim whitespace from OTP
        });
        
        if (!verifyResult.success) {
          logDeliveryError('DELIVERY_OTP_VERIFICATION_FAILED', new Error(verifyResult.message), { 
            orderId,
            buyerPhone: user.mobileNumber,
            otpLength: otpCode?.length
          });
          return res.status(400).json({
            success: false,
            message: verifyResult.message || 'Invalid OTP. Please check and try again.',
            code: 'OTP_VERIFICATION_FAILED'
          });
        }
        
        order.otpVerification.isVerified = true;
        order.otpVerification.verifiedAt = new Date();
        
        console.log(`✅ OTP verified successfully via MSG91 for COD cash payment`);
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
    else if (!isCOD && order.otpVerification?.isRequired) {
      const otpCode = req.body.otp;
      
      // Check if OTP is provided
      if (!otpCode || !otpCode.trim()) {
        logDeliveryError('DELIVERY_OTP_MISSING', new Error('OTP is required for prepaid order delivery'), { orderId });
        return res.status(400).json({
          success: false,
          message: 'OTP is required for delivery. Please enter the OTP sent to buyer.',
          code: 'OTP_REQUIRED'
        });
      }
      
      // Check if already verified
      if (order.otpVerification.isVerified) {
        console.log(`✅ OTP already verified for prepaid order`);
      } else {
        // 🎯 Verify OTP using MSG91 API directly (same as standalone verify endpoint)
        // Use verifyOTP() directly instead of verifyDeliveryOTP() to avoid database record dependency
        try {
          const msg91Service = require('../services/msg91Service');
          const msg91Config = require('../config/msg91');
          
          // Fetch user to get phone number
          const user = await User.findById(order.user._id || order.user);
          
          if (!user || !user.mobileNumber) {
            return res.status(400).json({
              success: false,
              message: 'Buyer phone number not found. Cannot verify OTP.',
              code: 'PHONE_NOT_FOUND'
            });
          }
          
          // 🎯 Verify OTP directly with MSG91 API (authoritative verification)
          const verifyResult = await msg91Service.verifyOTP({
            phoneNumber: user.mobileNumber, // Will be normalized inside verifyOTP
            otp: otpCode.trim() // 🎯 CRITICAL: Trim whitespace from OTP
          });
          
          if (!verifyResult.success) {
            logDeliveryError('DELIVERY_OTP_VERIFICATION_FAILED', new Error(verifyResult.message), { 
              orderId,
              buyerPhone: user.mobileNumber,
              otpLength: otpCode?.length
            });
            return res.status(400).json({
              success: false,
              message: verifyResult.message || 'Invalid OTP. Please check and try again.',
              code: 'OTP_VERIFICATION_FAILED'
            });
          }
          
          // Mark OTP as verified in order (will be saved later)
          order.otpVerification.isVerified = true;
          order.otpVerification.verifiedAt = new Date();
          
          console.log(`✅ OTP verified successfully via MSG91 for prepaid order`);
        } catch (otpError) {
          logDeliveryError('DELIVERY_OTP_VERIFICATION_ERROR', otpError, { orderId });
          return res.status(500).json({
            success: false,
            message: 'Failed to verify OTP. Please try again.',
            code: 'OTP_VERIFICATION_ERROR'
          });
        }
      }
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

// @desc    Get single order by ID for delivery agent (exactly like buyer side)
// @route   GET /api/delivery/orders/:id
// @access  Private (Delivery Agent)
const getOrderById = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('GET_ORDER_BY_ID_START', { agentId, orderId });

    // 🎯 CRITICAL: Fetch order with latest data from DB (no caching)
    // This ensures we get the most up-to-date isPaid and paymentStatus
    const order = await Order.findById(orderId)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      logDeliveryError('GET_ORDER_BY_ID_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is assigned to this agent
    const assignedAgentId = order.deliveryAgent?.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      logDeliveryError('GET_ORDER_BY_ID_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: assignedAgentId, 
        currentAgent: currentAgentId
      });
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you'
      });
    }

    // 🎯 DEBUG: Log payment status to verify what's being returned
    console.log(`
🔍 ===============================
   GET_ORDER_BY_ID - PAYMENT STATUS
===============================
📦 Order: ${order.orderNumber}
✅ isPaid: ${order.isPaid}
💳 paymentStatus: ${order.paymentStatus}
📅 paidAt: ${order.paidAt || 'NOT_SET'}
🔑 paymentResult: ${order.paymentResult ? 'EXISTS' : 'NOT_SET'}
📋 paymentDetails.codQR.status: ${order.paymentDetails?.codQR?.status || 'NOT_SET'}
===============================`);

    logDelivery('GET_ORDER_BY_ID_SUCCESS', { 
      agentId, 
      orderId, 
      orderNumber: order.orderNumber,
      isPaid: order.isPaid,
      paymentStatus: order.paymentStatus
    }, 'success');

    // 🎯 CRITICAL: Return order with all payment fields explicitly included
    // This ensures frontend receives isPaid and paymentStatus correctly
    return res.status(200).json({
      success: true,
      data: {
        ...order.toObject(), // Convert to plain object to ensure all fields are included
        isPaid: order.isPaid, // 🎯 EXPLICIT: Ensure isPaid is included
        paymentStatus: order.paymentStatus, // 🎯 EXPLICIT: Ensure paymentStatus is included
        paidAt: order.paidAt, // 🎯 EXPLICIT: Include paidAt
        paymentResult: order.paymentResult, // 🎯 EXPLICIT: Include paymentResult
        paymentDetails: order.paymentDetails // 🎯 EXPLICIT: Include paymentDetails
      }
    });
  } catch (error) {
    logDeliveryError('GET_ORDER_BY_ID_ERROR', error, { orderId: req.params.id });
    console.error('❌ Get Order By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    .sort({ 
      'deliveryAgent.acceptedAt': -1, // Newest accepted orders first
      'deliveryAgent.assignedAt': -1  // If not accepted, newest assigned first
    })
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

// @desc    Get cancelled orders for delivery agent  
// @route   GET /api/delivery/orders/cancelled
// @access  Private (Delivery Agent)
const getCancelledOrders = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    
    logDelivery('CANCELLED_ORDERS_REQUEST', { agentId });
    
    console.log(`
📋 ===============================
   FETCHING CANCELLED ORDERS
===============================
🚚 Agent: ${req.deliveryAgent.name}
🆔 Agent ID: ${agentId}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // 🎯 BUSINESS LOGIC: Get orders that were cancelled by this delivery agent
    // Note: deliveryAgent.agent is set to null after cancellation, so we check statusHistory
    // to find orders where this agent was involved and then cancelled
    const allCancelledOrders = await Order.find({
      status: 'Cancelled',
      'cancellationDetails.cancelledBy': 'delivery_agent'
    })
    .populate('user', 'name email mobileNumber')
    .populate('seller', 'firstName lastName email shop')
    .populate('orderItems.product', 'name images');
    
    // Filter to only include orders cancelled by this specific agent
    // We check if the cancelledByName matches the agent's name
    const agentName = req.deliveryAgent.name;
    const cancelledOrders = allCancelledOrders.filter(order => {
      // Check if cancellation was done by this agent (by name match)
      const cancelledByName = order.cancellationDetails?.cancelledByName || '';
      if (cancelledByName === agentName) {
        return true;
      }
      
      // Also check statusHistory for entries from this agent
      // Look for status history entries where changedBy is 'delivery_agent'
      // and the notes mention this agent's name
      const hasAgentHistory = order.statusHistory?.some(entry => 
        entry.changedBy === 'delivery_agent' && 
        entry.notes && 
        entry.notes.includes(agentName)
      );
      
      return hasAgentHistory;
    });
    
    // Sort by cancellation date (most recently cancelled first)
    cancelledOrders.sort((a, b) => {
      const aDate = a.cancellationDetails?.cancelledAt ? new Date(a.cancellationDetails.cancelledAt).getTime() : 0;
      const bDate = b.cancellationDetails?.cancelledAt ? new Date(b.cancellationDetails.cancelledAt).getTime() : 0;
      return bDate - aDate;
    });
    
    // Limit to 50 most recent
    const limitedCancelledOrders = cancelledOrders.slice(0, 50);

    console.log(`
✅ ===============================
   CANCELLED ORDERS FETCHED
===============================
📦 Orders Found: ${limitedCancelledOrders.length}
🚚 Agent: ${req.deliveryAgent.name}
📅 Time: ${new Date().toLocaleString()}
===============================`);

    const formattedOrders = limitedCancelledOrders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalPrice: order.totalPrice,
      deliveryFees: order.deliveryFees,
      
      // Customer information
      user: {
        name: order.user?.name || 'N/A',
        phone: order.user?.mobileNumber || 'N/A',
        email: order.user?.email || 'N/A'
      },
      
      // Seller information
      seller: {
        name: order.seller ? (order.seller.firstName + (order.seller.lastName ? ' ' + order.seller.lastName : '')) : 'N/A',
        shopName: order.seller?.shop?.name || 'Shop',
        email: order.seller?.email || 'N/A',
        phone: order.seller?.shop?.phoneNumber?.main || order.seller?.mobileNumber || 'N/A',
        address: order.seller?.shop?.address || 'Address not provided'
      },
      
      // Delivery information
      shippingAddress: order.shippingAddress,
      
      // Order items summary
      orderItems: (order.orderItems || []).map(item => ({
        name: item.name || item.product?.name || 'Product',
        quantity: item.quantity,
        image: item.image || item.product?.images?.[0] || '',
        size: item.size,
        color: item.color
      })),
      
      // Cancellation details
      cancellationDetails: {
        cancelledBy: order.cancellationDetails?.cancelledBy,
        cancelledAt: order.cancellationDetails?.cancelledAt,
        cancellationReason: order.cancellationDetails?.cancellationReason,
        cancelledByName: order.cancellationDetails?.cancelledByName
      },
      
      // Timeline information
      assignedAt: order.deliveryAgent?.assignedAt,
      acceptedAt: order.deliveryAgent?.acceptedAt,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      isPaid: order.isPaid
    }));

    res.status(200).json({
      success: true,
      message: 'Cancelled orders retrieved successfully',
      count: formattedOrders.length,
      data: formattedOrders
    });

  } catch (error) {
    logDeliveryError('CANCELLED_ORDERS_FAILED', error, { agentId: req.deliveryAgent?.id });
    console.error('❌ Get Cancelled Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cancelled orders',
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

// @desc    Manually send OTP to buyer for delivery confirmation
// @route   POST /api/delivery/orders/:id/send-otp
// @access  Private (Delivery Agent)
const sendDeliveryOTP = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('SEND_DELIVERY_OTP_START', { agentId, orderId });
    
    // Fetch order with user details
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check authorization
    const assignedAgentId = order.deliveryAgent?.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you'
      });
    }
    
    // Fetch user directly from User model (same as buyer side)
    const user = await User.findById(order.user._id || order.user);
    
    if (!user || !user.mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Buyer phone number not found. Cannot send OTP.'
      });
    }
    
    // Generate OTP using MSG91 service (same as buyer side forgot password)
    const otpResult = await msg91Service.sendOTPForForgotPassword(user.mobileNumber, {
      userName: user.name,
      purpose: 'delivery_confirmation',
      orderNumber: order.orderNumber
    });
    
    if (!otpResult.success) {
      logDeliveryError('SEND_DELIVERY_OTP_FAILED', new Error(otpResult.error), {
        orderId,
        buyerPhone: user.mobileNumber
      });
      
      return res.status(500).json({
        success: false,
        message: otpResult.error || 'Failed to send OTP. Please try again.'
      });
    }
    
    // Store OTP in order for verification
    if (!order.otpVerification) order.otpVerification = {};
    order.otpVerification.isRequired = true;
    order.otpVerification.generatedAt = new Date();
    order.otpVerification.isVerified = false;
    await order.save();
    
    logDelivery('SEND_DELIVERY_OTP_SUCCESS', {
      orderId,
      orderNumber: order.orderNumber,
      buyerPhone: `${user.mobileNumber.substring(0, 6)}****`
    }, 'success');
    
    res.status(200).json({
      success: true,
      message: 'OTP has been sent to buyer\'s registered phone number',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        phoneNumber: `${user.mobileNumber.substring(0, 6)}****${user.mobileNumber.slice(-2)}`
      }
    });
    
  } catch (error) {
    logDeliveryError('SEND_DELIVERY_OTP_ERROR', error, { orderId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify OTP from buyer for delivery confirmation
// @route   POST /api/delivery/orders/:id/verify-otp
// @access  Private (Delivery Agent)
const verifyDeliveryOTP = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    const { otp } = req.body;
    
    if (!otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit OTP'
      });
    }
    
    logDelivery('VERIFY_DELIVERY_OTP_START', { agentId, orderId });
    
    // Fetch order with user details
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check authorization
    const assignedAgentId = order.deliveryAgent?.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you'
      });
    }
    
    // Fetch user directly from User model
    const user = await User.findById(order.user._id || order.user);
    
    if (!user || !user.mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Buyer phone number not found. Cannot verify OTP.'
      });
    }
    
    // 🎯 CRITICAL: Import msg91Config for phone normalization
    const msg91Config = require('../config/msg91');
    
    // 🎯 DEBUG: Log phone number and OTP before verification
    const normalizedPhone = msg91Config.normalizePhoneNumber(user.mobileNumber);
    console.log(`
🔍 ===============================
   OTP VERIFICATION DEBUG
===============================
📦 Order: ${order.orderNumber}
📞 Buyer Phone (raw): ${user.mobileNumber}
📞 Buyer Phone (normalized): ${normalizedPhone}
📞 Buyer Phone (type): ${typeof user.mobileNumber}
📞 Buyer Phone (length): ${user.mobileNumber?.toString().length}
🔑 OTP Entered: ${otp}
🔑 OTP (trimmed): ${otp.trim()}
🔑 OTP Length: ${otp?.length}
===============================`);
    
    // 🎯 Verify OTP using MSG91 service (authoritative verification)
    // MSG91 API is the source of truth - it verifies against the OTP it sent
    const verifyResult = await msg91Service.verifyOTP({
      phoneNumber: user.mobileNumber, // Will be normalized inside verifyOTP
      otp: otp.trim() // 🎯 CRITICAL: Trim whitespace from OTP
    });
    
    // 🎯 DEBUG: Log verification result
    console.log(`
🔍 ===============================
   MSG91 VERIFICATION RESULT
===============================
✅ Success: ${verifyResult.success}
📝 Message: ${verifyResult.message}
📞 Phone: ${user.mobileNumber}
🔑 OTP: ${otp}
${verifyResult.error ? `❌ Error: ${JSON.stringify(verifyResult.error)}` : ''}
===============================`);
    
    if (!verifyResult.success) {
      logDeliveryError('VERIFY_DELIVERY_OTP_FAILED', new Error(verifyResult.message), {
        orderId,
        orderNumber: order.orderNumber,
        buyerPhone: user.mobileNumber,
        otpLength: otp?.length,
        verifyResult: verifyResult
      });
      
      return res.status(400).json({
        success: false,
        message: verifyResult.message || 'Invalid OTP. Please check the OTP and try again.',
        details: process.env.NODE_ENV === 'development' ? {
          phoneNumber: user.mobileNumber,
          otpLength: otp?.length,
          error: verifyResult.error
        } : undefined
      });
    }
    
    // Update order with verified OTP
    if (!order.otpVerification) order.otpVerification = {};
    order.otpVerification.isVerified = true;
    order.otpVerification.verifiedAt = new Date();
    order.otpVerification.verifiedBy = agentId;
    await order.save();
    
    logDelivery('VERIFY_DELIVERY_OTP_SUCCESS', {
      orderId,
      orderNumber: order.orderNumber
    }, 'success');
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        otpVerified: true
      }
    });
    
  } catch (error) {
    logDeliveryError('VERIFY_DELIVERY_OTP_ERROR', error, { orderId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Mark cash payment as collected (when "Payment Collected in Cash" is clicked)
// @route   POST /api/delivery/orders/:id/mark-cash-collected
// @access  Private (Delivery Agent)
const markCashPaymentCollected = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('MARK_CASH_PAYMENT_COLLECTED_START', { agentId, orderId });
    
    // Fetch order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check authorization
    const assignedAgentId = order.deliveryAgent?.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you'
      });
    }
    
    // Check if order is COD
    const isCOD = !order.isPaid;
    
    if (!isCOD) {
      return res.status(400).json({
        success: false,
        message: 'This order is not a COD order. Cash collection is only for COD orders.'
      });
    }
    
    // 🎯 MARK CASH PAYMENT AS COLLECTED
    if (!order.codPayment) order.codPayment = {};
    
    order.codPayment.isCollected = true;
    order.codPayment.collectedAt = new Date();
    order.codPayment.collectedAmount = order.totalAmount || order.totalPrice;
    order.codPayment.paymentMethod = 'cash';
    order.codPayment.collectedBy = agentId;
    
    // Mark as paid when cash is collected
    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentStatus = 'completed';
    
    await order.save();
    
    logDelivery('MARK_CASH_PAYMENT_COLLECTED_SUCCESS', {
      orderId,
      orderNumber: order.orderNumber,
      amount: order.codPayment.collectedAmount
    }, 'success');
    
    res.status(200).json({
      success: true,
      message: 'Cash payment marked as collected',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        codPayment: {
          isCollected: order.codPayment.isCollected,
          paymentMethod: order.codPayment.paymentMethod,
          collectedAt: order.codPayment.collectedAt,
          collectedAmount: order.codPayment.collectedAmount
        },
        isPaid: order.isPaid,
        paymentStatus: order.paymentStatus
      }
    });
    
  } catch (error) {
    logDeliveryError('MARK_CASH_PAYMENT_COLLECTED_ERROR', error, { orderId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to mark cash payment as collected',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Resend OTP to buyer for delivery confirmation
// @route   POST /api/delivery/orders/:id/resend-otp
// @access  Private (Delivery Agent)
const resendDeliveryOTP = async (req, res) => {
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('RESEND_DELIVERY_OTP_START', { agentId, orderId });
    
    // Fetch order with user details
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check authorization
    const assignedAgentId = order.deliveryAgent?.agent?.toString();
    const currentAgentId = agentId?.toString();
    
    if (assignedAgentId !== currentAgentId) {
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you'
      });
    }
    
    // Fetch user directly from User model
    const user = await User.findById(order.user._id || order.user);
    
    if (!user || !user.mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Buyer phone number not found. Cannot resend OTP.'
      });
    }
    
    // 🎯 FIX: Generate a NEW OTP instead of retrying the old one (which may be expired)
    // Use sendOTPForForgotPassword to generate a completely new OTP code
    const otpResult = await msg91Service.sendOTPForForgotPassword(user.mobileNumber, {
      userName: user.name,
      purpose: 'delivery_confirmation',
      orderNumber: order.orderNumber
    });
    
    if (!otpResult.success) {
      logDeliveryError('RESEND_DELIVERY_OTP_FAILED', new Error(otpResult.error), {
        orderId,
        buyerPhone: user.mobileNumber
      });
      
      return res.status(500).json({
        success: false,
        message: otpResult.error || 'Failed to resend OTP. Please try again.'
      });
    }
    
    // 🎯 FIX: Update order OTP verification status with new OTP generation
    if (!order.otpVerification) order.otpVerification = {};
    order.otpVerification.isRequired = true;
    order.otpVerification.generatedAt = new Date();
    order.otpVerification.isVerified = false;
    // 🎯 CRITICAL: Reset verification attempts when generating new OTP
    order.otpVerification.attempts = 0;
    await order.save();
    
    logDelivery('RESEND_DELIVERY_OTP_SUCCESS', {
      orderId,
      orderNumber: order.orderNumber,
      buyerPhone: `${user.mobileNumber.substring(0, 6)}****`
    }, 'success');
    
    res.status(200).json({
      success: true,
      message: 'OTP has been resent to buyer\'s registered phone number',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        phoneNumber: `${user.mobileNumber.substring(0, 6)}****${user.mobileNumber.slice(-2)}`
      }
    });
    
  } catch (error) {
    logDeliveryError('RESEND_DELIVERY_OTP_ERROR', error, { orderId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cancel order by delivery agent
// @route   PUT /api/delivery/orders/:id/cancel
// @access  Private (Delivery Agent)
const cancelOrder = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent._id || req.deliveryAgent.id;
    const orderId = req.params.id;
    const { cancellationReason } = req.body;
    
    logDelivery('CANCEL_ORDER_STARTED', { 
      agentId, 
      orderId,
      agentName: req.deliveryAgent.name,
      reason: cancellationReason || 'No reason provided'
    });
    
    console.log(`
📦 ===============================
   CANCEL ORDER BY DELIVERY AGENT
===============================
📋 Order ID: ${orderId}
🚚 Agent: ${req.deliveryAgent.name}
📝 Reason: ${cancellationReason || 'No reason provided'}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    // 🎯 VALIDATION: Check if cancellation reason is provided
    if (!cancellationReason || cancellationReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
        code: 'CANCELLATION_REASON_REQUIRED'
      });
    }

    // 🎯 VALIDATION: Check if order exists and is assigned to this agent
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      logDeliveryError('CANCEL_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
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
      logDeliveryError('CANCEL_ORDER_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgentId, 
        currentAgentId 
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this order',
        code: 'UNAUTHORIZED_AGENT'
      });
    }

    // 🎯 VALIDATION: Check if order can be cancelled (not already delivered or cancelled)
    if (order.status === 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an already delivered order',
        code: 'ORDER_ALREADY_DELIVERED'
      });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
        code: 'ORDER_ALREADY_CANCELLED'
      });
    }

    // 🎯 UPDATE: Cancel the order using the Order model's updateStatus method
    order._cancelledByName = req.deliveryAgent.name;
    await order.updateStatus('Cancelled', 'delivery_agent', cancellationReason.trim());

    // 🎯 UPDATE: Update delivery agent status
    order.deliveryAgent.status = 'rejected';
    order.deliveryAgent.rejectedAt = new Date();
    order.deliveryAgent.rejectionReason = `Order cancelled: ${cancellationReason.trim()}`;
    
    // 🎯 UPDATE: Reset delivery agent assignment so admin can reassign
    order.deliveryAgent.agent = null;
    order.deliveryAgent.assignedAt = null;
    order.deliveryAgent.status = 'unassigned';

    await order.save();

    // 🎯 UPDATE: Update delivery agent's order count
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    if (deliveryAgent) {
      // Decrement assigned orders count if it exists
      if (deliveryAgent.assignedOrdersCount > 0) {
        deliveryAgent.assignedOrdersCount -= 1;
      }
      await deliveryAgent.save();
    }

    const processingTime = Date.now() - startTime;
    
    logDelivery('CANCEL_ORDER_SUCCESS', {
      orderId,
      orderNumber: order.orderNumber,
      agentId,
      processingTime: `${processingTime}ms`
    });

    console.log(`
✅ ===============================
   ORDER CANCELLED SUCCESSFULLY
===============================
📦 Order: ${order.orderNumber}
🚚 Agent: ${req.deliveryAgent.name}
📝 Reason: ${cancellationReason}
⏱️ Processing Time: ${processingTime}ms
===============================`);

    // 📤 SUCCESS RESPONSE
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledBy: 'delivery_agent',
        cancelledAt: order.cancellationDetails.cancelledAt,
        cancellationReason: order.cancellationDetails.cancellationReason
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryError('CANCEL_ORDER_ERROR', error, {
      orderId: req.params.id,
      agentId: req.deliveryAgent?._id || req.deliveryAgent?.id,
      processingTime: `${processingTime}ms`
    });

    console.error(`
❌ ===============================
   ORDER CANCELLATION FAILED
===============================
📦 Order ID: ${req.params.id}
🚚 Agent: ${req.deliveryAgent?.name || 'Unknown'}
❌ Error: ${error.message}
⏱️ Processing Time: ${processingTime}ms
===============================`);

    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'CANCEL_ORDER_ERROR'
    });
  }
};

module.exports = {
  getOrderById,
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
  getCancelledOrders,
  getDeliveryStats,
  toggleAvailability,
  getDeliveryHistory,
  logoutDeliveryAgent,
  getOrderNotifications,
  rejectOrder,
  sendDeliveryOTP,
  verifyDeliveryOTP,
  resendDeliveryOTP,
  markCashPaymentCollected,
  cancelOrder
};
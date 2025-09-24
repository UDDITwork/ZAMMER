// backend/controllers/deliveryAgentController.js - FIXED VERSION
// 🚚 FIXED: Field mapping and proper error handling

// 🔥 CONTROLLER FILE LOADING TEST
console.log('🔥 CONTROLLER FILE LOADING - deliveryAgentController.js');
console.log('🔥 Available functions:', Object.keys(module.exports || {}));

const mongoose = require('mongoose'); // Add this if not already present
const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const OtpVerification = require('../models/OtpVerification');
const { generateDeliveryAgentToken, verifyDeliveryAgentToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    const agentId = req.deliveryAgent.id;
    
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
    const agentId = req.deliveryAgent.id;
    
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
    .populate('user', 'name phone')
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
        phone: order.user.phone
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
    const agentId = req.deliveryAgent.id;
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
      .populate('user', 'name phone')
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
    if (!order.deliveryAgent?.agent || order.deliveryAgent.agent.toString() !== agentId) {
      logDeliveryError('ORDER_NOT_ASSIGNED_TO_AGENT', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: order.deliveryAgent?.agent,
        currentAgent: agentId
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

    // Update delivery agent status
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    if (deliveryAgent) {
      deliveryAgent.stats.acceptedOrders += 1;
      deliveryAgent.stats.assignedOrders -= 1;
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
    if (global.emitToBuyer) {
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
          phone: order.user.phone
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
          _id: req.deliveryAgent.id,
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
    const agentId = req.deliveryAgent.id;
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
    const agentId = req.deliveryAgent.id;
    
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
    const agentId = req.deliveryAgent.id;
    
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
    const agentId = req.deliveryAgent.id;
    
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

// @desc    Complete order pickup from seller
// @route   PUT /api/delivery/orders/:id/pickup
// @access  Private (Delivery Agent)
const completePickup = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('PICKUP_COMPLETE_STARTED', { agentId, orderId });
    
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
      .populate('user', 'name phone')
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
    if (order.deliveryAgent.agent.toString() !== agentId) {
      logDeliveryError('PICKUP_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: order.deliveryAgent.agent, 
        currentAgent: agentId 
      });
      return res.status(403).json({
        success: false,
        message: 'Order is not assigned to you',
        code: 'UNAUTHORIZED_ORDER'
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
        global.emitToSeller(order.seller._id, 'order-pickup-completed', {
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
            phone: order.user.phone
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

// @desc    Complete order delivery to customer
// @route   PUT /api/delivery/orders/:id/delivery
// @access  Private (Delivery Agent)
const completeDelivery = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent.id;
    const orderId = req.params.id;
    
    logDelivery('DELIVERY_COMPLETE_STARTED', { agentId, orderId });
    
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
      .populate('user', 'name phone email')
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
    if (order.deliveryAgent.agent.toString() !== agentId) {
      logDeliveryError('DELIVERY_UNAUTHORIZED', new Error('Order not assigned to this agent'), { 
        orderId, 
        assignedAgent: order.deliveryAgent.agent, 
        currentAgent: agentId 
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

    if (order.deliveryAgent.status !== 'pickup_completed') {
      logDeliveryError('DELIVERY_PICKUP_NOT_COMPLETED', new Error('Pickup not completed yet'), { 
        orderId, 
        currentStatus: order.deliveryAgent.status 
      });
      return res.status(400).json({
        success: false,
        message: 'Order pickup must be completed before delivery',
        code: 'PICKUP_NOT_COMPLETED'
      });
    }

    // 🎯 OTP VERIFICATION: Check if OTP verification is required and completed
    if (order.otpVerification?.isRequired && !order.otpVerification?.isVerified) {
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
          deliveryAgent: {
            name: req.deliveryAgent.name,
            phone: req.deliveryAgent.phoneNumber
          }
        });
      }

      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'order-delivered', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryTime: deliveryTime,
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
  console.log('🟢 Agent ID:', req.deliveryAgent?.id);
  console.log('🟢 Request method:', req.method);
  console.log('🟢 Request URL:', req.originalUrl);
  
  console.log('🔥🔥🔥 NEW getAssignedOrders called - REAL IMPLEMENTATION LOADED! 🔥🔥🔥');
  
  try {
    const agentId = req.deliveryAgent.id;
    
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
    const assignedOrders = await Order.find({
      'deliveryAgent.agent': agentId,
      'deliveryAgent.status': { 
        $in: ['assigned', 'accepted', 'pickup_completed'] 
      },
      status: { $nin: ['Cancelled', 'Delivered'] }
    })
    .populate('user', 'name email mobileNumber')
    .populate('seller', 'firstName lastName email shop')
    .populate('orderItems.product', 'name images')
    .sort({ 'deliveryAgent.assignedAt': 1 }) // FIFO - oldest assignments first
    .limit(50); // Reasonable limit

    logDelivery('ASSIGNED_ORDERS_RETRIEVED', { 
      agentId, 
      orderCount: assignedOrders.length,
      statusBreakdown: assignedOrders.reduce((acc, order) => {
        acc[order.deliveryAgent.status] = (acc[order.deliveryAgent.status] || 0) + 1;
        return acc;
      }, {})
    });

    console.log(`
✅ ===============================
   ASSIGNED ORDERS FETCHED
===============================
📦 Orders Found: ${assignedOrders.length}
📊 Status Breakdown:
   - Assigned: ${assignedOrders.filter(o => o.deliveryAgent.status === 'assigned').length}
   - Accepted: ${assignedOrders.filter(o => o.deliveryAgent.status === 'accepted').length}  
   - Picked Up: ${assignedOrders.filter(o => o.deliveryAgent.status === 'pickup_completed').length}
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
        notes: order.pickup?.pickupNotes
      },
      
      delivery: {
        isCompleted: order.delivery?.isCompleted || false,
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
    const agentId = req.deliveryAgent.id;
    
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
    const agentId = req.deliveryAgent.id;
    
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
        .populate('user', 'name phone email')
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
        phone: order.user.phone,
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
    const agentId = req.deliveryAgent.id;
    
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
    const { orderIds } = req.body;
    const agentId = req.deliveryAgent.id;
    
    logDelivery('BULK_ACCEPT_ORDERS_START', { 
      orderIds: orderIds?.length || 0, 
      agentId,
      agentName: req.deliveryAgent.name
    });

    // Validate input
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required and must not be empty'
      });
    }

    // Find all orders that can be accepted
    const orders = await Order.find({
      _id: { $in: orderIds },
      'deliveryAgent.agent': agentId,
      'deliveryAgent.status': 'assigned',
      status: 'Pickup_Ready'
    }).populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('orderItems.product', 'name images');

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found that can be accepted. Orders must be assigned to you and in Pickup_Ready status.'
      });
    }

    const acceptedOrders = [];
    const failedAcceptances = [];

    // Process each order
    for (const order of orders) {
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

    // Update delivery agent status
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    if (acceptedOrders.length > 0) {
      deliveryAgent.status = 'assigned';
      deliveryAgent.currentOrder = acceptedOrders[0].orderId; // Set first order as current
      await deliveryAgent.save();
    }

    logDelivery('BULK_ACCEPT_ORDERS_SUCCESS', {
      agentId,
      agentName: req.deliveryAgent.name,
      totalOrders: orders.length,
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
          totalProcessed: orders.length,
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
    const { orderIds, reason } = req.body;
    const agentId = req.deliveryAgent.id;
    
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
    const orders = await Order.find({
      _id: { $in: orderIds },
      'deliveryAgent.agent': agentId,
      'deliveryAgent.status': 'assigned',
      status: 'Pickup_Ready'
    }).populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('orderItems.product', 'name images');

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No orders found that can be rejected. Orders must be assigned to you and in Pickup_Ready status.'
      });
    }

    const rejectedOrders = [];
    const failedRejections = [];

    // Process each order
    for (const order of orders) {
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
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    if (rejectedOrders.length > 0) {
      // Check if agent has any remaining assigned orders
      const remainingAssignedOrders = await Order.countDocuments({
        'deliveryAgent.agent': agentId,
        'deliveryAgent.status': { $in: ['assigned', 'accepted'] }
      });

      if (remainingAssignedOrders === 0) {
        deliveryAgent.status = 'available';
        deliveryAgent.currentOrder = null;
        await deliveryAgent.save();
      }
    }

    logDelivery('BULK_REJECT_ORDERS_SUCCESS', {
      agentId,
      agentName: req.deliveryAgent.name,
      totalOrders: orders.length,
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
          totalProcessed: orders.length,
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
    const agentId = req.deliveryAgent.id;
    
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
  completePickup,
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
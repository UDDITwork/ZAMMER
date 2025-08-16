// backend/controllers/deliveryAgentController.js - FIXED VERSION
// 🚚 FIXED: Field mapping and proper error handling

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

    // Find orders that are approved and ready for assignment
    const orders = await Order.find({
      'adminApproval.status': { $in: ['approved', 'auto_approved'] },
      'deliveryAgent.status': 'unassigned',
      status: { $nin: ['Cancelled', 'Delivered'] }
    })
    .populate('user', 'name phone')
    .populate('seller', 'firstName shop')
    .populate('orderItems.product', 'name images')
    .sort({ createdAt: 1 }) // FIFO basis
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

    // Format orders for delivery agent (hide sensitive info like order ID initially)
    const formattedOrders = orders.map(order => ({
      _id: order._id,
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

    // Check if order is available for assignment
    if (order.deliveryAgent.status !== 'unassigned') {
      logDeliveryError('ORDER_ALREADY_ASSIGNED', new Error('Order is no longer available'), { orderId, currentStatus: order.deliveryAgent.status, assignedTo: order.deliveryAgent.agent });
      return res.status(400).json({
        success: false,
        message: 'Order is no longer available'
      });
    }

    // Assign order to delivery agent
    await order.assignDeliveryAgent(agentId, null);

    // Update delivery agent status
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    deliveryAgent.stats.assignedOrders += 1;
    await deliveryAgent.save();

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

    // Now return order with orderNumber visible
    const responseOrder = {
      _id: order._id,
      orderNumber: order.orderNumber, // Now visible after acceptance
      status: order.status,
      totalPrice: order.totalPrice,
      deliveryFees: order.deliveryFees,
      user: {
        name: order.user.name,
        phone: order.user.phone
      },
      seller: {
        name: order.seller.firstName,
        shopName: order.seller.shop?.name,
        address: order.seller.shop?.address,
        phone: order.seller.phone
      },
      shippingAddress: order.shippingAddress,
      deliveryAgent: order.deliveryAgent
    };

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: responseOrder
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryError('ORDER_ACCEPT_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      orderId: req.params.id,
      processingTime: `${processingTime}ms`
    });
    console.error('❌ Accept Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
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
const updateDeliveryAgentProfile = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    logDelivery('PROFILE_UPDATE_STARTED', { agentId });
    
    // TODO: Implement profile update logic
    res.status(501).json({ 
      success: false, 
      message: 'Profile update not implemented yet',
      code: 'NOT_IMPLEMENTED'
    });
  } catch (error) {
    logDeliveryError('PROFILE_UPDATE_FAILED', error, { agentId: req.deliveryAgent?.id });
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const completePickup = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    const orderId = req.params.id;
    logDelivery('PICKUP_COMPLETE_STARTED', { agentId, orderId });
    
    // TODO: Implement pickup completion logic
    res.status(501).json({ 
      success: false, 
      message: 'Pickup completion not implemented yet',
      code: 'NOT_IMPLEMENTED'
    });
  } catch (error) {
    logDeliveryError('PICKUP_COMPLETE_FAILED', error, { agentId: req.deliveryAgent?.id });
    res.status(500).json({
      success: false,
      message: 'Pickup completion failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const completeDelivery = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    const orderId = req.params.id;
    logDelivery('DELIVERY_COMPLETE_STARTED', { agentId, orderId });
    
    // TODO: Implement delivery completion logic
    res.status(501).json({ 
      success: false, 
      message: 'Delivery completion not implemented yet',
      code: 'NOT_IMPLEMENTED'
    });
  } catch (error) {
    logDeliveryError('DELIVERY_COMPLETE_FAILED', error, { agentId: req.deliveryAgent?.id });
    res.status(500).json({
      success: false,
      message: 'Delivery completion failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getAssignedOrders = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    logDelivery('ASSIGNED_ORDERS_REQUEST', { agentId });
    
    // TODO: Implement assigned orders retrieval logic
    res.status(501).json({ 
      success: false, 
      message: 'Assigned orders retrieval not implemented yet',
      code: 'NOT_IMPLEMENTED'
    });
  } catch (error) {
    logDeliveryError('ASSIGNED_ORDERS_FAILED', error, { agentId: req.deliveryAgent?.id });
    res.status(500).json({
      success: false,
      message: 'Assigned orders retrieval failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getDeliveryStats = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    logDelivery('DELIVERY_STATS_REQUEST', { agentId });
    
    // TODO: Implement delivery stats retrieval logic
    res.status(501).json({ 
      success: false, 
      message: 'Delivery stats retrieval not implemented yet',
      code: 'NOT_IMPLEMENTED'
    });
  } catch (error) {
    logDeliveryError('DELIVERY_STATS_FAILED', error, { agentId: req.deliveryAgent?.id });
    res.status(500).json({
      success: false,
      message: 'Delivery stats retrieval failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const getDeliveryHistory = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    logDelivery('DELIVERY_HISTORY_REQUEST', { agentId });
    
    // TODO: Implement delivery history retrieval logic
    res.status(501).json({ 
      success: false, 
      message: 'Delivery history retrieval not implemented yet',
      code: 'NOT_IMPLEMENTED'
    });
  } catch (error) {
    logDeliveryError('DELIVERY_HISTORY_FAILED', error, { agentId: req.deliveryAgent?.id });
    res.status(500).json({
      success: false,
      message: 'Delivery history retrieval failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
  completePickup,
  completeDelivery,
  updateLocation,
  getAssignedOrders,
  getDeliveryStats,
  toggleAvailability,
  getDeliveryHistory,
  logoutDeliveryAgent
};
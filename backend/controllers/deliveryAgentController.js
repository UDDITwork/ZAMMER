// backend/controllers/deliveryAgentController.js - Complete Delivery Agent Management

const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const OtpVerification = require('../models/OtpVerification');
const { generateDeliveryAgentToken, verifyDeliveryAgentToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// 🚚 DELIVERY AGENT LOGGING UTILITIES
const logDeliveryAgent = (action, data, type = 'info') => {
  const timestamp = new Date().toISOString();
  const logColor = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[36m';
  const resetColor = '\x1b[0m';
  
  console.log(`${logColor}🚚 [DELIVERY-AGENT] ${timestamp} | ${action} | ${JSON.stringify(data)}${resetColor}`);
};

const logDeliveryAgentError = (action, error, additionalData = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`\x1b[31m🚚 [DELIVERY-AGENT-ERROR] ${timestamp} | ${action} | Error: ${error.message} | Stack: ${error.stack} | Data: ${JSON.stringify(additionalData)}\x1b[0m`);
};

// 🎯 VEHICLE TYPE MAPPING UTILITY
const mapVehicleType = (frontendType) => {
  const vehicleTypeMap = {
    // Frontend → Model Enum (now simplified since frontend sends correct values)
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
    logDeliveryAgent('REGISTRATION_STARTED', { 
      email: req.body.email, 
      name: req.body.name,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

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
      logDeliveryAgentError('REGISTRATION_VALIDATION_FAILED', new Error('Validation error'), { errors: errors.array() });
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      name,
      email,
      password,
      phone,
      address,
      vehicleType,
      vehicleModel,
      vehicleRegistration,
      licenseNumber,
      workingAreas,
      emergencyContact
    } = req.body;

    // Check if agent already exists
    logDeliveryAgent('CHECKING_EXISTING_AGENT', { email });
    const agentExists = await DeliveryAgent.findOne({ 
      $or: [{ email }, { phoneNumber: phone }] 
    });

    if (agentExists) {
      logDeliveryAgentError('REGISTRATION_DUPLICATE_EMAIL', new Error('Delivery agent already exists with this email or phone'), { email, phone });
      return res.status(400).json({
        success: false,
        message: 'Delivery agent already exists with this email or phone'
      });
    }

    // ✅ Map vehicle type from frontend to model enum
    const mappedVehicleType = mapVehicleType(vehicleType);
    
    logDeliveryAgent('VEHICLE_TYPE_MAPPING', { 
      original: vehicleType, 
      mapped: mappedVehicleType 
    });

    console.log(`🚗 Vehicle Type Mapping: "${vehicleType}" → "${mappedVehicleType}"`);

    // Create new delivery agent
    logDeliveryAgent('CREATING_DELIVERY_AGENT', { 
      email, 
      name, 
      vehicleType: mappedVehicleType,
      hasEmergencyContact: !!emergencyContact 
    });

    const deliveryAgent = await DeliveryAgent.create({
      name,
      email,
      password,
      phoneNumber: phone, // Map phone to phoneNumber
      address,
      vehicleDetails: {
        type: mappedVehicleType, // Use properly mapped vehicle type
        model: vehicleModel,
        registrationNumber: vehicleRegistration
      },
      documents: {
        licenseNumber
      },
      workingAreas: workingAreas || [],
      emergencyContact,
      profileCompletion: 85 // Initial completion percentage
    });

    if (deliveryAgent) {
      // 🎯 FIXED: Generate JWT token specifically for delivery agent
      const token = generateDeliveryAgentToken(deliveryAgent._id);

      logDeliveryAgent('REGISTRATION_SUCCESS', { 
        agentId: deliveryAgent._id,
        agentName: deliveryAgent.name,
        email: deliveryAgent.email,
        vehicleType: mappedVehicleType,
        processingTime: `${Date.now() - startTime}ms`,
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

      const responseData = {
        _id: deliveryAgent._id,
        name: deliveryAgent.name,
        email: deliveryAgent.email,
        phoneNumber: deliveryAgent.phoneNumber,
        isOnline: deliveryAgent.isOnline,
        isAvailable: deliveryAgent.isAvailable,
        vehicleDetails: deliveryAgent.vehicleDetails,
        token
      };

      res.status(201).json({
        success: true,
        data: responseData
      });
    } else {
      logDeliveryAgentError('REGISTRATION_FAILED', new Error('Invalid delivery agent data'), { email, name });
      res.status(400).json({
        success: false,
        message: 'Invalid delivery agent data'
      });
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryAgentError('REGISTRATION_FAILED', error, { 
      body: req.body,
      processingTime: `${processingTime}ms`
    });
    console.error('❌ Delivery Agent Registration Error:', error);
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
const loginDeliveryAgent = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logDeliveryAgent('LOGIN_ATTEMPT', { 
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
      logDeliveryAgentError('LOGIN_VALIDATION_FAILED', new Error('Validation error'), { errors: errors.array() });
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find delivery agent
    logDeliveryAgent('SEARCHING_AGENT', { email });
    const deliveryAgent = await DeliveryAgent.findOne({ email }).select('+password');

    if (!deliveryAgent) {
      logDeliveryAgentError('LOGIN_AGENT_NOT_FOUND', new Error('Invalid credentials'), { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if agent is blocked
    if (deliveryAgent.isBlocked) {
      logDeliveryAgentError('LOGIN_AGENT_BLOCKED', new Error('Account blocked'), { 
        agentId: deliveryAgent._id,
        reason: deliveryAgent.blockReason
      });
      return res.status(403).json({
        success: false,
        message: `Account blocked: ${deliveryAgent.blockReason}`
      });
    }

    // Match password
    logDeliveryAgent('VERIFYING_PASSWORD', { email, agentId: deliveryAgent._id });
    const isMatch = await deliveryAgent.matchPassword(password);

    if (!isMatch) {
      logDeliveryAgentError('LOGIN_INVALID_PASSWORD', new Error('Invalid credentials'), { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login and set online status
    deliveryAgent.lastLoginAt = new Date();
    deliveryAgent.lastActiveAt = new Date();
    deliveryAgent.isOnline = true;
    await deliveryAgent.save();

    // 🎯 FIXED: Generate JWT token specifically for delivery agent
    console.log('🔑 Generating JWT token for delivery agent:', deliveryAgent._id);
    const token = generateDeliveryAgentToken(deliveryAgent._id);
    console.log('✅ JWT token generated successfully');
    
    // ✅ Verify the token immediately to ensure it's valid
    const verification = verifyDeliveryAgentToken(token);
    
    if (!verification.success) {
      throw new Error(`Token verification failed: ${verification.error}`);
    }
    
    console.log('✅ Token verification successful:', { userId: verification.decoded.id });

    logDeliveryAgent('LOGIN_SUCCESS', { 
      agentId: deliveryAgent._id,
      agentName: deliveryAgent.name,
      processingTime: `${Date.now() - startTime}ms`,
      tokenGenerated: true
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

    const responseData = {
      _id: deliveryAgent._id,
      name: deliveryAgent.name,
      email: deliveryAgent.email,
      phoneNumber: deliveryAgent.phoneNumber,
      isOnline: deliveryAgent.isOnline,
      isAvailable: deliveryAgent.isAvailable,
      currentLocation: deliveryAgent.currentLocation,
      vehicleDetails: deliveryAgent.vehicleDetails,
      stats: deliveryAgent.stats,
      token
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryAgentError('LOGIN_FAILED', error, { 
      body: req.body,
      processingTime: `${processingTime}ms`
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
const getDeliveryAgentProfile = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    
    logDeliveryAgent('PROFILE_REQUEST', { agentId });

    const deliveryAgent = await DeliveryAgent.findById(agentId)
      .select('-password -resetPasswordToken');

    if (!deliveryAgent) {
      logDeliveryAgentError('PROFILE_AGENT_NOT_FOUND', new Error('Agent not found'), { agentId });
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    logDeliveryAgent('PROFILE_RETRIEVED', { agentId, email: deliveryAgent.email });

    res.status(200).json({
      success: true,
      data: deliveryAgent
    });
  } catch (error) {
    logDeliveryAgentError('PROFILE_RETRIEVAL_FAILED', error, { agentId: req.deliveryAgent?.id });
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
    
    logDeliveryAgent('AVAILABLE_ORDERS_REQUEST', { agentId });

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

    logDeliveryAgent('AVAILABLE_ORDERS_RETRIEVED', { 
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
    logDeliveryAgentError('AVAILABLE_ORDERS_FAILED', error, { agentId: req.deliveryAgent?.id });
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

    logDeliveryAgent('ORDER_ACCEPT_STARTED', { 
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
      logDeliveryAgentError('ACCEPT_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is available for assignment
    if (order.deliveryAgent.status !== 'unassigned') {
      logDeliveryAgentError('ORDER_ALREADY_ASSIGNED', new Error('Order is no longer available'), { orderId, currentStatus: order.deliveryAgent.status, assignedTo: order.deliveryAgent.agent });
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

    logDeliveryAgent('ORDER_ACCEPT_SUCCESS', { 
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
    logDeliveryAgentError('ORDER_ACCEPT_FAILED', error, { 
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

    logDeliveryAgent('UPDATE_LOCATION_STARTED', { agentId, latitude, longitude });

    if (!latitude || !longitude) {
      logDeliveryAgentError('UPDATE_LOCATION_MISSING_COORDINATES', new Error('Latitude and longitude are required'), { agentId, latitude: !!latitude, longitude: !!longitude });
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

    logDeliveryAgent('UPDATE_LOCATION_SUCCESS', { agentId, coordinates: [longitude, latitude] }, 'success');

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        currentLocation: deliveryAgent.currentLocation
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryAgentError('UPDATE_LOCATION_FAILED', error, { 
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
    
    logDeliveryAgent('TOGGLE_AVAILABILITY_STARTED', { agentId, currentStatus: req.deliveryAgent.isAvailable });

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

    logDeliveryAgent('TOGGLE_AVAILABILITY_SUCCESS', { agentId, newStatus: deliveryAgent.isAvailable, isOnline: deliveryAgent.isOnline }, 'success');

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
    logDeliveryAgentError('TOGGLE_AVAILABILITY_FAILED', error, { 
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
    
    logDeliveryAgent('DELIVERY_AGENT_LOGOUT_STARTED', { agentId });

    // Update agent status to offline
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    deliveryAgent.isOnline = false;
    deliveryAgent.isAvailable = false;
    deliveryAgent.lastActiveAt = new Date();
    await deliveryAgent.save();

    logDeliveryAgent('DELIVERY_AGENT_LOGOUT_SUCCESS', { agentId, agentName: req.deliveryAgent.name }, 'success');

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
    logDeliveryAgentError('DELIVERY_AGENT_LOGOUT_FAILED', error, { 
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

// Placeholder functions for other endpoints
const updateDeliveryAgentProfile = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const completePickup = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const completeDelivery = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getAssignedOrders = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getDeliveryStats = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
};

const getDeliveryHistory = async (req, res) => {
  res.status(501).json({ success: false, message: 'Not implemented yet' });
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
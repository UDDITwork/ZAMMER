// backend/controllers/deliveryAgentController.js - Complete Delivery Agent Management

const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const OtpVerification = require('../models/OtpVerification');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// 🎯 VEHICLE TYPE MAPPING UTILITY
const mapVehicleType = (frontendType) => {
  const vehicleTypeMap = {
    // Frontend → Model Enum ['Bicycle', 'Motorcycle', 'Scooter', 'Car', 'Van']
    'Bike': 'Bicycle',
    'bike': 'Bicycle',
    'Bicycle': 'Bicycle',
    'bicycle': 'Bicycle',
    
    'Motorcycle': 'Motorcycle',
    'motorcycle': 'Motorcycle',
    'Motorbike': 'Motorcycle',
    'motorbike': 'Motorcycle',
    
    'Scooter': 'Scooter',
    'scooter': 'Scooter',
    
    'Car': 'Car',
    'car': 'Car',
    
    'Van': 'Van',
    'van': 'Van',
    
    // Map truck to van since model doesn't have Truck
    'Truck': 'Van',
    'truck': 'Van'
  };
  
  return vehicleTypeMap[frontendType] || frontendType;
};

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

    // ✅ FIXED: Properly map vehicle type from frontend to model enum
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
        type: mappedVehicleType, // ✅ Use properly mapped vehicle type
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
      // Generate JWT token
      const token = generateToken(deliveryAgent._id);

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
        phone: deliveryAgent.phoneNumber,
        isOnline: deliveryAgent.isOnline,
        isAvailable: deliveryAgent.isAvailable,
        vehicleType: deliveryAgent.vehicleDetails.type,
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
    deliveryAgent.lastActiveAt = new Date();
    deliveryAgent.isOnline = true;
    await deliveryAgent.save();

    // Generate JWT token
    const token = generateToken(deliveryAgent._id);

    logDeliveryAgent('LOGIN_SUCCESS', { 
      agentId: deliveryAgent._id,
      agentName: deliveryAgent.name,
      processingTime: `${Date.now() - startTime}ms`,
      tokenGenerated: !!token
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
      phone: deliveryAgent.phoneNumber,
      isOnline: deliveryAgent.isOnline,
      isAvailable: deliveryAgent.isAvailable,
      currentLocation: deliveryAgent.currentLocation,
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

// @desc    Update delivery agent profile
// @route   PUT /api/delivery/profile
// @access  Private (Delivery Agent)
const updateDeliveryAgentProfile = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent.id;
    
    logDeliveryAgent('PROFILE_UPDATE_STARTED', { 
      agentId, 
      updateFields: Object.keys(req.body)
    });

    const deliveryAgent = await DeliveryAgent.findById(agentId);

    if (!deliveryAgent) {
      logDeliveryAgentError('PROFILE_UPDATE_AGENT_NOT_FOUND', new Error('Agent not found'), { agentId });
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'phoneNumber', 'address', 'vehicleDetails', 'documents', 
      'workingAreas', 'emergencyContact', 'bankDetails', 'workingHours'
    ];

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'vehicleDetails' || key === 'documents' || key === 'bankDetails') {
          deliveryAgent[key] = { ...deliveryAgent[key], ...req.body[key] };
        } else {
          deliveryAgent[key] = req.body[key];
        }
      }
    });

    // Update profile completion percentage
    deliveryAgent.profileCompletion = calculateProfileCompletion(deliveryAgent);

    const updatedAgent = await deliveryAgent.save();

    const processingTime = Date.now() - startTime;
    logDeliveryAgent('PROFILE_UPDATE_SUCCESS', { 
      agentId, 
      email: updatedAgent.email,
      processingTime: `${processingTime}ms`
    }, 'success');

    res.status(200).json({
      success: true,
      data: updatedAgent
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryAgentError('PROFILE_UPDATE_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      processingTime: `${processingTime}ms`
    });
    console.error('❌ Update Delivery Agent Profile Error:', error);
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
      // Don't show orderNumber until pickup
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
      estimatedDelivery: order.estimatedDelivery.estimatedAt
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
        phone: order.seller.phoneNumber
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

// @desc    Complete order pickup
// @route   PUT /api/delivery/orders/:id/pickup
// @access  Private (Delivery Agent)
const completePickup = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent.id;
    const orderId = req.params.id;
    const { orderIdVerification, pickupNotes, location } = req.body;

    logDeliveryAgent('COMPLETE_PICKUP_STARTED', { 
      agentId, 
      orderId,
      orderIdVerification 
    });

    console.log(`
📦 ===============================
   COMPLETING PICKUP
===============================
📋 Order ID: ${req.params.id}
🔢 Order ID Verification: ${orderIdVerification}
🚚 Agent: ${req.deliveryAgent.name}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const order = await Order.findById(orderId)
      .populate('user', 'name phone')
      .populate('seller', 'firstName shop phone');

    if (!order) {
      logDeliveryAgentError('PICKUP_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order is assigned to this agent
    if (order.deliveryAgent.agent?.toString() !== agentId.toString()) {
      logDeliveryAgentError('PICKUP_UNAUTHORIZED_AGENT', new Error('Order not assigned to you'), { orderId, assignedAgent: order.deliveryAgent.agent, currentAgent: agentId });
      return res.status(403).json({
        success: false,
        message: 'Order not assigned to you'
      });
    }

    // Verify order ID matches (security check)
    if (orderIdVerification !== order.orderNumber) {
      logDeliveryAgentError('PICKUP_ORDER_ID_MISMATCH', new Error('Order ID verification failed'), { orderId, providedOrderNumber: orderIdVerification, actualOrderNumber: order.orderNumber });
      return res.status(400).json({
        success: false,
        message: 'Order ID verification failed. Please check the order number.'
      });
    }

    // Complete pickup
    await order.completePickup({
      method: 'order_id',
      notes: pickupNotes || '',
      location: location || { type: 'Point', coordinates: [0, 0] }
    });

    // Update delivery agent stats
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    deliveryAgent.stats.completedPickups += 1;
    deliveryAgent.currentLocation = location || deliveryAgent.currentLocation;
    await deliveryAgent.save();

    logDeliveryAgent('COMPLETE_PICKUP_SUCCESS', { 
      agentId, 
      orderId,
      processingTime: `${Date.now() - startTime}ms`
    }, 'success');

    console.log(`
✅ ===============================
   PICKUP COMPLETED!
===============================
📦 Order: ${order.orderNumber}
🚚 Agent: ${req.deliveryAgent.name}
🏪 Seller: ${order.seller.firstName}
👤 Customer: ${order.user.name}
📍 Status: Out for Delivery
📅 Time: ${new Date().toLocaleString()}
===============================`);

    // Emit real-time notifications
    if (global.emitToBuyer) {
      global.emitToBuyer(order.user._id, 'order-picked-up', {
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
      global.emitToSeller(order.seller._id, 'order-picked-up', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryAgent: {
          name: req.deliveryAgent.name,
          phone: req.deliveryAgent.phoneNumber
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pickup completed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        pickupCompletedAt: order.pickup.completedAt
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryAgentError('COMPLETE_PICKUP_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      orderId: req.params.id,
      processingTime: `${processingTime}ms`
    });
    console.error('❌ Complete Pickup Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Complete order delivery
// @route   PUT /api/delivery/orders/:id/deliver
// @access  Private (Delivery Agent)
const completeDelivery = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const agentId = req.deliveryAgent.id;
    const orderId = req.params.id;
    const { 
      otp, 
      deliveryNotes, 
      recipientName, 
      location,
      codPayment 
    } = req.body;

    logDeliveryAgent('COMPLETE_DELIVERY_STARTED', { 
      agentId, 
      orderId,
      hasOTP: !!otp 
    });

    console.log(`
📦 ===============================
   COMPLETING DELIVERY
===============================
📋 Order ID: ${req.params.id}
🔢 OTP: ${otp ? '***' + otp.slice(-2) : 'Not provided'}
🚚 Agent: ${req.deliveryAgent.name}
👤 Recipient: ${recipientName || 'Not specified'}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const order = await Order.findById(orderId)
      .populate('user', 'name phone')
      .populate('seller', 'firstName shop phone')
      .populate('otpVerification.currentOTP');

    if (!order) {
      logDeliveryAgentError('DELIVERY_ORDER_NOT_FOUND', new Error('Order not found'), { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order is assigned to this agent
    if (order.deliveryAgent.agent?.toString() !== agentId.toString()) {
      logDeliveryAgentError('DELIVERY_UNAUTHORIZED_AGENT', new Error('Order not assigned to you'), { orderId, assignedAgent: order.deliveryAgent.agent, currentAgent: agentId });
      return res.status(403).json({
        success: false,
        message: 'Order not assigned to you'
      });
    }

    // Verify pickup was completed
    if (!order.pickup.isCompleted) {
      logDeliveryAgentError('DELIVERY_PICKUP_NOT_COMPLETED', new Error('Order pickup must be completed first'), { orderId });
      return res.status(400).json({
        success: false,
        message: 'Order pickup must be completed first'
      });
    }

    // OTP verification for delivery
    if (order.otpVerification.isRequired && otp) {
      const otpRecord = order.otpVerification.currentOTP;
      if (!otpRecord || !otpRecord.isValid() || otpRecord.otp !== otp) {
        logDeliveryAgentError('DELIVERY_OTP_VERIFICATION_FAILED', new Error('Invalid or expired OTP'), { orderId, providedOTP: otp ? '***' + otp.slice(-2) : 'none' });
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }
    }

    // Complete delivery
    await order.completeDelivery({
      notes: deliveryNotes || '',
      recipientName: recipientName || order.user.name,
      location: location || { type: 'Point', coordinates: [0, 0] },
      deliveryAgentId: agentId,
      codPayment: codPayment
    });

    // Update delivery agent stats
    const deliveryAgent = await DeliveryAgent.findById(agentId);
    deliveryAgent.stats.completedDeliveries += 1;
    deliveryAgent.stats.totalEarnings += order.deliveryFees.agentEarning;
    deliveryAgent.currentLocation = location || deliveryAgent.currentLocation;
    deliveryAgent.isAvailable = true; // Agent is now available for new orders
    await deliveryAgent.save();

    logDeliveryAgent('COMPLETE_DELIVERY_SUCCESS', { 
      agentId, 
      orderId,
      processingTime: `${Date.now() - startTime}ms`
    }, 'success');

    console.log(`
🎉 ===============================
   DELIVERY COMPLETED!
===============================
📦 Order: ${order.orderNumber}
🚚 Agent: ${req.deliveryAgent.name}
👤 Customer: ${order.user.name}
💰 COD: ${codPayment ? '₹' + codPayment.amount : 'N/A'}
🏆 Agent Earnings: ₹${order.deliveryFees.agentEarning}
📅 Time: ${new Date().toLocaleString()}
===============================`);

    // Emit real-time notifications
    if (global.emitToBuyer) {
      global.emitToBuyer(order.user._id, 'order-delivered', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveredAt: order.deliveredAt,
        deliveryAgent: {
          name: req.deliveryAgent.name
        }
      });
    }

    if (global.emitToSeller) {
      global.emitToSeller(order.seller._id, 'order-delivered', {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveredAt: order.deliveredAt,
        codCollected: !!codPayment
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery completed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveredAt: order.deliveredAt,
        earnings: order.deliveryFees.agentEarning
      }
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logDeliveryAgentError('COMPLETE_DELIVERY_FAILED', error, { 
      agentId: req.deliveryAgent?.id,
      orderId: req.params.id,
      processingTime: `${processingTime}ms`
    });
    console.error('❌ Complete Delivery Error:', error);
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

// @desc    Get delivery agent's assigned orders
// @route   GET /api/delivery/orders/assigned
// @access  Private (Delivery Agent)
const getAssignedOrders = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    
    logDeliveryAgent('GET_ASSIGNED_ORDERS_REQUEST', { agentId });

    const orders = await Order.find({
      'deliveryAgent.agent': agentId,
      status: { $nin: ['Delivered', 'Cancelled'] }
    })
    .populate('user', 'name phone')
    .populate('seller', 'firstName shop phone')
    .populate('orderItems.product', 'name images')
    .sort({ 'deliveryAgent.assignedAt': -1 });

    logDeliveryAgent('GET_ASSIGNED_ORDERS_RETRIEVED', { 
      agentId, 
      orderCount: orders.length 
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    logDeliveryAgentError('GET_ASSIGNED_ORDERS_FAILED', error, { agentId: req.deliveryAgent?.id });
    console.error('❌ Get Assigned Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get delivery agent statistics
// @route   GET /api/delivery/stats
// @access  Private (Delivery Agent)
const getDeliveryStats = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    
    logDeliveryAgent('GET_DELIVERY_STATS_REQUEST', { agentId });

    const deliveryAgent = await DeliveryAgent.findById(agentId);
    
    // Get recent orders stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayDeliveries = await Order.countDocuments({
      'deliveryAgent.agent': agentId,
      'delivery.completedAt': { $gte: todayStart },
      'delivery.isCompleted': true
    });

    const pendingOrders = await Order.countDocuments({
      'deliveryAgent.agent': agentId,
      status: { $nin: ['Delivered', 'Cancelled'] }
    });

    const stats = {
      ...deliveryAgent.stats,
      todayDeliveries,
      pendingOrders,
      profileCompletion: deliveryAgent.profileCompletion,
      averageRating: deliveryAgent.stats.averageRating,
      totalRatings: deliveryAgent.stats.customerRatingCount
    };

    logDeliveryAgent('GET_DELIVERY_STATS_RETRIEVED', { 
      agentId, 
      todayDeliveries,
      totalDeliveries: deliveryAgent.stats.completedDeliveries
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logDeliveryAgentError('GET_DELIVERY_STATS_FAILED', error, { agentId: req.deliveryAgent?.id });
    console.error('❌ Get Delivery Stats Error:', error);
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

// @desc    Get delivery history
// @route   GET /api/delivery/history
// @access  Private (Delivery Agent)
const getDeliveryHistory = async (req, res) => {
  try {
    const agentId = req.deliveryAgent.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    logDeliveryAgent('GET_DELIVERY_HISTORY_REQUEST', { agentId, page, limit });

    const orders = await Order.find({
      'deliveryAgent.agent': agentId,
      'delivery.isCompleted': true
    })
    .populate('user', 'name')
    .populate('seller', 'firstName shop')
    .select('orderNumber totalPrice deliveryFees delivery createdAt')
    .sort({ 'delivery.completedAt': -1 })
    .skip(skip)
    .limit(limit);

    const totalOrders = await Order.countDocuments({
      'deliveryAgent.agent': agentId,
      'delivery.isCompleted': true
    });

    logDeliveryAgent('GET_DELIVERY_HISTORY_RETRIEVED', { 
      agentId, 
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
    logDeliveryAgentError('GET_DELIVERY_HISTORY_FAILED', error, { agentId: req.deliveryAgent?.id });
    console.error('❌ Get Delivery History Error:', error);
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

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (agent) => {
  let completion = 0;
  const fields = [
    { field: 'name', weight: 10 },
    { field: 'email', weight: 10 },
    { field: 'phoneNumber', weight: 10 },
    { field: 'address', weight: 15 },
    { field: 'vehicleDetails.type', weight: 10 },
    { field: 'vehicleDetails.model', weight: 5 },
    { field: 'vehicleDetails.registrationNumber', weight: 10 },
    { field: 'documents.licenseNumber', weight: 15 },
    { field: 'bankDetails.accountNumber', weight: 10 },
    { field: 'emergencyContact.name', weight: 5 }
  ];

  fields.forEach(({ field, weight }) => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], agent);
    if (value && value.toString().trim() !== '') {
      completion += weight;
    }
  });

  return Math.min(completion, 100);
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
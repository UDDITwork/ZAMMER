// backend/controllers/deliveryAgentContoller.js - Complete Delivery Agent Management

const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const OtpVerification = require('../models/OtpVerification');
const { generateToken } = require('../utils/jwtToken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// Enhanced terminal logging for delivery operations
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [DELIVERY-CONTROLLER] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
  
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
      phone: req.body.phone
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
      terminalLog('DELIVERY_REGISTER_VALIDATION_ERROR', 'ERROR', errors.array());
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
    const agentExists = await DeliveryAgent.findOne({ 
      $or: [{ email }, { phone }] 
    });

    if (agentExists) {
      terminalLog('DELIVERY_AGENT_EXISTS', 'ERROR', {
        email,
        phone,
        existingAgentId: agentExists._id
      });
      return res.status(400).json({
        success: false,
        message: 'Delivery agent already exists with this email or phone'
      });
    }

    // Create new delivery agent
    const deliveryAgent = await DeliveryAgent.create({
      name,
      email,
      password,
      phone,
      address,
      vehicleDetails: {
        type: vehicleType,
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

      terminalLog('DELIVERY_AGENT_REGISTER_SUCCESS', 'SUCCESS', {
        agentId: deliveryAgent._id,
        agentName: deliveryAgent.name,
        email: deliveryAgent.email
      });

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
        phone: deliveryAgent.phone,
        isOnline: deliveryAgent.isOnline,
        isAvailable: deliveryAgent.isAvailable,
        token
      };

      res.status(201).json({
        success: true,
        data: responseData
      });
    } else {
      terminalLog('DELIVERY_AGENT_CREATE_FAILED', 'ERROR');
      res.status(400).json({
        success: false,
        message: 'Invalid delivery agent data'
      });
    }
  } catch (error) {
    terminalLog('DELIVERY_AGENT_REGISTER_ERROR', 'ERROR', {
      error: error.message,
      stack: error.stack
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
exports.loginDeliveryAgent = async (req, res) => {
  try {
    terminalLog('DELIVERY_AGENT_LOGIN_START', 'PROCESSING', {
      email: req.body.email
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
      terminalLog('DELIVERY_LOGIN_VALIDATION_ERROR', 'ERROR', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find delivery agent
    const deliveryAgent = await DeliveryAgent.findOne({ email }).select('+password');

    if (!deliveryAgent) {
      terminalLog('DELIVERY_AGENT_NOT_FOUND', 'ERROR', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if agent is blocked
    if (deliveryAgent.isBlocked) {
      terminalLog('DELIVERY_AGENT_BLOCKED', 'ERROR', {
        agentId: deliveryAgent._id,
        reason: deliveryAgent.blockReason
      });
      return res.status(403).json({
        success: false,
        message: `Account blocked: ${deliveryAgent.blockReason}`
      });
    }

    // Match password
    const isMatch = await deliveryAgent.matchPassword(password);

    if (!isMatch) {
      terminalLog('DELIVERY_AGENT_PASSWORD_MISMATCH', 'ERROR', { email });
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

    // Generate JWT token
    const token = generateToken(deliveryAgent._id);

    terminalLog('DELIVERY_AGENT_LOGIN_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      agentName: deliveryAgent.name
    });

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
      phone: deliveryAgent.phone,
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
      .select('-password -resetPasswordToken');

    if (!deliveryAgent) {
      terminalLog('DELIVERY_AGENT_PROFILE_NOT_FOUND', 'ERROR', {
        agentId: req.deliveryAgent._id
      });
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    terminalLog('GET_DELIVERY_AGENT_PROFILE_SUCCESS', 'SUCCESS', {
      agentId: deliveryAgent._id,
      agentName: deliveryAgent.name
    });

    res.status(200).json({
      success: true,
      data: deliveryAgent
    });
  } catch (error) {
    terminalLog('GET_DELIVERY_AGENT_PROFILE_ERROR', 'ERROR', {
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

// @desc    Update delivery agent profile
// @route   PUT /api/delivery/profile
// @access  Private (Delivery Agent)
exports.updateDeliveryAgentProfile = async (req, res) => {
  try {
    terminalLog('UPDATE_DELIVERY_AGENT_PROFILE', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      updateFields: Object.keys(req.body)
    });

    const deliveryAgent = await DeliveryAgent.findById(req.deliveryAgent._id);

    if (!deliveryAgent) {
      terminalLog('DELIVERY_AGENT_UPDATE_NOT_FOUND', 'ERROR', {
        agentId: req.deliveryAgent._id
      });
      return res.status(404).json({
        success: false,
        message: 'Delivery agent not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'phone', 'address', 'vehicleDetails', 'documents', 
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

    terminalLog('UPDATE_DELIVERY_AGENT_PROFILE_SUCCESS', 'SUCCESS', {
      agentId: updatedAgent._id,
      profileCompletion: updatedAgent.profileCompletion
    });

    res.status(200).json({
      success: true,
      data: updatedAgent
    });
  } catch (error) {
    terminalLog('UPDATE_DELIVERY_AGENT_PROFILE_ERROR', 'ERROR', {
      error: error.message
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
exports.getAvailableOrders = async (req, res) => {
  try {
    terminalLog('GET_AVAILABLE_ORDERS', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      agentLocation: req.deliveryAgent.currentLocation
    });

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

    terminalLog('GET_AVAILABLE_ORDERS_SUCCESS', 'SUCCESS', {
      agentId: req.deliveryAgent._id,
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
// @route   PUT /api/delivery/orders/:id/accept
// @access  Private (Delivery Agent)
exports.acceptOrder = async (req, res) => {
  try {
    terminalLog('ACCEPT_ORDER', 'PROCESSING', {
      orderId: req.params.id,
      agentId: req.deliveryAgent._id
    });

    console.log(`
📦 ===============================
   ACCEPTING ORDER
===============================
📋 Order ID: ${req.params.id}
🚚 Agent: ${req.deliveryAgent.name}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const order = await Order.findById(req.params.id)
      .populate('user', 'name phone')
      .populate('seller', 'firstName shop');

    if (!order) {
      terminalLog('ACCEPT_ORDER_NOT_FOUND', 'ERROR', {
        orderId: req.params.id
      });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is available for assignment
    if (order.deliveryAgent.status !== 'unassigned') {
      terminalLog('ORDER_ALREADY_ASSIGNED', 'ERROR', {
        orderId: req.params.id,
        currentStatus: order.deliveryAgent.status,
        assignedTo: order.deliveryAgent.agent
      });
      return res.status(400).json({
        success: false,
        message: 'Order is no longer available'
      });
    }

    // Assign order to delivery agent
    await order.assignDeliveryAgent(req.deliveryAgent._id, null);

    // Update delivery agent status
    const deliveryAgent = await DeliveryAgent.findById(req.deliveryAgent._id);
    deliveryAgent.stats.assignedOrders += 1;
    await deliveryAgent.save();

    terminalLog('ACCEPT_ORDER_SUCCESS', 'SUCCESS', {
      orderId: req.params.id,
      orderNumber: order.orderNumber,
      agentId: req.deliveryAgent._id
    });

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
          phone: req.deliveryAgent.phone
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
          phone: req.deliveryAgent.phone
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
    terminalLog('ACCEPT_ORDER_ERROR', 'ERROR', {
      orderId: req.params.id,
      agentId: req.deliveryAgent?._id,
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

// @desc    Complete order pickup
// @route   PUT /api/delivery/orders/:id/pickup
// @access  Private (Delivery Agent)
exports.completePickup = async (req, res) => {
  try {
    terminalLog('COMPLETE_PICKUP', 'PROCESSING', {
      orderId: req.params.id,
      agentId: req.deliveryAgent._id,
      orderIdVerification: req.body.orderIdVerification
    });

    const { orderIdVerification, pickupNotes, location } = req.body;

    console.log(`
📦 ===============================
   COMPLETING PICKUP
===============================
📋 Order ID: ${req.params.id}
🔢 Order ID Verification: ${orderIdVerification}
🚚 Agent: ${req.deliveryAgent.name}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const order = await Order.findById(req.params.id)
      .populate('user', 'name phone')
      .populate('seller', 'firstName shop phone');

    if (!order) {
      terminalLog('PICKUP_ORDER_NOT_FOUND', 'ERROR', {
        orderId: req.params.id
      });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order is assigned to this agent
    if (order.deliveryAgent.agent?.toString() !== req.deliveryAgent._id.toString()) {
      terminalLog('PICKUP_UNAUTHORIZED_AGENT', 'ERROR', {
        orderId: req.params.id,
        assignedAgent: order.deliveryAgent.agent,
        currentAgent: req.deliveryAgent._id
      });
      return res.status(403).json({
        success: false,
        message: 'Order not assigned to you'
      });
    }

    // Verify order ID matches (security check)
    if (orderIdVerification !== order.orderNumber) {
      terminalLog('PICKUP_ORDER_ID_MISMATCH', 'ERROR', {
        orderId: req.params.id,
        providedOrderNumber: orderIdVerification,
        actualOrderNumber: order.orderNumber
      });
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
    const deliveryAgent = await DeliveryAgent.findById(req.deliveryAgent._id);
    deliveryAgent.stats.completedPickups += 1;
    deliveryAgent.currentLocation = location || deliveryAgent.currentLocation;
    await deliveryAgent.save();

    terminalLog('COMPLETE_PICKUP_SUCCESS', 'SUCCESS', {
      orderId: req.params.id,
      orderNumber: order.orderNumber,
      agentId: req.deliveryAgent._id
    });

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
          phone: req.deliveryAgent.phone
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
          phone: req.deliveryAgent.phone
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
    terminalLog('COMPLETE_PICKUP_ERROR', 'ERROR', {
      orderId: req.params.id,
      agentId: req.deliveryAgent?._id,
      error: error.message
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
exports.completeDelivery = async (req, res) => {
  try {
    terminalLog('COMPLETE_DELIVERY', 'PROCESSING', {
      orderId: req.params.id,
      agentId: req.deliveryAgent._id,
      hasOTP: !!req.body.otp
    });

    const { 
      otp, 
      deliveryNotes, 
      recipientName, 
      location,
      codPayment 
    } = req.body;

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

    const order = await Order.findById(req.params.id)
      .populate('user', 'name phone')
      .populate('seller', 'firstName shop phone')
      .populate('otpVerification.currentOTP');

    if (!order) {
      terminalLog('DELIVERY_ORDER_NOT_FOUND', 'ERROR', {
        orderId: req.params.id
      });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order is assigned to this agent
    if (order.deliveryAgent.agent?.toString() !== req.deliveryAgent._id.toString()) {
      terminalLog('DELIVERY_UNAUTHORIZED_AGENT', 'ERROR', {
        orderId: req.params.id,
        assignedAgent: order.deliveryAgent.agent,
        currentAgent: req.deliveryAgent._id
      });
      return res.status(403).json({
        success: false,
        message: 'Order not assigned to you'
      });
    }

    // Verify pickup was completed
    if (!order.pickup.isCompleted) {
      terminalLog('DELIVERY_PICKUP_NOT_COMPLETED', 'ERROR', {
        orderId: req.params.id
      });
      return res.status(400).json({
        success: false,
        message: 'Order pickup must be completed first'
      });
    }

    // OTP verification for delivery
    if (order.otpVerification.isRequired && otp) {
      const otpRecord = order.otpVerification.currentOTP;
      if (!otpRecord || !otpRecord.isValid() || otpRecord.otp !== otp) {
        terminalLog('DELIVERY_OTP_VERIFICATION_FAILED', 'ERROR', {
          orderId: req.params.id,
          providedOTP: otp ? '***' + otp.slice(-2) : 'none'
        });
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
      deliveryAgentId: req.deliveryAgent._id,
      codPayment: codPayment
    });

    // Update delivery agent stats
    const deliveryAgent = await DeliveryAgent.findById(req.deliveryAgent._id);
    deliveryAgent.stats.completedDeliveries += 1;
    deliveryAgent.stats.totalEarnings += order.deliveryFees.agentEarning;
    deliveryAgent.currentLocation = location || deliveryAgent.currentLocation;
    deliveryAgent.isAvailable = true; // Agent is now available for new orders
    await deliveryAgent.save();

    terminalLog('COMPLETE_DELIVERY_SUCCESS', 'SUCCESS', {
      orderId: req.params.id,
      orderNumber: order.orderNumber,
      agentId: req.deliveryAgent._id,
      codCollected: !!codPayment
    });

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
    terminalLog('COMPLETE_DELIVERY_ERROR', 'ERROR', {
      orderId: req.params.id,
      agentId: req.deliveryAgent?._id,
      error: error.message
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
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const deliveryAgent = await DeliveryAgent.findById(req.deliveryAgent._id);
    deliveryAgent.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    deliveryAgent.lastActiveAt = new Date();

    await deliveryAgent.save();

    terminalLog('UPDATE_LOCATION_SUCCESS', 'SUCCESS', {
      agentId: req.deliveryAgent._id,
      coordinates: [longitude, latitude]
    });

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        currentLocation: deliveryAgent.currentLocation
      }
    });
  } catch (error) {
    terminalLog('UPDATE_LOCATION_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
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
exports.getAssignedOrders = async (req, res) => {
  try {
    terminalLog('GET_ASSIGNED_ORDERS', 'PROCESSING', {
      agentId: req.deliveryAgent._id
    });

    const orders = await Order.find({
      'deliveryAgent.agent': req.deliveryAgent._id,
      status: { $nin: ['Delivered', 'Cancelled'] }
    })
    .populate('user', 'name phone')
    .populate('seller', 'firstName shop phone')
    .populate('orderItems.product', 'name images')
    .sort({ 'deliveryAgent.assignedAt': -1 });

    terminalLog('GET_ASSIGNED_ORDERS_SUCCESS', 'SUCCESS', {
      agentId: req.deliveryAgent._id,
      orderCount: orders.length
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    terminalLog('GET_ASSIGNED_ORDERS_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
    });
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
exports.getDeliveryStats = async (req, res) => {
  try {
    terminalLog('GET_DELIVERY_STATS', 'PROCESSING', {
      agentId: req.deliveryAgent._id
    });

    const deliveryAgent = await DeliveryAgent.findById(req.deliveryAgent._id);
    
    // Get recent orders stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayDeliveries = await Order.countDocuments({
      'deliveryAgent.agent': req.deliveryAgent._id,
      'delivery.completedAt': { $gte: todayStart },
      'delivery.isCompleted': true
    });

    const pendingOrders = await Order.countDocuments({
      'deliveryAgent.agent': req.deliveryAgent._id,
      status: { $nin: ['Delivered', 'Cancelled'] }
    });

    const stats = {
      ...deliveryAgent.stats,
      todayDeliveries,
      pendingOrders,
      profileCompletion: deliveryAgent.profileCompletion,
      averageRating: deliveryAgent.rating.average,
      totalRatings: deliveryAgent.rating.count
    };

    terminalLog('GET_DELIVERY_STATS_SUCCESS', 'SUCCESS', {
      agentId: req.deliveryAgent._id,
      todayDeliveries,
      totalDeliveries: deliveryAgent.stats.completedDeliveries
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    terminalLog('GET_DELIVERY_STATS_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
    });
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
exports.toggleAvailability = async (req, res) => {
  try {
    terminalLog('TOGGLE_AVAILABILITY', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      currentStatus: req.deliveryAgent.isAvailable
    });

    const deliveryAgent = await DeliveryAgent.findById(req.deliveryAgent._id);
    deliveryAgent.isAvailable = !deliveryAgent.isAvailable;
    deliveryAgent.lastActiveAt = new Date();

    // If going offline, also set isOnline to false
    if (!deliveryAgent.isAvailable) {
      deliveryAgent.isOnline = false;
    } else {
      deliveryAgent.isOnline = true;
    }

    await deliveryAgent.save();

    terminalLog('TOGGLE_AVAILABILITY_SUCCESS', 'SUCCESS', {
      agentId: req.deliveryAgent._id,
      newStatus: deliveryAgent.isAvailable,
      isOnline: deliveryAgent.isOnline
    });

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
    terminalLog('TOGGLE_AVAILABILITY_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
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
exports.getDeliveryHistory = async (req, res) => {
  try {
    terminalLog('GET_DELIVERY_HISTORY', 'PROCESSING', {
      agentId: req.deliveryAgent._id,
      page: req.query.page || 1
    });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({
      'deliveryAgent.agent': req.deliveryAgent._id,
      'delivery.isCompleted': true
    })
    .populate('user', 'name')
    .populate('seller', 'firstName shop')
    .select('orderNumber totalPrice deliveryFees delivery createdAt')
    .sort({ 'delivery.completedAt': -1 })
    .skip(skip)
    .limit(limit);

    const totalOrders = await Order.countDocuments({
      'deliveryAgent.agent': req.deliveryAgent._id,
      'delivery.isCompleted': true
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

// @desc    Logout delivery agent
// @route   POST /api/delivery/logout
// @access  Private (Delivery Agent)
exports.logoutDeliveryAgent = async (req, res) => {
  try {
    terminalLog('DELIVERY_AGENT_LOGOUT', 'PROCESSING', {
      agentId: req.deliveryAgent._id
    });

    // Update agent status to offline
    const deliveryAgent = await DeliveryAgent.findById(req.deliveryAgent._id);
    deliveryAgent.isOnline = false;
    deliveryAgent.isAvailable = false;
    deliveryAgent.lastActiveAt = new Date();
    await deliveryAgent.save();

    terminalLog('DELIVERY_AGENT_LOGOUT_SUCCESS', 'SUCCESS', {
      agentId: req.deliveryAgent._id,
      agentName: req.deliveryAgent.name
    });

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
    terminalLog('DELIVERY_AGENT_LOGOUT_ERROR', 'ERROR', {
      agentId: req.deliveryAgent?._id,
      error: error.message
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
    { field: 'phone', weight: 10 },
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
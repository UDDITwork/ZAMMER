const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Seller = require('../models/Seller');
const invoiceGenerator = require('../utils/invoiceService');

// 🎯 Enhanced terminal logging for production monitoring
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [ORDER-BACKEND] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
  
  // Additional structured logging for production monitoring
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      timestamp,
      service: 'orderController',
      action,
      status,
      data
    }));
  }
};

// 🎯 FIXED: Generate unique order number with better error handling
const generateOrderNumber = async () => {
  try {
    terminalLog('ORDER_NUMBER_GENERATION_START', 'PROCESSING');
    console.log('🔢 Starting order number generation...');
    
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
    console.log('📅 Date string:', dateString);
    
    // 🎯 FIX: Use UTC dates for consistent search
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);
    
    console.log('🔍 UTC Search range:', { todayStart, todayEnd });
    
    // 🎯 FIX: Add retry logic for duplicate orderNumber
    let orderSequence = 1;
    let orderNumber;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const lastOrderToday = await Order.findOne({
        orderNumber: { $regex: `^ORD-${dateString}-` }
      }).sort({ orderNumber: -1 });
      
      console.log('📊 Last order found:', lastOrderToday?.orderNumber || 'None');
      
      if (lastOrderToday && lastOrderToday.orderNumber) {
        const lastSequence = parseInt(lastOrderToday.orderNumber.split('-')[2]);
        if (!isNaN(lastSequence)) {
          orderSequence = lastSequence + 1;
        }
      }
      
      const sequenceString = orderSequence.toString().padStart(3, '0');
      orderNumber = `ORD-${dateString}-${sequenceString}`;
      
      // 🎯 Check if this orderNumber already exists
      const existingOrder = await Order.findOne({ orderNumber });
      if (!existingOrder) {
        console.log('🎯 Generated unique order number:', orderNumber);
        break;
      }
      
      console.log(`⚠️ Order number ${orderNumber} exists, trying next...`);
      orderSequence++;
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique order number after maximum attempts');
    }
    
    return orderNumber;
    
  } catch (error) {
    console.error('❌ Order number generation error:', error);
    // Fallback with timestamp
    const fallbackNumber = `ORD-${Date.now()}`;
    console.log(`⚠️ Using fallback: ${fallbackNumber}`);
    return fallbackNumber;
  }
};

// 🎯 Enhanced: Emit real-time notification to seller with comprehensive logging
const emitOrderNotification = (sellerId, orderData, eventType = 'new-order') => {
  try {
    terminalLog('SOCKET_EMIT_SELLER_START', 'PROCESSING', {
      sellerId,
      eventType,
      orderNumber: orderData.orderNumber
    });

    // Check if Socket.io is available
    if (global.io && global.emitToSeller) {
      console.log(`📡 Emitting ${eventType} notification to seller: ${sellerId}`);
      
      // Use the new global function
      global.emitToSeller(sellerId, eventType, orderData);
      
      terminalLog('SOCKET_EMIT_SELLER_SUCCESS', 'SUCCESS', {
        sellerId,
        eventType,
        orderNumber: orderData.orderNumber,
        roomName: `seller-${sellerId}`
      });

      // 🎯 Enhanced success logging for real-time tracking
      if (eventType === 'new-order') {
        console.log(`
🔔 ===============================
   SELLER NOTIFICATION SENT!
===============================
🏪 Seller ID: ${sellerId}
📦 Order Number: ${orderData.orderNumber}
💰 Amount: ₹${orderData.totalPrice}
👤 Customer: ${orderData.user?.name}
🕐 Time: ${new Date().toLocaleString()}
📡 Socket Room: seller-${sellerId}
===============================`);
      }
      
    } else {
      terminalLog('SOCKET_EMIT_SELLER_ERROR', 'ERROR', {
        reason: 'socket_io_not_available',
        sellerId,
        eventType
      });
      console.warn('⚠️ Socket.io not available for seller notifications');
    }
  } catch (error) {
    terminalLog('SOCKET_EMIT_SELLER_ERROR', 'ERROR', {
      sellerId,
      eventType,
      error: error.message,
      stack: error.stack
    });
    console.error('❌ Error emitting seller notification:', error);
  }
};

// 🎯 NEW: Emit real-time notification to buyer
const emitBuyerNotification = (userId, orderData, eventType = 'order-status-update') => {
  try {
    terminalLog('SOCKET_EMIT_BUYER_START', 'PROCESSING', {
      userId,
      eventType,
      orderNumber: orderData.orderNumber,
      status: orderData.status
    });

    // Check if Socket.io is available
    if (global.io && global.emitToBuyer) {
      console.log(`📡 Emitting ${eventType} notification to buyer: ${userId}`);
      
      // Use the new global function
      global.emitToBuyer(userId, eventType, orderData);
      
      terminalLog('SOCKET_EMIT_BUYER_SUCCESS', 'SUCCESS', {
        userId,
        eventType,
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        roomName: `buyer-${userId}`
      });
      
    } else {
      terminalLog('SOCKET_EMIT_BUYER_ERROR', 'ERROR', {
        reason: 'socket_io_not_available',
        userId,
        eventType
      });
      console.warn('⚠️ Socket.io not available for buyer notifications');
    }
  } catch (error) {
    terminalLog('SOCKET_EMIT_BUYER_ERROR', 'ERROR', {
      userId,
      eventType,
      error: error.message,
      stack: error.stack
    });
    console.error('❌ Error emitting buyer notification:', error);
  }
};

// 🎯 NEW: Send email notification to buyer
const sendEmailNotification = async (userEmail, orderData, eventType) => {
  try {
    terminalLog('EMAIL_NOTIFICATION_START', 'PROCESSING', {
      userEmail,
      eventType,
      orderNumber: orderData.orderNumber
    });

    const nodemailer = require('nodemailer');
    
    // Create transporter using environment variables
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email content based on event type
    const emailContent = getEmailContent(orderData, eventType);
    
    const mailOptions = {
      from: `"Zammer Marketplace" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html
    };

    await transporter.sendMail(mailOptions);
    
    terminalLog('EMAIL_NOTIFICATION_SUCCESS', 'SUCCESS', {
      userEmail,
      eventType,
      orderNumber: orderData.orderNumber,
      subject: emailContent.subject
    });

    console.log(`📧 Email sent to ${userEmail} for ${eventType}`);
    
  } catch (error) {
    terminalLog('EMAIL_NOTIFICATION_ERROR', 'ERROR', {
      userEmail,
      eventType,
      error: error.message
    });
    console.error('❌ Error sending email notification:', error);
  }
};

// Helper function to generate email content
const getEmailContent = (orderData, eventType) => {
      // Dynamic frontend URL based on environment
    const getFrontendUrl = () => {
      if (process.env.NODE_ENV === 'production') {
        return process.env.FRONTEND_URL_PROD || 'https://zammer2.uc.r.appspot.com';
      }
      return process.env.FRONTEND_URL_LOCAL || 'http://localhost:3000';
    };
    
    const baseUrl = getFrontendUrl();
  
  switch (eventType) {
    case 'order-created':
      return {
        subject: `Order Confirmation - ${orderData.orderNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Order Confirmed! 🎉</h2>
            <p>Hi ${orderData.user?.name},</p>
            <p>Your order <strong>${orderData.orderNumber}</strong> has been confirmed!</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Order Details:</h3>
              <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
              <p><strong>Total Amount:</strong> ₹${orderData.totalPrice}</p>
              <p><strong>Status:</strong> ${orderData.status}</p>
              <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
            </div>
            <p>You'll receive updates as your order progresses.</p>
            <a href="${baseUrl}/user/orders" style="background-color: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Your Order</a>
          </div>
        `
      };
    
    case 'order-status-update':
      return {
        subject: `Order Update - ${orderData.orderNumber} is now ${orderData.status}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">Order Status Updated 📦</h2>
            <p>Hi ${orderData.user?.name},</p>
            <p>Your order <strong>${orderData.orderNumber}</strong> status has been updated!</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Current Status: <span style="color: #10b981;">${orderData.status}</span></h3>
              <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
              <p><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            ${getStatusMessage(orderData.status)}
            <a href="${baseUrl}/user/orders" style="background-color: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order Details</a>
          </div>
        `
      };
    
    default:
      return {
        subject: `Order Update - ${orderData.orderNumber}`,
        html: `<p>Your order ${orderData.orderNumber} has been updated.</p>`
      };
  }
};

// Helper function to get status-specific messages
const getStatusMessage = (status) => {
  switch (status) {
    case 'Processing':
      return '<p>🔄 Your order is being prepared by the seller.</p>';
    case 'Shipped':
      return '<p>🚚 Great news! Your order has been shipped and is on its way to you.</p>';
    case 'Delivered':
      return '<p>🎉 Your order has been delivered! We hope you love your purchase.</p>';
    case 'Cancelled':
      return '<p>❌ Your order has been cancelled. If you have any questions, please contact us.</p>';
    default:
      return '<p>📦 Your order status has been updated.</p>';
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (User)
exports.createOrder = async (req, res) => {
  try {
    terminalLog('ORDER_CREATE_START', 'PROCESSING', {
      userId: req.user._id,
      userEmail: req.user.email,
      itemCount: req.body.orderItems?.length,
      totalPrice: req.body.totalPrice,
      paymentMethod: req.body.paymentMethod
    });

    console.log(`
🎯 ===============================
   STARTING ORDER CREATION
===============================
👤 User ID: ${req.user._id}
📧 Email: ${req.user.email}
📦 Items: ${req.body.orderItems?.length || 0}
💰 Total: ₹${req.body.totalPrice || 0}
💳 Payment: ${req.body.paymentMethod || 'N/A'}
🕐 Time: ${new Date().toLocaleString()}
===============================`);
    
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice,
      sellerId
    } = req.body;

    // STEP 1: Validate order items
    terminalLog('STEP_1_VALIDATION', 'PROCESSING', { step: 'Order Items Validation' });
    console.log('🔍 STEP 1: Validating order items...');

    if (!orderItems || orderItems.length === 0) {
      terminalLog('ORDER_CREATE_VALIDATION', 'ERROR', { reason: 'no_order_items' });
      console.log('❌ VALIDATION FAILED: No order items provided');
      return res.status(400).json({
        success: false,
        message: 'No order items'
      });
    }

    console.log(`✅ STEP 1 COMPLETE: Found ${orderItems.length} order items`);

    // STEP 2: Verify products and seller
    terminalLog('STEP_2_PRODUCT_VERIFICATION', 'PROCESSING', {
      productIds: orderItems.map(item => item.product)
    });
    console.log('🔍 STEP 2: Verifying products and seller...');

    const productIds = orderItems.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).populate('seller');
    
    if (products.length !== orderItems.length) {
      terminalLog('PRODUCT_VERIFICATION', 'ERROR', {
        reason: 'products_not_found',
        expectedCount: orderItems.length,
        foundCount: products.length
      });
      console.log(`❌ STEP 2 FAILED: Expected ${orderItems.length} products, found ${products.length}`);
      return res.status(400).json({
        success: false,
        message: 'Some products not found'
      });
    }

    // Check if all products belong to the same seller
    const sellers = [...new Set(products.map(p => p.seller._id.toString()))];
    if (sellers.length > 1) {
      terminalLog('SELLER_VALIDATION', 'ERROR', {
        reason: 'multiple_sellers',
        sellerCount: sellers.length,
        sellers
      });
      console.log(`❌ STEP 2 FAILED: Multiple sellers detected (${sellers.length})`);
      return res.status(400).json({
        success: false,
        message: 'All products must be from the same seller'
      });
    }

    const finalSellerId = sellerId || sellers[0];
    console.log(`✅ STEP 2 COMPLETE: All products verified, Seller ID: ${finalSellerId}`);

    terminalLog('VALIDATION_SUCCESS', 'SUCCESS', {
      productCount: products.length,
      sellerId: finalSellerId
    });

    // 🎯 CRITICAL FIX: Generate order number BEFORE creating order object
    terminalLog('STEP_3_ORDER_NUMBER', 'PROCESSING', { step: 'Order Number Generation' });
    console.log('🔍 STEP 3: Generating unique order number...');

    const orderNumber = await generateOrderNumber();
    
    // 🎯 CRITICAL: Validate that orderNumber was generated successfully
    if (!orderNumber) {
      const errorMsg = 'Failed to generate order number';
      terminalLog('ORDER_NUMBER_VALIDATION', 'ERROR', { reason: 'orderNumber_is_null_or_undefined' });
      console.error('❌ CRITICAL ERROR:', errorMsg);
      return res.status(500).json({
        success: false,
        message: errorMsg
      });
    }
    
    console.log(`✅ STEP 3 COMPLETE: Order number generated: ${orderNumber}`);

    // STEP 4: Create order object with orderNumber
    terminalLog('STEP_4_ORDER_CREATION', 'PROCESSING', { 
      step: 'Order Object Creation',
      orderNumber,
      sellerId: finalSellerId
    });
    console.log('🔍 STEP 4: Creating order object...');

    // 🎯 CRITICAL FIX: Ensure orderNumber is explicitly set
    const orderData = {
      orderNumber: orderNumber, // 🔥 EXPLICITLY set orderNumber first
      user: req.user._id,
      seller: finalSellerId,
      orderItems,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice
    };

    console.log('📋 Order data prepared:', {
      orderNumber: orderData.orderNumber,
      user: orderData.user,
      seller: orderData.seller,
      itemCount: orderData.orderItems.length,
      totalPrice: orderData.totalPrice
    });

    const order = new Order(orderData);
    
    console.log(`✅ STEP 4 COMPLETE: Order object created with number: ${order.orderNumber}`);

    // 🎯 CRITICAL: Validate order object before saving
    if (!order.orderNumber) {
      const errorMsg = 'Order object missing orderNumber after creation';
      terminalLog('ORDER_OBJECT_VALIDATION', 'ERROR', { 
        reason: 'orderNumber_missing_in_order_object',
        orderData: orderData,
        orderObjectOrderNumber: order.orderNumber
      });
      console.error('❌ CRITICAL ERROR:', errorMsg);
      return res.status(500).json({
        success: false,
        message: errorMsg
      });
    }

    // STEP 5: Save order to database
    terminalLog('STEP_5_ORDER_SAVE', 'PROCESSING', {
      orderNumber: order.orderNumber,
      sellerId: finalSellerId,
      totalPrice
    });
    console.log('🔍 STEP 5: Saving order to database...');
    console.log('💾 About to save order with orderNumber:', order.orderNumber);

    const createdOrder = await order.save();
    console.log(`✅ STEP 5 COMPLETE: Order saved with ID: ${createdOrder._id}`);

    // STEP 6: Populate order details
    terminalLog('STEP_6_ORDER_POPULATE', 'PROCESSING', {
      orderId: createdOrder._id,
      orderNumber: createdOrder.orderNumber
    });
    console.log('🔍 STEP 6: Populating order with user and seller details...');

    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    console.log(`✅ STEP 6 COMPLETE: Order populated successfully`);

    terminalLog('ORDER_CREATE_SUCCESS', 'SUCCESS', {
      orderId: populatedOrder._id,
      orderNumber: populatedOrder.orderNumber,
      sellerId: populatedOrder.seller._id,
      totalPrice: populatedOrder.totalPrice,
      customerName: populatedOrder.user.name
    });

    // 🎯 MAJOR SUCCESS DISPLAY
    console.log(`
🎉 ===============================
   ORDER CREATED SUCCESSFULLY!
===============================
📦 Order ID: ${populatedOrder._id}
🔢 Order Number: ${populatedOrder.orderNumber}
👤 Customer: ${populatedOrder.user.name} (${populatedOrder.user.email})
🏪 Seller: ${populatedOrder.seller.firstName}
💰 Total: ₹${populatedOrder.totalPrice}
💳 Payment: ${populatedOrder.paymentMethod}
📍 City: ${populatedOrder.shippingAddress.city}
📅 Created: ${new Date().toLocaleString()}
📋 Status: ${populatedOrder.status}
===============================`);

    // STEP 7: Send notifications
    console.log('🔍 STEP 7: Sending notifications...');

    // 🎯 Real-time notification to seller
    emitOrderNotification(populatedOrder.seller._id, {
      _id: populatedOrder._id,
      orderNumber: populatedOrder.orderNumber,
      status: populatedOrder.status,
      totalPrice: populatedOrder.totalPrice,
      user: populatedOrder.user,
      orderItems: populatedOrder.orderItems,
      createdAt: populatedOrder.createdAt
    }, 'new-order');

    // 🎯 Real-time notification to buyer (order confirmation)
    emitBuyerNotification(populatedOrder.user._id, {
      _id: populatedOrder._id,
      orderNumber: populatedOrder.orderNumber,
      status: populatedOrder.status,
      totalPrice: populatedOrder.totalPrice,
      user: populatedOrder.user,
      seller: populatedOrder.seller,
      createdAt: populatedOrder.createdAt
    }, 'order-created');

    // 🎯 Send email notification to buyer
    sendEmailNotification(populatedOrder.user.email, populatedOrder, 'order-created');

    console.log(`✅ STEP 7 COMPLETE: All notifications sent`);

    console.log(`
🚀 ===============================
   ORDER CREATION COMPLETED!
===============================
📦 Order Number: ${populatedOrder.orderNumber}
⏱️  Total Time: ${new Date().toLocaleString()}
📡 Notifications: ✅ Sent
🎯 Status: SUCCESS
===============================`);

    res.status(201).json({
      success: true,
      data: populatedOrder
    });
  } catch (error) {
    terminalLog('ORDER_CREATE_ERROR', 'ERROR', {
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });
    
    console.log(`
❌ ===============================
   ORDER CREATION FAILED!
===============================
👤 User: ${req.user?._id}
🚨 Error: ${error.message}
⏱️  Time: ${new Date().toLocaleString()}
===============================`);
    
    console.error('❌ Create Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (User/Seller)
exports.getOrderById = async (req, res) => {
  try {
    terminalLog('ORDER_FETCH_BY_ID', 'PROCESSING', {
      orderId: req.params.id,
      requesterId: req.user?._id || req.seller?._id,
      requesterType: req.user ? 'user' : 'seller'
    });

    console.log(`🔍 Fetching order by ID: ${req.params.id}`);

    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      terminalLog('ORDER_FETCH_BY_ID', 'ERROR', {
        orderId: req.params.id,
        reason: 'order_not_found'
      });
      console.log(`❌ Order not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order or seller owns the products
    if (req.user && order.user._id.toString() === req.user._id.toString()) {
      terminalLog('ORDER_FETCH_BY_ID', 'SUCCESS', {
        orderId: req.params.id,
        accessType: 'user_owner',
        userId: req.user._id
      });
      console.log(`✅ Order fetched successfully for user: ${req.user._id}`);
      return res.status(200).json({
        success: true,
        data: order
      });
    }

    if (req.seller && order.seller._id.toString() === req.seller._id.toString()) {
      terminalLog('ORDER_FETCH_BY_ID', 'SUCCESS', {
        orderId: req.params.id,
        accessType: 'seller_owner',
        sellerId: req.seller._id
      });
      console.log(`✅ Order fetched successfully for seller: ${req.seller._id}`);
      return res.status(200).json({
        success: true,
        data: order
      });
    }

    terminalLog('ORDER_FETCH_BY_ID', 'ERROR', {
      orderId: req.params.id,
      reason: 'unauthorized_access',
      requesterId: req.user?._id || req.seller?._id
    });
    console.log(`❌ Unauthorized access to order: ${req.params.id}`);

    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this order'
    });
  } catch (error) {
    terminalLog('ORDER_FETCH_BY_ID', 'ERROR', {
      orderId: req.params.id,
      error: error.message
    });
    console.error('❌ Get Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders/myorders
// @access  Private (User)
exports.getUserOrders = async (req, res) => {
  try {
    terminalLog('USER_ORDERS_FETCH', 'PROCESSING', {
      userId: req.user._id,
      page: req.query.page || 1,
      limit: req.query.limit || 10
    });

    console.log(`🔍 Fetching orders for user: ${req.user._id}`);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user._id })
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({ user: req.user._id });

    terminalLog('USER_ORDERS_FETCH', 'SUCCESS', {
      userId: req.user._id,
      orderCount: orders.length,
      totalOrders,
      page,
      totalPages: Math.ceil(totalOrders / limit)
    });

    console.log(`✅ Found ${orders.length} orders for user ${req.user._id}`);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: orders
    });
  } catch (error) {
    terminalLog('USER_ORDERS_FETCH', 'ERROR', {
      userId: req.user?._id,
      error: error.message
    });
    console.error('❌ Get User Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get seller orders
// @route   GET /api/orders/seller
// @access  Private (Seller)
exports.getSellerOrders = async (req, res) => {
  try {
    terminalLog('SELLER_ORDERS_FETCH', 'PROCESSING', {
      sellerId: req.seller._id,
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      statusFilter: req.query.status
    });

    console.log(`🔍 Fetching orders for seller: ${req.seller._id}`);
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { seller: req.seller._id };
    
    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
      console.log(`🔍 Filtering by status: ${req.query.status}`);
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email mobileNumber')
      .populate('orderItems.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filter);

    // Mark orders as read when seller views them
    const unreadCount = await Order.countDocuments({
      seller: req.seller._id,
      isRead: false
    });

    if (unreadCount > 0) {
      await Order.updateMany(
        { seller: req.seller._id, isRead: false },
        { isRead: true }
      );
      
      terminalLog('ORDERS_MARKED_READ', 'SUCCESS', {
        sellerId: req.seller._id,
        markedReadCount: unreadCount
      });
      console.log(`✅ Marked ${unreadCount} orders as read`);
    }

    terminalLog('SELLER_ORDERS_FETCH', 'SUCCESS', {
      sellerId: req.seller._id,
      orderCount: orders.length,
      totalOrders,
      statusFilter: req.query.status,
      markedReadCount: unreadCount
    });

    console.log(`✅ Found ${orders.length} orders for seller ${req.seller._id}`);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: orders
    });
  } catch (error) {
    terminalLog('SELLER_ORDERS_FETCH', 'ERROR', {
      sellerId: req.seller?._id,
      error: error.message
    });
    console.error('❌ Get Seller Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Seller)
exports.updateOrderStatus = async (req, res) => {
  try {
    terminalLog('ORDER_STATUS_UPDATE_START', 'PROCESSING', {
      orderId: req.params.id,
      sellerId: req.seller._id,
      newStatus: req.body.status
    });

    console.log(`🔄 Updating order status: ${req.params.id} → ${req.body.status}`);
    
    const { status } = req.body;
    
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      terminalLog('ORDER_STATUS_VALIDATION', 'ERROR', {
        orderId: req.params.id,
        invalidStatus: status,
        validStatuses
      });
      console.log(`❌ Invalid status: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findById(req.params.id)
      .populate('user', 'name email mobileNumber')
      .populate('orderItems.product', 'name images');

    if (!order) {
      terminalLog('ORDER_STATUS_UPDATE', 'ERROR', {
        orderId: req.params.id,
        reason: 'order_not_found'
      });
      console.log(`❌ Order not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if seller owns this order
    if (order.seller.toString() !== req.seller._id.toString()) {
      terminalLog('ORDER_STATUS_UPDATE', 'ERROR', {
        orderId: req.params.id,
        reason: 'unauthorized_seller',
        orderSellerId: order.seller.toString(),
        requestSellerId: req.seller._id.toString()
      });
      console.log(`❌ Unauthorized seller access: ${req.params.id}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    const previousStatus = order.status;
    order.status = status;
    
    if (status === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      console.log(`📦 Order marked as delivered: ${order.orderNumber}`);

      // Generate invoice when order is delivered
      try {
        terminalLog('INVOICE_GENERATION_START', 'PROCESSING', {
          orderId: order._id,
          orderNumber: order.orderNumber
        });
        console.log(`📄 Generating invoice for order: ${order.orderNumber}`);

        const invoiceResult = await invoiceGenerator.generateInvoice(order);
        
        // Update order with invoice details
        order.invoiceUrl = invoiceResult.invoiceUrl;
        order.invoiceGenerated = true;
        
        terminalLog('INVOICE_GENERATION_SUCCESS', 'SUCCESS', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceUrl: invoiceResult.invoiceUrl
        });
        console.log(`✅ Invoice generated: ${invoiceResult.invoiceUrl}`);

        // Emit invoice ready notification
        emitBuyerNotification(order.user._id, {
          _id: order._id,
          orderNumber: order.orderNumber,
          invoiceUrl: invoiceResult.invoiceUrl,
          status: order.status
        }, 'invoice-ready');

      } catch (error) {
        terminalLog('INVOICE_GENERATION_ERROR', 'ERROR', {
          orderId: order._id,
          error: error.message
        });
        console.error('❌ Invoice Generation Error:', error);
        // Continue with order update even if invoice generation fails
      }
    }

    const updatedOrder = await order.save();

    terminalLog('ORDER_STATUS_UPDATE', 'SUCCESS', {
      orderId: req.params.id,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: status,
      sellerId: req.seller._id,
      customerName: order.user.name
    });

    console.log(`
🔄 ===============================
   ORDER STATUS UPDATED!
===============================
📦 Order Number: ${order.orderNumber}
📋 Status: ${previousStatus} → ${status}
👤 Customer: ${order.user.name}
🏪 Seller: ${req.seller.firstName}
📅 Updated: ${new Date().toLocaleString()}
===============================`);

    // 🎯 Real-time notification to seller about status update
    emitOrderNotification(updatedOrder.seller, {
      _id: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      previousStatus,
      totalPrice: updatedOrder.totalPrice,
      user: order.user,
      updatedAt: updatedOrder.updatedAt
    }, 'order-status-updated');

    // 🎯 Real-time notification to buyer about status update
    emitBuyerNotification(order.user._id, {
      _id: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      previousStatus,
      totalPrice: updatedOrder.totalPrice,
      user: order.user,
      updatedAt: updatedOrder.updatedAt
    }, 'order-status-update');

    // 🎯 Send email notification to buyer for status updates
    sendEmailNotification(order.user.email, {
      ...updatedOrder.toObject(),
      user: order.user,
      previousStatus
    }, 'order-status-update');

    res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    terminalLog('ORDER_STATUS_UPDATE', 'ERROR', {
      orderId: req.params.id,
      sellerId: req.seller?._id,
      error: error.message,
      stack: error.stack
    });
    console.error('❌ Update Order Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get seller order statistics
// @route   GET /api/orders/seller/stats
// @access  Private (Seller)
exports.getSellerOrderStats = async (req, res) => {
  try {
    terminalLog('SELLER_STATS_FETCH', 'PROCESSING', {
      sellerId: req.seller._id
    });

    console.log(`📊 Calculating order statistics for seller: ${req.seller._id}`);
    
    const sellerId = req.seller._id;

    // Get order counts by status
    const statusCounts = await Order.aggregate([
      { $match: { seller: sellerId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get total revenue
    const revenueResult = await Order.aggregate([
      { $match: { seller: sellerId, isPaid: true } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
    ]);

    // Get recent orders count (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrdersCount = await Order.countDocuments({
      seller: sellerId,
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get unread orders count
    const unreadOrdersCount = await Order.countDocuments({
      seller: sellerId,
      isRead: false
    });

    // Get today's orders count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrdersCount = await Order.countDocuments({
      seller: sellerId,
      createdAt: { $gte: todayStart }
    });

    const stats = {
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
      recentOrdersCount,
      unreadOrdersCount,
      todayOrdersCount
    };

    terminalLog('SELLER_STATS_FETCH', 'SUCCESS', {
      sellerId: req.seller._id,
      stats: {
        totalOrders: Object.values(stats.statusCounts).reduce((a, b) => a + b, 0),
        todayOrders: stats.todayOrdersCount,
        unreadOrders: stats.unreadOrdersCount,
        totalRevenue: stats.totalRevenue
      }
    });

    console.log(`✅ Order stats calculated for seller ${req.seller._id}:`, stats);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    terminalLog('SELLER_STATS_FETCH', 'ERROR', {
      sellerId: req.seller?._id,
      error: error.message
    });
    console.error('❌ Get Seller Order Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get order invoice
// @route   GET /api/orders/:id/invoice
// @access  Private (User)
exports.getOrderInvoice = async (req, res) => {
  try {
    terminalLog('INVOICE_FETCH_START', 'PROCESSING', {
      orderId: req.params.id,
      userId: req.user._id
    });

    console.log(`📄 Fetching invoice for order: ${req.params.id}`);

    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      terminalLog('INVOICE_FETCH', 'ERROR', {
        orderId: req.params.id,
        reason: 'order_not_found'
      });
      console.log(`❌ Order not found for invoice: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user._id.toString() !== req.user._id.toString()) {
      terminalLog('INVOICE_FETCH', 'ERROR', {
        orderId: req.params.id,
        reason: 'unauthorized_access',
        orderUserId: order.user._id.toString(),
        requestUserId: req.user._id.toString()
      });
      console.log(`❌ Unauthorized invoice access: ${req.params.id}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this invoice'
      });
    }

    if (!order.invoiceGenerated || !order.invoiceUrl) {
      terminalLog('INVOICE_FETCH', 'ERROR', {
        orderId: req.params.id,
        reason: 'invoice_not_generated',
        invoiceGenerated: order.invoiceGenerated,
        hasInvoiceUrl: !!order.invoiceUrl
      });
      console.log(`❌ Invoice not generated for order: ${req.params.id}`);
      return res.status(400).json({
        success: false,
        message: 'Invoice not yet generated for this order'
      });
    }

    terminalLog('INVOICE_FETCH', 'SUCCESS', {
      orderId: req.params.id,
      orderNumber: order.orderNumber,
      invoiceUrl: order.invoiceUrl
    });

    console.log(`✅ Invoice found for order ${order.orderNumber}: ${order.invoiceUrl}`);

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        invoiceUrl: order.invoiceUrl,
        invoiceGenerated: order.invoiceGenerated
      }
    });

  } catch (error) {
    terminalLog('INVOICE_FETCH', 'ERROR', {
      orderId: req.params.id,
      userId: req.user?._id,
      error: error.message
    });
    console.error('❌ Get Order Invoice Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
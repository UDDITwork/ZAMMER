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
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
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

    console.log('📝 Creating new order...');
    
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice,
      sellerId
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      terminalLog('ORDER_CREATE_VALIDATION', 'ERROR', { reason: 'no_order_items' });
      return res.status(400).json({
        success: false,
        message: 'No order items'
      });
    }

    // Verify all products exist and belong to the same seller
    terminalLog('PRODUCT_VERIFICATION', 'PROCESSING', {
      productIds: orderItems.map(item => item.product)
    });

    const productIds = orderItems.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).populate('seller');
    
    if (products.length !== orderItems.length) {
      terminalLog('PRODUCT_VERIFICATION', 'ERROR', {
        reason: 'products_not_found',
        expectedCount: orderItems.length,
        foundCount: products.length
      });
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
      return res.status(400).json({
        success: false,
        message: 'All products must be from the same seller'
      });
    }

    terminalLog('VALIDATION_SUCCESS', 'SUCCESS', {
      productCount: products.length,
      sellerId: sellerId || sellers[0]
    });

    const order = new Order({
      user: req.user._id,
      seller: sellerId || sellers[0],
      orderItems,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice
    });

    terminalLog('ORDER_SAVE_START', 'PROCESSING', {
      sellerId: sellerId || sellers[0],
      totalPrice
    });

    const createdOrder = await order.save();

    // Populate the order with user and seller details
    terminalLog('ORDER_POPULATE_START', 'PROCESSING', {
      orderId: createdOrder._id,
      orderNumber: createdOrder.orderNumber
    });

    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    terminalLog('ORDER_CREATE_SUCCESS', 'SUCCESS', {
      orderId: populatedOrder._id,
      orderNumber: populatedOrder.orderNumber,
      sellerId: populatedOrder.seller._id,
      totalPrice: populatedOrder.totalPrice,
      customerName: populatedOrder.user.name
    });

    console.log('✅ Order created successfully:', populatedOrder.orderNumber);

    // 🎯 Enhanced: Terminal success display
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
===============================`);

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

    // 🎯 NEW: Real-time notification to buyer (order confirmation)
    emitBuyerNotification(populatedOrder.user._id, {
      _id: populatedOrder._id,
      orderNumber: populatedOrder.orderNumber,
      status: populatedOrder.status,
      totalPrice: populatedOrder.totalPrice,
      user: populatedOrder.user,
      seller: populatedOrder.seller,
      createdAt: populatedOrder.createdAt
    }, 'order-created');

    // 🎯 NEW: Send email notification to buyer
    sendEmailNotification(populatedOrder.user.email, populatedOrder, 'order-created');

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

    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('seller', 'firstName shop')
      .populate('orderItems.product', 'name images');

    if (!order) {
      terminalLog('ORDER_FETCH_BY_ID', 'ERROR', {
        orderId: req.params.id,
        reason: 'order_not_found'
      });
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

    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this order'
    });
  } catch (error) {
    terminalLog('ORDER_FETCH_BY_ID', 'ERROR', {
      orderId: req.params.id,
      error: error.message
    });
    console.error('Get Order Error:', error);
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
    console.error('Get User Orders Error:', error);
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

    console.log('📋 Get Seller Orders called for seller:', req.seller._id);
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { seller: req.seller._id };
    
    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
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
    }

    terminalLog('SELLER_ORDERS_FETCH', 'SUCCESS', {
      sellerId: req.seller._id,
      orderCount: orders.length,
      totalOrders,
      statusFilter: req.query.status,
      markedReadCount: unreadCount
    });

    console.log(`✅ Found ${orders.length} orders for seller`);

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

    console.log('🔄 Update Order Status called for order:', req.params.id);
    
    const { status } = req.body;
    
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      terminalLog('ORDER_STATUS_VALIDATION', 'ERROR', {
        orderId: req.params.id,
        invalidStatus: status,
        validStatuses
      });
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

      // Generate invoice when order is delivered
      try {
        terminalLog('INVOICE_GENERATION_START', 'PROCESSING', {
          orderId: order._id,
          orderNumber: order.orderNumber
        });

        const invoiceResult = await invoiceGenerator.generateInvoice(order);
        
        // Update order with invoice details
        order.invoiceUrl = invoiceResult.invoiceUrl;
        order.invoiceGenerated = true;
        
        terminalLog('INVOICE_GENERATION_SUCCESS', 'SUCCESS', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceUrl: invoiceResult.invoiceUrl
        });

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

    console.log(`✅ Order status updated: ${previousStatus} → ${status}`);

    // 🎯 Enhanced: Terminal success display for status updates
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

    // 🎯 NEW: Real-time notification to buyer about status update
    emitBuyerNotification(order.user._id, {
      _id: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      previousStatus,
      totalPrice: updatedOrder.totalPrice,
      user: order.user,
      updatedAt: updatedOrder.updatedAt
    }, 'order-status-update');

    // 🎯 NEW: Send email notification to buyer for status updates
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

    console.log('📊 Get Seller Order Stats called for seller:', req.seller._id);
    
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

    // 🎯 Enhanced: Get today's orders count
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

    console.log('✅ Order stats calculated:', stats);

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
  // Your logic to generate or fetch the invoice PDF
  // For example:
  try {
    // ... fetch order, generate PDF, send file ...
    res.status(200).send('Invoice logic here');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
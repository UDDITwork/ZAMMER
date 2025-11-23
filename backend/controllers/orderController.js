const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Seller = require('../models/Seller');
const invoiceGenerator = require('../utils/invoiceService');
const { mapStatusForSeller } = require('../utils/orderUtils');

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

exports.emitOrderNotification = emitOrderNotification;

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

exports.emitBuyerNotification = emitBuyerNotification;

// 🎯 NEW: Emit real-time notification to admin
const emitAdminNotification = (orderData, eventType = 'payment-completed') => {
  try {
    terminalLog('SOCKET_EMIT_ADMIN_START', 'PROCESSING', {
      eventType,
      orderNumber: orderData.orderNumber,
      paymentStatus: orderData.paymentStatus
    });

    console.log(`🔧 [ADMIN-NOTIFICATION] Starting admin notification for ${eventType}`);
    console.log(`🔧 [ADMIN-NOTIFICATION] Order: ${orderData.orderNumber}`);
    console.log(`🔧 [ADMIN-NOTIFICATION] Global.io available: ${!!global.io}`);
    console.log(`🔧 [ADMIN-NOTIFICATION] Global.emitToAdmin available: ${!!global.emitToAdmin}`);

    // Check if Socket.io is available
    if (global.io && global.emitToAdmin) {
      console.log(`📡 Emitting ${eventType} notification to admin`);
      
      // Use the new global function
      global.emitToAdmin(eventType, orderData);
      
      terminalLog('SOCKET_EMIT_ADMIN_SUCCESS', 'SUCCESS', {
        eventType,
        orderNumber: orderData.orderNumber,
        paymentStatus: orderData.paymentStatus,
        roomName: 'admin-room'
      });

      // 🎯 Enhanced success logging for real-time tracking
      if (eventType === 'payment-completed') {
        console.log(`
🔔 ===============================
   ADMIN PAYMENT NOTIFICATION SENT!
===============================
📦 Order Number: ${orderData.orderNumber}
💰 Amount: ₹${orderData.totalPrice}
👤 Customer: ${orderData.user?.name}
🏪 Seller: ${orderData.seller?.firstName}
💳 Payment Status: ${orderData.paymentStatus}
🕐 Time: ${new Date().toLocaleString()}
📡 Socket Room: admin-room
===============================`);
      } else if (eventType === 'new-order') {
        console.log(`
🔔 ===============================
   ADMIN NEW ORDER NOTIFICATION SENT!
===============================
📦 Order Number: ${orderData.orderNumber}
💰 Amount: ₹${orderData.totalPrice}
👤 Customer: ${orderData.user?.name}
🏪 Seller: ${orderData.seller?.firstName}
📋 Status: ${orderData.status}
🕐 Time: ${new Date().toLocaleString()}
📡 Socket Room: admin-room
===============================`);
      }
      
    } else {
      terminalLog('SOCKET_EMIT_ADMIN_ERROR', 'ERROR', {
        reason: 'socket_io_not_available',
        eventType,
        hasGlobalIo: !!global.io,
        hasGlobalEmitToAdmin: !!global.emitToAdmin
      });
      console.warn('⚠️ Socket.io not available for admin notifications');
      console.warn(`⚠️ Global.io: ${!!global.io}`);
      console.warn(`⚠️ Global.emitToAdmin: ${!!global.emitToAdmin}`);
    }
  } catch (error) {
    terminalLog('SOCKET_EMIT_ADMIN_ERROR', 'ERROR', {
      eventType,
      error: error.message,
      stack: error.stack
    });
    console.error('❌ Error emitting admin notification:', error);
  }
};

exports.emitAdminNotification = emitAdminNotification;

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

    // 🎯 NEW: STEP 2.5 - Inventory Validation
    terminalLog('STEP_2_5_INVENTORY_VALIDATION', 'PROCESSING', { step: 'Inventory Stock Check' });
    console.log('🔍 STEP 2.5: Validating inventory availability...');

    const inventoryValidationResults = [];
    const insufficientStockItems = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const orderItem = orderItems[i];
      
      console.log(`📦 Checking inventory for product: ${product.name} (${orderItem.size}-${orderItem.color})`);
      
      // Check if product has sufficient stock
      const stockCheck = product.hasSufficientStock([orderItem]);
      
      if (!stockCheck.hasStock) {
        insufficientStockItems.push({
          productId: product._id,
          productName: product.name,
          size: orderItem.size,
          color: orderItem.color,
          requested: orderItem.quantity,
          available: stockCheck.available,
          insufficientVariant: stockCheck.insufficientVariant
        });
        
        console.log(`❌ INSUFFICIENT STOCK: ${product.name} - ${stockCheck.insufficientVariant}`);
        console.log(`   Requested: ${orderItem.quantity}, Available: ${stockCheck.available}`);
      } else {
        console.log(`✅ SUFFICIENT STOCK: ${product.name} - ${orderItem.size}-${orderItem.color}`);
        console.log(`   Requested: ${orderItem.quantity}, Available: ${product.variants.find(v => v.size === orderItem.size && v.color === orderItem.color)?.quantity || 0}`);
      }
      
      inventoryValidationResults.push({
        productId: product._id,
        productName: product.name,
        hasStock: stockCheck.hasStock,
        details: stockCheck
      });
    }

    // If any product has insufficient stock, return error
    if (insufficientStockItems.length > 0) {
      terminalLog('INVENTORY_VALIDATION', 'ERROR', {
        reason: 'insufficient_stock',
        insufficientItems: insufficientStockItems
      });
      
      console.log('❌ STEP 2.5 FAILED: Insufficient stock for some products');
      console.log('📋 Insufficient stock items:', insufficientStockItems);
      
      return res.status(400).json({
        success: false,
        message: 'Some products have insufficient stock',
        insufficientStock: insufficientStockItems,
        details: insufficientStockItems.map(item => 
          `${item.productName} (${item.size}-${item.color}): Requested ${item.requested}, Available ${item.available}`
        )
      });
    }

    console.log(`✅ STEP 2.5 COMPLETE: All products have sufficient stock`);

    terminalLog('VALIDATION_SUCCESS', 'SUCCESS', {
      productCount: products.length,
      sellerId: finalSellerId,
      inventoryValidated: true
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
      .populate('seller', 'firstName lastName email shop')
      .populate('orderItems.product', 'name images');

    console.log(`✅ STEP 6 COMPLETE: Order populated successfully`);

    // 🎯 NEW: STEP 6.5 - Update Inventory
    terminalLog('STEP_6_5_INVENTORY_UPDATE', 'PROCESSING', {
      step: 'Inventory Management',
      orderId: createdOrder._id,
      orderNumber: createdOrder.orderNumber
    });
    console.log('🔍 STEP 6.5: Updating product inventory...');

    const inventoryUpdateResults = [];

    try {
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const orderItem = orderItems[i];
        
        console.log(`📦 Updating inventory for: ${product.name} (${orderItem.size}-${orderItem.color})`);
        
        // Update inventory for this product
        const inventoryResult = await product.updateInventoryForOrder(
          [orderItem],
          createdOrder._id,
          createdOrder.orderNumber,
          req.user._id,
          'order_placed'
        );
        
        console.log(`✅ Inventory updated for ${product.name}:`, {
          totalQuantity: inventoryResult.newTotalQuantity,
          availableQuantity: inventoryResult.newAvailableQuantity,
          status: inventoryResult.status,
          updates: inventoryResult.inventoryUpdates
        });
        
        inventoryUpdateResults.push({
          productId: product._id,
          productName: product.name,
          success: true,
          result: inventoryResult
        });
      }
      
      console.log(`✅ STEP 6.5 COMPLETE: All inventory updates successful`);
      
    } catch (inventoryError) {
      console.error('❌ STEP 6.5 FAILED: Inventory update error:', inventoryError);
      
      // Log the error but don't fail the order creation
      // The order is already created, so we'll handle this gracefully
      terminalLog('INVENTORY_UPDATE_ERROR', 'ERROR', {
        orderId: createdOrder._id,
        error: inventoryError.message
      });
      
      inventoryUpdateResults.push({
        success: false,
        error: inventoryError.message
      });
    }

    terminalLog('ORDER_CREATE_SUCCESS', 'SUCCESS', {
      orderId: populatedOrder._id,
      orderNumber: populatedOrder.orderNumber,
      sellerId: populatedOrder.seller._id,
      totalPrice: populatedOrder.totalPrice,
      customerName: populatedOrder.user.name,
      inventoryUpdated: inventoryUpdateResults.every(result => result.success)
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

    // 🎯 ENHANCED: Real-time notification to admin about new order with comprehensive data
    const adminNotificationData = {
      _id: populatedOrder._id,
      orderNumber: populatedOrder.orderNumber,
      status: populatedOrder.status,
      totalPrice: populatedOrder.totalPrice,
      taxPrice: populatedOrder.taxPrice,
      shippingPrice: populatedOrder.shippingPrice,
      paymentMethod: populatedOrder.paymentMethod,
      isPaid: populatedOrder.isPaid,
      paymentStatus: populatedOrder.paymentStatus,
      user: populatedOrder.user,
      seller: populatedOrder.seller,
      orderItems: populatedOrder.orderItems,
      shippingAddress: populatedOrder.shippingAddress,
      createdAt: populatedOrder.createdAt,
      // Add payment details if available
      paymentDetails: populatedOrder.paymentDetails || null,
      paidAt: populatedOrder.paidAt || null
    };
    
    emitAdminNotification(adminNotificationData, 'new-order');

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
      // 🎯 MAP STATUS FOR SELLER: Transform backend status to seller-friendly status
      const orderObj = order.toObject ? order.toObject() : order;
      const mappedOrder = {
        ...orderObj,
        status: mapStatusForSeller(orderObj.status)
      };
      
      terminalLog('ORDER_FETCH_BY_ID', 'SUCCESS', {
        orderId: req.params.id,
        accessType: 'seller_owner',
        sellerId: req.seller._id
      });
      console.log(`✅ Order fetched successfully for seller: ${req.seller._id}`);
      return res.status(200).json({
        success: true,
        data: mappedOrder
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

    // 🎯 MAP STATUS FOR SELLER: Transform backend statuses to seller-friendly statuses
    const mappedOrders = orders.map(order => {
      const orderObj = order.toObject ? order.toObject() : order;
      return {
        ...orderObj,
        status: mapStatusForSeller(orderObj.status)
      };
    });

    res.status(200).json({
      success: true,
      count: mappedOrders.length,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      data: mappedOrders
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
    
    // 🎯 NEW: Handle inventory updates for cancellations
    if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
      console.log(`🔄 Order cancelled - updating inventory for: ${order.orderNumber}`);
      
      try {
        // Get all products in the order
        const productIds = order.orderItems.map(item => item.product);
        const products = await Product.find({ _id: { $in: productIds } });
        
        console.log(`📦 Restoring inventory for ${products.length} products`);
        
        // Update inventory for each product
        for (let i = 0; i < products.length; i++) {
          const product = products[i];
          const orderItem = order.orderItems[i];
          
          console.log(`📦 Restoring inventory for: ${product.name} (${orderItem.size}-${orderItem.color})`);
          
          // Restore inventory for cancelled order
          const inventoryResult = await product.updateInventoryForOrder(
            [orderItem],
            order._id,
            order.orderNumber,
            order.user,
            'order_cancelled'
          );
          
          console.log(`✅ Inventory restored for ${product.name}:`, {
            totalQuantity: inventoryResult.newTotalQuantity,
            availableQuantity: inventoryResult.newAvailableQuantity,
            status: inventoryResult.status,
            updates: inventoryResult.inventoryUpdates
          });
        }
        
        console.log(`✅ Inventory restoration completed for cancelled order`);
        
      } catch (inventoryError) {
        console.error('❌ Inventory restoration error for cancelled order:', inventoryError);
        terminalLog('INVENTORY_RESTORATION_ERROR', 'ERROR', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          error: inventoryError.message
        });
        // Continue with order cancellation even if inventory update fails
      }
    }
    
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

    // 🎯 MAP STATUS COUNTS FOR SELLER: Transform backend status counts to seller-friendly statuses
    const mappedStatusCounts = {};
    statusCounts.forEach(({ _id: status, count }) => {
      const mappedStatus = mapStatusForSeller(status);
      // Combine counts for statuses that map to the same seller status
      // e.g., both "Processing" and "Pickup_Ready" map to "Processing"
      mappedStatusCounts[mappedStatus] = (mappedStatusCounts[mappedStatus] || 0) + count;
    });

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
      statusCounts: mappedStatusCounts, // Use mapped status counts
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

// @desc    Update order payment status
// @route   PUT /api/orders/:id/payment-status
// @access  Private (User)
exports.updateOrderPaymentStatus = async (req, res) => {
  try {
    terminalLog('ORDER_PAYMENT_STATUS_UPDATE_START', 'PROCESSING', {
      orderId: req.params.id,
      userId: req.user._id,
      newStatus: req.body.status
    });

    console.log(`💳 Updating payment status for order: ${req.params.id} → ${req.body.status}`);
    
    const { status, paymentData } = req.body;
    
    const validPaymentStatuses = ['pending', 'completed', 'failed', 'cancelled'];
    if (!validPaymentStatuses.includes(status)) {
      terminalLog('PAYMENT_STATUS_VALIDATION', 'ERROR', {
        orderId: req.params.id,
        invalidStatus: status,
        validStatuses: validPaymentStatuses
      });
      console.log(`❌ Invalid payment status: ${status}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const order = await Order.findById(req.params.id)
      .populate('user', 'name email mobileNumber')
      .populate('orderItems.product', 'name images');

    if (!order) {
      terminalLog('ORDER_PAYMENT_STATUS_UPDATE', 'ERROR', {
        orderId: req.params.id,
        reason: 'order_not_found'
      });
      console.log(`❌ Order not found: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user._id.toString() !== req.user._id.toString()) {
      terminalLog('ORDER_PAYMENT_STATUS_UPDATE', 'ERROR', {
        orderId: req.params.id,
        reason: 'unauthorized_user',
        orderUserId: order.user._id.toString(),
        requestUserId: req.user._id.toString()
      });
      console.log(`❌ Unauthorized user access: ${req.params.id}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }

    const previousPaymentStatus = order.paymentStatus;
    order.paymentStatus = status;
    
    // 🎯 CRITICAL FIX: Update payment details if payment is completed
    if (status === 'completed' && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentResult = {
        gateway: 'smepay',
        transactionId: paymentData?.transactionId || 'smepay_' + Date.now(),
        paidAt: new Date(),
        paymentMethod: 'SMEPay',
        paymentData: paymentData
      };

      // 🎯 FIXED: Keep order status as "Pending" after payment
      // Order will remain in "Pending" until seller manually marks it as "Processing"
      if (!order.statusHistory || order.statusHistory.length === 0) {
        order.statusHistory = [];
      }
      
      const hasPaymentCompletedHistory = order.statusHistory.some(
        h => h.notes && h.notes.includes('Payment completed')
      );
      
      if (!hasPaymentCompletedHistory) {
        order.statusHistory.push({
          status: 'Pending',
          changedBy: 'system',
          changedAt: new Date(),
          notes: 'Payment completed successfully, awaiting seller confirmation'
        });
      }

      console.log(`💰 Order marked as paid: ${order.orderNumber}`);
      console.log(`📦 Order status: Pending (awaiting seller confirmation)`);
    }

    const updatedOrder = await order.save();

    terminalLog('ORDER_PAYMENT_STATUS_UPDATE', 'SUCCESS', {
      orderId: req.params.id,
      orderNumber: order.orderNumber,
      previousPaymentStatus,
      newPaymentStatus: status,
      userId: req.user._id,
      customerName: order.user.name,
      newOrderStatus: order.status
    });

    console.log(`
💳 ===============================
   PAYMENT STATUS UPDATED!
===============================
📦 Order Number: ${order.orderNumber}
💳 Payment Status: ${previousPaymentStatus} → ${status}
📋 Order Status: ${order.status}
👤 Customer: ${order.user.name}
💰 Is Paid: ${order.isPaid}
📅 Updated: ${new Date().toLocaleString()}
===============================`);

    // 🎯 CRITICAL: Emit notifications for order status change
    if (status === 'completed') {
      // Notify buyer about payment completion
      emitBuyerNotification(order.user._id, {
        _id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        paymentStatus: updatedOrder.paymentStatus,
        isPaid: updatedOrder.isPaid,
        orderStatus: updatedOrder.status,
        previousPaymentStatus,
        updatedAt: updatedOrder.updatedAt
      }, 'payment-status-update');

      // 🎯 CRITICAL: Notify seller about new paid order
      emitOrderNotification(updatedOrder.seller, {
        _id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        totalPrice: updatedOrder.totalPrice,
        user: order.user,
        orderItems: updatedOrder.orderItems,
        createdAt: updatedOrder.createdAt,
        isPaid: updatedOrder.isPaid
      }, 'new-order');

      // 🎯 CRITICAL: Notify admin about payment completion
      const populatedUpdatedOrder = await Order.findById(updatedOrder._id)
        .populate('user', 'name email mobileNumber')
        .populate('seller', 'firstName lastName email shop')
        .populate('orderItems.product', 'name images description');
      
      const adminPaymentNotificationData = {
        _id: populatedUpdatedOrder._id,
        orderNumber: populatedUpdatedOrder.orderNumber,
        status: populatedUpdatedOrder.status,
        totalPrice: populatedUpdatedOrder.totalPrice,
        taxPrice: populatedUpdatedOrder.taxPrice,
        shippingPrice: populatedUpdatedOrder.shippingPrice,
        paymentMethod: populatedUpdatedOrder.paymentMethod,
        isPaid: populatedUpdatedOrder.isPaid,
        paymentStatus: populatedUpdatedOrder.paymentStatus,
        user: populatedUpdatedOrder.user,
        seller: populatedUpdatedOrder.seller,
        orderItems: populatedUpdatedOrder.orderItems,
        shippingAddress: populatedUpdatedOrder.shippingAddress,
        createdAt: populatedUpdatedOrder.createdAt,
        paidAt: populatedUpdatedOrder.paidAt,
        paymentResult: populatedUpdatedOrder.paymentResult,
        previousPaymentStatus: previousPaymentStatus
      };
      
      emitAdminNotification(adminPaymentNotificationData, 'payment-completed');
    }

    res.status(200).json({
      success: true,
      message: 'Order payment status updated successfully',
      data: {
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
        isPaid: updatedOrder.isPaid,
        paidAt: updatedOrder.paidAt
      }
    });
  } catch (error) {
    terminalLog('ORDER_PAYMENT_STATUS_UPDATE', 'ERROR', {
      orderId: req.params.id,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });
    console.error('❌ Update Order Payment Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get minimal order confirmation details for user
// @route   GET /api/orders/:id/confirmation
// @access  Private (User)
exports.getOrderConfirmationDetails = async (req, res) => {
  try {
    terminalLog('ORDER_CONFIRMATION_FETCH', 'PROCESSING', {
      orderId: req.params.id,
      userId: req.user?._id
    });

    const order = await Order.findById(req.params.id)
      .populate('seller', 'firstName lastName shop shopName')
      .populate('orderItems.product', 'name images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    const responsePayload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentGateway: order.paymentGateway,
      paymentMethod: order.paymentMethod,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      totalPrice: order.totalPrice,
      shippingPrice: order.shippingPrice,
      taxPrice: order.taxPrice,
      shippingAddress: order.shippingAddress,
      seller: order.seller ? {
        _id: order.seller._id,
        name: order.seller.firstName || order.seller.shopName || 'Seller'
      } : null,
      estimatedDelivery: order.estimatedDelivery,
      orderItems: order.orderItems.map(item => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || item.product?.images?.[0] || null
      })),
      paymentResult: order.paymentResult
    };

    terminalLog('ORDER_CONFIRMATION_FETCH', 'SUCCESS', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus
    });

    res.status(200).json({
      success: true,
      data: responsePayload
    });
  } catch (error) {
    terminalLog('ORDER_CONFIRMATION_FETCH', 'ERROR', {
      orderId: req.params.id,
      userId: req.user?._id,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch order confirmation details'
    });
  }
};

// @desc    Get admin dashboard orders
// @route   GET /api/orders/admin/dashboard
// @access  Private (Admin)
exports.getAdminDashboardOrders = async (req, res) => {
  try {
    terminalLog('ADMIN_DASHBOARD_ORDERS_FETCH', 'PROCESSING', {
      adminId: req.admin?._id,
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      statusFilter: req.query.status
    });

    console.log(`🔍 Fetching orders for admin dashboard...`);
    
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // 🎯 CRITICAL: Build filter for admin dashboard
    const filter = {};
    
    // 🎯 FIXED: Show ALL orders that need admin attention, not just filtered ones
    // If no status filter is provided, show orders that need admin attention
    if (!req.query.status) {
      // Show orders that need admin attention: Pending (unpaid) + Processing (paid, ready for delivery)
      filter.status = { $in: ['Pending', 'Processing'] };
      console.log(`🔍 Showing orders needing admin attention: Pending + Processing`);
    } else {
      // If specific status filter is provided, use it
      filter.status = req.query.status;
      console.log(`🔍 Filtering by specific status: ${req.query.status}`);
    }

    // 🎯 CRITICAL: Get orders with proper population
    const orders = await Order.find(filter)
      .populate('user', 'name email mobileNumber')
      .populate('seller', 'firstName lastName email shop')
      .populate('orderItems.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filter);

    // 🎯 CRITICAL: Get counts by status for dashboard metrics
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 🎯 CRITICAL: Get pending orders count (orders that need admin attention)
    const pendingOrdersCount = await Order.countDocuments({
      status: { $in: ['Pending', 'Processing'] }
      // 🎯 FIXED: Removed isPaid filter - we want ALL orders needing admin attention
      // Pending = unpaid orders, Processing = paid orders ready for delivery
    });

    // 🎯 CRITICAL: Get recent paid orders (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentPaidOrders = await Order.countDocuments({
      isPaid: true,
      paidAt: { $gte: last24Hours }
    });

    // 🎯 CRITICAL: Get orders needing delivery assignment
    const ordersNeedingDelivery = await Order.countDocuments({
      'adminApproval.status': { $in: ['approved', 'auto_approved'] },
      'deliveryAgent.status': 'unassigned',
      status: { $nin: ['Cancelled', 'Delivered'] }
    });

    terminalLog('ADMIN_DASHBOARD_ORDERS_FETCH', 'SUCCESS', {
      adminId: req.admin?._id,
      orderCount: orders.length,
      totalOrders,
      pendingOrdersCount,
      recentPaidOrders,
      ordersNeedingDelivery
    });

    console.log(`✅ Found ${orders.length} orders for admin dashboard`);
    console.log(`📊 Dashboard Metrics:`);
    console.log(`   - Total Orders: ${totalOrders}`);
    console.log(`   - Pending Admin Action: ${pendingOrdersCount}`);
    console.log(`   - Recent Paid Orders (24h): ${recentPaidOrders}`);
    console.log(`   - Need Delivery Assignment: ${ordersNeedingDelivery}`);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalCount: totalOrders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      hasNextPage: page < Math.ceil(totalOrders / limit),
      hasPrevPage: page > 1,
      dashboardMetrics: {
        totalOrders,
        pendingOrdersCount,
        recentPaidOrders,
        ordersNeedingDelivery,
        statusBreakdown: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      data: orders
    });
  } catch (error) {
    terminalLog('ADMIN_DASHBOARD_ORDERS_FETCH', 'ERROR', {
      adminId: req.admin?._id,
      error: error.message,
      stack: error.stack
    });
    console.error('❌ Get Admin Dashboard Orders Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// 🎯 NEW: Cancel order by buyer
// @desc    Cancel order by buyer (user)
// @route   PUT /api/orders/:orderId/cancel-by-buyer
// @access  Private (User)
exports.cancelOrderByBuyer = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user._id || req.user.id;
    const orderId = req.params.id;
    const { cancellationReason } = req.body;
    
    terminalLog('CANCEL_ORDER_BY_BUYER_START', 'PROCESSING', {
      userId,
      orderId,
      userName: req.user.name,
      reason: cancellationReason || 'No reason provided'
    });
    
    console.log(`
📦 ===============================
   CANCEL ORDER BY BUYER
===============================
📋 Order ID: ${orderId}
👤 Buyer: ${req.user.name}
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

    // 🎯 VALIDATION: Check if order exists
    const order = await Order.findById(orderId)
      .populate('user', 'name mobileNumber email')
      .populate('seller', 'firstName lastName shop email')
      .populate('orderItems.product', 'name images');

    if (!order) {
      terminalLog('CANCEL_ORDER_BY_BUYER_NOT_FOUND', 'ERROR', { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 🎯 AUTHORIZATION: Verify order belongs to this buyer
    const orderUserId = order.user._id?.toString() || order.user.toString();
    const currentUserId = userId?.toString();
    
    if (orderUserId !== currentUserId) {
      terminalLog('CANCEL_ORDER_BY_BUYER_UNAUTHORIZED', 'ERROR', { 
        orderId, 
        orderUserId, 
        currentUserId 
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this order',
        code: 'UNAUTHORIZED_USER'
      });
    }

    // 🎯 VALIDATION: Check if order can be cancelled (only Pending and Processing)
    if (!['Pending', 'Processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.status}. Only Pending or Processing orders can be cancelled.`,
        code: 'INVALID_ORDER_STATUS',
        currentStatus: order.status
      });
    }

    // 🎯 VALIDATION: Check if order is already cancelled
    if (order.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
        code: 'ORDER_ALREADY_CANCELLED'
      });
    }

    // 🎯 VALIDATION: Check if delivery agent has reached buyer location
    // If agent has reached buyer location, buyer cannot cancel the order
    const hasReachedBuyerLocation = 
      order.deliveryAgent?.status === 'location_reached' ||
      order.delivery?.locationReachedAt ||
      order.deliveryAgent?.locationReachedAt;

    if (hasReachedBuyerLocation) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order. Delivery agent has already reached your location. Please contact support if you need assistance.',
        code: 'AGENT_REACHED_LOCATION'
      });
    }

    const previousStatus = order.status;
    
    // 🎯 UPDATE: Cancel the order using the Order model's updateStatus method
    order._cancelledByName = req.user.name;
    await order.updateStatus('Cancelled', 'buyer', cancellationReason.trim());

    // 🎯 UPDATE: Update order notes
    order.notes = `Cancelled by buyer: ${cancellationReason.trim()}`;

    await order.save();

    const processingTime = Date.now() - startTime;
    
    terminalLog('CANCEL_ORDER_BY_BUYER_SUCCESS', 'SUCCESS', {
      orderId,
      orderNumber: order.orderNumber,
      userId,
      processingTime: `${processingTime}ms`
    });

    console.log(`
✅ ===============================
   ORDER CANCELLED BY BUYER
===============================
📦 Order: ${order.orderNumber}
👤 Buyer: ${req.user.name}
📝 Reason: ${cancellationReason}
⏱️ Processing Time: ${processingTime}ms
===============================`);

    // 🎯 NOTIFICATION: Notify seller about cancellation
    try {
      if (global.emitToSeller) {
        const sellerStatus = mapStatusForSeller(order.status);
        const sellerPreviousStatus = mapStatusForSeller(previousStatus);
        
        const cancellationData = {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: sellerStatus,
          previousStatus: sellerPreviousStatus,
          user: order.user,
          reason: cancellationReason.trim(),
          cancelledAt: new Date().toISOString(),
          cancellationDetails: order.cancellationDetails
        };

        global.emitToSeller(order.seller._id, 'order-cancelled-by-buyer', cancellationData);
        terminalLog('SELLER_NOTIFICATION_SENT', 'SUCCESS', { sellerId: order.seller._id, orderId });
      }
    } catch (notificationError) {
      terminalLog('SELLER_NOTIFICATION_FAILED', 'ERROR', { 
        sellerId: order.seller._id, 
        orderId, 
        error: notificationError.message 
      });
    }

    // 🎯 NOTIFICATION: Notify admin about order cancellation
    try {
      if (global.emitToAdmin) {
        global.emitToAdmin('order-cancelled-by-buyer', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: 'Cancelled',
          previousStatus: previousStatus,
          user: order.user,
          seller: order.seller,
          reason: cancellationReason.trim(),
          cancelledAt: new Date().toISOString(),
          cancellationDetails: order.cancellationDetails,
          cancelledBy: 'buyer'
        });
        terminalLog('ADMIN_NOTIFICATION_SENT', 'SUCCESS', { orderId });
      }
    } catch (notificationError) {
      terminalLog('ADMIN_NOTIFICATION_FAILED', 'ERROR', { 
        orderId, 
        error: notificationError.message 
      });
    }

    // 📤 SUCCESS RESPONSE
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        cancelledBy: 'buyer',
        cancelledAt: order.cancellationDetails.cancelledAt,
        cancellationReason: order.cancellationDetails.cancellationReason,
        previousStatus: previousStatus
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    terminalLog('CANCEL_ORDER_BY_BUYER_ERROR', 'ERROR', {
      orderId: req.params.id,
      userId: req.user?._id || req.user?.id,
      error: error.message,
      stack: error.stack,
      processingTime: `${processingTime}ms`
    });

    console.error(`
❌ ===============================
   ORDER CANCELLATION BY BUYER FAILED
===============================
📦 Order ID: ${req.params.id}
👤 Buyer: ${req.user?.name || 'Unknown'}
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
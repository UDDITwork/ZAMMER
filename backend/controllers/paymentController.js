// backend/controllers/paymentController.js - SMEPay Integration Controller

const Order = require('../models/Order');
const User = require('../models/User');
const smepayService = require('../services/smepayService');
const { validationResult } = require('express-validator');

// Enhanced terminal logging for payment operations
const terminalLog = (action, status, data = null) => {
  const timestamp = new Date().toISOString();
  const logLevel = status === 'SUCCESS' ? '✅' : status === 'ERROR' ? '❌' : '🔄';
  
  console.log(`${logLevel} [PAYMENT-CONTROLLER] ${timestamp} - ${action}`, data ? JSON.stringify(data, null, 2) : '');
  
  // Additional structured logging for production monitoring
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({
      timestamp,
      service: 'paymentController',
      action,
      status,
      data
    }));
  }
};

// @desc    Create SMEPay payment order
// @route   POST /api/payments/smepay/create-order
// @access  Private (User)
exports.createSMEPayOrder = async (req, res) => {
  try {
    terminalLog('SMEPAY_CREATE_ORDER_START', 'PROCESSING', {
      userId: req.user._id,
      userEmail: req.user.email,
      requestBody: req.body
    });

    console.log(`
💳 ===============================
   CREATING SMEPAY ORDER
===============================
👤 User: ${req.user.name} (${req.user.email})
📦 Order ID: ${req.body.orderId}
💰 Amount: ₹${req.body.amount}
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      terminalLog('SMEPAY_VALIDATION_ERROR', 'ERROR', errors.array());
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { orderId, amount, callbackUrl } = req.body;

    // Validate that order exists and belongs to user
    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      terminalLog('ORDER_VALIDATION_ERROR', 'ERROR', {
        orderId,
        reason: 'order_not_found'
      });
      console.log(`❌ Order not found: ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user._id.toString() !== req.user._id.toString()) {
      terminalLog('ORDER_OWNERSHIP_ERROR', 'ERROR', {
        orderId,
        orderUserId: order.user._id.toString(),
        requestUserId: req.user._id.toString()
      });
      console.log(`❌ Order ownership mismatch: ${orderId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this order'
      });
    }

    // Check if order is already paid
    if (order.isPaid) {
      terminalLog('ORDER_ALREADY_PAID', 'ERROR', {
        orderId,
        orderNumber: order.orderNumber,
        paidAt: order.paidAt
      });
      console.log(`❌ Order already paid: ${order.orderNumber}`);
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Validate amount matches order total
    if (parseFloat(amount) !== parseFloat(order.totalPrice)) {
      terminalLog('AMOUNT_MISMATCH_ERROR', 'ERROR', {
        requestedAmount: amount,
        orderAmount: order.totalPrice,
        orderId
      });
      console.log(`❌ Amount mismatch: ${amount} vs ${order.totalPrice}`);
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match order total'
      });
    }

    // Prepare SMEPay order data
    const smepayOrderData = {
      orderId: order.orderNumber, // Use order number instead of MongoDB ID
      amount: order.totalPrice,
      callbackUrl: callbackUrl || `${process.env.FRONTEND_URL}/payment/callback`,
      customerDetails: {
        email: order.user.email,
        mobile: order.user.mobileNumber || '',
        name: order.user.name
      }
    };

    terminalLog('SMEPAY_ORDER_DATA_PREPARED', 'PROCESSING', {
      orderNumber: smepayOrderData.orderId,
      amount: smepayOrderData.amount,
      customerEmail: smepayOrderData.customerDetails.email
    });

    // Create order with SMEPay
    const smepayResult = await smepayService.createOrder(smepayOrderData);

    if (!smepayResult.success) {
      terminalLog('SMEPAY_CREATE_ORDER_FAILED', 'ERROR', {
        orderId,
        error: smepayResult.error,
        details: smepayResult.details
      });
      console.log(`❌ SMEPay order creation failed: ${smepayResult.error}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order',
        error: smepayResult.error
      });
    }

    // Update order with SMEPay details
    order.paymentResult = {
      ...order.paymentResult,
      smepay_order_slug: smepayResult.orderSlug
    };
    await order.save();

    terminalLog('SMEPAY_CREATE_ORDER_SUCCESS', 'SUCCESS', {
      orderId,
      orderNumber: order.orderNumber,
      smepayOrderSlug: smepayResult.orderSlug,
      amount: order.totalPrice
    });

    console.log(`
✅ ===============================
   SMEPAY ORDER CREATED!
===============================
📦 Order: ${order.orderNumber}
💳 SMEPay Slug: ${smepayResult.orderSlug}
💰 Amount: ₹${order.totalPrice}
👤 Customer: ${order.user.name}
📧 Email: ${order.user.email}
🔗 Payment URL: Ready for frontend
===============================`);

    res.status(200).json({
      success: true,
      message: 'SMEPay order created successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        smepayOrderSlug: smepayResult.orderSlug,
        amount: order.totalPrice,
        customerDetails: smepayOrderData.customerDetails,
        message: smepayResult.message
      }
    });

  } catch (error) {
    terminalLog('SMEPAY_CREATE_ORDER_ERROR', 'ERROR', {
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });
    
    console.log(`
❌ ===============================
   SMEPAY ORDER CREATION FAILED!
===============================
👤 User: ${req.user?.name}
🚨 Error: ${error.message}
⏱️  Time: ${new Date().toLocaleString()}
===============================`);
    
    console.error('❌ Create SMEPay Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Generate QR code for SMEPay order
// @route   POST /api/payments/smepay/generate-qr
// @access  Private (User)
exports.generateSMEPayQR = async (req, res) => {
  try {
    terminalLog('SMEPAY_GENERATE_QR_START', 'PROCESSING', {
      userId: req.user._id,
      requestBody: req.body
    });

    console.log(`🔳 Generating QR code for SMEPay order...`);

    const { orderId } = req.body;

    // Validate that order exists and belongs to user
    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      terminalLog('QR_ORDER_VALIDATION_ERROR', 'ERROR', {
        orderId,
        reason: 'order_not_found'
      });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user._id.toString() !== req.user._id.toString()) {
      terminalLog('QR_ORDER_OWNERSHIP_ERROR', 'ERROR', {
        orderId,
        orderUserId: order.user._id.toString(),
        requestUserId: req.user._id.toString()
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate QR for this order'
      });
    }

    // Check if order has SMEPay slug
    if (!order.paymentResult?.smepay_order_slug) {
      terminalLog('QR_SMEPAY_SLUG_MISSING', 'ERROR', {
        orderId,
        orderNumber: order.orderNumber
      });
      return res.status(400).json({
        success: false,
        message: 'SMEPay order not created yet. Please create payment order first.'
      });
    }

    // Generate QR code
    const qrResult = await smepayService.generateQR(order.paymentResult.smepay_order_slug);

    if (!qrResult.success) {
      terminalLog('SMEPAY_GENERATE_QR_FAILED', 'ERROR', {
        orderId,
        orderSlug: order.paymentResult.smepay_order_slug,
        error: qrResult.error
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        error: qrResult.error
      });
    }

    // Update order with QR reference ID
    order.paymentResult = {
      ...order.paymentResult,
      smepay_ref_id: qrResult.refId
    };
    await order.save();

    terminalLog('SMEPAY_GENERATE_QR_SUCCESS', 'SUCCESS', {
      orderId,
      orderNumber: order.orderNumber,
      refId: qrResult.refId,
      hasQRCode: !!qrResult.qrCode
    });

    console.log(`✅ QR code generated for order ${order.orderNumber}`);

    res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        qrCode: qrResult.qrCode,
        upiLinks: qrResult.upiLinks,
        refId: qrResult.refId,
        amount: order.totalPrice
      }
    });

  } catch (error) {
    terminalLog('SMEPAY_GENERATE_QR_ERROR', 'ERROR', {
      userId: req.user?._id,
      error: error.message
    });
    console.error('❌ Generate SMEPay QR Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Check SMEPay QR payment status
// @route   POST /api/payments/smepay/check-qr-status
// @access  Private (User)
exports.checkSMEPayQRStatus = async (req, res) => {
  try {
    terminalLog('SMEPAY_CHECK_QR_STATUS_START', 'PROCESSING', {
      userId: req.user._id,
      requestBody: req.body
    });

    const { orderId } = req.body;

    // Validate that order exists and belongs to user
    const order = await Order.findById(orderId).populate('user seller');
    if (!order) {
      terminalLog('QR_STATUS_ORDER_NOT_FOUND', 'ERROR', { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user._id.toString() !== req.user._id.toString()) {
      terminalLog('QR_STATUS_UNAUTHORIZED', 'ERROR', {
        orderId,
        orderUserId: order.user._id.toString(),
        requestUserId: req.user._id.toString()
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to check status for this order'
      });
    }

    // Check if order has required SMEPay data
    if (!order.paymentResult?.smepay_order_slug || !order.paymentResult?.smepay_ref_id) {
      terminalLog('QR_STATUS_MISSING_DATA', 'ERROR', {
        orderId,
        hasSlug: !!order.paymentResult?.smepay_order_slug,
        hasRefId: !!order.paymentResult?.smepay_ref_id
      });
      return res.status(400).json({
        success: false,
        message: 'Payment data incomplete. Please regenerate QR code.'
      });
    }

    // Check payment status with SMEPay
    const statusResult = await smepayService.checkQRStatus({
      slug: order.paymentResult.smepay_order_slug,
      refId: order.paymentResult.smepay_ref_id
    });

    if (!statusResult.success) {
      terminalLog('SMEPAY_CHECK_QR_STATUS_FAILED', 'ERROR', {
        orderId,
        error: statusResult.error
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to check payment status',
        error: statusResult.error
      });
    }

    // If payment is successful, update order
    if (statusResult.isPaymentSuccessful && !order.isPaid) {
      terminalLog('PAYMENT_SUCCESS_DETECTED', 'SUCCESS', {
        orderId,
        orderNumber: order.orderNumber,
        paymentStatus: statusResult.paymentStatus
      });

      // Update order payment status
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentMethod = 'SMEPay';
      order.paymentResult = {
        ...order.paymentResult,
        status: 'completed',
        smepay_transaction_id: statusResult.data?.transaction_id || '',
        update_time: new Date().toISOString()
      };

      // Update order status to Processing (paid orders move to processing)
      order.status = 'Processing';
      
      await order.save();

      console.log(`
🎉 ===============================
   PAYMENT SUCCESSFUL!
===============================
📦 Order: ${order.orderNumber}
💳 Transaction ID: ${statusResult.data?.transaction_id || 'N/A'}
💰 Amount: ₹${order.totalPrice}
👤 Customer: ${order.user.name}
🏪 Seller: ${order.seller.firstName}
📅 Paid At: ${order.paidAt.toLocaleString()}
===============================`);

      // Emit real-time notification to seller
      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'payment-completed', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          isPaid: order.isPaid,
          paidAt: order.paidAt,
          totalPrice: order.totalPrice,
          user: order.user,
          paymentMethod: order.paymentMethod
        });
      }

      // Emit notification to buyer
      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'payment-successful', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          isPaid: order.isPaid,
          paidAt: order.paidAt,
          totalPrice: order.totalPrice,
          paymentMethod: order.paymentMethod
        });
      }
    }

    terminalLog('SMEPAY_CHECK_QR_STATUS_SUCCESS', 'SUCCESS', {
      orderId,
      orderNumber: order.orderNumber,
      paymentStatus: statusResult.paymentStatus,
      isPaymentSuccessful: statusResult.isPaymentSuccessful,
      orderUpdated: statusResult.isPaymentSuccessful && !order.isPaid
    });

    res.status(200).json({
      success: true,
      message: 'Payment status checked successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: statusResult.paymentStatus,
        isPaymentSuccessful: statusResult.isPaymentSuccessful,
        isPaid: order.isPaid,
        paidAt: order.paidAt,
        orderStatus: order.status,
        transactionId: order.paymentResult?.smepay_transaction_id || null
      }
    });

  } catch (error) {
    terminalLog('SMEPAY_CHECK_QR_STATUS_ERROR', 'ERROR', {
      userId: req.user?._id,
      error: error.message
    });
    console.error('❌ Check SMEPay QR Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Validate SMEPay order payment
// @route   POST /api/payments/smepay/validate-order
// @access  Private (User)
exports.validateSMEPayOrder = async (req, res) => {
  try {
    terminalLog('SMEPAY_VALIDATE_ORDER_START', 'PROCESSING', {
      userId: req.user._id,
      requestBody: req.body
    });

    const { orderId } = req.body;

    // Validate that order exists and belongs to user
    const order = await Order.findById(orderId).populate('user seller');
    if (!order) {
      terminalLog('VALIDATE_ORDER_NOT_FOUND', 'ERROR', { orderId });
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user._id.toString() !== req.user._id.toString()) {
      terminalLog('VALIDATE_ORDER_UNAUTHORIZED', 'ERROR', {
        orderId,
        orderUserId: order.user._id.toString(),
        requestUserId: req.user._id.toString()
      });
      return res.status(403).json({
        success: false,
        message: 'Not authorized to validate this order'
      });
    }

    // Check if order has SMEPay slug
    if (!order.paymentResult?.smepay_order_slug) {
      terminalLog('VALIDATE_ORDER_NO_SLUG', 'ERROR', {
        orderId,
        orderNumber: order.orderNumber
      });
      return res.status(400).json({
        success: false,
        message: 'SMEPay order not created yet'
      });
    }

    // Validate order with SMEPay
    const validationResult = await smepayService.validateOrder({
      slug: order.paymentResult.smepay_order_slug,
      amount: order.totalPrice
    });

    if (!validationResult.success) {
      terminalLog('SMEPAY_VALIDATE_ORDER_FAILED', 'ERROR', {
        orderId,
        error: validationResult.error
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to validate order payment',
        error: validationResult.error
      });
    }

    // If payment is successful and order not yet marked as paid
    if (validationResult.isPaymentSuccessful && !order.isPaid) {
      // Update order payment status
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentMethod = 'SMEPay';
      order.paymentResult = {
        ...order.paymentResult,
        status: 'completed',
        update_time: new Date().toISOString()
      };

      // Update order status to Processing
      order.status = 'Processing';
      
      await order.save();

      terminalLog('PAYMENT_VALIDATION_SUCCESS', 'SUCCESS', {
        orderId,
        orderNumber: order.orderNumber,
        paymentStatus: validationResult.paymentStatus
      });

      console.log(`✅ Payment validated and order updated: ${order.orderNumber}`);
    }

    res.status(200).json({
      success: true,
      message: 'Order payment validated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: validationResult.paymentStatus,
        isPaymentSuccessful: validationResult.isPaymentSuccessful,
        isPaid: order.isPaid,
        paidAt: order.paidAt,
        orderStatus: order.status
      }
    });

  } catch (error) {
    terminalLog('SMEPAY_VALIDATE_ORDER_ERROR', 'ERROR', {
      userId: req.user?._id,
      error: error.message
    });
    console.error('❌ Validate SMEPay Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Handle SMEPay webhook callback
// @route   POST /api/payments/smepay/webhook
// @access  Public (webhook)
exports.handleSMEPayWebhook = async (req, res) => {
  try {
    terminalLog('SMEPAY_WEBHOOK_RECEIVED', 'PROCESSING', {
      headers: req.headers,
      body: req.body
    });

    console.log(`
📡 ===============================
   SMEPAY WEBHOOK RECEIVED
===============================
🔗 URL: ${req.originalUrl}
📝 Method: ${req.method}
📊 Body Size: ${JSON.stringify(req.body).length} bytes
🕐 Time: ${new Date().toLocaleString()}
===============================`);

    const webhookSignature = req.headers['x-smepay-signature'] || req.headers['smepay-signature'];
    
    // Process webhook with SMEPay service
    const webhookResult = await smepayService.processWebhook(req.body, webhookSignature);

    if (!webhookResult.success) {
      terminalLog('SMEPAY_WEBHOOK_PROCESSING_FAILED', 'ERROR', {
        error: webhookResult.error,
        body: req.body
      });
      return res.status(400).json({
        success: false,
        message: 'Webhook processing failed',
        error: webhookResult.error
      });
    }

    const { eventType, orderId, paymentStatus, transactionId } = webhookResult.data;

    // Find order by order number (orderId in webhook is order number)
    const order = await Order.findOne({ orderNumber: orderId }).populate('user seller');

    if (!order) {
      terminalLog('WEBHOOK_ORDER_NOT_FOUND', 'ERROR', {
        orderNumber: orderId,
        eventType,
        paymentStatus
      });
      return res.status(404).json({
        success: false,
        message: 'Order not found for webhook'
      });
    }

    // Process payment update based on event
    if (eventType === 'payment_update' && paymentStatus === 'paid' && !order.isPaid) {
      // Update order payment status
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentMethod = 'SMEPay';
      order.paymentResult = {
        ...order.paymentResult,
        status: 'completed',
        smepay_transaction_id: transactionId || '',
        update_time: new Date().toISOString()
      };

      // Update order status to Processing
      order.status = 'Processing';
      
      await order.save();

      terminalLog('WEBHOOK_PAYMENT_SUCCESS', 'SUCCESS', {
        orderNumber: order.orderNumber,
        transactionId,
        eventType,
        amount: order.totalPrice
      });

      console.log(`
🎉 ===============================
   WEBHOOK PAYMENT SUCCESS!
===============================
📦 Order: ${order.orderNumber}
💳 Transaction: ${transactionId}
💰 Amount: ₹${order.totalPrice}
👤 Customer: ${order.user.name}
📧 Email: ${order.user.email}
===============================`);

      // Emit real-time notifications
      if (global.emitToSeller) {
        global.emitToSeller(order.seller._id, 'payment-completed', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          isPaid: order.isPaid,
          paidAt: order.paidAt,
          totalPrice: order.totalPrice,
          user: order.user,
          paymentMethod: order.paymentMethod,
          transactionId
        });
      }

      if (global.emitToBuyer) {
        global.emitToBuyer(order.user._id, 'payment-successful', {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          isPaid: order.isPaid,
          paidAt: order.paidAt,
          totalPrice: order.totalPrice,
          paymentMethod: order.paymentMethod,
          transactionId
        });
      }
    }

    terminalLog('SMEPAY_WEBHOOK_PROCESSED', 'SUCCESS', {
      orderNumber: order.orderNumber,
      eventType,
      paymentStatus,
      orderUpdated: paymentStatus === 'paid' && !order.isPaid
    });

    // Return success response to SMEPay
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      orderId: order.orderNumber,
      processed: true
    });

  } catch (error) {
    terminalLog('SMEPAY_WEBHOOK_ERROR', 'ERROR', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    console.log(`
❌ ===============================
   WEBHOOK PROCESSING FAILED!
===============================
🚨 Error: ${error.message}
⏱️  Time: ${new Date().toLocaleString()}
===============================`);
    
    console.error('❌ SMEPay Webhook Error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing error',
      error: error.message
    });
  }
};

// @desc    Get payment methods and configuration
// @route   GET /api/payments/methods
// @access  Public
exports.getPaymentMethods = async (req, res) => {
  try {
    terminalLog('GET_PAYMENT_METHODS', 'PROCESSING');

    const paymentMethods = [
      {
        id: 'smepay',
        name: 'SMEPay',
        description: 'Secure UPI payments via SMEPay',
        icon: '/icons/smepay.png',
        enabled: true,
        features: ['UPI', 'QR Code', 'Real-time verification']
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        description: 'Pay when your order is delivered',
        icon: '/icons/cod.png',
        enabled: true,
        features: ['Cash', 'UPI at delivery', 'No advance payment']
      }
    ];

    terminalLog('GET_PAYMENT_METHODS_SUCCESS', 'SUCCESS', {
      methodCount: paymentMethods.length
    });

    res.status(200).json({
      success: true,
      data: paymentMethods
    });

  } catch (error) {
    terminalLog('GET_PAYMENT_METHODS_ERROR', 'ERROR', {
      error: error.message
    });
    console.error('❌ Get Payment Methods Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get payment history for user
// @route   GET /api/payments/history
// @access  Private (User)
exports.getPaymentHistory = async (req, res) => {
  try {
    terminalLog('GET_PAYMENT_HISTORY_START', 'PROCESSING', {
      userId: req.user._id
    });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Get paid orders for the user
    const orders = await Order.find({ 
      user: req.user._id,
      isPaid: true 
    })
    .select('orderNumber totalPrice paymentMethod paymentResult isPaid paidAt status')
    .sort({ paidAt: -1 })
    .skip(skip)
    .limit(limit);

    const totalPayments = await Order.countDocuments({ 
      user: req.user._id,
      isPaid: true 
    });

    terminalLog('GET_PAYMENT_HISTORY_SUCCESS', 'SUCCESS', {
      userId: req.user._id,
      paymentCount: orders.length,
      totalPayments,
      page
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      totalPages: Math.ceil(totalPayments / limit),
      currentPage: page,
      data: orders
    });

  } catch (error) {
    terminalLog('GET_PAYMENT_HISTORY_ERROR', 'ERROR', {
      userId: req.user?._id,
      error: error.message
    });
    console.error('❌ Get Payment History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 

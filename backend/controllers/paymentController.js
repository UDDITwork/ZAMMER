// backend/controllers/paymentController.js - COMPLETE SMEPay Integration Controller

const Order = require('../models/Order');
const smepayService = require('../services/smepayService');
const smepayConfig = require('../config/smepay');

// Enhanced logging
const logPayment = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '💳',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [PAYMENT-CONTROLLER] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

// @desc    Create SMEPay payment order
// @route   POST /api/payments/smepay/create-order
// @access  Private (User)
const createSMEPayOrder = async (req, res) => {
  try {
    const { orderId, amount, callbackUrl } = req.body;
    const userId = req.user._id;

    logPayment('CREATE_SMEPAY_ORDER_START', {
      orderId,
      amount,
      userId: userId.toString(),
      callbackUrl
    });

    // Validate request
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId).populate('user');
    
    if (!order) {
      logPayment('ORDER_NOT_FOUND', { orderId }, 'error');
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user._id.toString() !== userId.toString()) {
      logPayment('UNAUTHORIZED_ORDER_ACCESS', {
        orderId,
        orderUserId: order.user._id.toString(),
        requestUserId: userId.toString()
      }, 'error');
      
      return res.status(403).json({
        success: false,
        message: 'You can only create payments for your own orders'
      });
    }

    // Check if order is in correct state for payment
    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Use order total price if amount not provided
    const paymentAmount = amount || order.totalPrice;

    // Prepare SMEPay order data
    const smepayOrderData = {
      orderId: order._id.toString(),
      amount: paymentAmount,
      customerDetails: {
        email: order.user.email,
        mobile: order.user.mobileNumber,
        name: order.user.name
      },
      callbackUrl: callbackUrl || smepayConfig.getCallbackURL()
    };

    logPayment('CALLING_SMEPAY_SERVICE', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: paymentAmount,
      customerEmail: order.user.email
    });

    // Create SMEPay order
    const smepayResult = await smepayService.createOrder(smepayOrderData);

    if (!smepayResult.success) {
      logPayment('SMEPAY_ORDER_CREATION_FAILED', {
        orderId,
        error: smepayResult.error,
        details: smepayResult.details
      }, 'error');

      return res.status(400).json({
        success: false,
        message: smepayResult.error || 'Failed to create SMEPay order',
        details: smepayResult.details
      });
    }

    // Update order with SMEPay details
    order.smepayOrderSlug = smepayResult.orderSlug;
          order.paymentStatus = 'pending'; // This is correct - paymentStatus uses lowercase
    order.paymentGateway = 'smepay';
    
    // Add payment attempt to order history
    if (!order.paymentAttempts) {
      order.paymentAttempts = [];
    }
    
    order.paymentAttempts.push({
      gateway: 'smepay',
      orderSlug: smepayResult.orderSlug,
      amount: paymentAmount,
      status: 'initiated',
      createdAt: new Date()
    });

    await order.save();

    logPayment('SMEPAY_ORDER_CREATED_SUCCESS', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      smepayOrderSlug: smepayResult.orderSlug,
      amount: paymentAmount
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'SMEPay order created successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        smepayOrderSlug: smepayResult.orderSlug,
        amount: paymentAmount,
        callbackUrl: smepayOrderData.callbackUrl,
        smepayData: smepayResult.data
      }
    });

  } catch (error) {
    logPayment('CREATE_SMEPAY_ORDER_ERROR', {
      error: error.message,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating SMEPay order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Generate QR code for SMEPay payment
// @route   POST /api/payments/smepay/generate-qr
// @access  Private (User)
const generateSMEPayQR = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    logPayment('GENERATE_SMEPAY_QR_START', { orderId, userId: userId.toString() });

    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check ownership
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Check if order has SMEPay slug
    if (!order.smepayOrderSlug) {
      return res.status(400).json({
        success: false,
        message: 'Order is not prepared for SMEPay payment. Please create payment order first.'
      });
    }

    // Generate QR code
    const qrResult = await smepayService.generateQR(order.smepayOrderSlug);

    if (!qrResult.success) {
      logPayment('QR_GENERATION_FAILED', {
        orderId,
        error: qrResult.error
      }, 'error');

      return res.status(400).json({
        success: false,
        message: qrResult.error || 'Failed to generate QR code'
      });
    }

    logPayment('QR_GENERATED_SUCCESS', {
      orderId,
      orderSlug: order.smepayOrderSlug,
      hasQRCode: !!qrResult.qrCode,
      refId: qrResult.refId
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        qrCode: qrResult.qrCode,
        upiLinks: qrResult.upiLinks,
        refId: qrResult.refId,
        orderSlug: order.smepayOrderSlug
      }
    });

  } catch (error) {
    logPayment('GENERATE_QR_ERROR', { error: error.message }, 'error');

    res.status(500).json({
      success: false,
      message: 'Internal server error while generating QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Check SMEPay QR payment status
// @route   POST /api/payments/smepay/check-qr-status
// @access  Private (User)
const checkSMEPayQRStatus = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    logPayment('CHECK_QR_STATUS_START', { orderId, userId: userId.toString() });

    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check ownership
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    if (!order.smepayOrderSlug) {
      return res.status(400).json({
        success: false,
        message: 'No SMEPay payment found for this order'
      });
    }

    // 🎯 CRITICAL FIX: Check status with SMEPay AND update order automatically
    const statusResult = await smepayService.checkQRStatus({
      slug: order.smepayOrderSlug,
      refId: order.paymentAttempts?.[0]?.refId || 'default_ref'
    });

    if (!statusResult.success) {
      logPayment('STATUS_CHECK_FAILED', {
        orderId,
        error: statusResult.error
      }, 'error');

      return res.status(400).json({
        success: false,
        message: statusResult.error || 'Failed to check payment status'
      });
    }

    // 🎯 CRITICAL FIX: Auto-update order if payment is successful
    if (statusResult.isPaymentSuccessful && !order.isPaid) {
      console.log(`💰 Payment confirmed for order: ${order.orderNumber}`);
      
      // Update order payment status
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = 'completed';
      order.paymentResult = {
        gateway: 'smepay',
        transactionId: statusResult.data.transactionId || statusResult.data.order_id,
        paidAt: new Date(),
        paymentMethod: 'UPI/QR'
      };

      // Update payment attempt
      if (order.paymentAttempts && order.paymentAttempts.length > 0) {
        const latestAttempt = order.paymentAttempts[order.paymentAttempts.length - 1];
        latestAttempt.status = 'completed';
        latestAttempt.completedAt = new Date();
        latestAttempt.transactionId = statusResult.data.transactionId;
      }

      // 🎯 CRITICAL: Update order status to "Processing" after payment
      order.status = 'Processing';
      order.statusHistory.push({
        status: 'Processing',
        changedBy: 'system',
        changedAt: new Date(),
        notes: 'Payment confirmed, order processing started'
      });

      await order.save();

      logPayment('PAYMENT_COMPLETED_AND_ORDER_UPDATED', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        transactionId: statusResult.data.transactionId,
        amount: order.totalPrice,
        newStatus: order.status
      }, 'success');

      // 🎯 CRITICAL: Emit notifications for order status change
      const { emitBuyerNotification, emitOrderNotification, emitAdminNotification } = require('../controllers/orderController');
      
      // Notify buyer
      emitBuyerNotification(order.user, {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        isPaid: order.isPaid
      }, 'payment-completed');

      // Notify seller about new paid order
      emitOrderNotification(order.seller, {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalPrice: order.totalPrice,
        user: order.user,
        orderItems: order.orderItems,
        createdAt: order.createdAt,
        isPaid: order.isPaid
      }, 'new-order');

      // Notify admin
      emitAdminNotification({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        isPaid: order.isPaid
      }, 'payment-completed');
    }

    logPayment('STATUS_CHECK_SUCCESS', {
      orderId,
      paymentStatus: statusResult.data.paymentStatus,
      isPaymentSuccessful: statusResult.isPaymentSuccessful,
      orderUpdated: order.isPaid
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Payment status checked successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: statusResult.data.paymentStatus,
        isPaymentSuccessful: statusResult.isPaymentSuccessful,
        isPaid: order.isPaid,
        orderStatus: order.status,
        smepayData: statusResult.data
      }
    });

  } catch (error) {
    logPayment('CHECK_STATUS_ERROR', { error: error.message }, 'error');

    res.status(500).json({
      success: false,
      message: 'Internal server error while checking payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Validate SMEPay payment order
// @route   POST /api/payments/smepay/validate-order
// @access  Private (User)
const validateSMEPayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    logPayment('VALIDATE_ORDER_START', { orderId, userId: userId.toString() });

    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check ownership
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    if (!order.smepayOrderSlug) {
      return res.status(400).json({
        success: false,
        message: 'No SMEPay payment found for this order'
      });
    }

    // Validate with SMEPay
    const validateResult = await smepayService.validateOrder({
      slug: order.smepayOrderSlug,
      amount: order.totalPrice
    });

    if (!validateResult.success) {
      logPayment('ORDER_VALIDATION_FAILED', {
        orderId,
        error: validateResult.error
      }, 'error');

      return res.status(400).json({
        success: false,
        message: validateResult.error || 'Failed to validate order'
      });
    }

    // Update order if payment is successful
    if (validateResult.isPaymentSuccessful && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = 'completed';
      order.paymentResult = {
        gateway: 'smepay',
        transactionId: validateResult.data.transactionId || 'smepay_' + Date.now(),
        paidAt: new Date(),
        paymentMethod: 'SMEPay'
      };

      await order.save();

      logPayment('PAYMENT_VALIDATED_AND_COMPLETED', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: validateResult.data.paymentStatus
      }, 'success');
    }

    res.status(200).json({
      success: true,
      message: 'Order validation completed',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        isPaymentSuccessful: validateResult.isPaymentSuccessful,
        paymentStatus: validateResult.data.paymentStatus,
        isPaid: order.isPaid,
        smepayData: validateResult.data
      }
    });

  } catch (error) {
    logPayment('VALIDATE_ORDER_ERROR', { error: error.message }, 'error');

    res.status(500).json({
      success: false,
      message: 'Internal server error while validating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🎯 NEW: Auto-confirm payment after SMEPay completion
// @desc    Auto-confirm SMEPay payment
// @route   POST /api/payments/smepay/auto-confirm
// @access  Private (User)
const autoConfirmSMEPayPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    logPayment('AUTO_CONFIRM_PAYMENT_START', { orderId, userId: userId.toString() });

    // Find the order
    const order = await Order.findById(orderId).populate('user seller');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check ownership
    if (order.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    if (!order.smepayOrderSlug) {
      return res.status(400).json({
        success: false,
        message: 'No SMEPay payment found for this order'
      });
    }

    // 🎯 CRITICAL: Check with SMEPay and confirm payment
    const confirmResult = await smepayService.validateOrder({
      slug: order.smepayOrderSlug,
      amount: order.totalPrice
    });

    if (!confirmResult.success) {
      logPayment('AUTO_CONFIRM_FAILED', {
        orderId,
        error: confirmResult.error
      }, 'error');

      return res.status(400).json({
        success: false,
        message: confirmResult.error || 'Failed to confirm payment'
      });
    }

    // 🎯 CRITICAL: Update order if payment is confirmed
    if (confirmResult.isPaymentSuccessful && !order.isPaid) {
      console.log(`🎉 Payment auto-confirmed for order: ${order.orderNumber}`);
      
      // Update payment status
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = 'completed';
      order.paymentResult = {
        gateway: 'smepay',
        transactionId: confirmResult.data.transactionId || 'smepay_' + Date.now(),
        paidAt: new Date(),
        paymentMethod: 'SMEPay'
      };

      // 🎯 CRITICAL: Update order status
      order.status = 'Processing';
      order.statusHistory.push({
        status: 'Processing',
        changedBy: 'system',
        changedAt: new Date(),
        notes: 'Payment confirmed via SMEPay, order processing started'
      });

      await order.save();

      logPayment('AUTO_CONFIRM_SUCCESS', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        newStatus: order.status
      }, 'success');

      // 🎯 CRITICAL: Emit all necessary notifications
      const { emitBuyerNotification, emitOrderNotification, emitAdminNotification } = require('../controllers/orderController');
      
      // Notify buyer
      emitBuyerNotification(order.user._id, {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        isPaid: order.isPaid
      }, 'payment-completed');

      // Notify seller about new paid order
      emitOrderNotification(order.seller._id, {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalPrice: order.totalPrice,
        user: order.user,
        orderItems: order.orderItems,
        createdAt: order.createdAt,
        isPaid: order.isPaid
      }, 'new-order');

      // Notify admin
      emitAdminNotification({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        isPaid: order.isPaid,
        user: order.user,
        seller: order.seller
      }, 'payment-completed');
    }

    res.status(200).json({
      success: true,
      message: 'Payment confirmation completed',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        isPaymentSuccessful: confirmResult.isPaymentSuccessful,
        paymentStatus: confirmResult.data.paymentStatus,
        isPaid: order.isPaid,
        orderStatus: order.status,
        smepayData: confirmResult.data
      }
    });

  } catch (error) {
    logPayment('AUTO_CONFIRM_ERROR', { error: error.message }, 'error');

    res.status(500).json({
      success: false,
      message: 'Internal server error while confirming payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Handle SMEPay webhook callback
// @route   POST /api/payments/smepay/webhook
// @access  Public (Called by SMEPay)
const handleSMEPayWebhook = async (req, res) => {
  try {
    const webhookPayload = req.body;
    const signature = req.headers['x-smepay-signature'];

    logPayment('WEBHOOK_RECEIVED', {
      hasPayload: !!webhookPayload,
      hasSignature: !!signature,
      payloadKeys: webhookPayload ? Object.keys(webhookPayload) : [],
      fullPayload: webhookPayload
    });

    console.log('🔔 SMEPay Webhook Received:', {
      timestamp: new Date().toISOString(),
      payload: webhookPayload,
      signature: signature
    });

    // 🎯 CRITICAL: Process webhook with enhanced logic
    const webhookResult = await smepayService.processWebhook(webhookPayload, signature);

    if (!webhookResult.success) {
      logPayment('WEBHOOK_PROCESSING_FAILED', {
        error: webhookResult.error,
        payload: webhookPayload
      }, 'error');

      return res.status(400).json({
        success: false,
        message: 'Webhook processing failed'
      });
    }

    const { data } = webhookResult;
    console.log('📊 Processed webhook data:', data);

    // 🎯 CRITICAL: Find order by SMEPay slug (more reliable than orderId)
    let order = null;
    
    if (data.orderSlug) {
      // Find by SMEPay order slug
      order = await Order.findOne({ smepayOrderSlug: data.orderSlug })
        .populate('user', 'name email mobileNumber')
        .populate('seller', 'firstName lastName email shop')
        .populate('orderItems.product', 'name images');
    } else if (data.orderId) {
      // Fallback: Find by order ID
      order = await Order.findById(data.orderId)
        .populate('user', 'name email mobileNumber')
        .populate('seller', 'firstName lastName email shop')
        .populate('orderItems.product', 'name images');
    }

    if (!order) {
      logPayment('WEBHOOK_ORDER_NOT_FOUND', { 
        orderSlug: data.orderSlug, 
        orderId: data.orderId,
        availableOrders: await Order.countDocuments({ smepayOrderSlug: { $exists: true } })
      }, 'warning');
      
      console.log('❌ Order not found for webhook data:', data);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`📦 Found order: ${order.orderNumber} for webhook`);

    // 🎯 CRITICAL: Update order based on webhook data
    if (data.paymentStatus === 'paid' || data.paymentStatus === 'success' || data.paymentStatus === 'completed') {
      if (!order.isPaid) {
        console.log(`💰 Payment confirmed via webhook for order: ${order.orderNumber}`);
        
        // Update payment status
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentStatus = 'completed';
        order.paymentResult = {
          gateway: 'smepay',
          transactionId: data.transactionId || 'webhook_' + Date.now(),
          paidAt: new Date(),
          paymentMethod: 'SMEPay Webhook',
          webhookData: data
        };

        // 🎯 CRITICAL: Update order status to "Processing" after payment
        order.status = 'Processing';
        order.statusHistory.push({
          status: 'Processing',
          changedBy: 'system',
          changedAt: new Date(),
          notes: 'Payment confirmed via SMEPay webhook, order processing started'
        });

        // Update payment attempts
        if (order.paymentAttempts && order.paymentAttempts.length > 0) {
          const latestAttempt = order.paymentAttempts[order.paymentAttempts.length - 1];
          latestAttempt.status = 'completed';
          latestAttempt.completedAt = new Date();
          latestAttempt.transactionId = data.transactionId;
        }

        await order.save();

        logPayment('WEBHOOK_PAYMENT_COMPLETED_AND_ORDER_UPDATED', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          transactionId: data.transactionId,
          paymentStatus: data.paymentStatus,
          newOrderStatus: order.status
        }, 'success');

        console.log(`✅ Order updated successfully: ${order.orderNumber}`);
        console.log(`📋 New Status: ${order.status}`);
        console.log(`💳 Payment Status: ${order.paymentStatus}`);

        // 🎯 CRITICAL: Emit all necessary notifications
        const { emitBuyerNotification, emitOrderNotification, emitAdminNotification } = require('../controllers/orderController');
        
        // Notify buyer about payment completion
        emitBuyerNotification(order.user._id, {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          isPaid: order.isPaid,
          transactionId: data.transactionId
        }, 'payment-completed');

        // Notify seller about new paid order
        emitOrderNotification(order.seller._id, {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalPrice: order.totalPrice,
          user: order.user,
          orderItems: order.orderItems,
          createdAt: order.createdAt,
          isPaid: order.isPaid,
          paymentMethod: 'SMEPay'
        }, 'new-order');

        // Notify admin about payment completion
        emitAdminNotification({
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          isPaid: order.isPaid,
          user: order.user,
          seller: order.seller,
          totalPrice: order.totalPrice,
          transactionId: data.transactionId,
          paymentMethod: 'SMEPay'
        }, 'payment-completed');

        console.log(`📡 All notifications sent for order: ${order.orderNumber}`);
      } else {
        console.log(`ℹ️ Order ${order.orderNumber} already marked as paid`);
      }
    } else {
      console.log(`ℹ️ Payment status not completed: ${data.paymentStatus}`);
    }

    // Send success response to SMEPay
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      orderProcessed: !!order,
      orderNumber: order?.orderNumber,
      paymentStatus: data.paymentStatus
    });

  } catch (error) {
    logPayment('WEBHOOK_ERROR', { 
      error: error.message, 
      stack: error.stack,
      payload: req.body 
    }, 'error');

    console.error('❌ Webhook processing error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while processing webhook',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
};

// @desc    Get available payment methods
// @route   GET /api/payments/methods
// @access  Public
const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'smepay',
        name: 'SMEPay',
        description: 'Secure UPI and card payments',
        enabled: true,
        types: ['UPI', 'Card', 'Net Banking']
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        description: 'Pay when you receive your order',
        enabled: true,
        types: ['Cash']
      }
    ];

    res.status(200).json({
      success: true,
      message: 'Payment methods retrieved successfully',
      data: paymentMethods
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods'
    });
  }
};

// @desc    Get user payment history
// @route   GET /api/payments/history
// @access  Private (User)
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find orders with payments for this user
    const orders = await Order.find({
      user: userId,
      isPaid: true
    })
    .select('orderNumber totalPrice paymentMethod paymentResult paidAt createdAt')
    .sort({ paidAt: -1 })
    .skip(skip)
    .limit(limit);

    const totalOrders = await Order.countDocuments({
      user: userId,
      isPaid: true
    });

    const totalPages = Math.ceil(totalOrders / limit);

    res.status(200).json({
      success: true,
      message: 'Payment history retrieved successfully',
      data: orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
};

module.exports = {
  createSMEPayOrder,
  generateSMEPayQR,
  checkSMEPayQRStatus,
  validateSMEPayOrder,
  handleSMEPayWebhook,
  getPaymentMethods,
  getPaymentHistory,
  autoConfirmSMEPayPayment // 🎯 Add this new function
};
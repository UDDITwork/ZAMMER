// backend/controllers/cashfreePGController.js - Cashfree Payment Gateway Controller

const Order = require('../models/Order');
const cashfreePGService = require('../services/cashfreePGService');
const cashfreePGConfig = require('../config/cashfreePG');

// Enhanced logging
const logPayment = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '💳',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [CASHFREE-PG-CONTROLLER] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

// @desc    Create Cashfree payment order
// @route   POST /api/payments/cashfree/create-order
// @access  Private (User)
const createCashfreeOrder = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const userId = req.user._id;

    logPayment('CREATE_CASHFREE_ORDER_START', {
      orderId,
      amount,
      userId: userId.toString()
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

    // Check if Cashfree order already exists
    if (order.cashfreeOrderId) {
      logPayment('CASHFREE_ORDER_ALREADY_EXISTS', {
        orderId,
        cashfreeOrderId: order.cashfreeOrderId
      }, 'warning');
      
      return res.status(400).json({
        success: false,
        message: 'Cashfree payment order already exists for this order',
        data: {
          cashfreeOrderId: order.cashfreeOrderId,
          cashfreePaymentSessionId: order.cashfreePaymentSessionId
        }
      });
    }

    // Use order total price if amount not provided
    const paymentAmount = amount || order.totalPrice;

    // Prepare Cashfree order data
    const cashfreeOrderData = {
      orderId: cashfreePGConfig.utils.generateOrderId(order._id),
      orderAmount: paymentAmount,
      orderCurrency: 'INR',
      customerDetails: {
        customer_id: cashfreePGConfig.utils.generateCustomerId(order.user._id),
        customer_phone: order.user.mobileNumber || order.shippingAddress?.phone || '9999999999',
        customer_email: order.user.email,
        customer_name: order.user.name
      },
      orderNote: `Payment for Order #${order.orderNumber}`,
      orderTags: {
        order_number: order.orderNumber,
        mongo_order_id: order._id.toString(),
        user_id: order.user._id.toString()
      }
    };

    logPayment('CALLING_CASHFREE_SERVICE', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: paymentAmount,
      customerEmail: order.user.email
    });

    // Create Cashfree order
    const cashfreeResult = await cashfreePGService.createOrder(cashfreeOrderData);

    if (!cashfreeResult.success) {
      logPayment('CASHFREE_ORDER_CREATION_FAILED', {
        orderId,
        error: cashfreeResult.error,
        errorCode: cashfreeResult.errorCode,
        cashfreeCode: cashfreeResult.cashfreeCode,
        cashfreeType: cashfreeResult.cashfreeType,
        statusCode: cashfreeResult.statusCode,
        details: cashfreeResult.details
      }, 'error');

      // Return complete error response with all Cashfree error details
      return res.status(cashfreeResult.statusCode || 400).json({
        success: false,
        message: cashfreeResult.error || 'Failed to create Cashfree order',
        errorCode: cashfreeResult.errorCode,          // Our mapped code: "REQUEST_FAILED"
        cashfreeCode: cashfreeResult.cashfreeCode,    // Original code: "request_failed"
        cashfreeType: cashfreeResult.cashfreeType,    // Original type: "authentication_error"
        statusCode: cashfreeResult.statusCode,        // HTTP status: 401, 400, etc.
        help: cashfreeResult.help,                    // Help text if available
        details: cashfreeResult.details,              // Complete error object from Cashfree
        operation: cashfreeResult.operation           // Operation that failed
      });
    }

    // Update order with Cashfree details
    order.cashfreeOrderId = cashfreeResult.data.cf_order_id;
    order.cashfreePaymentSessionId = cashfreeResult.data.payment_session_id;
    order.paymentStatus = 'pending';
    order.paymentGateway = 'cashfree';
    
    // Add payment attempt to order history
    if (!order.paymentAttempts) {
      order.paymentAttempts = [];
    }
    
    order.paymentAttempts.push({
      gateway: 'cashfree',
      orderSlug: cashfreeResult.data.cf_order_id,
      amount: paymentAmount,
      status: 'initiated',
      createdAt: new Date()
    });

    await order.save();

    logPayment('CASHFREE_ORDER_CREATED_SUCCESS', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      cashfreeOrderId: cashfreeResult.data.cf_order_id,
      paymentSessionId: cashfreeResult.data.payment_session_id ? 'RECEIVED' : 'MISSING',
      amount: paymentAmount
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Cashfree order created successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        cashfreeOrderId: cashfreeResult.data.cf_order_id,
        paymentSessionId: cashfreeResult.data.payment_session_id,
        orderStatus: cashfreeResult.data.order_status,
        amount: paymentAmount,
        expiryTime: cashfreeResult.data.order_expiry_time,
        cashfreeData: cashfreeResult.data
      }
    });

  } catch (error) {
    logPayment('CREATE_CASHFREE_ORDER_ERROR', {
      error: error.message,
      stack: error.stack
    }, 'error');

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating Cashfree order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Check Cashfree payment status (Polling endpoint)
// @route   POST /api/payments/cashfree/check-status
// @access  Private (User)
const getCashfreeOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    logPayment('CHECK_CASHFREE_STATUS_START', { orderId, userId: userId.toString() });

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

    // Check if order has Cashfree order ID
    if (!order.cashfreeOrderId) {
      return res.status(400).json({
        success: false,
        message: 'No Cashfree payment found for this order'
      });
    }

    logPayment('CHECKING_CASHFREE_STATUS', {
      orderId,
      cashfreeOrderId: order.cashfreeOrderId
    });

    // Check status with Cashfree
    const statusResult = await cashfreePGService.getOrderStatus(order.cashfreeOrderId);

    if (!statusResult.success) {
      logPayment('STATUS_CHECK_FAILED', {
        orderId,
        cashfreeOrderId: order.cashfreeOrderId,
        error: statusResult.error,
        errorCode: statusResult.errorCode,
        cashfreeCode: statusResult.cashfreeCode,
        statusCode: statusResult.statusCode
      }, 'error');

      // Return complete error response
      return res.status(statusResult.statusCode || 400).json({
        success: false,
        message: statusResult.error || 'Failed to check payment status',
        errorCode: statusResult.errorCode,
        cashfreeCode: statusResult.cashfreeCode,
        cashfreeType: statusResult.cashfreeType,
        statusCode: statusResult.statusCode,
        help: statusResult.help,
        details: statusResult.details,
        operation: statusResult.operation
      });
    }

    const cashfreeOrderStatus = statusResult.data.order_status;
    const isPaymentSuccessful = cashfreeOrderStatus === 'PAID';

    logPayment('CASHFREE_STATUS_CHECKED', {
      orderId,
      cashfreeOrderId: order.cashfreeOrderId,
      orderStatus: cashfreeOrderStatus,
      isPaymentSuccessful
    });

    // Auto-update order if payment is successful
    if (isPaymentSuccessful && !order.isPaid) {
      console.log(`💰 Cashfree payment confirmed for order: ${order.orderNumber}`);
      
      // Get payment details
      const paymentResult = await cashfreePGService.getPaymentDetails(order.cashfreeOrderId);
      const paymentDetails = paymentResult.success ? paymentResult.latestPayment : null;

      // Update order payment status
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = 'completed';
      order.paymentResult = {
        gateway: 'cashfree',
        transactionId: paymentDetails?.cf_payment_id || statusResult.data.cf_order_id,
        paidAt: new Date(),
        paymentMethod: paymentDetails?.payment_group || 'Cashfree',
        cashfreeOrderId: order.cashfreeOrderId
      };

      if (paymentDetails && paymentDetails.cf_payment_id) {
        order.cashfreePaymentId = paymentDetails.cf_payment_id;
      }

      // Update payment attempt
      if (order.paymentAttempts && order.paymentAttempts.length > 0) {
        const latestAttempt = order.paymentAttempts[order.paymentAttempts.length - 1];
        latestAttempt.status = 'completed';
        latestAttempt.completedAt = new Date();
        latestAttempt.transactionId = paymentDetails?.cf_payment_id;
      }

      // Keep order status as "Pending" after payment
      if (!order.statusHistory || order.statusHistory.length === 0) {
        order.statusHistory = [];
      }
      
      const hasPaymentConfirmedHistory = order.statusHistory.some(
        h => h.notes && h.notes.includes('Payment confirmed')
      );
      
      if (!hasPaymentConfirmedHistory) {
        order.statusHistory.push({
          status: 'Pending',
          changedBy: 'system',
          changedAt: new Date(),
          notes: 'Payment confirmed via Cashfree, awaiting seller confirmation'
        });
      }

      await order.save();

      logPayment('PAYMENT_COMPLETED_AND_ORDER_UPDATED', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        transactionId: paymentDetails?.cf_payment_id,
        amount: order.totalPrice,
        newStatus: 'Pending',
        paymentStatus: 'completed'
      }, 'success');

      // Emit notifications
      try {
        const { emitBuyerNotification, emitOrderNotification, emitAdminNotification } = require('../controllers/orderController');
        
        // Notify buyer about payment completion
        emitBuyerNotification(order.user._id, {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: 'Pending',
          paymentStatus: 'completed',
          isPaid: true
        }, 'payment-completed');

        // Notify seller about new paid order
        emitOrderNotification(order.seller, {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: 'Pending',
          totalPrice: order.totalPrice,
          user: order.user,
          orderItems: order.orderItems,
          createdAt: order.createdAt,
          isPaid: true,
          paymentStatus: 'completed'
        }, 'new-order');

        // Notify admin about payment completion
        emitAdminNotification({
          _id: order._id,
          orderNumber: order.orderNumber,
          status: 'Pending',
          paymentStatus: 'completed',
          isPaid: true
        }, 'payment-completed');

        logPayment('NOTIFICATIONS_SENT', { orderNumber: order.orderNumber }, 'success');
      } catch (notificationError) {
        logPayment('NOTIFICATION_ERROR', { error: notificationError.message }, 'warning');
        // Don't fail the request if notifications fail
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment status checked successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        cashfreeOrderId: order.cashfreeOrderId,
        cashfreeOrderStatus: cashfreeOrderStatus,
        isPaymentSuccessful,
        isPaid: order.isPaid,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        cashfreeData: statusResult.data
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

// @desc    Verify Cashfree payment
// @route   POST /api/payments/cashfree/verify-payment
// @access  Private (User)
const verifyCashfreePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    logPayment('VERIFY_CASHFREE_PAYMENT_START', { orderId, userId: userId.toString() });

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

    if (!order.cashfreeOrderId) {
      return res.status(400).json({
        success: false,
        message: 'No Cashfree payment found for this order'
      });
    }

    // Verify with Cashfree (includes order status + payment details)
    const verifyResult = await cashfreePGService.verifyPayment(order.cashfreeOrderId);

    if (!verifyResult.success) {
      logPayment('PAYMENT_VERIFICATION_FAILED', {
        orderId,
        error: verifyResult.error,
        errorCode: verifyResult.errorCode,
        statusCode: verifyResult.statusCode
      }, 'error');

      // Return complete error response
      return res.status(verifyResult.statusCode || 400).json({
        success: false,
        message: verifyResult.error || 'Failed to verify payment',
        errorCode: verifyResult.errorCode,
        cashfreeCode: verifyResult.cashfreeCode,
        cashfreeType: verifyResult.cashfreeType,
        statusCode: verifyResult.statusCode,
        help: verifyResult.help,
        details: verifyResult.details,
        operation: verifyResult.operation
      });
    }

    logPayment('PAYMENT_VERIFIED', {
      orderId,
      isPaymentSuccessful: verifyResult.isPaymentSuccessful,
      orderStatus: verifyResult.data.orderStatus
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Payment verification completed',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        isPaymentSuccessful: verifyResult.isPaymentSuccessful,
        isPaid: order.isPaid,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        verificationData: verifyResult.data
      }
    });

  } catch (error) {
    logPayment('VERIFY_PAYMENT_ERROR', { error: error.message }, 'error');

    res.status(500).json({
      success: false,
      message: 'Internal server error while verifying payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createCashfreeOrder,
  getCashfreeOrderStatus,
  verifyCashfreePayment
};


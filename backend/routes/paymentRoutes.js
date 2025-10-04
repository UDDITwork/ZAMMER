// backend/routes/paymentRoutes.js - SMEPay Integration Routes

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import payment controller (COMPLETE with SMEPay integration)
const {
  createSMEPayOrder,
  generateSMEPayQR,
  checkSMEPayQRStatus,
  validateSMEPayOrder,
  handleSMEPayWebhook,
  getPaymentMethods,
  getPaymentHistory,
  autoConfirmSMEPayPayment,
  fastConfirmSMEPayPayment // 🚀 OPTIMIZED: New fast confirmation endpoint
} = require('../controllers/paymentController');

// Import authentication middleware
const { protectUser } = require('../middleware/authMiddleware');

// 🎯 VALIDATION RULES
const createOrderValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least ₹1'),
  body('callbackUrl')
    .optional()
    .isURL()
    .withMessage('Callback URL must be a valid URL')
];

const qrValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format')
];

const statusCheckValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format')
];

const validateOrderValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID format')
];

// 🎯 SMEPAY PAYMENT ROUTES

// @desc    Create SMEPay payment order
// @route   POST /api/payments/smepay/create-order
// @access  Private (User)
router.post(
  '/smepay/create-order',
  protectUser,
  createOrderValidation,
  createSMEPayOrder
);

// @desc    Generate QR code for SMEPay order
// @route   POST /api/payments/smepay/generate-qr
// @access  Private (User)
router.post(
  '/smepay/generate-qr',
  protectUser,
  qrValidation,
  generateSMEPayQR
);

// @desc    Check SMEPay QR payment status
// @route   POST /api/payments/smepay/check-qr-status
// @access  Private (User)
router.post(
  '/smepay/check-qr-status',
  protectUser,
  statusCheckValidation,
  checkSMEPayQRStatus
);

// @desc    Validate SMEPay order payment
// @route   POST /api/payments/smepay/validate-order
// @access  Private (User)
router.post(
  '/smepay/validate-order',
  protectUser,
  validateOrderValidation,
  validateSMEPayOrder
);

// 🎯 NEW: Auto-confirm payment route
// @desc    Auto-confirm SMEPay payment
// @route   POST /api/payments/smepay/auto-confirm
// @access  Private (User)
router.post(
  '/smepay/auto-confirm',
  protectUser,
  [
    body('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID format')
  ],
  autoConfirmSMEPayPayment
);

// 🚀 OPTIMIZED: Fast payment confirmation route
// @desc    Fast payment confirmation for SMEpay
// @route   POST /api/payments/smepay/fast-confirm
// @access  Private (User)
router.post(
  '/smepay/fast-confirm',
  protectUser,
  [
    body('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID format')
  ],
  fastConfirmSMEPayPayment
);

// @desc    Handle SMEPay webhook callback
// @route   POST /api/payments/smepay/webhook
// @access  Public (webhook)
// Note: This endpoint should be public as it's called by SMEPay servers
router.post('/smepay/webhook', handleSMEPayWebhook);

// 🎯 GENERAL PAYMENT ROUTES

// @desc    Get available payment methods
// @route   GET /api/payments/methods
// @access  Public
router.get('/methods', getPaymentMethods);

// @desc    Get user payment history
// @route   GET /api/payments/history
// @access  Private (User)
router.get('/history', protectUser, getPaymentHistory);

// 🎯 HEALTH CHECK ROUTE
// @desc    Check payment service health
// @route   GET /api/payments/health
// @access  Public
router.get('/health', async (req, res) => {
  try {
    const smepayService = require('../services/smepayService');
    const healthResult = await smepayService.healthCheck();
    
    res.status(healthResult.success ? 200 : 500).json({
      success: healthResult.success,
      service: 'paymentRoutes',
      timestamp: new Date().toISOString(),
      smepay: healthResult,
      routes: {
        createOrder: 'POST /api/payments/smepay/create-order',
        generateQR: 'POST /api/payments/smepay/generate-qr',
        checkStatus: 'POST /api/payments/smepay/check-qr-status',
        validateOrder: 'POST /api/payments/smepay/validate-order',
        autoConfirm: 'POST /api/payments/smepay/auto-confirm',
        webhook: 'POST /api/payments/smepay/webhook',
        methods: 'GET /api/payments/methods',
        history: 'GET /api/payments/history'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'paymentRoutes',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add this to your backend/routes/paymentRoutes.js for testing

// 🎯 TEST ENDPOINT - Add this route for testing SMEPay
router.get('/test-smepay', async (req, res) => {
  try {
    const smepayService = require('../services/smepayService');
    
    console.log('🧪 Testing SMEPay Service...');
    
    // Test authentication
    const authResult = await smepayService.authenticate();
    
    // Test health check
    const healthResult = await smepayService.healthCheck();
    
    res.status(200).json({
      success: true,
      message: 'SMEPay test completed',
      authentication: !!authResult,
      health: healthResult,
      config: {
        baseURL: smepayService.baseURL,
        hasClientId: !!smepayService.clientId,
        hasClientSecret: !!smepayService.clientSecret
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🧪 SMEPay Test Failed:', error);
    res.status(500).json({
      success: false,
      message: 'SMEPay test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 ERROR HANDLING MIDDLEWARE
router.use((error, req, res, next) => {
  console.error('❌ [PaymentRoutes] Error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Payment service error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
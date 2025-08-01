 
// backend/routes/paymentRoutes.js - SMEPay Integration Routes

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  createSMEPayOrder,
  generateSMEPayQR,
  checkSMEPayQRStatus,
  validateSMEPayOrder,
  handleSMEPayWebhook,
  getPaymentMethods,
  getPaymentHistory
} = require('../controllers/paymentController');
const { protectUser } = require('../middleware/authMiddleware');

// @desc    Get available payment methods
// @route   GET /api/payments/methods
// @access  Public
router.get('/methods', getPaymentMethods);

// @desc    Get user payment history
// @route   GET /api/payments/history
// @access  Private (User)
router.get('/history', protectUser, getPaymentHistory);

// ===============================
// SMEPAY ROUTES
// ===============================

// @desc    Create SMEPay payment order
// @route   POST /api/payments/smepay/create-order
// @access  Private (User)
router.post('/smepay/create-order', 
  protectUser,
  [
    body('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID format'),
    body('amount')
      .isFloat({ min: 1 })
      .withMessage('Amount must be a positive number'),
    body('callbackUrl')
      .optional()
      .isURL()
      .withMessage('Callback URL must be a valid URL')
  ],
  createSMEPayOrder
);

// @desc    Generate QR code for SMEPay order
// @route   POST /api/payments/smepay/generate-qr
// @access  Private (User)
router.post('/smepay/generate-qr',
  protectUser,
  [
    body('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID format')
  ],
  generateSMEPayQR
);

// @desc    Check SMEPay QR payment status
// @route   POST /api/payments/smepay/check-qr-status
// @access  Private (User)
router.post('/smepay/check-qr-status',
  protectUser,
  [
    body('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID format')
  ],
  checkSMEPayQRStatus
);

// @desc    Validate SMEPay order payment
// @route   POST /api/payments/smepay/validate-order
// @access  Private (User)
router.post('/smepay/validate-order',
  protectUser,
  [
    body('orderId')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID format')
  ],
  validateSMEPayOrder
);

// @desc    Handle SMEPay webhook callback
// @route   POST /api/payments/smepay/webhook
// @access  Public (webhook - no auth required)
router.post('/smepay/webhook', handleSMEPayWebhook);

// ===============================
// FUTURE PAYMENT METHODS
// ===============================

// @desc    Create Razorpay order (placeholder for future implementation)
// @route   POST /api/payments/razorpay/create-order
// @access  Private (User)
router.post('/razorpay/create-order', protectUser, (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Razorpay integration coming soon'
  });
});

// @desc    Verify Razorpay payment (placeholder for future implementation)
// @route   POST /api/payments/razorpay/verify
// @access  Private (User)
router.post('/razorpay/verify', protectUser, (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Razorpay integration coming soon'
  });
});

// @desc    Create Stripe payment intent (placeholder for future implementation)
// @route   POST /api/payments/stripe/create-intent
// @access  Private (User)
router.post('/stripe/create-intent', protectUser, (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Stripe integration coming soon'
  });
});

module.exports = router;
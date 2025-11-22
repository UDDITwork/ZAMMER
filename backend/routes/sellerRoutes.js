const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { protectSeller } = require('../middleware/authMiddleware');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const {
  registerSeller,
  loginSeller,
  getSellerProfile,
  updateSellerProfile,
  uploadShopImages,
  sendSignupOTP,
  verifySignupOTPAndRegister,
  forgotPassword,
  verifyForgotPasswordOTP,
  verifyResetToken,
  resetPassword,
  resetPasswordDirect,
  checkEmailExists,
  getPaymentTracking,
  getEarningsSummary,
  generateShippingLabel,
  getShippingLabel,
  downloadShippingLabel
} = require('../controllers/sellerController');
const { debugPasswordIssues, testPasswordComparison } = require('../utils/passwordDebug');
const Seller = require('../models/Seller');

// 🔧 NEW: Send OTP for seller signup
// @desc    Send OTP to phone number for seller signup verification
// @route   POST /api/sellers/send-signup-otp
// @access  Public
router.post('/send-signup-otp', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('mobileNumber').notEmpty().withMessage('Mobile number is required')
], sendSignupOTP);

// 🔧 NEW: Verify signup OTP and register seller
// @desc    Verify OTP and create seller account
// @route   POST /api/sellers/verify-signup-otp
// @access  Public
router.post('/verify-signup-otp', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('mobileNumber').notEmpty().withMessage('Mobile number is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('shop.name').notEmpty().withMessage('Shop name is required'),
  body('shop.address').notEmpty().withMessage('Shop address is required'),
  body('shop.phoneNumber.main').notEmpty().withMessage('Shop phone number is required'),
  body('shop.category').notEmpty().withMessage('Shop category is required')
], verifySignupOTPAndRegister);

// Register a seller (DEPRECATED - Use OTP flow instead)
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('mobileNumber').notEmpty().withMessage('Mobile number is required'),
    body('shop.name').notEmpty().withMessage('Shop name is required'),
    body('shop.address').notEmpty().withMessage('Shop address is required'),
    body('shop.phoneNumber.main').notEmpty().withMessage('Shop phone number is required'),
    body('shop.category').notEmpty().withMessage('Shop category is required')
  ],
  registerSeller
);

// Login a seller
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  loginSeller
);

// Get seller profile
router.get('/profile', protectSeller, getSellerProfile);

// Update seller profile
router.put('/profile', protectSeller, updateSellerProfile);

// 🔧 NEW: Password reset routes with OTP (uses LOGIN_TEMPLATE_ID)
// @desc    Request password reset - sends OTP to seller's phone
// @route   POST /api/sellers/forgot-password
// @access  Public
router.post('/forgot-password', forgotPassword);

// 🔧 NEW: Verify OTP for password reset
// @desc    Verify OTP sent for password reset
// @route   POST /api/sellers/verify-forgot-password-otp
// @access  Public
router.post('/verify-forgot-password-otp', [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], verifyForgotPasswordOTP);

// Reset password using token from OTP verification
// @desc    Reset password using token from OTP verification
// @route   PUT /api/sellers/reset-password/:resetToken
// @access  Public
router.put('/reset-password/:resetToken', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], resetPassword);

// Legacy routes (DEPRECATED)
router.get('/reset-password/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Check if email exists
router.post('/check-email', [
  body('email').isEmail().withMessage('Please enter a valid email')
], checkEmailExists);

// Direct password reset (no token)
router.post('/reset-password-direct', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], resetPasswordDirect);

// @desc    Upload shop images to Cloudinary
// @route   POST /api/sellers/upload-shop-images
// @access  Private (Seller)
router.post('/upload-shop-images', protectSeller, upload.array('images', 10), handleMulterError, uploadShopImages);

// 🎯 NEW: Payment tracking routes
// @desc    Get seller payment tracking data
// @route   GET /api/sellers/payment-tracking
// @access  Private (Seller)
router.get('/payment-tracking', protectSeller, getPaymentTracking);

// @desc    Get seller earnings summary
// @route   GET /api/sellers/earnings-summary
// @access  Private (Seller)
router.get('/earnings-summary', protectSeller, getEarningsSummary);

// 🎯 NEW: Shipping label generation routes
// @desc    Generate shipping label for order
// @route   POST /api/sellers/orders/:orderId/generate-label
// @access  Private (Seller)
router.post('/orders/:orderId/generate-label', protectSeller, generateShippingLabel);

// @desc    Get shipping label data
// @route   GET /api/sellers/orders/:orderId/label
// @access  Private (Seller)
router.get('/orders/:orderId/label', protectSeller, getShippingLabel);

// @desc    Download shipping label PDF
// @route   GET /api/sellers/orders/:orderId/label/download
// @access  Private (Seller)
router.get('/orders/:orderId/label/download', protectSeller, downloadShippingLabel);

// 🎯 DEBUG ROUTES (Development only)
if (process.env.NODE_ENV === 'development') {
  // Debug password issues
  router.post('/debug/password-issues', async (req, res) => {
    try {
      const result = await debugPasswordIssues();
      res.json({
        success: true,
        message: 'Password debug completed',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Debug failed',
        error: error.message
      });
    }
  });

  // Test password for specific seller
  router.post('/debug/test-password', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await testPasswordComparison(email, password);
      res.json({
        success: true,
        data: { isMatch: result }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Test failed',
        error: error.message
      });
    }
  });

  // Get seller password info (for debugging)
  router.get('/debug/seller/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const seller = await Seller.findOne({ email }).select('email password firstName');
      
      if (!seller) {
        return res.status(404).json({
          success: false,
          message: 'Seller not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          email: seller.email,
          firstName: seller.firstName,
          passwordLength: seller.password?.length || 0,
          isHashed: seller.password?.length > 20,
          passwordPreview: seller.password ? seller.password.substring(0, 10) + '...' : 'none'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Debug failed',
        error: error.message
      });
    }
  });
}

module.exports = router;
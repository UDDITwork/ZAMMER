// File: /backend/routes/userRoutes.js - COMPLETE with password reset routes

const express = require('express');
const { body, check } = require('express-validator');
const router = express.Router();
const {
  registerUser,
  sendSignupOTP,
  verifySignupOTPAndRegister,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getNearbyShops,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  verifyEmail,
  verifyForgotPasswordOTP,
  resetPassword,
  forgotPassword,
  changePassword,
  testPassword,
  debugSellers,
  verifyAllSellers
} = require('../controllers/userController');
const { protectUser, optionalUserAuth } = require('../middleware/authMiddleware');

// 🔧 NEW: OTP-based signup flow
router.post(
  '/send-signup-otp',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('mobileNumber')
      .trim()
      .notEmpty()
      .withMessage('Mobile number is required')
      .isMobilePhone()
      .withMessage('Please enter a valid mobile number')
  ],
  sendSignupOTP
);

router.post(
  '/verify-signup-otp',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('mobileNumber')
      .trim()
      .notEmpty()
      .withMessage('Mobile number is required')
      .isMobilePhone()
      .withMessage('Please enter a valid mobile number'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .matches(/^\d+$/)
      .withMessage('OTP must be exactly 6 digits')
  ],
  verifySignupOTPAndRegister
);

// 🔧 DEPRECATED: Direct registration (kept for backward compatibility)
// Use /send-signup-otp and /verify-signup-otp instead
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('mobileNumber')
      .trim()
      .notEmpty()
      .withMessage('Mobile number is required')
      .isMobilePhone()
      .withMessage('Please enter a valid mobile number')
  ],
  registerUser
);

router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  loginUser
);

// 🔧 NEW: Password reset routes with OTP verification
router.post(
  '/forgot-password',
  [
    // Allow either email or phoneNumber
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('phoneNumber')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Phone number is required if email is not provided'),
    // Ensure at least one is provided
    body().custom((value) => {
      if (!value.email && !value.phoneNumber) {
        throw new Error('Either email or phone number is required');
      }
      return true;
    })
  ],
  forgotPassword
);

// 🔧 NEW: Verify OTP for password reset
router.post(
  '/verify-forgot-password-otp',
  [
    body('otp')
      .isLength({ min: 6, max: 6 })
      .matches(/^\d+$/)
      .withMessage('OTP must be exactly 6 digits'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('phoneNumber')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Phone number is required if email is not provided'),
    body().custom((value) => {
      if (!value.email && !value.phoneNumber) {
        throw new Error('Either email or phone number is required');
      }
      return true;
    })
  ],
  verifyForgotPasswordOTP
);

router.put(
  '/reset-password/:resetToken',
  [
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  resetPassword
);

// 🔧 FIXED: Nearby shops route (was missing!)
// @desc    Get nearby shops based on location
// @route   GET /api/users/nearby-shops?lat=&lng=&maxDistance=&limit=
// @access  Public (optionally authenticated for saved location)
router.get('/nearby-shops', optionalUserAuth, getNearbyShops);

// 🐛 DEBUG ROUTES - For development only
router.get('/debug-sellers', debugSellers);
router.get('/verify-all-sellers', verifyAllSellers);

// 🔧 NEW: Test password functionality (development only)
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/test-password',
    [
      body('email').isEmail().withMessage('Valid email required for testing'),
      body('password').optional().isLength({ min: 1 }).withMessage('Password required for testing'),
      body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    ],
    testPassword
  );
}

// 🔧 ENHANCED: Protected routes with better validation
router.get('/profile', protectUser, getUserProfile);

router.put(
  '/profile', 
  [
    protectUser,
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('mobileNumber')
      .optional()
      .trim()
      .isMobilePhone()
      .withMessage('Please enter a valid mobile number'),
    body('location.address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Address cannot be more than 500 characters')
  ],
  updateUserProfile
);

// 🔧 ENHANCED: Wishlist routes
router.get('/wishlist', protectUser, getWishlist);

router.post(
  '/wishlist', 
  [
    protectUser,
    check('productId')
      .not()
      .isEmpty()
      .withMessage('Product ID is required')
      .isMongoId()
      .withMessage('Invalid product ID format')
  ], 
  addToWishlist
);

router.delete(
  '/wishlist/:productId', 
  [
    protectUser,
    check('productId')
      .isMongoId()
      .withMessage('Invalid product ID format')
  ],
  removeFromWishlist
);

router.get(
  '/wishlist/check/:productId', 
  [
    protectUser,
    check('productId')
      .isMongoId()
      .withMessage('Invalid product ID format')
  ],
  checkWishlist
);

// 🔧 ENHANCED: Change password route with detailed logging
router.put(
  '/change-password',
  [
    protectUser,
    // Add detailed logging middleware
    (req, res, next) => {
      console.log('🔍 [VALIDATION-DEBUG] Request body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 [VALIDATION-DEBUG] Current password length:', req.body.currentPassword?.length);
      console.log('🔍 [VALIDATION-DEBUG] New password length:', req.body.newPassword?.length);
      console.log('🔍 [VALIDATION-DEBUG] Confirm password length:', req.body.confirmPassword?.length);
      next();
    },
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true;
      }),
  ],
  changePassword
);

// 🔧 PLACEHOLDER: Email verification route
router.post('/verify-email', verifyEmail);

module.exports = router;
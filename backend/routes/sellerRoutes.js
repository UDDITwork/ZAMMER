const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  registerSeller,
  loginSeller,
  getSellerProfile,
  updateSellerProfile,
  forgotPassword,
  verifyResetToken,
  resetPassword
} = require('../controllers/sellerController');
const { protectSeller } = require('../middleware/authMiddleware');

// Register a seller
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('mobileNumber').notEmpty().withMessage('Mobile number is required'),
    body('shop.name').notEmpty().withMessage('Shop name is required'),
    body('shop.address').notEmpty().withMessage('Shop address is required'),
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

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

module.exports = router;
// File: /backend/routes/userRoutes.js - COMPLETE with getNearbyShops route

const express = require('express');
const { body, check } = require('express-validator');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getNearbyShops,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  verifyEmail,
  resetPassword
} = require('../controllers/userController');
const { protectUser, optionalUserAuth } = require('../middleware/authMiddleware');

// Public routes
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('mobileNumber').notEmpty().withMessage('Mobile number is required')
  ],
  registerUser
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  loginUser
);

// 🎯 MISSING ROUTE - Add this line to fix the nearby shops functionality
// @desc    Get nearby shops based on location
// @route   GET /api/users/nearby-shops?lat=&lng=&maxDistance=&limit=
// @access  Public (optionally authenticated for saved location)
router.get('/nearby-shops', optionalUserAuth, getNearbyShops);

// Protected routes
router.get('/profile', protectUser, getUserProfile);
router.put('/profile', protectUser, updateUserProfile);

// Wishlist routes
router.get('/wishlist', protectUser, getWishlist);
router.post('/wishlist', [
  protectUser,
  check('productId', 'Product ID is required').not().isEmpty()
], addToWishlist);
router.delete('/wishlist/:productId', protectUser, removeFromWishlist);
router.get('/wishlist/check/:productId', protectUser, checkWishlist);

// Password reset routes
router.post('/verify-email', verifyEmail);
router.post('/reset-password', resetPassword);

module.exports = router;
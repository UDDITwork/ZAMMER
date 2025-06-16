const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  loginAdmin,
  getAllSellers,
  getSellerProfile,
  getAllUsers,
  getUserProfile,
  getDashboardStats
} = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/adminMiddleware');

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  loginAdmin
);

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
router.get('/dashboard/stats', protectAdmin, getDashboardStats);

// @desc    Get all registered sellers
// @route   GET /api/admin/sellers
// @access  Private (Admin)
router.get('/sellers', protectAdmin, getAllSellers);

// @desc    Get single seller profile with products
// @route   GET /api/admin/sellers/:id
// @access  Private (Admin)
router.get('/sellers/:id', protectAdmin, getSellerProfile);

// @desc    Get all registered users/buyers
// @route   GET /api/admin/users
// @access  Private (Admin)
router.get('/users', protectAdmin, getAllUsers);

// @desc    Get single user profile
// @route   GET /api/admin/users/:id
// @access  Private (Admin)
router.get('/users/:id', protectAdmin, getUserProfile);

module.exports = router; 
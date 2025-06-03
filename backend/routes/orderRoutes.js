const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getUserOrders,
  getSellerOrders,
  updateOrderStatus,
  getSellerOrderStats,
  getOrderInvoice
} = require('../controllers/orderController');
const { protectUser, protectSeller } = require('../middleware/authMiddleware');

// User routes
router.route('/')
  .post(
    protectUser,
    [
      body('orderItems').isArray().withMessage('Order items must be an array'),
      body('shippingAddress.address').notEmpty().withMessage('Shipping address is required'),
      body('shippingAddress.city').notEmpty().withMessage('City is required'),
      body('shippingAddress.postalCode').notEmpty().withMessage('Postal code is required'),
      body('shippingAddress.phone').notEmpty().withMessage('Phone number is required'),
      body('paymentMethod').notEmpty().withMessage('Payment method is required'),
      body('totalPrice').isNumeric().withMessage('Total price must be a number')
    ],
    createOrder
  );

// Get user's orders
router.get('/myorders', protectUser, getUserOrders);

// Seller routes
router.get('/seller', protectSeller, getSellerOrders);
router.get('/seller/stats', protectSeller, getSellerOrderStats);

// Order by ID (accessible by both user and seller)
router.get('/:id', getOrderById);

// Update order status (seller only)
router.put('/:id/status', protectSeller, updateOrderStatus);

// 🎯 NEW: Get order invoice
router.get('/:id/invoice', protectUser, getOrderInvoice);

module.exports = router;
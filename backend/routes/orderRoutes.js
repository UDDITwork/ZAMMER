const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};
const {
  createOrder,
  getOrderById,
  getUserOrders,
  getSellerOrders,
  updateOrderStatus,
  getSellerOrderStats,
  getOrderInvoice,
  updateOrderPaymentStatus,
  getOrderConfirmationDetails,
  getAdminDashboardOrders,
  cancelOrderByBuyer
} = require('../controllers/orderController');
const { protectUser, protectSeller, protectAdmin, protectUserOrSeller } = require('../middleware/authMiddleware');

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

// 🎯 NEW: Admin dashboard route
router.get('/admin/dashboard', protectAdmin, getAdminDashboardOrders);

// Order confirmation details
router.get('/:id/confirmation', protectUser, getOrderConfirmationDetails);

// Order by ID (accessible by both user and seller)
// 🎯 FIXED: Add dual authentication middleware
router.get('/:id', protectUserOrSeller, getOrderById);

// Update order status (seller only)
router.put('/:id/status', protectSeller, updateOrderStatus);

// 🎯 NEW: Update order payment status (user can call after payment)
router.put('/:id/payment-status', protectUser, updateOrderPaymentStatus);

// 🎯 NEW: Get order invoice
router.get('/:id/invoice', protectUser, getOrderInvoice);

// 🎯 NEW: Cancel order by buyer
router.put('/:id/cancel-by-buyer', 
  protectUser,
  [
    body('cancellationReason')
      .notEmpty()
      .withMessage('Cancellation reason is required')
      .isLength({ min: 5, max: 500 })
      .withMessage('Cancellation reason must be between 5 and 500 characters')
  ],
  validateRequest,
  cancelOrderByBuyer
);

module.exports = router;
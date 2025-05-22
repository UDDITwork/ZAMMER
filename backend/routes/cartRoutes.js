const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { protectUser } = require('../middleware/authMiddleware');

// All cart routes need authentication
router.use(protectUser);

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', getCart);

// @route   POST /api/cart
// @desc    Add item to cart
// @access  Private
router.post('/', [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], addToCart);

// @route   PUT /api/cart/:productId
// @desc    Update cart item quantity
// @access  Private
router.put('/:productId', [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], updateCartItem);

// @route   DELETE /api/cart/:productId
// @desc    Remove item from cart
// @access  Private
router.delete('/:productId', removeFromCart);

// @route   DELETE /api/cart
// @desc    Clear entire cart
// @access  Private
router.delete('/', clearCart);

module.exports = router;
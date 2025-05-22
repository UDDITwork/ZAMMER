const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private (Users only)
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name images zammerPrice mrp'
      });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [],
        total: 0
      });
    }

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private (Users only)
exports.addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { productId, quantity } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find user's cart
    let cart = await Cart.findOne({ user: req.user._id });

    // If cart doesn't exist, create one
    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [],
        total: 0
      });
    }

    // Check if item already in cart
    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId
    );

    if (itemIndex > -1) {
      // Item exists, update quantity
      cart.items[itemIndex].quantity += quantity;
    } else {
      // Item doesn't exist, add new item
      cart.items.push({
        product: productId,
        quantity,
        price: product.zammerPrice
      });
    }

    // Calculate total
    cart.total = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    await cart.save();

    // Get populated cart
    cart = await Cart.findById(cart._id).populate({
      path: 'items.product',
      select: 'name images zammerPrice mrp'
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update cart item
// @route   PUT /api/cart/:productId
// @access  Private (Users only)
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const item = cart.items.find(
      item => item.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    item.quantity = quantity;
    
    // Recalculate total
    cart.total = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    await cart.save();

    // Populate product details
    await cart.populate('items.product', 'name images zammerPrice mrp');

    res.json({
      success: true,
      message: 'Cart updated',
      data: cart
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private (Users only)
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Remove item from cart
    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    // Recalculate total
    cart.total = cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    await cart.save();

    // Populate product details
    await cart.populate('items.product', 'name images zammerPrice mrp');

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private (Users only)
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    cart.total = 0;
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared',
      data: cart
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
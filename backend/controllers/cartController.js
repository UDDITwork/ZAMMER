const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// Enhanced logging for cart operations
const logCartOperation = (operation, data, type = 'info') => {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}🛒 [Cart${operation}] ${JSON.stringify(data)}${colors.reset}`);
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    logCartOperation('Get', {
      userId: req.user._id,
      userName: req.user.name
    }, 'info');

    const cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name images zammerPrice mrp category seller status',
        populate: {
          path: 'seller',
          select: 'shop.name'
        }
      });

    if (!cart) {
      logCartOperation('Get', {
        result: 'Cart not found, returning empty cart',
        userId: req.user._id
      }, 'info');

      return res.status(200).json({
        success: true,
        data: {
          items: [],
          total: 0
        }
      });
    }

    // Filter out any items where product no longer exists or is not active
    const validItems = cart.items.filter(item => {
      if (!item.product) {
        logCartOperation('Get', {
          warning: 'Product no longer exists',
          itemId: item._id
        }, 'warning');
        return false;
      }
      
      if (item.product.status !== 'active') {
        logCartOperation('Get', {
          warning: 'Product is not active',
          productId: item.product._id,
          status: item.product.status
        }, 'warning');
        return false;
      }
      
      return true;
    });

    // Update cart if items were filtered out
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
      
      logCartOperation('Get', {
        action: 'Filtered inactive/deleted products',
        originalCount: cart.items.length,
        validCount: validItems.length
      }, 'warning');
    }

    logCartOperation('Get', {
      success: true,
      itemCount: cart.items.length,
      total: cart.total,
      userId: req.user._id
    }, 'success');

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    logCartOperation('Get', {
      error: error.message,
      userId: req.user._id
    }, 'error');

    console.error('Get Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    logCartOperation('Add', {
      userId: req.user._id,
      userName: req.user.name,
      requestBody: req.body
    }, 'info');

    const { productId, quantity = 1, selectedSize, selectedColor } = req.body;

    // Validate input
    if (!productId) {
      logCartOperation('Add', {
        error: 'Product ID missing',
        userId: req.user._id
      }, 'error');

      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      logCartOperation('Add', {
        error: 'Product not found',
        productId,
        userId: req.user._id
      }, 'error');

      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is active
    if (product.status !== 'active') {
      logCartOperation('Add', {
        error: 'Product not available',
        productId,
        status: product.status,
        userId: req.user._id
      }, 'error');

      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      logCartOperation('Add', {
        action: 'Creating new cart',
        userId: req.user._id
      }, 'info');

      cart = new Cart({
        user: req.user._id,
        items: []
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      const oldQuantity = cart.items[existingItemIndex].quantity;
      cart.items[existingItemIndex].quantity += parseInt(quantity);
      
      logCartOperation('Add', {
        action: 'Updated existing item quantity',
        productId,
        oldQuantity,
        newQuantity: cart.items[existingItemIndex].quantity,
        userId: req.user._id
      }, 'info');
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity: parseInt(quantity),
        price: product.zammerPrice,
        selectedSize,
        selectedColor
      });

      logCartOperation('Add', {
        action: 'Added new item to cart',
        productId,
        quantity: parseInt(quantity),
        price: product.zammerPrice,
        userId: req.user._id
      }, 'info');
    }

    await cart.save();

    // Populate cart data for response
    const populatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.product',
        select: 'name images zammerPrice mrp category seller',
        populate: {
          path: 'seller',
          select: 'shop.name'
        }
      });

    logCartOperation('Add', {
      success: true,
      cartTotal: populatedCart.total,
      itemCount: populatedCart.items.length,
      userId: req.user._id
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Product added to cart',
      data: populatedCart
    });
  } catch (error) {
    logCartOperation('Add', {
      error: error.message,
      userId: req.user._id,
      requestBody: req.body
    }, 'error');

    console.error('Add to Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
// @access  Private
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    logCartOperation('Update', {
      userId: req.user._id,
      productId,
      newQuantity: quantity
    }, 'info');

    if (quantity <= 0) {
      logCartOperation('Update', {
        error: 'Invalid quantity',
        quantity,
        userId: req.user._id
      }, 'error');

      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      logCartOperation('Update', {
        error: 'Cart not found',
        userId: req.user._id
      }, 'error');

      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      logCartOperation('Update', {
        error: 'Item not found in cart',
        productId,
        userId: req.user._id
      }, 'error');

      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    const oldQuantity = cart.items[itemIndex].quantity;
    cart.items[itemIndex].quantity = parseInt(quantity);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.product',
        select: 'name images zammerPrice mrp category seller',
        populate: {
          path: 'seller',
          select: 'shop.name'
        }
      });

    logCartOperation('Update', {
      success: true,
      productId,
      oldQuantity,
      newQuantity: parseInt(quantity),
      cartTotal: populatedCart.total,
      userId: req.user._id
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: populatedCart
    });
  } catch (error) {
    logCartOperation('Update', {
      error: error.message,
      userId: req.user._id,
      productId: req.params.productId
    }, 'error');

    console.error('Update Cart Item Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    logCartOperation('Remove', {
      userId: req.user._id,
      productId
    }, 'info');

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      logCartOperation('Remove', {
        error: 'Cart not found',
        userId: req.user._id
      }, 'error');

      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      logCartOperation('Remove', {
        error: 'Item not found in cart',
        productId,
        userId: req.user._id
      }, 'error');

      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate({
        path: 'items.product',
        select: 'name images zammerPrice mrp category seller',
        populate: {
          path: 'seller',
          select: 'shop.name'
        }
      });

    logCartOperation('Remove', {
      success: true,
      productId,
      remainingItems: populatedCart.items.length,
      cartTotal: populatedCart.total,
      userId: req.user._id
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: populatedCart
    });
  } catch (error) {
    logCartOperation('Remove', {
      error: error.message,
      userId: req.user._id,
      productId: req.params.productId
    }, 'error');

    console.error('Remove from Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    logCartOperation('Clear', {
      userId: req.user._id
    }, 'info');

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      logCartOperation('Clear', {
        error: 'Cart not found',
        userId: req.user._id
      }, 'error');

      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemCount = cart.items.length;
    cart.items = [];
    cart.total = 0;
    await cart.save();

    logCartOperation('Clear', {
      success: true,
      clearedItems: itemCount,
      userId: req.user._id
    }, 'success');

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: cart
    });
  } catch (error) {
    logCartOperation('Clear', {
      error: error.message,
      userId: req.user._id
    }, 'error');

    console.error('Clear Cart Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { validationResult } = require('express-validator');

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private (Users only)
exports.createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { product, rating, review } = req.body;

    // Check if product exists
    const productExists = await Product.findById(product);
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // 🎯 CRITICAL: Check if user has purchased this product with confirmed payment
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'orderItems.product': product,
      isPaid: true,
      paymentStatus: { $in: ['completed', 'processing'] },
      status: { $nin: ['Cancelled'] }
    });

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products you have purchased and paid for'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product,
      user: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Create new review
    const newReview = await Review.create({
      product,
      user: req.user._id,
      rating,
      review
    });

    // Populate user data for response
    await newReview.populate('user', 'name profilePicture');

    res.status(201).json({
      success: true,
      data: newReview,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
exports.getProductReviews = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Check if product exists
    const productExists = await Product.findById(productId);
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Basic pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Get reviews with user details
    const reviews = await Review.find({ product: productId })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 });

    const totalReviews = await Review.countDocuments({ product: productId });

    // Calculate average rating
    const avgRatingResult = await Review.aggregate([
      { $match: { product: productId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalCount: { $sum: 1 } } }
    ]);

    const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;
    const totalCount = avgRatingResult.length > 0 ? avgRatingResult[0].totalCount : 0;

    res.status(200).json({
      success: true,
      count: reviews.length,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page,
      totalReviews: totalCount,
      averageRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
      data: reviews
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Check if user can review a product
// @route   GET /api/reviews/check/:productId
// @access  Private (Users only)
exports.checkCanReview = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Check if product exists
    const productExists = await Product.findById(productId);
    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user has purchased this product with confirmed payment
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'orderItems.product': productId,
      isPaid: true,
      paymentStatus: { $in: ['completed', 'processing'] },
      status: { $nin: ['Cancelled'] }
    });

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id
    });

    const canReview = hasPurchased && !existingReview;

    res.status(200).json({
      success: true,
      data: {
        canReview,
        hasPurchased: !!hasPurchased,
        hasReviewed: !!existingReview,
        reason: !hasPurchased ? 'You must purchase and pay for this product to review it' : 
                existingReview ? 'You have already reviewed this product' : 
                'You can review this product'
      }
    });
  } catch (error) {
    console.error('Check can review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get user's purchased products (for review verification)
// @route   GET /api/reviews/purchased-products
// @access  Private (Users only)
exports.getPurchasedProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Get orders where user has paid and order is not cancelled
    const orders = await Order.find({
      user: req.user._id,
      isPaid: true,
      paymentStatus: { $in: ['completed', 'processing'] },
      status: { $nin: ['Cancelled'] }
    })
    .populate('orderItems.product', 'name images price')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Extract unique products from orders
    const purchasedProducts = [];
    const productIds = new Set();

    orders.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.product && !productIds.has(item.product._id.toString())) {
          productIds.add(item.product._id.toString());
          purchasedProducts.push({
            product: item.product,
            orderId: order._id,
            orderNumber: order.orderNumber,
            purchasedAt: order.createdAt,
            orderStatus: order.status
          });
        }
      });
    });

    const totalOrders = await Order.countDocuments({
      user: req.user._id,
      isPaid: true,
      paymentStatus: { $in: ['completed', 'processing'] },
      status: { $nin: ['Cancelled'] }
    });

    res.status(200).json({
      success: true,
      data: {
        products: purchasedProducts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNextPage: skip + orders.length < totalOrders,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get purchased products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (Users only)
exports.updateReview = async (req, res) => {
  try {
    const { rating, review } = req.body;

    // Find the review
    let existingReview = await Review.findById(req.params.id);

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (existingReview.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    // Update review
    existingReview.rating = rating || existingReview.rating;
    existingReview.review = review || existingReview.review;

    await existingReview.save();

    res.status(200).json({
      success: true,
      data: existingReview
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

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Users only)
exports.deleteReview = async (req, res) => {
  try {
    // Find the review
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await review.remove();

    res.status(200).json({
      success: true,
      data: {}
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

// @desc    Get all reviews by a user
// @route   GET /api/reviews/user
// @access  Private (Users only)
exports.getUserReviews = async (req, res) => {
  try {
    // Basic pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Get reviews
    const reviews = await Review.find({ user: req.user._id })
      .skip(skip)
      .limit(limit)
      .populate('product', 'name images')
      .sort({ createdAt: -1 });

    const totalReviews = await Review.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      count: reviews.length,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page,
      data: reviews
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

// @desc    Check if user can review a product
// @route   GET /api/reviews/can-review/:productId
// @access  Private (User)
exports.checkCanReview = async (req, res) => {
  try {
    // Basic implementation
    res.status(200).json({
      success: true,
      canReview: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
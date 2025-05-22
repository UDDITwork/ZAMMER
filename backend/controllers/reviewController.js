const Review = require('../models/Review');
const Product = require('../models/Product');
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

    res.status(201).json({
      success: true,
      data: newReview
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

    // Get reviews
    const reviews = await Review.find({ product: productId })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    const totalReviews = await Review.countDocuments({ product: productId });

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
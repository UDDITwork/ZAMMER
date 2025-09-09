const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { validationResult } = require('express-validator');

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private (Users only)
exports.createReview = async (req, res) => {
  try {
    console.log('🎯 [REVIEW-CREATE] Starting review creation...', {
      userId: req.user._id,
      productId: req.body.product,
      rating: req.body.rating,
      reviewLength: req.body.review?.length
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [REVIEW-CREATE] Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { product, rating, review } = req.body;
    console.log('✅ [REVIEW-CREATE] Validation passed, proceeding with review creation...');

    // Check if product exists
    console.log('🔍 [REVIEW-CREATE] Checking if product exists...');
    const productExists = await Product.findById(product);
    if (!productExists) {
      console.log('❌ [REVIEW-CREATE] Product not found:', product);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    console.log('✅ [REVIEW-CREATE] Product found:', productExists.name);

    // 🎯 CRITICAL: Check if user has purchased this product with confirmed payment
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'orderItems.product': product,
      isPaid: true,
      paymentStatus: { $in: ['completed', 'processing'] },
      status: { $nin: ['Cancelled'] }
    });

    console.log('🔍 Review creation - purchase verification:', {
      userId: req.user._id,
      productId: product,
      hasPurchased: !!hasPurchased,
      orderDetails: hasPurchased ? {
        orderId: hasPurchased._id,
        isPaid: hasPurchased.isPaid,
        paymentStatus: hasPurchased.paymentStatus,
        orderStatus: hasPurchased.status,
        orderItems: hasPurchased.orderItems.map(item => ({
          product: item.product,
          name: item.name
        }))
      } : null
    });

    if (!hasPurchased) {
      console.log('❌ [REVIEW-CREATE] User has not purchased this product');
      return res.status(403).json({
        success: false,
        message: 'You can only review products you have purchased and paid for'
      });
    }
    console.log('✅ [REVIEW-CREATE] Purchase verification passed');

    // Check if user already reviewed this product
    console.log('🔍 [REVIEW-CREATE] Checking for existing review...');
    const existingReview = await Review.findOne({
      product,
      user: req.user._id
    });

    if (existingReview) {
      console.log('❌ [REVIEW-CREATE] User has already reviewed this product');
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }
    console.log('✅ [REVIEW-CREATE] No existing review found, proceeding...');

    // Create new review with verified purchase flag
    console.log('🎯 [REVIEW-CREATE] Creating new review...');
    const newReview = await Review.create({
      product,
      user: req.user._id,
      rating,
      review,
      isVerifiedPurchase: true // Always true since we verify purchase before allowing review
    });
    console.log('✅ [REVIEW-CREATE] Review created successfully:', newReview._id);

    // Populate user data for response
    console.log('🔍 [REVIEW-CREATE] Populating user data...');
    await newReview.populate('user', 'name profilePicture');
    console.log('✅ [REVIEW-CREATE] User data populated');

    // 🎯 NEW: Notify seller about the new review
    try {
      console.log('🔔 [REVIEW-CREATE] Notifying seller about new review...');
      if (global.emitToSeller) {
        global.emitToSeller(productExists.seller, 'new-review', {
          reviewId: newReview._id,
          productId: product,
          productName: productExists.name,
          customerName: newReview.user.name,
          rating: rating,
          review: review,
          createdAt: newReview.createdAt,
          message: `New ${rating}-star review received for "${productExists.name}"`
        });
        console.log('✅ [REVIEW-CREATE] Seller notification sent successfully');
      } else {
        console.log('⚠️ [REVIEW-CREATE] Socket.io not available for seller notification');
      }
    } catch (notificationError) {
      console.error('❌ [REVIEW-CREATE] Error sending seller notification:', notificationError);
      // Don't fail the review creation if notification fails
    }

    console.log('🎉 [REVIEW-CREATE] Sending success response...');
    res.status(201).json({
      success: true,
      data: newReview,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    console.error('❌ [REVIEW-CREATE] Review creation error:', error);
    console.error('❌ [REVIEW-CREATE] Error stack:', error.stack);
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

    console.log('🔍 Review eligibility check:', {
      userId: req.user._id,
      productId,
      hasPurchased: !!hasPurchased,
      orderDetails: hasPurchased ? {
        orderId: hasPurchased._id,
        isPaid: hasPurchased.isPaid,
        paymentStatus: hasPurchased.paymentStatus,
        orderStatus: hasPurchased.status,
        orderItems: hasPurchased.orderItems.map(item => ({
          product: item.product,
          name: item.name
        }))
      } : null
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

// @desc    Get reviews for seller's products
// @route   GET /api/reviews/seller
// @access  Private (Sellers only)
exports.getSellerReviews = async (req, res) => {
  try {
    const sellerId = req.user._id;
    
    // Basic pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Get reviews for seller's products
    const reviews = await Review.find()
      .populate({
        path: 'product',
        match: { seller: sellerId },
        select: 'name images seller'
      })
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 });

    // Filter out reviews where product is null (not seller's product)
    const sellerReviews = reviews.filter(review => review.product !== null);

    // Apply pagination
    const paginatedReviews = sellerReviews.slice(skip, skip + limit);
    const totalReviews = sellerReviews.length;

    // Calculate average rating for seller's products
    const avgRatingResult = await Review.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $match: {
          'product.seller': sellerId
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;
    const totalCount = avgRatingResult.length > 0 ? avgRatingResult[0].totalCount : 0;

    res.status(200).json({
      success: true,
      count: paginatedReviews.length,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page,
      totalReviews: totalCount,
      averageRating: Math.round(avgRating * 10) / 10,
      data: paginatedReviews
    });
  } catch (error) {
    console.error('Get seller reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

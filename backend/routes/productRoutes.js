console.log('✅ productRoutes loaded');
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  createProduct,
  getSellerProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMarketplaceProducts,
  getShopProducts,
  // 🎯 NEW: Add toggle functions
  toggleLimitedEdition,
  toggleTrending,
  updateProductStatus,
  // 🎯 NEW: Add marketplace filtering functions
  getLimitedEditionProducts,
  getTrendingProducts
} = require('../controllers/productController');
const { protectSeller, optionalUserAuth } = require('../middleware/authMiddleware');

// Public routes - use optionalUserAuth instead of requiring auth
router.get('/marketplace', optionalUserAuth, getMarketplaceProducts);
router.get('/marketplace/limited-edition', optionalUserAuth, (req, res, next) => {
  console.log('✅ /marketplace/limited-edition route hit');
  next();
}, getLimitedEditionProducts);
router.get('/marketplace/trending', optionalUserAuth, getTrendingProducts);
router.get('/shop/:shopId', optionalUserAuth, getShopProducts);

// Private routes - require seller authentication
router.route('/')
  .post(
    protectSeller,
    [
      body('name').notEmpty().withMessage('Product name is required'),
      body('category').notEmpty().withMessage('Category is required'),
      body('subCategory').notEmpty().withMessage('Subcategory is required'),
      body('productCategory').notEmpty().withMessage('Product category is required'),
      body('zammerPrice').isNumeric().withMessage('Zammer price must be a number'),
      body('mrp').isNumeric().withMessage('MRP must be a number'),
      body('variants').isArray().withMessage('Variants must be an array'),
      body('images').isArray().notEmpty().withMessage('At least one product image is required')
    ],
    createProduct
  )
  .get(protectSeller, getSellerProducts);

// 🎯 IMPORTANT: Toggle routes MUST come before the /:id routes to avoid conflicts
router.patch('/:id/toggle-limited-edition', protectSeller, toggleLimitedEdition);
router.patch('/:id/toggle-trending', protectSeller, toggleTrending);
router.patch('/:id/status', protectSeller, updateProductStatus);

// Make product details accessible with optional auth
router.route('/:id')
  .get(optionalUserAuth, getProductById)
  .put(protectSeller, updateProduct)
  .delete(protectSeller, deleteProduct);

module.exports = router;
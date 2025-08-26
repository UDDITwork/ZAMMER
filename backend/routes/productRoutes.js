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
  getTrendingProducts,
  // 🎯 NEW: Add inventory management functions
  getProductInventory,
  addProductStock,
  getProductInventoryHistory,
  getLowStockProducts
} = require('../controllers/productController');
const { protectSeller, optionalUserAuth } = require('../middleware/authMiddleware');
const { debugImages } = require('../middleware/imageDebugMiddleware');

// Public routes - use optionalUserAuth instead of requiring auth
router.get('/marketplace', optionalUserAuth, debugImages, getMarketplaceProducts);
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

// 🎯 NEW: Inventory management routes
router.get('/low-stock', protectSeller, getLowStockProducts);

// 🎯 IMPORTANT: Toggle routes MUST come before the /:id routes to avoid conflicts
router.patch('/:id/toggle-limited-edition', protectSeller, toggleLimitedEdition);
router.patch('/:id/toggle-trending', protectSeller, toggleTrending);
router.patch('/:id/status', protectSeller, updateProductStatus);

// 🎯 NEW: Inventory management routes for specific products
router.get('/:id/inventory', protectSeller, getProductInventory);
router.post('/:id/add-stock', protectSeller, [
  body('variantUpdates').isArray().withMessage('Variant updates must be an array'),
  body('variantUpdates.*.size').notEmpty().withMessage('Size is required for each variant update'),
  body('variantUpdates.*.color').notEmpty().withMessage('Color is required for each variant update'),
  body('variantUpdates.*.quantity').isNumeric().withMessage('Quantity must be a number for each variant update')
], addProductStock);
router.get('/:id/inventory-history', protectSeller, getProductInventoryHistory);

// Make product details accessible with optional auth
router.route('/:id')
  .get(optionalUserAuth, getProductById)
  .put(protectSeller, updateProduct)
  .delete(protectSeller, deleteProduct);

module.exports = router;
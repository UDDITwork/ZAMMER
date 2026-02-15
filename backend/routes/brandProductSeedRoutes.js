const express = require('express');
const router = express.Router();
const { seedBrandProducts, clearBrandProducts, getBrandSeedStatus } = require('../controllers/brandProductSeedController');
const { protectAdmin } = require('../middleware/adminMiddleware');

// All routes require admin authentication
router.use(protectAdmin);

// POST /api/brand-products/seed - Seed 52 brand products
router.post('/seed', seedBrandProducts);

// DELETE /api/brand-products/clear - Clear all brand products
router.delete('/clear', clearBrandProducts);

// GET /api/brand-products/status - Get current seeding status
router.get('/status', getBrandSeedStatus);

module.exports = router;

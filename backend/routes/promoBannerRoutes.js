const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminMiddleware');
const {
  getActivePromoBanners,
  getAllPromoBannersAdmin,
  createPromoBanner,
  updatePromoBanner,
  deletePromoBanner,
  seedPromoBanners,
  seedExpandedPromoBanners,
} = require('../controllers/promoBannerController');

// Public route - buyer-facing promo banner fetch
router.get('/', getActivePromoBanners);

// Admin-protected routes
router.get('/admin/all', protectAdmin, getAllPromoBannersAdmin);
router.post('/seed', protectAdmin, seedPromoBanners);
router.post('/seed-expanded', protectAdmin, seedExpandedPromoBanners); // NEW route for expanded banners
router.post('/', protectAdmin, createPromoBanner);
router.put('/:id', protectAdmin, updatePromoBanner);
router.delete('/:id', protectAdmin, deletePromoBanner);

module.exports = router;

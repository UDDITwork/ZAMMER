const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminMiddleware');
const {
  getBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
  seedBanners,
} = require('../controllers/bannerController');

// Public route - buyer-facing banner fetch
router.get('/', getBanners);

// Admin-protected routes
router.get('/admin/all', protectAdmin, getAllBannersAdmin);
router.post('/seed', protectAdmin, seedBanners);
router.post('/', protectAdmin, createBanner);
router.put('/:id', protectAdmin, updateBanner);
router.delete('/:id', protectAdmin, deleteBanner);

module.exports = router;

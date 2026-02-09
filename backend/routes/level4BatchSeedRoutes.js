const express = require('express');
const router = express.Router();
const { seedLevel4Batch, clearLevel4Banners, getLevel4SeedStatus } = require('../controllers/level4BatchSeedController');
const { protectAdmin } = require('../middleware/adminMiddleware');

// All routes require admin authentication
router.use(protectAdmin);

// POST /api/level4-batch/seed - Seed a batch of Level 4 banners
router.post('/seed', seedLevel4Batch);

// DELETE /api/level4-batch/clear - Clear all Level 4 banners
router.delete('/clear', clearLevel4Banners);

// GET /api/level4-batch/status - Get current seeding status
router.get('/status', getLevel4SeedStatus);

module.exports = router;

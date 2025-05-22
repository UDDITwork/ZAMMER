const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('../middleware/uploadMiddleware');
const { protectSeller } = require('../middleware/authMiddleware');

// @route   POST /api/upload
// @desc    Upload an image
// @access  Private
router.post('/', protectSeller, upload.single('image'), (req, res) => {
  res.json({
    success: true,
    data: `/${req.file.path.replace('\\', '/')}`
  });
});

// Handle multiple uploads
router.post('/multiple', protectSeller, upload.array('images', 5), (req, res) => {
  const paths = req.files.map(file => `/${file.path.replace('\\', '/')}`);
  res.json({
    success: true,
    data: paths
  });
});

module.exports = router;
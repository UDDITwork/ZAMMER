const express = require('express');
const router = express.Router();
const { upload, handleCloudinaryUpload } = require('../middleware/uploadMiddleware');
const { protectSeller } = require('../middleware/authMiddleware');
const { deleteFromCloudinary } = require('../utils/cloudinary');

// @route   POST /api/upload
// @desc    Upload an image
// @access  Private
router.post('/', protectSeller, upload.single('image'), handleCloudinaryUpload, (req, res) => {
  res.json({
    success: true,
    data: {
      url: req.file.path,
      public_id: req.file.public_id
    }
  });
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple images
// @access  Private
router.post('/multiple', protectSeller, upload.array('images', 5), async (req, res) => {
  try {
    const uploadPromises = req.files.map(async (file) => {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      return await uploadToCloudinary(dataURI, 'zammer');
    });

    const results = await Promise.all(uploadPromises);
    
    res.json({
      success: true,
      data: results.map(result => ({
        url: result.url,
        public_id: result.public_id
      }))
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files to Cloudinary',
      error: error.message
    });
  }
});

// @route   DELETE /api/upload/:publicId
// @desc    Delete an image from Cloudinary
// @access  Private
router.delete('/:publicId', protectSeller, async (req, res) => {
  try {
    const { publicId } = req.params;
    const result = await deleteFromCloudinary(publicId);
    
    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image from Cloudinary',
      error: error.message
    });
  }
});

module.exports = router;
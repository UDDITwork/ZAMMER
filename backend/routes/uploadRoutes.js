const express = require('express');
const router = express.Router();
const { upload, handleMulterError, logUploadOperation } = require('../middleware/uploadMiddleware');
const { protectSeller } = require('../middleware/authMiddleware');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// @route   POST /api/upload
// @desc    Upload an image to Cloudinary
// @access  Private
router.post('/', protectSeller, logUploadOperation, upload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    console.log('📁 Processing image upload to Cloudinary');
    
    // Convert buffer to base64 for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(dataURI, 'zammer_uploads');
    
    console.log('✅ Image uploaded to Cloudinary:', result.url);
    
    res.json({
      success: true,
      data: {
        url: result.url,
        public_id: result.public_id
      }
    });
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image to Cloudinary',
      error: error.message
    });
  }
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple images to Cloudinary
// @access  Private
router.post('/multiple', protectSeller, logUploadOperation, upload.array('images', 5), handleMulterError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    console.log(`📁 Processing ${req.files.length} images for Cloudinary upload`);
    
    const uploadPromises = req.files.map(async (file) => {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      return await uploadToCloudinary(dataURI, 'zammer_uploads');
    });

    const results = await Promise.all(uploadPromises);
    
    console.log(`✅ ${results.length} images uploaded to Cloudinary`);
    
    res.json({
      success: true,
      data: results.map(result => ({
        url: result.url,
        public_id: result.public_id
      }))
    });
  } catch (error) {
    console.error('❌ Multiple Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images to Cloudinary',
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
    
    console.log('🗑️ Deleting image from Cloudinary:', publicId);
    
    const result = await deleteFromCloudinary(publicId);
    
    console.log('✅ Image deleted from Cloudinary:', publicId);
    
    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Cloudinary deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image from Cloudinary',
      error: error.message
    });
  }
});

module.exports = router;
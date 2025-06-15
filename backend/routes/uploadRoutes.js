console.log('🔍 Cloudinary Config Check:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
});
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
    const b64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(dataURI, 'zammer_uploads');
    
    console.log('✅ Image uploaded to Cloudinary:', result.url);
    
    res.json({
      success: true,
      data: result
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

// ✅ FIXED: DELETE route with enhanced timeout management and graceful error handling
// @route   DELETE /api/upload/:publicId
// @desc    Delete an image from Cloudinary
// @access  Private
router.delete('/:publicId(*)', protectSeller, async (req, res) => {
  try {
    let { publicId } = req.params;
    
    // Handle URL-encoded publicId (for folder structures like zammer_uploads/filename)
    publicId = decodeURIComponent(publicId);
    
    console.log('🗑️ Deleting image from Cloudinary:', publicId);
    
    // Validate publicId
    if (!publicId || publicId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required for deletion'
      });
    }
    
    // ✅ ENHANCED: Multiple timeout strategies for better reliability
    const deleteWithMultipleTimeouts = async () => {
      // First try: Quick deletion (20 seconds)
      try {
        console.log('🚀 Attempting quick deletion (20s timeout)');
        const quickPromise = deleteFromCloudinary(publicId);
        const quickTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Quick deletion timeout')), 20000);
        });
        
        const result = await Promise.race([quickPromise, quickTimeout]);
        console.log('✅ Quick deletion successful:', result);
        return result;
      } catch (quickError) {
        console.log('⚠️ Quick deletion failed, trying graceful deletion:', quickError.message);
        
        // Second try: Graceful deletion with extended timeout
        try {
          console.log('🔄 Attempting graceful deletion (35s timeout)');
          const gracefulPromise = deleteFromCloudinary(publicId);
          const gracefulTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Graceful deletion timeout')), 35000);
          });
          
          const result = await Promise.race([gracefulPromise, gracefulTimeout]);
          console.log('✅ Graceful deletion successful:', result);
          return result;
        } catch (gracefulError) {
          console.log('⚠️ Graceful deletion also failed:', gracefulError.message);
          
          // Final fallback: Assume success for timeout errors
          if (gracefulError.message && gracefulError.message.includes('timeout')) {
            console.log('🤝 Assuming deletion succeeded despite timeout');
            return {
              success: true,
              result: 'assumed_success',
              message: 'Deletion likely succeeded but response timed out',
              publicId: publicId,
              warning: 'Response timeout occurred'
            };
          }
          
          throw gracefulError;
        }
      }
    };
    
    const result = await deleteWithMultipleTimeouts();
    
    console.log('✅ Image deletion completed:', publicId, result);
    
    // Return success with appropriate message
    const responseMessage = result.warning 
      ? `Image deletion completed with warning: ${result.warning}`
      : 'Image deleted successfully';
    
    res.json({
      success: true,
      message: responseMessage,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Cloudinary deletion error:', error);
    
    // Handle specific error cases gracefully
    let errorMessage = 'Error deleting image from Cloudinary';
    let statusCode = 500;
    let shouldReturnError = true;
    
    // Check if it's a timeout or network error
    if (error.message && (
        error.message.includes('timeout') || 
        error.message.includes('Timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNRESET') ||
        error.http_code === 499
      )) {
      
      // For timeout errors, be graceful - return success with warning
      console.log('🤝 Timeout detected, returning graceful success');
      shouldReturnError = false;
      
      return res.json({
        success: true,
        message: 'Image deletion request sent but response timed out. Image likely deleted.',
        data: {
          result: 'timeout_graceful',
          publicId: req.params.publicId,
          warning: 'Response timeout - deletion status uncertain but likely successful'
        }
      });
      
    } else if (error.message && error.message.includes('not found')) {
      errorMessage = 'Image not found in Cloudinary (may already be deleted)';
      statusCode = 404;
    } else if (error.message && error.message.includes('publicId')) {
      errorMessage = 'Invalid public ID provided';
      statusCode = 400;
    }
    
    if (shouldReturnError) {
      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error.message,
        publicId: req.params.publicId // Help with debugging
      });
    }
  }
});

module.exports = router;
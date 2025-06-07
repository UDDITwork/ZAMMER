const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
const uploadToCloudinary = async (dataURI, folder = 'zammer') => {
  try {
    console.log(`📁 Uploading to Cloudinary folder: ${folder}`);
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      resource_type: 'auto',
      quality: 'auto:good', // Optimize quality automatically
      fetch_format: 'auto', // Auto-select best format (WebP, etc.)
      flags: 'progressive', // Progressive JPEG loading
    });
    
    console.log('✅ Cloudinary upload successful:', {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes
    });
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    console.log('✅ Cloudinary deletion result:', result);
    
    if (result.result === 'ok') {
      return { success: true, result: result.result };
    } else {
      throw new Error(`Deletion failed: ${result.result}`);
    }
  } catch (error) {
    console.error('❌ Cloudinary deletion error:', error);
    throw new Error(`Cloudinary deletion failed: ${error.message}`);
  }
};

// Generate optimized URL for existing Cloudinary image
const getOptimizedUrl = (publicId, options = {}) => {
  try {
    const {
      width = 'auto',
      height = 'auto',
      crop = 'limit',
      quality = 'auto:good',
      format = 'auto'
    } = options;
    
    return cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      fetch_format: format,
      flags: 'progressive',
      secure: true
    });
  } catch (error) {
    console.error('❌ Cloudinary URL generation error:', error);
    return null;
  }
};

// Get image details from Cloudinary
const getImageDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at
    };
  } catch (error) {
    console.error('❌ Cloudinary get details error:', error);
    throw new Error(`Failed to get image details: ${error.message}`);
  }
};

// Bulk delete images from Cloudinary
const bulkDeleteFromCloudinary = async (publicIds) => {
  try {
    console.log(`🗑️ Bulk deleting ${publicIds.length} images from Cloudinary`);
    
    const result = await cloudinary.api.delete_resources(publicIds);
    
    console.log('✅ Cloudinary bulk deletion result:', {
      deleted: Object.keys(result.deleted).length,
      not_found: Object.keys(result.not_found || {}).length,
      rate_limit_exceeded: Object.keys(result.rate_limit_exceeded || {}).length
    });
    
    return result;
  } catch (error) {
    console.error('❌ Cloudinary bulk deletion error:', error);
    throw new Error(`Cloudinary bulk deletion failed: ${error.message}`);
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedUrl,
  getImageDetails,
  bulkDeleteFromCloudinary
}; 
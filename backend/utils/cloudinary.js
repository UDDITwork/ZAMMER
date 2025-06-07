const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Enhanced logging for Cloudinary operations
const logCloudinaryOperation = (operation, data, type = 'info') => {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}☁️ [Cloudinary${operation}] ${JSON.stringify(data)}${colors.reset}`);
};

// Upload image to Cloudinary
const uploadToCloudinary = async (dataURI, folder = 'zammer') => {
  try {
    logCloudinaryOperation('Upload', {
      folder: folder,
      dataURILength: dataURI.length
    }, 'info');

    console.log(`📁 Uploading to Cloudinary folder: ${folder}`);
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      resource_type: 'auto',
      quality: 'auto:good', // Optimize quality automatically
      fetch_format: 'auto', // Auto-select best format (WebP, etc.)
      flags: 'progressive', // Progressive JPEG loading
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });
    
    logCloudinaryOperation('Upload', {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height
    }, 'success');

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
      bytes: result.bytes,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    logCloudinaryOperation('Upload', {
      error: error.message,
      folder: folder
    }, 'error');

    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    logCloudinaryOperation('Delete', {
      public_id: publicId
    }, 'info');

    console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image'
    });
    
    logCloudinaryOperation('Delete', {
      public_id: publicId,
      result: result.result
    }, result.result === 'ok' ? 'success' : 'warning');

    console.log('✅ Cloudinary deletion result:', result);
    
    if (result.result === 'ok') {
      return { success: true, result: result.result };
    } else if (result.result === 'not found') {
      console.log(`⚠️ Image not found in Cloudinary: ${publicId}`);
      return { success: true, result: 'not_found', message: 'Image not found' };
    } else {
      throw new Error(`Deletion failed: ${result.result}`);
    }
  } catch (error) {
    logCloudinaryOperation('Delete', {
      public_id: publicId,
      error: error.message
    }, 'error');

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
    
    const optimizedUrl = cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      fetch_format: format,
      flags: 'progressive',
      secure: true
    });

    logCloudinaryOperation('OptimizeURL', {
      public_id: publicId,
      options: options,
      optimized_url: optimizedUrl
    }, 'info');

    return optimizedUrl;
  } catch (error) {
    logCloudinaryOperation('OptimizeURL', {
      public_id: publicId,
      error: error.message
    }, 'error');

    console.error('❌ Cloudinary URL generation error:', error);
    return null;
  }
};

// Get image details from Cloudinary
const getImageDetails = async (publicId) => {
  try {
    logCloudinaryOperation('GetDetails', {
      public_id: publicId
    }, 'info');

    const result = await cloudinary.api.resource(publicId);
    
    const details = {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at
    };

    logCloudinaryOperation('GetDetails', details, 'success');

    return details;
  } catch (error) {
    logCloudinaryOperation('GetDetails', {
      public_id: publicId,
      error: error.message
    }, 'error');

    console.error('❌ Cloudinary get details error:', error);
    throw new Error(`Failed to get image details: ${error.message}`);
  }
};

// Bulk delete images from Cloudinary
const bulkDeleteFromCloudinary = async (publicIds) => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new Error('Public IDs array is required and must not be empty');
    }

    logCloudinaryOperation('BulkDelete', {
      count: publicIds.length,
      public_ids: publicIds
    }, 'info');

    console.log(`🗑️ Bulk deleting ${publicIds.length} images from Cloudinary`);
    
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: 'image'
    });
    
    const summary = {
      deleted: Object.keys(result.deleted || {}).length,
      not_found: Object.keys(result.not_found || {}).length,
      rate_limit_exceeded: Object.keys(result.rate_limit_exceeded || {}).length
    };

    logCloudinaryOperation('BulkDelete', {
      summary: summary,
      result: result
    }, 'success');

    console.log('✅ Cloudinary bulk deletion result:', summary);
    
    return result;
  } catch (error) {
    logCloudinaryOperation('BulkDelete', {
      public_ids: publicIds,
      error: error.message
    }, 'error');

    console.error('❌ Cloudinary bulk deletion error:', error);
    throw new Error(`Cloudinary bulk deletion failed: ${error.message}`);
  }
};

// Validate Cloudinary configuration
const validateCloudinaryConfig = () => {
  const config = cloudinary.config();
  const requiredFields = ['cloud_name', 'api_key', 'api_secret'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    const error = `Missing Cloudinary configuration: ${missingFields.join(', ')}`;
    console.error('❌ Cloudinary Configuration Error:', error);
    return { valid: false, error, missingFields };
  }
  
  console.log('✅ Cloudinary configuration is valid');
  return { valid: true };
};

// Initialize and validate configuration on module load
const configValidation = validateCloudinaryConfig();
if (!configValidation.valid) {
  console.error('⚠️ Cloudinary is not properly configured. Some features may not work.');
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedUrl,
  getImageDetails,
  bulkDeleteFromCloudinary,
  validateCloudinaryConfig
};
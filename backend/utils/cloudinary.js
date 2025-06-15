const cloudinary = require('cloudinary').v2;

// -------------------------------------------------
// 1\ufe0f\u20e3  CONFIGURATION \u2011 uses .env for credentials
// -------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // \u23f3 network timeout (ms)
  timeout: 60_000
});

// -------------------------------------------------
// 2\ufe0f\u20e3  COLOURFUL LOGGER (CLI readability)
// -------------------------------------------------
const log = (tag, data, colour = "reset") => {
  const c = {
    info: "\x1b[36m",      // cyan
    success: "\x1b[32m",   // green
    warning: "\x1b[33m",   // yellow
    error: "\x1b[31m",     // red
    reset: "\x1b[0m"
  };
  console.log(`${c[colour]}\u2601\ufe0f [Cloudinary${tag}] ${JSON.stringify(data)}${c.reset}`);
};

// -------------------------------------------------
// 3\ufe0f\u20e3  SINGLE\u2011SHOT UPLOAD IMPLEMENTATION
// -------------------------------------------------
const _singleUpload = (dataURI, folder) =>
  cloudinary.uploader.upload(dataURI, {
    folder,
    resource_type: "auto",
    timeout: 60_000,
    quality: "auto:good",
    fetch_format: "auto",
    flags: "progressive"
  });

// -------------------------------------------------
// 4\ufe0f\u20e3  PUBLIC\u00a0API \u2013 UPLOAD with 2\u2011TRY RETRY
// -------------------------------------------------
const uploadToCloudinary = async (dataURI, folder = "zammer_uploads") => {
  if (!dataURI?.startsWith("data:")) {
    throw new Error("Invalid data URI supplied to Cloudinary uploader");
  }

  log("Upload", { stage: "start", folder, length: dataURI.length }, "info");

  let attempt = 0;
  const maxAttempts = 2;
  let lastError;

  while (attempt < maxAttempts) {
    try {
      const result = await _singleUpload(dataURI, folder);
      log("Upload", { stage: "success", public_id: result.public_id }, "success");
      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height
      };
    } catch (err) {
      lastError = err;
      log("Upload", { stage: "retry", attempt: attempt + 1, error: err.message }, "warning");
      // 499 == client disconnect / timeout => safe to retry
      await new Promise(res => setTimeout(res, 1500 * (attempt + 1)));
      attempt++;
    }
  }

  log("Upload", { stage: "failed", error: lastError.message }, "error");
  throw new Error(`Cloudinary upload failed after ${maxAttempts} attempts: ${lastError.message}`);
};

// -------------------------------------------------
// 5\ufe0f\u20e3  DELETE & HELPERS (UNCHANGED)
// -------------------------------------------------
// ✅ FIXED: Enhanced deleteFromCloudinary function with proper timeout and error handling
// ✅ FIXED: Enhanced deleteFromCloudinary function with proper timeout and error handling
const deleteFromCloudinary = async (publicId) => {
  try {
    // Validate input
    if (!publicId || typeof publicId !== 'string' || publicId.trim() === '') {
      throw new Error('publicId is required and must be a non-empty string');
    }
    
    // Clean the publicId (remove any leading/trailing whitespace)
    const cleanPublicId = publicId.trim();
    
    log("Delete", { publicId: cleanPublicId }, "info");
    
    // ✅ FIXED: Multiple timeout strategies and retry logic
    const deleteWithTimeout = async (timeoutMs) => {
      return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        
        try {
          const result = await cloudinary.uploader.destroy(cleanPublicId, { 
            resource_type: "image", 
            timeout: Math.min(timeoutMs - 1000, 20000), // Cloudinary timeout slightly less than our timeout
            invalidate: true // This ensures CDN cache is also cleared
          });
          clearTimeout(timeoutId);
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
    };
    
    // Attempt deletion with increasing timeouts and retry logic
    let result;
    let attempt = 0;
    const maxAttempts = 3;
    const timeouts = [15000, 20000, 25000]; // Progressive timeouts
    
    while (attempt < maxAttempts) {
      try {
        log("Delete", { 
          publicId: cleanPublicId, 
          attempt: attempt + 1,
          timeout: timeouts[attempt],
          status: 'attempting' 
        }, "info");
        
        result = await deleteWithTimeout(timeouts[attempt]);
        
        log("Delete", { 
          publicId: cleanPublicId, 
          attempt: attempt + 1,
          status: 'success' 
        }, "success");
        
        break; // Success, exit retry loop
      } catch (error) {
        attempt++;
        
        log("Delete", { 
          publicId: cleanPublicId, 
          attempt: attempt,
          error: error.message,
          status: 'failed'
        }, "warning");
        
        if (attempt >= maxAttempts) {
          // On final attempt failure, still check if it's a timeout vs other error
          if (error.message && (error.message.includes('timeout') || error.message.includes('Timeout') || error.http_code === 499)) {
            log("Delete", { 
              publicId: cleanPublicId, 
              status: 'timeout_final_attempt'
            }, "warning");
            
            // For timeout errors, assume deletion might have succeeded but response was lost
            return {
              success: true,
              result: 'timeout_assumed_success',
              message: 'Deletion request sent but response timed out. Image likely deleted.',
              publicId: cleanPublicId,
              warning: 'Response timeout - deletion status uncertain'
            };
          }
          
          throw error; // Re-throw non-timeout errors
        }
        
        // Wait before retry with exponential backoff
        const waitTime = 1500 * attempt;
        log("Delete", { 
          publicId: cleanPublicId, 
          waitTime: waitTime,
          status: 'waiting_before_retry' 
        }, "info");
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Check if deletion was successful
    if (result && result.result === 'ok') {
      log("Delete", { 
        publicId: cleanPublicId, 
        result: result,
        status: 'success' 
      }, "success");
      
      return {
        success: true,
        result: result.result,
        publicId: cleanPublicId
      };
    } else if (result && result.result === 'not found') {
      log("Delete", { 
        publicId: cleanPublicId, 
        result: result,
        status: 'not_found' 
      }, "warning");
      
      // Don't throw error for not found - it's already deleted
      return {
        success: true,
        result: result.result,
        message: 'Image was already deleted or does not exist',
        publicId: cleanPublicId
      };
    } else if (result) {
      log("Delete", { 
        publicId: cleanPublicId, 
        result: result,
        status: 'unknown_result' 
      }, "warning");
      
      return {
        success: false,
        result: result.result || 'unknown',
        message: `Cloudinary deletion returned: ${result.result}`,
        publicId: cleanPublicId
      };
    } else {
      throw new Error('No result received from Cloudinary deletion');
    }
    
  } catch (error) {
    log("Delete", { 
      publicId: publicId, 
      error: error.message,
      errorCode: error.code,
      httpCode: error.http_code,
      status: 'error'
    }, "error");
    
    // Enhanced error handling for common issues
    if (error.message && (error.message.includes('timeout') || error.message.includes('Timeout')) || error.http_code === 499) {
      // For timeout errors, be graceful - deletion might have succeeded
      return {
        success: true,
        result: 'timeout_graceful',
        message: 'Deletion request timed out, but image may have been deleted',
        publicId: publicId,
        warning: 'Timeout occurred during deletion'
      };
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return {
        success: true,
        result: 'network_error_graceful',
        message: 'Network error during deletion, but image may have been deleted',
        publicId: publicId,
        warning: 'Network error occurred during deletion'
      };
    } else {
      throw new Error(`Failed to delete image from Cloudinary: ${error.message}`);
    }
  }
};
// Generate optimized URL for existing Cloudinary image
const getOptimizedUrl = (publicId, options = {}) => {
  try {
    if (!publicId || typeof publicId !== 'string') {
      throw new Error('Public ID is required and must be a string');
    }

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

    log('OptimizeURL', {
      public_id: publicId,
      options: options,
      optimized_url: optimizedUrl
    }, 'info');

    return optimizedUrl;
  } catch (error) {
    log('OptimizeURL', {
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
    log('GetDetails', {
      public_id: publicId
    }, 'info');

    if (!publicId || typeof publicId !== 'string') {
      throw new Error('Public ID is required and must be a string');
    }

    const result = await cloudinary.api.resource(publicId, { timeout: 60000 });
    
    const details = {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at
    };

    log('GetDetails', details, 'success');

    return details;
  } catch (error) {
    log('GetDetails', {
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

    log('BulkDelete', {
      count: publicIds.length,
      public_ids: publicIds
    }, 'info');

    console.log(`🗑️ Bulk deleting ${publicIds.length} images from Cloudinary`);
    
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: 'image',
      timeout: 60000 // 60 seconds timeout
    });
    
    const summary = {
      deleted: Object.keys(result.deleted || {}).length,
      not_found: Object.keys(result.not_found || {}).length,
      rate_limit_exceeded: Object.keys(result.rate_limit_exceeded || {}).length
    };

    log('BulkDelete', {
      summary: summary,
      result: result
    }, 'success');

    console.log('✅ Cloudinary bulk deletion result:', summary);
    
    return result;
  } catch (error) {
    log('BulkDelete', {
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
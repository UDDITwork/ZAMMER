const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/virtual-tryon';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// AlphaBake API configuration
const ALPHABAKE_API_KEY = process.env.ALPHABAKE_API_KEY;
const ALPHABAKE_BASE_URL = 'https://api.alphabake.io/api/v2';

// Helper function to upload image to AlphaBake with retry logic
async function uploadImageToAlphaBake(imagePath, type = 'human', maxRetries = 3) {
  const uploadId = `upload_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const startTime = Date.now();
  
  console.log(`📤 [${uploadId}] Starting ${type} image upload to AlphaBake...`);
  console.log(`🔍 [${uploadId}] Upload details:`, {
    imagePath,
    type,
    fileExists: fs.existsSync(imagePath),
    fileSize: fs.existsSync(imagePath) ? fs.statSync(imagePath).size : 'N/A',
    apiEndpoint: `${ALPHABAKE_BASE_URL}/pre-signed-url/`,
    maxRetries
  });

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [${uploadId}] Attempt ${attempt}/${maxRetries} - Getting pre-signed URL...`);
      
      // Step 1: Get pre-signed URL for upload
      const presignedResponse = await axios.post(
        `${ALPHABAKE_BASE_URL}/pre-signed-url/`,
        { type },
        {
          headers: {
            'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

    console.log(`🔍 [${uploadId}] Pre-signed URL response:`, {
      status: presignedResponse.status,
      hasPresignedUrl: !!presignedResponse.data.presigned_url_upload,
      hasImageId: type === 'human' ? !!presignedResponse.data.human_id : !!presignedResponse.data.garment_id,
      responseKeys: Object.keys(presignedResponse.data),
      fullResponse: presignedResponse.data
    });

    if (!presignedResponse.data.presigned_url_upload) {
      console.error(`❌ [${uploadId}] Missing presigned URL in response:`, presignedResponse.data);
      throw new Error('Failed to get presigned URL from AlphaBake');
    }

    // Step 2: Read image file
    console.log(`📖 [${uploadId}] Step 2: Reading image file...`);
    let imageBuffer;
    try {
      imageBuffer = fs.readFileSync(imagePath);
      console.log(`✅ [${uploadId}] Image file read successfully:`, {
        bufferSize: imageBuffer.length,
        filePath: imagePath
      });
    } catch (readError) {
      console.error(`❌ [${uploadId}] Failed to read image file:`, {
        error: readError.message,
        filePath: imagePath
      });
      throw new Error(`Failed to read image file: ${readError.message}`);
    }
    
    // Step 3: Upload image using presigned URL
    console.log(`📤 [${uploadId}] Step 3: Uploading image to AlphaBake...`);
    console.log(`🔍 [${uploadId}] Upload details:`, {
      presignedUrl: presignedResponse.data.presigned_url_upload,
      bufferSize: imageBuffer.length,
      contentType: 'image/jpeg'
    });

    const uploadResponse = await axios.put(
      presignedResponse.data.presigned_url_upload,
      imageBuffer,
      {
        headers: {
          'Content-Type': 'image/jpeg'
        },
        timeout: 60000, // 60 second timeout for uploads
        maxRedirects: 5
      }
    );

    console.log(`🔍 [${uploadId}] Upload response:`, {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      headers: uploadResponse.headers,
      responseData: uploadResponse.data
    });

    if (uploadResponse.status !== 200) {
      console.error(`❌ [${uploadId}] Upload failed with status ${uploadResponse.status}:`, {
        statusText: uploadResponse.statusText,
        responseData: uploadResponse.data
      });
      throw new Error(`Failed to upload image to AlphaBake: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    console.log(`✅ [${uploadId}] Image uploaded successfully to AlphaBake S3 bucket`);

      // Extract the correct image ID based on the response structure
      // AlphaBake returns 'key' field, not 'human_id' or 'garment_id'
      let imageId = presignedResponse.data.key;
      
      console.log(`🔍 [${uploadId}] Extracted image ID:`, {
        key: presignedResponse.data.key,
        human_id: presignedResponse.data.human_id,
        garment_id: presignedResponse.data.garment_id,
        selectedImageId: imageId
      });
      
      const result = {
        imageId: imageId,
        imageUrl: presignedResponse.data.presigned_url_view
      };

      const totalTime = Date.now() - startTime;
      console.log(`✅ [${uploadId}] ${type} image upload completed successfully:`, {
        imageId: result.imageId,
        imageUrl: result.imageUrl,
        totalTime: `${totalTime}ms`,
        result
      });

      return result;
      
    } catch (error) {
      lastError = error;
      const totalTime = Date.now() - startTime;
      console.error(`❌ [${uploadId}] Attempt ${attempt}/${maxRetries} failed after ${totalTime}ms:`, {
        error: error.message,
        stack: error.stack,
        type: error.constructor.name,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (attempt < maxRetries) {
        console.log(`🔄 [${uploadId}] Retrying in 2 seconds... (${maxRetries - attempt} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // If we get here, all retries failed
  const totalTime = Date.now() - startTime;
  console.error(`❌ [${uploadId}] All ${maxRetries} attempts failed after ${totalTime}ms`);
  throw lastError || new Error(`Failed to upload ${type} image after ${maxRetries} attempts`);
}

// Helper function to create try-on request using public URLs
async function createTryOnRequestWithUrls(humanImageUrl, garmentUrl, garmentType = 'full') {
  const tryOnId = `tryon_req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const startTime = Date.now();
  
  console.log(`🎯 [${tryOnId}] Creating try-on request with public URLs...`);
  console.log(`🔍 [${tryOnId}] Request parameters:`, {
    humanImageUrl,
    garmentUrl,
    garmentType,
    apiEndpoint: `${ALPHABAKE_BASE_URL}/tryon/`,
    requestBody: {
      human_url: humanImageUrl,
      garment_url: garmentUrl,
      garment_type: garmentType,
      mode: 'fast',
      garment_guidance: 0.5,
      process_asset: 'tryon',
      human_zoom_in: 'true',
      retain_pose: 'true',
      is_offline: 'false'
    }
  });

  try {
    const tryOnResponse = await axios.post(
      `${ALPHABAKE_BASE_URL}/tryon/`,
      {
        human_url: humanImageUrl,
        garment_url: garmentUrl,
        garment_type: garmentType,
        mode: 'fast',
        garment_guidance: 0.5,
        process_asset: 'tryon',
        human_zoom_in: 'true',
        retain_pose: 'true',
        is_offline: 'false'
      },
      {
        headers: {
          'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ [${tryOnId}] Try-on request created successfully:`, {
      status: tryOnResponse.status,
      statusText: tryOnResponse.statusText,
      responseTime: `${totalTime}ms`,
      responseData: tryOnResponse.data
    });

    return tryOnResponse.data;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${tryOnId}] Failed to create try-on request after ${totalTime}ms:`, {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      requestData: {
        humanImageUrl,
        garmentUrl,
        garmentType,
        requestBody: {
          human_url: humanImageUrl,
          garment_url: garmentUrl,
          garment_type: garmentType,
          mode: 'fast',
          garment_guidance: 0.5,
          process_asset: 'tryon',
          human_zoom_in: 'true',
          retain_pose: 'true',
          is_offline: 'false'
        }
      }
    });
    
    // Extract more specific error message from AlphaBake response
    let errorMessage = error.message;
    if (error.response?.data?.message) {
      errorMessage = `AlphaBake API Error: ${error.response.data.message}`;
    } else if (error.response?.data?.error) {
      errorMessage = `AlphaBake API Error: ${error.response.data.error}`;
    } else if (error.response?.data) {
      errorMessage = `AlphaBake API Error: ${JSON.stringify(error.response.data)}`;
    }
    
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.response = error.response;
    throw enhancedError;
  }
}

// Helper function to create try-on request (legacy - using IDs)
async function createTryOnRequest(humanId, garmentUrl, garmentType = 'full') {
  const tryOnId = `tryon_req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const startTime = Date.now();
  
  console.log(`🎯 [${tryOnId}] Creating try-on request...`);
  console.log(`🔍 [${tryOnId}] Request parameters:`, {
    humanId,
    garmentUrl,
    garmentType,
    apiEndpoint: `${ALPHABAKE_BASE_URL}/tryon/`,
    requestBody: {
      human_id: humanId,
      garment_url: garmentUrl,
      garment_type: garmentType,
      mode: 'fast',
      garment_guidance: 0.5,
      process_asset: 'tryon',
      human_zoom_in: 'true',
      retain_pose: 'true',
      is_offline: 'false'
    }
  });

  try {
    const tryOnResponse = await axios.post(
      `${ALPHABAKE_BASE_URL}/tryon/`,
      {
        human_id: humanId,
        garment_url: garmentUrl, // Use direct URL for garment image
        garment_type: garmentType,
        mode: 'fast', // Use fast mode for better user experience
        garment_guidance: 0.5,
        process_asset: 'tryon',
        human_zoom_in: 'true',
        retain_pose: 'true',
        is_offline: 'false'
      },
      {
        headers: {
          'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ [${tryOnId}] Try-on request created successfully:`, {
      status: tryOnResponse.status,
      statusText: tryOnResponse.statusText,
      responseTime: `${totalTime}ms`,
      responseData: tryOnResponse.data
    });

    return tryOnResponse.data;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${tryOnId}] Failed to create try-on request after ${totalTime}ms:`, {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      requestData: {
        humanId,
        garmentUrl,
        garmentType,
        requestBody: {
          human_id: humanId,
          garment_url: garmentUrl,
          garment_type: garmentType,
          mode: 'fast',
          garment_guidance: 0.5,
          process_asset: 'tryon',
          human_zoom_in: 'true',
          retain_pose: 'true',
          is_offline: 'false'
        }
      }
    });
    
    // Extract more specific error message from AlphaBake response
    let errorMessage = error.message;
    if (error.response?.data?.message) {
      errorMessage = `AlphaBake API Error: ${error.response.data.message}`;
    } else if (error.response?.data?.error) {
      errorMessage = `AlphaBake API Error: ${error.response.data.error}`;
    } else if (error.response?.data) {
      errorMessage = `AlphaBake API Error: ${JSON.stringify(error.response.data)}`;
    }
    
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.response = error.response;
    throw enhancedError;
  }
}

// Helper function to verify human ID exists in AlphaBake
async function verifyHumanIdExists(humanId) {
  const verifyId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const startTime = Date.now();
  
  console.log(`🔍 [${verifyId}] Verifying human ID exists: ${humanId}`);
  
  try {
    // Try to get human image info from AlphaBake
    const response = await axios.get(
      `${ALPHABAKE_BASE_URL}/human/${encodeURIComponent(humanId)}`,
      {
        headers: {
          'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ [${verifyId}] Human ID verification successful:`, {
      humanId,
      status: response.status,
      responseTime: `${totalTime}ms`,
      data: response.data
    });

    return true;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.log(`❌ [${verifyId}] Human ID verification failed:`, {
      humanId,
      error: error.message,
      status: error.response?.status,
      responseTime: `${totalTime}ms`,
      response: error.response?.data
    });
    return false;
  }
}

// Helper function to check try-on status
async function checkTryOnStatus(tryOnId) {
  const statusId = `status_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const startTime = Date.now();
  
  console.log(`📊 [${statusId}] Checking try-on status...`);
  console.log(`🔍 [${statusId}] Status check details:`, {
    tryOnId,
    apiEndpoint: `${ALPHABAKE_BASE_URL}/tryon_status/`,
    requestBody: { tryon_id: tryOnId }
  });

  try {
    const statusResponse = await axios.post(
      `${ALPHABAKE_BASE_URL}/tryon_status/`,
      { tryon_id: tryOnId },
      {
        headers: {
          'Authorization': `Bearer ${ALPHABAKE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout for status checks
      }
    );

    const totalTime = Date.now() - startTime;
    console.log(`✅ [${statusId}] Status check completed:`, {
      status: statusResponse.status,
      statusText: statusResponse.statusText,
      responseTime: `${totalTime}ms`,
      tryOnId: tryOnId,
      responseData: statusResponse.data
    });

    return statusResponse.data;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${statusId}] Status check failed after ${totalTime}ms:`, {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name,
      tryOnId: tryOnId,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    throw error;
  }
}

// Helper function to determine garment type based on product category
function determineGarmentType(productCategory) {
  const category = productCategory?.toLowerCase() || '';
  
  console.log(`🔍 [GARMENT_TYPE] Determining garment type for category: "${productCategory}"`);
  console.log(`🔍 [GARMENT_TYPE] Normalized category: "${category}"`);
  
  let garmentType;
  let reason;
  
  if (category.includes('shirt') || category.includes('top') || category.includes('kurta') || category.includes('blouse')) {
    garmentType = 'top';
    reason = `Category "${category}" contains top-related keywords`;
  } else if (category.includes('pant') || category.includes('bottom') || category.includes('jeans') || category.includes('trouser')) {
    garmentType = 'bottom';
    reason = `Category "${category}" contains bottom-related keywords`;
  } else {
    garmentType = 'full';
    reason = `Category "${category}" defaulting to full body (dresses, suits, etc.)`;
  }
  
  console.log(`✅ [GARMENT_TYPE] Determined garment type: "${garmentType}" - ${reason}`);
  
  return garmentType;
}

// Process virtual try-on
router.post('/process', upload.single('userPhoto'), async (req, res) => {
  const requestId = `tryon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`🔍 [${requestId}] ===== VIRTUAL TRY-ON REQUEST STARTED =====`);
  console.log(`🔍 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`🔍 [${requestId}] Request Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`🔍 [${requestId}] Request Body Keys:`, Object.keys(req.body));
  console.log(`🔍 [${requestId}] File Info:`, req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path
  } : 'No file uploaded');

  try {
    // Validate API key
    if (!ALPHABAKE_API_KEY) {
      console.error(`❌ [${requestId}] ALPHABAKE_API_KEY is not configured`);
      return res.status(500).json({
        success: false,
        message: 'Virtual try-on service is not configured',
        requestId
      });
    }
    console.log(`✅ [${requestId}] ALPHABAKE_API_KEY is configured`);
    
    // Check if AlphaBake API is reachable
    try {
      console.log(`🔍 [${requestId}] Testing AlphaBake API connectivity...`);
      await axios.get(`${ALPHABAKE_BASE_URL.replace('/api/v2', '')}/health`, { timeout: 10000 });
      console.log(`✅ [${requestId}] AlphaBake API is reachable`);
    } catch (connectivityError) {
      console.warn(`⚠️ [${requestId}] AlphaBake API connectivity test failed:`, connectivityError.message);
      console.log(`ℹ️ [${requestId}] Continuing with upload attempt...`);
    }

    // Validate file upload
    if (!req.file) {
      console.error(`❌ [${requestId}] No user photo file uploaded`);
      return res.status(400).json({
        success: false,
        message: 'User photo is required',
        requestId
      });
    }
    console.log(`✅ [${requestId}] User photo file received:`, {
      size: req.file.size,
      type: req.file.mimetype,
      path: req.file.path
    });

    // Validate request body
    const { productId, productImage, productCategory } = req.body;
    console.log(`🔍 [${requestId}] Request body validation:`, {
      productId: !!productId,
      productImage: !!productImage,
      productCategory: productCategory || 'not provided',
      productImageUrl: productImage
    });
    
    if (!productId || !productImage) {
      console.error(`❌ [${requestId}] Missing required fields:`, {
        productId: !!productId,
        productImage: !!productImage
      });
      return res.status(400).json({
        success: false,
        message: 'Product information is required',
        requestId
      });
    }
    console.log(`✅ [${requestId}] All required fields validated`);

    console.log(`🚀 [${requestId}] Starting virtual try-on process...`, {
      productId,
      userPhotoPath: req.file.path,
      productImage,
      productCategory: productCategory || 'defaulting to full',
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

    // Step 1: Upload user photo to a temporary public URL for AlphaBake API
    console.log(`📤 [${requestId}] Step 1: Uploading user photo to temporary public URL...`);
    console.log(`🔍 [${requestId}] File details:`, {
      path: req.file.path,
      size: req.file.size,
      type: req.file.mimetype,
      exists: fs.existsSync(req.file.path)
    });
    
    let humanImageUrl;
    try {
      // For now, we'll use the existing upload function to get a public URL
      // In production, you might want to upload to Cloudinary or similar
      const uploadResult = await uploadImageToAlphaBake(req.file.path, 'human');
      humanImageUrl = uploadResult.imageUrl;
      
      console.log(`✅ [${requestId}] User photo uploaded successfully:`, {
        originalSize: req.file.size,
        publicUrl: humanImageUrl,
        mimeType: req.file.mimetype
      });
    } catch (uploadError) {
      console.error(`❌ [${requestId}] Failed to upload user photo:`, {
        error: uploadError.message,
        stack: uploadError.stack,
        filePath: req.file.path
      });
      throw new Error(`User photo upload failed: ${uploadError.message}`);
    }

    // Step 2: Create try-on request using direct URLs (no upload needed)
    console.log(`🎯 [${requestId}] Step 2: Creating try-on request with direct URLs...`);
    const garmentType = determineGarmentType(req.body.productCategory || 'full');
    console.log(`🔍 [${requestId}] Garment type determination:`, {
      inputCategory: req.body.productCategory || 'not provided',
      determinedType: garmentType,
      productImageUrl: productImage
    });
    
    // Create try-on request using public URLs as per AlphaBake API docs
    console.log(`🔍 [${requestId}] Calling AlphaBake try-on API with public URLs:`, {
      humanImageUrl: humanImageUrl,
      garmentUrl: productImage,
      garmentType: garmentType,
      apiEndpoint: `${ALPHABAKE_BASE_URL}/tryon/`
    });
    
    let tryOnRequest;
    try {
      tryOnRequest = await createTryOnRequestWithUrls(
        humanImageUrl,
        productImage,
        garmentType
      );
      console.log(`✅ [${requestId}] Try-on request created successfully:`, {
        tryOnId: tryOnRequest.tryon_id,
        status: tryOnRequest.status,
        message: tryOnRequest.message,
        fullResponse: tryOnRequest
      });
    } catch (tryOnError) {
      console.error(`❌ [${requestId}] Try-on request creation failed:`, {
        error: tryOnError.message,
        stack: tryOnError.stack,
        requestData: {
          humanImageUrl: humanImageUrl,
          garmentUrl: productImage,
          garmentType: garmentType
        }
      });
      throw new Error(`Try-on request creation failed: ${tryOnError.message}`);
    }

    // Step 3: Poll for completion
    console.log(`⏳ [${requestId}] Step 3: Polling for try-on completion...`);
    let tryOnResult = null;
    let attempts = 0;
    const maxAttempts = 90; // 3 minutes with 2-second intervals
    const pollStartTime = Date.now();

    console.log(`🔍 [${requestId}] Polling configuration:`, {
      tryOnId: tryOnRequest.tryon_id,
      maxAttempts: maxAttempts,
      intervalMs: 2000,
      maxWaitTime: maxAttempts * 2,
      startTime: new Date(pollStartTime).toISOString()
    });

    while (attempts < maxAttempts) {
      const pollAttemptStart = Date.now();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;

      console.log(`📊 [${requestId}] Polling attempt ${attempts}/${maxAttempts} (${Math.round((Date.now() - pollStartTime) / 1000)}s elapsed)`);

      try {
        const status = await checkTryOnStatus(tryOnRequest.tryon_id);
        const pollTime = Date.now() - pollAttemptStart;
        
        console.log(`📊 [${requestId}] Status check response (attempt ${attempts}):`, {
          status: status.status,
          message: status.message,
          pollTime: `${pollTime}ms`,
          fullResponse: status
        });

        if (status.status === 'done') {
          tryOnResult = status;
          console.log(`🎉 [${requestId}] Try-on completed successfully on attempt ${attempts}!`, {
            finalStatus: status.status,
            totalPollingTime: Math.round((Date.now() - pollStartTime) / 1000),
            totalAttempts: attempts
          });
          break;
        } else if (status.status === 'failed') {
          console.error(`❌ [${requestId}] Try-on failed on attempt ${attempts}:`, {
            status: status.status,
            message: status.message,
            fullResponse: status
          });
          throw new Error(`Try-on failed: ${status.message}`);
        } else if (status.status === 'processing') {
          console.log(`⏳ [${requestId}] Still processing (attempt ${attempts})...`);
        } else {
          console.log(`🔍 [${requestId}] Unknown status: ${status.status} (attempt ${attempts})`);
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Error checking status (attempt ${attempts}):`, {
          error: error.message,
          stack: error.stack,
          tryOnId: tryOnRequest.tryon_id
        });
        
        if (attempts >= maxAttempts) {
          console.error(`❌ [${requestId}] Max polling attempts reached (${maxAttempts})`);
          throw new Error(`Try-on processing timed out after ${maxAttempts} attempts`);
        }
        
        console.log(`🔄 [${requestId}] Continuing to poll... (${maxAttempts - attempts} attempts remaining)`);
      }
    }

    if (!tryOnResult) {
      console.error(`❌ [${requestId}] Try-on processing did not complete within expected time`);
      throw new Error('Try-on processing did not complete within expected time');
    }

    const totalProcessingTime = Date.now() - startTime;
    console.log(`🎉 [${requestId}] Try-on completed successfully!`, {
      tryOnId: tryOnResult.tryon_id,
      finalStatus: tryOnResult.status,
      totalProcessingTime: `${Math.round(totalProcessingTime / 1000)}s`,
      pollingAttempts: attempts,
      resultData: tryOnResult
    });

    // Clean up uploaded files
    console.log(`🧹 [${requestId}] Cleaning up temporary files...`);
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log(`✅ [${requestId}] Temporary file deleted successfully:`, req.file.path);
      } else {
        console.warn(`⚠️ [${requestId}] Temporary file not found for deletion:`, req.file.path);
      }
    } catch (cleanupError) {
      console.warn(`⚠️ [${requestId}] Warning: Could not delete uploaded file:`, {
        error: cleanupError.message,
        filePath: req.file.path
      });
    }

    // Return success response
    const responseData = {
      success: true,
      message: 'Virtual try-on completed successfully',
      requestId: requestId,
      data: {
        tryOnId: tryOnResult.tryon_id,
        imageUrl: tryOnResult.s3_url,
        processingTime: Math.round(totalProcessingTime / 1000), // seconds
        pollingAttempts: attempts,
        creditsUsed: tryOnResult.credits_used || 1
      }
    };

    console.log(`✅ [${requestId}] Sending success response:`, responseData);
    console.log(`🏁 [${requestId}] ===== VIRTUAL TRY-ON REQUEST COMPLETED =====`);
    console.log(`🏁 [${requestId}] Total time: ${Math.round(totalProcessingTime / 1000)}s`);
    
    res.json(responseData);

  } catch (error) {
    const errorTime = Date.now();
    const totalTime = errorTime - startTime;
    
    console.error(`❌ [${requestId}] ===== VIRTUAL TRY-ON ERROR =====`);
    console.error(`❌ [${requestId}] Error occurred after ${Math.round(totalTime / 1000)}s`);
    console.error(`❌ [${requestId}] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status,
      response: error.response?.data
    });
    console.error(`❌ [${requestId}] Request context:`, {
      productId: req.body?.productId,
      productImage: req.body?.productImage,
      productCategory: req.body?.productCategory,
      fileUploaded: !!req.file,
      filePath: req.file?.path
    });

    // Clean up uploaded files on error
    if (req.file) {
      console.log(`🧹 [${requestId}] Attempting to clean up file on error...`);
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log(`✅ [${requestId}] Error cleanup: File deleted successfully`);
        } else {
          console.warn(`⚠️ [${requestId}] Error cleanup: File not found for deletion`);
        }
      } catch (cleanupError) {
        console.error(`❌ [${requestId}] Error cleanup failed:`, {
          error: cleanupError.message,
          filePath: req.file.path
        });
      }
    }

    const errorResponse = {
      success: false,
      message: error.message || 'Virtual try-on processing failed',
      requestId: requestId,
      timestamp: new Date().toISOString(),
      processingTime: Math.round(totalTime / 1000)
    };

    // Add detailed error info in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      };
    }

    console.error(`❌ [${requestId}] Sending error response:`, errorResponse);
    console.error(`🏁 [${requestId}] ===== VIRTUAL TRY-ON REQUEST FAILED =====`);
    
    res.status(500).json(errorResponse);
  }
});

// Get try-on status (for polling from frontend)
router.post('/status', async (req, res) => {
  const requestId = `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`🔍 [${requestId}] ===== STATUS CHECK REQUEST =====`);
  console.log(`🔍 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`🔍 [${requestId}] Request body:`, req.body);

  try {
    const { tryOnId } = req.body;
    
    if (!tryOnId) {
      console.error(`❌ [${requestId}] Missing tryOnId in request body`);
      return res.status(400).json({
        success: false,
        message: 'Try-on ID is required',
        requestId
      });
    }

    console.log(`📊 [${requestId}] Checking status for tryOnId: ${tryOnId}`);
    const status = await checkTryOnStatus(tryOnId);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Status check completed in ${totalTime}ms:`, {
      tryOnId,
      status: status.status,
      message: status.message
    });
    
    res.json({
      success: true,
      requestId,
      data: status
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Status check failed after ${totalTime}ms:`, {
      error: error.message,
      stack: error.stack,
      tryOnId: req.body?.tryOnId
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check try-on status',
      requestId
    });
  }
});

// Get try-on history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // In a real implementation, you'd store try-on results in your database
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      data: [],
      message: 'Try-on history feature coming soon'
    });

  } catch (error) {
    console.error('Error fetching try-on history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch try-on history'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  const requestId = `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🔍 [${requestId}] ===== HEALTH CHECK REQUEST =====`);
  console.log(`🔍 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`🔍 [${requestId}] Request headers:`, JSON.stringify(req.headers, null, 2));
  
  const healthStatus = {
    success: true,
    message: 'Virtual try-on service is running',
    timestamp: new Date().toISOString(),
    requestId: requestId,
    apiConfigured: !!ALPHABAKE_API_KEY,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    uploadsDirectory: {
      exists: fs.existsSync('uploads/virtual-tryon'),
      path: path.resolve('uploads/virtual-tryon')
    }
  };
  
  console.log(`✅ [${requestId}] Health check completed:`, healthStatus);
  
  res.json(healthStatus);
});

module.exports = router;

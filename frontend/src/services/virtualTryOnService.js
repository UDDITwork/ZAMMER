const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class VirtualTryOnService {
  // Process virtual try-on with user photo and product
  static async processTryOn(userPhoto, productId, productImage, productCategory = null) {
    const requestId = `frontend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🔍 [${requestId}] ===== FRONTEND TRY-ON REQUEST STARTED =====`);
    console.log(`🔍 [${requestId}] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔍 [${requestId}] API Base URL: ${API_BASE_URL}`);
    console.log(`🔍 [${requestId}] Input parameters:`, {
      productId,
      productImage,
      productCategory: productCategory || 'not provided',
      photoSize: userPhoto.size,
      photoType: userPhoto.type,
      photoName: userPhoto.name,
      photoLastModified: userPhoto.lastModified
    });

    try {
      // Step 1: Create form data
      console.log(`🔍 [${requestId}] Step 1: Creating form data...`);
      const formData = new FormData();
      formData.append('userPhoto', userPhoto);
      formData.append('productId', productId);
      formData.append('productImage', productImage);
      
      if (productCategory) {
        formData.append('productCategory', productCategory);
      }
      
      console.log(`🔍 [${requestId}] Form data created:`, {
        hasUserPhoto: !!formData.get('userPhoto'),
        hasProductId: !!formData.get('productId'),
        hasProductImage: !!formData.get('productImage'),
        hasProductCategory: !!formData.get('productCategory'),
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          valueType: typeof value,
          valueSize: value instanceof File ? value.size : 'N/A'
        }))
      });

      // Step 2: Make API call
      console.log(`🔍 [${requestId}] Step 2: Making API call to /virtual-tryon/process...`);
      const apiStartTime = Date.now();
      
      const response = await fetch(`${API_BASE_URL}/virtual-tryon/process`, {
        method: 'POST',
        body: formData,
      });
      
      const apiTime = Date.now() - apiStartTime;
      console.log(`🔍 [${requestId}] API response received in ${apiTime}ms:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        console.error(`❌ [${requestId}] API call failed with status ${response.status}`);
        
        // Enhanced error handling with detailed response analysis
        let errorData;
        let errorMessage;
        
        try {
          errorData = await response.json();
          console.error(`❌ [${requestId}] Error response data:`, errorData);
          
          // Extract meaningful error message
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.details) {
            errorMessage = `Request failed: ${errorData.details}`;
          } else {
            errorMessage = `HTTP error! status: ${response.status}`;
          }
          
          // Add request ID if available for debugging
          if (errorData.requestId) {
            errorMessage += ` (Request ID: ${errorData.requestId})`;
          }
          
        } catch (parseError) {
          console.error(`❌ [${requestId}] Failed to parse error response:`, parseError);
          errorMessage = `HTTP error! status: ${response.status} - Unable to parse error details`;
        }
        
        // Create enhanced error with response context
        const enhancedError = new Error(errorMessage);
        enhancedError.status = response.status;
        enhancedError.statusText = response.statusText;
        enhancedError.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          headers: Object.fromEntries(response.headers.entries())
        };
        
        console.error(`❌ [${requestId}] Enhanced error created:`, {
          message: enhancedError.message,
          status: enhancedError.status,
          statusText: enhancedError.statusText,
          hasResponseData: !!enhancedError.response.data
        });
        
        throw enhancedError;
      }

      // Step 3: Parse response
      console.log(`🔍 [${requestId}] Step 3: Parsing response...`);
      const responseData = await response.json();
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ [${requestId}] API call completed successfully in ${totalTime}ms:`, {
        responseData,
        totalTime: `${totalTime}ms`
      });
      
      console.log(`🏁 [${requestId}] ===== FRONTEND TRY-ON REQUEST COMPLETED =====`);
      return responseData;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] ===== FRONTEND TRY-ON REQUEST FAILED =====`);
      console.error(`❌ [${requestId}] Error occurred after ${totalTime}ms:`, {
        error: error.message,
        name: error.name,
        stack: error.stack,
        type: error.constructor.name
      });
      throw error;
    }
  }

  // Check try-on status
  static async checkTryOnStatus(tryOnId) {
    const requestId = `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🔍 [${requestId}] ===== FRONTEND STATUS CHECK REQUEST =====`);
    console.log(`🔍 [${requestId}] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔍 [${requestId}] Checking status for tryOnId: ${tryOnId}`);
    console.log(`🔍 [${requestId}] API Base URL: ${API_BASE_URL}`);

    try {
      const response = await fetch(`${API_BASE_URL}/virtual-tryon/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tryOnId }),
      });

      const apiTime = Date.now() - startTime;
      console.log(`🔍 [${requestId}] API response received in ${apiTime}ms:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        console.error(`❌ [${requestId}] Status check failed with status ${response.status}`);
        const errorData = await response.json();
        console.error(`❌ [${requestId}] Error response data:`, errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ [${requestId}] Status check completed successfully in ${totalTime}ms:`, {
        responseData,
        totalTime: `${totalTime}ms`
      });
      
      return responseData;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [${requestId}] Status check failed after ${totalTime}ms:`, {
        error: error.message,
        name: error.name,
        stack: error.stack,
        type: error.constructor.name
      });
      throw error;
    }
  }

  // Get try-on history for a user
  static async getTryOnHistory(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/virtual-tryon/history/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching try-on history:', error);
      throw error;
    }
  }

  // Health check for virtual try-on service
  static async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/virtual-tryon/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Virtual try-on health check error:', error);
      throw error;
    }
  }

  // Poll for try-on completion with progress updates
  static async pollTryOnCompletion(tryOnId, onProgress = null, maxAttempts = 90) {
    const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    let attempts = 0;
    const pollInterval = 2000; // 2 seconds

    console.log(`🔍 [${pollId}] ===== FRONTEND POLLING STARTED =====`);
    console.log(`🔍 [${pollId}] Polling configuration:`, {
      tryOnId,
      maxAttempts,
      pollInterval,
      startTime: new Date(startTime).toISOString()
    });

    return new Promise((resolve, reject) => {
      const poll = async () => {
        const pollStartTime = Date.now();
        attempts++;
        
        console.log(`📊 [${pollId}] Polling attempt ${attempts}/${maxAttempts} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
        
        if (onProgress) {
          const percentage = Math.min((attempts / maxAttempts) * 100, 95);
          onProgress({
            attempts,
            maxAttempts,
            percentage
          });
          console.log(`📊 [${pollId}] Progress update: ${percentage.toFixed(1)}% (attempt ${attempts})`);
        }

        try {
          const status = await this.checkTryOnStatus(tryOnId);
          const pollTime = Date.now() - pollStartTime;
          
          console.log(`📊 [${pollId}] Status response (attempt ${attempts}):`, {
            status: status.data.status,
            message: status.data.message,
            pollTime: `${pollTime}ms`,
            totalTime: `${Math.round((Date.now() - startTime) / 1000)}s`
          });
          
          if (status.data.status === 'done') {
            const totalTime = Date.now() - startTime;
            console.log(`🎉 [${pollId}] Try-on completed successfully on attempt ${attempts}!`, {
              totalTime: `${Math.round(totalTime / 1000)}s`,
              totalAttempts: attempts
            });
            
            if (onProgress) {
              onProgress({
                attempts,
                maxAttempts,
                percentage: 100
              });
            }
            resolve(status.data);
            return;
          }

          if (status.data.status === 'failed') {
            const totalTime = Date.now() - startTime;
            console.error(`❌ [${pollId}] Try-on failed on attempt ${attempts} after ${Math.round(totalTime / 1000)}s:`, {
              status: status.data.status,
              message: status.data.message
            });
            reject(new Error(`Try-on failed: ${status.data.message}`));
            return;
          }

          if (attempts >= maxAttempts) {
            const totalTime = Date.now() - startTime;
            console.error(`❌ [${pollId}] Max polling attempts reached (${maxAttempts}) after ${Math.round(totalTime / 1000)}s`);
            reject(new Error('Try-on processing timed out'));
            return;
          }

          console.log(`⏳ [${pollId}] Continuing to poll... (${maxAttempts - attempts} attempts remaining)`);
          // Continue polling
          setTimeout(poll, pollInterval);
        } catch (error) {
          const totalTime = Date.now() - startTime;
          console.error(`❌ [${pollId}] Polling error on attempt ${attempts} after ${Math.round(totalTime / 1000)}s:`, {
            error: error.message,
            name: error.name,
            stack: error.stack
          });
          reject(error);
        }
      };

      // Start polling
      console.log(`🚀 [${pollId}] Starting first poll...`);
      poll();
    });
  }

  // Validate image file
  static validateImageFile(file) {
    const validationId = `validation_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    console.log(`🔍 [${validationId}] ===== IMAGE VALIDATION STARTED =====`);
    console.log(`🔍 [${validationId}] File details:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    });

    const errors = [];
    const validations = [];

    // Check file size (2MB limit)
    const maxSize = 2 * 1024 * 1024;
    const sizeValid = file.size <= maxSize;
    if (!sizeValid) {
      errors.push('Image size must be less than 2MB');
    }
    validations.push({
      check: 'File Size',
      valid: sizeValid,
      actual: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      limit: '2MB'
    });

    // Check file type
    const typeValid = file.type.startsWith('image/');
    if (!typeValid) {
      errors.push('File must be an image');
    }
    validations.push({
      check: 'File Type',
      valid: typeValid,
      actual: file.type,
      expected: 'image/*'
    });

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const extensionValid = allowedExtensions.includes(fileExtension);
    if (!extensionValid) {
      errors.push('Only JPG, JPEG, and PNG files are allowed');
    }
    validations.push({
      check: 'File Extension',
      valid: extensionValid,
      actual: fileExtension,
      expected: allowedExtensions.join(', ')
    });

    const result = {
      isValid: errors.length === 0,
      errors,
      validations
    };

    console.log(`🔍 [${validationId}] Validation results:`, {
      validations,
      totalErrors: errors.length,
      isValid: result.isValid
    });

    if (result.isValid) {
      console.log(`✅ [${validationId}] Image validation passed`);
    } else {
      console.error(`❌ [${validationId}] Image validation failed:`, errors);
    }

    console.log(`🏁 [${validationId}] ===== IMAGE VALIDATION COMPLETED =====`);
    return result;
  }

  // Resize image if needed (client-side optimization)
  static async resizeImageIfNeeded(file, maxWidth = 2048, maxHeight = 2048) {
    const resizeId = `resize_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const startTime = Date.now();
    
    console.log(`🔍 [${resizeId}] ===== IMAGE RESIZING STARTED =====`);
    console.log(`🔍 [${resizeId}] Input file:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    });
    console.log(`🔍 [${resizeId}] Resize limits:`, {
      maxWidth,
      maxHeight
    });

    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;
        const originalDimensions = { width, height };
        
        console.log(`🔍 [${resizeId}] Image loaded:`, {
          originalWidth: width,
          originalHeight: height,
          aspectRatio: (width / height).toFixed(2)
        });

        // Check if resizing is needed
        if (width <= maxWidth && height <= maxHeight) {
          const totalTime = Date.now() - startTime;
          console.log(`✅ [${resizeId}] No resizing needed - image within limits:`, {
            originalDimensions,
            maxDimensions: { maxWidth, maxHeight },
            totalTime: `${totalTime}ms`
          });
          console.log(`🏁 [${resizeId}] ===== IMAGE RESIZING COMPLETED (NO CHANGE) =====`);
          resolve(file);
          return;
        }

        // Calculate new dimensions
        let newWidth = width;
        let newHeight = height;
        let resizeReason = '';

        if (width > height) {
          if (width > maxWidth) {
            newHeight = (height * maxWidth) / width;
            newWidth = maxWidth;
            resizeReason = `Width exceeded limit (${width} > ${maxWidth})`;
          }
        } else {
          if (height > maxHeight) {
            newWidth = (width * maxHeight) / height;
            newHeight = maxHeight;
            resizeReason = `Height exceeded limit (${height} > ${maxHeight})`;
          }
        }

        console.log(`🔍 [${resizeId}] Resizing calculation:`, {
          originalDimensions,
          newDimensions: { width: newWidth, height: newHeight },
          reason: resizeReason,
          scaleFactor: {
            width: (newWidth / width).toFixed(3),
            height: (newHeight / height).toFixed(3)
          }
        });

        // Resize image
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        console.log(`🔍 [${resizeId}] Canvas created and image drawn:`, {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });

        // Convert to blob
        canvas.toBlob((blob) => {
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          
          const totalTime = Date.now() - startTime;
          console.log(`✅ [${resizeId}] Image resized successfully:`, {
            originalSize: file.size,
            resizedSize: resizedFile.size,
            sizeReduction: `${((1 - resizedFile.size / file.size) * 100).toFixed(1)}%`,
            originalDimensions,
            resizedDimensions: { width: newWidth, height: newHeight },
            totalTime: `${totalTime}ms`
          });
          
          console.log(`🏁 [${resizeId}] ===== IMAGE RESIZING COMPLETED =====`);
          resolve(resizedFile);
        }, file.type, 0.8);
      };

      img.onerror = (error) => {
        const totalTime = Date.now() - startTime;
        console.error(`❌ [${resizeId}] Failed to load image for resizing after ${totalTime}ms:`, {
          error,
          file: file.name
        });
        // Fallback to original file
        resolve(file);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Get estimated processing time based on mode
  static getEstimatedProcessingTime(mode = 'fast') {
    const estimates = {
      fast: {
        min: 5,
        max: 15,
        average: 10
      },
      quality: {
        min: 10,
        max: 180,
        average: 60
      }
    };

    return estimates[mode] || estimates.fast;
  }

  // Get cost information for try-on
  static getTryOnCost(mode = 'fast') {
    const costs = {
      fast: {
        credits: 1,
        estimatedCost: 0.03, // $0.03 USD
        currency: 'USD'
      },
      quality: {
        credits: 2,
        estimatedCost: 0.06, // $0.06 USD
        currency: 'USD'
      }
    };

    return costs[mode] || costs.fast;
  }
}

export default VirtualTryOnService;


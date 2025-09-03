# Virtual Try-On Enhanced Logging Guide

## Overview

This document outlines the comprehensive logging system implemented throughout the Virtual Try-On functionality to enable detailed tracking, debugging, and monitoring of all operations.

## 🔍 **Logging Features**

### 1. **Unique Request IDs**
Every operation gets a unique identifier for easy tracking:
- **Backend**: `tryon_${timestamp}_${random}`, `upload_${type}_${timestamp}_${random}`
- **Frontend**: `frontend_${timestamp}_${random}`, `modal_${timestamp}_${random}`
- **Service**: `status_${timestamp}_${random}`, `poll_${timestamp}_${random}`

### 2. **Timing Information**
All operations include timing data:
- Start/end timestamps
- Processing duration
- API response times
- Step-by-step timing breakdown

### 3. **Structured Data Logging**
- Request/response details
- File information (size, type, dimensions)
- API parameters and responses
- Error details with stack traces

### 4. **Visual Indicators**
- 🔍 **Process Start**: `===== PROCESS STARTED =====`
- ✅ **Success**: `✅ Operation completed successfully`
- ❌ **Errors**: `❌ Operation failed`
- ⚠️ **Warnings**: `⚠️ Warning message`
- 🏁 **Process End**: `===== PROCESS COMPLETED =====`

## 📊 **Backend Logging**

### **Main Process Endpoint (`/api/virtual-tryon/process`)**

#### **Request Initialization**
```javascript
🔍 [tryon_1234567890_abc123] ===== VIRTUAL TRY-ON REQUEST STARTED =====
🔍 [tryon_1234567890_abc123] Timestamp: 2025-01-06T10:30:00.000Z
🔍 [tryon_1234567890_abc123] Request Headers: {...}
🔍 [tryon_1234567890_abc123] Request Body Keys: ['productId', 'productImage', 'productCategory']
🔍 [tryon_1234567890_abc123] File Info: { fieldname: 'userPhoto', size: 1048576, type: 'image/jpeg', ... }
```

#### **Validation Steps**
```javascript
✅ [tryon_1234567890_abc123] ALPHABAKE_API_KEY is configured
✅ [tryon_1234567890_abc123] User photo file received: { size: 1048576, type: 'image/jpeg', path: '...' }
✅ [tryon_1234567890_abc123] All required fields validated
```

#### **Processing Steps**
```javascript
📤 [tryon_1234567890_abc123] Step 1: Uploading user photo to AlphaBake...
🔍 [tryon_1234567890_abc123] File details for upload: { path: '...', size: 1048576, type: 'image/jpeg', exists: true }
✅ [tryon_1234567890_abc123] User photo uploaded successfully: { imageId: 'human_123', imageUrl: '...', uploadTime: 1500 }

🎯 [tryon_1234567890_abc123] Step 2: Creating try-on request...
🔍 [tryon_1234567890_abc123] Garment type determination: { inputCategory: 'Kurta', determinedType: 'top', productImageUrl: '...' }
🔍 [tryon_1234567890_abc123] Calling AlphaBake try-on API with: { humanId: 'human_123', garmentUrl: '...', garmentType: 'top' }
✅ [tryon_1234567890_abc123] Try-on request created successfully: { tryOnId: 'tryon_456', status: 'processing', ... }
```

#### **Polling Process**
```javascript
⏳ [tryon_1234567890_abc123] Step 3: Polling for try-on completion...
🔍 [tryon_1234567890_abc123] Polling configuration: { tryOnId: 'tryon_456', maxAttempts: 90, intervalMs: 2000, ... }

📊 [tryon_1234567890_abc123] Polling attempt 1/90 (2s elapsed)
📊 [tryon_1234567890_abc123] Status check response (attempt 1): { status: 'processing', message: 'success', pollTime: '150ms', ... }

⏳ [tryon_1234567890_abc123] Still processing (attempt 1)...

📊 [tryon_1234567890_abc123] Polling attempt 15/90 (30s elapsed)
🎉 [tryon_1234567890_abc123] Try-on completed successfully on attempt 15! { totalTime: '30s', totalAttempts: 15 }
```

#### **Completion & Cleanup**
```javascript
🎉 [tryon_1234567890_abc123] Try-on completed successfully! { tryOnId: 'tryon_456', finalStatus: 'done', totalProcessingTime: '45s', ... }
🧹 [tryon_1234567890_abc123] Cleaning up temporary files...
✅ [tryon_1234567890_abc123] Temporary file deleted successfully: uploads/virtual-tryon/userPhoto-1234567890.jpg
✅ [tryon_1234567890_abc123] Sending success response: {...}
🏁 [tryon_1234567890_abc123] ===== VIRTUAL TRY-ON REQUEST COMPLETED =====
🏁 [tryon_1234567890_abc123] Total time: 45s
```

### **Helper Functions Logging**

#### **Image Upload to AlphaBake**
```javascript
📤 [upload_human_1234567890_abc12] Starting human image upload to AlphaBake...
🔍 [upload_human_1234567890_abc12] Upload details: { imagePath: '...', type: 'human', fileExists: true, fileSize: 1048576, ... }

🔑 [upload_human_1234567890_abc12] Step 1: Getting pre-signed URL...
🔍 [upload_human_1234567890_abc12] Pre-signed URL response: { status: 200, hasPresignedUrl: true, hasImageId: true, ... }

📖 [upload_human_1234567890_abc12] Step 2: Reading image file...
✅ [upload_human_1234567890_abc12] Image file read successfully: { bufferSize: 1048576, filePath: '...' }

📤 [upload_human_1234567890_abc12] Step 3: Uploading image to AlphaBake...
✅ [upload_human_1234567890_abc12] human image upload completed successfully: { imageId: 'human_123', imageUrl: '...', totalTime: '2500ms' }
```

#### **Try-On Request Creation**
```javascript
🎯 [tryon_req_1234567890_abc12] Creating try-on request...
🔍 [tryon_req_1234567890_abc12] Request parameters: { humanId: 'human_123', garmentUrl: '...', garmentType: 'top', ... }
✅ [tryon_req_1234567890_abc12] Try-on request created successfully: { status: 200, statusText: 'OK', responseTime: '800ms', ... }
```

#### **Status Checking**
```javascript
📊 [status_1234567890_abc12] Checking try-on status...
🔍 [status_1234567890_abc12] Status check details: { tryOnId: 'tryon_456', apiEndpoint: '...', requestBody: {...} }
✅ [status_1234567890_abc12] Status check completed: { status: 200, statusText: 'OK', responseTime: '200ms', ... }
```

### **Error Handling & Recovery**
```javascript
❌ [tryon_1234567890_abc123] ===== VIRTUAL TRY-ON ERROR =====
❌ [tryon_1234567890_abc123] Error occurred after 25s
❌ [tryon_1234567890_abc123] Error details: { message: 'Try-on failed: Invalid garment URL', stack: '...', name: 'Error', ... }
❌ [tryon_1234567890_abc123] Request context: { productId: 'prod_123', productImage: '...', productCategory: 'Kurta', ... }

🧹 [tryon_1234567890_abc123] Attempting to clean up file on error...
✅ [tryon_1234567890_abc123] Error cleanup: File deleted successfully

❌ [tryon_1234567890_abc123] Sending error response: {...}
🏁 [tryon_1234567890_abc123] ===== VIRTUAL TRY-ON REQUEST FAILED =====
```

## 🌐 **Frontend Logging**

### **Service Layer (`VirtualTryOnService`)**

#### **Process Try-On**
```javascript
🔍 [frontend_1234567890_abc12] ===== FRONTEND TRY-ON REQUEST STARTED =====
🔍 [frontend_1234567890_abc12] Timestamp: 2025-01-06T10:30:00.000Z
🔍 [frontend_1234567890_abc12] API Base URL: http://localhost:5001/api
🔍 [frontend_1234567890_abc12] Input parameters: { productId: 'prod_123', productImage: '...', productCategory: 'Kurta', ... }

🔍 [frontend_1234567890_abc12] Step 1: Creating form data...
🔍 [frontend_1234567890_abc12] Form data created: { hasUserPhoto: true, hasProductId: true, hasProductImage: true, ... }

🔍 [frontend_1234567890_abc12] Step 2: Making API call to /virtual-tryon/process...
🔍 [frontend_1234567890_abc12] API response received in 2500ms: { status: 200, statusText: 'OK', ok: true, ... }

🔍 [frontend_1234567890_abc12] Step 3: Parsing response...
✅ [frontend_1234567890_abc12] API call completed successfully in 3000ms: { responseData: {...}, totalTime: '3000ms' }
🏁 [frontend_1234567890_abc12] ===== FRONTEND TRY-ON REQUEST COMPLETED =====
```

#### **Status Checking**
```javascript
🔍 [status_1234567890_abc12] ===== FRONTEND STATUS CHECK REQUEST =====
🔍 [status_1234567890_abc12] Timestamp: 2025-01-06T10:30:00.000Z
🔍 [status_1234567890_abc12] Checking status for tryOnId: tryon_456
🔍 [status_1234567890_abc12] API Base URL: http://localhost:5001/api

🔍 [status_1234567890_abc12] API response received in 200ms: { status: 200, statusText: 'OK', ok: true, ... }
✅ [status_1234567890_abc12] Status check completed successfully in 250ms: { responseData: {...}, totalTime: '250ms' }
```

#### **Polling Process**
```javascript
🔍 [poll_1234567890_abc12] ===== FRONTEND POLLING STARTED =====
🔍 [poll_1234567890_abc12] Polling configuration: { tryOnId: 'tryon_456', maxAttempts: 90, pollInterval: 2000, ... }

🚀 [poll_1234567890_abc12] Starting first poll...

📊 [poll_1234567890_abc12] Polling attempt 1/90 (2s elapsed)
📊 [poll_1234567890_abc12] Progress update: 1.1% (attempt 1)
📊 [poll_1234567890_abc12] Status response (attempt 1): { status: 'processing', message: 'success', pollTime: '180ms', ... }
⏳ [poll_1234567890_abc12] Still processing (attempt 1)...
⏳ [poll_1234567890_abc12] Continuing to poll... (89 attempts remaining)

📊 [poll_1234567890_abc12] Polling attempt 15/90 (30s elapsed)
📊 [poll_1234567890_abc12] Progress update: 16.7% (attempt 15)
🎉 [poll_1234567890_abc12] Try-on completed successfully on attempt 15! { totalTime: '30s', totalAttempts: 15 }
```

### **Modal Component (`VirtualTryOnModal`)**

#### **File Upload**
```javascript
🔍 [upload_1234567890_abc12] ===== FILE UPLOAD HANDLER =====
🔍 [upload_1234567890_abc12] Event details: { type: 'change', target: 'INPUT', filesCount: 1 }
🔍 [upload_1234567890_abc12] File selected: { name: 'photo.jpg', size: 1048576, type: 'image/jpeg', ... }

🔍 [upload_1234567890_abc12] Validating file...
✅ [upload_1234567890_abc12] File validation passed, creating FileReader...

✅ [upload_1234567890_abc12] FileReader completed successfully: { resultLength: 1398101, resultType: 'string' }
✅ [upload_1234567890_abc12] File uploaded successfully, step changed to 'preview'
```

#### **Camera Operations**
```javascript
🔍 [camera_1234567890_abc12] ===== CAMERA START REQUESTED =====
🔍 [camera_1234567890_abc12] Camera configuration: { facingMode: 'user', idealWidth: 1280, idealHeight: 720, ... }

🔍 [camera_1234567890_abc12] Requesting camera access...
✅ [camera_1234567890_abc12] Camera access granted: { streamId: 'stream_123', tracks: [{ kind: 'video', enabled: true, ... }] }
✅ [camera_1234567890_abc12] Video element updated with stream
✅ [camera_1234567890_abc12] Camera started successfully, showCamera=true
```

#### **Photo Capture**
```javascript
🔍 [capture_1234567890_abc12] ===== PHOTO CAPTURE REQUESTED =====
🔍 [capture_1234567890_abc12] Ref availability: { hasVideoRef: true, hasCanvasRef: true }

🔍 [capture_1234567890_abc12] Video element details: { videoWidth: 1280, videoHeight: 720, readyState: 4, ... }
🔍 [capture_1234567890_abc12] Canvas configured: { width: 1280, height: 720, aspectRatio: '1.78' }

🔍 [capture_1234567890_abc12] Drawing video frame to canvas...
✅ [capture_1234567890_abc12] Video frame drawn to canvas

🔍 [capture_1234567890_abc12] Converting canvas to blob...
✅ [capture_1234567890_abc12] Blob created successfully: { size: 1048576, type: 'image/jpeg', sizeInKB: '1024.00' }
✅ [capture_1234567890_abc12] File created from blob: { name: 'camera-photo.jpg', size: 1048576, ... }
✅ [capture_1234567890_abc12] Photo captured successfully, step changed to 'preview'
🏁 [capture_1234567890_abc12] ===== PHOTO CAPTURE COMPLETED =====
```

#### **Try-On Processing**
```javascript
🔍 [modal_1234567890_abc12] ===== MODAL TRY-ON PROCESS STARTED =====
🔍 [modal_1234567890_abc12] Timestamp: 2025-01-06T10:30:00.000Z
🔍 [modal_1234567890_abc12] Modal state: { step: 'preview', hasUserPhoto: true, hasProduct: true, ... }

🔍 [modal_1234567890_abc12] Input validation passed: { productName: 'Kurta', productId: 'prod_123', ... }

🔍 [modal_1234567890_abc12] Step 1: Validating and optimizing image...
✅ [modal_1234567890_abc12] Image validation passed

🔍 [modal_1234567890_abc12] Step 2: Resizing image if needed...
✅ [modal_1234567890_abc12] Image optimization completed in 500ms: { originalSize: 1048576, optimizedSize: 524288, sizeReduction: '50.0%' }

🔍 [modal_1234567890_abc12] Step 3: Getting processing estimates...
🔍 [modal_1234567890_abc12] Processing estimates: { processingTime: {...}, cost: {...}, mode: 'fast' }

🚀 [modal_1234567890_abc12] Starting virtual try-on process...

🔍 [modal_1234567890_abc12] Step 4: Starting progress updates...
🔍 [modal_1234567890_abc12] Step 5: Calling VirtualTryOnService.processTryOn...
🔍 [modal_1234567890_abc12] Service call completed in 3000ms: { result: {...}, serviceTime: '3000ms' }

✅ [modal_1234567890_abc12] Try-on completed successfully in 3500ms: { result: {...}, totalTime: '3500ms' }
🏁 [modal_1234567890_abc12] ===== MODAL TRY-ON PROCESS COMPLETED =====
```

### **Image Processing Functions**

#### **Validation**
```javascript
🔍 [validation_1234567890_abc12] ===== IMAGE VALIDATION STARTED =====
🔍 [validation_1234567890_abc12] File details: { name: 'photo.jpg', size: 1048576, type: 'image/jpeg', ... }

🔍 [validation_1234567890_abc12] Validation results: { validations: [...], totalErrors: 0, isValid: true }
✅ [validation_1234567890_abc12] Image validation passed
🏁 [validation_1234567890_abc12] ===== IMAGE VALIDATION COMPLETED =====
```

#### **Resizing**
```javascript
🔍 [resize_1234567890_abc12] ===== IMAGE RESIZING STARTED =====
🔍 [resize_1234567890_abc12] Input file: { name: 'photo.jpg', size: 1048576, type: 'image/jpeg', ... }
🔍 [resize_1234567890_abc12] Resize limits: { maxWidth: 2048, maxHeight: 2048 }

🔍 [resize_1234567890_abc12] Image loaded: { originalWidth: 4096, originalHeight: 3072, aspectRatio: '1.33' }

🔍 [resize_1234567890_abc12] Resizing calculation: { originalDimensions: {...}, newDimensions: {...}, reason: 'Width exceeded limit (4096 > 2048)', ... }
🔍 [resize_1234567890_abc12] Canvas created and image drawn: { canvasWidth: 2048, canvasHeight: 1536 }

✅ [resize_1234567890_abc12] Image resized successfully: { originalSize: 1048576, resizedSize: 524288, sizeReduction: '50.0%', ... }
🏁 [resize_1234567890_abc12] ===== IMAGE RESIZING COMPLETED =====
```

## 🚨 **Error Tracking & Debugging**

### **Common Error Scenarios**

#### **API Key Missing**
```javascript
❌ [tryon_1234567890_abc123] ALPHABAKE_API_KEY is not configured
```

#### **File Upload Issues**
```javascript
❌ [upload_human_1234567890_abc12] Failed to read image file: { error: 'ENOENT: no such file or directory', filePath: '...' }
❌ [upload_human_1234567890_abc12] Upload failed with status 400: { statusText: 'Bad Request', responseData: {...} }
```

#### **Try-On Processing Failures**
```javascript
❌ [tryon_1234567890_abc123] Try-on failed on attempt 15: { status: 'failed', message: 'Invalid garment URL', ... }
❌ [tryon_1234567890_abc123] Max polling attempts reached (90) after 180s
```

#### **Frontend Errors**
```javascript
❌ [frontend_1234567890_abc12] API call failed with status 500
❌ [frontend_1234567890_abc12] Error response data: { message: 'Virtual try-on service is not configured', ... }
```

### **Performance Monitoring**

#### **Response Times**
- **Backend API calls**: Track AlphaBake API response times
- **File operations**: Monitor upload/download speeds
- **Processing times**: Measure try-on completion duration
- **Frontend operations**: Track user interaction response times

#### **Resource Usage**
- **Memory consumption**: Monitor file processing memory usage
- **File sizes**: Track original vs. optimized image sizes
- **API credits**: Monitor AlphaBake API usage

## 📋 **Log Analysis Tips**

### **1. Track Complete Workflows**
Use request IDs to follow operations from start to finish:
```bash
# Search for all logs related to a specific try-on request
grep "tryon_1234567890_abc123" logs/backend.log
```

### **2. Monitor Performance Bottlenecks**
Look for operations with long durations:
```bash
# Find operations taking longer than 5 seconds
grep "totalTime.*[5-9][0-9][0-9][0-9]ms" logs/backend.log
```

### **3. Error Pattern Analysis**
Identify common failure points:
```bash
# Count error types
grep "❌.*Error occurred" logs/backend.log | awk '{print $4}' | sort | uniq -c
```

### **4. API Performance Monitoring**
Track AlphaBake API response times:
```bash
# Monitor API call durations
grep "API response received in" logs/backend.log | awk '{print $NF}' | sort -n
```

## 🔧 **Configuration & Customization**

### **Log Level Control**
Set environment variables to control logging verbosity:
```bash
# Backend
NODE_ENV=development  # Full logging with stack traces
NODE_ENV=production   # Minimal logging for performance

# Frontend
REACT_APP_LOG_LEVEL=debug  # Full logging
REACT_APP_LOG_LEVEL=error  # Errors only
```

### **Log Storage**
- **Backend**: Console output (can be redirected to files)
- **Frontend**: Browser console (can be captured with browser dev tools)
- **Production**: Consider integrating with logging services (Winston, Bunyan)

### **Custom Logging**
Add custom logging for specific business logic:
```javascript
// Example: Log user engagement metrics
console.log(`📊 [${requestId}] User engagement:`, {
  timeSpent: Date.now() - startTime,
  stepsCompleted: currentStep,
  userActions: userActionLog
});
```

## 🎯 **Benefits of Enhanced Logging**

### **1. **Debugging & Troubleshooting**
- **Quick Issue Identification**: Unique IDs make it easy to trace problems
- **Detailed Error Context**: Full error information with stack traces
- **Step-by-step Tracking**: See exactly where operations fail

### **2. **Performance Monitoring**
- **Response Time Analysis**: Identify slow operations
- **Resource Usage Tracking**: Monitor memory and file size optimization
- **API Performance**: Track external service response times

### **3. **User Experience Insights**
- **Workflow Analysis**: Understand user interaction patterns
- **Error Recovery**: See how users handle failures
- **Success Rates**: Track completion rates and common failure points

### **4. **Development & Testing**
- **Integration Testing**: Verify API interactions work correctly
- **Regression Detection**: Identify when performance degrades
- **Feature Validation**: Ensure new features work as expected

## 🚀 **Next Steps**

### **1. **Production Deployment**
- Configure appropriate log levels for production
- Set up log aggregation and monitoring
- Implement log rotation and retention policies

### **2. **Advanced Monitoring**
- Integrate with application performance monitoring (APM) tools
- Set up alerts for critical errors and performance issues
- Create dashboards for real-time monitoring

### **3. **Analytics Integration**
- Track user engagement metrics
- Monitor feature usage patterns
- Analyze performance trends over time

---

This enhanced logging system provides comprehensive visibility into the Virtual Try-On functionality, enabling developers to quickly identify and resolve issues while monitoring system performance and user experience.

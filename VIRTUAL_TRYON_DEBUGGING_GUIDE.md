# Virtual Try-On Debugging Guide

## Overview
This guide helps troubleshoot the "Try-on request creation failed: Request failed with status code 400" error and other Virtual Try-On issues.

## Quick Debug Steps

### 1. Check Browser Console
Open Developer Tools (F12) and look for detailed error logs with the format:
```
🔍 [modal_xxx] ===== MODAL TRY-ON PROCESS STARTED =====
❌ [modal_xxx] ===== MODAL TRY-ON PROCESS FAILED =====
```

### 2. Use Debug Panel (Development Mode)
In development mode, you'll see a yellow debug panel in the top-right corner with:
- **🔧 Debug Cart** - Test cart functionality
- **🔍 Debug Try-On** - Log current state
- **🏥 Health Check** - Test API connectivity

### 3. Enhanced Error Display
When an error occurs, the modal now shows:
- Detailed error message
- Current step and state
- Product and photo information
- Debug actions for troubleshooting

## Common Issues & Solutions

### Issue 1: 400 Bad Request Error
**Symptoms**: "Request failed with status code 400"

**Possible Causes**:
1. **Missing Product Image**: Product has no images or invalid image URLs
2. **Invalid Product Data**: Missing product ID or category
3. **File Upload Issues**: Photo file is corrupted or too large
4. **API Configuration**: Backend service not properly configured

**Debug Steps**:
1. Check browser console for detailed error logs
2. Verify product has valid images in `product.images[0]`
3. Ensure photo file is under 2MB and is JPG/PNG
4. Test API health endpoint: `GET /api/virtual-tryon/health`

### Issue 2: AlphaBake API Errors
**Symptoms**: "Try-on request creation failed"

**Possible Causes**:
1. **Invalid API Key**: `ALPHABAKE_API_KEY` not set or expired
2. **Network Issues**: Cannot reach AlphaBake API
3. **Rate Limiting**: API quota exceeded
4. **Invalid Request Format**: Wrong parameters sent to AlphaBake

**Debug Steps**:
1. Check backend logs for AlphaBake API responses
2. Verify API key in `.env` file
3. Test AlphaBake connectivity from backend
4. Check request format in backend logs

### Issue 3: File Upload Failures
**Symptoms**: "User photo is required" or file validation errors

**Possible Causes**:
1. **File Size**: Exceeds 2MB limit
2. **File Type**: Not JPG/PNG
3. **Upload Directory**: Backend upload directory not writable
4. **Multer Configuration**: File upload middleware issues

**Debug Steps**:
1. Check file size and type in browser console
2. Verify backend upload directory permissions
3. Check multer configuration in backend
4. Test with smaller test images

## Debug Commands

### Frontend Debug
```javascript
// Log current state
console.log('🔍 [DEBUG] Modal State:', {
  step,
  userPhoto,
  product,
  error
});

// Test API health
fetch('http://localhost:5001/api/virtual-tryon/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Backend Debug
```bash
# Check backend logs
tail -f backend/logs/app.log

# Test virtual try-on endpoint
curl -X POST http://localhost:5001/api/virtual-tryon/health

# Check environment variables
echo $ALPHABAKE_API_KEY
```

## Enhanced Error Handling

### Frontend Error Extraction
The frontend now provides detailed error information:
- **HTTP Status Codes**: Specific error codes from backend
- **Error Messages**: Detailed error descriptions
- **Request IDs**: Backend request identifiers for tracking
- **Processing Times**: How long the request took before failing

### Backend Error Logging
Backend provides comprehensive logging:
- **Request Tracking**: Unique IDs for each request
- **Step-by-step Logging**: Detailed progress through each phase
- **Error Context**: Full error details with stack traces
- **Request Data**: All input parameters and file information

## Testing Workflow

### 1. Basic Health Check
```bash
curl http://localhost:5001/api/virtual-tryon/health
```
Expected: `{"success": true, "message": "Virtual try-on service is running"}`

### 2. Test with Sample Data
```bash
curl -X POST http://localhost:5001/api/virtual-tryon/process \
  -F "userPhoto=@test-image.jpg" \
  -F "productId=test123" \
  -F "productImage=https://example.com/test.jpg" \
  -F "productCategory=shirt"
```

### 3. Monitor Backend Logs
Look for detailed request tracking:
```
🔍 [tryon_xxx] ===== VIRTUAL TRY-ON REQUEST STARTED =====
📤 [tryon_xxx] Step 1: Uploading user photo to AlphaBake...
🎯 [tryon_xxx] Step 2: Creating try-on request...
⏳ [tryon_xxx] Step 3: Polling for try-on completion...
```

## Environment Configuration

### Required Environment Variables
```bash
# Backend .env
ALPHABAKE_API_KEY=your_api_key_here
NODE_ENV=development

# Frontend .env
REACT_APP_API_URL=http://localhost:5001/api
NODE_ENV=development
```

### API Endpoints
- **Health Check**: `GET /api/virtual-tryon/health`
- **Process Try-On**: `POST /api/virtual-tryon/process`
- **Check Status**: `POST /api/virtual-tryon/status`
- **Get History**: `GET /api/virtual-tryon/history/:userId`

## Performance Monitoring

### Frontend Metrics
- **Image Validation Time**: How long validation takes
- **Image Optimization Time**: Resizing and compression time
- **API Call Duration**: Time for backend communication
- **Total Processing Time**: End-to-end try-on time

### Backend Metrics
- **File Upload Time**: Time to process uploaded photos
- **AlphaBake API Time**: External API response times
- **Polling Attempts**: Number of status checks needed
- **Memory Usage**: Resource consumption during processing

## Troubleshooting Checklist

- [ ] Browser console shows detailed error logs
- [ ] Backend logs show request tracking
- [ ] API health endpoint responds successfully
- [ ] Product has valid image URLs
- [ ] Photo file meets size/type requirements
- [ ] AlphaBake API key is valid
- [ ] Backend upload directory is writable
- [ ] Network connectivity to AlphaBake API
- [ ] Environment variables are properly set
- [ ] Backend service is running and accessible

## Getting Help

If issues persist after following this guide:

1. **Collect Debug Information**:
   - Browser console logs
   - Backend server logs
   - Network tab requests
   - Error screenshots

2. **Test with Minimal Setup**:
   - Use small test images (< 1MB)
   - Test with simple product data
   - Verify basic API connectivity

3. **Check Recent Changes**:
   - Recent code modifications
   - Environment variable changes
   - API key updates
   - Service restarts

## Common Error Messages

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| "User photo is required" | File upload failed | Check file size/type, backend logs |
| "Product information is required" | Missing product data | Verify product object has required fields |
| "Try-on request creation failed" | AlphaBake API error | Check API key, network, backend logs |
| "Request failed with status code 400" | Bad request format | Verify all required parameters are sent |
| "Human ID not found" | **AlphaBake timing issue** | **Fixed with retry mechanism and delay** |
| "Try-on processing timed out" | AlphaBake processing slow | Check AlphaBake service status |
| "Failed to upload image to AlphaBake" | Network/API issues | Verify AlphaBake connectivity |

## Specific Fix for "Human ID not found" Error

This error occurs when AlphaBake hasn't finished processing the uploaded human image before we try to create a try-on request. The comprehensive fix includes:

1. **Fixed Image ID Extraction**: AlphaBake returns `key` field, not `human_id`
2. **Added 2-second delay** after image upload before creating try-on request
3. **Human ID Verification**: Check if the uploaded image exists before creating try-on request
4. **Retry mechanism** with exponential backoff (3 attempts)
5. **Better error handling** to extract specific AlphaBake error messages
6. **Enhanced logging** to track the exact human ID being used

### Test the Fix
Run the AlphaBake integration tests:
```bash
cd backend

# Basic integration test
node test-alphabake-integration.js

# Full flow test (uploads actual image)
node test-full-alphabake-flow.js
```

### Key Findings from Testing
- ✅ AlphaBake API is working correctly
- ✅ Pre-signed URL generation works
- ✅ Image upload to AlphaBake works
- ❌ Human ID verification endpoint may not exist or work as expected
- ❌ Try-on request creation fails with "Human ID not found"

### Alternative Approach
If the verification endpoint doesn't work, we can:
1. Increase the delay between upload and try-on request (5-10 seconds)
2. Implement a polling mechanism to check when the image is ready
3. Use a different AlphaBake API endpoint if available

This debugging guide should help identify and resolve most Virtual Try-On issues. Always check the browser console and backend logs first for detailed error information.

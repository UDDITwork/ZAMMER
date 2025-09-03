# Virtual Try-On Feature Implementation

## Overview

The Virtual Try-On feature allows customers to visualize how clothing products will look on them by uploading their photo and using AI-powered image processing. This feature integrates with AlphaBake's Virtual Try-On API to provide realistic try-on results.

## Features

- **Photo Upload**: Users can upload photos from their device
- **Camera Capture**: Built-in camera functionality for taking new photos
- **Image Optimization**: Automatic image resizing and validation
- **Real-time Processing**: Progress tracking during AI processing
- **Side-by-side Comparison**: Original photo vs. try-on result
- **Download Results**: Save try-on images for later reference

## Technical Architecture

### Frontend Components

1. **VirtualTryOnModal** (`frontend/src/components/common/VirtualTryOnModal.js`)
   - Main modal component for the try-on experience
   - Handles photo upload, camera capture, and result display
   - Multi-step workflow: Upload → Preview → Processing → Result

2. **VirtualTryOnService** (`frontend/src/services/virtualTryOnService.js`)
   - Service layer for API communication
   - Image validation and optimization
   - Progress polling and status checking

### Backend API

1. **Virtual Try-On Routes** (`backend/routes/virtualTryOnRoutes.js`)
   - `/api/virtual-tryon/process` - Process try-on requests
   - `/api/virtual-tryon/status` - Check try-on status
   - `/api/virtual-tryon/history/:userId` - Get user's try-on history
   - `/api/virtual-tryon/health` - Health check endpoint

2. **AlphaBake Integration**
   - User photo upload to AlphaBake service (temporary local storage)
   - Product image usage via direct Cloudinary URLs (no re-upload needed)
   - Try-on request creation and monitoring
   - Result retrieval and processing

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env` file:

```bash
# AlphaBake API Configuration
ALPHABAKE_API_KEY=your_alphabake_api_key_here
```

### 2. API Key Setup

1. Sign up at [https://api.alphabake.io/](https://api.alphabake.io/)
2. Wait for admin activation
3. Get your API key from the dashboard
4. Add the key to your environment variables

### 3. Dependencies

The required dependencies are already included in the project:
- `axios` - HTTP client for API calls
- `multer` - File upload handling
- `fs` - File system operations

### 4. Backend Setup

1. The virtual try-on routes are automatically registered in `app.js`
2. Create the uploads directory: `mkdir -p backend/uploads/virtual-tryon`
   - This directory is used only for temporary storage of user-uploaded photos
   - Product images are fetched directly from Cloudinary URLs
   - Files are automatically cleaned up after processing
3. Ensure proper file permissions for uploads

### 5. Frontend Setup

1. The VirtualTryOnModal component is imported and used in:
   - `ProductDetailPage.js` - Full product view with try-on button
   - `ProductListPage.js` - Product grid with try-on button

## Usage

### For Users

1. **Navigate to a Product**
   - Go to any product detail page or product listing
   - Click the "Try On" button (👗)

2. **Upload Your Photo**
   - Choose between camera capture or file upload
   - Ensure the photo shows your full body for best results
   - Photo requirements: <2MB, max 2048x2048 pixels

3. **Review and Process**
   - Preview your photo alongside the product
   - Click "Start Virtual Try-On"
   - Wait for AI processing (typically 10-180 seconds)

4. **View Results**
   - See side-by-side comparison
   - Download your try-on result
   - Try with different photos if desired

### For Developers

#### Adding Try-On to New Components

```javascript
import VirtualTryOnModal from '../../components/common/VirtualTryOnModal';

// Add state
const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
const [selectedProduct, setSelectedProduct] = useState(null);

// Add button
<button onClick={() => setShowVirtualTryOn(true)}>
  Try On
</button>

// Add modal
<VirtualTryOnModal
  isOpen={showVirtualTryOn}
  onClose={() => setShowVirtualTryOn(false)}
  product={selectedProduct}
  onTryOnComplete={(result) => {
    console.log('Try-on completed:', result);
  }}
/>
```

#### Customizing Try-On Behavior

```javascript
// Custom validation
const customValidation = (file) => {
  // Add your custom validation logic
  return VirtualTryOnService.validateImageFile(file);
};

// Custom processing options
const processOptions = {
  mode: 'quality', // 'fast' or 'quality'
  garmentGuidance: 0.7,
  retainPose: false
};
```

## API Endpoints

### Process Try-On

```http
POST /api/virtual-tryon/process
Content-Type: multipart/form-data

Form Data:
- userPhoto: Image file (required)
- productId: String (required)
- productImage: String URL (required)
- productCategory: String (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "Virtual try-on completed successfully",
  "data": {
    "tryOnId": "3ce17258-c53d-4b08-b3cd-cfa4a2fb58d8-T1896",
    "imageUrl": "https://s3.amazonaws.com/...",
    "processingTime": 45,
    "creditsUsed": 1
  }
}
```

### Check Status

```http
POST /api/virtual-tryon/status
Content-Type: application/json

{
  "tryOnId": "3ce17258-c53d-4b08-b3cd-cfa4a2fb58d8-T1896"
}
```

### Health Check

```http
GET /api/virtual-tryon/health
```

## Configuration Options

### AlphaBake API Parameters

- **Mode**: `fast` (5s, 1 credit) or `quality` (10s, 2 credits)
- **Garment Type**: `top`, `bottom`, or `full`
- **Garment Guidance**: 0.0 to 1.0 (default: 0.5)
- **Human Zoom**: `true` or `false` (default: `true`)
- **Retain Pose**: `true` or `false` (default: `true`)

### Processing Limits

- **File Size**: Maximum 2MB
- **Image Resolution**: Maximum 2048x2048 pixels
- **Supported Formats**: JPG, JPEG, PNG
- **Processing Time**: 10-180 seconds (typically 30-60 seconds)

## Cost Structure

- **Fast Mode**: 1 credit = $0.03 USD
- **Quality Mode**: 2 credits = $0.06 USD
- **Offline Mode**: 35% discount available

## Error Handling

### Common Errors

1. **Missing API Key**
   ```
   Error: Virtual try-on service is not configured
   Solution: Add ALPHABAKE_API_KEY to environment variables
   ```

2. **Invalid Image**
   ```
   Error: Image size must be less than 2MB
   Solution: Compress or resize the image
   ```

3. **Processing Timeout**
   ```
   Error: Try-on processing timed out
   Solution: Retry with a smaller image or check API status
   ```

### Error Recovery

- Automatic file cleanup on errors
- User-friendly error messages
- Retry functionality for failed attempts
- Fallback options for camera issues

## Testing

### Backend Testing

Run the test script to verify API functionality:

```bash
cd backend
node test-virtual-tryon.js
```

### Frontend Testing

1. Test photo upload with various file types
2. Verify camera functionality on mobile devices
3. Test error scenarios (large files, invalid formats)
4. Verify progress tracking and completion

### Integration Testing

1. Test complete try-on workflow
2. Verify AlphaBake API integration
3. Test error handling and recovery
4. Performance testing with various image sizes

## Performance Considerations

### Optimization Strategies

1. **Image Resizing**: Client-side resizing before upload
2. **Progressive Loading**: Show progress during processing
3. **Caching**: Cache try-on results for repeated requests
4. **Compression**: Optimize image quality vs. file size

### Monitoring

- Track processing times
- Monitor API usage and costs
- Log error rates and types
- User engagement metrics

## Security Considerations

1. **File Validation**: Strict file type and size validation
2. **Upload Limits**: Enforce maximum file sizes
3. **API Key Protection**: Secure storage of AlphaBake credentials
4. **User Privacy**: Temporary storage of user photos
5. **Rate Limiting**: Prevent abuse of try-on service

## Future Enhancements

### Planned Features

1. **Try-On History**: Save and manage previous try-ons
2. **Batch Processing**: Try multiple products simultaneously
3. **Advanced Filters**: Pose, lighting, and style adjustments
4. **Social Sharing**: Share try-on results on social media
5. **AR Integration**: Real-time camera overlay

### Technical Improvements

1. **WebSocket Updates**: Real-time progress updates
2. **Image Compression**: Advanced compression algorithms
3. **CDN Integration**: Faster image delivery
4. **Analytics Dashboard**: Detailed usage insights

## Support and Troubleshooting

### Common Issues

1. **Camera Not Working**
   - Check browser permissions
   - Ensure HTTPS in production
   - Test on different devices

2. **Slow Processing**
   - Use smaller images
   - Check AlphaBake service status
   - Verify network connectivity

3. **Upload Failures**
   - Check file size and format
   - Verify backend storage permissions
   - Check API endpoint configuration

### Getting Help

- Check the AlphaBake API documentation
- Review server logs for detailed error information
- Test with the provided test scripts
- Contact support for persistent issues

## Conclusion

The Virtual Try-On feature significantly enhances the user experience by allowing customers to visualize products before purchase. The implementation provides a robust, scalable solution with proper error handling, user feedback, and performance optimization.

By following this documentation, developers can successfully integrate and customize the virtual try-on functionality for their specific needs.

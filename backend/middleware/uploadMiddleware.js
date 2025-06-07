const multer = require('multer');

// 🎯 IMPORTANT: Use memory storage for Cloudinary uploads
// No need to save files to disk since we're uploading to Cloudinary
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  console.log(`📁 File upload attempt: ${file.originalname} (${file.mimetype})`);
  
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    console.log(`✅ Image accepted: ${file.originalname}`);
    cb(null, true);
  } else {
    console.log(`❌ Invalid file type: ${file.mimetype}`);
    const error = new Error('Only image files are allowed');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  console.error('📁 Multer Error:', error);
  
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.',
          error: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 10 files.',
          error: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.',
          error: 'UNEXPECTED_FILE'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error.',
          error: error.code
        });
    }
  }
  
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  // Pass other errors to the next error handler
  next(error);
};

// Logging middleware for upload operations
const logUploadOperation = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (req.files && req.files.length > 0) {
      console.log(`📁 Upload operation completed:`, {
        fileCount: req.files.length,
        totalSize: req.files.reduce((total, file) => total + file.size, 0),
        files: req.files.map(f => ({ 
          name: f.originalname, 
          size: f.size, 
          type: f.mimetype 
        }))
      });
    }
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  upload,
  handleMulterError,
  logUploadOperation
};
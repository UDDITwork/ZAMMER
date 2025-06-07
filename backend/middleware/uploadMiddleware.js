const multer = require('multer');
const path = require('path');
const { uploadToCloudinary } = require('../utils/cloudinary');

// Setup multer for memory storage (for Cloudinary)
const storage = multer.memoryStorage();

// Check file type
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images only!');
  }
}

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // 1MB limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

// Middleware to handle Cloudinary upload
const handleCloudinaryUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary
    const result = await uploadToCloudinary(dataURI, 'zammer');
    
    // Replace file path with Cloudinary URL
    req.file.path = result.url;
    req.file.public_id = result.public_id;

    next();
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file to Cloudinary',
      error: error.message
    });
  }
};

module.exports = { upload, handleCloudinaryUpload };
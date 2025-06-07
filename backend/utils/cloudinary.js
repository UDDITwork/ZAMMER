const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file to Cloudinary
 * @param {string} file - Base64 encoded file or file path
 * @param {string} folder - Cloudinary folder to upload to
 * @returns {Promise<Object>} - Cloudinary upload response
 */
exports.uploadToCloudinary = async (file, folder = 'zammer') => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true
    });
    
    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the file
 * @returns {Promise<Object>} - Cloudinary delete response
 */
exports.deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
}; 
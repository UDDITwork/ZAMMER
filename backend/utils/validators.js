const { validationResult } = require('express-validator');

/**
 * Validate product data
 * @param {Object} data - Product data to validate
 * @returns {Object} - Validation result with errors if any
 */
exports.validateProductData = (data) => {
  const errors = [];

  // Required fields
  const requiredFields = ['name', 'category', 'subCategory', 'productCategory', 'zammerPrice', 'mrp', 'variants', 'images'];
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push({ field, message: `${field} is required` });
    }
  });

  // Price validation
  if (data.mrp && data.zammerPrice && Number(data.mrp) < Number(data.zammerPrice)) {
    errors.push({
      field: 'mrp',
      message: 'MRP must be greater than or equal to Zammer Price'
    });
  }

  // Images validation
  if (data.images && (!Array.isArray(data.images) || data.images.length === 0)) {
    errors.push({
      field: 'images',
      message: 'At least one product image is required'
    });
  }

  // Variants validation
  if (data.variants && (!Array.isArray(data.variants) || data.variants.length === 0)) {
    errors.push({
      field: 'variants',
      message: 'At least one variant is required'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Handle validation errors from express-validator
 * @param {Object} req - Express request object
 * @returns {Object} - Validation result with errors if any
 */
exports.handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return {
      isValid: false,
      errors: errors.array()
    };
  }
  return { isValid: true, errors: [] };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether phone number is valid
 */
exports.isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
}; 
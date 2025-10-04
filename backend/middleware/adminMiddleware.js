const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Enhanced error logging
const logAuthError = (context, error, additionalInfo = {}) => {
  console.error(`❌ [${context}] Admin Auth Error:`, {
    message: error.message,
    stack: error.stack,
    ...additionalInfo
  });
};

// Protect routes for admin
exports.protectAdmin = async (req, res, next) => {
  try {
    let token;

    console.log('🔐 [AdminAuth] Starting authentication check...');

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📋 [AdminAuth] Token found in Authorization header');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('📋 [AdminAuth] Token found in cookies');
    }

    if (!token) {
      console.log('❌ [AdminAuth] No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access denied. Admin authentication required.',
        code: 'NO_ADMIN_TOKEN'
      });
    }

    console.log('🔍 [AdminAuth] Token found, verifying...');

    // 🎯 CRITICAL FIX: Use same secret logic as token generation
    const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    console.log('🔧 [AdminAuth] Using JWT secret for verification (length:', jwtSecret?.length, ')');

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
      console.log('✅ [AdminAuth] Token verification successful:', { adminId: decoded.id });
    } catch (jwtError) {
      logAuthError('AdminAuth', jwtError, { 
        tokenLength: token.length,
        secretUsed: jwtSecret ? 'present' : 'missing',
        secretLength: jwtSecret?.length
      });
      
      let message = 'Invalid admin token';
      if (jwtError.name === 'TokenExpiredError') {
        message = 'Admin session has expired. Please login again.';
      } else if (jwtError.name === 'JsonWebTokenError') {
        message = 'Invalid admin token format. Please login again.';
      }

      return res.status(401).json({
        success: false,
        message,
        code: 'INVALID_ADMIN_TOKEN',
        error: jwtError.message
      });
    }

    // Get admin from the token
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      console.log('❌ [AdminAuth] Admin not found:', { adminId: decoded.id });
      return res.status(401).json({
        success: false,
        message: 'Admin account not found. Please contact super admin.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      console.log('❌ [AdminAuth] Admin account is inactive:', { adminId: decoded.id });
      return res.status(401).json({
        success: false,
        message: 'Admin account is inactive. Please contact super admin.',
        code: 'ADMIN_INACTIVE'
      });
    }

    console.log('✅ [AdminAuth] Authentication successful:', { 
      adminId: admin._id,
      adminName: admin.name,
      adminRole: admin.role
    });

    req.admin = admin;
    next();
  } catch (error) {
    logAuthError('AdminAuth', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin authentication',
      code: 'ADMIN_AUTH_SERVER_ERROR'
    });
  }
};

// Check specific permissions
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication required'
        });
      }

      // Super admin has all permissions
      if (req.admin.role === 'super_admin') {
        return next();
      }

      // Check specific permission
      if (!req.admin.permissions || !req.admin.permissions[permission]) {
        console.log('❌ [AdminAuth] Permission denied:', { 
          adminId: req.admin._id,
          permission,
          adminPermissions: req.admin.permissions
        });
        
        return res.status(403).json({
          success: false,
          message: `Access denied. Permission required: ${permission}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      console.log('✅ [AdminAuth] Permission granted:', { 
        adminId: req.admin._id,
        permission
      });

      next();
    } catch (error) {
      logAuthError('AdminPermissionCheck', error, { permission });
      res.status(500).json({
        success: false,
        message: 'Server error during permission check',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

module.exports = {
  protectAdmin: exports.protectAdmin
};
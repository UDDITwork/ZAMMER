const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller');
const User = require('../models/User');

// Enhanced error logging
const logAuthError = (context, error, additionalInfo = {}) => {
  console.error(`❌ [${context}] Auth Error:`, {
    message: error.message,
    stack: error.stack,
    ...additionalInfo
  });
};

// Protect routes for sellers
exports.protectSeller = async (req, res, next) => {
  try {
    let token;

    console.log('🔐 [SellerAuth] Starting authentication check...');

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📋 [SellerAuth] Token found in Authorization header');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('📋 [SellerAuth] Token found in cookies');
    }

    if (!token) {
      console.log('❌ [SellerAuth] No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    console.log('🔍 [SellerAuth] Token found, verifying...');

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ [SellerAuth] Token verification successful:', { sellerId: decoded.id });
    } catch (jwtError) {
      logAuthError('SellerAuth', jwtError, { tokenLength: token.length });
      
      let message = 'Invalid token';
      if (jwtError.name === 'TokenExpiredError') {
        message = 'Token has expired. Please login again.';
      } else if (jwtError.name === 'JsonWebTokenError') {
        message = 'Invalid token format. Please login again.';
      }

      return res.status(401).json({
        success: false,
        message,
        code: 'INVALID_TOKEN',
        error: jwtError.message
      });
    }

    // Get seller from the token
    const seller = await Seller.findById(decoded.id).select('-password');
    
    if (!seller) {
      console.log('❌ [SellerAuth] Seller not found:', { sellerId: decoded.id });
      return res.status(401).json({
        success: false,
        message: 'Seller account not found. Please contact support.',
        code: 'SELLER_NOT_FOUND'
      });
    }

    console.log('✅ [SellerAuth] Authentication successful:', { 
      sellerId: seller._id,
      sellerName: seller.firstName 
    });

    req.seller = seller;
    next();
  } catch (error) {
    logAuthError('SellerAuth', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

// Protect routes for users
exports.protectUser = async (req, res, next) => {
  try {
    let token;

    console.log('🔐 [UserAuth] Starting authentication check...');

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📋 [UserAuth] Token found in Authorization header');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('📋 [UserAuth] Token found in cookies');
    }

    if (!token) {
      console.log('❌ [UserAuth] No token provided');
      return res.status(401).json({
        success: false,
        message: 'Please login to access this feature',
        code: 'NO_TOKEN',
        requiresAuth: true
      });
    }

    console.log('🔍 [UserAuth] Token found, verifying...', {
      tokenLength: token.length,
      tokenPreview: `${token.substring(0, 20)}...`
    });

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ [UserAuth] Token verification successful:', { userId: decoded.id });
    } catch (jwtError) {
      logAuthError('UserAuth', jwtError, { 
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...`
      });
      
      let message = 'Invalid token. Please login again.';
      let code = 'INVALID_TOKEN';
      
      if (jwtError.name === 'TokenExpiredError') {
        message = 'Your session has expired. Please login again.';
        code = 'TOKEN_EXPIRED';
      } else if (jwtError.name === 'JsonWebTokenError') {
        message = 'Invalid token format. Please login again.';
        code = 'MALFORMED_TOKEN';
      }

      return res.status(401).json({
        success: false,
        message,
        code,
        error: jwtError.message,
        requiresAuth: true
      });
    }

    // Get user from the token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('❌ [UserAuth] User not found:', { userId: decoded.id });
      return res.status(401).json({
        success: false,
        message: 'User account not found. Please contact support.',
        code: 'USER_NOT_FOUND',
        requiresAuth: true
      });
    }

    console.log('✅ [UserAuth] Authentication successful:', { 
      userId: user._id,
      userName: user.name,
      userEmail: user.email
    });

    req.user = user;
    next();
  } catch (error) {
    logAuthError('UserAuth', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

// Optional authentication for public routes
exports.optionalUserAuth = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // If no token, continue as unauthenticated user
    if (!token) {
      req.isAuthenticated = false;
      console.log('📝 [OptionalAuth] No token provided, continuing as guest');
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        req.isAuthenticated = false;
        console.log('📝 [OptionalAuth] User not found, continuing as guest');
        return next();
      }

      req.user = user;
      req.isAuthenticated = true;
      console.log('✅ [OptionalAuth] User authenticated:', { userName: user.name });
      next();
    } catch (error) {
      // If token verification fails, continue as unauthenticated
      console.log('📝 [OptionalAuth] Token verification failed, continuing as guest:', error.message);
      req.isAuthenticated = false;
      next();
    }
  } catch (error) {
    console.error('❌ [OptionalAuth] Error in optional auth middleware:', error);
    req.isAuthenticated = false;
    next();
  }
};
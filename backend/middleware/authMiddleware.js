const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller');
const User = require('../models/User');
const Admin = require('../models/Admin'); // 🆕
const DeliveryAgent = require('../models/DeliveryAgent'); // 🆕

// Enhanced error logging
const logAuthError = (context, error, additionalInfo = {}) => {
  console.error(`❌ [${context}] Auth Error:`, {
    message: error.message,
    stack: error.stack,
    ...additionalInfo
  });
};

// Protect routes for sellers (existing)
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

// Protect routes for users (existing)
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
        message: 'User session invalid. Please login again.',
        code: 'USER_NOT_FOUND',
        requiresAuth: true,
        forceLogout: true
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

// 🆕 Protect routes for admins
exports.protectAdmin = async (req, res, next) => {
  try {
    let token;

    console.log('🔐 [AdminAuth] Starting authentication check...');

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📋 [AdminAuth] Token found in Authorization header');
    } else if (req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
      console.log('📋 [AdminAuth] Token found in cookies');
    }

    if (!token) {
      console.log('❌ [AdminAuth] No token provided');
      return res.status(401).json({
        success: false,
        message: 'Admin access denied. No token provided.',
        code: 'NO_ADMIN_TOKEN'
      });
    }

    console.log('🔍 [AdminAuth] Token found, verifying...');

    // Verify token with admin secret (if different) or regular secret
    let decoded;
    try {
      const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
      decoded = jwt.verify(token, jwtSecret);
      console.log('✅ [AdminAuth] Token verification successful:', { adminId: decoded.id });
    } catch (jwtError) {
      logAuthError('AdminAuth', jwtError, { tokenLength: token.length });
      
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
        message: 'Admin account not found or deactivated.',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      console.log('❌ [AdminAuth] Admin account deactivated:', { adminId: admin._id });
      return res.status(401).json({
        success: false,
        message: 'Admin account has been deactivated.',
        code: 'ADMIN_DEACTIVATED'
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

// 🆕 Protect routes for delivery agents
exports.protectDeliveryAgent = async (req, res, next) => {
  try {
    let token;

    console.log('🔐 [DeliveryAgentAuth] Starting authentication check...');

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📋 [DeliveryAgentAuth] Token found in Authorization header');
    } else if (req.cookies && req.cookies.deliveryToken) {
      token = req.cookies.deliveryToken;
      console.log('📋 [DeliveryAgentAuth] Token found in cookies');
    }

    if (!token) {
      console.log('❌ [DeliveryAgentAuth] No token provided');
      return res.status(401).json({
        success: false,
        message: 'Delivery agent access denied. Please login.',
        code: 'NO_DELIVERY_TOKEN',
        requiresAuth: true
      });
    }

    console.log('🔍 [DeliveryAgentAuth] Token found, verifying...');

    // Verify token with delivery agent secret (if different) or regular secret
    let decoded;
    try {
      const jwtSecret = process.env.DELIVERY_AGENT_JWT_SECRET || process.env.JWT_SECRET;
      decoded = jwt.verify(token, jwtSecret);
      console.log('✅ [DeliveryAgentAuth] Token verification successful:', { agentId: decoded.id });
    } catch (jwtError) {
      logAuthError('DeliveryAgentAuth', jwtError, { tokenLength: token.length });
      
      let message = 'Invalid delivery agent token';
      let code = 'INVALID_DELIVERY_TOKEN';
      
      if (jwtError.name === 'TokenExpiredError') {
        message = 'Delivery agent session has expired. Please login again.';
        code = 'DELIVERY_TOKEN_EXPIRED';
      } else if (jwtError.name === 'JsonWebTokenError') {
        message = 'Invalid delivery agent token format. Please login again.';
        code = 'MALFORMED_DELIVERY_TOKEN';
      }

      return res.status(401).json({
        success: false,
        message,
        code,
        error: jwtError.message,
        requiresAuth: true
      });
    }

    // Get delivery agent from the token
    const deliveryAgent = await DeliveryAgent.findById(decoded.id).select('-password -resetPasswordToken');
    
    if (!deliveryAgent) {
      console.log('❌ [DeliveryAgentAuth] Delivery agent not found:', { agentId: decoded.id });
      return res.status(401).json({
        success: false,
        message: 'Delivery agent account not found.',
        code: 'DELIVERY_AGENT_NOT_FOUND',
        requiresAuth: true
      });
    }

    // Check if delivery agent is blocked
    if (deliveryAgent.isBlocked) {
      console.log('❌ [DeliveryAgentAuth] Delivery agent blocked:', { 
        agentId: deliveryAgent._id,
        reason: deliveryAgent.blockReason 
      });
      return res.status(403).json({
        success: false,
        message: `Account has been blocked. Reason: ${deliveryAgent.blockReason}`,
        code: 'DELIVERY_AGENT_BLOCKED'
      });
    }

    // Update last active time
    deliveryAgent.lastActiveAt = new Date();
    await deliveryAgent.save();

    console.log('✅ [DeliveryAgentAuth] Authentication successful:', { 
      agentId: deliveryAgent._id,
      agentName: deliveryAgent.name,
      isOnline: deliveryAgent.isOnline,
      isAvailable: deliveryAgent.isAvailable
    });

    req.deliveryAgent = deliveryAgent;
    next();
  } catch (error) {
    logAuthError('DeliveryAgentAuth', error);
    res.status(500).json({
      success: false,
      message: 'Server error during delivery agent authentication',
      code: 'DELIVERY_AGENT_AUTH_SERVER_ERROR'
    });
  }
};

// Optional authentication for public routes (existing)
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

// 🆕 Multi-role authentication (can be user, seller, admin, or delivery agent)
exports.protectMultiRole = (allowedRoles = ['user', 'seller', 'admin', 'delivery']) => {
  return async (req, res, next) => {
    try {
      let token;
      let decoded;
      let authenticatedUser = null;
      let userRole = null;

      console.log('🔐 [MultiRoleAuth] Starting authentication check for roles:', allowedRoles);

      // Check if token exists in headers
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies) {
        // Check different token types in cookies
        token = req.cookies.token || req.cookies.adminToken || req.cookies.deliveryToken;
      }

      if (!token) {
        console.log('❌ [MultiRoleAuth] No token provided');
        return res.status(401).json({
          success: false,
          message: 'Access denied. Please login.',
          code: 'NO_TOKEN',
          requiresAuth: true
        });
      }

      // Try to verify with different secrets
      const secrets = [
        process.env.JWT_SECRET,
        process.env.ADMIN_JWT_SECRET,
        process.env.DELIVERY_AGENT_JWT_SECRET
      ].filter(Boolean);

      for (const secret of secrets) {
        try {
          decoded = jwt.verify(token, secret);
          break;
        } catch (jwtError) {
          // Continue to next secret
          continue;
        }
      }

      if (!decoded) {
        console.log('❌ [MultiRoleAuth] Token verification failed with all secrets');
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          code: 'INVALID_TOKEN',
          requiresAuth: true
        });
      }

      // Try to find user in different collections
      if (allowedRoles.includes('user')) {
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          authenticatedUser = user;
          userRole = 'user';
          req.user = user;
        }
      }

      if (!authenticatedUser && allowedRoles.includes('seller')) {
        const seller = await Seller.findById(decoded.id).select('-password');
        if (seller) {
          authenticatedUser = seller;
          userRole = 'seller';
          req.seller = seller;
        }
      }

      if (!authenticatedUser && allowedRoles.includes('admin')) {
        const admin = await Admin.findById(decoded.id).select('-password');
        if (admin && admin.isActive) {
          authenticatedUser = admin;
          userRole = 'admin';
          req.admin = admin;
        }
      }

      if (!authenticatedUser && allowedRoles.includes('delivery')) {
        const deliveryAgent = await DeliveryAgent.findById(decoded.id).select('-password');
        if (deliveryAgent && !deliveryAgent.isBlocked) {
          authenticatedUser = deliveryAgent;
          userRole = 'delivery';
          req.deliveryAgent = deliveryAgent;
        }
      }

      if (!authenticatedUser) {
        console.log('❌ [MultiRoleAuth] User not found in any collection:', { userId: decoded.id });
        return res.status(401).json({
          success: false,
          message: 'Account not found or access denied.',
          code: 'USER_NOT_FOUND',
          requiresAuth: true
        });
      }

      console.log('✅ [MultiRoleAuth] Authentication successful:', {
        userId: authenticatedUser._id,
        userName: authenticatedUser.name || authenticatedUser.firstName,
        role: userRole
      });

      req.userRole = userRole;
      req.authenticatedUser = authenticatedUser;
      next();
    } catch (error) {
      logAuthError('MultiRoleAuth', error);
      res.status(500).json({
        success: false,
        message: 'Server error during authentication',
        code: 'AUTH_SERVER_ERROR'
      });
    }
  };
};
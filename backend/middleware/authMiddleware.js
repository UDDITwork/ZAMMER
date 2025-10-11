// File: /backend/middleware/authMiddleware.js - Enhanced with optionalUserAuth

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Seller = require('../models/Seller');
const DeliveryAgent = require('../models/DeliveryAgent');
const Admin = require('../models/Admin');

// Enhanced logging for auth middleware
const logAuth = (action, data, level = 'info') => {
  const timestamp = new Date().toISOString();
  const logLevels = {
    info: '🔐',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`${logLevels[level]} [AUTH-MIDDLEWARE] ${timestamp} - ${action}`, 
    data ? JSON.stringify(data, null, 2) : '');
};

// Protect User Routes
const protectUser = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        token = req.headers.authorization.split(' ')[1];
        
        logAuth('USER_TOKEN_EXTRACTED', {
          tokenLength: token?.length || 0,
          hasToken: !!token
        });

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        logAuth('USER_TOKEN_VERIFIED', {
          userId: decoded.id,
          tokenExp: new Date(decoded.exp * 1000).toISOString()
        });

        // Get user from database
        req.user = await User.findById(decoded.id).select('-password');
        
        if (!req.user) {
          logAuth('USER_NOT_FOUND_IN_DB', { userId: decoded.id }, 'error');
          return res.status(401).json({
            success: false,
            message: 'User not found'
          });
        }

        logAuth('USER_AUTH_SUCCESS', {
          userId: req.user._id,
          userName: req.user.name,
          hasLocation: !!req.user.location?.coordinates?.length
        }, 'success');

        next();
      } catch (error) {
        logAuth('USER_TOKEN_ERROR', {
          error: error.message,
          tokenProvided: !!token
        }, 'error');
        
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token failed'
        });
      }
    } else {
      logAuth('NO_USER_TOKEN_PROVIDED', null, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
  } catch (error) {
    logAuth('USER_PROTECT_ERROR', { error: error.message }, 'error');
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// 🎯 CRITICAL: Optional User Auth - for endpoints that work with or without auth
const optionalUserAuth = async (req, res, next) => {
  try {
    let token;

    // Get token from header (optional)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        token = req.headers.authorization.split(' ')[1];
        
        logAuth('OPTIONAL_USER_TOKEN_FOUND', {
          tokenLength: token?.length || 0
        });

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        req.user = await User.findById(decoded.id).select('-password');
        
        if (req.user) {
          logAuth('OPTIONAL_USER_AUTH_SUCCESS', {
            userId: req.user._id,
            userName: req.user.name,
            hasLocation: !!req.user.location?.coordinates?.length
          }, 'success');
        } else {
          logAuth('OPTIONAL_USER_NOT_FOUND', { userId: decoded.id }, 'warning');
          req.user = null;
        }

      } catch (error) {
        logAuth('OPTIONAL_USER_TOKEN_INVALID', {
          error: error.message
        }, 'warning');
        req.user = null;
      }
    } else {
      logAuth('OPTIONAL_USER_NO_TOKEN', null, 'info');
      req.user = null;
    }

    // Always continue to next middleware (token is optional)
    next();
  } catch (error) {
    logAuth('OPTIONAL_USER_AUTH_ERROR', { error: error.message }, 'error');
    req.user = null;
    next();
  }
};

// Protect Seller Routes
const protectSeller = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        token = req.headers.authorization.split(' ')[1];
        
        logAuth('SELLER_TOKEN_EXTRACTED', {
          tokenLength: token?.length || 0
        });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.seller = await Seller.findById(decoded.id).select('-password');
        
        if (!req.seller) {
          logAuth('SELLER_NOT_FOUND', { sellerId: decoded.id }, 'error');
          return res.status(401).json({
            success: false,
            message: 'Seller not found'
          });
        }

        logAuth('SELLER_AUTH_SUCCESS', {
          sellerId: req.seller._id,
          sellerName: req.seller.firstName
        }, 'success');

        next();
      } catch (error) {
        logAuth('SELLER_TOKEN_ERROR', { error: error.message }, 'error');
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token failed'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
  } catch (error) {
    logAuth('SELLER_PROTECT_ERROR', { error: error.message }, 'error');
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Protect Delivery Agent Routes - FINAL FIXED VERSION
const protectDeliveryAgent = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        token = req.headers.authorization.split(' ')[1];
        
        logAuth('DELIVERY_AGENT_TOKEN_EXTRACTED', {
          tokenLength: token?.length || 0
        });

        // ✅ CRITICAL FIX: Use same secret logic as token generation
        const jwtSecret = process.env.DELIVERY_AGENT_JWT_SECRET || process.env.JWT_SECRET;
        
        logAuth('DELIVERY_AGENT_SECRET_SELECTED', {
          hasDeliverySecret: !!process.env.DELIVERY_AGENT_JWT_SECRET,
          hasMainSecret: !!process.env.JWT_SECRET,
          secretLength: jwtSecret?.length || 0
        });

        const decoded = jwt.verify(token, jwtSecret);
        
        logAuth('DELIVERY_AGENT_TOKEN_VERIFIED', {
          userId: decoded.id,
          userType: decoded.userType,
          tokenExp: new Date(decoded.exp * 1000).toISOString()
        });

        // ✅ Check userType field (optional - token might not have it)
        if (decoded.userType && decoded.userType !== 'deliveryAgent') {
          logAuth('DELIVERY_AGENT_INVALID_USER_TYPE', {
            expectedUserType: 'deliveryAgent',
            actualUserType: decoded.userType,
            userId: decoded.id
          }, 'error');
          
          return res.status(403).json({
            success: false,
            message: 'Access denied. Delivery agent token required.',
            code: 'INVALID_USER_TYPE'
          });
        }
        
        req.deliveryAgent = await DeliveryAgent.findById(decoded.id).select('-password');
        
        if (!req.deliveryAgent) {
          logAuth('DELIVERY_AGENT_NOT_FOUND_IN_DB', { 
            userId: decoded.id 
          }, 'error');
          
          return res.status(401).json({
            success: false,
            message: 'Delivery agent not found'
          });
        }

        // ✅ Check if agent is blocked
        if (req.deliveryAgent.isBlocked) {
          logAuth('DELIVERY_AGENT_BLOCKED', {
            agentId: req.deliveryAgent._id,
            agentEmail: req.deliveryAgent.email
          }, 'error');
          
          return res.status(403).json({
            success: false,
            message: 'Account has been blocked. Please contact support.',
            code: 'ACCOUNT_BLOCKED'
          });
        }

        logAuth('DELIVERY_AGENT_AUTH_SUCCESS', {
          agentId: req.deliveryAgent._id,
          agentName: req.deliveryAgent.name,
          agentEmail: req.deliveryAgent.email,
          isOnline: req.deliveryAgent.isOnline,
          isAvailable: req.deliveryAgent.isAvailable
        }, 'success');

        next();
      } catch (error) {
        logAuth('DELIVERY_AGENT_TOKEN_ERROR', {
          error: error.message,
          tokenProvided: !!token,
          errorType: error.name
        }, 'error');
        
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token failed'
        });
      }
    } else {
      logAuth('NO_DELIVERY_AGENT_TOKEN_PROVIDED', null, 'warning');
      
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
  } catch (error) {
    logAuth('DELIVERY_AGENT_PROTECT_ERROR', { 
      error: error.message 
    }, 'error');
    
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Protect Admin Routes
const protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        token = req.headers.authorization.split(' ')[1];
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.admin = await Admin.findById(decoded.id).select('-password');
        
        if (!req.admin) {
          return res.status(401).json({
            success: false,
            message: 'Admin not found'
          });
        }

        logAuth('ADMIN_AUTH_SUCCESS', {
          adminId: req.admin._id,
          adminEmail: req.admin.email
        }, 'success');

        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token failed'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Generic token validation (for any user type)
const validateToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.tokenValid = true;
        req.decodedToken = decoded;
        
        logAuth('TOKEN_VALIDATION_SUCCESS', {
          userId: decoded.id,
          tokenExp: new Date(decoded.exp * 1000).toISOString()
        }, 'success');
        
        next();
      } catch (error) {
        req.tokenValid = false;
        req.tokenError = error.message;
        
        logAuth('TOKEN_VALIDATION_FAILED', {
          error: error.message
        }, 'warning');
        
        next();
      }
    } else {
      req.tokenValid = false;
      req.tokenError = 'No token provided';
      next();
    }
  } catch (error) {
    req.tokenValid = false;
    req.tokenError = error.message;
    next();
  }
};

// 🎯 NEW: Protect User OR Seller - for routes accessible by both
const protectUserOrSeller = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        token = req.headers.authorization.split(' ')[1];
        
        logAuth('DUAL_AUTH_TOKEN_EXTRACTED', {
          tokenLength: token?.length || 0
        });

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        logAuth('DUAL_AUTH_TOKEN_VERIFIED', {
          decodedId: decoded.id,
          tokenExp: new Date(decoded.exp * 1000).toISOString()
        });

        // Try to find user first
        const user = await User.findById(decoded.id).select('-password');
        
        if (user) {
          req.user = user;
          logAuth('DUAL_AUTH_SUCCESS_AS_USER', {
            userId: user._id,
            userName: user.name
          }, 'success');
          return next();
        }

        // If not user, try seller
        const seller = await Seller.findById(decoded.id).select('-password');
        
        if (seller) {
          req.seller = seller;
          logAuth('DUAL_AUTH_SUCCESS_AS_SELLER', {
            sellerId: seller._id,
            sellerName: seller.firstName
          }, 'success');
          return next();
        }

        // Neither user nor seller found
        logAuth('DUAL_AUTH_NO_ACCOUNT_FOUND', { decodedId: decoded.id }, 'error');
        return res.status(401).json({
          success: false,
          message: 'Account not found'
        });

      } catch (error) {
        logAuth('DUAL_AUTH_TOKEN_ERROR', {
          error: error.message
        }, 'error');
        
        return res.status(401).json({
          success: false,
          message: 'Not authorized, token failed'
        });
      }
    } else {
      logAuth('DUAL_AUTH_NO_TOKEN_PROVIDED', null, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
  } catch (error) {
    logAuth('DUAL_AUTH_ERROR', { error: error.message }, 'error');
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

module.exports = {
  protectUser,
  optionalUserAuth, // 🎯 CRITICAL: Export the missing middleware
  protectSeller,
  protectDeliveryAgent,
  protectAdmin,
  validateToken,
  protectUserOrSeller // 🎯 NEW: Export dual auth middleware
};
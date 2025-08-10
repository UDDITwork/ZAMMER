// File: /backend/middleware/authMiddleware.js - COMPLETE with optionalUserAuth

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Seller = require('../models/Seller');
const DeliveryAgent = require('../models/DeliveryAgent');

// Enhanced logging
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

// User authentication middleware
const protectUser = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      logAuth('USER_AUTH_FAILED', { reason: 'no_token' }, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        logAuth('USER_AUTH_FAILED', { reason: 'user_not_found', userId: decoded.id }, 'warning');
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found'
        });
      }

      req.user = user;
      logAuth('USER_AUTH_SUCCESS', { userId: user._id, email: user.email }, 'success');
      next();
    } catch (error) {
      logAuth('USER_AUTH_FAILED', { reason: 'invalid_token', error: error.message }, 'error');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    logAuth('USER_AUTH_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// 🎯 NEW: Optional user authentication middleware
// Attaches user to request if token is valid, but doesn't fail if no token
const optionalUserAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      logAuth('OPTIONAL_AUTH_NO_TOKEN', null, 'info');
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        logAuth('OPTIONAL_AUTH_USER_NOT_FOUND', { userId: decoded.id }, 'warning');
        req.user = null;
      } else {
        req.user = user;
        logAuth('OPTIONAL_AUTH_SUCCESS', { userId: user._id, email: user.email }, 'success');
      }
    } catch (error) {
      logAuth('OPTIONAL_AUTH_TOKEN_INVALID', { error: error.message }, 'warning');
      req.user = null;
    }

    next();
  } catch (error) {
    logAuth('OPTIONAL_AUTH_ERROR', { error: error.message }, 'error');
    req.user = null;
    next();
  }
};

// Seller authentication middleware
const protectSeller = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      logAuth('SELLER_AUTH_FAILED', { reason: 'no_token' }, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const seller = await Seller.findById(decoded.id).select('-password');
      
      if (!seller) {
        logAuth('SELLER_AUTH_FAILED', { reason: 'seller_not_found', sellerId: decoded.id }, 'warning');
        return res.status(401).json({
          success: false,
          message: 'Not authorized, seller not found'
        });
      }

      req.seller = seller;
      logAuth('SELLER_AUTH_SUCCESS', { sellerId: seller._id, email: seller.email }, 'success');
      next();
    } catch (error) {
      logAuth('SELLER_AUTH_FAILED', { reason: 'invalid_token', error: error.message }, 'error');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    logAuth('SELLER_AUTH_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Delivery agent authentication middleware
const protectDeliveryAgent = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      logAuth('DELIVERY_AUTH_FAILED', { reason: 'no_token' }, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const deliveryAgent = await DeliveryAgent.findById(decoded.id).select('-password');
      
      if (!deliveryAgent) {
        logAuth('DELIVERY_AUTH_FAILED', { reason: 'agent_not_found', agentId: decoded.id }, 'warning');
        return res.status(401).json({
          success: false,
          message: 'Not authorized, delivery agent not found'
        });
      }

      req.deliveryAgent = deliveryAgent;
      logAuth('DELIVERY_AUTH_SUCCESS', { agentId: deliveryAgent._id, email: deliveryAgent.email }, 'success');
      next();
    } catch (error) {
      logAuth('DELIVERY_AUTH_FAILED', { reason: 'invalid_token', error: error.message }, 'error');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    logAuth('DELIVERY_AUTH_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Admin authentication middleware
const protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      logAuth('ADMIN_AUTH_FAILED', { reason: 'no_token' }, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if it's a valid admin token
      if (decoded.role !== 'admin') {
        logAuth('ADMIN_AUTH_FAILED', { reason: 'not_admin', userId: decoded.id }, 'warning');
        return res.status(403).json({
          success: false,
          message: 'Not authorized, admin access required'
        });
      }

      req.admin = decoded;
      logAuth('ADMIN_AUTH_SUCCESS', { adminId: decoded.id }, 'success');
      next();
    } catch (error) {
      logAuth('ADMIN_AUTH_FAILED', { reason: 'invalid_token', error: error.message }, 'error');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    logAuth('ADMIN_AUTH_ERROR', { error: error.message }, 'error');
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

module.exports = {
  protectUser,
  optionalUserAuth,
  protectSeller,
  protectDeliveryAgent,
  protectAdmin
};
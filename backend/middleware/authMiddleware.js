const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller');
const User = require('../models/User');

// Protect routes for sellers
exports.protectSeller = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get seller from the token
    const seller = await Seller.findById(decoded.id).select('-password');
    
    if (!seller) {
      return res.status(401).json({
        success: false,
        message: 'Seller not found'
      });
    }

    req.seller = seller;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error.message
    });
  }
};

// Protect routes for users
exports.protectUser = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error.message
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
      return next();
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        req.isAuthenticated = false;
        return next();
      }

      req.user = user;
      req.isAuthenticated = true;
      next();
    } catch (error) {
      // If token verification fails, continue as unauthenticated
      console.log('Token verification failed:', error.message);
      req.isAuthenticated = false;
      next();
    }
  } catch (error) {
    console.error('Error in optional auth middleware:', error);
    req.isAuthenticated = false;
    next();
  }
};
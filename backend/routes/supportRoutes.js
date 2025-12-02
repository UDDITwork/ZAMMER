const express = require('express');
const router = express.Router();
const {
  createTicket,
  getUserTickets,
  getTicket,
  addMessage,
  getCategories
} = require('../controllers/supportController');
const { protectUser, protectSeller, protectDeliveryAgent } = require('../middleware/authMiddleware');

// Custom middleware that checks token and sets appropriate user object
const protectAnyUser = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Try to find user in each model
      const User = require('../models/User');
      const Seller = require('../models/Seller');
      const DeliveryAgent = require('../models/DeliveryAgent');
      
      // Check buyer
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        return next();
      }
      
      // Check seller
      const seller = await Seller.findById(decoded.id).select('-password');
      if (seller) {
        req.seller = seller;
        return next();
      }
      
      // Check delivery agent
      const agent = await DeliveryAgent.findById(decoded.id).select('-password');
      if (agent) {
        req.deliveryAgent = agent;
        return next();
      }
      
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * @route   POST /api/support/tickets
 * @desc    Create ticket (protected by userType-specific middleware)
 * @access  Private
 * 
 * Note: We need to read body first to determine userType, then apply appropriate auth
 * This is handled by using protectAnyUser which checks all user types
 */
router.post('/tickets', protectAnyUser, createTicket);

/**
 * @route   GET /api/support/tickets
 * @desc    Get user's tickets
 * @access  Private
 */
router.get('/tickets', protectAnyUser, getUserTickets);

/**
 * @route   GET /api/support/tickets/:ticketId
 * @desc    Get single ticket
 * @access  Private
 */
router.get('/tickets/:ticketId', protectAnyUser, getTicket);

/**
 * @route   POST /api/support/tickets/:ticketId/messages
 * @desc    Add message to ticket
 * @access  Private
 */
router.post('/tickets/:ticketId/messages', protectAnyUser, addMessage);

/**
 * @route   GET /api/support/categories/:userType
 * @desc    Get categories for user type
 * @access  Public
 */
router.get('/categories/:userType', getCategories);

module.exports = router;


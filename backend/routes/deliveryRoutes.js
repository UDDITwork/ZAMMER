// backend/routes/deliveryRoutes.js - Delivery Agent API Routes

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import delivery agent controller
const {
  registerDeliveryAgent,
  loginDeliveryAgent,
  getDeliveryAgentProfile,
  updateDeliveryAgentProfile,
  getAvailableOrders,
  acceptOrder,
  bulkAcceptOrders,
  bulkRejectOrders,
  markReachedSellerLocation,
  completePickup,
  markReachedLocation,
  completeDelivery,
  updateLocation,
  getAssignedOrders,
  getDeliveryStats,
  toggleAvailability,
  getDeliveryHistory,
  logoutDeliveryAgent,
  rejectOrder,
  getOrderNotifications
} = require('../controllers/deliveryAgentController');

// Import middleware
const { protectDeliveryAgent } = require('../middleware/authMiddleware');

// ⬇️ YE LINES ADD करें - OTHER ROUTES से पहले
router.get('/test-direct-stats', (req, res) => {
  console.log('🔥 DIRECT STATS TEST ROUTE HIT');
  res.json({ 
    message: 'Direct stats route working',
    timestamp: new Date().toISOString()
  });
});

router.get('/test-direct-assigned', (req, res) => {
  console.log('🔥 DIRECT ASSIGNED TEST ROUTE HIT');
  res.json({ 
    message: 'Direct assigned route working', 
    timestamp: new Date().toISOString()
  });
});

// 🔥 TEST ROUTE - Add this test route at the top
router.get('/test-functions', (req, res) => {
  const controller = require('../controllers/deliveryAgentController');
  
  res.json({
    message: 'Testing controller functions',
    availableFunctions: Object.keys(controller),
    hasGetDeliveryStats: typeof controller.getDeliveryStats === 'function',
    hasGetAssignedOrders: typeof controller.getAssignedOrders === 'function',
    timestamp: new Date().toISOString()
  });
});

// 🎯 VALIDATION RULES

// Registration validation
const registrationValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2-50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number')
    .custom((value, { req }) => {
      req.body.mobileNumber = value;  // Map to mobileNumber
      return true;
    }),
  body('vehicleType')
    .custom((value) => {
      // ✅ FIXED: Accept all common frontend vehicle type variations
      const validTypes = [
        // Frontend values (now updated to match model enum)
        'Bicycle', 'bicycle',
        'Motorcycle', 'motorcycle',
        'Scooter', 'scooter', 
        'Car', 'car',
        'Van', 'van'
      ];
      
      if (!validTypes.includes(value)) {
        throw new Error('Vehicle type must be Bicycle, Motorcycle, Scooter, Car, or Van');
      }
      return true;
    })
    .withMessage('Vehicle type must be Bicycle, Motorcycle, Scooter, Car, or Van'),
  body('vehicleRegistration')
    .notEmpty()
    .withMessage('Vehicle registration number is required'),
  body('licenseNumber')
    .notEmpty()
    .withMessage('License number is required')
];

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Order pickup validation
const pickupValidation = [
  body('orderIdVerification')
    .notEmpty()
    .withMessage('Order ID verification is required'),
  body('pickupNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Pickup notes cannot exceed 500 characters'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array of [longitude, latitude]')
];

// Delivery completion validation
const deliveryValidation = [
  body('otp')
    .optional()
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP must be 4-6 digits'),
  body('deliveryNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Delivery notes cannot exceed 500 characters'),
  body('recipientName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Recipient name must be between 2-50 characters'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array of [longitude, latitude]'),
  body('codPayment.amount')
    .optional()
    .isNumeric()
    .withMessage('COD payment amount must be a number')
];

// Location update validation
const locationValidation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

// 🎯 AUTHENTICATION ROUTES

// @desc    Register new delivery agent
// @route   POST /api/delivery/register
// @access  Public
router.post('/register', registrationValidation, registerDeliveryAgent);

// @desc    Login delivery agent
// @route   POST /api/delivery/login
// @access  Public
router.post('/login', loginValidation, loginDeliveryAgent);

// @desc    Logout delivery agent
// @route   POST /api/delivery/logout
// @access  Private (Delivery Agent)
router.post('/logout', protectDeliveryAgent, logoutDeliveryAgent);

// 🎯 PROFILE ROUTES

// @desc    Get delivery agent profile
// @route   GET /api/delivery/profile
// @access  Private (Delivery Agent)
router.get('/profile', protectDeliveryAgent, getDeliveryAgentProfile);

// @desc    Update delivery agent profile
// @route   PUT /api/delivery/profile
// @access  Private (Delivery Agent)
router.put('/profile', protectDeliveryAgent, updateDeliveryAgentProfile);

// 🎯 ORDER MANAGEMENT ROUTES

// @desc    Get available orders for pickup
// @route   GET /api/delivery/orders/available
// @access  Private (Delivery Agent)
router.get('/orders/available', protectDeliveryAgent, getAvailableOrders);

// @desc    Get assigned orders
// @route   GET /api/delivery/orders/assigned
// @access  Private (Delivery Agent)
router.get('/orders/assigned', protectDeliveryAgent, getAssignedOrders);

// @desc    Accept order for delivery
// @route   PUT /api/delivery/orders/:id/accept
// @access  Private (Delivery Agent)
router.put('/orders/:id/accept', protectDeliveryAgent, acceptOrder);

// @desc    Bulk accept multiple orders
// @route   POST /api/delivery/orders/bulk-accept
// @access  Private (Delivery Agent)
router.post('/orders/bulk-accept', [
  protectDeliveryAgent,
  body('orderIds')
    .isArray({ min: 1 })
    .withMessage('Order IDs must be a non-empty array'),
  body('orderIds.*')
    .isMongoId()
    .withMessage('Each order ID must be a valid MongoDB ObjectId')
], bulkAcceptOrders);

// @desc    Bulk reject multiple orders
// @route   POST /api/delivery/orders/bulk-reject
// @access  Private (Delivery Agent)
router.post('/orders/bulk-reject', [
  protectDeliveryAgent,
  body('orderIds')
    .isArray({ min: 1 })
    .withMessage('Order IDs must be a non-empty array'),
  body('orderIds.*')
    .isMongoId()
    .withMessage('Each order ID must be a valid MongoDB ObjectId'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
], bulkRejectOrders);

// @desc    Reject assigned order
// @route   PUT /api/delivery/orders/:id/reject
// @access  Private (Delivery Agent)
router.put('/orders/:id/reject', protectDeliveryAgent, rejectOrder);

// @desc    Get order notifications
// @route   GET /api/delivery/notifications
// @access  Private (Delivery Agent)
router.get('/notifications', protectDeliveryAgent, getOrderNotifications);

// @desc    Complete order pickup
// @desc    Mark delivery agent as reached seller location
// @route   PUT /api/delivery/orders/:id/reached-seller-location
// @access  Private (Delivery Agent)
router.put('/orders/:id/reached-seller-location', protectDeliveryAgent, markReachedSellerLocation);

// @route   PUT /api/delivery/orders/:id/pickup
// @access  Private (Delivery Agent)
router.put('/orders/:id/pickup', protectDeliveryAgent, pickupValidation, completePickup);

// @desc    Mark delivery agent as reached customer location
// @route   PUT /api/delivery/orders/:id/reached-location
// @access  Private (Delivery Agent)
router.put('/orders/:id/reached-location', [
  protectDeliveryAgent,
  body('locationNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Location notes cannot exceed 500 characters')
], markReachedLocation);

// @desc    Complete order delivery
// @route   PUT /api/delivery/orders/:id/deliver
// @access  Private (Delivery Agent)
router.put('/orders/:id/deliver', protectDeliveryAgent, deliveryValidation, completeDelivery);

// 🎯 TRACKING & STATUS ROUTES

// @desc    Update delivery agent location
// @route   PUT /api/delivery/location
// @access  Private (Delivery Agent)
router.put('/location', protectDeliveryAgent, locationValidation, updateLocation);

// @desc    Toggle availability status
// @route   PUT /api/delivery/availability
// @access  Private (Delivery Agent)
router.put('/availability', protectDeliveryAgent, toggleAvailability);

// 🎯 STATISTICS & HISTORY ROUTES

// @desc    Get delivery agent statistics
// @route   GET /api/delivery/stats
// @access  Private (Delivery Agent)
router.get('/stats', protectDeliveryAgent, getDeliveryStats);

// @desc    Get delivery history
// @route   GET /api/delivery/history
// @access  Private (Delivery Agent)
router.get('/history', protectDeliveryAgent, getDeliveryHistory);

// 🎯 HEALTH CHECK ROUTE
// @desc    Check delivery service health
// @route   GET /api/delivery/health
// @access  Public
router.get('/health', async (req, res) => {
  try {
    const DeliveryAgent = require('../models/DeliveryAgent');
    
    // Count active agents
    const activeAgents = await DeliveryAgent.countDocuments({
      isOnline: true,
      isAvailable: true,
      isBlocked: false
    });

    const totalAgents = await DeliveryAgent.countDocuments({
      isBlocked: false
    });

    res.status(200).json({
      success: true,
      service: 'deliveryRoutes',
      timestamp: new Date().toISOString(),
      stats: {
        activeAgents,
        totalAgents,
        utilization: totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0
      },
      routes: {
        register: 'POST /api/delivery/register',
        login: 'POST /api/delivery/login',
        logout: 'POST /api/delivery/logout',
        profile: 'GET /api/delivery/profile',
        updateProfile: 'PUT /api/delivery/profile',
        availableOrders: 'GET /api/delivery/orders/available',
        assignedOrders: 'GET /api/delivery/orders/assigned',
        acceptOrder: 'PUT /api/delivery/orders/:id/accept',
        completePickup: 'PUT /api/delivery/orders/:id/pickup',
        markReachedLocation: 'PUT /api/delivery/orders/:id/reached-location',
        completeDelivery: 'PUT /api/delivery/orders/:id/deliver',
        updateLocation: 'PUT /api/delivery/location',
        toggleAvailability: 'PUT /api/delivery/availability',
        stats: 'GET /api/delivery/stats',
        history: 'GET /api/delivery/history'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'deliveryRoutes',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 ERROR HANDLING MIDDLEWARE
router.use((error, req, res, next) => {
  console.error('❌ [DeliveryRoutes] Error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Delivery service error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
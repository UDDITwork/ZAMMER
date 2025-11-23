// backend/routes/returnRoutes.js - Order Return Management Routes

const express = require('express');
const router = express.Router();

// Import controllers
const {
  getReturnEligibility,
  requestReturn,
  getReturnOrders,
  assignReturnAgent,
  handleReturnAssignmentResponse,
  markReturnBuyerArrival,
  completeReturnPickup,
  markReturnSellerArrival,
  completeReturnDelivery,
  completeReturn,
  getDeliveryAgentReturns,
  getReturnStatus,
  markReturnPickupFailed
} = require('../controllers/returnController');

// Import middleware
const { protectUser, optionalUserAuth, protectDeliveryAgent, protectAdmin } = require('../middleware/authMiddleware');
const { protectAdmin: adminMiddleware } = require('../middleware/adminMiddleware');

// 🎯 BUYER ROUTES (Authenticated Users)

// Check if order is eligible for return (24-hour window validation)
router.get('/eligibility/:orderId', 
  optionalUserAuth, 
  getReturnEligibility
);

// Request return for an order
router.post('/request/:orderId', 
  optionalUserAuth, 
  requestReturn
);

// Get return status for an order
router.get('/status/:orderId', 
  optionalUserAuth, 
  getReturnStatus
);

// 🎯 ADMIN ROUTES

// Get all return orders (with optional status filter)
router.get('/admin/dashboard', 
  protectAdmin, 
  adminMiddleware, 
  getReturnOrders
);

// Assign delivery agent to return
router.put('/:returnId/assign', 
  protectAdmin, 
  adminMiddleware, 
  assignReturnAgent
);

// Complete return process (mark as completed)
router.put('/:returnId/complete', 
  protectAdmin, 
  adminMiddleware, 
  completeReturn
);

// 🎯 DELIVERY AGENT ROUTES

// Get delivery agent's return assignments
router.get('/delivery-agent/assignments', 
  protectDeliveryAgent, 
  getDeliveryAgentReturns
);

// Handle return assignment response (accept/reject)
router.put('/:returnId/response', 
  protectDeliveryAgent, 
  handleReturnAssignmentResponse
);

// Mark buyer location reached
router.put('/:returnId/buyer-arrival',
  protectDeliveryAgent,
  markReturnBuyerArrival
);

// Complete return pickup from buyer
router.put('/:returnId/pickup', 
  protectDeliveryAgent, 
  completeReturnPickup
);

// Mark seller location reached & send OTP
router.put('/:returnId/seller-arrival',
  protectDeliveryAgent,
  markReturnSellerArrival
);

// Mark return pickup as failed (buyer not responding)
router.put('/:returnId/pickup-failed', 
  protectDeliveryAgent, 
  markReturnPickupFailed
);

// Complete return delivery to seller
router.put('/:returnId/deliver', 
  protectDeliveryAgent, 
  completeReturnDelivery
);

// 🎯 ROUTE DOCUMENTATION

/**
 * @swagger
 * tags:
 *   name: Returns
 *   description: Order return management system
 */

/**
 * @swagger
 * /api/returns/eligibility/{orderId}:
 *   get:
 *     summary: Check return eligibility for an order
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Return eligibility checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     eligible:
 *                       type: boolean
 *                     reason:
 *                       type: string
 *                     hoursRemaining:
 *                       type: number
 *                     deadline:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/returns/request/{orderId}:
 *   post:
 *     summary: Request return for an order
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Return reason
 *     responses:
 *       200:
 *         description: Return request submitted successfully
 *       400:
 *         description: Bad request or not eligible for return
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/returns/admin/dashboard:
 *   get:
 *     summary: Get all return orders for admin dashboard
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [requested, approved, assigned, accepted, picked_up, returned_to_seller, completed, rejected]
 *         description: Filter by return status
 *     responses:
 *       200:
 *         description: Return orders fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       orderNumber:
 *                         type: string
 *                       user:
 *                         type: object
 *                       seller:
 *                         type: object
 *                       returnDetails:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */

/**
 * @swagger
 * /api/returns/{returnId}/assign:
 *   put:
 *     summary: Assign delivery agent to return
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: returnId
 *         required: true
 *         schema:
 *           type: string
 *         description: Return/Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *             properties:
 *               agentId:
 *                 type: string
 *                 description: Delivery agent ID
 *     responses:
 *       200:
 *         description: Return assigned to delivery agent successfully
 *       400:
 *         description: Bad request or invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Order or agent not found
 */

/**
 * @swagger
 * /api/returns/delivery-agent/assignments:
 *   get:
 *     summary: Get delivery agent's return assignments
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Return assignments fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       orderNumber:
 *                         type: string
 *                       user:
 *                         type: object
 *                       seller:
 *                         type: object
 *                       returnDetails:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Delivery agent access required
 */

/**
 * @swagger
 * /api/returns/{returnId}/response:
 *   put:
 *     summary: Handle return assignment response (accept/reject)
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: returnId
 *         required: true
 *         schema:
 *           type: string
 *         description: Return/Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *                 enum: [accepted, rejected]
 *                 description: Response to return assignment
 *               reason:
 *                 type: string
 *                 description: Reason for rejection (if applicable)
 *     responses:
 *       200:
 *         description: Return assignment response handled successfully
 *       400:
 *         description: Bad request or invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Delivery agent access required or unauthorized
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/returns/{returnId}/pickup:
 *   put:
 *     summary: Complete return pickup from buyer
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: returnId
 *         required: true
 *         schema:
 *           type: string
 *         description: Return/Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *                 description: OTP for verification (optional)
 *               location:
 *                 type: object
 *                 description: Pickup location coordinates
 *               notes:
 *                 type: string
 *                 description: Pickup notes
 *     responses:
 *       200:
 *         description: Return pickup completed successfully
 *       400:
 *         description: Bad request, invalid status, or invalid OTP
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Delivery agent access required or unauthorized
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/returns/{returnId}/deliver:
 *   put:
 *     summary: Complete return delivery to seller
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: returnId
 *         required: true
 *         schema:
 *           type: string
 *         description: Return/Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *                 description: OTP for verification (optional)
 *               location:
 *                 type: object
 *                 description: Delivery location coordinates
 *               notes:
 *                 type: string
 *                 description: Delivery notes
 *     responses:
 *       200:
 *         description: Return delivery completed successfully
 *       400:
 *         description: Bad request, invalid status, or invalid OTP
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Delivery agent access required or unauthorized
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/returns/{returnId}/complete:
 *   put:
 *     summary: Complete return process (admin only)
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: returnId
 *         required: true
 *         schema:
 *           type: string
 *         description: Return/Order ID
 *     responses:
 *       200:
 *         description: Return process completed successfully
 *       400:
 *         description: Bad request or invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /api/returns/status/{orderId}:
 *   get:
 *     summary: Get return status for an order
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Return status fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     returnDetails:
 *                       type: object
 *                     returnWindowInfo:
 *                       type: object
 *                     isReturnEligible:
 *                       type: boolean
 *                     isReturnInProgress:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Unauthorized to view this order
 *       404:
 *         description: Order not found
 */

module.exports = router;

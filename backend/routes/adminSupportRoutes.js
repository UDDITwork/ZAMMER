const express = require('express');
const router = express.Router();
const {
  getAllTickets,
  getTicket,
  assignTicket,
  updateTicketStatus,
  addAdminMessage,
  getAnalytics
} = require('../controllers/adminSupportController');
const { protectAdmin } = require('../middleware/authMiddleware');

// All routes are protected by admin middleware
router.use(protectAdmin);

/**
 * @route   GET /api/admin/support/tickets
 * @desc    Get all tickets (admin)
 * @access  Private (Admin)
 */
router.get('/tickets', getAllTickets);

/**
 * @route   GET /api/admin/support/tickets/:ticketId
 * @desc    Get ticket details (admin)
 * @access  Private (Admin)
 */
router.get('/tickets/:ticketId', getTicket);

/**
 * @route   POST /api/admin/support/tickets/:ticketId/assign
 * @desc    Assign ticket to agent
 * @access  Private (Admin)
 */
router.post('/tickets/:ticketId/assign', assignTicket);

/**
 * @route   PATCH /api/admin/support/tickets/:ticketId/status
 * @desc    Update ticket status
 * @access  Private (Admin)
 */
router.patch('/tickets/:ticketId/status', updateTicketStatus);

/**
 * @route   POST /api/admin/support/tickets/:ticketId/messages
 * @desc    Add admin message to ticket
 * @access  Private (Admin)
 */
router.post('/tickets/:ticketId/messages', addAdminMessage);

/**
 * @route   GET /api/admin/support/analytics
 * @desc    Get support analytics
 * @access  Private (Admin)
 */
router.get('/analytics', getAnalytics);

module.exports = router;


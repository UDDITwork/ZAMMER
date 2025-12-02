const Ticket = require('../models/Ticket');
const TicketMessage = require('../models/TicketMessage');
const SupportCategory = require('../models/SupportCategory');
const User = require('../models/User');
const Seller = require('../models/Seller');
const DeliveryAgent = require('../models/DeliveryAgent');
const { getSLAStatus, getHoursRemaining } = require('../utils/slaCalculator');

/**
 * @desc    Get all tickets (admin)
 * @route   GET /api/admin/support/tickets
 * @access  Private (Admin)
 */
exports.getAllTickets = async (req, res) => {
  try {
    const {
      userType,
      status,
      assignedTo,
      category,
      priority,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};

    if (userType) {
      query.userType = userType;
    }

    if (status) {
      query.status = status;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get tickets with user info
    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('assignedTo', 'name email')
      .lean();

    // Populate user info based on userType
    for (const ticket of tickets) {
      if (ticket.userType === 'buyer') {
        const user = await User.findById(ticket.userId).select('name email mobileNumber').lean();
        ticket.user = user;
      } else if (ticket.userType === 'seller') {
        const seller = await Seller.findById(ticket.userId).select('firstName email mobileNumber shop.name').lean();
        ticket.user = seller;
      } else if (ticket.userType === 'delivery') {
        const agent = await DeliveryAgent.findById(ticket.userId).select('name email mobileNumber').lean();
        ticket.user = agent;
      }

      // Add SLA status
      ticket.slaStatus = getSLAStatus(ticket.slaDeadline);
      ticket.hoursRemaining = getHoursRemaining(ticket.slaDeadline);
    }

    // Get total count
    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
};

/**
 * @desc    Get ticket details (admin)
 * @route   GET /api/admin/support/tickets/:ticketId
 * @access  Private (Admin)
 */
exports.getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Populate user info
    let user;
    if (ticket.userType === 'buyer') {
      user = await User.findById(ticket.userId).select('name email mobileNumber address');
    } else if (ticket.userType === 'seller') {
      user = await Seller.findById(ticket.userId).select('firstName email mobileNumber shop');
    } else if (ticket.userType === 'delivery') {
      user = await DeliveryAgent.findById(ticket.userId).select('name email mobileNumber');
    }

    // Get all messages (including internal)
    const messages = await TicketMessage.find({ ticketId: ticket._id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name firstName email')
      .lean();

    // Add SLA info
    ticket.slaStatus = getSLAStatus(ticket.slaDeadline);
    ticket.hoursRemaining = getHoursRemaining(ticket.slaDeadline);

    res.json({
      success: true,
      data: {
        ticket,
        user,
        messages
      }
    });
  } catch (error) {
    console.error('❌ Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error.message
    });
  }
};

/**
 * @desc    Assign ticket to agent
 * @route   POST /api/admin/support/tickets/:ticketId/assign
 * @access  Private (Admin)
 */
exports.assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'assignedTo is required'
      });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.assignedTo = assignedTo;
    ticket.status = 'assigned';
    ticket.updatedAt = new Date();
    await ticket.save();

    console.log(`✅ Ticket ${ticket.ticketNumber} assigned to ${assignedTo}`);

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: ticket
    });
  } catch (error) {
    console.error('❌ Error assigning ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign ticket',
      error: error.message
    });
  }
};

/**
 * @desc    Update ticket status
 * @route   PATCH /api/admin/support/tickets/:ticketId/status
 * @access  Private (Admin)
 */
exports.updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, resolutionNotes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['open', 'assigned', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // If resolving, require resolution notes
    if (status === 'resolved' && !resolutionNotes) {
      return res.status(400).json({
        success: false,
        message: 'Resolution notes are required when resolving a ticket'
      });
    }

    ticket.status = status;
    ticket.updatedAt = new Date();

    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
      ticket.resolutionNotes = resolutionNotes || '';
    }

    await ticket.save();

    console.log(`✅ Ticket ${ticket.ticketNumber} status updated to ${status}`);

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      data: ticket
    });
  } catch (error) {
    console.error('❌ Error updating ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket status',
      error: error.message
    });
  }
};

/**
 * @desc    Add admin message to ticket
 * @route   POST /api/admin/support/tickets/:ticketId/messages
 * @access  Private (Admin)
 */
exports.addAdminMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, attachments, isInternal } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Create message
    const ticketMessage = await TicketMessage.create({
      ticketId: ticket._id,
      senderType: 'admin',
      senderId: req.admin._id,
      senderModel: 'Admin',
      message,
      attachments: attachments || [],
      isInternal: isInternal || false
    });

    // Update ticket updatedAt
    ticket.updatedAt = new Date();
    await ticket.save();

    // Populate sender info
    await ticketMessage.populate('senderId', 'name email');

    console.log(`✅ Admin message added to ticket ${ticket.ticketNumber}`);

    res.status(201).json({
      success: true,
      message: 'Message added successfully',
      data: ticketMessage
    });
  } catch (error) {
    console.error('❌ Error adding admin message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

/**
 * @desc    Get support analytics
 * @route   GET /api/admin/support/analytics
 * @access  Private (Admin)
 */
exports.getAnalytics = async (req, res) => {
  try {
    // Open tickets count
    const openTickets = await Ticket.countDocuments({
      status: { $in: ['open', 'assigned', 'in-progress'] }
    });

    // Overdue tickets
    const now = new Date();
    const overdueTickets = await Ticket.countDocuments({
      slaDeadline: { $lt: now },
      status: { $nin: ['resolved', 'closed'] }
    });

    // Resolved today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const resolvedToday = await Ticket.countDocuments({
      resolvedAt: { $gte: todayStart },
      status: 'resolved'
    });

    // Average resolution time
    const resolvedTickets = await Ticket.find({
      status: 'resolved',
      resolvedAt: { $exists: true }
    }).select('createdAt resolvedAt');

    let avgResolutionTime = 0;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((sum, ticket) => {
        const hours = (ticket.resolvedAt - ticket.createdAt) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResolutionTime = Math.round((totalHours / resolvedTickets.length) * 10) / 10;
    }

    // SLA compliance rate
    const totalResolved = resolvedTickets.length;
    const slaCompliant = resolvedTickets.filter(ticket => {
      return ticket.resolvedAt <= ticket.slaDeadline;
    }).length;
    const slaComplianceRate = totalResolved > 0
      ? Math.round((slaCompliant / totalResolved) * 100)
      : 0;

    // Category breakdown
    const categoryBreakdown = await Ticket.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        openTickets,
        overdueTickets,
        resolvedToday,
        avgResolutionTime,
        slaComplianceRate,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};


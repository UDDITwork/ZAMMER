const Ticket = require('../models/Ticket');
const TicketMessage = require('../models/TicketMessage');
const SupportCategory = require('../models/SupportCategory');
const { generateTicketNumber } = require('../utils/ticketNumberGenerator');
const { calculateSLADeadline } = require('../utils/slaCalculator');

/**
 * @desc    Create a new support ticket
 * @route   POST /api/support/tickets
 * @access  Private (User/Seller/Delivery)
 */
exports.createTicket = async (req, res) => {
  try {
    const { userType, category, customReason, description, attachments } = req.body;

    // Validate required fields
    if (!userType || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'userType, category, and description are required'
      });
    }

    // Validate userType
    if (!['buyer', 'seller', 'delivery'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userType. Must be buyer, seller, or delivery'
      });
    }

    // Determine actual authenticated user type and validate against requested userType
    let userId, userTypeModel, actualUserType;
    
    if (req.user) {
      actualUserType = 'buyer';
      userId = req.user._id;
      userTypeModel = 'User';
    } else if (req.seller) {
      actualUserType = 'seller';
      userId = req.seller._id;
      userTypeModel = 'Seller';
    } else if (req.deliveryAgent) {
      actualUserType = 'delivery';
      userId = req.deliveryAgent._id;
      userTypeModel = 'DeliveryAgent';
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate that userType matches authenticated user type
    if (userType !== actualUserType) {
      return res.status(403).json({
        success: false,
        message: `Invalid userType. You are authenticated as ${actualUserType}, but requested ${userType}`
      });
    }

    // Validate category exists and is active
    const categoryDoc = await SupportCategory.findOne({
      userType,
      categoryCode: category,
      isActive: true
    });

    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive category'
      });
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Calculate SLA deadline
    const createdAt = new Date();
    const slaDeadline = calculateSLADeadline(createdAt);

    // Create ticket
    const ticket = await Ticket.create({
      ticketNumber,
      userType,
      userId,
      userTypeModel,
      category: categoryDoc.categoryCode,
      customReason: customReason || '',
      title: categoryDoc.categoryName,
      description,
      priority: categoryDoc.defaultPriority,
      attachments: attachments || [],
      slaDeadline
    });

    console.log(`✅ Ticket created: ${ticketNumber} by ${userType} ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: {
        ticketId: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        slaDeadline: ticket.slaDeadline
      }
    });
  } catch (error) {
    console.error('❌ Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket',
      error: error.message
    });
  }
};

/**
 * @desc    Get user's tickets
 * @route   GET /api/support/tickets
 * @access  Private (User/Seller/Delivery)
 */
exports.getUserTickets = async (req, res) => {
  try {
    // Determine userType and userId from request
    let userType, userId;
    if (req.user) {
      userType = 'buyer';
      userId = req.user._id;
    } else if (req.seller) {
      userType = 'seller';
      userId = req.seller._id;
    } else if (req.deliveryAgent) {
      userType = 'delivery';
      userId = req.deliveryAgent._id;
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Query parameters
    const {
      status,
      category,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    const query = { userType, userId };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
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

    // Get tickets
    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-internalNotes -resolutionNotes');

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
 * @desc    Get single ticket with conversation thread
 * @route   GET /api/support/tickets/:ticketId
 * @access  Private (User/Seller/Delivery)
 */
exports.getTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Determine userType and userId
    let userType, userId;
    if (req.user) {
      userType = 'buyer';
      userId = req.user._id;
    } else if (req.seller) {
      userType = 'seller';
      userId = req.seller._id;
    } else if (req.deliveryAgent) {
      userType = 'delivery';
      userId = req.deliveryAgent._id;
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get ticket
    const ticket = await Ticket.findOne({
      _id: ticketId,
      userType,
      userId
    }).select('-internalNotes');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Get messages (exclude internal ones for users)
    const messages = await TicketMessage.find({
      ticketId: ticket._id,
      isInternal: false
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name firstName email mobileNumber')
      .select('-isInternal');

    res.json({
      success: true,
      data: {
        ticket,
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
 * @desc    Add message to ticket
 * @route   POST /api/support/tickets/:ticketId/messages
 * @access  Private (User/Seller/Delivery)
 */
exports.addMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, attachments } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Determine userType and userId
    let userType, userId, senderType, senderModel;
    if (req.user) {
      userType = 'buyer';
      userId = req.user._id;
      senderType = 'user';
      senderModel = 'User';
    } else if (req.seller) {
      userType = 'seller';
      userId = req.seller._id;
      senderType = 'user';
      senderModel = 'Seller';
    } else if (req.deliveryAgent) {
      userType = 'delivery';
      userId = req.deliveryAgent._id;
      senderType = 'user';
      senderModel = 'DeliveryAgent';
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify ticket belongs to user
    const ticket = await Ticket.findOne({
      _id: ticketId,
      userType,
      userId
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Create message
    const ticketMessage = await TicketMessage.create({
      ticketId: ticket._id,
      senderType,
      senderId: userId,
      senderModel,
      message,
      attachments: attachments || [],
      isInternal: false
    });

    // Update ticket updatedAt
    ticket.updatedAt = new Date();
    await ticket.save();

    // Populate sender info
    await ticketMessage.populate('senderId', 'name firstName email mobileNumber');

    console.log(`✅ Message added to ticket ${ticket.ticketNumber}`);

    res.status(201).json({
      success: true,
      message: 'Message added successfully',
      data: ticketMessage
    });
  } catch (error) {
    console.error('❌ Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

/**
 * @desc    Get categories for user type
 * @route   GET /api/support/categories/:userType
 * @access  Public
 */
exports.getCategories = async (req, res) => {
  try {
    const { userType } = req.params;

    if (!['buyer', 'seller', 'delivery'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userType. Must be buyer, seller, or delivery'
      });
    }

    const categories = await SupportCategory.find({
      userType,
      isActive: true
    }).select('categoryCode categoryName description defaultPriority');

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};


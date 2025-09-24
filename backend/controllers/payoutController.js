// backend/controllers/payoutController.js - Payout Management Controller
const CashfreePayoutService = require('../services/cashfreePayoutService');
const BatchPayoutService = require('../services/batchPayoutService');
const PayoutCalculationService = require('../services/payoutCalculationService');
const payoutNotificationService = require('../services/payoutNotificationService');
const CashfreeBeneficiary = require('../models/CashfreeBeneficiary');
const Payout = require('../models/Payout');
const PayoutBatch = require('../models/PayoutBatch');
const Order = require('../models/Order');
const Seller = require('../models/Seller');
const { utils } = require('../config/cashfree');

// ========================================
// SELLER ENDPOINTS
// ========================================

/**
 * @desc    Create beneficiary for seller
 * @route   POST /api/payouts/beneficiary
 * @access  Private (Seller)
 */
exports.createBeneficiary = async (req, res) => {
  try {
    console.log('🏦 [CREATE_BENEFICIARY] Request received', {
      sellerId: req.seller._id,
      sellerEmail: req.seller.email
    });

    // Check if seller has complete bank details
    const seller = await Seller.findById(req.seller._id);
    if (!seller.bankDetails.accountNumber || !seller.bankDetails.ifscCode) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your bank details before creating beneficiary',
        requiredFields: ['accountNumber', 'ifscCode']
      });
    }

    // Create beneficiary using Cashfree service
    const beneficiary = await CashfreePayoutService.createBeneficiary(req.seller._id);

    console.log('✅ [CREATE_BENEFICIARY] Beneficiary created successfully', {
      beneficiaryId: beneficiary.beneficiaryId,
      status: beneficiary.beneficiaryStatus
    });

    // Send notification to seller about beneficiary creation
    try {
      await payoutNotificationService.sendPayoutStatusNotification({
        payout: { status: beneficiary.beneficiaryStatus, amount: 0 },
        order: { orderNumber: 'N/A', totalPrice: 0, createdAt: new Date() },
        beneficiary: beneficiary
      }, {
        seller: req.seller
      }, beneficiary.beneficiaryStatus === 'VERIFIED' ? 'beneficiary_created' : 'beneficiary_verification_failed');

      console.log(`📧 [CREATE_BENEFICIARY] Notification sent to seller:`, {
        sellerId: req.seller._id,
        notificationType: beneficiary.beneficiaryStatus === 'VERIFIED' ? 'beneficiary_created' : 'beneficiary_verification_failed'
      });
    } catch (notificationError) {
      console.error(`❌ [CREATE_BENEFICIARY] Failed to send notification:`, notificationError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Beneficiary created successfully',
      data: {
        beneficiaryId: beneficiary.beneficiaryId,
        status: beneficiary.beneficiaryStatus,
        verificationStatus: beneficiary.verificationStatus,
        bankDetails: {
          accountNumber: beneficiary.maskedAccountNumber,
          ifscCode: beneficiary.bankIfsc,
          bankName: beneficiary.bankName
        }
      }
    });
  } catch (error) {
    console.error('❌ [CREATE_BENEFICIARY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create beneficiary',
      error: error.message
    });
  }
};

/**
 * @desc    Get seller's beneficiary details
 * @route   GET /api/payouts/beneficiary
 * @access  Private (Seller)
 */
exports.getBeneficiary = async (req, res) => {
  try {
    console.log('🔍 [GET_BENEFICIARY] Request received', {
      sellerId: req.seller._id
    });

    const beneficiary = await CashfreeBeneficiary.findBySeller(req.seller._id);

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        message: 'No beneficiary found. Please create one first.'
      });
    }

    console.log('✅ [GET_BENEFICIARY] Beneficiary retrieved', {
      beneficiaryId: beneficiary.beneficiaryId,
      status: beneficiary.beneficiaryStatus
    });

    res.json({
      success: true,
      data: {
        beneficiaryId: beneficiary.beneficiaryId,
        status: beneficiary.beneficiaryStatus,
        verificationStatus: beneficiary.verificationStatus,
        bankDetails: {
          accountNumber: beneficiary.maskedAccountNumber,
          ifscCode: beneficiary.bankIfsc,
          bankName: beneficiary.bankName
        },
        contactDetails: {
          email: beneficiary.beneficiaryEmail,
          phone: beneficiary.formattedPhone,
          address: beneficiary.beneficiaryAddress,
          city: beneficiary.beneficiaryCity,
          state: beneficiary.beneficiaryState,
          postalCode: beneficiary.beneficiaryPostalCode
        },
        addedOn: beneficiary.addedOn,
        updatedOn: beneficiary.updatedOn
      }
    });
  } catch (error) {
    console.error('❌ [GET_BENEFICIARY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get beneficiary details',
      error: error.message
    });
  }
};

/**
 * @desc    Update beneficiary details
 * @route   PUT /api/payouts/beneficiary
 * @access  Private (Seller)
 */
exports.updateBeneficiary = async (req, res) => {
  try {
    console.log('🔄 [UPDATE_BENEFICIARY] Request received', {
      sellerId: req.seller._id
    });

    const { bankDetails } = req.body;

    // Validate required fields
    if (!bankDetails.accountNumber || !bankDetails.ifscCode) {
      return res.status(400).json({
        success: false,
        message: 'Account number and IFSC code are required'
      });
    }

    // Update seller bank details
    const seller = await Seller.findById(req.seller._id);
    seller.bankDetails = {
      ...seller.bankDetails,
      ...bankDetails
    };
    await seller.save();

    // Remove existing beneficiary (will need to be recreated)
    const existingBeneficiary = await CashfreeBeneficiary.findBySeller(req.seller._id);
    if (existingBeneficiary) {
      await existingBeneficiary.softDelete();
    }

    // Create new beneficiary with updated details
    const newBeneficiary = await CashfreePayoutService.createBeneficiary(req.seller._id);

    console.log('✅ [UPDATE_BENEFICIARY] Beneficiary updated successfully', {
      beneficiaryId: newBeneficiary.beneficiaryId
    });

    res.json({
      success: true,
      message: 'Beneficiary updated successfully. Please wait for verification.',
      data: {
        beneficiaryId: newBeneficiary.beneficiaryId,
        status: newBeneficiary.beneficiaryStatus,
        verificationStatus: newBeneficiary.verificationStatus
      }
    });
  } catch (error) {
    console.error('❌ [UPDATE_BENEFICIARY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update beneficiary',
      error: error.message
    });
  }
};

/**
 * @desc    Get seller's payout history
 * @route   GET /api/payouts/history
 * @access  Private (Seller)
 */
exports.getPayoutHistory = async (req, res) => {
  try {
    console.log('📊 [GET_PAYOUT_HISTORY] Request received', {
      sellerId: req.seller._id
    });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    // Build query
    const query = { seller: req.seller._id };
    if (status) {
      query.status = status;
    }

    // Get payouts
    const payouts = await Payout.find(query)
      .populate('order', 'orderNumber totalPrice createdAt')
      .sort({ initiatedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const totalCount = await Payout.countDocuments(query);

    // Calculate summary statistics
    const stats = await Payout.getTotalPayouts(req.seller._id);
    const totalPayouts = stats[0] || { totalPayouts: 0, totalOrders: 0, averagePayout: 0 };

    console.log('✅ [GET_PAYOUT_HISTORY] History retrieved', {
      payoutCount: payouts.length,
      totalPayouts: totalPayouts.totalPayouts
    });

    res.json({
      success: true,
      data: {
        payouts: payouts.map(payout => ({
          id: payout._id,
          orderNumber: payout.order.orderNumber,
          orderAmount: payout.orderAmount,
          payoutAmount: payout.formattedPayoutAmount,
          commission: payout.formattedCommission,
          status: payout.status,
          transferUtr: payout.transferUtr,
          initiatedAt: payout.initiatedAt,
          completedAt: payout.completedAt,
          duration: payout.payoutDuration
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        },
        summary: {
          totalPayouts: totalPayouts.totalPayouts,
          totalOrders: totalPayouts.totalOrders,
          averagePayout: totalPayouts.averagePayout
        }
      }
    });
  } catch (error) {
    console.error('❌ [GET_PAYOUT_HISTORY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payout history',
      error: error.message
    });
  }
};

/**
 * @desc    Get seller's payout statistics
 * @route   GET /api/payouts/stats
 * @access  Private (Seller)
 */
exports.getPayoutStats = async (req, res) => {
  try {
    console.log('📈 [GET_PAYOUT_STATS] Request received', {
      sellerId: req.seller._id
    });

    // Get payout statistics
    const stats = await Payout.getPayoutStats(req.seller._id);
    const totalPayouts = await Payout.getTotalPayouts(req.seller._id);

    // Get pending payouts
    const pendingPayouts = await Payout.find({
      seller: req.seller._id,
      status: { $in: ['pending', 'processing'] }
    }).populate('order', 'orderNumber totalPrice');

    // Get recent payouts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPayouts = await Payout.aggregate([
      {
        $match: {
          seller: req.seller._id,
          initiatedAt: { $gte: thirtyDaysAgo },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$initiatedAt' }
          },
          dailyPayouts: { $sum: '$payoutAmount' },
          payoutCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('✅ [GET_PAYOUT_STATS] Stats retrieved', {
      totalPayouts: totalPayouts[0]?.totalPayouts || 0,
      pendingCount: pendingPayouts.length
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalPayouts: totalPayouts[0]?.totalPayouts || 0,
          totalOrders: totalPayouts[0]?.totalOrders || 0,
          averagePayout: totalPayouts[0]?.averagePayout || 0
        },
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount
          };
          return acc;
        }, {}),
        pendingPayouts: pendingPayouts.map(payout => ({
          id: payout._id,
          orderNumber: payout.order.orderNumber,
          amount: payout.formattedPayoutAmount,
          status: payout.status,
          initiatedAt: payout.initiatedAt
        })),
        recentActivity: recentPayouts
      }
    });
  } catch (error) {
    console.error('❌ [GET_PAYOUT_STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payout statistics',
      error: error.message
    });
  }
};

// ========================================
// ADMIN ENDPOINTS
// ========================================

/**
 * @desc    Get all beneficiaries
 * @route   GET /api/payouts/admin/beneficiaries
 * @access  Private (Admin)
 */
exports.getAllBeneficiaries = async (req, res) => {
  try {
    console.log('🔍 [GET_ALL_BENEFICIARIES] Request received');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const verificationStatus = req.query.verificationStatus;
    const skip = (page - 1) * limit;

    // Build query
    const query = { isActive: true };
    if (status) {
      query.beneficiaryStatus = status;
    }
    if (verificationStatus) {
      query.verificationStatus = verificationStatus;
    }

    // Get beneficiaries
    const beneficiaries = await CashfreeBeneficiary.find(query)
      .populate('seller', 'firstName email shop.name mobileNumber')
      .sort({ updatedOn: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const totalCount = await CashfreeBeneficiary.countDocuments(query);

    console.log('✅ [GET_ALL_BENEFICIARIES] Beneficiaries retrieved', {
      count: beneficiaries.length
    });

    res.json({
      success: true,
      data: {
        beneficiaries: beneficiaries.map(beneficiary => ({
          id: beneficiary._id,
          seller: {
            id: beneficiary.seller._id,
            name: beneficiary.seller.firstName,
            email: beneficiary.seller.email,
            shopName: beneficiary.seller.shop.name,
            mobileNumber: beneficiary.seller.mobileNumber
          },
          beneficiaryId: beneficiary.beneficiaryId,
          status: beneficiary.beneficiaryStatus,
          verificationStatus: beneficiary.verificationStatus,
          bankDetails: {
            accountNumber: beneficiary.maskedAccountNumber,
            ifscCode: beneficiary.bankIfsc,
            bankName: beneficiary.bankName
          },
          addedOn: beneficiary.addedOn,
          updatedOn: beneficiary.updatedOn
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('❌ [GET_ALL_BENEFICIARIES] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get beneficiaries',
      error: error.message
    });
  }
};

/**
 * @desc    Get all payouts
 * @route   GET /api/payouts/admin/payouts
 * @access  Private (Admin)
 */
exports.getAllPayouts = async (req, res) => {
  try {
    console.log('📊 [GET_ALL_PAYOUTS] Request received');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const sellerId = req.query.sellerId;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    if (sellerId) {
      query.seller = sellerId;
    }

    // Get payouts
    const payouts = await Payout.find(query)
      .populate('order', 'orderNumber totalPrice createdAt')
      .populate('seller', 'firstName email shop.name')
      .sort({ initiatedAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const totalCount = await Payout.countDocuments(query);

    console.log('✅ [GET_ALL_PAYOUTS] Payouts retrieved', {
      count: payouts.length
    });

    res.json({
      success: true,
      data: {
        payouts: payouts.map(payout => ({
          id: payout._id,
          order: {
            id: payout.order._id,
            orderNumber: payout.order.orderNumber,
            totalPrice: payout.order.totalPrice,
            createdAt: payout.order.createdAt
          },
          seller: {
            id: payout.seller._id,
            name: payout.seller.firstName,
            email: payout.seller.email,
            shopName: payout.seller.shop.name
          },
          transferId: payout.transferId,
          cfTransferId: payout.cfTransferId,
          orderAmount: payout.orderAmount,
          payoutAmount: payout.formattedPayoutAmount,
          commission: payout.formattedCommission,
          status: payout.status,
          transferUtr: payout.transferUtr,
          initiatedAt: payout.initiatedAt,
          completedAt: payout.completedAt,
          duration: payout.payoutDuration
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('❌ [GET_ALL_PAYOUTS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payouts',
      error: error.message
    });
  }
};

/**
 * @desc    Get payout analytics
 * @route   GET /api/payouts/admin/analytics
 * @access  Private (Admin)
 */
exports.getPayoutAnalytics = async (req, res) => {
  try {
    console.log('📈 [GET_PAYOUT_ANALYTICS] Request received');

    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get payout statistics
    const payoutStats = await Payout.aggregate([
      {
        $match: {
          initiatedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$payoutAmount' }
        }
      }
    ]);

    // Get batch transfer statistics
    const batchStats = await PayoutBatch.getBatchStats(startDate, new Date());

    // Get daily statistics
    const dailyStats = await PayoutBatch.getDailyStats(days);

    // Get top sellers by payout amount
    const topSellers = await Payout.aggregate([
      {
        $match: {
          initiatedAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$seller',
          totalPayouts: { $sum: '$payoutAmount' },
          payoutCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'sellers',
          localField: '_id',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $project: {
          sellerName: '$seller.firstName',
          shopName: '$seller.shop.name',
          totalPayouts: 1,
          payoutCount: 1
        }
      },
      { $sort: { totalPayouts: -1 } },
      { $limit: 10 }
    ]);

    console.log('✅ [GET_PAYOUT_ANALYTICS] Analytics retrieved');

    res.json({
      success: true,
      data: {
        payoutStats: payoutStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount
          };
          return acc;
        }, {}),
        batchStats,
        dailyStats,
        topSellers
      }
    });
  } catch (error) {
    console.error('❌ [GET_PAYOUT_ANALYTICS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payout analytics',
      error: error.message
    });
  }
};

// ========================================
// BATCH PROCESSING ENDPOINTS
// ========================================

/**
 * @desc    Process batch payouts
 * @route   POST /api/payouts/admin/process-batch
 * @access  Private (Admin)
 */
exports.processBatchPayouts = async (req, res) => {
  try {
    console.log('⚡ [PROCESS_BATCH_PAYOUTS] Request received');

    const { date, sellerIds, orderIds, force } = req.body;
    
    const result = await BatchPayoutService.processManualBatchPayout({
      date,
      sellerIds,
      orderIds,
      force
    });

    console.log('✅ [PROCESS_BATCH_PAYOUTS] Batch processed successfully', {
      batchTransferId: result.batchTransferId,
      transferCount: result.transferCount
    });

    res.json({
      success: true,
      message: 'Batch payouts processed successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ [PROCESS_BATCH_PAYOUTS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch payouts',
      error: error.message
    });
  }
};

/**
 * @desc    Get batch payout status
 * @route   GET /api/payouts/admin/batch/:batchTransferId
 * @access  Private (Admin)
 */
exports.getBatchPayoutStatus = async (req, res) => {
  try {
    const { batchTransferId } = req.params;
    
    console.log('🔍 [GET_BATCH_PAYOUT_STATUS] Request received', { batchTransferId });

    const result = await BatchPayoutService.getBatchPayoutStatus(batchTransferId);

    console.log('✅ [GET_BATCH_PAYOUT_STATUS] Status retrieved successfully');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [GET_BATCH_PAYOUT_STATUS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch payout status',
      error: error.message
    });
  }
};

/**
 * @desc    Get batch payout history
 * @route   GET /api/payouts/admin/batch-history
 * @access  Private (Admin)
 */
exports.getBatchPayoutHistory = async (req, res) => {
  try {
    console.log('📊 [GET_BATCH_PAYOUT_HISTORY] Request received');

    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate
    } = req.query;

    const result = await BatchPayoutService.getBatchPayoutHistory({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    console.log('✅ [GET_BATCH_PAYOUT_HISTORY] History retrieved successfully');

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ [GET_BATCH_PAYOUT_HISTORY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch payout history',
      error: error.message
    });
  }
};

/**
 * @desc    Get payout eligibility statistics
 * @route   GET /api/payouts/admin/eligibility-stats
 * @access  Private (Admin)
 */
exports.getPayoutEligibilityStats = async (req, res) => {
  try {
    console.log('📈 [GET_PAYOUT_ELIGIBILITY_STATS] Request received');

    const { sellerId } = req.query;
    
    const stats = await PayoutCalculationService.getPayoutEligibilityStats(sellerId);

    console.log('✅ [GET_PAYOUT_ELIGIBILITY_STATS] Stats retrieved successfully');

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ [GET_PAYOUT_ELIGIBILITY_STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payout eligibility statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Update order payout eligibility
 * @route   POST /api/payouts/admin/update-eligibility
 * @access  Private (Admin)
 */
exports.updateOrderPayoutEligibility = async (req, res) => {
  try {
    console.log('🔄 [UPDATE_ORDER_PAYOUT_ELIGIBILITY] Request received');

    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds)) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    const result = await PayoutCalculationService.processPayoutEligibilityBatch(orderIds);

    console.log('✅ [UPDATE_ORDER_PAYOUT_ELIGIBILITY] Eligibility updated successfully', {
      processed: result.summary.processed,
      eligible: result.summary.eligible
    });

    res.json({
      success: true,
      message: 'Order payout eligibility updated successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ [UPDATE_ORDER_PAYOUT_ELIGIBILITY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order payout eligibility',
      error: error.message
    });
  }
};

/**
 * @desc    Process single payout
 * @route   POST /api/payouts/admin/process-single/:orderId
 * @access  Private (Admin)
 */
exports.processSinglePayout = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log('⚡ [PROCESS_SINGLE_PAYOUT] Request received', { orderId });

    const payout = await CashfreePayoutService.processPayout(orderId);

    console.log('✅ [PROCESS_SINGLE_PAYOUT] Payout processed successfully', {
      payoutId: payout._id,
      transferId: payout.transferId
    });

    res.json({
      success: true,
      message: 'Payout processed successfully',
      data: {
        payoutId: payout._id,
        transferId: payout.transferId,
        cfTransferId: payout.cfTransferId,
        amount: payout.formattedPayoutAmount,
        status: payout.status
      }
    });
  } catch (error) {
    console.error('❌ [PROCESS_SINGLE_PAYOUT] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payout',
      error: error.message
    });
  }
};

// ========================================
// WEBHOOK ENDPOINTS
// ========================================

/**
 * @desc    Handle Cashfree payout webhooks
 * @route   POST /api/payouts/webhook
 * @access  Public (Cashfree)
 */
exports.handleWebhook = async (req, res) => {
  try {
    console.log('🔔 [PAYOUT_WEBHOOK] Webhook received', {
      headers: req.headers,
      body: req.body
    });

    const signature = req.headers['x-cf-signature'];
    const payload = JSON.stringify(req.body);
    
    // Verify webhook signature
    const isValidSignature = CashfreePayoutService.verifyWebhookSignature(
      payload,
      signature,
      process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET
    );

    if (!isValidSignature) {
      console.error('❌ [PAYOUT_WEBHOOK] Invalid signature');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Update payout status
    const payout = await CashfreePayoutService.updatePayoutStatus(req.body);

    console.log('✅ [PAYOUT_WEBHOOK] Webhook processed successfully', {
      transferId: req.body.transfer_id,
      status: req.body.status
    });

    // Send notification to seller about payout status update
    if (payout && payout.seller) {
      try {
        const seller = await Seller.findById(payout.seller);
        const order = await Order.findById(payout.order);
        const beneficiary = await CashfreeBeneficiary.findById(payout.beneficiary);

        if (seller && order) {
          const notificationType = req.body.status === 'SUCCESS' ? 'payout_completed' : 
                                 req.body.status === 'FAILED' ? 'payout_failed' : 
                                 'payout_processing';

          await payoutNotificationService.sendPayoutStatusNotification({
            payout: payout,
            order: order,
            beneficiary: beneficiary
          }, {
            seller: seller
          }, notificationType);

          console.log(`📧 [PAYOUT_WEBHOOK] Notification sent to seller:`, {
            sellerId: seller._id,
            payoutId: payout._id,
            notificationType,
            payoutStatus: req.body.status
          });
        }
      } catch (notificationError) {
        console.error(`❌ [PAYOUT_WEBHOOK] Failed to send notification:`, notificationError.message);
      }
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('❌ [PAYOUT_WEBHOOK] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
};

// ========================================
// UTILITY ENDPOINTS
// ========================================

/**
 * @desc    Health check
 * @route   GET /api/payouts/health
 * @access  Public
 */
exports.healthCheck = async (req, res) => {
  try {
    const health = await CashfreePayoutService.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
};

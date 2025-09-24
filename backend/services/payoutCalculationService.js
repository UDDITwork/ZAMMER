// backend/services/payoutCalculationService.js - Automated Payout Calculation Service
const Order = require('../models/Order');
const Seller = require('../models/Seller');
const CashfreeBeneficiary = require('../models/CashfreeBeneficiary');
const { utils, commissionConfig } = require('../config/cashfree');

class PayoutCalculationService {
  constructor() {
    this.loggingEnabled = process.env.PAYOUT_LOGGING_ENABLED === 'true';
  }

  /**
   * Log service operations
   */
  log(level, message, data = null) {
    if (!this.loggingEnabled) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [PAYOUT_CALCULATION] ${message}`;
    
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Calculate commission for an order
   */
  calculateCommission(orderAmount) {
    const commission = utils.calculateCommission(orderAmount);
    
    this.log('info', 'Commission calculated', {
      orderAmount,
      platformCommission: commission.platformCommission,
      gst: commission.gst,
      totalCommission: commission.totalCommission,
      sellerAmount: commission.sellerAmount
    });

    return commission;
  }

  /**
   * Check if order is eligible for payout
   */
  isEligibleForPayout(order) {
    try {
      // Check if order is delivered and paid
      if (order.status !== 'Delivered' || !order.isPaid || order.paymentStatus !== 'completed') {
        this.log('debug', 'Order not eligible - not delivered or not paid', {
          orderId: order._id,
          status: order.status,
          isPaid: order.isPaid,
          paymentStatus: order.paymentStatus
        });
        return false;
      }

      // Check if payout is already processed
      if (order.payout.processed) {
        this.log('debug', 'Order not eligible - payout already processed', {
          orderId: order._id
        });
        return false;
      }

      // Check if payout failed and is not retryable
      if (order.payout.status === 'failed' && !order.payout.payoutError?.retryable) {
        this.log('debug', 'Order not eligible - payout failed and not retryable', {
          orderId: order._id,
          error: order.payout.payoutError
        });
        return false;
      }

      // Check delivery date for payout delay
      if (!order.deliveredAt) {
        this.log('debug', 'Order not eligible - no delivery date', {
          orderId: order._id
        });
        return false;
      }

      const now = new Date();
      const deliveryDate = new Date(order.deliveredAt);
      const daysDifference = (now - deliveryDate) / (1000 * 60 * 60 * 24);

      if (daysDifference < commissionConfig.payoutDelayDays) {
        this.log('debug', 'Order not eligible - within payout delay period', {
          orderId: order._id,
          daysDifference: Math.round(daysDifference * 100) / 100,
          requiredDays: commissionConfig.payoutDelayDays
        });
        return false;
      }

      // Check minimum payout amount
      const commission = this.calculateCommission(order.totalPrice);
      if (commission.sellerAmount < commissionConfig.minimumPayoutAmount) {
        this.log('debug', 'Order not eligible - below minimum payout amount', {
          orderId: order._id,
          sellerAmount: commission.sellerAmount,
          minimumAmount: commissionConfig.minimumPayoutAmount
        });
        return false;
      }

      this.log('info', 'Order is eligible for payout', {
        orderId: order._id,
        orderAmount: order.totalPrice,
        sellerAmount: commission.sellerAmount,
        daysSinceDelivery: Math.round(daysDifference * 100) / 100
      });

      return true;
    } catch (error) {
      this.log('error', 'Error checking payout eligibility', {
        orderId: order._id,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Update order payout eligibility
   */
  async updateOrderPayoutEligibility(orderId) {
    try {
      this.log('info', 'Updating order payout eligibility', { orderId });

      const order = await Order.findById(orderId).populate('seller');
      if (!order) {
        throw new Error('Order not found');
      }

      const isEligible = this.isEligibleForPayout(order);
      const commission = this.calculateCommission(order.totalPrice);

      // Update order payout status
      order.payout.eligibilityCheckedAt = new Date();
      
      if (isEligible) {
        order.payout.status = 'eligible';
        order.payout.commission = commission;
        order.payout.eligibilityNotes = 'Order is eligible for payout processing';
      } else {
        order.payout.status = 'not_eligible';
        order.payout.eligibilityNotes = 'Order is not eligible for payout processing';
        
        // Clear commission if not eligible
        order.payout.commission = {
          platformCommission: 0,
          gstAmount: 0,
          totalCommission: 0,
          sellerAmount: 0
        };
      }

      await order.save();

      this.log('info', 'Order payout eligibility updated', {
        orderId,
        status: order.payout.status,
        eligible: isEligible
      });

      return {
        orderId,
        isEligible,
        commission: isEligible ? commission : null,
        status: order.payout.status
      };
    } catch (error) {
      this.log('error', 'Failed to update order payout eligibility', {
        orderId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get eligible orders for payout
   */
  async getEligibleOrdersForPayout(options = {}) {
    try {
      const {
        sellerId = null,
        date = null,
        limit = 1000,
        skip = 0
      } = options;

      this.log('info', 'Getting eligible orders for payout', options);

      // Calculate target date for payout delay
      const targetDate = new Date();
      if (date) {
        targetDate.setTime(date.getTime());
      }
      targetDate.setDate(targetDate.getDate() - commissionConfig.payoutDelayDays);

      // Build query
      const query = {
        status: 'Delivered',
        isPaid: true,
        paymentStatus: 'completed',
        deliveredAt: { $lte: targetDate },
        'payout.processed': { $ne: true },
        'payout.status': { $ne: 'failed' }
      };

      if (sellerId) {
        query.seller = sellerId;
      }

      // Get orders
      const orders = await Order.find(query)
        .populate('seller', 'firstName email bankDetails')
        .populate('user', 'firstName email')
        .sort({ deliveredAt: 1 })
        .skip(skip)
        .limit(limit);

      // Filter eligible orders
      const eligibleOrders = [];
      const ineligibleOrders = [];

      for (const order of orders) {
        const isEligible = this.isEligibleForPayout(order);
        
        if (isEligible) {
          const commission = this.calculateCommission(order.totalPrice);
          eligibleOrders.push({
            order,
            commission
          });
        } else {
          ineligibleOrders.push(order);
        }
      }

      this.log('info', 'Eligible orders retrieved', {
        totalOrders: orders.length,
        eligibleCount: eligibleOrders.length,
        ineligibleCount: ineligibleOrders.length
      });

      return {
        eligibleOrders,
        ineligibleOrders,
        totalEligible: eligibleOrders.length,
        totalIneligible: ineligibleOrders.length,
        totalProcessed: orders.length
      };
    } catch (error) {
      this.log('error', 'Failed to get eligible orders', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Group orders by seller for batch processing
   */
  groupOrdersBySeller(eligibleOrders) {
    try {
      this.log('info', 'Grouping orders by seller', {
        totalOrders: eligibleOrders.length
      });

      const sellerGroups = new Map();
      let totalAmount = 0;
      let totalCommission = 0;

      eligibleOrders.forEach(({ order, commission }) => {
        const sellerId = order.seller._id.toString();
        
        if (!sellerGroups.has(sellerId)) {
          sellerGroups.set(sellerId, {
            seller: order.seller,
            orders: [],
            totalOrderAmount: 0,
            totalPayoutAmount: 0,
            totalCommission: 0
          });
        }

        const sellerGroup = sellerGroups.get(sellerId);
        sellerGroup.orders.push({ order, commission });
        sellerGroup.totalOrderAmount += order.totalPrice;
        sellerGroup.totalPayoutAmount += commission.sellerAmount;
        sellerGroup.totalCommission += commission.totalCommission;

        totalAmount += commission.sellerAmount;
        totalCommission += commission.totalCommission;
      });

      this.log('info', 'Orders grouped by seller', {
        sellerCount: sellerGroups.size,
        totalPayoutAmount: totalAmount,
        totalCommission: totalCommission
      });

      return {
        sellerGroups,
        summary: {
          sellerCount: sellerGroups.size,
          totalOrders: eligibleOrders.length,
          totalPayoutAmount: totalAmount,
          totalCommission: totalCommission
        }
      };
    } catch (error) {
      this.log('error', 'Failed to group orders by seller', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate seller payout eligibility
   */
  async validateSellerPayoutEligibility(sellerId) {
    try {
      this.log('info', 'Validating seller payout eligibility', { sellerId });

      // Check if seller exists
      const seller = await Seller.findById(sellerId);
      if (!seller) {
        throw new Error('Seller not found');
      }

      // Check if seller has complete bank details
      const hasBankDetails = seller.bankDetails && 
                            seller.bankDetails.accountNumber && 
                            seller.bankDetails.ifscCode;

      if (!hasBankDetails) {
        return {
          eligible: false,
          reason: 'Incomplete bank details',
          requiredFields: ['accountNumber', 'ifscCode']
        };
      }

      // Check if seller has verified beneficiary
      const beneficiary = await CashfreeBeneficiary.findBySeller(sellerId);
      if (!beneficiary || !beneficiary.isVerified()) {
        return {
          eligible: false,
          reason: 'No verified beneficiary found',
          beneficiaryStatus: beneficiary?.beneficiaryStatus || 'not_found'
        };
      }

      this.log('info', 'Seller is eligible for payout', {
        sellerId,
        beneficiaryId: beneficiary.beneficiaryId
      });

      return {
        eligible: true,
        beneficiary: {
          id: beneficiary.beneficiaryId,
          status: beneficiary.beneficiaryStatus,
          bankDetails: {
            accountNumber: beneficiary.maskedAccountNumber,
            ifscCode: beneficiary.bankIfsc,
            bankName: beneficiary.bankName
          }
        }
      };
    } catch (error) {
      this.log('error', 'Failed to validate seller payout eligibility', {
        sellerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate daily payout summary
   */
  async calculateDailyPayoutSummary(date = null) {
    try {
      const targetDate = date || new Date();
      targetDate.setDate(targetDate.getDate() - commissionConfig.payoutDelayDays);

      this.log('info', 'Calculating daily payout summary', {
        targetDate: targetDate.toISOString().split('T')[0]
      });

      // Get eligible orders for the day
      const { eligibleOrders } = await this.getEligibleOrdersForPayout({
        date: targetDate
      });

      // Group by seller
      const { sellerGroups, summary } = this.groupOrdersBySeller(eligibleOrders);

      // Calculate statistics
      const statistics = {
        date: targetDate.toISOString().split('T')[0],
        totalOrders: summary.totalOrders,
        totalSellers: summary.sellerCount,
        totalOrderAmount: eligibleOrders.reduce((sum, { order }) => sum + order.totalPrice, 0),
        totalPayoutAmount: summary.totalPayoutAmount,
        totalCommission: summary.totalCommission,
        averageOrderValue: summary.totalOrders > 0 ? 
          (eligibleOrders.reduce((sum, { order }) => sum + order.totalPrice, 0) / summary.totalOrders) : 0,
        averagePayoutAmount: summary.totalSellers > 0 ? 
          (summary.totalPayoutAmount / summary.totalSellers) : 0
      };

      this.log('info', 'Daily payout summary calculated', statistics);

      return {
        statistics,
        sellerGroups: Array.from(sellerGroups.values()),
        eligibleOrders: eligibleOrders.map(({ order, commission }) => ({
          orderId: order._id,
          orderNumber: order.orderNumber,
          sellerId: order.seller._id,
          orderAmount: order.totalPrice,
          payoutAmount: commission.sellerAmount,
          commission: commission.totalCommission
        }))
      };
    } catch (error) {
      this.log('error', 'Failed to calculate daily payout summary', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process payout eligibility for multiple orders
   */
  async processPayoutEligibilityBatch(orderIds) {
    try {
      this.log('info', 'Processing payout eligibility batch', {
        orderCount: orderIds.length
      });

      const results = [];
      const errors = [];

      for (const orderId of orderIds) {
        try {
          const result = await this.updateOrderPayoutEligibility(orderId);
          results.push(result);
        } catch (error) {
          errors.push({
            orderId,
            error: error.message
          });
        }
      }

      this.log('info', 'Payout eligibility batch processed', {
        processed: results.length,
        errors: errors.length
      });

      return {
        results,
        errors,
        summary: {
          total: orderIds.length,
          processed: results.length,
          errors: errors.length,
          eligible: results.filter(r => r.isEligible).length,
          ineligible: results.filter(r => !r.isEligible).length
        }
      };
    } catch (error) {
      this.log('error', 'Failed to process payout eligibility batch', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get payout eligibility statistics
   */
  async getPayoutEligibilityStats(sellerId = null) {
    try {
      this.log('info', 'Getting payout eligibility statistics', { sellerId });

      const query = { status: 'Delivered', isPaid: true, paymentStatus: 'completed' };
      if (sellerId) {
        query.seller = sellerId;
      }

      const stats = await Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$payout.status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalPrice' }
          }
        }
      ]);

      const totalOrders = await Order.countDocuments(query);
      const eligibleOrders = await Order.countDocuments({
        ...query,
        'payout.status': 'eligible'
      });

      const statistics = {
        totalOrders,
        eligibleOrders,
        eligibilityRate: totalOrders > 0 ? (eligibleOrders / totalOrders) * 100 : 0,
        statusBreakdown: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount
          };
          return acc;
        }, {})
      };

      this.log('info', 'Payout eligibility statistics retrieved', statistics);

      return statistics;
    } catch (error) {
      this.log('error', 'Failed to get payout eligibility statistics', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new PayoutCalculationService();

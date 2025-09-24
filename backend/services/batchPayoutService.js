// backend/services/batchPayoutService.js - Automated Batch Payout Processing Service
const cron = require('node-cron');
const CashfreePayoutService = require('./cashfreePayoutService');
const PayoutCalculationService = require('./payoutCalculationService');
const payoutNotificationService = require('./payoutNotificationService');
const PayoutBatch = require('../models/PayoutBatch');
const Payout = require('../models/Payout');
const Order = require('../models/Order');
const CashfreeBeneficiary = require('../models/CashfreeBeneficiary');
const { utils, commissionConfig } = require('../config/cashfree');

class BatchPayoutService {
  constructor() {
    this.isRunning = false;
    this.loggingEnabled = process.env.BATCH_PAYOUT_LOGGING_ENABLED === 'true';
    this.scheduledJobs = new Map();
  }

  /**
   * Log service operations
   */
  log(level, message, data = null) {
    if (!this.loggingEnabled) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [BATCH_PAYOUT] ${message}`;
    
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Initialize batch payout scheduler
   */
  initializeScheduler() {
    try {
      this.log('info', 'Initializing batch payout scheduler');

      // Daily batch payout at 12:00 AM
      const dailyCron = cron.schedule('0 0 * * *', async () => {
        await this.processDailyBatchPayouts();
      }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
      });

      // Hourly payout status check
      const statusCron = cron.schedule('0 * * * *', async () => {
        await this.checkPayoutStatuses();
      }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
      });

      // Retry failed payouts every 30 minutes
      const retryCron = cron.schedule('*/30 * * * *', async () => {
        await this.retryFailedPayouts();
      }, {
        scheduled: false,
        timezone: 'Asia/Kolkata'
      });

      // Store cron jobs
      this.scheduledJobs.set('daily', dailyCron);
      this.scheduledJobs.set('status', statusCron);
      this.scheduledJobs.set('retry', retryCron);

      this.log('info', 'Batch payout scheduler initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize batch payout scheduler', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start batch payout scheduler
   */
  startScheduler() {
    try {
      this.log('info', 'Starting batch payout scheduler');

      this.scheduledJobs.forEach((job, name) => {
        job.start();
        this.log('info', `Started ${name} cron job`);
      });

      this.log('info', 'Batch payout scheduler started successfully');
    } catch (error) {
      this.log('error', 'Failed to start batch payout scheduler', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Stop batch payout scheduler
   */
  stopScheduler() {
    try {
      this.log('info', 'Stopping batch payout scheduler');

      this.scheduledJobs.forEach((job, name) => {
        job.stop();
        this.log('info', `Stopped ${name} cron job`);
      });

      this.log('info', 'Batch payout scheduler stopped successfully');
    } catch (error) {
      this.log('error', 'Failed to stop batch payout scheduler', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process daily batch payouts
   */
  async processDailyBatchPayouts(date = null) {
    if (this.isRunning) {
      this.log('warn', 'Batch payout process is already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      this.log('info', 'Starting daily batch payout processing', {
        date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      });

      // Get daily payout summary
      const dailySummary = await PayoutCalculationService.calculateDailyPayoutSummary(date);
      
      if (dailySummary.eligibleOrders.length === 0) {
        this.log('info', 'No eligible orders for payout today');
        return {
          message: 'No eligible orders for payout',
          summary: dailySummary.statistics
        };
      }

      // Process batch payouts using Cashfree service
      const result = await CashfreePayoutService.processBatchPayouts(date);

      const endTime = new Date();
      const duration = endTime - startTime;

      this.log('info', 'Daily batch payout processing completed', {
        duration: `${duration}ms`,
        batchTransferId: result.batchTransferId,
        transferCount: result.transferCount,
        totalAmount: result.totalAmount
      });

      // Send notifications for batch processing completion
      try {
        await payoutNotificationService.sendBatchPayoutNotifications({
          batchTransferId: result.batchTransferId,
          status: 'PROCESSING',
          payouts: dailySummary.eligibleOrders.map(order => ({
            payout: order.payout,
            order: order,
            seller: order.seller,
            beneficiary: order.beneficiary
          }))
        });

        this.log('info', 'Batch payout notifications sent', {
          batchTransferId: result.batchTransferId,
          notificationCount: dailySummary.eligibleOrders.length
        });
      } catch (notificationError) {
        this.log('error', 'Failed to send batch payout notifications', {
          batchTransferId: result.batchTransferId,
          error: notificationError.message
        });
      }

      return {
        success: true,
        batchTransferId: result.batchTransferId,
        transferCount: result.transferCount,
        totalAmount: result.totalAmount,
        duration: `${duration}ms`,
        summary: dailySummary.statistics
      };
    } catch (error) {
      this.log('error', 'Daily batch payout processing failed', {
        error: error.message,
        duration: `${new Date() - startTime}ms`
      });
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check payout statuses
   */
  async checkPayoutStatuses() {
    try {
      this.log('info', 'Checking payout statuses');

      // Get pending payouts
      const pendingPayouts = await Payout.find({
        status: { $in: ['pending', 'processing'] },
        cfTransferId: { $ne: null }
      }).limit(50);

      if (pendingPayouts.length === 0) {
        this.log('info', 'No pending payouts to check');
        return;
      }

      let checked = 0;
      let updated = 0;

      for (const payout of pendingPayouts) {
        try {
          // Get transfer status from Cashfree
          const statusResponse = await CashfreePayoutService.getTransferStatus(payout.transferId);
          
          // Update payout status if changed
          if (statusResponse.status !== payout.status) {
            await CashfreePayoutService.updatePayoutStatus(statusResponse);
            updated++;
          }
          
          checked++;
        } catch (error) {
          this.log('error', 'Failed to check payout status', {
            payoutId: payout._id,
            transferId: payout.transferId,
            error: error.message
          });
        }
      }

      this.log('info', 'Payout status check completed', {
        checked,
        updated
      });
    } catch (error) {
      this.log('error', 'Failed to check payout statuses', {
        error: error.message
      });
    }
  }

  /**
   * Retry failed payouts
   */
  async retryFailedPayouts() {
    try {
      this.log('info', 'Checking for failed payouts to retry');

      // Get failed payouts that can be retried
      const failedPayouts = await Payout.findFailedPayouts();
      const retryablePayouts = failedPayouts.filter(payout => payout.canRetry());

      if (retryablePayouts.length === 0) {
        this.log('info', 'No failed payouts to retry');
        return;
      }

      this.log('info', 'Retrying failed payouts', {
        count: retryablePayouts.length
      });

      let retried = 0;
      let successful = 0;

      for (const payout of retryablePayouts) {
        try {
          // Increment processing attempts
          await payout.incrementProcessingAttempts();

          // Process payout again
          await CashfreePayoutService.processPayout(payout.order.toString());
          successful++;
          retried++;
        } catch (error) {
          this.log('error', 'Failed to retry payout', {
            payoutId: payout._id,
            transferId: payout.transferId,
            error: error.message
          });
          retried++;
        }
      }

      this.log('info', 'Failed payouts retry completed', {
        retried,
        successful
      });
    } catch (error) {
      this.log('error', 'Failed to retry failed payouts', {
        error: error.message
      });
    }
  }

  /**
   * Process manual batch payout
   */
  async processManualBatchPayout(options = {}) {
    try {
      const {
        date = null,
        sellerIds = null,
        orderIds = null,
        force = false
      } = options;

      this.log('info', 'Processing manual batch payout', options);

      // Get eligible orders based on filters
      let eligibleOrders;
      
      if (orderIds && orderIds.length > 0) {
        // Process specific orders
        const orders = await Order.find({
          _id: { $in: orderIds },
          status: 'Delivered',
          isPaid: true,
          paymentStatus: 'completed'
        }).populate('seller');
        
        eligibleOrders = orders.filter(order => 
          PayoutCalculationService.isEligibleForPayout(order)
        );
      } else if (sellerIds && sellerIds.length > 0) {
        // Process orders for specific sellers
        const { eligibleOrders: allEligible } = await PayoutCalculationService.getEligibleOrdersForPayout(date);
        eligibleOrders = allEligible.filter(({ order }) => 
          sellerIds.includes(order.seller._id.toString())
        );
      } else {
        // Process all eligible orders
        const result = await PayoutCalculationService.getEligibleOrdersForPayout(date);
        eligibleOrders = result.eligibleOrders;
      }

      if (eligibleOrders.length === 0) {
        this.log('info', 'No eligible orders found for manual batch payout');
        return {
          message: 'No eligible orders found',
          count: 0
        };
      }

      // Group orders by seller
      const { sellerGroups } = PayoutCalculationService.groupOrdersBySeller(eligibleOrders);

      // Validate seller eligibility
      const validatedGroups = new Map();
      let totalValidated = 0;

      for (const [sellerId, sellerGroup] of sellerGroups) {
        const validation = await PayoutCalculationService.validateSellerPayoutEligibility(sellerId);
        
        if (validation.eligible || force) {
          validatedGroups.set(sellerId, sellerGroup);
          totalValidated += sellerGroup.orders.length;
        } else {
          this.log('warn', 'Seller not eligible for payout', {
            sellerId,
            reason: validation.reason
          });
        }
      }

      if (validatedGroups.size === 0) {
        this.log('info', 'No eligible sellers found for manual batch payout');
        return {
          message: 'No eligible sellers found',
          count: 0
        };
      }

      // Create batch transfer record
      const batchTransferId = utils.generateBatchTransferId();
      const batchTransfer = new PayoutBatch({
        batchTransferId,
        batchDate: date || new Date(),
        totalPayouts: totalValidated,
        totalAmount: Array.from(validatedGroups.values()).reduce((sum, group) => sum + group.totalPayoutAmount, 0),
        status: 'pending',
        notes: 'Manual batch payout processing'
      });

      await batchTransfer.save();

      // Process payouts for each validated seller
      const transfers = [];
      const payouts = [];

      for (const [sellerId, sellerGroup] of validatedGroups) {
        // Get or create beneficiary
        let beneficiary = await CashfreeBeneficiary.findBySeller(sellerId);
        if (!beneficiary || !beneficiary.isVerified()) {
          beneficiary = await CashfreePayoutService.createBeneficiary(sellerId);
        }

        // Create transfers for each order
        for (const { order, commission } of sellerGroup.orders) {
          const transferId = utils.generateTransferId(order._id);

          transfers.push({
            transfer_id: transferId,
            transfer_amount: utils.formatAmount(commission.sellerAmount),
            transfer_mode: 'banktransfer',
            beneficiary_details: {
              beneficiary_id: beneficiary.beneficiaryId
            },
            transfer_remarks: `Manual payout for order ${order.orderNumber}`
          });

          // Create payout record
          const payout = new Payout({
            order: order._id,
            seller: sellerId,
            beneficiary: beneficiary._id,
            transferId: transferId,
            orderAmount: order.totalPrice,
            platformCommission: commission.platformCommission,
            gstAmount: commission.gst,
            totalCommission: commission.totalCommission,
            payoutAmount: commission.sellerAmount,
            status: 'pending',
            batchTransferId: batchTransferId,
            transferMode: 'banktransfer'
          });

          payouts.push(payout);

          // Update order
          order.payout.status = 'processing';
          order.payout.commission = commission;
          order.payout.processed = true;
          order.payout.processedAt = new Date();
          order.payout.batchTransferId = batchTransferId;
        }
      }

      // Save all payouts and update orders
      await Payout.insertMany(payouts);
      await Promise.all(Array.from(validatedGroups.values()).flatMap(group => 
        group.orders.map(({ order }) => order.save())
      ));

      // Create batch transfer
      const batchData = {
        batch_transfer_id: batchTransferId,
        transfers: transfers
      };

      const cashfreeResponse = await CashfreePayoutService.createBatchTransfer(batchData);

      // Update batch transfer record
      batchTransfer.cfBatchTransferId = cashfreeResponse.cf_batch_transfer_id;
      batchTransfer.status = 'initiated';
      batchTransfer.cashfreeResponse = cashfreeResponse;
      await batchTransfer.save();

      this.log('info', 'Manual batch payout processed successfully', {
        batchTransferId,
        transferCount: transfers.length,
        totalAmount: batchTransfer.totalAmount
      });

      return {
        success: true,
        batchTransferId,
        transferCount: transfers.length,
        totalAmount: batchTransfer.totalAmount,
        sellerCount: validatedGroups.size
      };
    } catch (error) {
      this.log('error', 'Manual batch payout processing failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get batch payout status
   */
  async getBatchPayoutStatus(batchTransferId) {
    try {
      this.log('info', 'Getting batch payout status', { batchTransferId });

      const batchTransfer = await PayoutBatch.findOne({ batchTransferId });
      if (!batchTransfer) {
        throw new Error('Batch transfer not found');
      }

      // Get individual payout statuses
      const payouts = await Payout.findBatchPayouts(batchTransferId);

      // Update batch statistics
      await batchTransfer.updateBatchStats();

      return {
        batchTransfer: {
          id: batchTransfer._id,
          batchTransferId: batchTransfer.batchTransferId,
          cfBatchTransferId: batchTransfer.cfBatchTransferId,
          status: batchTransfer.status,
          totalPayouts: batchTransfer.totalPayouts,
          totalAmount: batchTransfer.totalAmount,
          successfulPayouts: batchTransfer.successfulPayouts,
          failedPayouts: batchTransfer.failedPayouts,
          pendingPayouts: batchTransfer.pendingPayouts,
          successRate: batchTransfer.successRate,
          initiatedAt: batchTransfer.initiatedAt,
          completedAt: batchTransfer.completedAt,
          duration: batchTransfer.batchDuration
        },
        payouts: payouts.map(payout => ({
          id: payout._id,
          transferId: payout.transferId,
          cfTransferId: payout.cfTransferId,
          orderAmount: payout.orderAmount,
          payoutAmount: payout.payoutAmount,
          status: payout.status,
          transferUtr: payout.transferUtr,
          initiatedAt: payout.initiatedAt,
          completedAt: payout.completedAt
        }))
      };
    } catch (error) {
      this.log('error', 'Failed to get batch payout status', {
        batchTransferId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get batch payout history
   */
  async getBatchPayoutHistory(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        startDate = null,
        endDate = null
      } = options;

      this.log('info', 'Getting batch payout history', options);

      const skip = (page - 1) * limit;
      
      // Build query
      const query = {};
      if (status) {
        query.status = status;
      }
      if (startDate && endDate) {
        query.batchDate = { $gte: startDate, $lte: endDate };
      }

      // Get batch transfers
      const batchTransfers = await PayoutBatch.find(query)
        .sort({ initiatedAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count
      const totalCount = await PayoutBatch.countDocuments(query);

      this.log('info', 'Batch payout history retrieved', {
        count: batchTransfers.length,
        totalCount
      });

      return {
        batchTransfers: batchTransfers.map(batch => ({
          id: batch._id,
          batchTransferId: batch.batchTransferId,
          cfBatchTransferId: batch.cfBatchTransferId,
          status: batch.status,
          totalPayouts: batch.totalPayouts,
          totalAmount: batch.totalAmount,
          successfulPayouts: batch.successfulPayouts,
          failedPayouts: batch.failedPayouts,
          successRate: batch.successRate,
          batchDate: batch.batchDate,
          initiatedAt: batch.initiatedAt,
          completedAt: batch.completedAt,
          duration: batch.batchDuration
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      this.log('error', 'Failed to get batch payout history', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new BatchPayoutService();

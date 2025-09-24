// backend/services/cashfreePayoutService.js - Cashfree Payouts V2 Service
const axios = require('axios');
const crypto = require('crypto');
const { 
  getConfig, 
  endpoints, 
  getHeaders, 
  transferStatusMap, 
  commissionConfig, 
  errorCodeMap, 
  validationRules, 
  utils,
  logging 
} = require('../config/cashfree');

const CashfreeBeneficiary = require('../models/CashfreeBeneficiary');
const Payout = require('../models/Payout');
const PayoutBatch = require('../models/PayoutBatch');
const Order = require('../models/Order');
const Seller = require('../models/Seller');

class CashfreePayoutService {
  constructor() {
    this.config = getConfig();
    this.baseURL = this.config.baseUrl;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Log service operations
   */
  log(level, message, data = null) {
    if (!logging.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [CASHFREE_PAYOUTS] ${message}`;
    
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Generate signature for webhook verification
   */
  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(method, endpoint, data = null, requestId = null) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = getHeaders(requestId || utils.generateRequestId());
    
    const config = {
      method,
      url,
      headers,
      timeout: 30000 // 30 seconds
    };

    if (data) {
      config.data = data;
    }

    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        this.log('info', `Making request to ${method} ${endpoint}`, {
          attempt,
          requestId: headers['x-request-id']
        });

        const response = await axios(config);
        
        this.log('info', `Request successful`, {
          status: response.status,
          requestId: headers['x-request-id']
        });

        return response.data;
      } catch (error) {
        lastError = error;
        
        this.log('error', `Request failed (attempt ${attempt})`, {
          status: error.response?.status,
          message: error.message,
          requestId: headers['x-request-id']
        });

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // ========================================
  // BENEFICIARY MANAGEMENT
  // ========================================

  /**
   * Create beneficiary for seller
   */
  async createBeneficiary(sellerId) {
    try {
      this.log('info', 'Creating beneficiary for seller', { sellerId });

      // Get seller details
      const seller = await Seller.findById(sellerId);
      if (!seller) {
        throw new Error('Seller not found');
      }

      // Check if beneficiary already exists
      let existingBeneficiary = await CashfreeBeneficiary.findBySeller(sellerId);
      if (existingBeneficiary && existingBeneficiary.isVerified()) {
        this.log('info', 'Beneficiary already exists and verified', { sellerId });
        return existingBeneficiary;
      }

      // Validate seller bank details
      if (!seller.bankDetails.accountNumber || !seller.bankDetails.ifscCode) {
        throw new Error('Seller bank details are incomplete');
      }

      // Generate beneficiary ID
      const beneficiaryId = utils.generateBeneficiaryId(sellerId);

      // Prepare beneficiary data
      const beneficiaryData = {
        beneficiary_id: beneficiaryId,
        beneficiary_name: seller.firstName,
        beneficiary_instrument_details: {
          bank_account_number: seller.bankDetails.accountNumber,
          bank_ifsc: seller.bankDetails.ifscCode,
          vpa: seller.bankDetails.vpa || null
        },
        beneficiary_contact_details: {
          beneficiary_email: seller.email,
          beneficiary_phone: seller.mobileNumber,
          beneficiary_country_code: '+91',
          beneficiary_address: seller.shop.address,
          beneficiary_city: seller.shop.city || 'Mumbai',
          beneficiary_state: seller.shop.state || 'Maharashtra',
          beneficiary_postal_code: seller.shop.postalCode || '400001'
        }
      };

      // Call Cashfree API
      const response = await this.makeRequest(
        'POST',
        endpoints.createBeneficiary,
        beneficiaryData
      );

      this.log('info', 'Beneficiary created successfully', {
        beneficiaryId: response.beneficiary_id,
        status: response.beneficiary_status
      });

      // Save beneficiary to database
      if (existingBeneficiary) {
        existingBeneficiary.beneficiaryStatus = response.beneficiary_status;
        existingBeneficiary.cashfreeResponse = response;
        existingBeneficiary.updatedOn = new Date();
        await existingBeneficiary.save();
      } else {
        existingBeneficiary = new CashfreeBeneficiary({
          seller: sellerId,
          beneficiaryId: response.beneficiary_id,
          beneficiaryName: response.beneficiary_name,
          bankAccountNumber: seller.bankDetails.accountNumber,
          bankIfsc: seller.bankDetails.ifscCode,
          bankName: seller.bankDetails.bankName || '',
          beneficiaryEmail: seller.email,
          beneficiaryPhone: seller.mobileNumber,
          beneficiaryAddress: seller.shop.address,
          beneficiaryCity: seller.shop.city || 'Mumbai',
          beneficiaryState: seller.shop.state || 'Maharashtra',
          beneficiaryPostalCode: seller.shop.postalCode || '400001',
          beneficiaryStatus: response.beneficiary_status,
          cashfreeResponse: response
        });
        await existingBeneficiary.save();
      }

      // Update verification status based on response
      if (response.beneficiary_status === 'VERIFIED') {
        await existingBeneficiary.markAsVerified(response);
      } else if (response.beneficiary_status === 'INVALID') {
        await existingBeneficiary.markAsFailed('Invalid bank details', response);
      }

      return existingBeneficiary;
    } catch (error) {
      this.log('error', 'Failed to create beneficiary', {
        sellerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get beneficiary details
   */
  async getBeneficiary(beneficiaryId) {
    try {
      this.log('info', 'Getting beneficiary details', { beneficiaryId });

      const response = await this.makeRequest(
        'GET',
        `${endpoints.getBeneficiary}?beneficiary_id=${beneficiaryId}`
      );

      this.log('info', 'Beneficiary details retrieved', {
        beneficiaryId: response.beneficiary_id,
        status: response.beneficiary_status
      });

      return response;
    } catch (error) {
      this.log('error', 'Failed to get beneficiary', {
        beneficiaryId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove beneficiary
   */
  async removeBeneficiary(beneficiaryId) {
    try {
      this.log('info', 'Removing beneficiary', { beneficiaryId });

      const response = await this.makeRequest(
        'DELETE',
        `${endpoints.removeBeneficiary}?beneficiary_id=${beneficiaryId}`
      );

      // Update database
      const beneficiary = await CashfreeBeneficiary.findOne({ beneficiaryId });
      if (beneficiary) {
        await beneficiary.softDelete();
      }

      this.log('info', 'Beneficiary removed successfully', { beneficiaryId });
      return response;
    } catch (error) {
      this.log('error', 'Failed to remove beneficiary', {
        beneficiaryId,
        error: error.message
      });
      throw error;
    }
  }

  // ========================================
  // TRANSFER MANAGEMENT
  // ========================================

  /**
   * Create standard transfer
   */
  async createStandardTransfer(transferData) {
    try {
      this.log('info', 'Creating standard transfer', {
        transferId: transferData.transfer_id,
        amount: transferData.transfer_amount
      });

      const response = await this.makeRequest(
        'POST',
        endpoints.standardTransfer,
        transferData
      );

      this.log('info', 'Standard transfer created', {
        transferId: response.transfer_id,
        cfTransferId: response.cf_transfer_id,
        status: response.status
      });

      return response;
    } catch (error) {
      this.log('error', 'Failed to create standard transfer', {
        transferId: transferData.transfer_id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create batch transfer
   */
  async createBatchTransfer(batchData) {
    try {
      this.log('info', 'Creating batch transfer', {
        batchId: batchData.batch_transfer_id,
        transferCount: batchData.transfers.length
      });

      const response = await this.makeRequest(
        'POST',
        endpoints.batchTransfer,
        batchData
      );

      this.log('info', 'Batch transfer created', {
        batchId: response.batch_transfer_id,
        cfBatchId: response.cf_batch_transfer_id,
        status: response.status
      });

      return response;
    } catch (error) {
      this.log('error', 'Failed to create batch transfer', {
        batchId: batchData.batch_transfer_id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferId) {
    try {
      this.log('info', 'Getting transfer status', { transferId });

      const response = await this.makeRequest(
        'GET',
        `${endpoints.getTransferStatus}?transfer_id=${transferId}`
      );

      this.log('info', 'Transfer status retrieved', {
        transferId: response.transfer_id,
        status: response.status
      });

      return response;
    } catch (error) {
      this.log('error', 'Failed to get transfer status', {
        transferId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get batch transfer status
   */
  async getBatchTransferStatus(batchTransferId) {
    try {
      this.log('info', 'Getting batch transfer status', { batchTransferId });

      const response = await this.makeRequest(
        'GET',
        `${endpoints.getBatchTransferStatus}?batch_transfer_id=${batchTransferId}`
      );

      this.log('info', 'Batch transfer status retrieved', {
        batchId: response.batch_transfer_id,
        status: response.status
      });

      return response;
    } catch (error) {
      this.log('error', 'Failed to get batch transfer status', {
        batchTransferId,
        error: error.message
      });
      throw error;
    }
  }

  // ========================================
  // PAYOUT PROCESSING
  // ========================================

  /**
   * Process single payout
   */
  async processPayout(orderId) {
    try {
      this.log('info', 'Processing single payout', { orderId });

      // Get order details
      const order = await Order.findById(orderId)
        .populate('seller')
        .populate('user');
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Check payout eligibility
      if (!utils.isEligibleForPayout(order)) {
        throw new Error('Order is not eligible for payout');
      }

      // Get or create beneficiary
      let beneficiary = await CashfreeBeneficiary.findBySeller(order.seller._id);
      if (!beneficiary || !beneficiary.isVerified()) {
        beneficiary = await this.createBeneficiary(order.seller._id);
      }

      // Calculate commission
      const commission = utils.calculateCommission(order.totalPrice);

      // Generate transfer ID
      const transferId = utils.generateTransferId(orderId);

      // Prepare transfer data
      const transferData = {
        transfer_id: transferId,
        transfer_amount: utils.formatAmount(commission.sellerAmount),
        transfer_mode: 'banktransfer',
        beneficiary_details: {
          beneficiary_id: beneficiary.beneficiaryId
        },
        transfer_remarks: `Payout for order ${order.orderNumber}`
      };

      // Create transfer
      const cashfreeResponse = await this.createStandardTransfer(transferData);

      // Create payout record
      const payout = new Payout({
        order: orderId,
        seller: order.seller._id,
        beneficiary: beneficiary._id,
        transferId: transferId,
        cfTransferId: cashfreeResponse.cf_transfer_id,
        orderAmount: order.totalPrice,
        platformCommission: commission.platformCommission,
        gstAmount: commission.gst,
        totalCommission: commission.totalCommission,
        payoutAmount: commission.sellerAmount,
        status: transferStatusMap[cashfreeResponse.status] || 'pending',
        statusCode: cashfreeResponse.status_code,
        statusDescription: cashfreeResponse.status_description,
        transferMode: cashfreeResponse.transfer_mode,
        cashfreeResponse: cashfreeResponse
      });

      await payout.save();

      // Update order
      order.payout.status = 'processing';
      order.payout.commission = commission;
      order.payout.processed = true;
      order.payout.processedAt = new Date();
      order.payout.payoutId = payout._id;
      order.payout.transferId = transferId;
      order.payout.cfTransferId = cashfreeResponse.cf_transfer_id;
      await order.save();

      this.log('info', 'Payout processed successfully', {
        orderId,
        payoutId: payout._id,
        transferId,
        amount: commission.sellerAmount
      });

      return payout;
    } catch (error) {
      this.log('error', 'Failed to process payout', {
        orderId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process batch payouts
   */
  async processBatchPayouts(date = null) {
    try {
      const batchDate = date || new Date();
      const batchTransferId = utils.generateBatchTransferId();

      this.log('info', 'Processing batch payouts', {
        batchDate: batchDate.toISOString().split('T')[0],
        batchTransferId
      });

      // Find eligible orders
      const eligibleOrders = await this.getEligibleOrdersForPayout(batchDate);
      
      if (eligibleOrders.length === 0) {
        this.log('info', 'No eligible orders for payout', { batchDate });
        return { message: 'No eligible orders found', count: 0 };
      }

      // Group orders by seller
      const sellerGroups = this.groupOrdersBySeller(eligibleOrders);

      // Create batch transfer record
      const batchTransfer = new PayoutBatch({
        batchTransferId,
        batchDate,
        totalPayouts: eligibleOrders.length,
        totalAmount: eligibleOrders.reduce((sum, order) => {
          const commission = utils.calculateCommission(order.totalPrice);
          return sum + commission.sellerAmount;
        }, 0),
        status: 'pending'
      });

      await batchTransfer.save();

      // Prepare batch transfer data
      const transfers = [];
      const payouts = [];

      for (const [sellerId, orders] of sellerGroups) {
        // Get or create beneficiary
        let beneficiary = await CashfreeBeneficiary.findBySeller(sellerId);
        if (!beneficiary || !beneficiary.isVerified()) {
          beneficiary = await this.createBeneficiary(sellerId);
        }

        // Process each order for the seller
        for (const order of orders) {
          const commission = utils.calculateCommission(order.totalPrice);
          const transferId = utils.generateTransferId(order._id);

          transfers.push({
            transfer_id: transferId,
            transfer_amount: utils.formatAmount(commission.sellerAmount),
            transfer_mode: 'banktransfer',
            beneficiary_details: {
              beneficiary_id: beneficiary.beneficiaryId
            },
            transfer_remarks: `Payout for order ${order.orderNumber}`
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

      // Save all payouts
      await Payout.insertMany(payouts);

      // Update all orders
      await Promise.all(eligibleOrders.map(order => order.save()));

      // Create batch transfer
      const batchData = {
        batch_transfer_id: batchTransferId,
        transfers: transfers
      };

      const cashfreeResponse = await this.createBatchTransfer(batchData);

      // Update batch transfer record
      batchTransfer.cfBatchTransferId = cashfreeResponse.cf_batch_transfer_id;
      batchTransfer.status = 'initiated';
      batchTransfer.cashfreeResponse = cashfreeResponse;
      await batchTransfer.save();

      this.log('info', 'Batch payouts processed successfully', {
        batchTransferId,
        transferCount: transfers.length,
        totalAmount: batchTransfer.totalAmount
      });

      return {
        batchTransferId,
        transferCount: transfers.length,
        totalAmount: batchTransfer.totalAmount,
        payoutIds: payouts.map(p => p._id)
      };
    } catch (error) {
      this.log('error', 'Failed to process batch payouts', {
        error: error.message
      });
      throw error;
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Get eligible orders for payout
   */
  async getEligibleOrdersForPayout(date) {
    const targetDate = new Date(date);
    targetDate.setDate(targetDate.getDate() - commissionConfig.payoutDelayDays);

    return await Order.find({
      status: 'Delivered',
      isPaid: true,
      paymentStatus: 'completed',
      deliveredAt: { $lte: targetDate },
      'payout.processed': { $ne: true },
      'payout.status': { $ne: 'failed' }
    }).populate('seller');
  }

  /**
   * Group orders by seller
   */
  groupOrdersBySeller(orders) {
    const groups = new Map();
    
    orders.forEach(order => {
      const sellerId = order.seller._id.toString();
      if (!groups.has(sellerId)) {
        groups.set(sellerId, []);
      }
      groups.get(sellerId).push(order);
    });

    return groups;
  }

  /**
   * Update payout status from webhook
   */
  async updatePayoutStatus(webhookData) {
    try {
      this.log('info', 'Updating payout status from webhook', {
        transferId: webhookData.transfer_id,
        status: webhookData.status
      });

      const payout = await Payout.findOne({ 
        transferId: webhookData.transfer_id 
      });

      if (!payout) {
        this.log('warn', 'Payout not found for webhook', {
          transferId: webhookData.transfer_id
        });
        return null;
      }

      // Update payout status
      payout.status = transferStatusMap[webhookData.status] || 'pending';
      payout.statusCode = webhookData.status_code;
      payout.statusDescription = webhookData.status_description;
      payout.cfTransferId = webhookData.cf_transfer_id;
      
      if (webhookData.transfer_utr) {
        payout.transferUtr = webhookData.transfer_utr;
      }

      if (webhookData.status === 'SUCCESS' || webhookData.status === 'COMPLETED') {
        await payout.markAsCompleted(webhookData.transfer_utr, webhookData);
      } else if (webhookData.status === 'FAILED' || webhookData.status === 'REJECTED') {
        await payout.markAsFailed(
          webhookData.status_code,
          webhookData.status_description,
          webhookData
        );
      }

      await payout.save();

      // Update order payout status
      const order = await Order.findById(payout.order);
      if (order) {
        order.payout.status = payout.status;
        order.payout.transferUtr = payout.transferUtr;
        if (payout.status === 'completed') {
          order.payout.status = 'completed';
        } else if (payout.status === 'failed') {
          order.payout.status = 'failed';
          order.payout.payoutError = {
            code: payout.errorCode,
            message: payout.errorMessage,
            retryable: payout.retryable
          };
        }
        await order.save();
      }

      this.log('info', 'Payout status updated successfully', {
        payoutId: payout._id,
        status: payout.status
      });

      return payout;
    } catch (error) {
      this.log('error', 'Failed to update payout status', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      this.log('info', 'Performing health check');
      
      const response = await this.makeRequest('GET', endpoints.healthCheck);
      
      this.log('info', 'Health check successful', response);
      return { status: 'healthy', response };
    } catch (error) {
      this.log('error', 'Health check failed', { error: error.message });
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new CashfreePayoutService();

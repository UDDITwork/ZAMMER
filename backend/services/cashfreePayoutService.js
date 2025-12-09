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
   * Generate actionable error message based on error code
   */
  getActionableMessage(cashfreeCode, cashfreeMessage) {
    const actionableMessages = {
      'beneficiary_id_length_exceeded': 'Beneficiary ID must be 50 characters or less. Please use a shorter ID.',
      'beneficiary_id_invalid': 'Beneficiary ID contains invalid characters. Only letters, numbers, hyphen, underscore, pipe, and dot are allowed.',
      'beneficiary_id_already_exists': 'A beneficiary with this ID already exists. Please use a different beneficiary ID or update the existing beneficiary.',
      'beneficiary_already_exists': 'A beneficiary with these bank details already exists. Please check your existing beneficiary or use different bank details.',
      'bank_ifsc_missing': 'IFSC code is required when bank account number is provided. Please provide a valid IFSC code.',
      'bank_account_number_missing': 'Bank account number is required when IFSC code is provided. Please provide a valid bank account number.',
      'bank_account_number_length_exceeded': 'Bank account number must be 25 characters or less. Please check your account number.',
      'bank_account_number_length_short': 'Bank account number must be at least 4 characters long. Please check your account number.',
      'bank_account_number_invalid': 'Bank account number contains invalid characters. Only alphanumeric characters are allowed.',
      'bank_ifsc_invalid': 'Invalid IFSC code format. IFSC should be 11 characters: 4 letters + 0 + 6 characters (e.g., HDFC0000001).',
      'bank_account_number_same_as_source': 'Beneficiary bank account cannot be the same as the source account. Please use a different bank account.',
      'vba_beneficiary_not_allowed': 'Virtual bank accounts are not allowed for beneficiaries. Please use your actual bank account number.',
      'beneficiary_purpose_invalid': 'Invalid beneficiary purpose. Please provide a valid purpose.',
      'apis_not_enabled': 'Payout APIs are not enabled for your account. Please contact Cashfree support to enable payout APIs.',
      'insufficient_balance': 'Insufficient balance in your Cashfree account. Please add funds before creating transfers.',
      'transfer_limit_breach': 'Transfer amount exceeds the allowed limit. Please check your transfer limits.',
      'authentication_failed': 'Cashfree API authentication failed. Please verify that CASHFREE_PAYOUT_CLIENT_ID_PROD and CASHFREE_PAYOUT_SECRET_KEY_PROD are correctly set in your .env file and match your Cashfree merchant dashboard credentials.',
      'signature_missing': 'Signature missing in the request. Please configure CASHFREE_PAYOUT_PUBLIC_KEY_PROD or CASHFREE_PAYOUT_PUBLIC_KEY_PATH in your .env file and ensure Public Key 2FA is enabled in your Cashfree dashboard.',
      'invalid_signature': 'Invalid signature provided. Please verify your public key configuration and ensure it matches the one generated in your Cashfree dashboard.',
      'ip_not_whitelisted': 'IP address not whitelisted. Please either whitelist your IP address in Cashfree dashboard or configure Public Key 2FA by setting CASHFREE_PAYOUT_PUBLIC_KEY_PROD in your .env file.'
    };

    return actionableMessages[cashfreeCode] || cashfreeMessage || 'Please check your input and try again.';
  }

  /**
   * Error Handler - Handles Cashfree API error responses
   * Official Cashfree Error Response Format:
   * {
   *   "type": "invalid_request_error",
   *   "code": "beneficiary_id_already_exists",
   *   "message": "Beneficiary already exists with the given beneficiary_id"
   * }
   * 
   * @param {Error} error - Error object from axios
   * @param {string} operation - Operation name for logging
   * @returns {Object} - Formatted error response
   */
  handleError(error, operation) {
    if (error.response) {
      // Cashfree API returned an error response
      const { status, data } = error.response;
      
      // Log the actual error response for debugging
      this.log('error', `Cashfree API error response`, {
        status: status,
        code: data?.code,
        type: data?.type,
        message: data?.message,
        operation,
        fullResponse: data
      });
      
      // Extract error details from Cashfree response
      const cashfreeErrorMessage = data?.message || 'An error occurred';
      const cashfreeErrorCode = data?.code || '';
      const cashfreeErrorType = data?.type || 'unknown_error';
      
      // Map Cashfree error code to our internal code
      const mappedErrorCode = errorCodeMap[cashfreeErrorCode] || cashfreeErrorCode.toUpperCase();
      
      // Get actionable message
      const actionableMessage = this.getActionableMessage(cashfreeErrorCode, cashfreeErrorMessage);

      // Return formatted error response
      return {
        success: false,
        error: cashfreeErrorMessage,
        errorCode: mappedErrorCode,
        cashfreeCode: cashfreeErrorCode,
        cashfreeType: cashfreeErrorType,
        statusCode: status,
        details: data,
        actionableMessage: actionableMessage,
        operation
      };
    } else if (error.request) {
      // Network error - request sent but no response received
      this.log('error', 'Network error - No response received from Cashfree', {
        operation,
        requestUrl: error.config?.url
      });
      
      return {
        success: false,
        error: 'Network error - Unable to reach Cashfree servers',
        errorCode: 'NETWORK_ERROR',
        statusCode: 0,
        actionableMessage: 'Please check your internet connection and try again.',
        operation
      };
    } else {
      // Other errors (configuration, validation, etc.)
      this.log('error', 'General error', {
        message: error.message,
        operation,
        stack: error.stack
      });
      
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
        errorCode: 'UNKNOWN_ERROR',
        statusCode: 500,
        actionableMessage: 'Please try again later or contact support if the issue persists.',
        operation
      };
    }
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

        return { success: true, data: response.data };
      } catch (error) {
        lastError = error;
        
        this.log('error', `Request failed (attempt ${attempt})`, {
          status: error.response?.status,
          message: error.message,
          requestId: headers['x-request-id']
        });

        // Don't retry on client errors (4xx) - these are validation/authorization errors
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          return this.handleError(error, `${method} ${endpoint}`);
        }

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // After all retries failed, return formatted error
    if (!lastError) {
      return this.handleError(new Error('Request failed after retries'), `${method} ${endpoint}`);
    }
    return this.handleError(lastError, `${method} ${endpoint}`);
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
      let beneficiaryId = utils.generateBeneficiaryId(sellerId);
      
      // Validate beneficiary ID: max 50 chars, alphanumeric + underscore, pipe, dot
      if (beneficiaryId.length > 50) {
        // Truncate if too long, but keep it unique
        const sellerIdStr = sellerId.toString();
        const maxPrefixLength = 50 - sellerIdStr.length - 1; // -1 for underscore
        beneficiaryId = `SELLER_${sellerIdStr}`.substring(0, 50);
      }
      
      // Validate beneficiary ID format: only alphanumeric, underscore, pipe, dot
      if (!/^[a-zA-Z0-9._|-]+$/.test(beneficiaryId)) {
        // Sanitize if invalid characters found
        beneficiaryId = beneficiaryId.replace(/[^a-zA-Z0-9._|-]/g, '');
      }
      
      if (beneficiaryId.length === 0) {
        throw new Error('Invalid beneficiary ID format');
      }

      // Validate bank account number: 4-25 chars, alphanumeric only
      const accountNumber = seller.bankDetails.accountNumber.toString().trim();
      if (accountNumber.length < 4 || accountNumber.length > 25) {
        throw new Error('Bank account number must be between 4 and 25 characters');
      }
      if (!/^[a-zA-Z0-9]+$/.test(accountNumber)) {
        throw new Error('Bank account number must contain only alphanumeric characters');
      }

      // Validate IFSC code: exactly 11 chars, format: 4 letters + 0 + 6 chars
      const ifscCode = seller.bankDetails.ifscCode.toString().trim().toUpperCase();
      if (ifscCode.length !== 11) {
        throw new Error('IFSC code must be exactly 11 characters');
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
        throw new Error('Invalid IFSC code format. Must be 4 letters + 0 + 6 characters (e.g., HDFC0000001)');
      }

      // Validate email: must contain . and @, max 200 chars
      const email = seller.email || '';
      if (!email.includes('@') || !email.includes('.')) {
        throw new Error('Email must contain @ and . characters');
      }
      if (email.length > 200) {
        throw new Error('Email must be 200 characters or less');
      }

      // Prepare beneficiary data
      // Use accountHolderName from bankDetails if available, otherwise fallback to firstName
      let beneficiaryName = seller.bankDetails?.accountHolderName || seller.firstName || 'Unknown';
      
      // Sanitize beneficiary name: only alphabets and whitespaces, max 100 characters
      // Remove numbers, special characters, and trim whitespace
      beneficiaryName = beneficiaryName
        .replace(/[^a-zA-Z\s]/g, '') // Remove non-alphabetic characters except spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim()
        .substring(0, 100); // Max 100 characters
      
      if (!beneficiaryName || beneficiaryName.length < 2) {
        throw new Error('Beneficiary name must contain at least 2 alphabetic characters');
      }
      
      // Ensure shop exists before accessing its properties
      const shop = seller.shop || {};
      
      // Format phone number: strip country code and ensure 8-12 digits
      let phoneNumber = seller.mobileNumber || '';
      // Remove country code if present
      phoneNumber = phoneNumber.replace(/^\+91\s*/, '').replace(/^91\s*/, '');
      // Remove any non-digit characters
      phoneNumber = phoneNumber.replace(/\D/g, '');
      // Validate length (8-12 digits)
      if (phoneNumber.length < 8 || phoneNumber.length > 12) {
        throw new Error('Phone number must be 8-12 digits after removing country code');
      }
      
      // Validate and format postal code: numeric only, max 6 characters
      let postalCode = shop.postalCode || '400001';
      // Remove any non-numeric characters
      postalCode = postalCode.replace(/\D/g, '');
      // Ensure max 6 characters
      postalCode = postalCode.substring(0, 6);
      if (postalCode.length < 6) {
        postalCode = postalCode.padEnd(6, '0'); // Pad with zeros if less than 6 digits
      }
      
      // Prepare instrument details - only include VPA if provided and valid
      const instrumentDetails = {
        bank_account_number: accountNumber,
        bank_ifsc: ifscCode
      };
      
      // Only add VPA if it's provided and not empty
      // VPA format: alphanumeric with period, hyphen, underscore, and @
      // Hyphen only before @
      if (seller.bankDetails.vpa && seller.bankDetails.vpa.trim()) {
        const vpa = seller.bankDetails.vpa.trim();
        // Basic VPA validation: should contain @ and be alphanumeric with allowed special chars
        if (vpa.includes('@') && /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/.test(vpa)) {
          instrumentDetails.vpa = vpa;
        }
      }
      
      // Ensure address fields are not empty (API may require them)
      const address = shop.address || '';
      const city = shop.city || 'Mumbai';
      const state = shop.state || 'Maharashtra';
      
      const beneficiaryData = {
        beneficiary_id: beneficiaryId,
        beneficiary_name: beneficiaryName,
        beneficiary_instrument_details: instrumentDetails,
        beneficiary_contact_details: {
          beneficiary_email: email,
          beneficiary_phone: phoneNumber,
          beneficiary_country_code: '+91',
          beneficiary_address: address,
          beneficiary_city: city,
          beneficiary_state: state,
          beneficiary_postal_code: postalCode
        }
      };

      // Call Cashfree API
      const apiResponse = await this.makeRequest(
        'POST',
        endpoints.createBeneficiary,
        beneficiaryData
      );

      // Check if the response is an error
      if (!apiResponse.success) {
        // Create an error object with all Cashfree error details
        const error = new Error(apiResponse.error);
        error.cashfreeError = {
          errorCode: apiResponse.errorCode,
          cashfreeCode: apiResponse.cashfreeCode,
          cashfreeType: apiResponse.cashfreeType,
          statusCode: apiResponse.statusCode,
          details: apiResponse.details,
          actionableMessage: apiResponse.actionableMessage,
          operation: apiResponse.operation
        };
        throw error;
      }

      const response = apiResponse.data;

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
        error: error.message,
        cashfreeError: error.cashfreeError
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

      const apiResponse = await this.makeRequest(
        'GET',
        `${endpoints.getBeneficiary}?beneficiary_id=${beneficiaryId}`
      );

      if (!apiResponse.success) {
        const error = new Error(apiResponse.error);
        error.cashfreeError = {
          errorCode: apiResponse.errorCode,
          cashfreeCode: apiResponse.cashfreeCode,
          cashfreeType: apiResponse.cashfreeType,
          statusCode: apiResponse.statusCode,
          details: apiResponse.details,
          actionableMessage: apiResponse.actionableMessage,
          operation: apiResponse.operation
        };
        throw error;
      }

      const response = apiResponse.data;

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

      const apiResponse = await this.makeRequest(
        'DELETE',
        `${endpoints.removeBeneficiary}?beneficiary_id=${beneficiaryId}`
      );

      if (!apiResponse.success) {
        const error = new Error(apiResponse.error);
        error.cashfreeError = {
          errorCode: apiResponse.errorCode,
          cashfreeCode: apiResponse.cashfreeCode,
          cashfreeType: apiResponse.cashfreeType,
          statusCode: apiResponse.statusCode,
          details: apiResponse.details,
          actionableMessage: apiResponse.actionableMessage,
          operation: apiResponse.operation
        };
        throw error;
      }

      const response = apiResponse.data;

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

      const apiResponse = await this.makeRequest(
        'POST',
        endpoints.standardTransfer,
        transferData
      );

      if (!apiResponse.success) {
        const error = new Error(apiResponse.error);
        error.cashfreeError = {
          errorCode: apiResponse.errorCode,
          cashfreeCode: apiResponse.cashfreeCode,
          cashfreeType: apiResponse.cashfreeType,
          statusCode: apiResponse.statusCode,
          details: apiResponse.details,
          actionableMessage: apiResponse.actionableMessage,
          operation: apiResponse.operation
        };
        throw error;
      }

      const response = apiResponse.data;

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

      const apiResponse = await this.makeRequest(
        'POST',
        endpoints.batchTransfer,
        batchData
      );

      if (!apiResponse.success) {
        const error = new Error(apiResponse.error);
        error.cashfreeError = {
          errorCode: apiResponse.errorCode,
          cashfreeCode: apiResponse.cashfreeCode,
          cashfreeType: apiResponse.cashfreeType,
          statusCode: apiResponse.statusCode,
          details: apiResponse.details,
          actionableMessage: apiResponse.actionableMessage,
          operation: apiResponse.operation
        };
        throw error;
      }

      const response = apiResponse.data;

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

      const apiResponse = await this.makeRequest(
        'GET',
        `${endpoints.getTransferStatus}?transfer_id=${transferId}`
      );

      if (!apiResponse.success) {
        const error = new Error(apiResponse.error);
        error.cashfreeError = {
          errorCode: apiResponse.errorCode,
          cashfreeCode: apiResponse.cashfreeCode,
          cashfreeType: apiResponse.cashfreeType,
          statusCode: apiResponse.statusCode,
          details: apiResponse.details,
          actionableMessage: apiResponse.actionableMessage,
          operation: apiResponse.operation
        };
        throw error;
      }

      const response = apiResponse.data;

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

      const apiResponse = await this.makeRequest(
        'GET',
        `${endpoints.getBatchTransferStatus}?batch_transfer_id=${batchTransferId}`
      );

      if (!apiResponse.success) {
        const error = new Error(apiResponse.error);
        error.cashfreeError = {
          errorCode: apiResponse.errorCode,
          cashfreeCode: apiResponse.cashfreeCode,
          cashfreeType: apiResponse.cashfreeType,
          statusCode: apiResponse.statusCode,
          details: apiResponse.details,
          actionableMessage: apiResponse.actionableMessage,
          operation: apiResponse.operation
        };
        throw error;
      }

      const response = apiResponse.data;

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
      
      const apiResponse = await this.makeRequest('GET', endpoints.healthCheck);
      
      if (!apiResponse.success) {
        this.log('error', 'Health check failed', { error: apiResponse.error });
        return { status: 'unhealthy', error: apiResponse.error };
      }
      
      const response = apiResponse.data;
      this.log('info', 'Health check successful', response);
      return { status: 'healthy', response };
    } catch (error) {
      this.log('error', 'Health check failed', { error: error.message });
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new CashfreePayoutService();

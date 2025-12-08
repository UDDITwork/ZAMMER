// backend/config/cashfree.js - Cashfree Payouts V2 Configuration
require('dotenv').config();

const config = {
  development: {
    baseUrl: 'https://api.cashfree.com/payout',
    clientId: process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD || '',
    secretKey: process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD || '',
    apiVersion: '2024-01-01',
    webhookSecret: process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET_PROD || '',
    publicKey: process.env.CASHFREE_PAYOUT_PUBLIC_KEY_PROD || '',
    environment: 'development'
  },
  
  production: {
    baseUrl: 'https://api.cashfree.com/payout',
    clientId: process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD || '',
    secretKey: process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD || '',
    apiVersion: '2024-01-01',
    webhookSecret: process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET_PROD || '',
    publicKey: process.env.CASHFREE_PAYOUT_PUBLIC_KEY_PROD || '',
    environment: 'production'
  }
};

// Get current environment configuration - ROBUST VERSION
const getConfig = () => {
  // Always use production credentials (they work for both dev and prod)
  const productionConfig = config.production;
  
  // Validate required configuration
  if (!productionConfig.clientId || !productionConfig.secretKey) {
    throw new Error(`Cashfree Payouts configuration missing - check environment variables`);
  }
  
  // Return production config for both environments (Cashfree API is the same)
  return {
    ...productionConfig,
    environment: process.env.NODE_ENV || 'production'
  };
};

// API Endpoints
const endpoints = {
  // Beneficiary Management V2
  createBeneficiary: '/beneficiary',
  getBeneficiary: '/beneficiary',
  removeBeneficiary: '/beneficiary',
  
  // Transfer Management V2
  standardTransfer: '/v2/transfers',
  batchTransfer: '/v2/transfers/batch',
  getTransferStatus: '/v2/transfers',
  getBatchTransferStatus: '/v2/transfers/batch',
  
  // Utility Endpoints
  healthCheck: '/health',
  balance: '/account/balance',
  credentialsVerify: '/credentials/verify'
};

// Request Headers Template
const getHeaders = (requestId = null) => {
  const cfg = getConfig();
  const headers = {
    'Content-Type': 'application/json',
    'x-api-version': cfg.apiVersion,
    'x-client-id': cfg.clientId,
    'x-client-secret': cfg.secretKey
  };
  
  if (requestId) {
    headers['x-request-id'] = requestId;
  }
  
  return headers;
};

// Transfer Status Mapping
const transferStatusMap = {
  // Success Statuses
  'SUCCESS': 'completed',
  'COMPLETED': 'completed',
  'SENT_TO_BENEFICIARY': 'completed',
  
  // Pending Statuses
  'PENDING': 'pending',
  'RECEIVED': 'pending',
  'QUEUED': 'pending',
  'IN_PROCESS': 'pending',
  'SENT_TO_BANK': 'pending',
  'SCHEDULED_FOR_NEXT_WORKINGDAY': 'pending',
  
  // Failed Statuses
  'FAILED': 'failed',
  'REJECTED': 'failed',
  'MANUALLY_REJECTED': 'failed',
  'REVERSED': 'failed',
  
  // Approval Required
  'APPROVAL_PENDING': 'approval_pending'
};

// Commission Configuration
const commissionConfig = {
  platformCommission: 8.0, // 8% platform commission
  gstRate: 18.0, // 18% GST on commission
  minimumPayoutAmount: 100.0, // Minimum ₹100 for payout
  maximumPayoutAmount: 100000.0, // Maximum ₹1,00,000 per payout
  payoutDelayDays: 3, // Payout after 3 days of delivery
  batchProcessingTime: '00:00', // Daily batch at 12:00 AM
  retryAttempts: 3,
  retryDelayMinutes: 30
};

// Error Code Mapping
const errorCodeMap = {
  // Beneficiary Errors
  'beneficiary_not_found': 'BENEFICIARY_NOT_FOUND',
  'beneficiary_id_already_exists': 'BENEFICIARY_ID_EXISTS',
  'beneficiary_already_exists': 'BENEFICIARY_EXISTS',
  'beneficiary_id_length_exceeded': 'BENEFICIARY_ID_TOO_LONG',
  'beneficiary_id_invalid': 'BENEFICIARY_ID_INVALID',
  'beneficiary_purpose_invalid': 'BENEFICIARY_PURPOSE_INVALID',
  
  // Bank Account Errors
  'bank_ifsc_missing': 'IFSC_MISSING',
  'bank_account_number_missing': 'ACCOUNT_NUMBER_MISSING',
  'bank_account_number_length_exceeded': 'ACCOUNT_NUMBER_TOO_LONG',
  'bank_account_number_length_short': 'ACCOUNT_NUMBER_TOO_SHORT',
  'bank_account_number_invalid': 'ACCOUNT_NUMBER_INVALID',
  'bank_ifsc_invalid': 'IFSC_INVALID',
  'bank_account_number_same_as_source': 'ACCOUNT_SAME_AS_SOURCE',
  'vba_beneficiary_not_allowed': 'VBA_NOT_ALLOWED',
  'invalid_bene_account_or_ifsc': 'INVALID_BANK_DETAILS',
  
  // Transfer Errors
  'insufficient_balance': 'INSUFFICIENT_BALANCE',
  'transfer_limit_breach': 'TRANSFER_LIMIT_EXCEEDED',
  
  // API Errors
  'apis_not_enabled': 'API_NOT_ENABLED',
  'internal_server_error': 'SERVER_ERROR'
};

// Validation Rules
const validationRules = {
  beneficiaryId: {
    maxLength: 50,
    pattern: /^[a-zA-Z0-9._-]+$/,
    required: true
  },
  beneficiaryName: {
    maxLength: 100,
    pattern: /^[a-zA-Z\s]+$/,
    required: true
  },
  bankAccountNumber: {
    minLength: 4,
    maxLength: 25,
    pattern: /^[a-zA-Z0-9]+$/,
    required: true
  },
  ifscCode: {
    length: 11,
    pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    required: true
  },
  transferAmount: {
    min: 1.0,
    max: 100000.0,
    required: true
  },
  transferId: {
    maxLength: 40,
    pattern: /^[a-zA-Z0-9_]+$/,
    required: true
  }
};

// Utility Functions
const utils = {
  // Generate unique request ID
  generateRequestId: () => {
    return `CF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Calculate commission
  calculateCommission: (orderAmount) => {
    const commission = (orderAmount * commissionConfig.platformCommission) / 100;
    const gst = (commission * commissionConfig.gstRate) / 100;
    const totalCommission = commission + gst;
    const sellerAmount = orderAmount - totalCommission;
    
    return {
      orderAmount,
      platformCommission: commission,
      gst: gst,
      totalCommission: totalCommission,
      sellerAmount: Math.round(sellerAmount * 100) / 100 // Round to 2 decimal places
    };
  },
  
  // Validate payout eligibility
  isEligibleForPayout: (order) => {
    const now = new Date();
    const deliveryDate = new Date(order.deliveredAt);
    const daysDifference = (now - deliveryDate) / (1000 * 60 * 60 * 24);
    
    return (
      order.status === 'Delivered' &&
      order.isPaid === true &&
      order.paymentStatus === 'completed' &&
      daysDifference >= commissionConfig.payoutDelayDays &&
      !order.payoutProcessed &&
      order.payoutStatus !== 'failed'
    );
  },
  
  // Format amount for Cashfree API
  formatAmount: (amount) => {
    return Math.round(amount * 100) / 100; // Ensure 2 decimal places
  },
  
  // Generate beneficiary ID
  generateBeneficiaryId: (sellerId) => {
    return `SELLER_${sellerId.toString()}`;
  },
  
  // Generate transfer ID
  generateTransferId: (orderId) => {
    return `ORDER_${orderId.toString()}`;
  },
  
  // Generate batch transfer ID
  generateBatchTransferId: () => {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '');
    return `BATCH_${dateStr}_${timeStr}`;
  }
};

// Logging Configuration
const logging = {
  enabled: process.env.CASHFREE_LOGGING_ENABLED === 'true',
  logLevel: process.env.CASHFREE_LOG_LEVEL || 'info',
  logFile: process.env.CASHFREE_LOG_FILE || 'cashfree-payouts.log'
};

module.exports = {
  getConfig,
  endpoints,
  getHeaders,
  transferStatusMap,
  commissionConfig,
  errorCodeMap,
  validationRules,
  utils,
  logging
};

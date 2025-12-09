// backend/config/cashfree.js - Cashfree Payouts V2 Configuration
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = {
  development: {
    baseUrl: 'https://api.cashfree.com/payout',
    clientId: process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD || '',
    secretKey: process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD || '',
    apiVersion: '2024-01-01',
    webhookSecret: process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET_PROD || '',
    publicKey: process.env.CASHFREE_PAYOUT_PUBLIC_KEY_PROD || '',
    publicKeyPath: process.env.CASHFREE_PAYOUT_PUBLIC_KEY_PATH || '',
    environment: 'development'
  },
  
  production: {
    baseUrl: 'https://api.cashfree.com/payout',
    clientId: process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD || '',
    secretKey: process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD || '',
    apiVersion: '2024-01-01',
    webhookSecret: process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET_PROD || '',
    publicKey: process.env.CASHFREE_PAYOUT_PUBLIC_KEY_PROD || '',
    publicKeyPath: process.env.CASHFREE_PAYOUT_PUBLIC_KEY_PATH || '',
    environment: 'production'
  }
};

/**
 * Load public key from environment variable or file path
 */
const loadPublicKey = () => {
  const productionConfig = config.production;
  
  // Try to load from environment variable first (PEM format string)
  if (productionConfig.publicKey && productionConfig.publicKey.trim()) {
    try {
      let publicKeyContent = productionConfig.publicKey.trim();
      
      // Handle multiline PEM format (common in .env files with \n)
      publicKeyContent = publicKeyContent.replace(/\\n/g, '\n');
      
      // If it's already a PEM-formatted string, use it directly
      if (publicKeyContent.includes('BEGIN PUBLIC KEY')) {
        return publicKeyContent;
      }
      
      // If it's base64 encoded without PEM headers, try to decode and format
      try {
        const decoded = Buffer.from(publicKeyContent, 'base64').toString('utf8');
        if (decoded.includes('BEGIN PUBLIC KEY')) {
          return decoded;
        }
      } catch (e) {
        // Not base64, continue
      }
      
      // If it's just the key content without headers, add PEM headers
      const cleanKey = publicKeyContent.replace(/\s+/g, '');
      if (cleanKey.length > 100) { // Likely a public key
        const formattedKey = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;
        return `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
      }
      
      // Return as-is if we can't determine format
      return publicKeyContent;
    } catch (error) {
      console.warn('⚠️ [CASHFREE] Failed to load public key from env variable:', error.message);
    }
  }
  
  // Try to load from file path
  if (productionConfig.publicKeyPath && productionConfig.publicKeyPath.trim()) {
    try {
      const keyPath = path.isAbsolute(productionConfig.publicKeyPath) 
        ? productionConfig.publicKeyPath 
        : path.join(process.cwd(), productionConfig.publicKeyPath);
      
      if (fs.existsSync(keyPath)) {
        const publicKeyContent = fs.readFileSync(keyPath, 'utf8');
        return publicKeyContent.trim();
      } else {
        console.warn(`⚠️ [CASHFREE] Public key file not found at: ${keyPath}`);
      }
    } catch (error) {
      console.warn('⚠️ [CASHFREE] Failed to load public key from file:', error.message);
    }
  }
  
  return null;
};

// Get current environment configuration - ROBUST VERSION
const getConfig = () => {
  // Always use production credentials (they work for both dev and prod)
  const productionConfig = config.production;
  
  // Validate required configuration
  if (!productionConfig.clientId || !productionConfig.secretKey) {
    throw new Error(`Cashfree Payouts configuration missing - check environment variables`);
  }
  
  // Load public key if available
  const publicKey = loadPublicKey();
  
  // Return production config for both environments (Cashfree API is the same)
  return {
    ...productionConfig,
    publicKey: publicKey,
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

// Signature cache (expires after 10 minutes)
let signatureCache = {
  signature: null,
  timestamp: null,
  expiresAt: null
};

/**
 * Generate Cashfree 2FA signature using Public Key
 * Signature format: RSA-OAEP encrypted (clientId + "." + unixTimestamp)
 */
const generateCashfreeSignature = () => {
  const cfg = getConfig();
  
  // Check if public key is available
  if (!cfg.publicKey) {
    return null; // No signature if public key not configured (fallback to IP whitelist)
  }
  
  // Check if cached signature is still valid (expires after 10 minutes)
  const now = Date.now();
  if (signatureCache.signature && signatureCache.expiresAt && now < signatureCache.expiresAt) {
    return signatureCache.signature;
  }
  
  try {
    // Get current Unix timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create data to encrypt: clientId + "." + timestamp
    const dataToEncrypt = `${cfg.clientId}.${timestamp}`;
    
    // Load public key
    let publicKeyContent = cfg.publicKey;
    
    // Ensure public key is in proper PEM format
    if (!publicKeyContent.includes('BEGIN PUBLIC KEY')) {
      // If it's base64 encoded, decode it
      try {
        publicKeyContent = Buffer.from(publicKeyContent, 'base64').toString('utf8');
      } catch (e) {
        // If not base64, use as-is
      }
      
      // Add PEM headers if missing
      if (!publicKeyContent.includes('BEGIN PUBLIC KEY')) {
        publicKeyContent = publicKeyContent
          .replace(/\s+/g, '') // Remove whitespace
          .replace(/(.{64})/g, '$1\n'); // Add line breaks every 64 chars
        
        publicKeyContent = `-----BEGIN PUBLIC KEY-----\n${publicKeyContent}\n-----END PUBLIC KEY-----`;
      }
    }
    
    // Encrypt using RSA with OAEP padding
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyContent,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha1' // OAEP uses SHA-1 by default
      },
      Buffer.from(dataToEncrypt, 'utf8')
    );
    
    // Base64 encode the encrypted result
    const signature = encrypted.toString('base64');
    
    // Cache the signature (valid for 10 minutes)
    signatureCache = {
      signature: signature,
      timestamp: timestamp,
      expiresAt: now + (10 * 60 * 1000) // 10 minutes in milliseconds
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [CASHFREE] Signature generated successfully:', {
        timestamp: timestamp,
        expiresAt: new Date(signatureCache.expiresAt).toISOString(),
        signatureLength: signature.length
      });
    }
    
    return signature;
  } catch (error) {
    console.error('❌ [CASHFREE] Failed to generate signature:', error.message);
    console.error('❌ [CASHFREE] Signature generation error details:', {
      hasPublicKey: !!cfg.publicKey,
      publicKeyLength: cfg.publicKey?.length || 0,
      error: error.message,
      stack: error.stack
    });
    return null; // Return null on error (fallback to IP whitelist)
  }
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
  
  // Add signature if public key is configured
  const signature = generateCashfreeSignature();
  if (signature) {
    headers['x-cf-signature'] = signature;
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
  'internal_server_error': 'SERVER_ERROR',
  'authentication_failed': 'AUTHENTICATION_FAILED',
  'signature_missing': 'SIGNATURE_MISSING',
  'invalid_signature': 'INVALID_SIGNATURE',
  'ip_not_whitelisted': 'IP_NOT_WHITELISTED'
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
  generateCashfreeSignature,
  transferStatusMap,
  commissionConfig,
  errorCodeMap,
  validationRules,
  utils,
  logging
};

// backend/test-cashfree-integration.js - Comprehensive Test Suite for Cashfree Payouts V2
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');

// Import all modules to test
const CashfreePayoutService = require('./services/cashfreePayoutService');
const BatchPayoutService = require('./services/batchPayoutService');
const PayoutCalculationService = require('./services/payoutCalculationService');
const payoutNotificationService = require('./services/payoutNotificationService');
const { getConfig, utils, commissionConfig, validationRules } = require('./config/cashfree');

// Import models
const CashfreeBeneficiary = require('./models/CashfreeBeneficiary');
const Payout = require('./models/Payout');
const PayoutBatch = require('./models/PayoutBatch');
const Order = require('./models/Order');
const Seller = require('./models/Seller');
const User = require('./models/User');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5000/api',
  testSellerId: null,
  testOrderId: null,
  testUserId: null,
  testBeneficiaryId: null,
  testPayoutId: null,
  testBatchId: null
};

class CashfreeIntegrationTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      warnings: [],
      mismatches: [],
      inconsistencies: []
    };
    this.testData = {};
  }

  /**
   * Log test results
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [CASHFREE_TEST] ${message}`;
    
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Record test result
   */
  recordResult(testName, passed, error = null, warning = null, mismatch = null, inconsistency = null) {
    if (passed) {
      this.testResults.passed++;
      this.log('info', `✅ PASSED: ${testName}`);
    } else {
      this.testResults.failed++;
      this.log('error', `❌ FAILED: ${testName}`, error);
      this.testResults.errors.push({ test: testName, error: error?.message || error });
    }

    if (warning) {
      this.testResults.warnings.push({ test: testName, warning });
      this.log('warn', `⚠️ WARNING: ${testName} - ${warning}`);
    }

    if (mismatch) {
      this.testResults.mismatches.push({ test: testName, mismatch });
      this.log('warn', `🔍 MISMATCH: ${testName} - ${mismatch}`);
    }

    if (inconsistency) {
      this.testResults.inconsistencies.push({ test: testName, inconsistency });
      this.log('warn', `🔄 INCONSISTENCY: ${testName} - ${inconsistency}`);
    }
  }

  /**
   * Test 1: Configuration and Environment Variables
   */
  async testConfiguration() {
    this.log('info', 'Testing configuration and environment variables...');

    try {
      // Test Cashfree configuration
      const config = getConfig();
      
      // Check required environment variables
      const requiredEnvVars = [
        'CASHFREE_PAYOUT_CLIENT_ID_DEV',
        'CASHFREE_PAYOUT_SECRET_KEY_DEV',
        'CASHFREE_PAYOUT_WEBHOOK_SECRET_DEV',
        'CASHFREE_PAYOUT_PUBLIC_KEY_DEV'
      ];

      let missingVars = [];
      requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
          missingVars.push(varName);
        }
      });

      if (missingVars.length > 0) {
        this.recordResult('Environment Variables', false, `Missing environment variables: ${missingVars.join(', ')}`);
      } else {
        this.recordResult('Environment Variables', true);
      }

      // Test configuration structure
      const configKeys = ['baseUrl', 'clientId', 'secretKey', 'apiVersion', 'webhookSecret', 'publicKey', 'environment'];
      let missingKeys = [];
      configKeys.forEach(key => {
        if (!config[key]) {
          missingKeys.push(key);
        }
      });

      if (missingKeys.length > 0) {
        this.recordResult('Configuration Structure', false, `Missing configuration keys: ${missingKeys.join(', ')}`);
      } else {
        this.recordResult('Configuration Structure', true);
      }

      // Test commission configuration
      const commissionKeys = ['platformCommission', 'gstRate', 'minimumPayoutAmount', 'maximumPayoutAmount', 'payoutDelayDays'];
      let missingCommissionKeys = [];
      commissionKeys.forEach(key => {
        if (commissionConfig[key] === undefined) {
          missingCommissionKeys.push(key);
        }
      });

      if (missingCommissionKeys.length > 0) {
        this.recordResult('Commission Configuration', false, `Missing commission config keys: ${missingCommissionKeys.join(', ')}`);
      } else {
        this.recordResult('Commission Configuration', true);
      }

      // Test validation rules
      const validationKeys = ['beneficiaryId', 'beneficiaryName', 'bankAccountNumber', 'ifscCode', 'transferAmount'];
      let missingValidationKeys = [];
      validationKeys.forEach(key => {
        if (!validationRules[key]) {
          missingValidationKeys.push(key);
        }
      });

      if (missingValidationKeys.length > 0) {
        this.recordResult('Validation Rules', false, `Missing validation rules: ${missingValidationKeys.join(', ')}`);
      } else {
        this.recordResult('Validation Rules', true);
      }

    } catch (error) {
      this.recordResult('Configuration Test', false, error);
    }
  }

  /**
   * Test 2: Database Models and Schema Validation
   */
  async testDatabaseModels() {
    this.log('info', 'Testing database models and schema validation...');

    try {
      // Test CashfreeBeneficiary model
      const beneficiarySchema = CashfreeBeneficiary.schema;
      const beneficiaryRequiredFields = ['seller', 'beneficiaryId', 'beneficiaryName', 'bankAccountNumber', 'bankIfsc'];
      
      let missingBeneficiaryFields = [];
      beneficiaryRequiredFields.forEach(field => {
        if (!beneficiarySchema.paths[field]) {
          missingBeneficiaryFields.push(field);
        }
      });

      if (missingBeneficiaryFields.length > 0) {
        this.recordResult('CashfreeBeneficiary Schema', false, `Missing required fields: ${missingBeneficiaryFields.join(', ')}`);
      } else {
        this.recordResult('CashfreeBeneficiary Schema', true);
      }

      // Test Payout model
      const payoutSchema = Payout.schema;
      const payoutRequiredFields = ['order', 'seller', 'beneficiary', 'transferId', 'orderAmount', 'payoutAmount'];
      
      let missingPayoutFields = [];
      payoutRequiredFields.forEach(field => {
        if (!payoutSchema.paths[field]) {
          missingPayoutFields.push(field);
        }
      });

      if (missingPayoutFields.length > 0) {
        this.recordResult('Payout Schema', false, `Missing required fields: ${missingPayoutFields.join(', ')}`);
      } else {
        this.recordResult('Payout Schema', true);
      }

      // Test PayoutBatch model
      const batchSchema = PayoutBatch.schema;
      const batchRequiredFields = ['batchTransferId', 'totalPayouts', 'totalAmount', 'status'];
      
      let missingBatchFields = [];
      batchRequiredFields.forEach(field => {
        if (!batchSchema.paths[field]) {
          missingBatchFields.push(field);
        }
      });

      if (missingBatchFields.length > 0) {
        this.recordResult('PayoutBatch Schema', false, `Missing required fields: ${missingBatchFields.join(', ')}`);
      } else {
        this.recordResult('PayoutBatch Schema', true);
      }

      // Test enum values consistency
      const beneficiaryStatusEnum = beneficiarySchema.paths.beneficiaryStatus.enumValues;
      const expectedBeneficiaryStatuses = ['VERIFIED', 'INVALID', 'INITIATED', 'CANCELLED', 'FAILED', 'DELETED'];
      
      let statusMismatch = false;
      expectedBeneficiaryStatuses.forEach(status => {
        if (!beneficiaryStatusEnum.includes(status)) {
          statusMismatch = true;
        }
      });

      if (statusMismatch) {
        this.recordResult('Beneficiary Status Enum', false, 'Beneficiary status enum values do not match expected values');
      } else {
        this.recordResult('Beneficiary Status Enum', true);
      }

      // Test payout status enum
      const payoutStatusEnum = payoutSchema.paths.status.enumValues;
      const expectedPayoutStatuses = ['pending', 'initiated', 'processing', 'completed', 'failed', 'cancelled', 'reversed', 'approval_pending'];
      
      let payoutStatusMismatch = false;
      expectedPayoutStatuses.forEach(status => {
        if (!payoutStatusEnum.includes(status)) {
          payoutStatusMismatch = true;
        }
      });

      if (payoutStatusMismatch) {
        this.recordResult('Payout Status Enum', false, 'Payout status enum values do not match expected values');
      } else {
        this.recordResult('Payout Status Enum', true);
      }

    } catch (error) {
      this.recordResult('Database Models Test', false, error);
    }
  }

  /**
   * Test 3: Service Layer Integration
   */
  async testServiceLayer() {
    this.log('info', 'Testing service layer integration...');

    try {
      // Test CashfreePayoutService methods
      const serviceMethods = [
        'createBeneficiary',
        'getBeneficiary',
        'removeBeneficiary',
        'createStandardTransfer',
        'createBatchTransfer',
        'getTransferStatus',
        'getBatchTransferStatus',
        'processPayout',
        'processBatchPayouts',
        'updatePayoutStatus',
        'healthCheck'
      ];

      let missingMethods = [];
      serviceMethods.forEach(method => {
        if (typeof CashfreePayoutService[method] !== 'function') {
          missingMethods.push(method);
        }
      });

      if (missingMethods.length > 0) {
        this.recordResult('CashfreePayoutService Methods', false, `Missing methods: ${missingMethods.join(', ')}`);
      } else {
        this.recordResult('CashfreePayoutService Methods', true);
      }

      // Test BatchPayoutService methods
      const batchMethods = [
        'initializeScheduler',
        'startScheduler',
        'stopScheduler',
        'processDailyBatchPayouts',
        'checkPayoutStatuses',
        'retryFailedPayouts',
        'processManualBatchPayout',
        'getBatchPayoutStatus',
        'getBatchPayoutHistory'
      ];

      let missingBatchMethods = [];
      batchMethods.forEach(method => {
        if (typeof BatchPayoutService[method] !== 'function') {
          missingBatchMethods.push(method);
        }
      });

      if (missingBatchMethods.length > 0) {
        this.recordResult('BatchPayoutService Methods', false, `Missing methods: ${missingBatchMethods.join(', ')}`);
      } else {
        this.recordResult('BatchPayoutService Methods', true);
      }

      // Test PayoutCalculationService methods
      const calculationMethods = [
        'calculateCommission',
        'isEligibleForPayout',
        'getEligibleOrdersForPayout',
        'groupOrdersBySeller',
        'validateSellerPayoutEligibility',
        'calculateDailyPayoutSummary',
        'getPayoutEligibilityStats',
        'processPayoutEligibilityBatch'
      ];

      let missingCalculationMethods = [];
      calculationMethods.forEach(method => {
        if (typeof PayoutCalculationService[method] !== 'function') {
          missingCalculationMethods.push(method);
        }
      });

      if (missingCalculationMethods.length > 0) {
        this.recordResult('PayoutCalculationService Methods', false, `Missing methods: ${missingCalculationMethods.join(', ')}`);
      } else {
        this.recordResult('PayoutCalculationService Methods', true);
      }

      // Test notification service methods
      const notificationMethods = [
        'sendPayoutStatusNotification',
        'sendBatchPayoutNotifications',
        'sendBeneficiaryNotification',
        'sendPayoutReminderNotification'
      ];

      let missingNotificationMethods = [];
      notificationMethods.forEach(method => {
        if (typeof payoutNotificationService[method] !== 'function') {
          missingNotificationMethods.push(method);
        }
      });

      if (missingNotificationMethods.length > 0) {
        this.recordResult('NotificationService Methods', false, `Missing methods: ${missingNotificationMethods.join(', ')}`);
      } else {
        this.recordResult('NotificationService Methods', true);
      }

    } catch (error) {
      this.recordResult('Service Layer Test', false, error);
    }
  }

  /**
   * Test 4: API Endpoints and Controllers
   */
  async testAPIEndpoints() {
    this.log('info', 'Testing API endpoints and controllers...');

    try {
      // Test payout controller methods
      const payoutController = require('./controllers/payoutController');
      const controllerMethods = [
        'createBeneficiary',
        'getBeneficiary',
        'updateBeneficiary',
        'getPayoutHistory',
        'getPayoutStats',
        'getAllBeneficiaries',
        'getAllPayouts',
        'getPayoutAnalytics',
        'processBatchPayouts',
        'processSinglePayout',
        'getBatchPayoutStatus',
        'getBatchPayoutHistory',
        'getPayoutEligibilityStats',
        'updateOrderPayoutEligibility',
        'handleWebhook',
        'healthCheck'
      ];

      let missingControllerMethods = [];
      controllerMethods.forEach(method => {
        if (typeof payoutController[method] !== 'function') {
          missingControllerMethods.push(method);
        }
      });

      if (missingControllerMethods.length > 0) {
        this.recordResult('PayoutController Methods', false, `Missing methods: ${missingControllerMethods.join(', ')}`);
      } else {
        this.recordResult('PayoutController Methods', true);
      }

      // Test payout routes
      const payoutRoutes = require('./routes/payoutRoutes');
      if (!payoutRoutes) {
        this.recordResult('Payout Routes', false, 'Payout routes module not found');
      } else {
        this.recordResult('Payout Routes', true);
      }

    } catch (error) {
      this.recordResult('API Endpoints Test', false, error);
    }
  }

  /**
   * Test 5: Variable Name Consistency
   */
  async testVariableNameConsistency() {
    this.log('info', 'Testing variable name consistency...');

    try {
      // Test configuration variable names
      const config = getConfig();
      const expectedConfigKeys = ['baseUrl', 'clientId', 'secretKey', 'apiVersion', 'webhookSecret', 'publicKey', 'environment'];
      
      let configKeyMismatches = [];
      expectedConfigKeys.forEach(key => {
        if (!config.hasOwnProperty(key)) {
          configKeyMismatches.push(key);
        }
      });

      if (configKeyMismatches.length > 0) {
        this.recordResult('Configuration Key Names', false, `Missing or mismatched config keys: ${configKeyMismatches.join(', ')}`);
      } else {
        this.recordResult('Configuration Key Names', true);
      }

      // Test commission configuration variable names
      const expectedCommissionKeys = ['platformCommission', 'gstRate', 'minimumPayoutAmount', 'maximumPayoutAmount', 'payoutDelayDays', 'batchProcessingTime', 'retryAttempts', 'retryDelayMinutes'];
      
      let commissionKeyMismatches = [];
      expectedCommissionKeys.forEach(key => {
        if (!commissionConfig.hasOwnProperty(key)) {
          commissionKeyMismatches.push(key);
        }
      });

      if (commissionKeyMismatches.length > 0) {
        this.recordResult('Commission Config Key Names', false, `Missing or mismatched commission config keys: ${commissionKeyMismatches.join(', ')}`);
      } else {
        this.recordResult('Commission Config Key Names', true);
      }

      // Test validation rules variable names
      const expectedValidationKeys = ['beneficiaryId', 'beneficiaryName', 'bankAccountNumber', 'ifscCode', 'transferAmount', 'transferId'];
      
      let validationKeyMismatches = [];
      expectedValidationKeys.forEach(key => {
        if (!validationRules.hasOwnProperty(key)) {
          validationKeyMismatches.push(key);
        }
      });

      if (validationKeyMismatches.length > 0) {
        this.recordResult('Validation Rules Key Names', false, `Missing or mismatched validation rule keys: ${validationKeyMismatches.join(', ')}`);
      } else {
        this.recordResult('Validation Rules Key Names', true);
      }

      // Test model field name consistency
      const beneficiarySchema = CashfreeBeneficiary.schema;
      const expectedBeneficiaryFields = [
        'seller', 'beneficiaryId', 'beneficiaryName', 'bankAccountNumber', 'bankIfsc', 'bankName',
        'beneficiaryEmail', 'beneficiaryPhone', 'beneficiaryCountryCode', 'beneficiaryAddress',
        'beneficiaryCity', 'beneficiaryState', 'beneficiaryPostalCode', 'vpa',
        'beneficiaryStatus', 'verificationStatus', 'verificationAttempts', 'lastVerificationAttempt',
        'verificationNotes', 'cashfreeResponse', 'addedOn', 'updatedOn', 'isActive', 'deletedAt'
      ];

      let beneficiaryFieldMismatches = [];
      expectedBeneficiaryFields.forEach(field => {
        if (!beneficiarySchema.paths[field]) {
          beneficiaryFieldMismatches.push(field);
        }
      });

      if (beneficiaryFieldMismatches.length > 0) {
        this.recordResult('Beneficiary Model Field Names', false, `Missing or mismatched beneficiary fields: ${beneficiaryFieldMismatches.join(', ')}`);
      } else {
        this.recordResult('Beneficiary Model Field Names', true);
      }

      // Test payout model field name consistency
      const payoutSchema = Payout.schema;
      const expectedPayoutFields = [
        'order', 'seller', 'beneficiary', 'transferId', 'cfTransferId', 'orderAmount',
        'platformCommission', 'gstAmount', 'totalCommission', 'payoutAmount', 'status',
        'statusCode', 'statusDescription', 'transferMode', 'transferUtr', 'fundsourceId',
        'batchTransferId', 'cfBatchTransferId', 'processingAttempts', 'lastProcessingAttempt',
        'nextRetryAt', 'errorCode', 'errorMessage', 'retryable', 'initiatedAt', 'processedAt',
        'completedAt', 'failedAt', 'cashfreeResponse', 'notes', 'createdBy', 'updatedBy'
      ];

      let payoutFieldMismatches = [];
      expectedPayoutFields.forEach(field => {
        // Check for nested fields like adminApproval.status
        if (field.includes('.')) {
          const [parentField, childField] = field.split('.');
          if (!payoutSchema.paths[parentField] || !payoutSchema.paths[parentField].schema?.paths[childField]) {
            payoutFieldMismatches.push(field);
          }
        } else if (!payoutSchema.paths[field]) {
          payoutFieldMismatches.push(field);
        }
      });

      if (payoutFieldMismatches.length > 0) {
        this.recordResult('Payout Model Field Names', false, `Missing or mismatched payout fields: ${payoutFieldMismatches.join(', ')}`);
      } else {
        this.recordResult('Payout Model Field Names', true);
      }

    } catch (error) {
      this.recordResult('Variable Name Consistency Test', false, error);
    }
  }

  /**
   * Test 6: Webhook Signature Verification
   */
  async testWebhookSignatureVerification() {
    this.log('info', 'Testing webhook signature verification...');

    try {
      // Test signature generation
      const testPayload = JSON.stringify({ test: 'data' });
      const testSecret = 'test-secret';
      
      const payoutService = new (require('../services/cashfreePayoutService'))();
      const signature = payoutService.generateSignature(testPayload, testSecret);
      
      if (!signature || typeof signature !== 'string') {
        this.recordResult('Webhook Signature Generation', false, 'Failed to generate signature');
      } else {
        this.recordResult('Webhook Signature Generation', true);
      }

      // Test signature verification
      const isValid = payoutService.verifyWebhookSignature(testPayload, signature, testSecret);
      
      if (!isValid) {
        this.recordResult('Webhook Signature Verification', false, 'Failed to verify signature');
      } else {
        this.recordResult('Webhook Signature Verification', true);
      }

      // Test with invalid signature
      const invalidSignature = 'invalid-signature';
      const isInvalid = payoutService.verifyWebhookSignature(testPayload, invalidSignature, testSecret);
      
      if (isInvalid) {
        this.recordResult('Webhook Invalid Signature Detection', false, 'Failed to detect invalid signature');
      } else {
        this.recordResult('Webhook Invalid Signature Detection', true);
      }

    } catch (error) {
      this.recordResult('Webhook Signature Test', false, error);
    }
  }

  /**
   * Test 7: Commission Calculation Logic
   */
  async testCommissionCalculation() {
    this.log('info', 'Testing commission calculation logic...');

    try {
      // Test commission calculation with various amounts
      const testAmounts = [100, 500, 1000, 5000, 10000];
      
      testAmounts.forEach(amount => {
        const commission = utils.calculateCommission(amount);
        
        // Validate commission structure
        const requiredKeys = ['orderAmount', 'platformCommission', 'gst', 'totalCommission', 'sellerAmount'];
        let missingKeys = [];
        requiredKeys.forEach(key => {
          if (!commission.hasOwnProperty(key)) {
            missingKeys.push(key);
          }
        });

        if (missingKeys.length > 0) {
          this.recordResult(`Commission Calculation Structure (${amount})`, false, `Missing keys: ${missingKeys.join(', ')}`);
        } else {
          this.recordResult(`Commission Calculation Structure (${amount})`, true);
        }

        // Validate commission values
        const expectedPlatformCommission = (amount * commissionConfig.platformCommission) / 100;
        const expectedGst = (expectedPlatformCommission * commissionConfig.gstRate) / 100;
        const expectedTotalCommission = expectedPlatformCommission + expectedGst;
        const expectedSellerAmount = amount - expectedTotalCommission;

        if (Math.abs(commission.platformCommission - expectedPlatformCommission) > 0.01) {
          this.recordResult(`Commission Platform Amount (${amount})`, false, `Expected: ${expectedPlatformCommission}, Got: ${commission.platformCommission}`);
        } else {
          this.recordResult(`Commission Platform Amount (${amount})`, true);
        }

        if (Math.abs(commission.gst - expectedGst) > 0.01) {
          this.recordResult(`Commission GST Amount (${amount})`, false, `Expected: ${expectedGst}, Got: ${commission.gst}`);
        } else {
          this.recordResult(`Commission GST Amount (${amount})`, true);
        }

        if (Math.abs(commission.totalCommission - expectedTotalCommission) > 0.01) {
          this.recordResult(`Commission Total Amount (${amount})`, false, `Expected: ${expectedTotalCommission}, Got: ${commission.totalCommission}`);
        } else {
          this.recordResult(`Commission Total Amount (${amount})`, true);
        }

        if (Math.abs(commission.sellerAmount - expectedSellerAmount) > 0.01) {
          this.recordResult(`Commission Seller Amount (${amount})`, false, `Expected: ${expectedSellerAmount}, Got: ${commission.sellerAmount}`);
        } else {
          this.recordResult(`Commission Seller Amount (${amount})`, true);
        }
      });

    } catch (error) {
      this.recordResult('Commission Calculation Test', false, error);
    }
  }

  /**
   * Test 8: Database Connection and Model Operations
   */
  async testDatabaseOperations() {
    this.log('info', 'Testing database operations...');

    try {
      // Test database connection
      if (mongoose.connection.readyState !== 1) {
        this.recordResult('Database Connection', false, 'Database not connected');
        return;
      } else {
        this.recordResult('Database Connection', true);
      }

      // Test model instantiation
      try {
        const testBeneficiary = new CashfreeBeneficiary({
          seller: new mongoose.Types.ObjectId(),
          beneficiaryId: 'TEST_BENEFICIARY_123',
          beneficiaryName: 'Test Beneficiary',
          bankAccountNumber: '1234567890',
          bankIfsc: 'SBIN0001234',
          bankName: 'State Bank of India',
          beneficiaryEmail: 'test@example.com',
          beneficiaryPhone: '9876543210',
          beneficiaryAddress: 'Test Address',
          beneficiaryCity: 'Mumbai',
          beneficiaryState: 'Maharashtra',
          beneficiaryPostalCode: '400001'
        });

        this.recordResult('Beneficiary Model Instantiation', true);
      } catch (error) {
        this.recordResult('Beneficiary Model Instantiation', false, error);
      }

      try {
        const testPayout = new Payout({
          order: new mongoose.Types.ObjectId(),
          seller: new mongoose.Types.ObjectId(),
          beneficiary: new mongoose.Types.ObjectId(),
          transferId: 'TEST_TRANSFER_123',
          orderAmount: 1000,
          platformCommission: 80,
          gstAmount: 14.4,
          totalCommission: 94.4,
          payoutAmount: 905.6
        });

        this.recordResult('Payout Model Instantiation', true);
      } catch (error) {
        this.recordResult('Payout Model Instantiation', false, error);
      }

      try {
        const testBatch = new PayoutBatch({
          batchTransferId: 'TEST_BATCH_123',
          totalPayouts: 5,
          totalAmount: 5000,
          batchDate: new Date()
        });

        this.recordResult('PayoutBatch Model Instantiation', true);
      } catch (error) {
        this.recordResult('PayoutBatch Model Instantiation', false, error);
      }

    } catch (error) {
      this.recordResult('Database Operations Test', false, error);
    }
  }

  /**
   * Test 9: API Route Registration
   */
  async testAPIRouteRegistration() {
    this.log('info', 'Testing API route registration...');

    try {
      // Check if payout routes are registered in main server
      const serverFile = require('fs').readFileSync('./server.js', 'utf8');
      
      if (!serverFile.includes('payoutRoutes')) {
        this.recordResult('Payout Routes Registration', false, 'Payout routes not registered in server.js');
      } else {
        this.recordResult('Payout Routes Registration', true);
      }

      // Check if payout routes are properly imported
      if (!serverFile.includes("require('./routes/payoutRoutes')")) {
        this.recordResult('Payout Routes Import', false, 'Payout routes not imported in server.js');
      } else {
        this.recordResult('Payout Routes Import', true);
      }

      // Check if payout routes are mounted
      if (!serverFile.includes('/api/payouts')) {
        this.recordResult('Payout Routes Mounting', false, 'Payout routes not mounted at /api/payouts');
      } else {
        this.recordResult('Payout Routes Mounting', true);
      }

    } catch (error) {
      this.recordResult('API Route Registration Test', false, error);
    }
  }

  /**
   * Test 10: Environment Variable Validation
   */
  async testEnvironmentVariables() {
    this.log('info', 'Testing environment variable validation...');

    try {
      // Check development environment variables
      const devVars = [
        'CASHFREE_PAYOUT_CLIENT_ID_DEV',
        'CASHFREE_PAYOUT_SECRET_KEY_DEV',
        'CASHFREE_PAYOUT_WEBHOOK_SECRET_DEV',
        'CASHFREE_PAYOUT_PUBLIC_KEY_DEV'
      ];

      let missingDevVars = [];
      devVars.forEach(varName => {
        if (!process.env[varName]) {
          missingDevVars.push(varName);
        }
      });

      if (missingDevVars.length > 0) {
        this.recordResult('Development Environment Variables', false, `Missing: ${missingDevVars.join(', ')}`);
      } else {
        this.recordResult('Development Environment Variables', true);
      }

      // Check production environment variables
      const prodVars = [
        'CASHFREE_PAYOUT_CLIENT_ID_PROD',
        'CASHFREE_PAYOUT_SECRET_KEY_PROD',
        'CASHFREE_PAYOUT_WEBHOOK_SECRET_PROD',
        'CASHFREE_PAYOUT_PUBLIC_KEY_PROD'
      ];

      let missingProdVars = [];
      prodVars.forEach(varName => {
        if (!process.env[varName]) {
          missingProdVars.push(varName);
        }
      });

      if (missingProdVars.length > 0) {
        this.recordResult('Production Environment Variables', false, `Missing: ${missingProdVars.join(', ')}`);
      } else {
        this.recordResult('Production Environment Variables', true);
      }

      // Check optional environment variables
      const optionalVars = [
        'CASHFREE_LOGGING_ENABLED',
        'CASHFREE_LOG_LEVEL',
        'CASHFREE_LOG_FILE',
        'BATCH_PAYOUT_LOGGING_ENABLED'
      ];

      let missingOptionalVars = [];
      optionalVars.forEach(varName => {
        if (!process.env[varName]) {
          missingOptionalVars.push(varName);
        }
      });

      if (missingOptionalVars.length > 0) {
        this.recordResult('Optional Environment Variables', true, null, `Missing optional vars: ${missingOptionalVars.join(', ')}`);
      } else {
        this.recordResult('Optional Environment Variables', true);
      }

    } catch (error) {
      this.recordResult('Environment Variables Test', false, error);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.log('info', 'Starting comprehensive Cashfree Payouts V2 integration tests...');
    
    console.log('\n' + '='.repeat(80));
    console.log('🧪 CASHFREE PAYOUTS V2 INTEGRATION TEST SUITE');
    console.log('='.repeat(80) + '\n');

    await this.testConfiguration();
    await this.testDatabaseModels();
    await this.testServiceLayer();
    await this.testAPIEndpoints();
    await this.testVariableNameConsistency();
    await this.testWebhookSignatureVerification();
    await this.testCommissionCalculation();
    await this.testDatabaseOperations();
    await this.testAPIRouteRegistration();
    await this.testEnvironmentVariables();

    this.generateTestReport();
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n✅ PASSED: ${this.testResults.passed}`);
    console.log(`❌ FAILED: ${this.testResults.failed}`);
    console.log(`⚠️ WARNINGS: ${this.testResults.warnings.length}`);
    console.log(`🔍 MISMATCHES: ${this.testResults.mismatches.length}`);
    console.log(`🔄 INCONSISTENCIES: ${this.testResults.inconsistencies.length}`);

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    if (this.testResults.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.testResults.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning.test}: ${warning.warning}`);
      });
    }

    if (this.testResults.mismatches.length > 0) {
      console.log('\n🔍 MISMATCHES:');
      this.testResults.mismatches.forEach((mismatch, index) => {
        console.log(`  ${index + 1}. ${mismatch.test}: ${mismatch.mismatch}`);
      });
    }

    if (this.testResults.inconsistencies.length > 0) {
      console.log('\n🔄 INCONSISTENCIES:');
      this.testResults.inconsistencies.forEach((inconsistency, index) => {
        console.log(`  ${index + 1}. ${inconsistency.test}: ${inconsistency.inconsistency}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    
    if (this.testResults.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! The Cashfree Payouts V2 integration is ready for production.');
    } else {
      console.log('⚠️ SOME TESTS FAILED! Please fix the issues before deploying to production.');
    }
    
    console.log('='.repeat(80) + '\n');

    // Save detailed report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        warnings: this.testResults.warnings.length,
        mismatches: this.testResults.mismatches.length,
        inconsistencies: this.testResults.inconsistencies.length
      },
      details: {
        errors: this.testResults.errors,
        warnings: this.testResults.warnings,
        mismatches: this.testResults.mismatches,
        inconsistencies: this.testResults.inconsistencies
      }
    };

    require('fs').writeFileSync(
      './cashfree-integration-test-report.json',
      JSON.stringify(reportData, null, 2)
    );

    this.log('info', 'Detailed test report saved to cashfree-integration-test-report.json');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new CashfreeIntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = CashfreeIntegrationTester;

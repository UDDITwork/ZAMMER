// backend/verify-cashfree-payouts-integration.js
// 🎯 COMPREHENSIVE CASHFREE PAYOUTS V2 INTEGRATION VERIFICATION
// This script verifies the complete Cashfree Payouts V2 integration with production credentials

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Import services and models
const CashfreePayoutService = require('./services/cashfreePayoutService');
const { getConfig, utils } = require('./config/cashfree');

class CashfreePayoutsVerifier {
  constructor() {
    this.config = getConfig();
    this.baseURL = this.config.baseUrl;
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      warnings: [],
      testData: {}
    };
  }

  /**
   * Log verification results
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      test: '🧪'
    };
    
    console.log(`${emoji[level]} [${timestamp}] [CASHFREE_VERIFY] ${message}`);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Record test result
   */
  recordResult(testName, passed, error = null, warning = null, data = null) {
    if (passed) {
      this.results.passed++;
      this.log('success', `PASSED: ${testName}`);
    } else {
      this.results.failed++;
      this.log('error', `FAILED: ${testName}`, error);
      this.results.errors.push({ test: testName, error: error?.message || error });
    }

    if (warning) {
      this.results.warnings.push({ test: testName, warning });
      this.log('warning', `WARNING: ${testName} - ${warning}`);
    }

    if (data) {
      this.results.testData[testName] = data;
    }
  }

  /**
   * Test 1: Verify API Credentials and Configuration
   */
  async verifyCredentials() {
    this.log('test', 'Verifying API credentials and configuration...');

    try {
      // Check if we have production credentials
      if (!process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD || !process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD) {
        this.recordResult('Production Credentials', false, 'Production credentials not found in environment variables');
        return false;
      }

      // Test credentials with Cashfree API
      const headers = {
        'Content-Type': 'application/json',
        'x-api-version': this.config.apiVersion,
        'x-client-id': this.config.clientId,
        'x-client-secret': this.config.secretKey
      };

      // Test credentials by calling the verify endpoint
      const response = await axios.get(`${this.baseURL}/credentials/verify`, { headers });
      
      if (response.status === 200) {
        this.recordResult('API Credentials Verification', true, null, null, response.data);
        return true;
      } else {
        this.recordResult('API Credentials Verification', false, `Unexpected response: ${response.status}`);
        return false;
      }

    } catch (error) {
      this.recordResult('API Credentials Verification', false, error);
      return false;
    }
  }

  /**
   * Test 2: Verify IP Whitelisting
   */
  async verifyIPWhitelisting() {
    this.log('test', 'Verifying IP whitelisting...');

    try {
      // Make a simple API call to test IP whitelisting
      const headers = {
        'Content-Type': 'application/json',
        'x-api-version': this.config.apiVersion,
        'x-client-id': this.config.clientId,
        'x-client-secret': this.config.secretKey
      };

      // Try to get account balance (this requires IP whitelisting in production)
      const response = await axios.get(`${this.baseURL}/account/balance`, { headers });
      
      if (response.status === 200) {
        this.recordResult('IP Whitelisting', true, null, null, response.data);
        return true;
      } else {
        this.recordResult('IP Whitelisting', false, `IP not whitelisted or API error: ${response.status}`);
        return false;
      }

    } catch (error) {
      if (error.response?.status === 403) {
        this.recordResult('IP Whitelisting', false, 'IP address not whitelisted. Please add your server IP to Cashfree dashboard.');
      } else {
        this.recordResult('IP Whitelisting', false, error);
      }
      return false;
    }
  }

  /**
   * Test 3: Test Beneficiary Creation (Test Mode)
   */
  async testBeneficiaryCreation() {
    this.log('test', 'Testing beneficiary creation...');

    try {
      const testBeneficiaryData = {
        beneficiary_id: `TEST_BENEFICIARY_${Date.now()}`,
        beneficiary_name: 'Test Beneficiary',
        beneficiary_instrument_details: {
          bank_account_number: '1234567890',
          bank_ifsc: 'SBIN0001234'
        },
        beneficiary_contact_details: {
          beneficiary_email: 'test@example.com',
          beneficiary_phone: '9876543210'
        },
        beneficiary_address: {
          beneficiary_address: 'Test Address',
          beneficiary_city: 'Mumbai',
          beneficiary_state: 'Maharashtra',
          beneficiary_postal_code: '400001'
        }
      };

      const payoutService = new CashfreePayoutService();
      const result = await payoutService.createBeneficiary(testBeneficiaryData);

      if (result.success) {
        this.recordResult('Beneficiary Creation', true, null, null, result.data);
        this.results.testData.testBeneficiaryId = result.data.beneficiary_id;
        return result.data.beneficiary_id;
      } else {
        this.recordResult('Beneficiary Creation', false, result.error);
        return null;
      }

    } catch (error) {
      this.recordResult('Beneficiary Creation', false, error);
      return null;
    }
  }

  /**
   * Test 4: Test Beneficiary Retrieval
   */
  async testBeneficiaryRetrieval(beneficiaryId) {
    this.log('test', 'Testing beneficiary retrieval...');

    try {
      const payoutService = new CashfreePayoutService();
      const result = await payoutService.getBeneficiary(beneficiaryId);

      if (result.success) {
        this.recordResult('Beneficiary Retrieval', true, null, null, result.data);
        return true;
      } else {
        this.recordResult('Beneficiary Retrieval', false, result.error);
        return false;
      }

    } catch (error) {
      this.recordResult('Beneficiary Retrieval', false, error);
      return false;
    }
  }

  /**
   * Test 5: Test Standard Transfer (Test Mode)
   */
  async testStandardTransfer(beneficiaryId) {
    this.log('test', 'Testing standard transfer...');

    try {
      const testTransferData = {
        transfer_id: `TEST_TRANSFER_${Date.now()}`,
        transfer_amount: 1.00, // Minimum amount for testing
        transfer_mode: 'banktransfer',
        beneficiary_details: {
          beneficiary_id: beneficiaryId
        },
        transfer_remarks: 'Test transfer for integration verification'
      };

      const payoutService = new CashfreePayoutService();
      const result = await payoutService.createStandardTransfer(testTransferData);

      if (result.success) {
        this.recordResult('Standard Transfer', true, null, null, result.data);
        this.results.testData.testTransferId = result.data.transfer_id;
        return result.data.transfer_id;
      } else {
        this.recordResult('Standard Transfer', false, result.error);
        return null;
      }

    } catch (error) {
      this.recordResult('Standard Transfer', false, error);
      return null;
    }
  }

  /**
   * Test 6: Test Transfer Status Check
   */
  async testTransferStatus(transferId) {
    this.log('test', 'Testing transfer status check...');

    try {
      const payoutService = new CashfreePayoutService();
      const result = await payoutService.getTransferStatus(transferId);

      if (result.success) {
        this.recordResult('Transfer Status Check', true, null, null, result.data);
        return true;
      } else {
        this.recordResult('Transfer Status Check', false, result.error);
        return false;
      }

    } catch (error) {
      this.recordResult('Transfer Status Check', false, error);
      return false;
    }
  }

  /**
   * Test 7: Test Batch Transfer (Test Mode)
   */
  async testBatchTransfer(beneficiaryId) {
    this.log('test', 'Testing batch transfer...');

    try {
      const testBatchData = {
        batch_transfer_id: `TEST_BATCH_${Date.now()}`,
        transfers: [
          {
            transfer_id: `TEST_BATCH_TRANSFER_1_${Date.now()}`,
            transfer_amount: 1.00,
            transfer_mode: 'banktransfer',
            beneficiary_details: {
              beneficiary_id: beneficiaryId
            },
            transfer_remarks: 'Test batch transfer 1'
          },
          {
            transfer_id: `TEST_BATCH_TRANSFER_2_${Date.now()}`,
            transfer_amount: 1.00,
            transfer_mode: 'banktransfer',
            beneficiary_details: {
              beneficiary_id: beneficiaryId
            },
            transfer_remarks: 'Test batch transfer 2'
          }
        ]
      };

      const payoutService = new CashfreePayoutService();
      const result = await payoutService.createBatchTransfer(testBatchData);

      if (result.success) {
        this.recordResult('Batch Transfer', true, null, null, result.data);
        this.results.testData.testBatchId = result.data.batch_transfer_id;
        return result.data.batch_transfer_id;
      } else {
        this.recordResult('Batch Transfer', false, result.error);
        return null;
      }

    } catch (error) {
      this.recordResult('Batch Transfer', false, error);
      return null;
    }
  }

  /**
   * Test 8: Test Batch Transfer Status
   */
  async testBatchTransferStatus(batchId) {
    this.log('test', 'Testing batch transfer status...');

    try {
      const payoutService = new CashfreePayoutService();
      const result = await payoutService.getBatchTransferStatus(batchId);

      if (result.success) {
        this.recordResult('Batch Transfer Status', true, null, null, result.data);
        return true;
      } else {
        this.recordResult('Batch Transfer Status', false, result.error);
        return false;
      }

    } catch (error) {
      this.recordResult('Batch Transfer Status', false, error);
      return false;
    }
  }

  /**
   * Test 9: Test Webhook Signature Generation
   */
  async testWebhookSignature() {
    this.log('test', 'Testing webhook signature generation...');

    try {
      const testPayload = JSON.stringify({ test: 'webhook_data' });
      const testSecret = this.config.webhookSecret || 'test-secret';
      
      const payoutService = new CashfreePayoutService();
      const signature = payoutService.generateSignature(testPayload, testSecret);
      
      if (!signature || typeof signature !== 'string') {
        this.recordResult('Webhook Signature Generation', false, 'Failed to generate signature');
        return false;
      }

      // Test signature verification
      const isValid = payoutService.verifyWebhookSignature(testPayload, signature, testSecret);
      
      if (!isValid) {
        this.recordResult('Webhook Signature Verification', false, 'Failed to verify signature');
        return false;
      }

      this.recordResult('Webhook Signature', true, null, null, { signature, isValid });
      return true;

    } catch (error) {
      this.recordResult('Webhook Signature', false, error);
      return false;
    }
  }

  /**
   * Test 10: Test Commission Calculation
   */
  async testCommissionCalculation() {
    this.log('test', 'Testing commission calculation...');

    try {
      const testAmounts = [100, 500, 1000, 5000, 10000];
      let allPassed = true;

      testAmounts.forEach(amount => {
        const commission = utils.calculateCommission(amount);
        
        // Validate commission structure
        const requiredKeys = ['orderAmount', 'platformCommission', 'gst', 'totalCommission', 'sellerAmount'];
        const missingKeys = requiredKeys.filter(key => !commission.hasOwnProperty(key));

        if (missingKeys.length > 0) {
          this.recordResult(`Commission Structure (${amount})`, false, `Missing keys: ${missingKeys.join(', ')}`);
          allPassed = false;
        } else {
          this.recordResult(`Commission Structure (${amount})`, true, null, null, commission);
        }

        // Validate commission values are positive
        if (commission.sellerAmount <= 0 || commission.totalCommission <= 0) {
          this.recordResult(`Commission Values (${amount})`, false, 'Invalid commission values');
          allPassed = false;
        } else {
          this.recordResult(`Commission Values (${amount})`, true);
        }
      });

      return allPassed;

    } catch (error) {
      this.recordResult('Commission Calculation', false, error);
      return false;
    }
  }

  /**
   * Test 11: Test Database Models
   */
  async testDatabaseModels() {
    this.log('test', 'Testing database models...');

    try {
      // Test database connection
      if (mongoose.connection.readyState !== 1) {
        this.recordResult('Database Connection', false, 'Database not connected');
        return false;
      }

      this.recordResult('Database Connection', true);

      // Test model imports
      const CashfreeBeneficiary = require('./models/CashfreeBeneficiary');
      const Payout = require('./models/Payout');
      const PayoutBatch = require('./models/PayoutBatch');

      if (!CashfreeBeneficiary || !Payout || !PayoutBatch) {
        this.recordResult('Model Imports', false, 'Failed to import required models');
        return false;
      }

      this.recordResult('Model Imports', true);

      // Test model schema validation
      try {
        const testBeneficiary = new CashfreeBeneficiary({
          seller: new mongoose.Types.ObjectId(),
          beneficiaryId: 'TEST_SCHEMA_VALIDATION',
          beneficiaryName: 'Test Beneficiary',
          bankAccountNumber: '1234567890',
          bankIfsc: 'SBIN0001234'
        });

        // Validate required fields
        const validationError = testBeneficiary.validateSync();
        if (validationError) {
          this.recordResult('Beneficiary Schema Validation', false, validationError.message);
        } else {
          this.recordResult('Beneficiary Schema Validation', true);
        }

      } catch (error) {
        this.recordResult('Beneficiary Schema Validation', false, error);
      }

      return true;

    } catch (error) {
      this.recordResult('Database Models', false, error);
      return false;
    }
  }

  /**
   * Test 12: Test Service Layer Integration
   */
  async testServiceLayerIntegration() {
    this.log('test', 'Testing service layer integration...');

    try {
      const payoutService = new CashfreePayoutService();
      
      // Test service methods exist
      const requiredMethods = [
        'createBeneficiary',
        'getBeneficiary',
        'createStandardTransfer',
        'createBatchTransfer',
        'getTransferStatus',
        'getBatchTransferStatus',
        'healthCheck'
      ];

      let missingMethods = [];
      requiredMethods.forEach(method => {
        if (typeof payoutService[method] !== 'function') {
          missingMethods.push(method);
        }
      });

      if (missingMethods.length > 0) {
        this.recordResult('Service Methods', false, `Missing methods: ${missingMethods.join(', ')}`);
        return false;
      }

      this.recordResult('Service Methods', true);

      // Test health check
      try {
        const healthResult = await payoutService.healthCheck();
        if (healthResult.success) {
          this.recordResult('Service Health Check', true, null, null, healthResult);
        } else {
          this.recordResult('Service Health Check', false, healthResult.error);
        }
      } catch (error) {
        this.recordResult('Service Health Check', false, error);
      }

      return true;

    } catch (error) {
      this.recordResult('Service Layer Integration', false, error);
      return false;
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    this.log('info', 'Cleaning up test data...');

    try {
      const payoutService = new CashfreePayoutService();

      // Remove test beneficiary if created
      if (this.results.testData.testBeneficiaryId) {
        try {
          await payoutService.removeBeneficiary(this.results.testData.testBeneficiaryId);
          this.log('success', 'Test beneficiary removed');
        } catch (error) {
          this.log('warning', 'Failed to remove test beneficiary', error.message);
        }
      }

      this.log('success', 'Test data cleanup completed');

    } catch (error) {
      this.log('warning', 'Error during cleanup', error.message);
    }
  }

  /**
   * Generate verification report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CASHFREE PAYOUTS V2 INTEGRATION VERIFICATION REPORT');
    console.log('='.repeat(80));

    console.log(`\n✅ PASSED: ${this.results.passed}`);
    console.log(`❌ FAILED: ${this.results.failed}`);
    console.log(`⚠️ WARNINGS: ${this.results.warnings.length}`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.results.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning.test}: ${warning.warning}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    
    if (this.results.failed === 0) {
      console.log('🎉 INTEGRATION VERIFICATION SUCCESSFUL!');
      console.log('✅ Your Cashfree Payouts V2 integration is ready for production use.');
    } else {
      console.log('⚠️ INTEGRATION VERIFICATION FAILED!');
      console.log('❌ Please fix the issues before using in production.');
    }
    
    console.log('='.repeat(80) + '\n');

    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      baseUrl: this.baseURL,
      summary: {
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings.length
      },
      details: {
        errors: this.results.errors,
        warnings: this.results.warnings
      },
      testData: this.results.testData
    };

    require('fs').writeFileSync(
      './cashfree-payouts-verification-report.json',
      JSON.stringify(reportData, null, 2)
    );

    this.log('info', 'Detailed verification report saved to cashfree-payouts-verification-report.json');
  }

  /**
   * Run complete verification
   */
  async runVerification() {
    this.log('info', 'Starting Cashfree Payouts V2 integration verification...');
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CASHFREE PAYOUTS V2 INTEGRATION VERIFICATION');
    console.log('='.repeat(80) + '\n');

    try {
      // Connect to database
      await mongoose.connect(process.env.MONGO_URI);
      this.log('success', 'Connected to database');

      // Run verification tests
      await this.verifyCredentials();
      await this.verifyIPWhitelisting();
      
      const beneficiaryId = await this.testBeneficiaryCreation();
      if (beneficiaryId) {
        await this.testBeneficiaryRetrieval(beneficiaryId);
        await this.testStandardTransfer(beneficiaryId);
        await this.testBatchTransfer(beneficiaryId);
      }

      await this.testWebhookSignature();
      await this.testCommissionCalculation();
      await this.testDatabaseModels();
      await this.testServiceLayerIntegration();

      // Clean up test data
      await this.cleanupTestData();

      // Generate report
      this.generateReport();

    } catch (error) {
      this.log('error', 'Verification failed with error', error);
    } finally {
      // Close database connection
      await mongoose.connection.close();
      this.log('info', 'Database connection closed');
    }
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  const verifier = new CashfreePayoutsVerifier();
  verifier.runVerification().catch(console.error);
}

module.exports = CashfreePayoutsVerifier;

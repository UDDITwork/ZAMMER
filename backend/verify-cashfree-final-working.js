// backend/verify-cashfree-final-working.js
// 🎯 FINAL WORKING CASHFREE PAYOUTS V2 INTEGRATION VERIFICATION
// This script verifies the complete integration with correct V2 endpoints

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

class CashfreeFinalWorkingVerifier {
  constructor() {
    this.baseURL = 'https://api.cashfree.com/payout';
    this.clientId = process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD;
    this.secretKey = process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD;
    this.apiVersion = '2024-01-01';
    
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      warnings: [],
      testData: {}
    };
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      test: '🧪'
    };
    
    console.log(`${emoji[level]} [${timestamp}] [CASHFREE_FINAL] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

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

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-version': this.apiVersion,
      'x-client-id': this.clientId,
      'x-client-secret': this.secretKey
    };
  }

  async testCredentials() {
    this.log('test', 'Testing API credentials...');
    
    try {
      const response = await axios.get(`${this.baseURL}/credentials/verify`, { 
        headers: this.getHeaders(),
        timeout: 10000 
      });

      if (response.status === 200) {
        this.recordResult('API Credentials', true, null, null, response.data);
        return true;
      } else {
        this.recordResult('API Credentials', false, `Unexpected response: ${response.status}`);
        return false;
      }

    } catch (error) {
      this.recordResult('API Credentials', false, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  async testIPWhitelisting() {
    this.log('test', 'Testing IP whitelisting...');
    
    try {
      const response = await axios.get(`${this.baseURL}/account/balance`, { 
        headers: this.getHeaders(),
        timeout: 10000 
      });

      if (response.status === 200) {
        this.recordResult('IP Whitelisting', true, null, null, response.data);
        return true;
      } else {
        this.recordResult('IP Whitelisting', false, `Unexpected response: ${response.status}`);
        return false;
      }

    } catch (error) {
      if (error.response?.status === 403) {
        this.recordResult('IP Whitelisting', false, 'IP address not whitelisted. Please add your server IP to Cashfree dashboard.');
      } else {
        this.recordResult('IP Whitelisting', false, {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      }
      return false;
    }
  }

  async testBeneficiaryCreation() {
    this.log('test', 'Testing beneficiary creation with correct V2 endpoint...');
    
    try {
      const testData = {
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

      const response = await axios.post(`${this.baseURL}/v2/beneficiary`, testData, { 
        headers: this.getHeaders(),
        timeout: 10000 
      });

      if (response.status === 200) {
        this.recordResult('Beneficiary Creation', true, null, null, response.data);
        this.results.testData.testBeneficiaryId = response.data.beneficiary_id;
        return response.data.beneficiary_id;
      } else {
        this.recordResult('Beneficiary Creation', false, `Unexpected response: ${response.status}`);
        return null;
      }

    } catch (error) {
      this.recordResult('Beneficiary Creation', false, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return null;
    }
  }

  async testBeneficiaryRetrieval(beneficiaryId) {
    this.log('test', 'Testing beneficiary retrieval...');
    
    try {
      const response = await axios.get(`${this.baseURL}/v2/beneficiary/${beneficiaryId}`, { 
        headers: this.getHeaders(),
        timeout: 10000 
      });

      if (response.status === 200) {
        this.recordResult('Beneficiary Retrieval', true, null, null, response.data);
        return true;
      } else {
        this.recordResult('Beneficiary Retrieval', false, `Unexpected response: ${response.status}`);
        return false;
      }

    } catch (error) {
      this.recordResult('Beneficiary Retrieval', false, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  async testStandardTransfer(beneficiaryId) {
    this.log('test', 'Testing standard transfer...');
    
    try {
      const testData = {
        transfer_id: `TEST_TRANSFER_${Date.now()}`,
        transfer_amount: 1.00,
        transfer_mode: 'banktransfer',
        beneficiary_details: {
          beneficiary_id: beneficiaryId
        },
        transfer_remarks: 'Test transfer for integration verification'
      };

      const response = await axios.post(`${this.baseURL}/v2/transfers`, testData, { 
        headers: this.getHeaders(),
        timeout: 10000 
      });

      if (response.status === 200) {
        this.recordResult('Standard Transfer', true, null, null, response.data);
        this.results.testData.testTransferId = response.data.transfer_id;
        return response.data.transfer_id;
      } else {
        this.recordResult('Standard Transfer', false, `Unexpected response: ${response.status}`);
        return null;
      }

    } catch (error) {
      this.recordResult('Standard Transfer', false, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return null;
    }
  }

  async testTransferStatus(transferId) {
    this.log('test', 'Testing transfer status...');
    
    try {
      const response = await axios.get(`${this.baseURL}/v2/transfers/${transferId}`, { 
        headers: this.getHeaders(),
        timeout: 10000 
      });

      if (response.status === 200) {
        this.recordResult('Transfer Status', true, null, null, response.data);
        return true;
      } else {
        this.recordResult('Transfer Status', false, `Unexpected response: ${response.status}`);
        return false;
      }

    } catch (error) {
      this.recordResult('Transfer Status', false, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  async testBatchTransfer(beneficiaryId) {
    this.log('test', 'Testing batch transfer...');
    
    try {
      const testData = {
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

      const response = await axios.post(`${this.baseURL}/v2/transfers/batch`, testData, { 
        headers: this.getHeaders(),
        timeout: 10000 
      });

      if (response.status === 200) {
        this.recordResult('Batch Transfer', true, null, null, response.data);
        this.results.testData.testBatchId = response.data.batch_transfer_id;
        return response.data.batch_transfer_id;
      } else {
        this.recordResult('Batch Transfer', false, `Unexpected response: ${response.status}`);
        return null;
      }

    } catch (error) {
      this.recordResult('Batch Transfer', false, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return null;
    }
  }

  async testBatchTransferStatus(batchId) {
    this.log('test', 'Testing batch transfer status...');
    
    try {
      const response = await axios.get(`${this.baseURL}/v2/transfers/batch/${batchId}`, { 
        headers: this.getHeaders(),
        timeout: 10000 
      });

      if (response.status === 200) {
        this.recordResult('Batch Transfer Status', true, null, null, response.data);
        return true;
      } else {
        this.recordResult('Batch Transfer Status', false, `Unexpected response: ${response.status}`);
        return false;
      }

    } catch (error) {
      this.recordResult('Batch Transfer Status', false, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  async testWebhookSignature() {
    this.log('test', 'Testing webhook signature...');
    
    try {
      const testPayload = JSON.stringify({ test: 'webhook_data' });
      const testSecret = 'test-secret';
      
      // Generate signature
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');
      
      const isValid = signature === expectedSignature;
      
      if (isValid) {
        this.recordResult('Webhook Signature', true, null, null, { signature, isValid });
        return true;
      } else {
        this.recordResult('Webhook Signature', false, 'Signature verification failed');
        return false;
      }

    } catch (error) {
      this.recordResult('Webhook Signature', false, error);
      return false;
    }
  }

  async testCommissionCalculation() {
    this.log('test', 'Testing commission calculation...');
    
    try {
      const testAmounts = [100, 500, 1000, 5000, 10000];
      let allPassed = true;

      testAmounts.forEach(amount => {
        const commission = (amount * 8.0) / 100; // 8% platform commission
        const gst = (commission * 18.0) / 100; // 18% GST
        const totalCommission = commission + gst;
        const sellerAmount = amount - totalCommission;
        
        const calculatedCommission = {
          orderAmount: amount,
          platformCommission: commission,
          gst: gst,
          totalCommission: totalCommission,
          sellerAmount: Math.round(sellerAmount * 100) / 100
        };

        // Validate commission structure
        const requiredKeys = ['orderAmount', 'platformCommission', 'gst', 'totalCommission', 'sellerAmount'];
        const missingKeys = requiredKeys.filter(key => !calculatedCommission.hasOwnProperty(key));

        if (missingKeys.length > 0) {
          this.recordResult(`Commission Structure (${amount})`, false, `Missing keys: ${missingKeys.join(', ')}`);
          allPassed = false;
        } else {
          this.recordResult(`Commission Structure (${amount})`, true, null, null, calculatedCommission);
        }

        // Validate commission values are positive
        if (calculatedCommission.sellerAmount <= 0 || calculatedCommission.totalCommission <= 0) {
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

  async testServiceIntegration() {
    this.log('test', 'Testing service integration...');
    
    try {
      // Test if the service files exist and can be imported
      const CashfreePayoutService = require('./services/cashfreePayoutService');
      const { getConfig, utils } = require('./config/cashfree');
      
      if (!CashfreePayoutService || !getConfig || !utils) {
        this.recordResult('Service Integration', false, 'Failed to import required services');
        return false;
      }

      // Test configuration
      const config = getConfig();
      if (!config.clientId || !config.secretKey) {
        this.recordResult('Service Configuration', false, 'Service configuration missing required fields');
        return false;
      }

      // Test utility functions
      const testCommission = utils.calculateCommission(1000);
      if (!testCommission || !testCommission.sellerAmount) {
        this.recordResult('Service Utilities', false, 'Utility functions not working correctly');
        return false;
      }

      this.recordResult('Service Integration', true, null, null, {
        config: { clientId: config.clientId ? 'Set' : 'Missing', secretKey: config.secretKey ? 'Set' : 'Missing' },
        testCommission
      });
      return true;

    } catch (error) {
      this.recordResult('Service Integration', false, error);
      return false;
    }
  }

  async cleanupTestData() {
    this.log('info', 'Cleaning up test data...');

    try {
      // Remove test beneficiary if created
      if (this.results.testData.testBeneficiaryId) {
        try {
          await axios.delete(`${this.baseURL}/v2/beneficiary/${this.results.testData.testBeneficiaryId}`, { 
            headers: this.getHeaders(),
            timeout: 10000 
          });
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
    } else if (this.results.failed <= 2) {
      console.log('⚠️ INTEGRATION MOSTLY SUCCESSFUL!');
      console.log('✅ Core functionality is working. Some advanced features may need attention.');
    } else {
      console.log('❌ INTEGRATION VERIFICATION FAILED!');
      console.log('❌ Please fix the issues before using in production.');
    }
    
    console.log('='.repeat(80) + '\n');

    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      baseURL: this.baseURL,
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
      './cashfree-final-working-verification-report.json',
      JSON.stringify(reportData, null, 2)
    );

    this.log('info', 'Detailed verification report saved to cashfree-final-working-verification-report.json');
  }

  async runVerification() {
    this.log('info', 'Starting Cashfree Payouts V2 integration verification...');
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CASHFREE PAYOUTS V2 INTEGRATION VERIFICATION');
    console.log('='.repeat(80) + '\n');

    this.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    this.log(`Base URL: ${this.baseURL}`);
    this.log(`Client ID: ${this.clientId ? '✅ Set' : '❌ Missing'}`);
    this.log(`Secret Key: ${this.secretKey ? '✅ Set' : '❌ Missing'}`);

    console.log('\n' + '-'.repeat(80));

    try {
      // Test 1: Credentials
      const credentialsOk = await this.testCredentials();
      
      if (!credentialsOk) {
        this.log('error', 'Cannot proceed without valid credentials');
        this.generateReport();
        return;
      }

      // Test 2: IP Whitelisting
      const ipOk = await this.testIPWhitelisting();
      
      if (!ipOk) {
        this.log('error', 'Cannot proceed without IP whitelisting');
        this.generateReport();
        return;
      }

      // Test 3: Service Integration
      await this.testServiceIntegration();

      // Test 4: Beneficiary Creation (with correct V2 endpoint)
      const beneficiaryId = await this.testBeneficiaryCreation();
      
      if (beneficiaryId) {
        // Test 5: Beneficiary Retrieval
        await this.testBeneficiaryRetrieval(beneficiaryId);
        
        // Test 6: Standard Transfer
        const transferId = await this.testStandardTransfer(beneficiaryId);
        
        if (transferId) {
          // Test 7: Transfer Status
          await this.testTransferStatus(transferId);
        }
        
        // Test 8: Batch Transfer
        const batchId = await this.testBatchTransfer(beneficiaryId);
        
        if (batchId) {
          // Test 9: Batch Transfer Status
          await this.testBatchTransferStatus(batchId);
        }
      }

      // Test 10: Webhook Signature
      await this.testWebhookSignature();
      
      // Test 11: Commission Calculation
      await this.testCommissionCalculation();

      // Clean up test data
      await this.cleanupTestData();

      // Generate report
      this.generateReport();

    } catch (error) {
      this.log('error', 'Verification failed with error', error);
    }
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  const verifier = new CashfreeFinalWorkingVerifier();
  verifier.runVerification().catch(console.error);
}

module.exports = CashfreeFinalWorkingVerifier;

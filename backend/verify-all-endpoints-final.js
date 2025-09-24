// backend/verify-all-endpoints-final.js
// 🎯 COMPREHENSIVE ENDPOINT VERIFICATION FOR CASHFREE V2

require('dotenv').config();
const axios = require('axios');

class AllEndpointsVerifier {
  constructor() {
    this.baseURL = 'https://api.cashfree.com/payout';
    this.clientId = process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD;
    this.secretKey = process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD;
    this.apiVersion = '2024-01-01';
    
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      workingEndpoints: [],
      failedEndpoints: []
    };
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
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

  async testEndpoint(endpoint, method = 'GET', data = null, description = '') {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: this.getHeaders(),
        timeout: 10000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      
      const result = {
        endpoint,
        method,
        description,
        success: true,
        status: response.status,
        data: response.data
      };

      this.results.passed++;
      this.results.workingEndpoints.push(result);
      this.log(`✅ SUCCESS: ${method} ${endpoint}`, { status: response.status, description });
      return result;

    } catch (error) {
      const result = {
        endpoint,
        method,
        description,
        success: false,
        status: error.response?.status,
        error: error.message,
        data: error.response?.data
      };

      this.results.failed++;
      this.results.failedEndpoints.push(result);
      this.log(`❌ FAILED: ${method} ${endpoint}`, { 
        status: error.response?.status, 
        error: error.message,
        description 
      });
      return result;
    }
  }

  async testAllEndpoints() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE CASHFREE V2 ENDPOINT VERIFICATION');
    console.log('='.repeat(80) + '\n');

    this.log(`Base URL: ${this.baseURL}`);
    this.log(`API Version: ${this.apiVersion}`);
    this.log(`Client ID: ${this.clientId ? '✅ Set' : '❌ Missing'}`);
    this.log(`Secret Key: ${this.secretKey ? '✅ Set' : '❌ Missing'}`);

    console.log('\n' + '-'.repeat(80));

    // Test data for beneficiary creation
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
      }
    };

    // Test data for transfer creation
    const testTransferData = {
      transfer_id: `TEST_TRANSFER_${Date.now()}`,
      transfer_amount: 1.00,
      transfer_mode: 'banktransfer',
      beneficiary_details: {
        beneficiary_id: testBeneficiaryData.beneficiary_id
      },
      transfer_remarks: 'Test transfer for endpoint verification'
    };

    // Test data for batch transfer
    const testBatchData = {
      batch_transfer_id: `TEST_BATCH_${Date.now()}`,
      transfers: [
        {
          transfer_id: `TEST_BATCH_TRANSFER_1_${Date.now()}`,
          transfer_amount: 1.00,
          transfer_mode: 'banktransfer',
          beneficiary_details: {
            beneficiary_id: testBeneficiaryData.beneficiary_id
          },
          transfer_remarks: 'Test batch transfer 1'
        }
      ]
    };

    // 1. Test Authentication & Basic Endpoints
    console.log('\n🔐 TESTING AUTHENTICATION & BASIC ENDPOINTS');
    console.log('-'.repeat(50));
    
    await this.testEndpoint('/credentials/verify', 'GET', null, 'Verify API credentials');
    await this.testEndpoint('/account/balance', 'GET', null, 'Get account balance');

    // 2. Test Beneficiary Endpoints
    console.log('\n👤 TESTING BENEFICIARY ENDPOINTS');
    console.log('-'.repeat(50));
    
    const beneficiaryResult = await this.testEndpoint('/v2/beneficiary', 'POST', testBeneficiaryData, 'Create beneficiary');
    
    if (beneficiaryResult.success) {
      const beneficiaryId = beneficiaryResult.data.beneficiary_id;
      await this.testEndpoint(`/v2/beneficiary/${beneficiaryId}`, 'GET', null, 'Get beneficiary by ID');
      await this.testEndpoint('/v2/beneficiary', 'GET', null, 'Get all beneficiaries');
      
      // Test transfer endpoints with created beneficiary
      console.log('\n💰 TESTING TRANSFER ENDPOINTS');
      console.log('-'.repeat(50));
      
      const transferResult = await this.testEndpoint('/v2/transfers', 'POST', {
        ...testTransferData,
        beneficiary_details: { beneficiary_id: beneficiaryId }
      }, 'Create standard transfer');
      
      if (transferResult.success) {
        const transferId = transferResult.data.transfer_id;
        await this.testEndpoint(`/v2/transfers/${transferId}`, 'GET', null, 'Get transfer status');
      }
      
      // Test batch transfer
      const batchResult = await this.testEndpoint('/v2/transfers/batch', 'POST', {
        ...testBatchData,
        transfers: [{
          ...testBatchData.transfers[0],
          beneficiary_details: { beneficiary_id: beneficiaryId }
        }]
      }, 'Create batch transfer');
      
      if (batchResult.success) {
        const batchId = batchResult.data.batch_transfer_id;
        await this.testEndpoint(`/v2/transfers/batch/${batchId}`, 'GET', null, 'Get batch transfer status');
      }
      
      // Clean up - remove test beneficiary
      await this.testEndpoint(`/v2/beneficiary/${beneficiaryId}`, 'DELETE', null, 'Delete test beneficiary');
    }

    // 3. Test Alternative Endpoints
    console.log('\n🔄 TESTING ALTERNATIVE ENDPOINTS');
    console.log('-'.repeat(50));
    
    await this.testEndpoint('/beneficiaries', 'GET', null, 'Alternative beneficiaries endpoint');
    await this.testEndpoint('/v2/beneficiaries', 'GET', null, 'V2 beneficiaries endpoint');

    // Generate comprehensive report
    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE ENDPOINT VERIFICATION REPORT');
    console.log('='.repeat(80));

    console.log(`\n✅ WORKING ENDPOINTS: ${this.results.passed}`);
    console.log(`❌ FAILED ENDPOINTS: ${this.results.failed}`);
    console.log(`📈 SUCCESS RATE: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.workingEndpoints.length > 0) {
      console.log('\n✅ WORKING ENDPOINTS:');
      this.results.workingEndpoints.forEach((endpoint, index) => {
        console.log(`  ${index + 1}. ${endpoint.method} ${endpoint.endpoint} - ${endpoint.description} (Status: ${endpoint.status})`);
      });
    }

    if (this.results.failedEndpoints.length > 0) {
      console.log('\n❌ FAILED ENDPOINTS:');
      this.results.failedEndpoints.forEach((endpoint, index) => {
        console.log(`  ${index + 1}. ${endpoint.method} ${endpoint.endpoint} - ${endpoint.description} (Status: ${endpoint.status})`);
      });
    }

    // Endpoint recommendations
    console.log('\n🎯 RECOMMENDED ENDPOINTS FOR YOUR CONFIG:');
    console.log('-'.repeat(50));
    console.log('✅ Beneficiary Creation: POST /v2/beneficiary');
    console.log('✅ Beneficiary Retrieval: GET /v2/beneficiary/{id}');
    console.log('✅ All Beneficiaries: GET /v2/beneficiary');
    console.log('✅ Standard Transfer: POST /v2/transfers');
    console.log('✅ Transfer Status: GET /v2/transfers/{id}');
    console.log('✅ Batch Transfer: POST /v2/transfers/batch');
    console.log('✅ Batch Status: GET /v2/transfers/batch/{id}');
    console.log('✅ Account Balance: GET /account/balance');
    console.log('✅ Credentials Verify: GET /credentials/verify');

    console.log('\n' + '='.repeat(80));
    
    if (this.results.failed === 0) {
      console.log('🎉 ALL ENDPOINTS WORKING PERFECTLY!');
      console.log('✅ Your Cashfree V2 integration is 100% ready for production.');
    } else if (this.results.passed > this.results.failed) {
      console.log('⚠️ MOST ENDPOINTS WORKING!');
      console.log('✅ Core functionality is ready. Some advanced features may need attention.');
    } else {
      console.log('❌ MULTIPLE ENDPOINT ISSUES!');
      console.log('❌ Please check your configuration and API access.');
    }
    
    console.log('='.repeat(80) + '\n');

    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      baseURL: this.baseURL,
      apiVersion: this.apiVersion,
      summary: {
        total: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1) + '%'
      },
      workingEndpoints: this.results.workingEndpoints,
      failedEndpoints: this.results.failedEndpoints
    };

    require('fs').writeFileSync(
      './cashfree-all-endpoints-verification-report.json',
      JSON.stringify(reportData, null, 2)
    );

    this.log('Detailed verification report saved to cashfree-all-endpoints-verification-report.json');
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  const verifier = new AllEndpointsVerifier();
  verifier.testAllEndpoints().catch(console.error);
}

module.exports = AllEndpointsVerifier;

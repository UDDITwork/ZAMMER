// backend/test-cashfree-v2-endpoints.js
// 🔧 Test different V2 API endpoint variations to find the correct one

require('dotenv').config();
const axios = require('axios');

class CashfreeEndpointTester {
  constructor() {
    this.baseURL = 'https://api.cashfree.com/payout';
    this.clientId = process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD;
    this.secretKey = process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD;
    this.apiVersion = '2024-01-01';
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

  async testEndpoint(endpoint, method = 'GET', data = null) {
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
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        endpoint
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status,
        error: error.message,
        data: error.response?.data,
        endpoint
      };
    }
  }

  async testAllEndpoints() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 TESTING CASHFREE V2 API ENDPOINTS');
    console.log('='.repeat(60) + '\n');

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
      }
    };

    const endpoints = [
      // Test different beneficiary endpoint variations
      { endpoint: '/beneficiary', method: 'POST', data: testData },
      { endpoint: '/beneficiaries', method: 'POST', data: testData },
      { endpoint: '/v2/beneficiary', method: 'POST', data: testData },
      { endpoint: '/v2/beneficiaries', method: 'POST', data: testData },
      { endpoint: '/api/v2/beneficiary', method: 'POST', data: testData },
      { endpoint: '/api/v2/beneficiaries', method: 'POST', data: testData },
      
      // Test different API versions
      { endpoint: '/beneficiary', method: 'POST', data: testData, version: '2023-01-01' },
      { endpoint: '/beneficiary', method: 'POST', data: testData, version: '2022-01-01' },
      { endpoint: '/beneficiary', method: 'POST', data: testData, version: '2021-01-01' },
      
      // Test GET endpoints
      { endpoint: '/beneficiary', method: 'GET' },
      { endpoint: '/beneficiaries', method: 'GET' },
      { endpoint: '/account/balance', method: 'GET' },
      { endpoint: '/credentials/verify', method: 'GET' }
    ];

    const results = [];

    for (const test of endpoints) {
      this.log(`Testing ${test.method} ${test.endpoint}...`);
      
      // Override API version if specified
      const headers = this.getHeaders();
      if (test.version) {
        headers['x-api-version'] = test.version;
      }

      try {
        const config = {
          method: test.method,
          url: `${this.baseURL}${test.endpoint}`,
          headers,
          timeout: 10000
        };

        if (test.data) {
          config.data = test.data;
        }

        const response = await axios(config);
        
        const result = {
          endpoint: test.endpoint,
          method: test.method,
          version: test.version || this.apiVersion,
          success: true,
          status: response.status,
          data: response.data
        };

        results.push(result);
        this.log(`✅ SUCCESS: ${test.method} ${test.endpoint}`, { status: response.status });

      } catch (error) {
        const result = {
          endpoint: test.endpoint,
          method: test.method,
          version: test.version || this.apiVersion,
          success: false,
          status: error.response?.status,
          error: error.message,
          data: error.response?.data
        };

        results.push(result);
        this.log(`❌ FAILED: ${test.method} ${test.endpoint}`, { 
          status: error.response?.status, 
          error: error.message 
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Generate summary
    this.generateSummary(results);
  }

  generateSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ENDPOINT TEST SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ SUCCESSFUL: ${successful.length}`);
    console.log(`❌ FAILED: ${failed.length}`);

    if (successful.length > 0) {
      console.log('\n✅ WORKING ENDPOINTS:');
      successful.forEach(result => {
        console.log(`  ${result.method} ${result.endpoint} (v${result.version}) - Status: ${result.status}`);
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ FAILED ENDPOINTS:');
      failed.forEach(result => {
        console.log(`  ${result.method} ${result.endpoint} (v${result.version}) - Status: ${result.status} - Error: ${result.error}`);
      });
    }

    // Find the best working endpoint
    const beneficiaryEndpoints = results.filter(r => 
      r.endpoint.includes('beneficiary') && r.success
    );

    if (beneficiaryEndpoints.length > 0) {
      console.log('\n🎯 RECOMMENDED BENEFICIARY ENDPOINT:');
      const best = beneficiaryEndpoints[0];
      console.log(`  ${best.method} ${best.endpoint} (v${best.version})`);
      console.log(`  Status: ${best.status}`);
    } else {
      console.log('\n⚠️ NO WORKING BENEFICIARY ENDPOINTS FOUND');
      console.log('  You may need to:');
      console.log('  1. Check the official Cashfree documentation');
      console.log('  2. Contact Cashfree support');
      console.log('  3. Verify your API access permissions');
    }

    console.log('\n' + '='.repeat(60));

    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      baseURL: this.baseURL,
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length
      },
      results: results
    };

    require('fs').writeFileSync(
      './cashfree-endpoint-test-results.json',
      JSON.stringify(reportData, null, 2)
    );

    this.log('Detailed results saved to cashfree-endpoint-test-results.json');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new CashfreeEndpointTester();
  tester.testAllEndpoints().catch(console.error);
}

module.exports = CashfreeEndpointTester;

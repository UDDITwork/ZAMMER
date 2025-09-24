// backend/test-api-endpoints.js - API Endpoints Testing Script
const axios = require('axios');
const crypto = require('crypto');

class APIEndpointTester {
  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:5000/api';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      warnings: []
    };
    this.testData = {
      sellerToken: null,
      adminToken: null,
      testSellerId: null,
      testOrderId: null,
      testBeneficiaryId: null,
      testPayoutId: null
    };
  }

  /**
   * Log test results
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [API_TEST] ${message}`;
    
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Record test result
   */
  recordResult(testName, passed, error = null, warning = null) {
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
  }

  /**
   * Make HTTP request
   */
  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Test server connectivity
   */
  async testServerConnectivity() {
    this.log('info', 'Testing server connectivity...');

    try {
      const response = await this.makeRequest('GET', '/payouts/health');
      
      if (response.status === 200) {
        this.recordResult('Server Connectivity', true);
        return true;
      } else {
        this.recordResult('Server Connectivity', false, `Unexpected status: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.recordResult('Server Connectivity', false, error.message);
      return false;
    }
  }

  /**
   * Test health check endpoint
   */
  async testHealthCheck() {
    this.log('info', 'Testing health check endpoint...');

    try {
      const response = await this.makeRequest('GET', '/payouts/health');
      
      if (response.status === 200 && response.data.success) {
        this.recordResult('Health Check Endpoint', true);
        return true;
      } else {
        this.recordResult('Health Check Endpoint', false, `Unexpected response: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      this.recordResult('Health Check Endpoint', false, error.message);
      return false;
    }
  }

  /**
   * Test webhook endpoint
   */
  async testWebhookEndpoint() {
    this.log('info', 'Testing webhook endpoint...');

    try {
      // Create test webhook payload
      const testPayload = {
        transfer_id: 'TEST_TRANSFER_123',
        cf_transfer_id: 'CF_TEST_123',
        status: 'SUCCESS',
        status_code: '200',
        status_description: 'Transfer completed successfully',
        transfer_utr: 'TEST_UTR_123',
        transfer_mode: 'banktransfer',
        beneficiary_id: 'TEST_BENEFICIARY_123',
        transfer_amount: 1000.00,
        transfer_remarks: 'Test payout',
        initiated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      // Generate test signature
      const testSecret = 'test-webhook-secret';
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(JSON.stringify(testPayload))
        .digest('hex');

      const response = await this.makeRequest('POST', '/payouts/webhook', testPayload, {
        'x-cf-signature': signature
      });

      if (response.status === 200) {
        this.recordResult('Webhook Endpoint', true);
        return true;
      } else {
        this.recordResult('Webhook Endpoint', false, `Unexpected status: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.recordResult('Webhook Endpoint', false, error.message);
      return false;
    }
  }

  /**
   * Test seller authentication endpoints (without actual auth)
   */
  async testSellerEndpoints() {
    this.log('info', 'Testing seller endpoints structure...');

    const sellerEndpoints = [
      { method: 'POST', path: '/payouts/beneficiary', requiresAuth: true },
      { method: 'GET', path: '/payouts/beneficiary', requiresAuth: true },
      { method: 'PUT', path: '/payouts/beneficiary', requiresAuth: true },
      { method: 'GET', path: '/payouts/history', requiresAuth: true },
      { method: 'GET', path: '/payouts/stats', requiresAuth: true }
    ];

    let allPassed = true;

    for (const endpoint of sellerEndpoints) {
      try {
        const response = await this.makeRequest(endpoint.method, endpoint.path);
        
        // For protected endpoints, we expect 401 or 403
        if (endpoint.requiresAuth && (response.status === 401 || response.status === 403)) {
          this.recordResult(`Seller Endpoint ${endpoint.method} ${endpoint.path}`, true);
        } else if (!endpoint.requiresAuth && response.status === 200) {
          this.recordResult(`Seller Endpoint ${endpoint.method} ${endpoint.path}`, true);
        } else {
          this.recordResult(`Seller Endpoint ${endpoint.method} ${endpoint.path}`, false, `Unexpected status: ${response.status}`);
          allPassed = false;
        }
      } catch (error) {
        if (endpoint.requiresAuth && (error.response?.status === 401 || error.response?.status === 403)) {
          this.recordResult(`Seller Endpoint ${endpoint.method} ${endpoint.path}`, true);
        } else {
          this.recordResult(`Seller Endpoint ${endpoint.method} ${endpoint.path}`, false, error.message);
          allPassed = false;
        }
      }
    }

    return allPassed;
  }

  /**
   * Test admin endpoints (without actual auth)
   */
  async testAdminEndpoints() {
    this.log('info', 'Testing admin endpoints structure...');

    const adminEndpoints = [
      { method: 'GET', path: '/payouts/admin/beneficiaries', requiresAuth: true },
      { method: 'GET', path: '/payouts/admin/payouts', requiresAuth: true },
      { method: 'GET', path: '/payouts/admin/analytics', requiresAuth: true },
      { method: 'POST', path: '/payouts/admin/process-batch', requiresAuth: true },
      { method: 'POST', path: '/payouts/admin/process-single/test-order-id', requiresAuth: true },
      { method: 'GET', path: '/payouts/admin/batch/test-batch-id', requiresAuth: true },
      { method: 'GET', path: '/payouts/admin/batch-history', requiresAuth: true },
      { method: 'GET', path: '/payouts/admin/eligibility-stats', requiresAuth: true },
      { method: 'POST', path: '/payouts/admin/update-eligibility', requiresAuth: true }
    ];

    let allPassed = true;

    for (const endpoint of adminEndpoints) {
      try {
        const response = await this.makeRequest(endpoint.method, endpoint.path);
        
        // For protected endpoints, we expect 401 or 403
        if (endpoint.requiresAuth && (response.status === 401 || response.status === 403)) {
          this.recordResult(`Admin Endpoint ${endpoint.method} ${endpoint.path}`, true);
        } else if (!endpoint.requiresAuth && response.status === 200) {
          this.recordResult(`Admin Endpoint ${endpoint.method} ${endpoint.path}`, true);
        } else {
          this.recordResult(`Admin Endpoint ${endpoint.method} ${endpoint.path}`, false, `Unexpected status: ${response.status}`);
          allPassed = false;
        }
      } catch (error) {
        if (endpoint.requiresAuth && (error.response?.status === 401 || error.response?.status === 403)) {
          this.recordResult(`Admin Endpoint ${endpoint.method} ${endpoint.path}`, true);
        } else {
          this.recordResult(`Admin Endpoint ${endpoint.method} ${endpoint.path}`, false, error.message);
          allPassed = false;
        }
      }
    }

    return allPassed;
  }

  /**
   * Test CORS headers
   */
  async testCORSHeaders() {
    this.log('info', 'Testing CORS headers...');

    try {
      const response = await this.makeRequest('OPTIONS', '/payouts/health');
      
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods',
        'access-control-allow-headers'
      ];

      let missingHeaders = [];
      corsHeaders.forEach(header => {
        if (!response.headers[header]) {
          missingHeaders.push(header);
        }
      });

      if (missingHeaders.length > 0) {
        this.recordResult('CORS Headers', false, `Missing CORS headers: ${missingHeaders.join(', ')}`);
        return false;
      } else {
        this.recordResult('CORS Headers', true);
        return true;
      }
    } catch (error) {
      this.recordResult('CORS Headers', false, error.message);
      return false;
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    this.log('info', 'Testing error handling...');

    try {
      // Test 404 error
      const response404 = await this.makeRequest('GET', '/payouts/nonexistent-endpoint');
      
      if (response404.status === 404) {
        this.recordResult('404 Error Handling', true);
      } else {
        this.recordResult('404 Error Handling', false, `Expected 404, got ${response404.status}`);
      }

      // Test invalid JSON
      try {
        await axios.post(`${this.baseUrl}/payouts/webhook`, 'invalid json', {
          headers: { 'Content-Type': 'application/json' }
        });
        this.recordResult('Invalid JSON Handling', false, 'Should have failed with invalid JSON');
      } catch (error) {
        if (error.response?.status === 400) {
          this.recordResult('Invalid JSON Handling', true);
        } else {
          this.recordResult('Invalid JSON Handling', false, `Expected 400, got ${error.response?.status}`);
        }
      }

    } catch (error) {
      this.recordResult('Error Handling Test', false, error.message);
    }
  }

  /**
   * Test response format consistency
   */
  async testResponseFormat() {
    this.log('info', 'Testing response format consistency...');

    try {
      const response = await this.makeRequest('GET', '/payouts/health');
      
      if (response.data && typeof response.data === 'object') {
        const requiredFields = ['success'];
        let missingFields = [];
        
        requiredFields.forEach(field => {
          if (!response.data.hasOwnProperty(field)) {
            missingFields.push(field);
          }
        });

        if (missingFields.length > 0) {
          this.recordResult('Response Format', false, `Missing required fields: ${missingFields.join(', ')}`);
        } else {
          this.recordResult('Response Format', true);
        }
      } else {
        this.recordResult('Response Format', false, 'Response is not a valid JSON object');
      }
    } catch (error) {
      this.recordResult('Response Format Test', false, error.message);
    }
  }

  /**
   * Test rate limiting (if implemented)
   */
  async testRateLimiting() {
    this.log('info', 'Testing rate limiting...');

    try {
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(this.makeRequest('GET', '/payouts/health'));
      }

      const responses = await Promise.all(promises);
      
      // Check if any requests were rate limited
      const rateLimited = responses.some(response => response.status === 429);
      
      if (rateLimited) {
        this.recordResult('Rate Limiting', true, null, 'Rate limiting is active');
      } else {
        this.recordResult('Rate Limiting', true, null, 'No rate limiting detected (may not be implemented)');
      }
    } catch (error) {
      this.recordResult('Rate Limiting Test', false, error.message);
    }
  }

  /**
   * Run all API tests
   */
  async runAllTests() {
    this.log('info', 'Starting API endpoints testing...');
    
    console.log('\n' + '='.repeat(80));
    console.log('🌐 API ENDPOINTS TEST SUITE');
    console.log('='.repeat(80) + '\n');

    // Test server connectivity first
    const isConnected = await this.testServerConnectivity();
    if (!isConnected) {
      this.log('error', 'Server is not accessible. Please ensure the server is running.');
      return;
    }

    await this.testHealthCheck();
    await this.testWebhookEndpoint();
    await this.testSellerEndpoints();
    await this.testAdminEndpoints();
    await this.testCORSHeaders();
    await this.testErrorHandling();
    await this.testResponseFormat();
    await this.testRateLimiting();

    this.generateTestReport();
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 API TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n✅ PASSED: ${this.testResults.passed}`);
    console.log(`❌ FAILED: ${this.testResults.failed}`);
    console.log(`⚠️ WARNINGS: ${this.testResults.warnings.length}`);

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

    console.log('\n' + '='.repeat(80));
    
    if (this.testResults.failed === 0) {
      console.log('🎉 ALL API TESTS PASSED! The API endpoints are working correctly.');
    } else {
      console.log('⚠️ SOME API TESTS FAILED! Please fix the issues before deploying.');
    }
    
    console.log('='.repeat(80) + '\n');

    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: {
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        warnings: this.testResults.warnings.length
      },
      details: {
        errors: this.testResults.errors,
        warnings: this.testResults.warnings
      }
    };

    require('fs').writeFileSync(
      './api-endpoints-test-report.json',
      JSON.stringify(reportData, null, 2)
    );

    this.log('info', 'Detailed API test report saved to api-endpoints-test-report.json');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new APIEndpointTester();
  tester.runAllTests().catch(console.error);
}

module.exports = APIEndpointTester;
